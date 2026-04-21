from pathlib import Path
import json
from langchain_ollama import OllamaLLM
import time


def extract_sentences(transcript: str):

    start_time = time.time()

    # Initialize the model
    llm = OllamaLLM(model="qwen2.5:7b")

    prompt =f"""You are a requirements engineering expert. Extract all requirement sentences from the transcript below.

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
    # Run inference
    print("Calling Ollama model for sentences extraction...", flush=True)
    try:
        response = llm.invoke(prompt)
    except Exception as exc:
        print(f"LLM call failed: {exc!r}", flush=True)
        raise
    print("Ollama model for sentences extraction call completed.", flush=True)

    # Print result
    # print("\nModel Output:\n", flush=True)
    # print(type(response))
    # print(response, flush=True)
    response_array = json.loads(response)
    # print(type(response_array))
    # print(response_array)


    end_time = time.time()

    execution_time = end_time - start_time

    print(f"\nLLM senetnce extraction Execution Time: {execution_time:.4f} seconds", flush=True)

    return response_array


# def save_output_to_file(response, output_path: Path):
#     """Save the LLM output to a JSON file."""
#     try:
#         parsed_response = json.loads(response)
#         output_path.write_text(json.dumps(parsed_response, indent=2, ensure_ascii=False), encoding="utf-8")
#     except json.JSONDecodeError:
#         output_path.write_text(response, encoding="utf-8")

#     print(f"Saved output to: {output_path}", flush=True)


# if __name__ == "__main__":
#     transcript = """Speaker A: Hi, everyone. Good morning.
# Speaker B: Good morning. How are you?
# Speaker A: I'm good, thanks. So. Yeah, let's start.
# Speaker B: The system must allow users to sign in and register. Do you mean login and sign up? Yes, exactly. It should allow them to log in using email and password.
# Speaker C: The system must be highly secure and must not store passwords in plain text. The user interface should be simple, clean and responsive.
# Speaker D: The user can reset password if they forget it.
# Speaker A: The system should not crash if the database goes down. It must prevent unauthorized access.
# Speaker D: It should Support up to 10,000 concurrent users.
# Speaker A: The system should generate an audit log. Alright, that's everything for today.
# Speaker D: Thanks, everyone.
# """
#     response = extract_sentences(transcript)
    # output_file = Path(__file__).with_name("llm_preprocessing_output.json")
    # save_output_to_file(response, output_file)