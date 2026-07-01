import os
import time
import zlib
import requests
from google import genai
from google.genai import types
from datetime import datetime
from dotenv import load_dotenv
from app.db.session import get_db
from app.services.session_service import SessionService
from app.db.session import SessionLocal
from app.models.background_task import BackgroundTask
from app.models.project import Project
from app.models.session_membership import SessionMembership
from app.services import notification_service   
import logging
from app.services.audit_service import log_action
logger = logging.getLogger(__name__)


load_dotenv()

# ==========================
# CONFIG
# ==========================
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

KROKI_URL = "https://kroki.io"
STORAGE_PATH = "storage/uml"

# Local fallback when all Gemini models are quota-exhausted/unavailable
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:3b"
# OLLAMA_MODEL = "qwen2.5:7b"

# ==========================
# HELPERS
# ==========================
# Filler words that, combined with "system", still just mean "the system itself"
# (e.g. "system being built", "the system", "current system") rather than a named
# external system (e.g. "payment gateway", "email service") — those must be kept.
_SYSTEM_SELF_REFERENCE_FILLERS = {
    "the", "this", "our", "target", "current",
    "being", "built", "developed", "designed", "itself",
}

# ==========================
# PREPROCESSING CLEAN INPUT BEFORE SENDING IT TO AI
# ==========================
def _is_self_referential_system(actor: str) -> bool:
    words = actor.strip().lower().split()
    if "system" not in words:
        return False
    return all(w == "system" or w in _SYSTEM_SELF_REFERENCE_FILLERS for w in words)

# =========================
# REMOVE INVALID ACTORS BEFORE AI GENERATION
# =========================
def clean_actors(actors: list):
    """Remove the system itself (and self-referential variants like 'system being built') from actors"""
    return list(set([
        a.strip().lower()
        for a in actors
        if a and not _is_self_referential_system(a)
    ]))


def simplify_requirements(frs: list):
    """
    Prefer feature over full sentence
    """
    simplified = []

    for fr in frs:
        actor = fr.get("actor", "user")
        # Skip entirely if actor is the system itself (or a self-referential variant)
        if _is_self_referential_system(actor):
            continue
        feature = fr.get("feature") or fr.get("text")

        simplified.append({
            "actor": actor,
            "action": feature
        })

    return simplified


# ==========================
# GENERATE UML CODE WITH AI
# ==========================
def generate_uml_code_with_ai(requirements_json: dict, diagram_type: str):
    actors = clean_actors(requirements_json.get("actors", []))
    frs = simplify_requirements(requirements_json.get("functional_requirements", []))

    prompt = build_prompt(actors, frs, diagram_type)
    return _generate_uml_with_fallback_chain(prompt)

# ==========================
# REPAIR BROKEN UML CODE WITH AI
# ==========================
def repair_uml_code_with_ai(broken_uml_code: str, diagram_type: str, error_message: str) -> str:
    """Asks the AI to fix a PlantUML syntax error reported by the renderer, used as a single retry after a render failure."""
    rules = _diagram_rules(diagram_type)
    prompt = f"""
The following PlantUML {diagram_type.upper()} diagram failed to render due to a syntax error.

Render error:
{error_message[:300]}

Fix the error while strictly following these rules — the same rules used to generate it, do not violate any of them while repairing:

{rules}

Keep the same classes/actors/actions and overall structure — only fix what's broken.

Broken PlantUML code:
{broken_uml_code}
"""
    return _generate_uml_with_fallback_chain(prompt)

# =========================
# TRY 3 GEMINI MODELS IF FAILS, FALL BACK TO OLLAMA
# =========================
def _generate_uml_with_fallback_chain(prompt: str) -> str:
    models_to_try = [
        "gemini-2.0-flash",
        "gemini-2.5-flash",
        "gemini-2.0-flash-lite",
    ]

    last_error = None

    for model_name in models_to_try:
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(temperature=0.2)
                )

                return clean_uml_output(response.text)

            except Exception as e:
                error_str = str(e)
                last_error = error_str
                print(f"Error on {model_name} attempt {attempt + 1}: {error_str[:100]}")

                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    if attempt == 0:
                        print("Waiting 15s before retry...")
                        time.sleep(15)
                    else:
                        print(f"{model_name} quota exhausted, trying next model...")
                        break
                else:
                    print(f"{model_name} failed, trying next model...")
                    break

    # All Gemini models exhausted/unavailable — fall back to local Ollama
    try:
        return generate_uml_code_with_ollama(prompt)
    except Exception as ollama_error:
        raise Exception(
            f"All models failed. Last Gemini error: {last_error}. "
            f"Ollama fallback error: {ollama_error}"
        )


