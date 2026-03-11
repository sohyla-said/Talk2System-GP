import pandas as pd
import re
import joblib

# NLP preprocessing
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

# ML
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.feature_selection import SelectKBest, chi2
from sklearn.svm import LinearSVC
from sklearn.metrics import classification_report, confusion_matrix

# Download required nltk resources (run once)
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('wordnet')


############################    Load Dataset  ############################
DATASET_PATH = 'ML/dataset/binary_classifier_dataset.csv'
df = pd.read_csv(DATASET_PATH)


df = df.rename(columns={
    "Requirement": "text",
    "Type": "label"
})


############################    Normalize/ Preprocess text  ############################
stop_words = set(stopwords.words("english"))
lemmatizer = WordNetLemmatizer()

def preprocess(text):
    text = text.lower()
    # remove punctuation
    text = re.sub(r"[^\w\s]", "", text)
    tokens = word_tokenize(text)
    # remove stopwords
    tokens = [w for w in tokens if w not in stop_words]
    # lemmatization
    tokens = [lemmatizer.lemmatize(w) for w in tokens]

    return " ".join(tokens)



df["text"] = df["text"].apply(preprocess)


############################    Split Data (Train/Test)  ############################
train_df, test_df = train_test_split(
    df,
    test_size=0.2,
    stratify=df["label"],
    random_state=42
)

X_train_text = train_df["text"]
X_test_text = test_df["text"]

y_train = train_df["label"]
y_test = test_df["label"]


############################    TF_IDF Vectorization  ############################
vectorizer = TfidfVectorizer(
    ngram_range=(1,2),     # unigrams + bigrams
    max_features=10000,
    min_df=2
)

X_train = vectorizer.fit_transform(X_train_text)
X_test = vectorizer.transform(X_test_text)


############################    Chi-Square Feature Selection  ############################
selector = SelectKBest(
    score_func=chi2,
    k=5000
)

X_train = selector.fit_transform(X_train, y_train)
X_test = selector.transform(X_test)


############################    Train SVM Classifier  ############################
classifier = LinearSVC(class_weight="balanced")

classifier.fit(X_train, y_train)


############################    Predict  ############################
y_pred = classifier.predict(X_test)


############################    Evaluate  ############################
print("\nClassification Report\n")
print(classification_report(y_test, y_pred))

print("\nConfusion Matrix\n")
print(confusion_matrix(y_test, y_pred))


############################    Cross Validation   ############################

scores = cross_val_score(
    classifier,
    X_train,
    y_train,
    cv=5,
    scoring="f1_macro"
)

print("\nCross Validation Macro F1:", scores.mean())


############################    Save Models  ############################
joblib.dump(vectorizer, "ML/models/fr_nfr_tfidf_vectorizer.pkl")
joblib.dump(selector, "ML/models/fr_nfr_selector.pkl")
joblib.dump(classifier, "ML/models/fr_nfr_classifier.pkl")

print("\nModel saved successfully.")