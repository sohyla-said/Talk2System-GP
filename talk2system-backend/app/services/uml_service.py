import os
import time
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
from app.services import notification_service   # adjust to your actual import path
import logging
logger = logging.getLogger(__name__)


load_dotenv()

# ==========================
# CONFIG
# ==========================
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

KROKI_URL = "https://kroki.io"
STORAGE_PATH = "storage/uml"

# ==========================
# HELPERS
# ==========================
def clean_actors(actors: list):
    """Remove 'system' and normalize actors"""
    return list(set([
        a.strip().lower()
        for a in actors
        if a and a.strip().lower() != "system"
    ]))


def simplify_requirements(frs: list):
    """
    Prefer feature over full sentence
    """
    simplified = []

    for fr in frs:
        actor = fr.get("actor", "user")
        # Skip entirely if actor is "system"
        if actor.strip().lower() == "system":
            continue
        feature = fr.get("feature") or fr.get("text")

        simplified.append({
            "actor": actor,
            "action": feature
        })

    return simplified


# ==========================
# AI: GENERATE UML CODE
# ==========================
def generate_uml_code_with_ai(requirements_json: dict, diagram_type: str):
    
    actors = clean_actors(requirements_json.get("actors", []))
    frs = simplify_requirements(requirements_json.get("functional_requirements", []))

    prompt = build_prompt(actors, frs, diagram_type)

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

    raise Exception(f"All models failed. Last error: {last_error}")


# ==========================
# PROMPT BUILDER
# ==========================
def build_prompt(actors, frs, diagram_type):

    if diagram_type == "usecase":
        return f"""
Generate a PlantUML USE CASE diagram.

Strict rules:
- Only return valid PlantUML
- Start with @startuml and end with @enduml
- No explanations
- Define actors
- Define use cases from actions
- Link actors to use cases
- Avoid duplicate use cases
- NEVER include "System" as an actor — omit any use case whose only actor is System
- Draw a system boundary (frame) that contains all use cases
- Place all actors OUTSIDE the system boundary

Use case naming rules:
- Every use case name MUST follow the format: "Verb + Subject" (e.g., "Manage Users", "Submit Report") or "Verb only" (e.g., "Login", "Register")
- Never name a use case with a noun phrase alone (e.g., avoid "User Authentication" — use "Authenticate User" instead)

Inheritance (Generalization) rules:
- Inheritance is ONLY allowed between actors, never between use cases
- To show one actor is a specialization of another, use: ChildActor --|> ParentActor
- Example: "Admin --|> User" means Admin inherits from User
- Do NOT use --|> between use cases under any circumstances

Extend relationship rules:
- Use «extend» to show that one use case optionally extends another
- The arrow goes FROM the extending use case TO the base use case, as a dashed arrow
- Syntax: ExtendingUseCase .down.> BaseUseCase : «extend»
- Example: "Edit Transcript" extends "View Transcript" meaning the user CAN edit after viewing, but it is optional
- Use extend only for optional/conditional behavior that is not part of the main flow

Include relationship rules:
- Use «include» when a use case always calls another as a mandatory sub-step
- Syntax: BaseUseCase .down.> IncludedUseCase : «include»

Actors:
{actors}

Use Cases:
{frs}
"""

    elif diagram_type == "class":
        return f"""
Generate a PlantUML CLASS diagram.

Strict rules:
- Only return valid PlantUML
- Extract meaningful classes from actions
- Include methods
- No explanations

Actors:
{actors}

Actions:
{frs}
"""

    elif diagram_type == "sequence":
        return f"""
Generate a PlantUML SEQUENCE diagram.

Strict rules:
- Only return valid PlantUML
- Use @startuml and @enduml
- Show interaction between actors and system
- Show message flow clearly
- No explanations

Actors:
{actors}

Interactions:
{frs}
"""

    else:
        raise ValueError("Invalid diagram type")


# ==========================
# CLEAN AI OUTPUT
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
def render_diagram_with_kroki(uml_code: str):
    url = f"{KROKI_URL}/plantuml/png"

    response = requests.post(url, data=uml_code.encode("utf-8"))

    if response.status_code != 200:
        raise Exception(f"Kroki error: {response.text}")

    return response.content


# ==========================
# SAVE FILE
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

        # 2. Render
        image_bytes = render_diagram_with_kroki(uml_code)

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
                SessionService.update_session_status(db, session_id, "pending approval")
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
    if "timeout" in low or "timed out" in low:
        return "The request timed out. Please retry."
    if "all models failed" in low or "quota" in low or "429" in raw:
        return "AI generation quota exceeded. Please retry in a few minutes."
    if "invalid uml" in low or "plantuml" in low:
        return "Failed to generate valid diagram syntax. Please retry."
    # Generic fallback — never expose raw stack traces or HTML
    return "UML generation failed. Please retry."

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

        # ── 1. Fetch requirements ──────────────────────────────────────────
        from app.services.requirement_service import RequirementService
        if source == "session":
            req = RequirementService.get_latest_session_requirement(db, project_id, session_id)
        else:
            req = RequirementService.get_latest_project_requirement(db, project_id)
        requirements_json = req["data"]

        # ── 2. Run the pipeline ────────────────────────────────────────────
        result = generate_uml_pipeline(
            requirements_json=requirements_json,
            project_id=project_id,
            diagram_type=diagram_type,
            session_id=session_id if source == "session" else None,
        )

        # ── 3. Save artifact ───────────────────────────────────────────────
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
        db.commit()

        # ── 4. Notify ──────────────────────────────────────────────────────
        _notify_uml_members(
            db=db, project_id=project_id, session_id=session_id,
            notification_type="uml_generated",
            title="UML Diagram Ready",
            message=f"Your {diagram_type} UML diagram has been generated. [project_id:{project_id}]"
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