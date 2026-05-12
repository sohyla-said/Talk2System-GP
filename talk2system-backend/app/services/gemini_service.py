import os
import re
import json
import time
import logging
import csv
from pathlib import Path

from google import genai
from google.genai import types
from dotenv import load_dotenv
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

load_dotenv()

# =========================
# LOGGING
# =========================
logger = logging.getLogger("requirement_extractor")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

# =========================
# GEMINI CLIENT
# =========================
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise EnvironmentError(
        "GEMINI_API_KEY is not set. Add it to your .env file.\n"
        "Get a free key at: https://aistudio.google.com/apikey"
    )

client = genai.Client(api_key=api_key)

# Model waterfall: best → fallback → lightweight
# The service tries models in order on quota exhaustion (429).
MODELS = [
    "gemini-2.5-pro",        # best reasoning, 5 RPM / ~25 RPD free
    "gemini-2.5-flash",      # strong + fast, 10 RPM / ~500 RPD free
    "gemini-2.5-flash-lite", # lightweight fallback, 15 RPM / 1000 RPD free
]

# =========================
# CHUNKING  (kept as a safety net — rarely triggered with 1M context)
# =========================
def chunk_text(text: str, max_words: int = 80_000, overlap_sentences: int = 3) -> list[str]:
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    logger.info(f"Transcript has {len(sentences)} sentences")
    chunks, current, current_words = [], [], 0

    for sent in sentences:
        word_count = len(sent.split())
        if current_words + word_count > max_words and current:
            chunks.append(" ".join(current))
            logger.info(f"Created chunk {len(chunks)} ({current_words} words)")
            current = current[-overlap_sentences:]
            current_words = sum(len(s.split()) for s in current)
        current.append(sent)
        current_words += word_count

    if current:
        chunks.append(" ".join(current))
        logger.info(f"Created chunk {len(chunks)} ({current_words} words)")

    return chunks


# =========================
# PROMPT BUILDER
# =========================
def build_prompt(transcript: str) -> str:
    return f"""You are a senior requirements engineering expert.

Your task is to extract ALL valid functional and non-functional requirements from the meeting transcript below with HIGH PRECISION and ZERO HALLUCINATION.

=== WHAT TO EXTRACT ===

Extract both EXPLICIT and IMPLICIT requirements:

1. EXPLICIT — directly stated needs:
   - "The system must allow users to login"
   - "It should support 5,000 concurrent users"

2. IMPLICIT — logically implied but not directly stated:
   - If someone says "users can reset their password", imply: "the system must store user credentials securely"
   - If "admins can delete accounts" → imply: "the system must have role-based access control"

=== EXTRACTION RULES ===

1. Exhaustiveness is MANDATORY: capture every requirement clause. Do not omit any valid requirement.
2. Remove speaker names and conversational noise.
3. Split compound requirements into atomic ones (sentences with multiple actions joined by "and", "or", comma-separated lists, etc.).
4. Split multi-actor requirements: "both students and admins can X" → two separate requirements.
5. Resolve pronouns: replace "it", "they", "them" with the actual noun from context.
6. Normalize modal verbs: use "must" for mandatory, "should" for preferred.
7. Deduplicate: keep only the strongest modal version ("must" > "should" > "can").
8. Exclude timeline/schedule requirements (deadlines, launch dates, project phases).
9. Classify each requirement as:
   - "FR" (Functional Requirement): describes what the system does
   - "NFR" (Non-Functional Requirement): describes quality attributes
10. For NFRs, assign a category: "performance", "security", "usability", "reliability", "scalability", "maintainability", "compatibility", or "other".
11. Extract the actor (who performs the action) and a short feature label.

=== SELF-CHECK BEFORE RESPONDING ===

1. Did I miss any explicit requirement? If yes, add them.
2. Did I fabricate any requirement not grounded in the transcript? If yes, remove them.
3. Did I leave compound sentences unsplit? If yes, split them.
4. Did I classify FR/NFR correctly?
5. Did I duplicate any requirement? If yes, keep only the strongest modal version.

=== OUTPUT FORMAT ===

Respond with ONLY a JSON object in this exact structure (no extra text, no markdown):
{{
  "requirements": [
    {{
      "text": "the system must allow users to login",
      "type": "FR",
      "category": null,
      "actor": "user",
      "feature": "user login"
    }},
    {{
      "text": "the system must encrypt all stored passwords",
      "type": "NFR",
      "category": "security",
      "actor": "system",
      "feature": "password encryption"
    }}
  ]
}}

TRANSCRIPT:
{transcript}
"""


# =========================
# CALL GEMINI WITH RETRY + MODEL WATERFALL
# =========================
def call_gemini(prompt: str, max_retries: int = 3) -> str:
    """
    Call Gemini with:
      - JSON response mode (response_mime_type) for clean output
      - Exponential backoff on 429 (rate limit) errors
      - Model waterfall: tries next model when quota is exhausted
    """
    last_error = None

    for model_name in MODELS:
        for attempt in range(max_retries):
            try:
                logger.info(f"Calling {model_name} (attempt {attempt + 1})")

                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.1,           # low temp = consistent JSON
                        response_mime_type="application/json",  # forces JSON output
                    )
                )

                return response.text

            except Exception as e:
                error_str = str(e)
                last_error = error_str

                is_rate_limit = "429" in error_str or "RESOURCE_EXHAUSTED" in error_str
                is_quota_exhausted = "quota" in error_str.lower() or "RPD" in error_str

                if is_quota_exhausted and attempt == max_retries - 1:
                    logger.warning(f"{model_name} quota exhausted → trying next model")
                    break  # move to next model

                if is_rate_limit:
                    # Exponential backoff: 15s, 30s, 60s -> When Gemini says "you're calling too fast, wait progressively longer before retrying
                    wait = 15 * (2 ** attempt)
                    logger.warning(f"Rate limited on {model_name}. Waiting {wait}s...")
                    time.sleep(wait)
                else:
                    logger.error(f"{model_name} failed with non-rate-limit error: {error_str[:200]}")
                    break  # non-recoverable error, try next model

    raise RuntimeError(
        f"All Gemini models failed. Last error: {last_error}\n"
        "Check your GEMINI_API_KEY and free-tier quota at: "
        "https://aistudio.google.com → Settings → Rate Limits"
    )


