from pathlib import Path
import json
from langchain_ollama import OllamaLLM
import time
import logging
import re
import csv

# =========================
# LOGGING
# =========================
logger = logging.getLogger("sentence_extractor")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

# =========================
# LLM SINGLETON — build once, reuse always
# =========================
llm = None

def _get_llm():
    logger.info("Initializing Ollama LLM for sentence extraction...")
    return OllamaLLM(
        model="qwen2.5:7b",
        streaming=False,    # not needed for invoke() as it always waits for the complete response,  Streaming is for token-by-token UI display — it adds overhead here with zero benefit.      
        temperature=0.1,    # low temp = more consistent JSON output
        # num_predict=512,
    )
    
llm = _get_llm() 

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
    return f"""You are a requirements engineering expert. Extract all requirement sentences from the transcript below.

Rules:
0. Exhaustiveness is mandatory: capture every requirement sentence or requirement clause in the transcript. Do not omit any valid requirement.
1. Extract clean, standalone requirement sentences.
2. Remove speaker names and conversational noise.
3. Split compound requirements into atomic requirements when a sentence contains multiple actions joined by words like and, or, plus, comma-separated lists, or phrases such as "create, update, or delete".
4. When a requirement applies to multiple actors (e.g., "both students and customers", "students, teachers, and admins"), split it into separate requirements for each actor.
5. Resolve pronouns and coreferences: replace pronouns (them, it, they, their, etc.) with the actual nouns they refer to from context. Infer the noun from surrounding sentences if needed.
6. Normalize modal verbs: use "must" for mandatory requirements and "should" for preferred/recommended requirements. If a requirement appears multiple times with different modal verbs (e.g., "students should rate courses" and "students must rate courses"), include only the strongest requirement (must > should > can).
7. Deduplicate: remove exact duplicate requirements or semantically identical requirements that differ only in modal verbs.
8. Exclude timeline and schedule requirements: DO NOT extract requirements about deadlines, timelines, project phases, or launch dates (e.g., "ready in four weeks", "launch in three months", "by end of week").
9. Preserve the original subject and remaining structure for each atomic requirement.
10. Output ONLY a JSON array of requirement strings, no extra text.
11. If none found, return: []
12. Treat the following as requirements when present: functional capabilities, constraints, security/privacy constraints, reliability constraints, performance constraints, scalability/capacity constraints, logging/audit requirements, validation requirements, and access-control requirements.
13. Requirements may use modal verbs or equivalents such as must, should, can, may, needs to, has to, be able to, support, prevent, allow, ensure, handle, track, validate, generate, respond within, and not crash.
14. Do not skip requirements because they are phrased conversationally or appear in the same speaker turn as non-requirement text.
15. Before producing the final JSON, internally perform a coverage check: verify every requirement-like clause in the transcript is represented exactly once (after splitting and deduplication).

Example:
Input: "users must be able to sign in and register"
Output:
["users must be able to sign in", "users must be able to register"]

Example:
Input: "admins should be able to create, update, or delete users and courses"
Output:
["admins should be able to create users", "admins should be able to create courses", "admins should be able to update users", "admins should be able to update courses", "admins should be able to delete users", "admins should be able to delete courses"]

Example:
Input: "students must be able to rate and review courses after completing them"
Output:
["students must be able to rate courses after completing them", "students must be able to review courses after completing them"]

Example:
Input: "both students and customers can browse courses"
Output:
["students can browse courses", "customers can browse courses"]

Example (Deduplication):
Input: Transcript contains both "students should rate courses" and "students must rate courses"
Output: Include only "students must rate courses" (must is stronger than should)

Example (Deduplication):
Input: Transcript contains "students should be able to rate courses after completing them" twice (word-for-word)
Output: Include it only once in the array

Example (Multiple Actors and Multiple Actions):
Input: "students, teachers, and customers should login, logout, and manage their profiles"
Output:
["students should login", "students should logout", "students should manage their profiles", "teachers should login", "teachers should logout", "teachers should manage their profiles", "customers should login", "customers should logout", "customers should manage their profiles"]

Example (Pronoun Resolution):
Input: Transcript says "Customers should be able to browse products, add them to a cart, and complete purchases"
Output: ["customers should be able to browse products", "customers should be able to add products to a cart", "customers should be able to complete purchases"]
Note: "them" is resolved to "products" from the previous phrase

Example (Exclude Timeline Requirements):
Input: Transcript contains "We want a working prototype in four weeks and a full launch in three months"
Output: Do NOT include these as requirements. Timeline and scheduling are project planning, not functional requirements.

Example (Non-Functional Coverage):
Input: "The system should not crash if the database goes down. It should support up to 10,000 concurrent users. The system should generate an audit log."
Output:
["the system should not crash if the database goes down", "the system should support up to 10,000 concurrent users", "the system should generate an audit log"]

Transcript:
{transcript}

Return only the JSON array."""

