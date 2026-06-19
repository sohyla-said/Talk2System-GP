require('dotenv').config();
const apiClient                                          = require('../../config/apiClient');
const { SessionCreateRequest, SessionResponse,
        SessionMemberResponse }                          = require('../../models/SessionModels');
const { getManagerToken, getUserToken, authHeader }      = require('../../helpers/authHelper');

// ============================================================
//  Sessions Module Tests
//  Endpoints: POST /api/sessions/project/:project_id
//             GET  /api/sessions/project/:project_id
//             GET  /api/sessions/:session_id
//             GET  /api/sessions/:session_id/members
// ============================================================

let managerToken;
let userToken;
let createdSessionId;

const PROJECT_ID = parseInt(process.env.TEST_PROJECT_ID, 10);

beforeAll(async () => {
  managerToken = await getManagerToken();
  userToken    = await getUserToken();
});

describe('Sessions Module — /api/sessions', () => {

  // ----------------------------------------------------------
  //  POST /api/sessions/project/:project_id — Create Session
  // ----------------------------------------------------------
  describe('POST /api/sessions/project/:project_id', () => {

    test('TC-SESS-01: Project manager creates a session with valid token', async () => {
      const body = new SessionCreateRequest('POJO Automated Session', []);
      const res  = await apiClient.post(`/api/sessions/project/${PROJECT_ID}`, body, {
        headers: authHeader(managerToken)
      });
      expect(res.status).toBe(200);

      const session = new SessionResponse(res.data);
      expect(session.id).toBeDefined();
      expect(session.project_id).toBe(PROJECT_ID);
      expect(session.status).toBeDefined();

      createdSessionId = session.id;
    });

    // Regression test for the TC-13 vulnerability (see README): endpoint previously
    // accepted unauthenticated requests. Backend now enforces auth — must stay 401/403.
    test('TC-SESS-02 [SECURITY]: Session creation without token is rejected (401/403)', async () => {
      const body = new SessionCreateRequest('Unauthorized Session Attempt', []);
      const res  = await apiClient.post(`/api/sessions/project/${PROJECT_ID}`, body);
      expect([401, 403]).toContain(res.status);
    });

    // Backend enforces project_manager role for session creation — participants get 403.
    test('TC-SESS-03: Participant role cannot create a session (403)', async () => {
      const body = new SessionCreateRequest('Participant Attempt Session', []);
      const res  = await apiClient.post(`/api/sessions/project/${PROJECT_ID}`, body, {
        headers: authHeader(userToken)
      });
      expect(res.status).toBe(403);
    });

    test('TC-SESS-04: Missing title field returns 4xx', async () => {
      const res = await apiClient.post(`/api/sessions/project/${PROJECT_ID}`,
        { participant_ids: [] },
        { headers: authHeader(managerToken) }
      );
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    // ⚠️  Backend returns 500 (unhandled FK violation) instead of 404
    test('TC-SESS-05: Non-existent project ID returns an error', async () => {
      const body = new SessionCreateRequest('Ghost Project Session', []);
      const res  = await apiClient.post('/api/sessions/project/999999', body, {
        headers: authHeader(managerToken)
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

  });

  // ----------------------------------------------------------
  //  GET /api/sessions/project/:project_id — List Sessions
  // ----------------------------------------------------------
  describe('GET /api/sessions/project/:project_id', () => {

    test('TC-SESS-06: Authenticated user gets session list for a project', async () => {
      // Small delay to allow the server to recover after TC-SESS-05's 500 error
      await new Promise(r => setTimeout(r, 500));
      const res = await apiClient.get(`/api/sessions/project/${PROJECT_ID}`, {
        headers: authHeader(managerToken)
      });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
    });

    // Backend enforces auth on the list endpoint — unauthenticated requests are rejected.
    test('TC-SESS-07: Unauthenticated request is rejected (401/403)', async () => {
      const res = await apiClient.get(`/api/sessions/project/${PROJECT_ID}`);
      expect([401, 403]).toContain(res.status);
    });

  });

  // ----------------------------------------------------------
  //  GET /api/sessions/:session_id — Get Single Session
  // ----------------------------------------------------------
  describe('GET /api/sessions/:session_id', () => {

    test('TC-SESS-08: Get session by valid ID returns correct session', async () => {
      expect(createdSessionId).toBeDefined();

      const res = await apiClient.get(`/api/sessions/${createdSessionId}`, {
        headers: authHeader(managerToken)
      });
      expect(res.status).toBe(200);

      const session = new SessionResponse(res.data);
      expect(session.id).toBe(createdSessionId);
      expect(session.project_id).toBe(PROJECT_ID);
    });

    test('TC-SESS-09: Get session with non-existent ID returns 404', async () => {
      const res = await apiClient.get('/api/sessions/999999', {
        headers: authHeader(managerToken)
      });
      expect(res.status).toBe(404);
    });

  });

  // ----------------------------------------------------------
  //  GET /api/sessions/:session_id/members — Get Session Members
  // ----------------------------------------------------------
  describe('GET /api/sessions/:session_id/members', () => {

    test('TC-SESS-10: Session member can retrieve the members list', async () => {
      expect(createdSessionId).toBeDefined();

      const res = await apiClient.get(`/api/sessions/${createdSessionId}/members`, {
        headers: authHeader(managerToken)
      });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);

      if (res.data.length > 0) {
        const member = new SessionMemberResponse(res.data[0]);
        expect(member.user_id).toBeDefined();
        expect(member.role).toBeDefined();
        expect(member.email).toBeDefined();
      }
    });

    test('TC-SESS-11: Non-member cannot retrieve the session members list (403)', async () => {
      expect(createdSessionId).toBeDefined();

      const res = await apiClient.get(`/api/sessions/${createdSessionId}/members`, {
        headers: authHeader(userToken)
      });
      // userToken is a participant not added to this session
      expect([403, 404]).toContain(res.status);
    });

    test('TC-SESS-12: Unauthenticated request returns 401 or 403', async () => {
      expect(createdSessionId).toBeDefined();

      const res = await apiClient.get(`/api/sessions/${createdSessionId}/members`);
      expect([401, 403]).toContain(res.status);
    });

  });

});
