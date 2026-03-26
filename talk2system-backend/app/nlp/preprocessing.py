import re   #regular expression
import uuid #generates unique IDs.
import json     
from typing import List     #type hints for cleaner, safer code.

import spacy    #nlp framework
from fastcoref import FCoref    #Fast neural Coreference Resolution system.
from sentence_transformers import SentenceTransformer   #Library to generate sentence embeddings.
from sklearn.metrics.pairwise import cosine_similarity

# Load spaCy transformer model
nlp = spacy.load("en_core_web_trf")

# Coreference model
coref_model = FCoref(device="cpu")

# Sentence embedding model for deduplication
# Embedding → vector representation → cosine similarity detects duplicates.
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")



############################    Step 1  ############################
# Remove extra spaces, normalize unicode, standardize
# quotes, fix broken punctuation. Remove duplicate punctuation.
def normalize_text(text: str) -> str:
    text = text.strip()     # remove leading and trailing whitespace.
    # Keep line boundaries so segmentation can split transcript lines into separate sentences.
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r'[ \t\f\v]+', ' ', text)  # collapse horizontal whitespace only.
    text = re.sub(r'\n{2,}', '\n', text)      # collapse multiple blank lines.
    text = re.sub(r'[“”]', '"', text)   # replace smart quotes with standard double quotes
    text = re.sub(r"[‘’]", "'", text)   # replace smart apostrophes to standard apostrophes.
    text = re.sub(r'\.\.+', '.', text)  # replace multiple dots (...) with a single dot.
    return text


############################    Step 2  ############################
# remove: [laughter], [noise], [00:02:14] timestamps
def remove_noise(text: str) -> str:
    text = re.sub(r'\[\d{2}:\d{2}:\d{2}\]', '', text)  # timestamps
    text = re.sub(r'\[.*?\]', '', text) 
    return text.strip()


# ############################    Step 3  ############################
FILLERS = {
    "um", "uh", "oh", "er", "ah","hmm", "uhh", "umm", "you know", "i mean", "you see",
    "like", "basically","kind of", "right", "so yeah", "very", "really", "highly",
    "just", "i guess", "i suppose", "totally", "literally", "seriously",
    "okay so", "alright", "well", "so", "yeah", "yeah so", "exactly", "yes", "let's start", "i think"
}

MODAL_GUARD = {
    "must", "shall", "should", "need to",
    "has to", "required to", "will", "can",
    "cannot", "must not", "not", "without", "within", "could", "may",
    "might", "would", "ought to"
}

REQUIREMENT_START_RE = re.compile(
    r"\b(?:the\s+system|system|it)\s+(?:must|shall|should|will|can|could|may|might|would|need\s+to|has\s+to|required\s+to|ought\s+to)\b",
    re.IGNORECASE,
)


def split_requirement_runs(line: str) -> List[str]:
    """Split back-to-back requirement clauses when punctuation is missing."""
    matches = list(REQUIREMENT_START_RE.finditer(line))
    if len(matches) <= 1:
        return [line]

    parts = []
    starts = [m.start() for m in matches]
    for i, start in enumerate(starts):
        end = starts[i + 1] if i + 1 < len(starts) else len(line)
        chunk = line[start:end].strip()
        if chunk:
            parts.append(chunk)

    return parts or [line]

def remove_fillers(text: str) -> str:
    # send the text to Spacy
    doc = nlp(text)
    # empty list to build a clean version of the sentence
    tokens = []
    skip_next = False

    for i, token in enumerate(doc):
        # Skip the token if it's part of a compound filler already handled
        if skip_next:
            skip_next = False
            continue

        # Check for compound fillers 
        if i < len(doc) - 1:
            bigram = f"{token.text.lower()} {doc[i + 1].text.lower()}"
            if bigram in FILLERS:
                skip_next = True
                continue

        # if the token is Modal verb keep it
        if token.text.lower() in MODAL_GUARD:
            tokens.append(token.text)
        # if the token is 'like', check its part of speech
        elif token.text.lower() == "like" and token.pos_ == "VERB":
            tokens.append(token.text)
        # if the token is a filler word remove it
        elif token.text.lower() in FILLERS:
            continue
        else:
            tokens.append(token.text)

    # rebuild the cleaned sentence
    return " ".join(tokens)


