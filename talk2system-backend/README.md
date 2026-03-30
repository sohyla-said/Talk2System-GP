# Talk2System Backend - Intelligent Requirements Extraction System

## Overview

This project implements a comprehensive NLP-based requirements extraction system that processes conversational transcripts and identifies functional and non-functional requirements. The system combines three powerful approaches:

1. **Advanced Preprocessing Pipeline** - Transforms raw meeting transcripts into clean, atomic sentence objects
2. **Rule-Based Extraction** - Deterministic pattern matching using linguistic features and domain knowledge
3. **Machine Learning Models** - SVM-based classifiers trained on labeled requirement datasets
4. **Hybrid Engine** - Confidence-based ensemble combining rule-based and ML predictions

The system can classify requirements as Functional (FR) or Non-Functional (NFR) and further categorize NFRs into specific quality attributes (Security, Performance, Usability, etc.).

## Project Structure

```
talk2system-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                       # FastAPI app entry point
│   ├── .env                          # configuration file for environment variables and keys
│   ├── api/
│   │   ├── requirements.py           # API endpoints for requirement extraction
│   │   ├── document.py               # API endpoints for uml diagrams and documentation generation
│   ├── db/
│   │   ├── base.py                   # Database base model
│   │   ├── session.py                # Database session management
│   ├── models/                       # Database models
│   │   ├── requirement.py            # Requirement model
│   │   ├── project.py                # Project model
│   │   ├── artifact_type.py          # artifact type model
│   │   ├── artifact.py               # artifact model
│   ├── services/
│   │   ├── requirement_service.py      # Business logic for requirements
│   │   ├── project_service.py          # Business logic for projects
│   │   ├── artifact_service.py         # Business logic for artifacts
│   │   ├── uml_service.py              # Business logic for uml diagram generation
│   └── nlp/
│       ├── preprocessing.py          # Core preprocessing pipeline
│       ├── rule_engine.py            # Rule-based requirement extraction
│       ├── inference.py              # ML-based inference pipeline
│       ├── hybrid_engine.py          # Hybrid ML + Rule-based engine
├── ML/
│   ├── dataset/
│   │   ├── binary_classifier_dataset.csv        # FR/NFR binary classification dataset
│   │   ├── NFR_categories_dataset.csv          # NFR category classification dataset
│   │   ├── NFR_categories_dataset_balanced.xlsx # Balanced NFR dataset
│   │   ├── PROMISE.csv                         # PROMISE requirements dataset
│   │   ├── testData.csv                        # Test data for FR/NFR classifier 
│   │   └── testData_nfr.csv                    # Test data for NFR category classifier
│   ├── training/
│   │   ├── train_fr_nfr_svm.py      # Train FR/NFR binary classifier
│   │   └── train_nfr_svm.py          # Train NFR category classifier
│   ├── evaluation/
│   │   ├── evaluate_fr_nfr.py        # Evaluate FR/NFR classifier
│   │   ├── evaluate_nfr.py           # Evaluate NFR category classifier
│   ├── models/
│   │   ├── fr_nfr_classifier.pkl              # Trained FR/NFR SVM classifier
│   │   ├── fr_nfr_selector.pkl                # Feature selector for FR/NFR
│   │   ├── fr_nfr_tfidf_vectorizer.pkl        # TF-IDF vectorizer for FR/NFR
│   │   ├── nfr_category_classifier.pkl        # Trained NFR category SVM classifier
│   │   ├── nfr_selector.pkl                   # Feature selector for NFR categories
│   │   └── nfr_vectorizer.pkl                 # TF-IDF vectorizer for NFR categories
│   └── analysis/
│       └── datasets_EDA.ipynb        # Exploratory data analysis notebook
├── data/
│   ├── sample_transcript.txt                # Sample input transcript
│   ├── preprocessing_output.json            # Output from preprocessing pipeline (ignored)
│   ├── rule_engine_output.json              # Output from rule-based engine (ignored)
│   ├── test_transcript_ml_inference.csv     # ML inference results (ignored)
│   └── hybrid_inference_results.csv         # Hybrid inference results (ignored)
├── tests/
│   ├── test_preprocessing.py         # Tests for preprocessing pipeline
│   └── test_rule_engine.py           # Tests for rule-based engine
├── venv/                             # Virtual environment (ignored)
├── .gitignore                        # Git ignore rules
├── requirements.txt                  # Python dependencies
└── README.md                         # Project documentation
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

- `quality_category_confidence` - Confidence score for the predicted NFR category.

- `actor` - The entity performing the action in the sentence.

- `action` - The verb or action described in the sentence.

- `direct_object` - The direct object associated with the action, if any.

- `prepositional_objects` - List of objects connected via prepositions, if any.

- `is_negative` - Boolean flag indicating whether the sentence expresses negation.

## Machine Learning Models

The project includes two trained Support Vector Machine (SVM) models for automated requirement classification:

### 1. FR/NFR Binary Classifier

**Purpose**: Classifies requirements as either Functional Requirements (FR) or Non-Functional Requirements (NFR).

**Architecture**:
- **Train/Test Split**: split data into 80% training and 20% testing
- **Preprocess text**: Lowercase, remove punctuation, lemmatize
- **Feature Extraction**: TF-IDF Vectorization with unigrams, bigrams and trigrams (max 15,000 features)
- **Feature Selection**: Chi-Square feature selection (top 8,000 features)
- **Classifier**: Linear SVM (with C tuned using GridSerach with StratifiedKFold(5)) with balanced class weights
- **Evaluation**: classification report + confusion matrix + CV stability check
- **Training Dataset**: `binary_classifier_dataset.csv`

**Training Process**:
- 80/20 train-test split with stratified sampling
- 5-fold cross-validation for robust evaluation
- F1-macro scoring for balanced performance assessment

**Model Files**:
- `fr_nfr_tfidf_vectorizer.pkl` - TF-IDF feature extractor
- `fr_nfr_selector.pkl` - Chi-square feature selector
- `fr_nfr_classifier.pkl` - Trained SVM classifier

**Performance**: Evaluated using classification report and confusion matrix on held-out test set. Cross-validation F1-macro score provides reliable performance estimate across different data splits. Achieved 90% accuracy and F1-score on the test split. Achieveing 96% accuracy and f1-score on new unseen test dataset.

### 2. NFR Category Classifier

**Purpose**: Classifies Non-Functional Requirements into specific quality categories (e.g., Security, Performance, Usability,...).

**Architecture**:
- **Preprocess text**: Lowercase, remove punctuation, lemmatize
- **Feature Extraction**: TF-IDF Vectorization with unigrams, bigrams, and trigrams (max 15,000 features)
- **Feature Selection**: Chi-Square feature selection (top 2,000 features)
- **Classifier**: Linear SVM (with C tuned using GridSerach with StratifiedKFold(10) ) with balanced class weights
- **Cross-val predictions**: simulates a train/test split — 10 times. -> there is no need and it's better than making 1 train/test split
- **Evaluation**: classification report + confusion matrix + CV stability check
- **Training Dataset**: `NFR_categories_dataset.csv`

**Training Process**:
- 10-fold stratified cross-validation on full dataset
- Cross-validation predictions for comprehensive evaluation
- Final model trained on entire dataset for production use

**Model Files**:
- `nfr_vectorizer.pkl` - TF-IDF feature extractor
- `nfr_selector.pkl` - Chi-square feature selector
- `nfr_category_classifier.pkl` - Trained SVM classifier

**Performance**: Evaluated using 10-fold cross-validation with classification report showing per-class precision, recall, and F1-scores. Confusion matrix reveals model performance across all NFR categories.

### Model Evaluation

Both models can be evaluated on test datasets:
- **FR/NFR Classifier**: Run `ML/evaluation/evaluate_fr_nfr.py` with test data
- **NFR Classifier**: Run `ML/evaluation/evaluate_nfr.py` with test data

Evaluation outputs include:
- Classification report (precision, recall, F1-score per class)
- Confusion matrix (prediction vs. actual labels)
- Predictions with confidence scores saved to CSV

## ML Inference Pipeline

The `inference.py` module provides a pure machine learning approach to requirement extraction from conversational transcripts.

### Pipeline Steps

1. **Preprocessing**: Transcript is processed through the `RequirementPreprocessingPipeline` to generate clean, atomic sentence objects
2. **FR/NFR Classification**: Each sentence is classified as Functional or Non-Functional with a confidence score
3. **NFR Category Prediction**: If classified as NFR, the sentence is further categorized into specific quality attributes
4. **Confidence Scoring**: 
   - FR/NFR confidence uses sigmoid transformation of SVM decision scores
   - NFR category confidence uses softmax over multiclass decision scores

### Usage

```python
from app.nlp.inference import infer_transcript_nfr_pipeline

