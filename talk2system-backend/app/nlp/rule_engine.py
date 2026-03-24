from typing import List, Dict, Optional
import spacy
import re
nlp = spacy.load("en_core_web_trf")

class RuleBasedRequirementEngine:
    
    time_pattern = r"\b\d+\s*(second|seconds|minute|minutes|ms)\b"

    def __init__(self):
        
        self.weights = {
            "strong_modal": 0.3,
            "medium_modal": 0.2,
            "functional_verb": 0.4,
            "nfr_keyword": 0.6,
            "time_expression": 0.5
        }

        # Strong requirement triggers
        self.strong_modals = {
            "must", "should", "required", "need", "has", "have"
        }

        # Medium triggers
        self.medium_modals = {
            "shall", "can", "could", "may", "might", "will"
        }

        # functional verbs for FR classification
        self.functional_verbs = {
            "create", "generate", "delete", "update",
            "store", "display", "allow", "login",
            "reset", "register", "save",
            "approve", "submit"
        }

        # NFR keywords dictionary
        self.nfr_keywords = {
            "performance": {"fast", "slow", "latency", "response", "within", "seconds", "time", "efficient", "optimize", self.time_pattern, "performance"},
            "security": {"secure", "encrypt", "authentication", "authorization", "vulnerability", "attack", "breach","unauthorized", "unauthenticated", "unsecure", "access", "security","credentials","malicious", "data protection", "privacy"},
            "usability": {"easy", "user-friendly", "intuitive", "simple", "clear", "accessible", "responsive", "usability"},
            "availability": {"available", "uptime", "recover", "fail", "reliable", "robust", "resilient", "reliability"},
            "scalability": {"scalable", "load", "concurrent", "scale", "scaling", "scalability"},
            "fault_tolerance": {"fault-tolerant", "redundant", "backup", "failover", "fault tolerance","crash" },
            "legality": {"compliant", "regulation", "law", "legal", "compliance", "gdpr", "hipaa", "pci" ,"standards", "audit", "legal requirements","guidelines"},
            "look_and_feel": {"modern", "professional", "consistent", "aesthetic", "look and feel", "design", "appearance", "ui", "user interface","color", "layout", "theme","visual"},
            "maintainability": {"maintainable", "modular", "well-documented", "clean code", "refactor", "code quality", "maintainability"},
            "operability": {"monitor", "logging", "alert", "diagnose", "operability","operate"},
            "portability": {"portable", "platform-independent", "cross-platform", "portability", "environment","support", "compatible"}
        }

        # Known system actors
        self.known_actors = {"user", "admin", "system", "customer", "manager", "employee", "client", "user interface"}

    # ===============================
    # Step 1: Requirement Trigger Detection
    # ===============================
    def detect_requirement_trigger(self, lemmas: List[str]) -> (bool, str, float):

        lemma_set = set(lemmas)

        # Strong modal detection
        if lemma_set.intersection(self.strong_modals):
            return True, "strong_modal", 0.9

        # Medium modal detection
        if lemma_set.intersection(self.medium_modals):
            return True, "medium_modal", 0.7

        # Implicit verb-based detection (fallback)
        for lemma in lemmas:
            if lemma in {"create", "generate", "delete", "update", "store", "display", "allow"}:
                return True, "implicit_action", 0.6

        return False, "no_trigger", 0.0
    
    # ===============================
    # Step 2: Score-Based FR/NFR Classification
    # ===============================
    def score_requirement_type(self, lemmas: List[str], doc, sentence: str):
        fr_score = 0.0
        nfr_score = 0.0
        lemma_set = set(lemmas)

        # 1️- Modal contribution
        if lemma_set.intersection(self.strong_modals):
            fr_score += self.weights["strong_modal"]
            nfr_score += self.weights["strong_modal"]

        if lemma_set.intersection(self.medium_modals):
            fr_score += self.weights["medium_modal"]
            nfr_score += self.weights["medium_modal"]

        # 2️- Functional verbs scoring
        for lemma in lemma_set:
            if lemma in self.functional_verbs:
                fr_score += self.weights["functional_verb"]

        # 3️- NFR keywords scoring (with per-category scores)
        category_hits = {cat: 0 for cat in self.nfr_keywords}
        for category, keywords in self.nfr_keywords.items():
            for lemma in lemma_set:
                if lemma in keywords:
                    nfr_score += self.weights["nfr_keyword"]
                    category_hits[category] += self.weights["nfr_keyword"]

        # 4️- Time pattern detection (boost performance)
        if re.search(self.time_pattern, sentence.lower()):
            nfr_score += self.weights["time_expression"]
            category_hits["performance"] += self.weights["time_expression"]

        # 5️- Normalize scores for FR/NFR
        total_score = fr_score + nfr_score
        if total_score == 0:
            return "FR", None, 0.5, None
        fr_confidence = fr_score / total_score
        nfr_confidence = nfr_score / total_score


        # Determine NFR category
        if nfr_confidence > fr_confidence:
            best_category = max(category_hits, key=lambda k: category_hits[k])
            # Count all NFR-related words in sentence
            total_nfr_words = sum(
                1 for lemma in lemma_set if any(lemma in keywords for keywords in self.nfr_keywords.values())
            )
            category_confidence = 0.0
            if total_nfr_words > 0:
                category_confidence = round((category_hits[best_category] / total_nfr_words) * nfr_confidence, 3)
            return "NFR", best_category, round(nfr_confidence,3), category_confidence
        else:
            return "FR", None, round(fr_confidence,3), None


    # ===============================
    # Step 3: Actor Extraction
    # ===============================
    def extract_actor(self, doc) -> Optional[str]:

        for token in doc:
            if token.dep_ in {"nsubj", "nsubjpass"}:
                actor = token.text.lower()
                if actor in self.known_actors:
                    return actor
                return actor

        return None

    # ===============================
    # Step 4: Action Extraction
    # ===============================
    def extract_action(self, doc) -> Optional[str]:

        # 1️- First: look for main lexical ROOT verb
        for token in doc:
            if token.dep_ == "ROOT" and token.pos_ == "VERB":
                return token.lemma_

        # 2️- If ROOT is AUX (modal like must/should),
        # look for xcomp (real action)
        for token in doc:
            if token.dep_ == "xcomp" and token.pos_ == "VERB":
                return token.lemma_

        # 3️- Fallback: first non-auxiliary verb
        for token in doc:
            if token.pos_ == "VERB" and token.dep_ not in {"aux", "auxpass"}:
                return token.lemma_

        return None

    # ===============================
    # Step 5: Object Extraction (direct object, prepositional objects, subordinate clauses)
    # ===============================
    def extract_direct_object(self, doc) -> Optional[str]:

        for token in doc:
            # direct object of main verb
            if token.dep_ == "dobj":

                # If coordinated objects (email and password)
                if list(token.conjuncts):
                    objects = [token.text.lower()]
                    objects.extend([child.text.lower() for child in token.conjuncts])
                    return objects  # return list

                # Otherwise return full noun phrase
                span = doc[token.left_edge.i : token.right_edge.i + 1]
                return span.text.lower()

        return None
    
    def extract_prepositional_objects(self, doc) -> List[Dict]:

        prepositional_objects = []

        for token in doc:

            # Look for prepositions
            if token.dep_ == "prep":

                prep = token.text.lower()

                # Find object of this preposition
                for child in token.children:
                    if child.dep_ == "pobj":

                        # Handle coordination inside preposition
                        if list(child.conjuncts):
                            objects = [child.text.lower()]
                            objects.extend([c.text.lower() for c in child.conjuncts])

                            for obj in objects:
                                prepositional_objects.append({
                                    "preposition": prep,
                                    "object": obj
                                })

                        else:
                            span = doc[child.left_edge.i : child.right_edge.i + 1]

                            prepositional_objects.append({
                                "preposition": prep,
                                "object": span.text.lower()
                            })

        return prepositional_objects
    
    def extract_subordinate_clauses(self, doc) -> List[Dict]:

        clauses = []

        for token in doc:

            # Detect adverbial clause
            if token.dep_ == "advcl":

                marker = None

                # Find subordinating conjunction (before, after, if, when...)
                for child in token.children:
                    if child.dep_ == "mark":
                        marker = child.text.lower()
                        break

                if marker:
                    # Extract subtree of the advcl
                    span = doc[token.left_edge.i : token.right_edge.i + 1]

                    # Remove nested prepositional phrases from this span
                    filtered_tokens = []

                    for tok in span:
                        # Skip nested prepositional phrases (like "to the database")
                        if tok.dep_ == "prep":
                            continue
                        if tok.dep_ == "pobj":
                            continue
                        filtered_tokens.append(tok.text)

                    clause_text = " ".join(filtered_tokens).strip()

                    clauses.append({
                        "preposition": marker,
                        "object": clause_text
                    })

        return clauses

    # ===============================
    # Step 6: Process Single Sentence
    # ===============================
    def process_sentence(self, sentence_obj: Dict) -> Optional[Dict]:

        cleaned_sentence = sentence_obj["cleaned_sentence"]
        lemmas = sentence_obj["lemmas"]
        doc = nlp(cleaned_sentence)

        # 1. Detect trigger
        is_req, trigger_type, req_confidence = self.detect_requirement_trigger(lemmas)
        if not is_req:
            return None

        # 2. Classify type
        # req_type, quality_category = self.classify_requirement_type(lemmas, doc)
        req_type, quality_category, type_confidence ,category_confidence = self.score_requirement_type(
            lemmas, doc, cleaned_sentence
        )

        # 3. Extract components
        actor = self.extract_actor(doc)
        action = self.extract_action(doc)
        direct_object = self.extract_direct_object(doc)
        prepositional_objects = self.extract_prepositional_objects(doc)
        subordinate_clauses = self.extract_subordinate_clauses(doc)
        prepositional_objects.extend(subordinate_clauses)

        # 4. Build output
        return {
            "sentence_id": sentence_obj["id"],
            "speaker": sentence_obj["speaker"],
            "cleaned_sentence": sentence_obj["cleaned_sentence"],
            "req_confidence": req_confidence,
            "req_type_confidence": type_confidence,
            "req_type": req_type,
            "quality_category": quality_category,
            "quality_category_confidence": category_confidence,
            "actor": actor,
            "action": action,
            "direct_object": direct_object,
            "prepositional_objects": prepositional_objects,
            "is_negative": sentence_obj["negation"],
        }

    # ===============================
    # Step 7: Process Whole Transcript
    # ===============================
    def process_transcript(self, preprocessed_output: List[Dict]) -> List[Dict]:

        requirements = []

        for sentence_obj in preprocessed_output:
            result = self.process_sentence(sentence_obj)
            if result:
                requirements.append(result)

        return requirements