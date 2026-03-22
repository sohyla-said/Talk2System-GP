import pandas as pd
import re
import joblib
import nltk
import numpy as np
from scipy.special import softmax
from typing import List
import sys, os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from app.nlp.preprocessing import RequirementPreprocessingPipeline

# nltk.download("punkt")
# nltk.download("stopwords")
# nltk.download("wordnet")

from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize


############################    Load Models  ############################
# FR/NFR binary vectorizer, selector and classifier
fr_nfr_vectorizer = joblib.load("ML/models/fr_nfr_tfidf_vectorizer.pkl")
fr_nfr_selector = joblib.load("ML/models/fr_nfr_selector.pkl")
fr_nfr_classifier = joblib.load("ML/models/fr_nfr_classifier.pkl")

# NFR category vectorizer, selector and classifier
nfr_vectorizer = joblib.load("ML/models/nfr_vectorizer.pkl")
nfr_selector = joblib.load("ML/models/nfr_selector.pkl")
nfr_classifier = joblib.load("ML/models/nfr_category_classifier.pkl")

############################    Initialize Preprocessing  ############################
preprocessor = RequirementPreprocessingPipeline()

############################    ML helpers  ############################
stop_words = set(stopwords.words("english"))
lemmatizer = WordNetLemmatizer()

# tokenize text, remove stop words and lemmatize
def preprocess_for_ml(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)
    tokens = word_tokenize(text)
    tokens = [w for w in tokens if w not in stop_words]
    tokens = [lemmatizer.lemmatize(w) for w in tokens]
    return " ".join(tokens)

# predict sentence type FR/NFR
def predict_fr_nfr(sentence: str):
    # preprocess and convert into tf-idf vectors
    X_vec = fr_nfr_vectorizer.transform([preprocess_for_ml(sentence)])
    # select features
    X_sel = fr_nfr_selector.transform(X_vec)
    # predict type
    pred = fr_nfr_classifier.predict(X_sel)[0]
    # compute confidence score
    decision_scores = fr_nfr_classifier.decision_function(X_sel)
    # For binary classification, decision_function returns 1D array
    # Convert to probability-like confidence using sigmoid
    confidence = 1 / (1 + np.exp(-np.abs(decision_scores[0])))
    
    return pred, confidence

# predict nfr category 
def predict_nfr_category(sentence: str):
    # preprocess and convert into tf-idf vectors
    X_vec = nfr_vectorizer.transform([preprocess_for_ml(sentence)])
    # select features
    X_sel = nfr_selector.transform(X_vec)
    # predict type
    pred = nfr_classifier.predict(X_sel)[0]
    # compute confidence score
    decision_scores = nfr_classifier.decision_function(X_sel)
    # For multiclass, decision_function returns 2D array (n_samples, n_classes)
    if decision_scores.ndim == 1:
        # Edge case: if only one sample and reshaping needed
        decision_scores = decision_scores.reshape(1, -1)
    
    conf = softmax(decision_scores, axis=1)[0]
    max_conf = np.max(conf)

    return pred, max_conf

############################    Inference Function  ############################
def infer_transcript_nfr_pipeline(transcript: str) -> List[dict]:
    # Step 1: Preprocess transcript
    preprocessed_sentences = preprocessor.process(transcript)
    results = []
    # for each sentence, predict its type 
    for sentence_obj in preprocessed_sentences:
        cleaned_sentence = sentence_obj["cleaned_sentence"]

        # Step 2: FR/NFR Prediction
        req_type, req_conf = predict_fr_nfr(cleaned_sentence)
        nfr_category = None
        nfr_conf = None

        # Step 3: If NFR, predict category
        if req_type == "NFR":
            nfr_category, nfr_conf = predict_nfr_category(cleaned_sentence)

        # Build result object
        result = {
            "sentence_id": sentence_obj["id"],
            "speaker": sentence_obj["speaker"],
            "cleaned_sentence": cleaned_sentence,
            "requirement_type": req_type,
            "requirement_confidence": round(req_conf, 3),
            "nfr_category": nfr_category,
            "nfr_category_confidence": round(nfr_conf, 3) if nfr_conf else None
        }

        results.append(result)

    return results


if __name__ == "__main__":
    transcript_file = "data/sample_transcript.txt"
    output_csv = "data/test_transcript_ml_inference.csv"

    with open(transcript_file, "r", encoding="utf-8") as f:
        transcript = f.read()

    inference_results = infer_transcript_nfr_pipeline(transcript)

    df_results = pd.DataFrame(inference_results)
    df_results.to_csv(output_csv, index=False)

    print(f"Inference complete! Results saved to {output_csv}")