transcript = "User should be able to login securely. The system must respond within 2 seconds."
results = infer_transcript_nfr_pipeline(transcript)
```

### Output Format

Each result contains:
- `sentence_id` - Unique identifier
- `speaker` - Speaker name from transcript
- `cleaned_sentence` - Preprocessed sentence text
- `requirement_type` - FR or NFR
- `requirement_confidence` - Confidence score (0-1)
- `nfr_category` - Specific category if NFR (e.g., "Security", "Performance")
- `nfr_category_confidence` - Category prediction confidence

## Hybrid Inference Engine

The `hybrid_engine.py` combines the strengths of both rule-based and machine learning approaches to achieve more robust requirement extraction.

### Hybrid Strategy

**Confidence-Based Selection**: For each sentence, both the rule-based engine and ML models make predictions. The final prediction is selected based on which approach has higher confidence.

**Process Flow**:

1. **Preprocessing**: Transcript passes through the `RequirementPreprocessingPipeline`
2. **Parallel Prediction**:
   - **ML Path**: FR/NFR classification → NFR category prediction (if applicable)
   - **Rule Path**: Rule-based scoring → Type determination → NFR category extraction
3. **Confidence Comparison**: Compare ML confidence vs. rule engine confidence
4. **Selection**: Choose the prediction with higher confidence as the final result
5. **Comprehensive Output**: Return both predictions for transparency and analysis

### Why Hybrid?

- **ML Strengths**: Generalizes well to unseen patterns, learns from labeled data
- **Rule Strengths**: Highly precise on explicit patterns (modals, keywords, domain terms)
- **Combined Power**: Achieves better coverage and accuracy by leveraging both approaches

### Usage

```python
from app.nlp.hybrid_engine import hybrid_inference