############################    Step 4  ############################
PRONOUN_GUARD = {
    "i", "we", "you",
    "me", "us",
    "my", "our", "your",
    "mine", "ours", "yours",
    "his", "her", "their", "its"
}
# replace pronouns with the actual entity they refer to.
def resolve_coreference(text: str) -> str:
    preds = coref_model.predict([text])
    result = preds[0]
    
    # Get coreference clusters — each cluster is a list of (start, end) char spans
    clusters = result.get_clusters(as_strings=False)
    
    # Build a mapping: for each mention, replace it with the first mention in its cluster
    resolved = list(text)
    replacements = []
    
    for cluster in clusters:
        # First mention in the cluster = the canonical entity
        first_start, first_end = cluster[0]
        canonical = text[first_start:first_end]
        canonical_lower = canonical.lower().strip()

        # Skip unsafe canonical forms
        if canonical_lower in PRONOUN_GUARD:
            continue
        
        # Replace all other mentions with the canonical one
        for start, end in cluster[1:]:
            mention = text[start:end]
            mention_lower = mention.lower().strip()

        # NEVER replace first/second person pronouns
            if mention_lower in PRONOUN_GUARD:
                continue
            replacements.append((start, end, canonical))
    
    # Apply replacements from end to start to preserve character indices
    replacements.sort(key=lambda x: x[0], reverse=True)
    for start, end, canonical in replacements:
        resolved[start:end] = list(canonical)
    
    return "".join(resolved)


############################    Step 5  ############################
# split the full transcript into individual sentences.
def segment_sentences(text: str) -> List[str]:
    
    # the reges matches positions where speaker label begins in the text.
    # the .split() uses this regex to split the text into blocks where each start with a speaker label
    # the ?= ensures that the speaker label itself is not removed during the split
    speaker_blocks = re.split(r'(?=\b[A-Za-z0-9_]+:)', text)

    sentences = []

    for block in speaker_blocks:
        block = block.strip()
        if not block:
            continue

        # # Extract speaker
        # match = re.match(r'^([A-Za-z0-9_]+:)\s*(.*)', block)
        # if not match:
        #     continue

        # speaker = match.group(1)
        # content = match.group(2)

        # if not content.strip():
        #     continue

        match = re.match(r'^([A-Za-z0-9_]+:)\s*(.*)', block, re.DOTALL)

        if match:
            # ✅ Has speaker label → original behavior
            speaker = match.group(1)
            content = match.group(2)
        else:
            # ✅ No speaker label → treat whole block as content
            speaker = "Unknown:"
            content = block

        if not content.strip():
            continue

        lines = re.split(r'[.!?\n]+', content)

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Split concatenated requirement clauses before spaCy sentence segmentation.
            requirement_chunks = split_requirement_runs(line)
            for chunk in requirement_chunks:
                doc = nlp(chunk)
                for sent in doc.sents:
                    clean_sent = sent.text.strip()
                    if clean_sent:
                        sentences.append(f"{speaker} {clean_sent}")

    return sentences


