import os
import requests
import google.generativeai as genai
from datetime import datetime

# ==========================
# CONFIG
# ==========================
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    
KROKI_URL = "https://kroki.io"
STORAGE_PATH = "storage/uml"

# ==========================
# AI: GENERATE UML CODE
# ==========================
def generate_uml_code_with_ai(requirements_json: dict, diagram_type: str):
    grouped = requirements_json
    model = genai.GenerativeModel("gemini-3-flash")

    prompt = build_prompt(grouped, diagram_type)

    response = model.generate_content(prompt)

    uml_code = clean_uml_output(response.text)

    return uml_code

# ==========================
# PROMPT BUILDER
# ==========================
def build_prompt(grouped, diagram_type):
    actors = grouped["actors"]
    frs = grouped["functional_requirements"]

    if diagram_type == "usecase":
        return f"""
Generate a PlantUML USE CASE diagram.

Strict rules:
- Only return valid PlantUML code
- Start with @startuml and end with @enduml
- No explanations
- Define actors
- Define use cases from functional requirements
- Link actors to use cases

Actors:
{actors}

Functional Requirements:
{frs}
"""

    elif diagram_type == "class":
        return f"""
Generate a PlantUML CLASS diagram.

Strict rules:
- Only return valid PlantUML
- Extract meaningful classes
- Include methods from requirements
- No explanations

Actors:
{actors}

Functional Requirements:
{frs}
"""

    elif diagram_type == "sequence":
        return f"""
Generate a PlantUML SEQUENCE diagram.

Strict rules:
- Only return valid PlantUML
- No explanations
- Use @startuml and @enduml
- Show actor-system interactions
- Show message flow

Actors:
{actors}

Functional Requirements:
{frs}
"""

    else:
        raise ValueError("Invalid diagram type")
    
# ==========================
# CLEAN AI OUTPUT
# ==========================
def clean_uml_output(text: str):
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
def save_uml_file(image_bytes, project_id, diagram_type):
    os.makedirs(STORAGE_PATH, exist_ok=True)

    filename = f"{diagram_type}_{project_id}_{int(datetime.utcnow().timestamp())}.png"
    path = os.path.join(STORAGE_PATH, filename)

    with open(path, "wb") as f:
        f.write(image_bytes)

    return path


# ==========================
# MAIN PIPELINE
# ==========================
def generate_uml_pipeline(requirements_json, project_id, diagram_type):

    try:
        # 1. AI generates UML code
        uml_code = generate_uml_code_with_ai(requirements_json, diagram_type)

        # 2. Kroki renders diagram
        image_bytes = render_diagram_with_kroki(uml_code)

        # 3. Save file
        file_path = save_uml_file(image_bytes, project_id, diagram_type)

        return {
            "uml_code": uml_code,
            "file_path": file_path
        }

    except Exception as e:
        raise Exception(f"UML generation failed: {str(e)}")
    