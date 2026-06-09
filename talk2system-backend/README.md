# Talk2System Backend

> AI-powered requirements engineering platform — FastAPI backend for audio transcription, intelligent requirement extraction, document generation, and collaborative project management.

## Overview

Talk2System's backend is a layered FastAPI application that processes stakeholder conversations end-to-end: from raw audio to professional SRS documents and UML diagrams. It supports three requirement extraction engines, multi-level approval workflows, async task tracking, and a full notification/audit system.

**Three Extraction Engines**
| Engine | Approach | When to Use |
|--------|----------|------------|
| **Hybrid** | SVM classifiers + rule-based scoring combined by confidence | Default — acceptable accuracy and transparency |
| **LLM** | LangChain + Ollama (local LLM) | Context-heavy or ambiguous transcripts |
| **Gemini** | Google Gemini API | High accuracy, cloud-based alternative |

---

## Project Structure

```
talk2system-backend/
├── app/
│   ├── main.py                       # FastAPI entry point, router registration, CORS
│   ├── .env                          # Environment variables (not committed)
│   │
│   ├── api/                          # HTTP route handlers
│   │   ├── auth_routes.py            # Signup, login, /me
│   │   ├── oauth_routes.py           # Google & GitHub OAuth
│   │   ├── admin_routes.py           # User management (admin only)
│   │   ├── project_routes.py         # Project CRUD, membership, invitations
│   │   ├── session_routes.py         # Session CRUD
│   │   ├── requirements.py           # Requirement extraction & management
│   │   ├── approval.py               # Session-level feature approvals
│   │   ├── project_approval.py       # Project-level feature approvals
│   │   ├── transcription_router.py   # Audio upload & transcription
│   │   ├── translation_router.py     # Transcript translation
│   │   ├── summary.py                # Session summarization
│   │   ├── document.py               # UML & SRS generation
│   │   ├── notification_routes.py    # User notifications
│   │   └── dashboard_routes.py       # User & admin statistics
│   │
│   ├── db/
│   │   ├── base.py                   # SQLAlchemy declarative base
│   │   └── session.py                # Database session factory
│   │
│   ├── dependencies/
│   │   └── auth.py                   # JWT bearer auth, role guards
│   │
│   ├── models/                       # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── project.py
│   │   ├── project_membership.py
│   │   ├── invitation.py
│   │   ├── session.py
│   │   ├── session_membership.py
│   │   ├── transcript.py             # Diarized transcript segments
│   │   ├── summaries.py
│   │   ├── requirement_runs.py       # Extraction job records
│   │   ├── requirement_raw.py        # Raw extraction output
│   │   ├── session_requirement.py    # Versioned session requirements
│   │   ├── project_requirments.py    # Versioned project requirements
│   │   ├── artifact.py
│   │   ├── artifact_type.py
│   │   ├── approval.py               # Session feature approvals
│   │   ├── project_approval.py       # Project feature approvals
│   │   ├── background_task.py        # Async task tracking
│   │   ├── notification.py
│   │   └── audit_log.py
│   │
│   ├── services/                     # Business logic layer
│   │   ├── auth_service.py           # JWT, BCrypt, registration, login
│   │   ├── oauth_service.py          # Google & GitHub OAuth flows
│   │   ├── project_service.py        # Projects, membership, invitations
│   │   ├── session_service.py        # Sessions CRUD
│   │   ├── transcription_service.py  # AssemblyAI audio → transcript
│   │   ├── translation_service.py    # Ollama multilingual translation
│   │   ├── summary_service.py        # Transcript summarization
│   │   ├── requirement_service.py    # Extraction, versioning, approval
│   │   ├── llm_service.py            # LLM extraction engine (Ollama)
│   │   ├── gemini_service.py         # Gemini extraction engine
│   │   ├── approval_service.py       # Session approval workflow
│   │   ├── project_approval_service.py # Project approval workflow
│   │   ├── artifact_service.py       # Artifact CRUD
│   │   ├── uml_service.py            # UML diagram generation
│   │   ├── srs_service.py            # SRS document generation
│   │   ├── notification_service.py   # Notification creation & retrieval
│   │   ├── audit_service.py          # Audit log writes
│   │   └── dashboard_service.py      # Stats & activity feeds
│   │
│   └── nlp/                          # NLP & ML pipeline
│       ├── preprocessing.py          # Text normalization, noise removal, tokenization
│       ├── rule_engine.py            # Rule-based FR/NFR scoring
│       ├── inference.py              # SVM model inference
│       ├── hybrid_engine.py          # Hybrid rule + ML engine
│       └── llm_preprocessing.py     # LLM-specific preprocessing
│
├── ML/
│   ├── dataset/                      # Training & test datasets (CSV/XLSX)
│   ├── training/
│   │   ├── train_fr_nfr_svm.py       # Train FR/NFR binary classifier
│   │   └── train_nfr_svm.py          # Train NFR category classifier
│   ├── evaluation/
│   │   ├── evaluate_fr_nfr.py        # FR/NFR classifier evaluation
│   │   └── evaluate_nfr.py           # NFR category classifier evaluation
│   └── models/                       # Serialized .pkl model files
│       ├── fr_nfr_classifier.pkl
│       ├── fr_nfr_selector.pkl
│       ├── fr_nfr_tfidf_vectorizer.pkl
│       ├── nfr_category_classifier.pkl
│       ├── nfr_selector.pkl
│       └── nfr_vectorizer.pkl
│
├── tests/
│   ├── test_preprocessing.py
│   └── test_rule_engine.py
│
├── data/                             # Sample transcripts & pipeline outputs
├── uploads/                          # Uploaded audio files
├── chunks/                           # Temporary audio chunks
├── storage/                          # Generated artifacts (UML, SRS)
├── requirements.txt
└── README.md
```