# ==========================
# OLLAMA FALLBACK
# ==========================
def generate_uml_code_with_ollama(prompt: str, timeout: int = 300) -> str:
    logger.info(f"Falling back to Ollama ({OLLAMA_MODEL}) for UML generation...")
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.2,
                    "num_predict": 1024,
                    "num_ctx": 4096,
                },
            },
            timeout=timeout,
        )
    except requests.exceptions.ConnectionError:
        raise Exception("Ollama is not running. Start it with: ollama serve")
    except requests.exceptions.Timeout:
        raise Exception("Ollama timed out generating the UML diagram.")

    if response.status_code != 200:
        raise Exception(f"Ollama error: {response.status_code} — {response.text[:200]}")

    text = response.json().get("response", "").strip()
    return clean_uml_output(text)


# ==========================
# PROMPT BUILDER
# ==========================
def _diagram_rules(diagram_type: str) -> str:
    """Diagram-specific instructions, shared between the initial generation prompt and the repair prompt."""
    if diagram_type == "usecase":
        return """Generate a PlantUML USE CASE diagram.

Strict rules:
- Only return valid PlantUML
- Start with @startuml and end with @enduml
- No explanations
- Define actors
- Draw the system boundary using a rectangle block, and declare EVERY use case inside it with: usecase "Use Case Name" as Alias
    rectangle "System Boundary" {
      usecase "Login" as Login
      usecase "Manage Profile" as ManageProfile
    }
- Place all actors OUTSIDE the rectangle block — never declare an actor inside it
- All relationships (actor-to-use-case, extend, include, inheritance) go OUTSIDE the rectangle block, written using each use case's Alias — never write a relationship line inside the rectangle block, and never use inline "(Use Case Name)" syntax
- Avoid duplicate use cases
- NEVER include "System" as an actor — omit any use case whose only actor is System
- If an actor's name contains spaces (e.g. "payment gateway"), declare it with quotes and an alias, then use the alias everywhere else:
    actor "Payment Gateway" as PaymentGateway
    PaymentGateway --> ProcessPayment
- NEVER write a multi-word actor name unquoted directly in a relationship (e.g. "Payment Gateway --> ProcessPayment" without quotes/alias is invalid)

Use case naming rules:
- Every use case's quoted Name MUST follow the format: "Verb + Subject" (e.g., "Manage Users", "Submit Report") or "Verb only" (e.g., "Login", "Register")
- Never name a use case with a noun phrase alone (e.g., avoid "User Authentication" — use "Authenticate User" instead)
- The Alias must be the Name in PascalCase with no spaces (e.g. "Manage Users" → ManageUsers)

Inheritance (Generalization) rules:
- Inheritance is ONLY allowed between actors, never between use cases
- To show one actor is a specialization of another, use: ChildActor --|> ParentActor
- Example: "Admin --|> User" means Admin inherits from User
- Do NOT use --|> between use cases under any circumstances

Extend relationship rules:
- Use «extend» to show that one use case optionally extends another
- The arrow goes FROM the extending use case TO the base use case, as a dashed arrow, using their Aliases
- Syntax: ExtendingAlias .down.> BaseAlias : «extend»
- Example: "Edit Transcript" extends "View Transcript" meaning the user CAN edit after viewing, but it is optional
- Use extend only for optional/conditional behavior that is not part of the main flow

Include relationship rules:
- Use «include» when a use case always calls another as a mandatory sub-step
- Syntax: BaseAlias .down.> IncludedAlias : «include»

Example:
@startuml
actor User
rectangle "System Boundary" {
  usecase "Login" as Login
  usecase "Manage Profile" as ManageProfile
}
User --> Login
User --> ManageProfile
@enduml"""

    elif diagram_type == "class":
        return """Generate a PlantUML CLASS diagram.

Strict rules:
- Only return valid PlantUML
- Start with @startuml and end with @enduml
- No explanations, no markdown code fences
- Extract meaningful classes from the actors and actions below
- Every class must use this exact block syntax (one member per line, inside curly braces):
    class ClassName {
      +attributeName: Type
      +methodName()
    }
- Every attribute/method line must start with a visibility symbol: + (public), - (private), or # (protected)
- Every class must include relevant attributes inferred from its actions/domain (not just an id) — e.g. a User that can "login" implies attributes like username and password; an Order implies attributes like status and total
- Identify and include relationships between classes whenever they logically exist (e.g. one class manages, owns, creates, or uses another) — do not output isolated classes with no relationships unless none genuinely exist
- Relationships go OUTSIDE class blocks, one per line, using the most appropriate type: --> (association), --|> (inheritance), *-- (composition, "owns and cannot exist without"), o-- (aggregation, "has a, but can exist independently")
- Never place a relationship arrow inside a class block
- Class names must be a single valid identifier — convert any multi-word actor/action name to PascalCase (e.g. "payment gateway" → PaymentGateway). Never put spaces or quotes in a class name.
- Avoid duplicate classes and duplicate methods

Example:
@startuml
class User {
  +id: int
  +username: string
  +password: string
  +login()
}
class Order {
  +id: int
  +status: string
  +total: float
  +submit()
}
User "1" --> "many" Order
@enduml"""

    elif diagram_type == "sequence":
        return """Generate a PlantUML SEQUENCE diagram.

Strict rules:
- Only return valid PlantUML
- Start with @startuml and end with @enduml
- No explanations, no markdown code fences
- Declare every actor once at the top using: actor ActorName  (and declare "System" with: participant System)
- If an actor's name contains spaces (e.g. "payment gateway"), declare it with quotes and an alias, then use the alias everywhere else:
    actor "Payment Gateway" as PaymentGateway
- NEVER write a multi-word actor name unquoted in a declaration or message (e.g. "actor Payment Gateway" or "Payment Gateway -> System" without quotes/alias is invalid)
- Every interaction must be one message per line using -> (call) or --> (return), in the form:
    ActorName -> System: actionName()
    System --> ActorName: result
- If you open an alt/opt/loop block, you must close it with end
- Avoid duplicate or contradictory messages

Example:
@startuml
actor User
participant System
actor "Payment Gateway" as PaymentGateway
User -> System: login()
System --> User: loginResult
System -> PaymentGateway: processPayment()
PaymentGateway --> System: paymentResult
@enduml"""

    else:
        raise ValueError("Invalid diagram type")

