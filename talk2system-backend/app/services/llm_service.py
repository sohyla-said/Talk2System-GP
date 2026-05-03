import time
import json
import re
import logging
import csv
from pathlib import Path

from langchain_ollama import OllamaLLM
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


# =========================
# LOGGING
# =========================
logger = logging.getLogger("requirement_extractor")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

# =========================
# LLM SINGLETON — build once, reuse always
# =========================
llm = None

def _get_llm():
    logger.info("Initializing Ollama LLM for requirement extraction...")
    return OllamaLLM(
        model="qwen2.5:7b",
        streaming=False,    # not needed for invoke() as it always waits for the complete response,  Streaming is for token-by-token UI display — it adds overhead here with zero benefit.      
        temperature=0.1,    # low temp = more consistent JSON output
        # num_predict=512,
    )
    
llm = _get_llm()        # module-level, created once when the module is first imported

# =========================
# CHUNKING
# =========================
# use sentence aware splitting, instead of word-based splitting that cuts mid-sentence
# This guarantees no sentence is cut in half, and carries the last few sentences forward as overlap/context.
def chunk_text(text: str, max_words: int = 300, overlap_sentences: int = 3):
    # split at whitespace (spaces, tabs, newlines, etc.) that immediately follows sentence-ending punctuation(., !, ?).
    senetnces = re.split(r'(?<=[.!?])\s+', text.strip())
    logger.info(f'Number of sentences in the transcript: {len(senetnces)}')
    chunks, current, current_words = [], [], 0

    for sent in senetnces:
        word_count = len(sent.split())
        if current_words + word_count > max_words and current:
            chunk = " ".join(current)
            chunks.append(chunk)
            logger.info(f"Created chunk {len(chunks)} with {len(chunk.split())} words")
            current = current[-overlap_sentences:] # carry last N sentences, to ensure context overlp
            current_words = sum(len(s.split()) for s in current)
        current.append(sent)
        current_words += word_count

    if current:
        chunk = " ".join(current)
        chunks.append(chunk)
        logger.info(f"Created chunk {len(chunks)} with {len(chunk.split())} words")

    return chunks


