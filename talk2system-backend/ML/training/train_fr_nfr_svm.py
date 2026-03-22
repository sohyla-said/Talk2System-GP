import pandas as pd
import re
import joblib

# NLP preprocessing
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

# ML
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV, StratifiedKFold
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.feature_selection import SelectKBest, chi2
from sklearn.svm import LinearSVC
from sklearn.metrics import classification_report, confusion_matrix

# Download required nltk resources (run once)
# nltk.download('punkt')
# nltk.download('stopwords')
# nltk.download('wordnet')


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
    ngram_range=(1, 3),     # unigrams + bigrams + trigrams
    max_features=15000,
    min_df=1,                # keep rare but meaningful domain terms
    sublinear_tf=True        # log-scale TF to reduce dominance of frequent words
)

X_train = vectorizer.fit_transform(X_train_text)
X_test = vectorizer.transform(X_test_text)


############################    Chi-Square Feature Selection  ############################
selector = SelectKBest(
    score_func=chi2,
    k=8000
)

X_train = selector.fit_transform(X_train, y_train)
X_test = selector.transform(X_test)

############################    Grid Search - Tune C  ############################
param_grid = {"C": [0.01, 0.1, 0.5, 1.0, 5.0, 10.0]}

# Stratified ensures each fold has the same FR/NFR ratio as the full training set.
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

grid_search = GridSearchCV(
    LinearSVC(class_weight="balanced"),
    param_grid, 
    cv=skf,
    scoring='f1_macro',
    n_jobs=-1
)

grid_search.fit(X_train, y_train)

print("\nBest C:", grid_search.best_params_["C"])
print("Best CV F1 (macro):", round(grid_search.best_score_, 4))


############################    Predict  ############################
classifier = grid_search.best_estimator_

y_pred = classifier.predict(X_test)


############################    Evaluate  ############################
print("\nClassification Report\n")
print(classification_report(y_test, y_pred))

print("\nConfusion Matrix\n")
print(confusion_matrix(y_test, y_pred))


############################    Cross Validation - Stability Check   ############################

scores = cross_val_score(
    classifier,
    X_train,
    y_train,
    cv=skf,
    scoring="f1_macro"
)

print("\nCross Validation Macro F1:", scores.mean())

if scores.std() > 0.05:
    print("⚠️  High variance detected — consider collecting more balanced data.")
else:
    print("✅  Model is stable across folds.")


############################    Save Models  ############################
joblib.dump(vectorizer, "ML/models/fr_nfr_tfidf_vectorizer.pkl")
joblib.dump(selector, "ML/models/fr_nfr_selector.pkl")
joblib.dump(classifier, "ML/models/fr_nfr_classifier.pkl")

print("\nModel saved successfully.")