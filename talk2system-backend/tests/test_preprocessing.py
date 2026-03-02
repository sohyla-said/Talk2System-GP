import sys
import os
import json
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.nlp.preprocessing import RequirementPreprocessingPipeline


# ensures that the paths are always resolved relative to the script's location, regardless of where the script is executed.
FILE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/sample_transcript.txt'))
OUTPUT_FILE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/preprocessing_output.json'))

def test_preprocessing():
    transcript = ""
    try:
        with open(FILE_PATH, 'r') as file:
            transcript = file.read()
            # print(content)
    except FileNotFoundError:
        print(f"Error: the file {FILE_PATH} is not found")

    # initialize the pipeline object and run the pipeline
    pipeline = RequirementPreprocessingPipeline()
    result = pipeline.process(transcript)
    # Save to file
    with open(OUTPUT_FILE_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=4, ensure_ascii=False)

    print("Output saved to preprocessing_output.json")
    

if __name__ == '__main__':
    test_preprocessing()