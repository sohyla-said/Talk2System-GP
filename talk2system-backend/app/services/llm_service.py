from langchain_ollama import OllamaLLM
import time
import re
import json

def extract_requirements(transcript: str):

    start_time = time.time()

    # Initialize the model (make sure name matches what you pulled)
    llm = OllamaLLM(model="qwen2.5:7b")

    # Simple test prompt
    prompt = f"""
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
        }},
        {{
        "text": "...",
        "type": "NFR",
        "category": "performance",
        "actor": "system",
        "feature": "response time"
        }}
    ]
    }}

    ---

    Rules:
    - Output ONLY JSON (no explanation).
    - Each requirement must be atomic (one action only).
    - Do NOT merge multiple actions into one requirement.
    - Do NOT hallucinate.
    - If feature cannot be determined, use null.
    - Ensure valid JSON format.

    ---

    Transcript:
    {transcript}

    """
    print("Calling Ollama model for LLM direct classification...", flush=True)
    # Run inference
    try:
        response = llm.invoke(prompt)
    except Exception as exc:
        print(f"LLM call failed: {exc!r}", flush=True)
        raise
    print("Ollama model for LLM direct classification call completed.", flush=True)

    # Print result
    # print("\nModel Output:\n")
    # print(response)

    end_time = time.time()

    execution_time = end_time - start_time

    print(f"\nLLM classification Execution Time: {execution_time:.4f} seconds")



    try:
        # Extract JSON inside ```json ... ```
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', response, re.DOTALL)

        if json_match:
            json_str = json_match.group(1)
        else:
            # fallback: extract any JSON object
            json_str = re.search(r'\{.*\}', response, re.DOTALL).group()

        parsed = json.loads(json_str)
        return parsed["requirements"]

    except Exception as e:
        print("⚠️ JSON parsing failed. Raw output:")
        print(response)
        return []