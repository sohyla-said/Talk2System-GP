require('dotenv').config();
const apiClient = require('../../config/apiClient');
const {
  TranscriptUploadRequest,
  TranscriptUploadResponse,
  TranscriptResponse,
  SegmentUpdateRequest,
  SegmentDeleteRequest,
} = require('../../models/TranscriptionModels');
const { getManagerToken, authHeader } = require('../../helpers/authHelper');

// ============================================================
//  Transcription Module Tests
//  Endpoints: POST   /api/projects/{project_id}/UploadTranscript
//             GET    /api/sessions/{session_id}/transcript
//             PATCH  /api/sessions/{session_id}/transcript/segment
//             DELETE /api/sessions/{session_id}/transcript/segments
//             PATCH  /api/sessions/{session_id}/transcript/approve
// ============================================================

const PROJECT_ID = parseInt(process.env.TEST_PROJECT_ID);

let managerToken;
let uploadedSessionId; // set in beforeAll, reused across tests

beforeAll(async () => {
  managerToken = await getManagerToken();

  // Create a dedicated session for segment/approve tests
  const body = new TranscriptUploadRequest(
    'Speaker A: Hello, welcome to our planning session.\nSpeaker B: Thank you. Let us discuss the system requirements.',
    `Auto-Test Transcript ${Date.now()}`
  );
  const res = await apiClient.post(
    `/api/projects/${PROJECT_ID}/UploadTranscript`,
    body,
    { headers: authHeader(managerToken) }
  );
  if (res.status === 200) {
    uploadedSessionId = res.data.session_id;
  }
});