---

## API Reference

All endpoints require a JWT Bearer token unless marked **public**.

### Authentication — `/api/auth`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/signup` | Register new user | Public |
| POST | `/api/auth/login` | Login, returns JWT token | Public |
| GET | `/api/auth/me` | Get current user info | Required |
| GET | `/api/auth/google/login` | Start Google OAuth flow | Public |
| GET | `/api/auth/google/callback` | Google OAuth callback | Public |
| GET | `/api/auth/github/login` | Start GitHub OAuth flow | Public |
| GET | `/api/auth/github/callback` | GitHub OAuth callback | Public |

### Admin — `/api/admin`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/pending-users` | List users pending approval |
| GET | `/api/admin/all-users` | List all system users |
| PATCH | `/api/admin/users/{user_id}/approve` | Approve user |
| PATCH | `/api/admin/users/{user_id}/suspend` | Suspend user |
| PATCH | `/api/admin/users/{user_id}/terminate` | Terminate user |
| PATCH | `/api/admin/users/{user_id}/archive` | Archive user |

### Projects — `/api/projects`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/projects/createproject` | Create project |
| GET | `/api/projects/getprojects` | List all projects |
| GET | `/api/projects/my-projects` | List user's projects |
| GET | `/api/projects/getproject/{project_id}` | Get project details |
| DELETE | `/api/projects/deleteproject/{project_id}` | Delete project |
| PATCH | `/api/projects/{project_id}/complete` | Mark project complete |
| POST | `/api/projects/join` | Request to join project |
| GET | `/api/projects/my-requests` | Get user's join requests |
| GET | `/api/projects/pending-requests` | Get pending requests (PM only) |
| PATCH | `/api/projects/invitations/{id}/accept` | Accept join request |
| PATCH | `/api/projects/invitations/{id}/reject` | Reject join request |
| GET | `/api/projects/{project_id}/members` | List members with roles |
| GET | `/api/projects/{project_id}/my-role` | Get current user's role |
| POST | `/api/projects/{project_id}/participants` | Add participant directly (PM/admin) |
| DELETE | `/api/projects/{project_id}/participants/{user_id}` | Remove participant |
| GET | `/api/projects/{project_id}/audit-logs` | Get last 100 audit entries |

### Sessions — `/api/sessions`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sessions/project/{project_id}` | Create session |
| GET | `/api/sessions/project/{project_id}` | List sessions in project |
| GET | `/api/sessions/{session_id}` | Get session details |
| GET | `/api/sessions/{session_id}/members` | List session members |
| DELETE | `/api/sessions/{session_id}` | Delete session |
| PUT | `/api/sessions/{session_id}/status` | Update session status |
| PATCH | `/api/sessions/{session_id}/complete` | Mark session complete |

### Transcription

| Method | Path | Description |
|--------|------|-------------|
| POST | `/projects/{project_id}/transcribe` | Upload audio → create session → transcribe (AssemblyAI with speaker diarization) |

### Translation — `/api`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sessions/{session_id}/translate` | Translate transcript to English (Ollama, cached) |
| GET | `/api/sessions/{session_id}/translation` | Get cached translation |

### Summarization — `/api`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/summarize/{session_id}` | Generate transcript summary |
| GET | `/api/summary/{session_id}` | Get existing summary |

