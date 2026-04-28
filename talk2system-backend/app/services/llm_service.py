import time
import json
import re
import logging
from typing import List, Optional, Literal, Generator

from pydantic import BaseModel, ValidationError
from langchain_ollama import OllamaLLM


# =========================
# LOGGING
# =========================
logger = logging.getLogger("requirement_extractor")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

# =========================
# PYDANTIC SCHEMA
# =========================
class Requirement(BaseModel):
    text: str
    type: Literal["FR", "NFR"]
    category: Optional[Literal[
        "performance",
        "security",
        "usability",
        "reliability",
        "scalability",
        "maintainability"
    ]] = None
    actor: Optional[str] = None
    feature: Optional[str] = None


class RequirementResponse(BaseModel):
    requirements: List[Requirement]


# =========================
# CHUNKING
# =========================
def chunk_text(text: str, max_words: int = 800):
    words = text.split()
    for i in range(0, len(words), max_words):
        yield " ".join(words[i:i + max_words])


# =========================
# PROMPT BUILDER
# =========================
def build_prompt(transcript: str) -> str:
    return f"""
You are a senior software requirements analyst.

TASK:
Extract atomic software requirements from the transcript.

RULES:
- Split into atomic requirements (ONE action only)
- Do NOT merge multiple actions
- Do NOT hallucinate
- Do not include noise and irrelevent talk
- Extract: type (FR/NFR), actor, feature, category (if NFR)

OUTPUT FORMAT (STRICT JSON ONLY):
{{
  "requirements": [
    {{
      "text": "...",
      "type": "FR",
      "category": null,
      "actor": "...",
      "feature": "..."
    }}
  ]
}}

TRANSCRIPT:
{transcript}
"""


# =========================
# JSON EXTRACTION
# =========================
def extract_json(text: str) -> dict:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON found in LLM output")

    return json.loads(match.group())


# =========================
# RETRY + SELF-REPAIR
# =========================
def safe_parse(llm_output: str, llm, prompt: str, retries: int = 2):
    last_error = None

    for attempt in range(retries):
        try:
            data = extract_json(llm_output)
            validated = RequirementResponse(**data)
            return validated.requirements

        except (ValidationError, json.JSONDecodeError, ValueError) as e:
            last_error = str(e)
            logger.warning(f"Parse attempt {attempt+1} failed: {last_error}")

            repair_prompt = f"""
Your previous output was INVALID.

ERROR:
{last_error}

Fix it and return ONLY valid JSON.

Original task:
{prompt}
"""

            llm_output = llm.invoke(repair_prompt)

    logger.error(f"Final failure after retries: {last_error}")
    return []



# =========================
# MAIN FUNCTION
# =========================
def extract_requirements(transcript: str):
    start_time = time.time()

    llm = OllamaLLM(
        model="qwen2.5:7b",
        streaming=True
    )

    logger.info("Starting requirement extraction pipeline")

    all_requirements: List[Requirement] = []

    for idx, chunk in enumerate(chunk_text(transcript)):
        logger.info(f"Processing chunk {idx + 1}")

        prompt = build_prompt(chunk)

        try:
            response = llm.invoke(prompt)

            requirements = safe_parse(
                response= llm.invoke(prompt),
                llm=llm,
                prompt=prompt,
                retries=2
            )

            all_requirements.extend(requirements)

        except Exception as e:
            logger.error(f"Chunk {idx+1} failed: {str(e)}")

    execution_time = time.time() - start_time
    logger.info(f"Completed in {execution_time:.2f}s")

    return [r.model_dump() for r in all_requirements]