# Talk2System Backend - NLP Preprocessing Pipeline & Rule-Based Requirement Extraction

## Overview

This project implements a comprehensive NLP model designed to process conversational transcripts and extract clean, structured requirements.

## Project Structure

```
talk2system-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                       # FastAPI app entry point
│   └── nlp/
│       ├── preprocessing.py          # Core preprocessing pipeline
│       └── rule_engine.py            # Rule-based requirement extraction
├── data/
│   ├── sample_transcript.txt         # Sample input transcript
│   ├── preprocessing_output.json     # Output from preprocessing pipeline
│   └── rule_engine_output.json       # Output from rule-based engine
├── tests/
│   ├── test_preprocessing.py         # Tests for preprocessing pipeline
│   └── test_rule_engine.py           # Tests for rule-based engine
├── requirements.txt                  # Python dependencies
└── README.md                      
```

## Preprocessing Pipeline
The pipeline transforms raw meeting transcripts into atomic, analysis-ready sentence objects suitable for downstream requirement extraction and analysis.

The `RequirementPreprocessingPipeline` performs the following transformations on conversation transcripts:

1. **Text Normalization** - Standardizes spacing, quotes, and punctuation
2. **Noise Removal** - Removes timestamps and non-verbal annotations
3. **Filler Removal** - Eliminates filler words while preserving modal verbs
4. **Coreference Resolution** - Replaces pronouns with their referenced entities
5. **Sentence Segmentation** - Splits transcript into individual sentences
6. **Conjunction Splitting** - Breaks compound sentences into atomic statements
7. **Tokenization** - Creates both spaCy and transformer-ready tokens
8. **Lemmatization** - Reduces tokens to their base forms
9. **Negation Detection** - Identifies and flags negation patterns
10. **Domain Term Normalization** - Standardizes domain-specific synonyms
11. **Irrelevant Sentence Filtering** - Removes greetings and social talk
12. **Deduplication** - Removes semantically similar sentences

### Output Format

Each processed sentence is returned as a structured object containing:
- `id` - Unique sentence identifier
- `original_sentence` - The original text from the transcript
- `cleaned_sentence` - The processed atomic statement
- `tokens` - SpaCy tokenization
- `lemmas` - Lemmatized forms
- `speaker` - Speaker identifier
- `negation` - Boolean flag for negation presence
- `negation_token` - The negation word if present
- `coref_resolved` - Coreference resolution status

## Rule Based Extraction Pipeline

The rule extraction pipeline processes the output from the preprocessing pipeline and applies a set of heuristic rules to identify and extract functional and non-functional requirements.

### Steps

1. **Modal Contribution Detection** - Identify modal verbs (must, should) and their scope.
2. **Functional Verbs Scoring** - Score verbs based on their functional relevance.
3. **NFR Keywords Scoring** - Score keywords related to non-functional requirements.
4. **Time Pattern Detection** - Identify and boost time-related patterns.
5. **Score Normalization** - Normalize scores for functional and non-functional requirements.
6. **NFR Category Determination** - Assign NFR categories based on scores.

### Output Format
Each extracted requirement is returned as a structured object containing:
- `sentence_id` - Unique sentence identifier
- `speaker` - Speaker identifier
- `cleaned_sentence` - The processed atomic statement
- `req_confidence` - Model confidence score for whether the sentence is a requirement.
- `req_type_confidence` - Confidence score for the predicted requirement type.

- `req_type` - Predicted requirement type (e.g., Functional, Non-Functional).

- `quality_category` - Non-functional or quality-related category (e.g., Security, Performance).

- `actor` - The entity performing the action in the sentence.

- `action` - The verb or action described in the sentence.

- `direct_object` - The direct object associated with the action, if any.

- `prepositional_objects` - List of objects connected via prepositions, if any.

- `is_negative` - Boolean flag indicating whether the sentence expresses negation.

## Installation

### Prerequisites
- Python 3.8+
- Virtual environment (recommended)

### Setup

1. **Navigate to the project directory:**
   ```powershell
   cd d:\GP\Talk2System-GP\talk2system-backend
   ```

2. **Create and activate a virtual environment:**
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. **Install dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

4. **Download required spaCy model:**
   ```powershell
   python -m spacy download en_core_web_trf
   ```

## Running the Preprocessing Test

### Execute the test script:

```powershell
python tests/test_preprocessing.py
```

### What it does:
- Reads the sample transcript from `data/sample_transcript.txt`
- Processes it through the complete preprocessing pipeline
- Saves the final structured output to `data/preprocessing_output.json`

### Expected Output:
The script will save a JSON file containing the processed sentence objects.

## Running the Rule Engine Test

### Execute the test script:
#### note: ensure you have run the python tests/test_preprocessing.py first to generate the required input for the rule engine test.

```powershell
python tests/test_rule_engine.py
```

### What it does:
- Reads the preprocessed output from `data/preprocessing_output.json`
- Applies the rule-based extraction logic
- Saves the final structured output to `data/rule_engine_output.json`

### Expected Output:
The script will save a JSON file containing the extracted requirements.

## Dependencies

Key libraries used:
- **spaCy** - Advanced NLP processing
- **fastcoref** - Neural coreference resolution
- **sentence-transformers** - Semantic similarity and deduplication
- **transformers** - HuggingFace tokenizers
- **scikit-learn** - Cosine similarity computation

See `requirements.txt` for complete dependency list.

## Notes

- The pipeline is optimized for requirement extraction from conversational speech
- Processing time depends on transcript length and model complexity
- First run may take longer due to model loading
