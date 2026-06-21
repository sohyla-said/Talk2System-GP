require('dotenv').config();
const apiClient = require('../../config/apiClient');
const {
  AsyncUmlRequest,
  UmlTaskResponse,
  UmlTaskStatusResponse,
  ArtifactVersionsResponse,
  ArtifactResponse,
} = require('../../models/ArtifactModels');
const { getManagerToken, authHeader } = require('../../helpers/authHelper');

// ============================================================
//  UML Generation Module Tests
//  Endpoints: POST /api/projects/{project_id}/sessions/{session_id}/generate-uml-async
//             GET  /api/uml-tasks/{task_id}/status
//             GET  /api/projects/{project_id}/sessions/{session_id}/artifacts/{type}/versions
//             GET  /api/projects/{project_id}/artifacts/{type}/versions
//             POST /api/artifacts/{artifact_id}/approve
//             GET  /api/artifacts/{artifact_id}
//             GET  /api/artifacts/{artifact_id}/download
// ============================================================

const PROJECT_ID = parseInt(process.env.TEST_PROJECT_ID);

let managerToken;
let sessionId;  // created in beforeAll — always belongs to PROJECT_ID
let umlTaskId;  // captured from TC-UML-01, reused in polling tests

beforeAll(async () => {
  managerToken = await getManagerToken();

  // Create a session that belongs to PROJECT_ID to avoid FK violations
  const res = await apiClient.post(
    `/api/projects/${PROJECT_ID}/UploadTranscript`,
    {
      transcript: 'Speaker A: Need authentication.\nSpeaker B: Also a UML diagram of classes.',
      title: `UML-Test Session ${Date.now()}`,
    },
    { headers: authHeader(managerToken) }
  );
  if (res.status === 200) {
    sessionId = res.data.session_id;
  }
  // Other suites queue Ollama/Gemini background generation tasks (extract-requirements,
  // generate-uml, generate-srs) that can leave the backend busy for a while; give this
  // hook more room than the 15s default so a transiently slow server doesn't fail
  // the whole suite on a login + one upload call.
}, 60000);