############################    Step 6  ############################
# Break compound sentences joined by conjunction into individual sentences
def split_conjunctions(sentence: str) -> List[str]:
    doc = nlp(sentence)
    splitted_sentences = []
    for token in doc:
        # if the token commes after a conjunction and its is verb
        if token.dep_ == "conj" and token.pos_ == "VERB":
            # get the word that is before the cc
            root = token.head
            cc_token = None
            # get the cc (ex. and)
            for child in root.children:
                if child.dep_ == "cc":
                    cc_token = child
                    break
            if not cc_token:
                continue

            # Check if first clause has subject
            first_has_subject = any(t.dep_ in ("nsubj", "nsubjpass") for t in root.lefts)

            # Check if first clause has object or complement
            first_has_object = any(t.dep_ in ("dobj", "attr", "acomp", "pobj") for t in root.rights)

            # Check if conjunct verb has NO subject
            conj_has_subject = any(t.dep_ in ("nsubj", "nsubjpass") for t in token.lefts)

            # if the first sentence is complete and the second doesn't have subject -> split at the cc 
            # and get the subject + aux of the first sentence and put it with the second sentence
            # ex: " It should handle errors gracefully and show a proper error message."
            if first_has_subject and first_has_object and not conj_has_subject:
                # Split at conjunction
                first_sentence = sentence[:cc_token.idx].strip()
                # Get subject + auxiliaries from first verb
                subject_tokens = [
                    t.text for t in root.lefts
                    if t.dep_ in ("nsubj", "nsubjpass")
                ]
                aux_tokens = [
                    t.text for t in root.lefts
                    if t.dep_ == "aux"
                ]

                subject_part = " ".join(subject_tokens)
                aux_part = " ".join(aux_tokens)

                # Get second verb phrase subtree
                second_span = doc[token.left_edge.i : token.right_edge.i + 1].text
                second_sentence = f"{subject_part} {aux_part} {second_span}".strip()


            # Check if the conjunction verb has its own subject before it -> just split at the cc
            # ex: "The system must be highly secure and it must not store passwords in plain text."
            elif conj_has_subject:
                first_sentence = sentence[:cc_token.idx].strip()
                second_sentence = sentence[cc_token.idx + len(cc_token.text):].strip()

            # ex: "The admin can create and delete users"
            else:
                # remove the cc and replace the first verb with the second one
                string_to_remove = f" {cc_token.text} {token.text}"
                first_sentence = sentence.replace(string_to_remove, "")
                second_sentence = first_sentence.replace(root.text, token.text)

            splitted_sentences.append(first_sentence)
            splitted_sentences.append(second_sentence)

    if not splitted_sentences:
        return [sentence]
    
    # remove dupliacte while preserving order of the sentences
    return list(dict.fromkeys([s.strip() for s in splitted_sentences]))


############################    Step 7  ############################
# tokenize the sentence using spaCy tokenization → linguistic tokens (words)
def tokenize_sentence(sentence: str):
    doc = nlp(sentence)
    # tokenize the sentence into readable words by words and punctuation
    spacy_tokens = [token.text for token in doc if not token.is_punct and not token.is_space]

    return spacy_tokens


############################    Step 8  ############################
# educe each token to its base/dictionary form.
def lemmatize_sentence(sentence: str) -> List[str]:
    doc = nlp(sentence)
    return [token.lemma_ for token in doc if not token.is_punct and not token.is_space]


############################    Step 9  ############################
# detects negation in a sentence.
# returns a tuple: (bool, str or None)
def detect_negation(sentence: str):
    doc = nlp(sentence)
    for token in doc:
        # if the token's dependency label is "neg" --> negation words
        if token.dep_ == "neg":
            # if negation is found return true and the negation word
            return True, token.text
    return False, None


############################    Step 10  ############################

CUSTOM_STOPWORDS = nlp.Defaults.stop_words - MODAL_GUARD
# remove common stop words but keep the modal verbs
def filter_stopwords_for_rules(sentence: str):
    doc = nlp(sentence)
    # keep only tokens that are not in the CUSTOM_STOPWORDS
    return [
        token.text for token in doc
        if token.text.lower() not in CUSTOM_STOPWORDS
    ]


############################    Step 11  ############################

GREETINGS = {"hi", "hello", "how are you", "good morning", "good afternoon", 
             "pleased to meet you", "how are you doing", "nice to see you",
             "i'm good", "thanks", "let 's start", "that 's everything"}

def is_irrelevant(sentence: str) -> bool:
    s = sentence.lower().strip()
    
    # Match whole phrase only, not substrings
    for g in GREETINGS:
        pattern = r'\b' + re.escape(g) + r'\b'
        if re.search(pattern, s):
            # Only flag if the sentence has NO modal verbs
            if any(modal in s.split() for modal in MODAL_GUARD):
                return False  # Has requirement signal → keep it
            return True
    
    return False


