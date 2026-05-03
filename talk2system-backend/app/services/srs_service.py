import os
import re
import requests
from datetime import datetime
from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from app.db.session import get_db
from app.services.session_service import SessionService

# ==========================
# CONFIG
# ==========================
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:7b"
STORAGE_PATH = "storage/srs"

# ==========================
# SUPPORTED FORMAT VERSIONS
# ==========================
SUPPORTED_FORMATS = ["ieee_830", "iso_iec_29148", "modern_agile"]

# ==========================
# HELPERS
# ==========================
def format_requirements_for_prompt(requirements_json: dict) -> str:
    actors = requirements_json.get("actors", [])
    features = requirements_json.get("features", [])
    frs = requirements_json.get("functional_requirements", [])
    nfrs = requirements_json.get("nonfunctional_requirements", []) or \
           requirements_json.get("non_functional_requirements", [])

    lines = []

    if actors:
        lines.append("ACTORS:")
        for a in actors:
            lines.append(f"  - {a}")

    if features:
        lines.append("\nFEATURES:")
        for f in features:
            lines.append(f"  - {f}")

    if frs:
        lines.append("\nFUNCTIONAL REQUIREMENTS:")
        for i, fr in enumerate(frs, 1):
            actor = fr.get("actor", "")
            text = fr.get("text", "")
            feature = fr.get("feature", "")
            lines.append(f"  FR-{i}: [{actor}] {text} (Feature: {feature})")

    if nfrs:
        lines.append("\nNON-FUNCTIONAL REQUIREMENTS:")
        for i, nfr in enumerate(nfrs, 1):
            category = nfr.get("category", "General")
            text = nfr.get("text", "")
            lines.append(f"  NFR-{i}: [{category}] {text}")

    return "\n".join(lines)


# ==========================
# BUILD PROMPT — IEEE 830
# (original, preserved exactly)
# ==========================
def build_srs_prompt_ieee_830(requirements_json: dict, project_name: str) -> str:
    formatted = format_requirements_for_prompt(requirements_json)

    return f"""You are a senior software engineer writing a formal IEEE 830 Software Requirements Specification (SRS).

Generate a complete SRS document for the system named "{project_name}".

Requirements Data:
{formatted}

Output ONLY the document using this EXACT structure with these EXACT section headings:

# 1. Introduction
## 1.1 Purpose
## 1.2 Scope
## 1.3 Definitions and Acronyms

# 2. Overall Description
## 2.1 Product Perspective
## 2.2 User Classes and Characteristics
## 2.3 Assumptions and Dependencies

# 3. Functional Requirements
List every functional requirement using this format for each one:
**FR-N** | Actor: [actor] | Feature: [feature]
The system shall [requirement text].

# 4. Non-Functional Requirements
## 4.1 Performance
## 4.2 Security
## 4.3 Usability
## 4.4 Reliability

STRICT RULES:
- Output ONLY the document, nothing before or after it
- Start directly with # 1. Introduction
- Do NOT include a section for External Interfaces
- Do NOT include a Traceability Matrix
- Use "shall" for all functional requirements
- Keep NFRs measurable with numbers where possible
"""


# ==========================
# BUILD PROMPT — ISO/IEC/IEEE 29148
# ==========================
def build_srs_prompt_iso_29148(requirements_json: dict, project_name: str) -> str:
    formatted = format_requirements_for_prompt(requirements_json)

    return f"""You are a senior systems engineer writing a formal Software Requirements Specification (SRS) compliant with ISO/IEC/IEEE 29148:2018.

Generate a complete SRS document for the system named "{project_name}".

Requirements Data:
{formatted}

Output ONLY the document using this EXACT structure with these EXACT section headings:

# 1. Introduction
## 1.1 Purpose
## 1.2 Scope
## 1.3 Definitions, Acronyms, and Abbreviations
## 1.4 References
## 1.5 Overview

# 2. Overall Description
## 2.1 Product Perspective
## 2.2 Product Functions
## 2.3 User Characteristics
## 2.4 Constraints
## 2.5 Assumptions and Dependencies

# 3. Specific Requirements
## 3.1 Functional Requirements
List every functional requirement using this format:
**FR-N** | Actor: [actor] | Feature: [feature]
The system shall [requirement text].

## 3.2 Non-Functional Requirements
### 3.2.1 Performance Requirements
### 3.2.2 Security Requirements
### 3.2.3 Usability Requirements
### 3.2.4 Reliability Requirements
### 3.2.5 Maintainability Requirements

# 4. Verification
## 4.1 Verification Methods
## 4.2 Acceptance Criteria
For each major functional requirement group, state the verification method (Test, Inspection, Demonstration, Analysis).

# 5. Traceability
## 5.1 Requirements Traceability Matrix
List each FR with its source actor, feature, and verification method in a table format:
| Req ID | Description Summary | Actor | Feature | Verification |

STRICT RULES:
- Output ONLY the document, nothing before or after it
- Start directly with # 1. Introduction
- Use "shall" for all mandatory functional requirements
- Use "should" for recommended non-functional requirements
- Keep NFRs measurable with specific metrics where possible
- Include at least one verification method per functional requirement group
"""


