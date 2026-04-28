import time
import json
import re
import logging

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
You are a software requirements analysis assistant.

    Your task is to extract structured requirements from a transcript.

    Instructions:

    1. Sentence Segmentation & Decomposition:
    - Split the transcript into requirement sentences.
    - If a sentence contains multiple actions or functionalities, split it into MULTIPLE atomic requirements.
    - Each requirement must describe ONE single action or functionality only.

    Example:
    Input:
    "Customers should be able to browse products, add them to a cart, and complete purchases."

    Output:
    - "Customers should be able to browse products"
    - "Customers should be able to add products to cart"
    - "Customers should be able to complete purchases"

    Input:
    "The system must allow users to sign in and register"
    
    Output:
    - "The system must allow users to sign in"
    - "The system must allow users to register"

    2. For each atomic requirement:
    - Classify it as:
    - "FR" (Functional Requirement)
    - "NFR" (Non-Functional Requirement)
    - If it is NFR, assign a category from:
    ["performance", "security", "usability", "reliability", "scalability", "maintainability"]
    - If it is FR, category must be null.

    3. Extract the main actor in the requirement (e.g., user, admin, customer, system).

    4. Extract the feature (the main functionality, e.g., login, browse products, upload file).

    ---

    Output format:
    Return ONLY valid JSON in this exact structure:
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
            requirements = data.get("requirements", [])

            if not isinstance(requirements, list):
                raise ValueError("requirements must be a list")

            normalized_requirements = []
            for requirement in requirements:
                if not isinstance(requirement, dict):
                    raise ValueError("Each requirement must be an object")

                if isinstance(requirement.get("category"), str):
                    requirement["category"] = requirement["category"].lower()

                normalized_requirements.append(requirement)

            return normalized_requirements

        except (json.JSONDecodeError, ValueError, TypeError) as e:
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

    all_requirements = []

    for idx, chunk in enumerate(chunk_text(transcript)):
        logger.info(f"Processing chunk {idx + 1}")

        prompt = build_prompt(chunk)

        try:
            response = llm.invoke(prompt)

            requirements = safe_parse(
                llm_output=response,
                llm=llm,
                prompt=prompt,
                retries=2
            )

            all_requirements.extend(requirements)

        except Exception as e:
            logger.error(f"Chunk {idx+1} failed: {str(e)}")

    execution_time = time.time() - start_time
    logger.info(f"Completed in {execution_time:.2f}s")

    return all_requirements