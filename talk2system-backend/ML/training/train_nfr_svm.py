import pandas as pd
import re
import nltk
import joblib

# NLP preprocessing
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

# ML
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.feature_selection import SelectKBest, chi2
from sklearn.svm import LinearSVC
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.metrics import classification_report, confusion_matrix

# Download NLTK resources (first run only)
nltk.download("punkt")
nltk.download("stopwords")
nltk.download("wordnet")

############################    Load Dataset  ############################
DATASET_PATH = "ML/dataset/NFR_categories_dataset.csv"

df = pd.read_csv(DATASET_PATH)

df = df.rename(columns={
    "RequirementText": "text"
})


############################    Normalize/ Preprocess text  ############################
stop_words = set(stopwords.words("english"))
lemmatizer = WordNetLemmatizer()

def preprocess(text):
    text = str(text).lower()
    text = re.sub(r"[^\w\s]", "", text)  # remove punctuation
    tokens = word_tokenize(text)
    tokens = [lemmatizer.lemmatize(w) for w in tokens if w not in stop_words]
    return " ".join(tokens)

df["text"] = df["text"].apply(preprocess)


############################    TF_IDF Vectorization  ############################
vectorizer = TfidfVectorizer(
    ngram_range=(1,3),    # unigrams + bigrams + trigrams
    max_features=15000,
    min_df=2
)

X = vectorizer.fit_transform(df["text"])
y = df["label"]


############################    Chi-Square Feature Selection  ############################
selector = SelectKBest(chi2, k=2000)
X = selector.fit_transform(X, y)


############################    Train SVM Classifier  ############################
classifier = LinearSVC(
    C=1.5,
    class_weight="balanced"
)


############################    10-Fold Cross-Validation  ############################
skf = StratifiedKFold(n_splits=10, shuffle=True, random_state=42)

y_pred = cross_val_predict(classifier, X, y, cv=skf)


############################    Evaluate  ############################
print("\nClassification Report\n")
print(classification_report(y, y_pred))

print("\nConfusion Matrix\n")
print(confusion_matrix(y, y_pred))

########################################    Train Final Model on Full Dataset   ########################################

print("\nTraining final model on full dataset...")
classifier.fit(X, y)


############################    Save Models  ############################
joblib.dump(vectorizer, "ML/models/nfr_vectorizer.pkl")
joblib.dump(selector, "ML/models/nfr_selector.pkl")
joblib.dump(classifier, "ML/models/nfr_category_classifier.pkl")

print("\nNFR category classifier saved successfully.")