transcript = "The application must encrypt all user data. Users want a simple interface."
results = hybrid_inference(transcript)
```

### Output Format

Each result includes:
- Standard fields: `sentence_id`, `speaker`, `cleaned_sentence`
- **Final prediction**: `requirement_type`, `requirement_confidence`, `nfr_category`
- **ML prediction**: `ml_prediction_type`, `ml_confidence`
- **Rule prediction**: `rule_prediction_type`, `rule_confidence`

This transparency allows analysis of when each approach performs better and facilitates continuous improvement.

## Database Storage

The system uses **PostgreSQL** as its primary database to persist extracted requirements and project metadata.

### Prerequisites

- **PostgreSQL** must be installed on your machine.
  Download the installer here: [https://www.postgresql.org/download/](https://www.postgresql.org/download/)
- During installation, set the following credentials:
  - **Username**: `postgres` by default
  - **Password**: `0000`
  - **Port**: `5432`

### Database Setup

1. **After installing PostgreSQL, create the database:**

   Right-click on the `Databases` section in pgAdmin and select `Create > Database...`. Name the database `talk2system` and save.

Enter password `0000` when prompted.


2. **The connection URL used by the app is:**
```
   postgresql://postgres:0000@localhost:5432/talk2system
```
   This is configured in `app/db/session.py`.

3. **Tables are created automatically** when the FastAPI app starts — no manual migration needed. The app calls:
```python
   Base.metadata.create_all(bind=engine)
```


### Database Schema

The system uses two tables:

**`projects`** — Stores project metadata:
| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Auto-incremented project ID |
| `name` | String | Project name |

**`requirements`** — Stores extracted requirements per project:
| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Auto-incremented requirement ID |
| `project_id` | Integer (FK) | References `projects.id` |
| `requirements_json` | JSON | Full structured extraction output |
| `created_at` | DateTime | Timestamp of extraction |
| `approval_status` | String | Approval status (pending, approved, rejected) |
| `version` | String | Requirement version |



### Stored JSON Structure

Each row in the `requirements` table stores a `requirements_json` field with the following structure:
```json
{
  "total_requirements": 2,
  "raw_requirements": [
    {
      "sentence_id": "sent_a1b2c3",
      "speaker": "Speaker1",
      "cleaned_sentence": "The system must encrypt all user data.",
      "requirement_type": "NFR",
      "nfr_category": "security",
      "structure":{
                "actor": "system",
                "action": "encrypt",
                "object": "user data",
                "is_negative": false
               },
      "confidence":{
         "final": 0.45, 
         "ml_prediction_type": "NFR", 
         "ml_confidence": 0.637, 
         "ml_nfr_predidction": "US", 
         "ml_nfr_confidence": 0.45, 
         "rule_prediction_type": "NFR", 
         "rule_confidence": 0.75, 
         "rule_nfr_prediction": "security", 
         "rule_nfr_confidence": 0.45}
    }
  ],
  "grouped_requirements": {
      "actors": ["system"], 
      "functional_requirements": [
         {"text": "the system shall allow users to login projects .", "actor": "system"}, 
         {"text": "the system shall allow users to manage projects .", "actor": "system"}], 
      "nonfunctional_requirements": []
   }
}