# =========================
# THIS IS WHAT AI RECEIVES AS PROMPT — IT INCLUDES THE RULES, ACTORS, AND ACTIONS
# =========================
def build_prompt(actors, frs, diagram_type):
    rules = _diagram_rules(diagram_type)
    items_label = {"usecase": "Use Cases", "sequence": "Interactions"}.get(diagram_type, "Actions")

    return f"""{rules}

Actors:
{actors}

{items_label}:
{frs}
"""


# ==========================
# CLEAN AI OUTPUT CODE TO BE COMPATIBLE WITH KROKI/PLANTUML INPUT
# ==========================
def clean_uml_output(text: str):
    text = text.replace("```plantuml", "").replace("```", "")

    start = text.find("@startuml")
    end = text.find("@enduml")

    if start == -1 or end == -1:
        raise Exception("Invalid UML output from AI")

    return text[start:end + len("@enduml")]


# ==========================
# KROKI RENDERING
# ==========================
_PLANTUML_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_"

# ==========================
# ENCODE/COMPRESS PLANTUML FOR URL AS DON'T ACCEPT TEXT
# ==========================
def _encode_plantuml(uml_code: str) -> str:
    compressed = zlib.compress(uml_code.encode("utf-8"))[2:-4]  # strip zlib header/checksum
    result = []
    for i in range(0, len(compressed), 3):
        b0 = compressed[i]
        b1 = compressed[i + 1] if i + 1 < len(compressed) else 0
        b2 = compressed[i + 2] if i + 2 < len(compressed) else 0
        result.append(_PLANTUML_CHARS[(b0 >> 2) & 0x3F])
        result.append(_PLANTUML_CHARS[((b0 & 0x3) << 4) | ((b1 >> 4) & 0xF)])
        result.append(_PLANTUML_CHARS[((b1 & 0xF) << 2) | ((b2 >> 6) & 0x3)])
        result.append(_PLANTUML_CHARS[b2 & 0x3F])
    return "".join(result)

# ==========================
# HELPER FUNCTION TO TRY RENDERING WITH KROKI OR PLANTUML.COM
# ==========================
def _try_render(url: str, *, post_data: bytes = None, timeout: int = 20) -> bytes:
    if post_data is not None:
        response = requests.post(url, data=post_data, timeout=timeout)
    else:
        response = requests.get(url, timeout=timeout)
    if response.status_code == 200:
        return response.content
    raise Exception(f"Render error {response.status_code}: {response.text[:200]}")