# =========================
# PROMPT BUILDER
# =========================
def build_prompt(transcript: str) -> str:
    return f"""
You are a senior requirements engineering expert.

Your task is to extract ALL valid functional and non-functional requirements from the meeting transcript below with HIGH PRECISION and ZERO HALLUCINATION.

=== WHAT TO EXTRACT ===

Extract both EXPLICIT and IMPLICIT requirements:

1. EXPLICIT — directly stated needs:
   - "The system must allow users to login"
   - "It should support 5,000 concurrent users"

   2. IMPLICIT — inferred from action verbs when the system behavior is obvious and necessary:
   - "users will upload documents" → the system must support file upload
   - "admins manage users" → the system must provide user management for admins
   - "payments will be processed" → the system must handle payment processing

Treat the following as requirements when present:
- Functional capabilities, permissions, workflows, integrations, actions
- Security/privacy constraints, reliability constraints, performance constraints
- Scalability/capacity constraints, logging/audit requirements, validation requirements, access-control requirements

Requirements may use modal verbs or equivalents such as: must, should, can, may, needs to, has to, be able to, support, prevent, allow, ensure, handle, track, validate, generate, respond within, not crash.

=== WHAT TO IGNORE ===

Completely ignore:
- Greetings, farewells, small talk
- Scheduling and timeline talk (e.g., "ready in four weeks", "launch in three months")
- Off-topic discussions unrelated to the system being built
- Opinions, feedback, or questions that do not describe a system behavior

=== HOW TO EXTRACT ===

0. Exhaustiveness is mandatory: capture EVERY requirement sentence or clause. Do not omit any valid requirement.

1. Decompose compound sentences into atomic requirements (one action per requirement):
   Example: "Users can browse, filter, and purchase products"
   → "The user must be able to browse products"
   → "The user must be able to filter products"
   → "The user must be able to purchase products"

2. When a requirement applies to multiple actors, split it into separate requirements for each actor:
   Example: "students and admins should login and manage profiles"
   → "students should login"
   → "students should manage their profiles"
   → "admins should login"
   → "admins should manage their profiles"

3. Resolve pronouns — replace "it", "they", "them" with the actual entity from context:
   Example: "Customers should browse products and add them to a cart"
   → "customers should browse products"
   → "customers should add products to a cart"

4. Normalize modal verbs:
   - Mandatory → "must"
   - Preferred  → "should"
   - If a requirement appears multiple times with different modals, keep only the strongest (must > should > can)

5. Deduplicate: remove exact duplicates or semantically identical requirements.

6. Classify each requirement:
   - "FR" — describes a system behavior or capability
   - "NFR" — describes a quality constraint
   - NFR categories: ["performance", "security", "usability", "reliability", "scalability", "maintainability"]

7. Extract:
   - actor: who performs the action (user, admin, system, customer, ...)
   - feature: the core capability (login, upload file, manage users)

=== EXAMPLES ===

Input: "users must be able to sign in and register"
Output: [{{"text": "users must be able to sign in", "type": "FR", "category": null, "actor": "user", "feature": "sign in"}}, {{"text": "users must be able to register", "type": "FR", "category": null, "actor": "user", "feature": "register"}}]

Input: "The system should not crash if the database goes down. It should support up to 10,000 concurrent users."
Output: [{{"text": "the system should not crash if the database goes down", "type": "NFR", "category": "reliability", "actor": "system", "feature": "fault tolerance"}}, {{"text": "the system should support up to 10,000 concurrent users", "type": "NFR", "category": "scalability", "actor": "system", "feature": "concurrent users"}}]

=== OUTPUT FORMAT ===

Return ONLY valid JSON. No explanation, no markdown, no extra text.

{{
  "requirements": [
    {{
      "text": "The user must be able to reset their password",
      "type": "FR",
      "category": null,
      "actor": "user",
      "feature": "password reset"
    }}
  ]
}}

Before producing output, silently verify:
1. Did I miss any requirement clause from the transcript? If yes, add it.
2. Did I invent specific values (numbers, limits, technologies) not in the transcript?
   If yes, remove them. Implicit requirements may name a capability but never a constraint value.
3. Did I leave compound sentences unsplit? If yes, split them.
4. Did I leave multi-actor requirements unsplit? If yes, split them.
5. Did I classify FR/NFR correctly?
6. Did I duplicate any requirement? If yes, keep only the strongest modal version.

TRANSCRIPT:
{transcript}
"""


# =========================
# JSON EXTRACTION
# =========================
# def extract_json(text: str) -> dict:
#     match = re.search(r"\{.*\}", text, re.DOTALL)
#     if not match:
#         raise ValueError("No JSON found in LLM output")

