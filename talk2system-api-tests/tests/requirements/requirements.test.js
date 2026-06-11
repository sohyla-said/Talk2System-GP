require('dotenv').config();
const apiClient = require('../../config/apiClient');
const {
  AsyncExtractRequest,
  ExtractionTaskResponse,
  ExtractionTaskStatusResponse,
  ProjectRequirementResponse,
  ChooseRequirementRequest,
} = require('../../models/RequirementModels');
const { getManagerToken, authHeader } = require('../../helpers/authHelper');

// ============================================================
//  Requirements Module Tests
//  Endpoints: POST  /api/projects/{project_id}/session/{session_id}/extract-requirements-async
//             GET   /api/sessions/extraction-tasks/{task_id}/status
//             GET   /api/sessions/{session_id}/extraction-tasks/latest
//             GET   /api/sessions/requirements/comparison
//             POST  /api/projects/{project_id}/session/{session_id}/choose-requirements
//             GET   /api/projects/{project_id}/requirements
//             GET   /api/projects/{project_id}/requirements/versions
//             GET   /api/projects/requirements/{requirement_id}
// ============================================================

const PROJECT_ID = parseInt(process.env.TEST_PROJECT_ID);

let managerToken;
let sessionId;     // created in beforeAll — always belongs to PROJECT_ID
let extractTaskId; // captured from TC-REQ-01, reused in polling tests

beforeAll(async () => {
  managerToken = await getManagerToken();

  // Create a session that genuinely belongs to PROJECT_ID.
  // Using a hardcoded TEST_SESSION_ID risks FK violations if that session
  // is in a different project, which causes 500s and ECONNRESET.
  const res = await apiClient.post(
    `/api/projects/${PROJECT_ID}/UploadTranscript`,
    {
      transcript: 'Speaker A: We need user authentication.\nSpeaker B: Also a reporting dashboard.',
      title: `Req-Test Session ${Date.now()}`,
    },
    { headers: authHeader(managerToken) }
  );
  if (res.status === 200) {
    sessionId = res.data.session_id;
  }
});

