# Talk2System Backend - NLP Preprocessing Pipeline

## Overview

This project implements a comprehensive NLP model designed to process conversational transcripts and extract clean, structured requirements.

## Project Structure

```
talk2system-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                       # FastAPI app entry point
│   └── nlp/
│       └── preprocessing.py          # Core preprocessing pipeline
├── data/
│   └── sample_transcript.txt         # Sample input transcript
│   └── preprocessing_output.json     # Output of the preprocessing, will be available when running the test_preprocessing.py
├── tests/
│   └── test_preprocessing.py         # Test script for the pipeline
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