# =========================
# JSON PARSING  (simplified — JSON mode makes this much cleaner)
# =========================
def extract_json(text: str) -> dict:
    """Parse Gemini JSON response. Handles rare cases where the model
    still wraps output in markdown fences despite JSON mode."""
    # Strip markdown fences if present
    cleaned = re.sub(r"```json|```", "", text).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Last resort: find outermost { ... }
        start = cleaned.find("{")
        end = cleaned.rfind("}") + 1
        if start != -1 and end > start:
            return json.loads(cleaned[start:end])
        raise ValueError(f"No valid JSON found in Gemini response: {text[:300]}")


def safe_parse(llm_output: str, prompt: str, retries: int = 2) -> list:
    """Parse and validate Gemini output. Retries with a repair prompt on failure."""
    last_error = None

    for attempt in range(retries):
        try:
            data = extract_json(llm_output)
            requirements = data.get("requirements", [])

            if not isinstance(requirements, list):
                raise ValueError("'requirements' must be a list")

            normalized = []
            for req in requirements:
                if not isinstance(req, dict):
                    raise ValueError("Each requirement must be a JSON object")
                if isinstance(req.get("category"), str):
                    req["category"] = req["category"].lower()
                normalized.append(req)

            return normalized

        except (json.JSONDecodeError, ValueError) as e:
            last_error = str(e)
            logger.warning(f"Parse attempt {attempt + 1} failed: {last_error}")

            if attempt < retries - 1:
                repair_prompt = (
                    f"Your previous output had invalid JSON.\n"
                    f"Error: {last_error}\n\n"
                    f"Return ONLY valid JSON matching this structure:\n"
                    f'{{"requirements": [{{"text": "...", "type": "FR", "category": null, "actor": "...", "feature": "..."}}]}}\n\n'
                    f"Original task:\n{prompt}"
                )
                llm_output = call_gemini(repair_prompt)

    logger.error(f"JSON parsing failed after {retries} attempts: {last_error}")
    return []


# =========================
# PROCESS ONE CHUNK
# =========================
def process_chunk(idx: int, chunk: str) -> list:
    logger.info(f"Processing chunk {idx + 1}")
    prompt = build_prompt(chunk)
    try:
        response = call_gemini(prompt)
        results = safe_parse(response, prompt)
        logger.info(f"Chunk {idx + 1} → {len(results)} requirements extracted")
        return results
    except Exception as e:
        logger.error(f"Chunk {idx + 1} failed: {e}")
        raise


# =========================
# DEDUPLICATION (unchanged from original)
# =========================

def deduplicate_requirements_semantically(requirements: list, threshold: float = 0.85) -> list:
    if not requirements:
        return []
    texts = [r.get("text", "").strip().lower() for r in requirements]
    vectorizer = TfidfVectorizer().fit_transform(texts)
    similarity_matrix = cosine_similarity(vectorizer)
    kept, dropped = [], set()
    for i in range(len(requirements)):
        if i in dropped:
            continue
        kept.append(requirements[i])
        for j in range(i + 1, len(requirements)):
            if similarity_matrix[i][j] >= threshold:
                dropped.add(j)
    return kept


# =========================
# MAIN EXTRACTION ENTRY POINT
# =========================
def extract_requirements(transcript: str) -> list:
    """
    Full pipeline: chunk (if needed) → call Gemini → parse → deduplicate.
    Returns a flat list of requirement dicts.
    """
    start_time = time.time()

    total_words = len(re.findall(r"\w+", transcript))
    logger.info(f"Transcript word count: {total_words}")
    chunks = chunk_text(transcript)
    logger.info(f"Processing {len(chunks)} chunk(s) with Gemini")

    all_requirements = []
    for idx, chunk in enumerate(chunks):
        results = process_chunk(idx, chunk)
        all_requirements.extend(results)

    # Deduplicate
    if len(chunks) > 1:
        all_requirements = deduplicate_requirements_semantically(all_requirements)

    elapsed = time.time() - start_time
    logger.info(
        f"Extraction complete: {len(all_requirements)} requirements "
        f"from {len(chunks)} chunk(s) in {elapsed:.1f}s"
    )

    write_requirements_to_file(all_requirements)
    write_extraction_metrics_to_csv(total_words, len(chunks), elapsed)

    return all_requirements


# =========================
# FILE HELPERS (unchanged from original)
# =========================
def write_requirements_to_file(requirements: list) -> str:
    output_path = Path(__file__).resolve().parents[2] / "data" / "extracted_requirements.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump({"requirements": requirements}, f, indent=2, ensure_ascii=False)
    logger.info(f"Saved requirements to {output_path}")
    return str(output_path)


def write_extraction_metrics_to_csv(transcript_length: int, chunk_count: int, execution_time: float) -> str:
    output_path = Path(__file__).resolve().parents[2] / "data" / "gemini_req_extraction_log.csv"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    file_exists = output_path.exists()
    with output_path.open("a", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["timestamp", "transcript_length", "chunk_count", "execution_time_s", "model"])
        writer.writerow([
            time.strftime("%Y-%m-%d %H:%M:%S"),
            transcript_length,
            chunk_count,
            round(execution_time, 2),
            MODELS[0],
        ])
    return str(output_path)