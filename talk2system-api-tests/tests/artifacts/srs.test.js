require('dotenv').config();
const apiClient = require('../../config/apiClient');
const {
  SrsTaskStatusResponse,
  ArtifactVersionsResponse,
} = require('../../models/ArtifactModels');
const { getManagerToken, authHeader } = require('../../helpers/authHelper');

// ============================================================
//  SRS Generation Module Tests
//  Endpoints: POST /api/projects/{project_id}/sessions/{session_id}/generate-srs-async
//             GET  /api/srs-tasks/{task_id}/status
//             GET  /api/projects/{project_id}/sessions/{session_id}/srs/versions
//             GET  /api/projects/{project_id}/srs/versions
//             GET  /api/artifacts/{artifact_id}/srs-text
//             GET  /api/artifacts/{artifact_id}/download-srs
// ============================================================

// SUPPORTED_FORMATS (from backend srs_service.py): ieee_830 | iso_iec_29148 | modern_agile

const PROJECT_ID = parseInt(process.env.TEST_PROJECT_ID);

let managerToken;
let sessionId;  // created in beforeAll — always belongs to PROJECT_ID
let srsTaskId;  // captured from TC-SRS-01, reused in polling tests

beforeAll(async () => {
  managerToken = await getManagerToken();

  // Create a session that belongs to PROJECT_ID to avoid FK violations
  const res = await apiClient.post(
    `/api/projects/${PROJECT_ID}/UploadTranscript`,
    {
      transcript: 'Speaker A: We need a login module.\nSpeaker B: Also a reporting dashboard.',
      title: `SRS-Test Session ${Date.now()}`,
    },
    { headers: authHeader(managerToken) }
  );
  if (res.status === 200) {
    sessionId = res.data.session_id;
  }
});

describe('SRS Generation Module — /api/projects/.../generate-srs-async', () => {

  // ----------------------------------------------------------
  //  POST /api/projects/{project_id}/sessions/{session_id}/generate-srs-async
  //  format_version is a query parameter
  // ----------------------------------------------------------
  describe('POST .../generate-srs-async', () => {

    test('TC-SRS-01: Start async SRS generation (ieee_830) with valid auth → 200 with task_id', async () => {
      expect(sessionId).toBeDefined(); // depends on beforeAll session creation
      const res = await apiClient.post(
        `/api/projects/${PROJECT_ID}/sessions/${sessionId}/generate-srs-async?format_version=ieee_830`,
        {},
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(200);
      expect(res.data.task_id).toBeDefined();
      expect(res.data.status).toBe('pending');

      srsTaskId = res.data.task_id;
    });

    test('TC-SRS-02: Start async SRS generation without auth → 401 or 403', async () => {
      const res = await apiClient.post(
        `/api/projects/${PROJECT_ID}/sessions/${sessionId}/generate-srs-async?format_version=ieee_830`,
        {}
      );
      expect([401, 403]).toContain(res.status);
    });

    test('TC-SRS-03: Start async SRS generation with invalid format_version → 400', async () => {
      const res = await apiClient.post(
        `/api/projects/${PROJECT_ID}/sessions/${sessionId}/generate-srs-async?format_version=invalid_format`,
        {},
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(400);
    });

    test('TC-SRS-04: Start async SRS generation (iso_iec_29148) → 200', async () => {
      const res = await apiClient.post(
        `/api/projects/${PROJECT_ID}/sessions/${sessionId}/generate-srs-async?format_version=iso_iec_29148`,
        {},
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(200);
      expect(res.data.task_id).toBeDefined();
    });

    test('TC-SRS-05: Start async SRS generation (modern_agile) → 200', async () => {
      const res = await apiClient.post(
        `/api/projects/${PROJECT_ID}/sessions/${sessionId}/generate-srs-async?format_version=modern_agile`,
        {},
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(200);
      expect(res.data.task_id).toBeDefined();
    });

    test('TC-SRS-06: Start async project-level SRS generation → 200', async () => {
      const res = await apiClient.post(
        `/api/projects/${PROJECT_ID}/generate-srs-async?format_version=ieee_830`,
        {},
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(200);
      expect(res.data.task_id).toBeDefined();
    });

    test('TC-SRS-07: Start project-level SRS with invalid format → 400', async () => {
      const res = await apiClient.post(
        `/api/projects/${PROJECT_ID}/generate-srs-async?format_version=bad_format`,
        {},
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(400);
    });

  });

  // ----------------------------------------------------------
  //  GET /api/srs-tasks/{task_id}/status
  // ----------------------------------------------------------
  describe('GET /api/srs-tasks/{task_id}/status', () => {

    test('TC-SRS-08: Poll SRS task status for created task → 200 with correct fields', async () => {
      expect(srsTaskId).toBeDefined();

      const res  = await apiClient.get(
        `/api/srs-tasks/${srsTaskId}/status`,
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(200);

      const task = new SrsTaskStatusResponse(res.data);
      expect(task.task_id).toBe(srsTaskId);
      expect(['pending', 'in_progress', 'done', 'failed']).toContain(task.status);
      expect(task.task_type).toBe('generate_srs');
      expect(task.project_id).toBe(PROJECT_ID);
    });

    test('TC-SRS-09: Poll non-existent SRS task → 404', async () => {
      const res = await apiClient.get(
        '/api/srs-tasks/999999/status',
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(404);
    });

    test('TC-SRS-10: Poll SRS task without auth → 401 or 403', async () => {
      const res = await apiClient.get('/api/srs-tasks/1/status');
      expect([401, 403]).toContain(res.status);
    });

  });

  // ----------------------------------------------------------
  //  GET /api/projects/{project_id}/sessions/{session_id}/srs/versions
  // ----------------------------------------------------------
  describe('GET .../srs/versions', () => {

    test('TC-SRS-11: Get SRS versions for session → 200 with versions array', async () => {
      const res = await apiClient.get(
        `/api/projects/${PROJECT_ID}/sessions/${sessionId}/srs/versions`
      );
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.versions)).toBe(true);
    });

    test('TC-SRS-12: Get SRS versions for project (aggregated) → 200 with versions array', async () => {
      const res = await apiClient.get(`/api/projects/${PROJECT_ID}/srs/versions`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.versions)).toBe(true);
    });

  });

  // ----------------------------------------------------------
  //  GET /api/artifacts/{artifact_id}/srs-text
  // ----------------------------------------------------------
  describe('GET /api/artifacts/{artifact_id}/srs-text', () => {

    test('TC-SRS-13: Get SRS text for non-existent artifact → 404', async () => {
      const res = await apiClient.get('/api/artifacts/999999/srs-text');
      expect(res.status).toBe(404);
    });

  });

  // ----------------------------------------------------------
  //  GET /api/artifacts/{artifact_id}/download-srs
  // ----------------------------------------------------------
  describe('GET /api/artifacts/{artifact_id}/download-srs', () => {

    test('TC-SRS-14: Download SRS for non-existent artifact → 404', async () => {
      const res = await apiClient.get('/api/artifacts/999999/download-srs');
      expect(res.status).toBe(404);
    });

  });

});