```

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

## Running the ML Inference Test

### Execute the inference script:

```powershell
python app/nlp/inference.py
```

### What it does:
- Reads the sample transcript from `data/sample_transcript.txt`
- Processes it through the preprocessing pipeline
- Applies ML models to classify each sentence as FR or NFR
- Predicts NFR categories for non-functional requirements
- Saves results to `data/test_transcript_ml_inference.csv`

### Expected Output:
A CSV file with columns: `sentence_id`, `speaker`, `cleaned_sentence`, `requirement_type`, `requirement_confidence`, `nfr_category`, `nfr_category_confidence`

## Running the Hybrid Inference Test

### Execute the hybrid engine script:

```powershell
python app/nlp/hybrid_engine.py
```

### What it does:
- Reads the sample transcript from `data/sample_transcript.txt`
- Processes it through the preprocessing pipeline
- Runs both ML models and rule-based engine in parallel
- Compares confidence scores and selects the best prediction
- Saves comprehensive results to `data/hybrid_inference_results.csv`

### Expected Output:
A CSV file containing both the final predictions and individual ML/rule-based predictions for comparison and analysis.

## Running the API
1. **Start the FastAPI server:**
```powershell
   uvicorn app.main:app --reload
```

2. **The server will be available at:**
```
   http://127.0.0.1:8000
```

3. **Access the interactive Swagger UI to test all endpoints in the browser:**
```
   http://127.0.0.1:8000/docs
```


### Expected Output:
You can test the API endpoints for project creation and requirement extraction using the Swagger UI. The responses will include structured JSON outputs with extracted requirements.


## Training the ML Models

### Train the FR/NFR Binary Classifier:

```powershell
python ML/training/train_fr_nfr_svm.py
```

**Outputs**:
- Classification report on test set
- Confusion matrix
- 5-fold cross-validation F1-macro score
- Trained models saved to `ML/models/`

### Train the NFR Category Classifier:

```powershell
python ML/training/train_nfr_svm.py
```

**Outputs**:
- Classification report from 10-fold cross-validation
- Confusion matrix
- Trained models saved to `ML/models/`

## Evaluating the ML Models

### Evaluate FR/NFR Classifier on Test Data:

```powershell
python ML/evaluation/evaluate_fr_nfr.py
```

**Outputs**:
- Classification report
- Confusion matrix
- Predictions with confidence scores saved to `ML/evaluation/test_predictions.csv`

### Evaluate NFR Category Classifier on Test Data:

```powershell
python ML/evaluation/evaluate_nfr.py
```

**Outputs**:
- Classification report
- Confusion matrix  
- Predictions with confidence scores saved to `ML/evaluation/test_predictions_nfr.csv`

## Dependencies

Key libraries used:

**NLP & Language Processing**:
- **spaCy** - Advanced NLP processing and linguistic analysis
- **fastcoref** - Neural coreference resolution
- **sentence-transformers** - Semantic similarity and deduplication
- **transformers** - HuggingFace tokenizers
- **nltk** - Natural language toolkit for tokenization and lemmatization

**Machine Learning**:
- **scikit-learn** - SVM classifiers, TF-IDF vectorization, feature selection, evaluation metrics
- **torch** - PyTorch deep learning framework (used by transformer models)
- **joblib** - Model serialization and persistence

**Data Processing**:
- **pandas** - Data manipulation and CSV handling
- **numpy** - Numerical computing
- **scipy** - Scientific computing (softmax for confidence scores)

**Utilities**:
- **matplotlib & seaborn** - Data visualization
- **datasets** - HuggingFace datasets library

See `requirements.txt` for complete dependency list.

## Notes

- The pipeline is optimized for requirement extraction from conversational speech
- Processing time depends on transcript length and model complexity
- First run may take longer due to model loading and downloading spaCy models
- **Three extraction approaches available**:
  - **Rule-based** (`rule_engine.py`): Fast, deterministic, pattern-based extraction
  - **ML-based** (`inference.py`): Learned patterns from labeled data, better generalization
  - **Hybrid** (`hybrid_engine.py`): Best of both worlds, confidence-based selection
- ML models are pre-trained and stored in `ML/models/` directory
- Model retraining can be done using scripts in `ML/training/`
- All evaluation metrics and predictions are saved for analysis and improvement
- The hybrid approach provides transparency by showing both ML and rule-based predictions