############################    Step 12  ############################
# remove repeated or semantically near-duplicate sentences, based on a threshold.
# outputs a list of sentences with duplicates remove
def deduplicate_sentences(sentences: List[str], threshold=0.92):
    # model to convert each sentence into a numeric vector
    # each vector represents the semantic meaning of the sentence
    embeddings = embedding_model.encode(sentences)
    keep = {}

    # loop over each sentence embedding
    for i, emb in enumerate(embeddings):
        duplicate = False
        # compare current sentence with all sentences we decided to keep
        for j, kept_emb in keep.items():
            # compute cosine similarity between 2 embeddings
            sim = cosine_similarity([emb], [kept_emb])[0][0]
            if sim > threshold:
                duplicate = True
                break
        # if sentence is not similar to any other sentence keep it
        if not duplicate:
            keep[i] = emb

    unique_sentences = []
    for key, value in keep.items():
        unique_sentences.append(sentences[key]) 

    return unique_sentences


############################    Step 13  ############################

DOMAIN_SYNONYMS = {
    "sign in": "login",
    "log in": "login",
    "client": "user",
    "customer": "user",
    "crash": "fail",
    "go down": "fail",
    "register": "signup",
    "sign up": "signup"
}
# map domain-specific synonyms to a common form so rule matching is consistent.
def normalize_domain_terms(sentence: str) -> str:
    s = sentence.lower()
    for key, value in DOMAIN_SYNONYMS.items():
        s = s.replace(key, value)
    return s


############################    Step 14  ############################
# extract the speaker label from the sentence
# def extract_speaker(sentence: str):
#     match = re.match(r'^\s*([A-Za-z0-9_]+)\s*:\s*(.*)', sentence)
#     if match:
#         speaker = match.group(1)
#         content = match.group(2)
#         return speaker, content
#     return None, sentence
def extract_speaker(sentence: str):
    match = re.match(r'^\s*([A-Za-z0-9_]+)\s*:\s*(.*)', sentence)
    if match:
        speaker = match.group(1)
        # Return None for unknown/unlabeled speakers
        speaker = None if speaker == "Unknown" else speaker
        content = match.group(2)
        return speaker, content
    return None, sentence


############################    Step 15  ############################
# function to build the final json object to be stored
def build_sentence_object(original_sentence: str, cleaned_sentence: str, speaker: str):
    spacy_tokens = tokenize_sentence(cleaned_sentence)
    lemmas = lemmatize_sentence(cleaned_sentence)
    neg_flag, neg_token = detect_negation(cleaned_sentence)

    return {
        "id": f"sent_{uuid.uuid4().hex[:6]}",
        "original_sentence": original_sentence,
        "cleaned_sentence": cleaned_sentence,
        "tokens": spacy_tokens,
        "lemmas": lemmas,
        "speaker": speaker,
        "negation": neg_flag,
        "negation_token": neg_token,
        "coref_resolved": True
    }

############################    The Pipeline  ############################
class RequirementPreprocessingPipeline:

    def process(self, transcript: str):

        original_text = transcript

        text = normalize_text(transcript)
        text = remove_noise(text)
        text = resolve_coreference(text)
        sentences = segment_sentences(text)

        atomic_objects = []
        i = 1
        for s in sentences:
            speaker, content = extract_speaker(s)
            original_sentence = content.strip()
            # Skip empty lines
            if not original_sentence:
                continue
            # if is_irrelevant(content):
            #         continue

            cleaned = remove_fillers(content)

            # [^\w\s]+: Matches one or more characters that are not word characters (\w) or whitespace (\s).
            #  This ensures only punctuation is matched.
            cleaned = re.sub(r"^[^\w\s]+", "", cleaned) 

            cleaned = normalize_domain_terms(cleaned)

            splits = split_conjunctions(cleaned)

            for split in splits:
                split = split.strip()
                if is_irrelevant(split):
                    continue
                atomic_objects.append(
                    build_sentence_object(
                        original_sentence=original_sentence,
                        cleaned_sentence=split,
                        speaker=speaker
                    )
                )
            
        cleaned_sentences = [
            obj["cleaned_sentence"] for obj in atomic_objects
        ]

        unique_cleaned = deduplicate_sentences(cleaned_sentences)

        final_output = [
            obj for obj in atomic_objects
            if obj["cleaned_sentence"] in unique_cleaned
        ]

        return final_output