# ==========================
# BUILD PROMPT — Modern Agile SRS
# ==========================
def build_srs_prompt_modern_agile(requirements_json: dict, project_name: str) -> str:
    formatted = format_requirements_for_prompt(requirements_json)

    return f"""You are a senior product engineer writing a Modern Agile Software Requirements Specification (SRS).
This format prioritizes clarity, traceability, and user-centric language over rigid formality.

Generate a complete SRS document for the system named "{project_name}".

Requirements Data:
{formatted}

Output ONLY the document using this EXACT structure with these EXACT section headings:

# 1. Introduction
## 1.1 Purpose and Vision
## 1.2 Scope
## 1.3 Stakeholders and Users
## 1.4 Glossary

# 2. System Context
## 2.1 Product Overview
## 2.2 Key User Personas
## 2.3 Constraints and Assumptions

# 3. Functional Requirements
For each functional requirement, use this format:
**FR-N** | Actor: [actor] | Feature: [feature]
As a [actor], I need to [requirement text] so that [business value].

# 4. Non-Functional Requirements
## 4.1 Performance
## 4.2 Security and Privacy
## 4.3 Usability and Accessibility
## 4.4 Reliability and Availability
## 4.5 AI and Automation Considerations

# 5. Acceptance Criteria
For each major feature group, list 2-3 measurable acceptance criteria using Given/When/Then format:
**Feature: [feature name]**
- Given [context], When [action], Then [expected outcome].

# 6. Traceability
## 6.1 Requirements Traceability
| Req ID | User Story Summary | Feature | Priority | Acceptance Criteria Ref |

STRICT RULES:
- Output ONLY the document, nothing before or after it
- Start directly with # 1. Introduction
- Use "must" for mandatory requirements, "should" for recommended ones
- Write functional requirements as user stories (As a / I need to / so that)
- Keep acceptance criteria concrete and testable
- Include AI/automation notes where relevant to modern systems
"""


# ==========================
# ROUTER — picks the right prompt builder
# ==========================
def build_srs_prompt(requirements_json: dict, project_name: str, format_version: str = "ieee_830") -> str:
    if format_version == "iso_iec_29148":
        return build_srs_prompt_iso_29148(requirements_json, project_name)
    elif format_version == "modern_agile":
        return build_srs_prompt_modern_agile(requirements_json, project_name)
    else:
        # default: ieee_830 (original behavior preserved)
        return build_srs_prompt_ieee_830(requirements_json, project_name)


# ==========================
# CALL OLLAMA
# ==========================
def generate_srs_text_with_ollama(
    requirements_json: dict,
    project_name: str = "Software System",
    format_version: str = "ieee_830"
) -> str:
    prompt = build_srs_prompt(requirements_json, project_name, format_version)

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "num_predict": 2000,
                    "num_ctx": 8192
                }
            },
            timeout=900
        )

        if response.status_code != 200:
            raise Exception(f"Ollama error: {response.status_code} — {response.text}")

        data = response.json()
        return data.get("response", "").strip()

    except requests.exceptions.ConnectionError:
        raise Exception("Ollama is not running. Start it with: ollama serve")
    except requests.exceptions.Timeout:
        raise Exception("Ollama timed out generating the SRS. Try again.")


# ==========================
# FORMAT DISPLAY NAMES (used in docx cover subtitle)
# ==========================
FORMAT_DISPLAY_NAMES = {
    "ieee_830": "IEEE Std 830 — Formal Requirements Document",
    "iso_iec_29148": "ISO/IEC/IEEE 29148:2018 — Systems and Software Requirements",
    "modern_agile": "Modern Agile SRS — User-Centric Requirements Specification",
}