def render_diagram_with_kroki(uml_code: str):
    encoded = _encode_plantuml(uml_code)
    plantuml_url = f"https://www.plantuml.com/plantuml/png/{encoded}"
    kroki_url = f"{KROKI_URL}/plantuml/png"

    # Try kroki first (1 attempt, short timeout); fall back to plantuml.com
    errors = {}
    for label, fn in [
        ("kroki",    lambda: _try_render(kroki_url, post_data=uml_code.encode("utf-8"), timeout=15)),
        ("plantuml", lambda: _try_render(plantuml_url, timeout=20)),
    ]:
        try:
            return fn()
        except Exception as e:
            logger.warning(f"{label} render failed, trying next: {e}")
            errors[label] = str(e)

    # Kroki returns the actual PlantUML syntax diagnostic as text; plantuml.com
    # bakes its error into a PNG image, which isn't usable as an error message.
    raise Exception(errors.get("kroki", "All UML render services failed (kroki + plantuml.com)"))


# ==========================
# SAVE FILE TO STORAGE
# ==========================
def save_uml_file(image_bytes, project_id, diagram_type, session_id=None):
    os.makedirs(STORAGE_PATH, exist_ok=True)

    if session_id:
        filename = f"{diagram_type}_P{project_id}_S{session_id}_{int(datetime.utcnow().timestamp())}.png"
    else:
        filename = f"{diagram_type}_P{project_id}_{int(datetime.utcnow().timestamp())}.png"
 
    path = os.path.join(STORAGE_PATH, filename)

    with open(path, "wb") as f:
        f.write(image_bytes)

    return path


# ==========================
# MAIN PIPELINE
# ==========================
def generate_uml_pipeline(
    requirements_json,
    project_id,
    diagram_type,
    session_id=None
):
    try:
        # 1. Generate UML code
        uml_code = generate_uml_code_with_ai(requirements_json, diagram_type)

        # 2. Render (one AI repair retry if the generated PlantUML has a syntax error)
        try:
            image_bytes = render_diagram_with_kroki(uml_code)
        except Exception as render_error:
            logger.warning(f"Render failed, attempting AI syntax repair: {render_error}")
            logger.warning(f"Broken PlantUML code:\n{uml_code}")
            uml_code = repair_uml_code_with_ai(uml_code, diagram_type, str(render_error))
            try:
                image_bytes = render_diagram_with_kroki(uml_code)
            except Exception as second_render_error:
                logger.error(f"Repair attempt also failed: {second_render_error}")
                logger.error(f"Repaired PlantUML code:\n{uml_code}")
                raise

        # 3. Save
        file_path = save_uml_file(
            image_bytes,
            project_id,
            diagram_type,
            session_id=session_id
        )
        if session_id:
            db = next(get_db())
            try:
                SessionService.update_session_status(db, session_id, "pending_approval")
            finally:
                db.close()


        return {
            "uml_code": uml_code,
            "file_path": file_path
        }

    except Exception as e:
        raise Exception(f"UML generation failed: {str(e)}")
    
# ==========================
# ASYNC TASK
# ==========================

def _sanitize_error_message(raw: str) -> str:
    """Convert raw exception text into a short user-friendly message."""
    low = raw.lower()
    if "504" in raw or "gateway time-out" in low or "gateway timeout" in low:
        return "Diagram rendering service (Kroki) is temporarily unavailable. Please retry in a moment."
    if "503" in raw or "502" in raw or "service unavailable" in low:
        return "Diagram rendering service is temporarily unavailable. Please retry in a moment."
    if "kroki" in low:
        return "Diagram rendering failed. Please retry in a moment."
    if "ollama is not running" in low:
        return "AI quota exceeded and the local fallback (Ollama) is not running. Please start Ollama and retry."
    if "timeout" in low or "timed out" in low:
        return "The request timed out. Please retry."
    if "all models failed" in low or "quota" in low or "429" in raw:
        return "AI generation quota exceeded. Please retry in a few minutes."
    if "invalid uml" in low or "plantuml" in low:
        return "Failed to generate valid diagram syntax. Please retry."
    # Generic fallback — never expose raw stack traces or HTML
    return "UML generation failed. Please retry."

