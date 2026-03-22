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
from app.nlp.rule_engine import RuleBasedRequirementEngine

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

############################    Initialize Preprocessing and Rule Engine  ############################
preprocessor = RequirementPreprocessingPipeline()
rule_engine = RuleBasedRequirementEngine()

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
    confidence = 1 / (1 + np.exp(-np.abs(decision_scores[0])))

    return pred, confidence

def predict_nfr_category(sentence: str):
    # preprocess and convert into tf-idf vectors
    X_vec = nfr_vectorizer.transform([preprocess_for_ml(sentence)])
    # select features
    X_sel = nfr_selector.transform(X_vec)
    # predict type
    pred = nfr_classifier.predict(X_sel)[0]
    # compute confidence score
    decision_scores = nfr_classifier.decision_function(X_sel)
    if decision_scores.ndim == 1:
        decision_scores = decision_scores.reshape(1, -1)
    conf = softmax(decision_scores, axis=1)[0]
    max_conf = np.max(conf)

    return pred, max_conf

############################    Hybrid Inference  ############################
def hybrid_inference(transcript: str) -> List[dict]:
    # Step 1: Preprocess transcript
    preprocessed_sentences = preprocessor.process(transcript)
    results = []
    # Step 2: for each sentence, predict its type using both ML models and Rule-based engine
    for sentence_obj in preprocessed_sentences:
        cleaned_sentence = sentence_obj["cleaned_sentence"]

        # 2A: ML Prediction
        ml_type, ml_conf = predict_fr_nfr(cleaned_sentence)
        ml_nfr_category = None
        ml_nfr_conf = None
        if ml_type == "NFR":
            ml_nfr_category, ml_nfr_conf = predict_nfr_category(cleaned_sentence)

        # 2B: Rule Engine Prediction
        rule_result = rule_engine.process_sentence(sentence_obj)
        if not rule_result:
            continue
        # Step 3: Compare confidences and select the higher one
        if rule_result and ml_conf < rule_result["req_confidence"]:
            # Use rule engine
            final_type = rule_result["req_type"]
            final_conf = rule_result["req_confidence"]
            final_nfr_cat = rule_result.get("quality_category")
        else:
            # Use ML
            final_type = ml_type
            final_conf = ml_conf
            final_nfr_cat = ml_nfr_category

        result = {
            "sentence_id": sentence_obj["id"],
            "speaker": sentence_obj["speaker"],
            "cleaned_sentence": cleaned_sentence,
            "requirement_type": final_type,
            "requirement_confidence": round(final_conf, 3),
            "nfr_category": final_nfr_cat,
            "ml_prediction_type": ml_type,
            "ml_confidence": round(ml_conf, 3),
            "rule_prediction_type": rule_result["req_type"] if rule_result else None,
            "rule_confidence": round(rule_result["req_confidence"], 3) if rule_result else None
        }

        results.append(result)

    return results


if __name__ == "__main__":
    transcript_file = "data/sample_transcript.txt"
    output_csv = "data/hybrid_inference_results.csv"

    with open(transcript_file, "r", encoding="utf-8") as f:
        transcript = f.read()

    inference_results = hybrid_inference(transcript)

    df_results = pd.DataFrame(inference_results)
    df_results.to_csv(output_csv, index=False)

    print(f"Hybrid inference complete! Results saved to {output_csv}")