#     return json.loads(match.group())
def extract_json(text: str) -> dict:
    # Try direct parse first (clean output)
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    # Find the requirements block specifically
    match = re.search(r'\{\s*"requirements"\s*:\s*\[.*?\]\s*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    # Last resort: find outermost braces and try progressively shorter matches
    start = text.find('{')
    if start == -1:
        raise ValueError("No JSON found in LLM output")
    
    # Walk backwards from end to find a valid closing brace
    end = len(text)
    while end > start:
        candidate = text[start:end]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            end = text.rfind('}', start, end)
            if end == -1:
                break
            end += 1  # include the closing brace

    raise ValueError("No valid JSON found in LLM output")


# =========================
# RETRY + SELF-REPAIR
# =========================
def safe_parse(llm_output: str, prompt: str, retries: int = 2):
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

            repair_prompt = f"""Your previous output had invalid JSON.

Error: {last_error}

Return ONLY valid JSON matching this structure exactly:
{{"requirements": [{{"text": "...", "type": "FR", "category": null, "actor": "...", "feature": "..."}}]}}

Original task:
{prompt}
"""

            llm_output = llm.invoke(repair_prompt)

    logger.error(f"Final failure after retries: {last_error}")
    return []


# =========================
# PROCESS ONE CHUNK
# =========================
def process_chunk(idx: int, chunk: str) -> list:
    logger.info(f"Processing chunk {idx + 1}")
    prompt = build_prompt(chunk)
    try:
        response = llm.invoke(prompt)
        results = safe_parse(response, prompt)
        logger.info(f"Chunk {idx + 1} → {len(results)} requirements extracted")
        return results
    except Exception as e:
        logger.error(f"Chunk {idx+1} failed: {str(e)}")
        raise
    

# =========================
# Deduplicate logic
# =========================
# 1) deduplicate requirements that have the exact text
def exact_requirement_text_deduplicate(requirements: list) -> list:
    if not requirements:
        return []
    seen = set()
    unique = []
    for req in requirements:
        key = req.get("text", "").strip().lower()
        if key not in seen:
            seen.add(key)
            unique.append(req)
    return unique

# 2) semantic deduplication
def deduplicate_requirements_semantically(requirements: list, threshold: float = 0.85) -> list:
    if not requirements:
        return []
    texts = [r.get("text", "").strip().lower() for r in requirements]
    vectorizer = TfidfVectorizer().fit_transform(texts)
    similarity_matrix = cosine_similarity(vectorizer)

    kept = []
    dropped = set()

    for i in range(len(requirements)):
        if i in dropped:
            continue
        kept.append(requirements[i])
        for j in range(i + 1, len(requirements)):
            if similarity_matrix[i][j] >= threshold:
                dropped.add(j)
        
    return kept


def write_requirements_to_file(requirements: list) -> str:
    # default path: <talk2system-backend>/data/extracted_requirements.json
    output_path = Path(__file__).resolve().parents[2] / "data" / "extracted_requirements.json"

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as file:
        json.dump({"requirements": requirements}, file, indent=2, ensure_ascii=False)

    logger.info(f"Saved extracted requirements to {output_path}")
    return str(output_path)


def write_extraction_metrics_to_csv(transcript_length: int, chunk_count: int, execution_time: float) -> str:
    output_path = Path(__file__).resolve().parents[2] / "data" / "llm_req_extraction_log.csv"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    file_exists = output_path.exists()
    with output_path.open("a", encoding="utf-8", newline="") as file:
        writer = csv.writer(file)
        if not file_exists:
            writer.writerow(["transcript_length_words", "chunk_count", "execution_time_seconds"])
        writer.writerow([transcript_length, chunk_count, f"{execution_time:.4f}"])

    logger.info(f"Saved extraction metrics to {output_path}")
    return str(output_path)


# =========================
# MAIN FUNCTION
# =========================
def extract_requirements(transcript: str):
    start_time = time.time()
    logger.info("Starting requirement extraction pipeline")
    # Log total transcript word count
    total_words = len(re.findall(r"\w+", transcript))
    logger.info(f"Transcript word count: {total_words}")

    chunks = chunk_text(transcript, max_words=300)
    chunk_count = len(chunks)
    logger.info(f"Transcript split into {chunk_count} chunks")

    all_requirements = []

    for idx, chunk in enumerate(chunks):
        results = process_chunk(idx, chunk)
        all_requirements.extend(results)

    unique_requirements = exact_requirement_text_deduplicate(all_requirements)
    final_requirements = deduplicate_requirements_semantically(unique_requirements)

    write_requirements_to_file(final_requirements)
    execution_time = time.time() - start_time
    write_extraction_metrics_to_csv(total_words, chunk_count, execution_time)

    logger.info(f"Completed in {execution_time:.2f}s")
    return final_requirements



# if __name__ == '__main__':
#     transcript = """

# """
#     requirements = extract_requirements(transcript)
    