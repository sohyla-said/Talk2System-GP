# Talk2System — API Testing Framework
**Pattern:** POJO (Plain Old JavaScript Object)  
**Stack:** Jest + Axios  
**Target:** `http://127.0.0.1:8000` (FastAPI backend)

---

## Folder Structure

```
talk2system-api-tests/
├── .env                        ← credentials & base URL (never commit this)
├── .gitignore
├── package.json
├── config/
│   └── apiClient.js            ← shared Axios instance
├── models/                     ← POJO classes (one file per module)
│   ├── AuthModels.js
│   ├── ProjectModels.js
│   └── SessionModels.js
├── helpers/
│   └── authHelper.js           ← reusable login + token helpers
└── tests/
    ├── auth/
    │   └── auth.test.js        ← 12 test cases
    ├── projects/
    │   └── projects.test.js    ← 11 test cases
    └── sessions/
        └── sessions.test.js    ← 12 test cases (includes TC-13 security regression)
```

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Fill in `.env`
Open `.env` and replace the placeholder values with real credentials from your database:
```
TEST_MANAGER_EMAIL=...
TEST_MANAGER_PASSWORD=...
TEST_USER_EMAIL=...
TEST_USER_PASSWORD=...
TEST_ADMIN_EMAIL=...
TEST_ADMIN_PASSWORD=...
TEST_PROJECT_ID=...   ← an existing project ID for session tests
```

### 3. Start the FastAPI server
```bash
cd ../talk2system-backend
uvicorn app.main:app --reload
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run one module at a time
npm run test:auth
npm run test:projects
npm run test:sessions
```

---

## The POJO Pattern Explained

Each file in `models/` is a POJO — a plain class that holds data with no business logic.

| POJO Class | Represents |
|---|---|
| `LoginRequest` | Body sent to POST /api/auth/login |
| `AuthResponse` | Response from login / signup |
| `ProjectCreateRequest` | Body sent to POST /api/projects |
| `ProjectResponse` | Response from project endpoints |
| `SessionCreateRequest` | Body sent to POST /api/sessions/project/:id |
| `SessionResponse` | Response from session endpoints |

**Why this matters:** If the API adds a new field (e.g., `project_type`), you update only the POJO class — every test that uses it automatically reflects the change.

---

## Security Regression Test

`TC-SESS-02` in `sessions.test.js` is a permanent regression test for the **TC-13 vulnerability**:  
_Session creation endpoint accepts requests with no authentication token._

- **Before the fix:** This test will FAIL (endpoint returns 200 with no token)  
- **After the fix:** This test will PASS (endpoint returns 401 or 403)

Do not delete this test case.