describe('UML Generation Module — /api/projects/.../generate-uml-async', () => {

  // ----------------------------------------------------------
  //  POST /api/projects/{project_id}/sessions/{session_id}/generate-uml-async
  // ----------------------------------------------------------
  describe('POST .../generate-uml-async', () => {

    test('TC-UML-01: Start async usecase diagram generation with valid auth → 200 with task_id', async () => {
      expect(sessionId).toBeDefined(); // depends on beforeAll session creation
      const body = new AsyncUmlRequest('usecase', 'session');
      const res  = await apiClient.post(
        `/api/projects/${PROJECT_ID}/sessions/${sessionId}/generate-uml-async`,
        body,
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(200);

      const task = new UmlTaskResponse(res.data);
      expect(task.task_id).toBeDefined();
      expect(task.status).toBe('pending');

      umlTaskId = task.task_id;
    });

    test('TC-UML-02: Start async UML generation without auth → 401 or 403', async () => {
      const body = new AsyncUmlRequest('usecase', 'session');
      const res  = await apiClient.post(
        `/api/projects/${PROJECT_ID}/sessions/${sessionId}/generate-uml-async`,
        body
      );
      expect([401, 403]).toContain(res.status);
    });

    test('TC-UML-03: Start async class diagram generation with valid auth → 200', async () => {
      const body = new AsyncUmlRequest('class', 'session');
      const res  = await apiClient.post(
        `/api/projects/${PROJECT_ID}/sessions/${sessionId}/generate-uml-async`,
        body,
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(200);
      expect(res.data.task_id).toBeDefined();
      expect(res.data.status).toBe('pending');
    });

    test('TC-UML-04: Start async sequence diagram generation with valid auth → 200', async () => {
      const body = new AsyncUmlRequest('sequence', 'session');
      const res  = await apiClient.post(
        `/api/projects/${PROJECT_ID}/sessions/${sessionId}/generate-uml-async`,
        body,
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(200);
      expect(res.data.task_id).toBeDefined();
    });

    test('TC-UML-05: Start async project-level UML generation → 200', async () => {
      const body = new AsyncUmlRequest('usecase', 'project');
      const res  = await apiClient.post(
        `/api/projects/${PROJECT_ID}/sessions/${sessionId}/generate-uml-async`,
        body,
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(200);
      expect(res.data.task_id).toBeDefined();
    });

  });

  // ----------------------------------------------------------
  //  GET /api/uml-tasks/{task_id}/status
  // ----------------------------------------------------------
  describe('GET /api/uml-tasks/{task_id}/status', () => {

    test('TC-UML-06: Poll UML task status for created task → 200 with correct fields', async () => {
      expect(umlTaskId).toBeDefined();

      const res  = await apiClient.get(
        `/api/uml-tasks/${umlTaskId}/status`,
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(200);

      const task = new UmlTaskStatusResponse(res.data);
      expect(task.task_id).toBe(umlTaskId);
      expect(['pending', 'in_progress', 'done', 'failed']).toContain(task.status);
      expect(task.task_type).toBe('generate_uml');
      expect(task.project_id).toBe(PROJECT_ID);
    });

    test('TC-UML-07: Poll non-existent UML task → 404', async () => {
      const res = await apiClient.get(
        '/api/uml-tasks/999999/status',
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(404);
    });

    test('TC-UML-08: Poll UML task without auth → 401 or 403', async () => {
      const res = await apiClient.get('/api/uml-tasks/1/status');
      expect([401, 403]).toContain(res.status);
    });

  });

  // ----------------------------------------------------------
  //  GET /api/projects/{project_id}/sessions/{session_id}/artifacts/{type}/versions
  // ----------------------------------------------------------
  describe('GET .../artifacts/{type}/versions', () => {

    test('TC-UML-09: Get session-level usecase artifact versions → 200 with versions array', async () => {
      const res  = await apiClient.get(
        `/api/projects/${PROJECT_ID}/sessions/${sessionId}/artifacts/usecase/versions`
      );
      expect(res.status).toBe(200);

      const data = new ArtifactVersionsResponse(res.data);
      expect(data.project_id).toBe(PROJECT_ID);
      expect(Array.isArray(data.versions)).toBe(true);
    });

    test('TC-UML-10: Get session-level class artifact versions → 200', async () => {
      const res = await apiClient.get(
        `/api/projects/${PROJECT_ID}/sessions/${sessionId}/artifacts/class/versions`
      );
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.versions)).toBe(true);
    });

    test('TC-UML-11: Get project-level sequence artifact versions → 200', async () => {
      const res = await apiClient.get(
        `/api/projects/${PROJECT_ID}/artifacts/sequence/versions`
      );
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.versions)).toBe(true);
    });



  });

  // ----------------------------------------------------------
  //  GET /api/artifacts/{artifact_id}
  // ----------------------------------------------------------
  describe('GET /api/artifacts/{artifact_id}', () => {

    test('TC-UML-12: Get artifact by non-existent ID → 404', async () => {
      const res = await apiClient.get('/api/artifacts/999999');
      expect(res.status).toBe(404);
    });

  });

  // ----------------------------------------------------------
  //  POST /api/artifacts/{artifact_id}/approve
  // ----------------------------------------------------------
  describe('POST /api/artifacts/{artifact_id}/approve', () => {

    test('TC-UML-13: Approve non-existent artifact → 404', async () => {
      const res = await apiClient.post(
        '/api/artifacts/999999/approve',
        {},
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(404);
    });

    test('TC-UML-14: Approve artifact without auth → 401 or 403', async () => {
      const res = await apiClient.post('/api/artifacts/1/approve', {});
      expect([401, 403]).toContain(res.status);
    });

  });

  // ----------------------------------------------------------
  //  GET /api/artifacts/{artifact_id}/download
  // ----------------------------------------------------------
  describe('GET /api/artifacts/{artifact_id}/download', () => {

    test('TC-UML-15: Download non-existent artifact → 404', async () => {
      const res = await apiClient.get('/api/artifacts/999999/download');
      expect(res.status).toBe(404);
    });

  });

});