describe('Transcription Module — /api/projects & /api/sessions', () => {

  // ----------------------------------------------------------
  //  POST /api/projects/{project_id}/UploadTranscript
  // ----------------------------------------------------------
  describe('POST /api/projects/{project_id}/UploadTranscript', () => {

    test('TC-TRANS-01: Authenticated user uploads a text transcript → 200 with session_id', async () => {
      const body = new TranscriptUploadRequest(
        'Speaker A: We need a login feature.\nSpeaker B: Agreed, and also an admin panel.',
        `Transcript Upload Test ${Date.now()}`
      );
      const res = await apiClient.post(
        `/api/projects/${PROJECT_ID}/UploadTranscript`,
        body,
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(200);

      const data = new TranscriptUploadResponse(res.data);
      expect(data.session_id).toBeDefined();
      expect(data.project_id).toBe(PROJECT_ID);
      expect(typeof data.transcript).toBe('string');
    });

    test('TC-TRANS-02: Upload transcript without auth → 401 or 403', async () => {
      const body = new TranscriptUploadRequest('Some text', 'No Auth Session');
      const res  = await apiClient.post(
        `/api/projects/${PROJECT_ID}/UploadTranscript`,
        body
      );
      expect([401, 403]).toContain(res.status);
    });

    test('TC-TRANS-03: Upload transcript with missing "transcript" field → 4xx', async () => {
      const res = await apiClient.post(
        `/api/projects/${PROJECT_ID}/UploadTranscript`,
        { title: 'No Transcript Body' },
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    test('TC-TRANS-04: Upload transcript to non-existent project → 404', async () => {
      const body = new TranscriptUploadRequest('Text for missing project', 'Missing Project Session');
      const res  = await apiClient.post(
        '/api/projects/999999/UploadTranscript',
        body,
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(404);
    });

  });

  // ----------------------------------------------------------
  //  GET /api/sessions/{session_id}/transcript
  // ----------------------------------------------------------
  describe('GET /api/sessions/{session_id}/transcript', () => {

    test('TC-TRANS-05: Get transcript for an uploaded session → 200 with transcript array', async () => {
      expect(uploadedSessionId).toBeDefined();

      const res  = await apiClient.get(`/api/sessions/${uploadedSessionId}/transcript`);
      expect(res.status).toBe(200);

      const data = new TranscriptResponse(res.data);
      expect(data.session_id).toBe(uploadedSessionId);
      expect(data.project_id).toBe(PROJECT_ID);
      expect(Array.isArray(data.transcript)).toBe(true);
      expect(data.approval_status).toBeDefined();
    });

    test('TC-TRANS-06: Get transcript for non-existent session → 404', async () => {
      const res = await apiClient.get('/api/sessions/999999/transcript');
      expect(res.status).toBe(404);
    });

  });

  // ----------------------------------------------------------
  //  PATCH /api/sessions/{session_id}/transcript/segment
  // ----------------------------------------------------------
  describe('PATCH /api/sessions/{session_id}/transcript/segment', () => {

    test('TC-TRANS-07: Edit segment index 0 with valid auth → 200 with ok: true', async () => {
      expect(uploadedSessionId).toBeDefined();

      const payload = new SegmentUpdateRequest(0, 'Speaker A', 'Updated text for segment zero.');
      const res     = await apiClient.patch(
        `/api/sessions/${uploadedSessionId}/transcript/segment`,
        payload,
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(200);
      expect(res.data.ok).toBe(true);
      expect(res.data.segment_index).toBe(0);
    });

    test('TC-TRANS-08: Edit segment without auth → 401 or 403', async () => {
      expect(uploadedSessionId).toBeDefined();

      const payload = new SegmentUpdateRequest(0, 'Speaker A', 'Unauthorized edit attempt.');
      const res     = await apiClient.patch(
        `/api/sessions/${uploadedSessionId}/transcript/segment`,
        payload
      );
      expect([401, 403]).toContain(res.status);
    });

    test('TC-TRANS-09: Edit segment with out-of-bounds index → 404', async () => {
      expect(uploadedSessionId).toBeDefined();

      const payload = new SegmentUpdateRequest(9999, 'Speaker X', 'Nonexistent segment.');
      const res     = await apiClient.patch(
        `/api/sessions/${uploadedSessionId}/transcript/segment`,
        payload,
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(404);
    });

  });

  // ----------------------------------------------------------
  //  DELETE /api/sessions/{session_id}/transcript/segments
  // ----------------------------------------------------------
  describe('DELETE /api/sessions/{session_id}/transcript/segments', () => {

    test('TC-TRANS-10: Delete last transcript segment with valid auth → 200 with ok: true', async () => {
      expect(uploadedSessionId).toBeDefined();

      // Fetch current segments to get a valid last index
      const transcriptRes  = await apiClient.get(`/api/sessions/${uploadedSessionId}/transcript`);
      const totalSegments  = transcriptRes.data.transcript.length;

      if (totalSegments < 2) {
        // Skip destructive delete if only one segment remains (needed for approve test)
        return;
      }

      const payload = new SegmentDeleteRequest([totalSegments - 1]);
      const res     = await apiClient.delete(
        `/api/sessions/${uploadedSessionId}/transcript/segments`,
        { data: payload, headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(200);
      expect(res.data.ok).toBe(true);
    });

    test('TC-TRANS-11: Delete segments without auth → 401 or 403', async () => {
      expect(uploadedSessionId).toBeDefined();

      const payload = new SegmentDeleteRequest([0]);
      const res     = await apiClient.delete(
        `/api/sessions/${uploadedSessionId}/transcript/segments`,
        { data: payload }
      );
      expect([401, 403]).toContain(res.status);
    });

  });

  // ----------------------------------------------------------
  //  PATCH /api/sessions/{session_id}/transcript/approve
  // ----------------------------------------------------------
  describe('PATCH /api/sessions/{session_id}/transcript/approve', () => {

    test('TC-TRANS-12: Approve transcript with valid auth → 200 with approval_status: approved', async () => {
      expect(uploadedSessionId).toBeDefined();

      const res = await apiClient.patch(
        `/api/sessions/${uploadedSessionId}/transcript/approve`,
        {},
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(200);
      expect(res.data.approval_status).toBe('approved');
      expect(res.data.session_id).toBe(uploadedSessionId);
    });

    test('TC-TRANS-13: Re-approving an already approved transcript → 400', async () => {
      expect(uploadedSessionId).toBeDefined();

      // TC-TRANS-12 already approved this session; second attempt must fail
      const res = await apiClient.patch(
        `/api/sessions/${uploadedSessionId}/transcript/approve`,
        {},
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBe(400);
    });

    test('TC-TRANS-14: Approve transcript without auth → 401 or 403', async () => {
      const res = await apiClient.patch(
        `/api/sessions/${uploadedSessionId}/transcript/approve`,
        {}
      );
      expect([401, 403]).toContain(res.status);
    });

  });

});