describe('Requirements Module — /api/projects & /api/sessions', () => {

  // ----------------------------------------------------------
  //  POST /api/projects/{project_id}/session/{session_id}/extract-requirements-async
  // ----------------------------------------------------------
  describe('POST .../extract-requirements-async', () => {

    test('TC-REQ-01: Start async extraction with valid transcript and auth → 200 with task_id', async () => {
      expect(sessionId).toBeDefined(); // depends on beforeAll session creation
      const body = new AsyncExtractRequest(
        'Speaker A: The system must allow users to login with email and password.\n' +
        'Speaker B: We also need a dashboard showing project statistics and a notification panel.',
        'llm'
      );
      const res = await apiClient.post(
        `/api/projects/${PROJECT_ID}/session/${sessionId}/extract-requirements-async`,
        body,
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(200);

      const task = new ExtractionTaskResponse(res.data);
      expect(task.task_id).toBeDefined();
      expect(task.status).toBe('pending');

      extractTaskId = task.task_id;
    });

    test('TC-REQ-02: Start async extraction without auth → 401 or 403', async () => {
      expect(sessionId).toBeDefined();
      const body = new AsyncExtractRequest('Some transcript text.', 'llm');
      const res  = await apiClient.post(
        `/api/projects/${PROJECT_ID}/session/${sessionId}/extract-requirements-async`,
        body
      );
      expect([401, 403]).toContain(res.status);
    });

    test('TC-REQ-03: Start async extraction with missing "transcript" field → 4xx', async () => {
      const res = await apiClient.post(
        `/api/projects/${PROJECT_ID}/session/${sessionId}/extract-requirements-async`,
        { engine: 'llm' },
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    test('TC-REQ-04: Start async extraction with missing "engine" field → 4xx', async () => {
      const res = await apiClient.post(
        `/api/projects/${PROJECT_ID}/session/${sessionId}/extract-requirements-async`,
        { transcript: 'Some text without engine.' },
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

  });

  // ----------------------------------------------------------
  //  GET /api/sessions/extraction-tasks/{task_id}/status
  // ----------------------------------------------------------
  describe('GET /api/sessions/extraction-tasks/{task_id}/status', () => {

    test('TC-REQ-05: Poll extraction task status for created task → 200', async () => {
      expect(extractTaskId).toBeDefined();

      const res  = await apiClient.get(
        `/api/sessions/extraction-tasks/${extractTaskId}/status`,
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(200);

      const task = new ExtractionTaskStatusResponse(res.data);
      expect(task.task_id).toBe(extractTaskId);
      expect(['pending', 'in-progress', 'done', 'failed']).toContain(task.status);
      expect(task.task_type).toBe('extract_requirements');
      expect(task.project_id).toBe(PROJECT_ID);
    });

    test('TC-REQ-06: Poll non-existent extraction task → 404', async () => {
      const res = await apiClient.get(
        '/api/sessions/extraction-tasks/999999/status',
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(404);
    });

    test('TC-REQ-07: Poll extraction task without auth → 401 or 403', async () => {
      const res = await apiClient.get('/api/sessions/extraction-tasks/1/status');
      expect([401, 403]).toContain(res.status);
    });

  });

  // ----------------------------------------------------------
  //  GET /api/projects/{project_id}/requirements
  // ----------------------------------------------------------
  describe('GET /api/projects/{project_id}/requirements', () => {

    test('TC-REQ-08: Get latest project requirements → 200 with data (or 404 if none exist yet)', async () => {
      const res = await apiClient.get(`/api/projects/${PROJECT_ID}/requirements`);
      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const req = new ProjectRequirementResponse(res.data);
        // The API response omits project_id at this endpoint; assert on the fields that are present
        expect(req.id).toBeDefined();
        expect(req.version).toBeDefined();
        expect(req.approval_status).toBeDefined();
        expect(req.data).toBeDefined();
      }
    });

    test('TC-REQ-09: Get latest requirements for non-existent project → 404', async () => {
      const res = await apiClient.get('/api/projects/999999/requirements');
      expect(res.status).toBe(404);
    });

  });

  // ----------------------------------------------------------
  //  GET /api/projects/{project_id}/requirements/versions
  // ----------------------------------------------------------
  describe('GET /api/projects/{project_id}/requirements/versions', () => {

    test('TC-REQ-10: Get all requirement versions for a project → 200 or 404', async () => {
      const res = await apiClient.get(`/api/projects/${PROJECT_ID}/requirements/versions`);
      expect([200, 404]).toContain(res.status);
    });

  });

  // ----------------------------------------------------------
  //  GET /api/sessions/requirements/comparison
  // ----------------------------------------------------------
  describe('GET /api/sessions/requirements/comparison', () => {

    test('TC-REQ-11: Comparison request with no run IDs → 400', async () => {
      const res = await apiClient.get(
        '/api/sessions/requirements/comparison',
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(400);
    });

    test('TC-REQ-12: Comparison request without auth → 401 or 403', async () => {
      const res = await apiClient.get('/api/sessions/requirements/comparison');
      expect([401, 403]).toContain(res.status);
    });

  });

  // ----------------------------------------------------------
  //  POST /api/projects/{project_id}/session/{session_id}/choose-requirements
  // ----------------------------------------------------------
  describe('POST .../choose-requirements', () => {

    test('TC-REQ-13: Choose requirements without auth → 401 or 403', async () => {
      const body = new ChooseRequirementRequest({}, 1);
      const res  = await apiClient.post(
        `/api/projects/${PROJECT_ID}/session/${sessionId}/choose-requirements`,
        body
      );
      expect([401, 403]).toContain(res.status);
    });

  });

  // ----------------------------------------------------------
  //  GET /api/sessions/{session_id}/extraction-tasks/latest
  // ----------------------------------------------------------
  describe('GET /api/sessions/{session_id}/extraction-tasks/latest', () => {

    test('TC-REQ-14: Get latest extraction task for session with no completed tasks → 404', async () => {
      // Use a session that is unlikely to have a completed extraction task
      const res = await apiClient.get(
        '/api/sessions/999999/extraction-tasks/latest',
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(404);
    });

    test('TC-REQ-15: Get latest extraction task without auth → 401 or 403', async () => {
      const res = await apiClient.get(`/api/sessions/${sessionId}/extraction-tasks/latest`);
      expect([401, 403]).toContain(res.status);
    });

  });

});