# ==========================
# SAVE AS DOCX
# ==========================
def save_srs_as_docx(
    srs_text: str,
    project_id: int,
    session_id: int = None,
    format_version: str = "ieee_830"
) -> str:
    from docx.shared import Inches
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement

    os.makedirs(STORAGE_PATH, exist_ok=True)

    if session_id:
        filename = f"srs_P{project_id}_S{session_id}_{int(datetime.utcnow().timestamp())}.docx"
    else:
        filename = f"srs_P{project_id}_{int(datetime.utcnow().timestamp())}.docx"

    path = os.path.join(STORAGE_PATH, filename)
    doc = Document()

    # ---- Page margins (IEEE-style) ----
    for section in doc.sections:
        section.top_margin    = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin   = Inches(1.25)
        section.right_margin  = Inches(1.25)

    # ---- Cover block ----
    cover_title = doc.add_heading("Software Requirements Specification", level=0)
    cover_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = cover_title.runs[0]
    run.font.color.rgb = RGBColor(0x1E, 0x10, 0x5F)
    run.font.size = Pt(24)

    # Use the format-specific subtitle
    subtitle_text = FORMAT_DISPLAY_NAMES.get(format_version, "IEEE Std 830 — Formal Requirements Document")
    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub.add_run(subtitle_text).font.size = Pt(11)

    doc.add_paragraph()

    meta = doc.add_paragraph()
    meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    meta_run = meta.add_run(f"Generated: {datetime.utcnow().strftime('%B %d, %Y')} UTC")
    meta_run.font.size = Pt(10)
    meta_run.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

    doc.add_paragraph()

    # ---- Horizontal rule after cover ----
    p = doc.add_paragraph()
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '6')
    bottom.set(qn('w:space'), '1')
    bottom.set(qn('w:color'), '1E105F')
    pBdr.append(bottom)
    pPr.append(pBdr)

    doc.add_paragraph()

    # ---- Parse markdown into styled Word content ----
    for line in srs_text.split("\n"):
        stripped = line.strip()
        if not stripped:
            doc.add_paragraph()
            continue

        if stripped.startswith("#### "):
            doc.add_heading(stripped[5:], level=4)
        elif stripped.startswith("### "):
            doc.add_heading(stripped[4:], level=3)
        elif stripped.startswith("## "):
            doc.add_heading(stripped[3:], level=2)
        elif stripped.startswith("# "):
            doc.add_heading(stripped[2:], level=1)
        elif stripped.startswith("- ") or stripped.startswith("* "):
            p = doc.add_paragraph(style="List Bullet")
            _add_inline_bold(p, stripped[2:])
        elif re.match(r"^\d+\.", stripped):
            p = doc.add_paragraph(style="List Number")
            _add_inline_bold(p, re.sub(r"^\d+\.\s*", "", stripped))
        elif stripped.startswith("|"):
            # simple table row — render as plain paragraph in docx
            cells = [c.strip() for c in stripped.split("|") if c.strip()]
            p = doc.add_paragraph()
            p.add_run(" | ".join(cells))
        elif stripped.startswith("---"):
            # horizontal rule → paragraph border
            hr_p = doc.add_paragraph()
            hr_pPr = hr_p._p.get_or_add_pPr()
            hr_pBdr = OxmlElement('w:pBdr')
            hr_bottom = OxmlElement('w:bottom')
            hr_bottom.set(qn('w:val'), 'single')
            hr_bottom.set(qn('w:sz'), '4')
            hr_bottom.set(qn('w:space'), '1')
            hr_bottom.set(qn('w:color'), 'CCCCCC')
            hr_pBdr.append(hr_bottom)
            hr_pPr.append(hr_pBdr)
        else:
            p = doc.add_paragraph()
            _add_inline_bold(p, stripped)

    doc.save(path)
    return path


# ==========================
# INLINE BOLD HELPER
# ==========================
def _add_inline_bold(paragraph, text: str):
    parts = re.split(r'(\*\*[^*]+\*\*)', text)
    for part in parts:
        if part.startswith("**") and part.endswith("**"):
            run = paragraph.add_run(part[2:-2])
            run.bold = True
        else:
            paragraph.add_run(part)


# ==========================
# MAIN PIPELINE
# ==========================
def generate_srs_pipeline(
    requirements_json: dict,
    project_id: int,
    project_name: str = "Software System",
    session_id: int = None,
    format_version: str = "ieee_830"   # ← NEW PARAM, defaults to original behavior
) -> dict:
    try:
        srs_text = generate_srs_text_with_ollama(requirements_json, project_name, format_version)
        file_path = save_srs_as_docx(srs_text, project_id, session_id, format_version)
        if session_id:
            db = next(get_db())
            try:
                SessionService.update_session_status(db, session_id, "pending approval")
            finally:
                db.close()
        return {
            "srs_text": srs_text,
            "file_path": file_path
        }
    except Exception as e:
        raise Exception(f"SRS generation failed: {str(e)}")
 