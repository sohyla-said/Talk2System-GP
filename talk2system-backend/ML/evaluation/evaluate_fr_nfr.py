import pandas as pd
import re
import joblib
import nltk
import numpy as np

from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

from sklearn.metrics import classification_report, confusion_matrix
from scipy.special import softmax

# download if not already installed
# nltk.download("punkt")
# nltk.download("stopwords")
# nltk.download("wordnet")


############################    Load Saved Models ############################
vectorizer = joblib.load("ML/models/fr_nfr_tfidf_vectorizer.pkl")
selector = joblib.load("ML/models/fr_nfr_selector.pkl")
classifier = joblib.load("ML/models/fr_nfr_classifier.pkl")


############################    Load Test Dataset  ############################
TEST_PATH = "ML/dataset/testData.csv"

df = pd.read_csv(TEST_PATH)

# if labels exist
df = df.rename(columns={
    "requirement_sentence": "text",
    "label": "label"
})


############################    Preprocessing  ############################
stop_words = set(stopwords.words("english"))
lemmatizer = WordNetLemmatizer()

def preprocess(text):
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)
    tokens = word_tokenize(text)
    tokens = [w for w in tokens if w not in stop_words]
    tokens = [lemmatizer.lemmatize(w) for w in tokens]
    return " ".join(tokens)


df["text"] = df["text"].apply(preprocess)


############################    Vectorize  ############################
X = vectorizer.transform(df["text"])


############################    Select Features  ############################
X = selector.transform(X)


############################    Predict  ############################
predictions = classifier.predict(X)

decision_scores = classifier.decision_function(X)
confidence_scores = 1 / (1 + np.exp(-np.abs(decision_scores)))


############################    Evaluate  ############################
if "label" in df.columns:
    y_true = df["label"]

    print("\nClassification Report\n")
    print(classification_report(y_true, predictions))

    print("\nConfusion Matrix\n")
    print(confusion_matrix(y_true, predictions))

else:

    print("\nPredictions:")
    print(predictions)


############################    Save Predictions  ############################
df["prediction"] = predictions
df["confidence"] = confidence_scores

df.to_csv("ML/evaluation/test_predictions.csv", index=False)

print("\nPredictions saved to ML/results/test_predictions.csv")