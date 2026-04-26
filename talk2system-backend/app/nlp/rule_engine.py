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
            "approve", "submit","send", "notify", "track", "manage", "process",
            "receive", "view", "access", "validate", "authenticate",
            "upload", "download", "export", "import", "search",
            "assign", "reject", "confirm", "schedule", "report", "archive", "restore", "configure", "customize", "integrate", "monitor", "analyze", "optimize", "backup", "recover", "audit", "enforce", "escalate", "suspend", "reactivate", "deactivate", "delete", "remove", "add", "edit", "modify", "approve"
        }

        # Autonomous system verbs — system acts on its own, no human initiates it
        self.autonomous_system_verbs = {
            "send", "notify", "generate", "calculate", "process", "compute",
            "schedule", "sync", "backup", "log", "monitor", "detect", "trigger",
            "execute", "run", "dispatch", "broadcast", "refresh",
            "archive", "encrypt", "index", "cache", "queue", "retry", "expire"
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

        self.verb_semantics = {
            "user_initiated": {
                "login","register","create","update","delete","submit",
                "request","view","access","manage"
            },
            "system_internal": {
                "store","validate","compute","encrypt","process","calculate","save"
            },
            "system_mediated": {
                "allow","enable","provide","support","track","notify",
                "log","display","send"
            }
        }
        self.actor_prepositions = {"for", "to", "by"}
        self.default_actor = "user"
    # ===============================
    # Step 1: Requirement Trigger Detection
    # ===============================
    def detect_requirement_trigger(self, lemmas: List[str]) -> tuple[bool, str, float]:

        lemma_set = set(lemmas)

        # Strong modal detection
        if lemma_set.intersection(self.strong_modals):
            return True, "strong_modal", 0.9

        # Medium modal detection
        if lemma_set.intersection(self.medium_modals):
            return True, "medium_modal", 0.7

        # Implicit verb-based detection (fallback)
        for lemma in lemmas:
            if lemma in self.functional_verbs:
                return True, "implicit_action", 0.6
            
        # any sentence with a known actor as subject + any action verb
        has_known_actor = any(lemma in self.known_actors for lemma in lemmas)
        has_any_verb = any(
            lemma not in self.strong_modals
            and lemma not in self.medium_modals
            and lemma not in {"be", "have", "do", "say", "go", "get"}  # skip generic verbs
            and len(lemma) > 3  # skip short noise words
            for lemma in lemmas
            if lemma.isalpha()
        )
        if has_known_actor and has_any_verb:
            return True, "implicit_action", 0.55

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

    # def extract_actor(self, doc) -> Optional[str]:

    #     subject = None
    #     human_actor_default = "user"
    #     found_actors = set()

    #     # 1️⃣ Extract grammatical subject
    #     for token in doc:
    #         if token.dep_ in {"nsubj", "nsubjpass"}:
    #             subject = token.text.lower()
    #             break

    #     # 2️⃣ Collect known actors in sentence
    #     for token in doc:
    #         if token.text.lower() in self.known_actors:
    #             found_actors.add(token.text.lower())

    #     # 3️⃣ Identify direct or prepositional objects
    #     beneficiaries = set()
    #     for token in doc:
    #         if token.dep_ in {"dobj", "pobj"}:
    #             # If the object is a known human actor → beneficiary
    #             if token.text.lower() in {"user", "customer", "client", "employee"}:
    #                 beneficiaries.add(token.text.lower())
    #             else:
    #                 # Also consider nouns that represent actions or entities benefiting humans
    #                 for child in token.children:
    #                     if child.text.lower() in {"user", "customer", "client", "employee"}:
    #                         beneficiaries.add(child.text.lower())

    #     # 4️⃣ Determine actor
    #     # Case A: subject is human → actor = subject
    #     human_subjects = {"user", "users","customer","customers" ,"client", "clients","managers" ,"manager", "admins", "admin", "employee", "employees"}
    #     if subject and subject in human_subjects:
    #         return subject

    #     # Case B: subject = system but action benefits humans
    #     if subject == "system" and beneficiaries:
    #         return beneficiaries.pop()  # usually user

    #     # Case C: subject = system, no explicit human beneficiary
    #     if subject == "system" and not beneficiaries:
    #         root_verb = None
    #         for token in doc:
    #             if token.dep_ == "ROOT" and token.pos_ == "VERB":
    #                 root_verb = token
    #                 break

    #         if root_verb:
    #             verb_lemma = root_verb.lemma_.lower()

    #             if verb_lemma in self.autonomous_system_verbs:
    #                 return "system" 
    #             else:
    #                 return human_actor_default  
    #         else:
    #             return "system"

    #     # Case D: fallback if subject is a human actor mentioned anywhere
    #     for actor in human_subjects:
    #         if actor in found_actors:
    #             return actor

    #     # Case E: fallback default
    #     return human_actor_default


    # ===============================
    # SMART ACTOR EXTRACTION
    # ===============================
    def extract_actor(self, doc) -> Optional[str]:

        scores = {}
        subject = None
        root_verb = None

        # initialize scores
        for actor in self.known_actors:
            scores[actor] = 0

        # -------------------------------
        # 1. SUBJECT + ROOT VERB
        # -------------------------------
        for token in doc:

            if token.dep_ in {"nsubj", "nsubjpass"}:
                subject = token.lemma_.lower()

                if subject.endswith("s"):
                    subject = subject[:-1]

                if subject in scores:
                    scores[subject] += 3

            if token.dep_ == "ROOT" and token.pos_ == "VERB":
                root_verb = token.lemma_.lower()

        # -------------------------------
        # 2. OBJECTS (beneficiaries)
        # -------------------------------
        for token in doc:
            if token.dep_ in {"dobj", "pobj"}:
                candidate = token.lemma_.lower()

                if candidate.endswith("s"):
                    candidate = candidate[:-1]

                if candidate in scores and candidate != "system":
                    scores[candidate] += 2

        # -------------------------------
        # 3. PASSIVE VOICE (agent)
        # -------------------------------
        for token in doc:
            if token.dep_ == "agent":
                for child in token.children:
                    candidate = child.lemma_.lower()

                    if candidate.endswith("s"):
                        candidate = candidate[:-1]

                    if candidate in scores:
                        scores[candidate] += 4

        # -------------------------------
        # 4. PREPOSITIONAL ROLES
        # -------------------------------
        for token in doc:
            if token.dep_ == "prep" and token.text.lower() in self.actor_prepositions:
                for child in token.children:
                    if child.dep_ == "pobj":
                        candidate = child.lemma_.lower()

                        if candidate.endswith("s"):
                            candidate = candidate[:-1]

                        if candidate in scores and candidate != "system":
                            scores[candidate] += 2

        # -------------------------------
        # 5. VERB SEMANTICS
        # -------------------------------
        if root_verb:

            if root_verb in self.verb_semantics["system_internal"]:
                scores["system"] += 2

            elif root_verb in self.verb_semantics["system_mediated"]:

                # If a human object exists → prioritize it
                human_candidates = [
                    token.lemma_.lower()
                    for token in doc
                    if token.dep_ in {"dobj", "pobj"}
                    and token.lemma_.lower().rstrip("s") in self.known_actors
                    and token.lemma_.lower().rstrip("s") != "system"
                ]

                if human_candidates:
                    for actor in human_candidates:
                        scores[actor.rstrip("s")] += 3
                else:
                    scores["user"] += 2  # fallback only
            elif root_verb in self.verb_semantics["user_initiated"]:
                scores["user"] += 3

        # -------------------------------
        # 6. REDUCE SYSTEM DOMINANCE
        # -------------------------------
        if subject == "system":
            scores["system"] -= 2

        # -------------------------------
        # 7. SELECT BEST ACTOR
        # -------------------------------
        best_actor = max(scores, key=scores.get)

        if scores[best_actor] <= 0:
            return self.default_actor

        return best_actor
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
    def process_sentence(self, sentence: str) -> Optional[Dict]:

        if isinstance(sentence, dict):
            cleaned_sentence = sentence.get("cleaned_sentence") or sentence.get("sentence") or ""
            lemmas = sentence.get("lemmas")
        else:
            cleaned_sentence = sentence
            lemmas = None

        if not cleaned_sentence:
            return None

        doc = nlp(cleaned_sentence)
        if lemmas is None:
            lemmas = [token.lemma_.lower() for token in doc if token.is_alpha]

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
        # if actor == "system":
        #     actor = None   # or "user" depending on your preference
        action = self.extract_action(doc)
        direct_object = self.extract_direct_object(doc)
        prepositional_objects = self.extract_prepositional_objects(doc)
        subordinate_clauses = self.extract_subordinate_clauses(doc)
        prepositional_objects.extend(subordinate_clauses)

        # 4. Build output
        return {
            # "sentence_id": sentence_obj["id"],
            # "speaker": sentence_obj["speaker"],
            "cleaned_sentence": sentence,
            "req_confidence": req_confidence,
            "req_type_confidence": type_confidence,
            "req_type": req_type,
            "quality_category": quality_category,
            "quality_category_confidence": category_confidence,
            "actor": actor,
            "action": action,
            "direct_object": direct_object,
            "prepositional_objects": prepositional_objects,
            # "is_negative": sentence_obj["negation"],
        }

    # ===============================
    # Step 7: Process Whole Transcript
    # ===============================
    def process_transcript(self, preprocessed_output) -> List[Dict]:

        requirements = []

        for sentence_obj in preprocessed_output:
            result = self.process_sentence(sentence_obj)
            if result:
                requirements.append(result)

        return requirements