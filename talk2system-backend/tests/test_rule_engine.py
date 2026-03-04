import sys
import os
import json

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.nlp.rule_engine import RuleBasedRequirementEngine


# Resolve paths relative to this script
PREPROCESSING_FILE_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), '../data/preprocessing_output.json')
)

RULE_ENGINE_OUTPUT_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), '../data/rule_engine_output.json')
)


def test_rule_engine():

    preprocessed_data = []

    # Load preprocessing output
    try:
        with open(PREPROCESSING_FILE_PATH, 'r', encoding="utf-8") as file:
            preprocessed_data = json.load(file)
    except FileNotFoundError:
        print(f"Error: {PREPROCESSING_FILE_PATH} not found.")
        return

    # Initialize rule engine
    engine = RuleBasedRequirementEngine()

    # Process transcript
    requirements = engine.process_transcript(preprocessed_data)

    # Save output to new JSON file
    with open(RULE_ENGINE_OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(requirements, f, indent=4, ensure_ascii=False)

    print("Rule engine output saved to rule_engine_output.json")


if __name__ == '__main__':
    test_rule_engine()