def extract_json_array(text: str) -> list:
    # Strip markdown fences if present
    text = re.sub(r"```json|```", "", text).strip()
    # Try to find a JSON array directly
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON array found in LLM output")

    data = json.loads(match.group())
    if not isinstance(data, list):
        raise ValueError("LLM output must be a JSON array")

    normalized = []
    for item in data:
        if not isinstance(item, str):
            raise ValueError("Each array item must be a string")
        sentence = item.strip()
        if sentence:
            normalized.append(sentence)

    return normalized

# =========================
# RETRY + SELF-REPAIR
# =========================
def safe_parse(llm_output: str, prompt: str, retries: int = 2):
    last_error = None

    for attempt in range(retries):
        try:
            return extract_json_array(llm_output)

        except (json.JSONDecodeError, ValueError, TypeError) as e:
            last_error = str(e)
            logger.warning(f"Parse attempt {attempt+1} failed: {last_error}")

            repair_prompt = f"""Your previous output had invalid JSON.

Error: {last_error}

Return ONLY a valid JSON array of strings matching this structure exactly:
["first requirement", "second requirement"]

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
        logger.info(f"Chunk {idx + 1} → {len(results)} sentences extracted")
        return results
    except Exception as e:
        logger.error(f"Chunk {idx+1} failed: {str(e)}")
        raise


def write_sentences_to_file(sentences: list) -> str:
    # default path: <talk2system-backend>/data/extracted_sentences.json
    output_path = Path(__file__).resolve().parents[2] / "data" / "extracted_sentences.json"

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as file:
        json.dump({"sentences": sentences}, file, indent=2, ensure_ascii=False)

    logger.info(f"Saved extracted sentences to {output_path}")
    return str(output_path)


def write_extraction_metrics_to_csv(transcript_length: int, chunk_count: int, execution_time: float) -> str:
    output_path = Path(__file__).resolve().parents[2] / "data" / "llm_sentence_extraction_log.csv"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    file_exists = output_path.exists()
    with output_path.open("a", encoding="utf-8", newline="") as file:
        writer = csv.writer(file)
        if not file_exists:
            writer.writerow(["transcript_length_words", "chunk_count", "execution_time_seconds"])
        writer.writerow([transcript_length, chunk_count, f"{execution_time:.4f}"])

    logger.info(f"Saved extraction metrics to {output_path}")
    return str(output_path)

def extract_sentences(transcript: str):

    start_time = time.time()
    logger.info("Starting sentence extraction pipeline")
    # Log total transcript word count
    total_words = len(re.findall(r"\w+", transcript))
    logger.info(f"Transcript word count: {total_words}")

    chunks = chunk_text(transcript, max_words=300)
    chunk_count = len(chunks)
    logger.info(f"Transcript split into {chunk_count} chunks")

    all_sentences = []

    for idx, chunk in enumerate(chunks):
        results = process_chunk(idx, chunk)
        all_sentences.extend(results)

    write_sentences_to_file(all_sentences)
    execution_time = time.time() - start_time
    write_extraction_metrics_to_csv(total_words, chunk_count, execution_time)

    logger.info(f"Completed in {execution_time:.2f}s")
    return all_sentences




# if __name__ == "__main__":
#     transcript = """

# """
#     response = extract_sentences(transcript)