# ==========================
# BACKGROUND TASK ORCHESTRATION (generation, artifact storage, status updates, audit logging, and notifications.)
# ==========================
def run_async_uml_task(
    task_id: int,
    project_id: int,
    session_id: int | None,
    diagram_type: str,
    source: str,         # "session" or "project"
    user_id: int,
):
    db = SessionLocal()
    try:
        task = db.query(BackgroundTask).filter(BackgroundTask.id == task_id).first()
        task.status = "in-progress"
        db.commit()

        # ── 1. Fetch requirements 
        from app.services.requirement_service import RequirementService
        if source == "session":
            req = RequirementService.get_latest_session_requirement(db, project_id, session_id)
        else:
            req = RequirementService.get_latest_project_requirement(db, project_id)
        requirements_json = req["data"]

        # ── 2. Run the pipeline 
        result = generate_uml_pipeline(
            requirements_json=requirements_json,
            project_id=project_id,
            diagram_type=diagram_type,
            session_id=session_id if source == "session" else None,
        )

        # ── 3. Save artifact 
        from app.services.artifact_service import ArtifactService
        artifact = ArtifactService.save_artifact(
            db=db,
            project_id=project_id,
            session_id=session_id if source == "session" else None,
            artifact_type_name=f"UML_{diagram_type.upper()}",
            file_path=result["file_path"],
        )

        task.task_output = {
            "diagram_type": diagram_type,
            "source": source,
            "file_path": result["file_path"],
            "artifact_id": artifact["id"],   # whatever ArtifactService returns
        }
        task.status = "done"

        # ── 4. UPDATE PROJECT STATUS IF PROJECT_LEVEL ARTIFACT
        if source == "project":
            from app.services.project_approval_service import ProjectApprovalService
            new_status = ProjectApprovalService.compute_project_status(db, project_id)
            project_row = db.query(Project).filter(Project.id == project_id).first()
            if project_row and project_row.project_status not in ("suspended", "completed"):
                project_row.project_status = new_status

        db.commit()
        session_label = "Project-level"
        if source == "session" and session_id:
            from app.models.session import Session as SessionModel
            session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
            if session and session.title:
                session_label = f'Session "{session.title}"'
            else:
                session_label = f"Session #{session_id}"

        log_action(
            db=db,
            user_id=user_id,
            project_id=project_id,
            action="generated",
            entity="uml_diagram",
            entity_id=artifact["id"],
            details={
                "label": f"{diagram_type.capitalize()} Diagram {artifact['version']}",
                "extra": f"{diagram_type} ({session_label})"
            }
        )
        db.commit()
        # ── 5. Notify 
        _notify_uml_members(
            db=db, project_id=project_id, session_id=session_id,
            notification_type="uml_generated",
            title="UML Diagram Ready",
            message=f"Your {diagram_type} UML diagram has been generated. [project_id:{project_id}] [diagram_type:{diagram_type}]"
                    + (f" [session_id:{session_id}]" if session_id else ""),
        )

    except Exception as exc:
        logger.exception("UML background task %s failed", task_id)
        try:
            task.status = "failed"
            task.error_message = _sanitize_error_message(str(exc))
            db.commit()
        except Exception:
            db.rollback()
        try:
            _notify_uml_members(
                db=db, project_id=project_id, session_id=session_id,
                notification_type="uml_generation_failed",
                title="UML Generation Failed",
                message=f"UML diagram generation failed. [project_id:{project_id}]"
                        + (f" [session_id:{session_id}]" if session_id else ""),
            )
        except Exception:
            logger.exception("Failed to send UML failure notification for task %s", task_id)
    finally:
        db.close()


def _notify_uml_members(db, project_id, session_id, notification_type, title, message):
    project = db.query(Project).filter(Project.id == project_id).first()
    project_name = project.name if project else None

    if session_id:
        memberships = db.query(SessionMembership).filter(
            SessionMembership.session_id == session_id
        ).all()
        user_ids = [m.user_id for m in memberships]
    else:
        # project-level: notify project members (adjust to your membership model)
        from app.models.project_membership import ProjectMembership   # adjust import
        members = db.query(ProjectMembership).filter(ProjectMembership.project_id == project_id).all()
        user_ids = [m.user_id for m in members]

    for uid in user_ids:
        notification_service.create_notification(
            db, user_id=uid,
            notification_type=notification_type,
            title=title, message=message,
            actor_name="System", actor_email=None,
            project_id=project_id, project_name=project_name,
        )
    db.commit()