### Requirements Extraction — `/api`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/projects/{project_id}/session/{session_id}/extract-requirements` | Sync extraction (engine: `hybrid`/`llm`/`gemini`) |
| POST | `/projects/{project_id}/session/{session_id}/extract-requirements-async` | Async extraction → returns `task_id` |
| GET | `/sessions/extraction-tasks/{task_id}/status` | Poll async task status |
| GET | `/sessions/{session_id}/extraction-tasks/latest` | Get latest completed task |
| GET | `/sessions/requirements/comparison` | Compare multiple extraction runs |
| POST | `/projects/{project_id}/session/{session_id}/choose-requirements` | Save preferred requirements |
| GET | `/projects/{project_id}/requirements` | Latest project requirements |
| GET | `/projects/{project_id}/requirements/versions` | All requirement versions |
| GET | `/projects/requirements/{requirement_id}` | Get specific requirement |
| PUT | `/projects/requirements/{requirement_id}` | Edit requirement (auto-increments version) |
| PATCH | `/projects/requirements/{requirement_id}/approve` | Approve requirement |
| GET | `/projects/{project_id}/session/{session_id}/requirements` | Latest session requirements |
| GET | `/projects/{project_id}/session/{session_id}/requirements/versions` | All session requirement versions |
| GET | `/sessions/requirements/{requirement_id}` | Get session requirement |
| PUT | `/sessions/requirements/{requirement_id}` | Edit session requirement |
| PATCH | `/sessions/requirements/{requirement_id}/approve` | Approve session requirement |

### Approval Workflows

**Session-level features** (transcript / requirements / uml / srs):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sessions/{session_id}/features/approval-status` | Get all feature approval states |
| POST | `/api/sessions/{session_id}/features/{feature}/approve` | Approve a feature |

**Project-level features:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects/{project_id}/features/approval-status` | Get all feature approval states |
| GET | `/api/projects/{project_id}/features/{feature}/approval-status/{version_id}` | Get version-specific approval |
| POST | `/api/projects/{project_id}/features/{feature}/approve` | Approve a feature |

### Document Generation — `/api`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/projects/{project_id}/sessions/{session_id}/generate-uml` | Generate UML diagrams (async) |
| POST | `/projects/{project_id}/generate-srs` | Generate SRS document (async) |

### Notifications — `/api/notifications`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications` | Get notifications (`?unread_only=true`) |
| GET | `/api/notifications/unread-count` | Get unread count |
| PATCH | `/api/notifications/{id}/read` | Mark one as read |
| PATCH | `/api/notifications/read-all` | Mark all as read |

### Dashboard — `/api/dashboard`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/user-stats` | Personal stats (projects, sessions, artifacts) |
| GET | `/api/dashboard/admin-stats` | System-wide stats |
| GET | `/api/dashboard/activity-feed` | Filtered system activity |
| GET | `/api/dashboard/user-activity-feed` | Filtered user activity |

---

## Database Schema

PostgreSQL — tables are created automatically on startup via `Base.metadata.create_all()`.

| Model | Key Fields |
|-------|-----------|
| **User** | `id`, `email`, `hashed_password`, `full_name`, `role` (user/admin), `status` (pending/active/suspended/terminated/archived) |
| **Project** | `id`, `name`, `description`, `domain`, `project_status` (in_progress/completed) |
| **ProjectMembership** | `project_id`, `user_id`, `role` (project_manager/participant), `joined_at`, `left_at` |
| **Invitation** | `project_id`, `invitee_user_id`, `invited_by_user_id`, `status` (pending/accepted/rejected) |
| **Session** | `id`, `title`, `project_id`, `status`, `audio_file_path`, `transcript_text`, `detected_language`, `translated_transcript_text` |
| **TranscriptSegment** | `session_id`, `speaker`, `start_time`, `end_time`, `text`, `translated_text`, `approval_status` |
| **RequirementRun** | `project_id`, `session_id`, `run_type` (hybrid/llm/gemini), `grouped_json` — records every extraction job |
| **SessionRequirement** | `session_id`, `project_id`, `requirements_json`, `version`, `approval_status`, `src_run_id` |
| **ProjectRequirement** | `project_id`, `aggregated_req_json`, `version`, `approval_status` — merged from all sessions |
| **Artifact** | `project_id`, `session_id`, `artifact_type_id`, `file_path`, `version`, `approval_status` |
| **Approval** | `session_id`, `user_id`, `feature` (transcript/requirements/uml/srs), `version_id` |
| **ProjectApproval** | `project_id`, `user_id`, `feature`, `version_id` |
| **BackgroundTask** | `task_type` (extract_requirements/generate_uml/generate_srs), `status` (pending/in_progress/done/failed), `task_input`, `task_output`, `error_message` |
| **Notification** | `user_id`, `notification_type`, `title`, `message`, `actor_name`, `project_id`, `session_id`, `is_read` |
| **AuditLog** | `user_id`, `project_id`, `action`, `entity`, `entity_id`, `details` (JSON diff/metadata) |

### Requirements JSON Structure

The `requirements_json` field stored in `SessionRequirement` and `ProjectRequirement`:

```json
{
  "functional_requirements": [
    { "text": "The system shall allow users to log in.", "actor": "system" }
  ],
  "nonfunctional_requirements": [
    {
      "text": "The system must respond within 2 seconds.",
      "category": "Performance",
      "actor": "system"
    }
  ],
  "actors": ["system", "user", "admin"]
}
```

---

## NLP & Extraction Pipelines

### Preprocessing Pipeline

Transforms raw conversation transcripts into clean, atomic sentence objects:

1. **Text Normalization** — Standardize spacing, quotes, punctuation
2. **Noise Removal** — Strip timestamps, `[laughter]`, filler words (`um`, `uh`, `basically`)
3. **Coreference Resolution** — Replace pronouns with referenced entities (fastcoref)
4. **Sentence Segmentation & Conjunction Splitting** — Break compound sentences into atomic statements
5. **Tokenization & Lemmatization** — spaCy tokenization, base-form reduction
6. **Negation Detection** — Flag negated sentences
7. **Domain Term Normalization** — Standardize synonyms
8. **Deduplication** — Remove semantically similar sentences (SentenceTransformers)

### Rule-Based Engine

Scores each sentence across weighted linguistic features:

- **Modal verb detection** — `must`/`shall` (strong), `should`/`may` (medium)
- **Functional verb scoring** — 40+ action verbs (create, delete, authenticate, notify…)
- **NFR keyword categories** — Performance, Security, Usability, Availability, Scalability, Fault Tolerance, Legality, Maintainability, Portability, and more
- **Time pattern detection** — Identifies SLA-style patterns ("within N seconds")

### ML Models (SVM)

**FR/NFR Binary Classifier**
- TF-IDF (unigrams/bigrams/trigrams, 15k features) → Chi-Square selection (8k features) → Linear SVM
- 80/20 split, 5-fold cross-validation
- **90% accuracy** on held-out test set; **96% accuracy** on unseen test data

**NFR Category Classifier**
- TF-IDF (15k features) → Chi-Square selection (2k features) → Linear SVM
- 10-fold stratified cross-validation, final model trained on full dataset
- Categories: Security, Performance, Usability, Availability, Scalability, Fault Tolerance, Legality, Maintainability, Portability, Look & Feel, Operability

### Hybrid Engine

Runs both pipelines in parallel and selects the higher-confidence prediction per sentence. Returns the final result alongside individual ML and rule-based predictions for transparency.

---

## Installation

### Prerequisites

- Python 3.8+
- PostgreSQL installed and running

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

4. **Download the spaCy model:**
   ```powershell
   python -m spacy download en_core_web_trf
   ```

5. **Create the database** — In pgAdmin, create a database named `talk2system` (password: `0000`).

6. **Configure environment variables** — Create `app/.env`:
   ```env
   DATABASE_URL=postgresql://postgres:0000@localhost:5432/talk2system
   SECRET_KEY=your_jwt_secret_key
   ASSEMBLYAI_API_KEY=your_assemblyai_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   FRONTEND_URL=http://localhost:5173
   ```

### Start the Server

```powershell
uvicorn app.main:app --reload
```

- API: `http://127.0.0.1:8000`
- Interactive docs: `http://127.0.0.1:8000/docs`

Tables are created automatically on first startup.

---

## ML Model Training & Evaluation

### Train

```powershell
# FR/NFR binary classifier
python ML/training/train_fr_nfr_svm.py

# NFR category classifier
python ML/training/train_nfr_svm.py
```

### Evaluate

```powershell
python ML/evaluation/evaluate_fr_nfr.py
python ML/evaluation/evaluate_nfr.py
```

Outputs: classification report, confusion matrix, per-row predictions CSV in `ML/evaluation/`.

### Test the NLP Pipelines Directly

```powershell
# Preprocessing pipeline → data/preprocessing_output.json
python tests/test_preprocessing.py

# Rule engine (requires preprocessing output) → data/rule_engine_output.json
python tests/test_rule_engine.py

# ML inference → data/test_transcript_ml_inference.csv
python app/nlp/inference.py

# Hybrid engine → data/hybrid_inference_results.csv
python app/nlp/hybrid_engine.py
```

---

## Key Dependencies

| Category | Libraries |
|----------|-----------|
| **Web Framework** | FastAPI 0.115, Uvicorn 0.22, Pydantic 2.12 |
| **Database** | SQLAlchemy 2.0, psycopg2-binary |
| **Auth** | python-jose (JWT), bcrypt 4.3 |
| **NLP / ML** | spaCy 3.8, sentence-transformers 3.4, scikit-learn 1.8, fastcoref, nltk |
| **LLM** | LangChain 1.2, langchain-ollama, google-genai (Gemini) |
| **Audio** | AssemblyAI 0.59, librosa 0.11, pydub |
| **Utilities** | python-dotenv, pandas, numpy, joblib, requests |

See `requirements.txt` for the full dependency list.
