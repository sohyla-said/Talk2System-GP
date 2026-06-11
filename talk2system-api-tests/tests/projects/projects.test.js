require('dotenv').config();
const apiClient                                        = require('../../config/apiClient');
const { ProjectCreateRequest, ProjectResponse }        = require('../../models/ProjectModels');
const { getManagerToken, getUserToken, authHeader }    = require('../../helpers/authHelper');

// ============================================================
//  Projects Module Tests
//  Endpoints: POST   /api/projects
//             GET    /api/projects
//             GET    /api/projects/:id
//             DELETE /api/projects/:id
// ============================================================

let managerToken;
let userToken;
let createdProjectId;

beforeAll(async () => {
  managerToken = await getManagerToken();
  userToken    = await getUserToken();
});

describe('Projects Module — /api/projects', () => {

  // ----------------------------------------------------------
  //  POST /api/projects — Create Project
  // ----------------------------------------------------------
  describe('POST /api/projects', () => {

    test('TC-PROJ-01: Project manager creates a project successfully', async () => {
      const body = new ProjectCreateRequest(
        `POJO Test Project ${Date.now()}`,
        'Created by the automated POJO test framework',
        'Software Engineering'
      );
      const res = await apiClient.post('/api/projects/createproject', body, {
        headers: authHeader(managerToken)
      });
      expect(res.status).toBe(201);

      const project = new ProjectResponse(res.data);
      expect(project.id).toBeDefined();
      expect(project.name).toContain('POJO Test Project');
      expect(project.domain).toBe('Software Engineering');
      expect(project.project_status).toBeDefined();

      createdProjectId = project.id; // store for subsequent tests
    });

    test('TC-PROJ-02: Unauthenticated request is rejected (401 or 403)', async () => {
      const body = new ProjectCreateRequest('No Auth Project', 'desc', 'IT');
      const res  = await apiClient.post('/api/projects/createproject', body);
      expect([401, 403]).toContain(res.status);
    });

    test('TC-PROJ-03: Missing required field "name" returns 4xx', async () => {
      const body = { description: 'No name', domain: 'IT' };
      const res  = await apiClient.post('/api/projects/createproject', body, {
        headers: authHeader(managerToken)
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    test('TC-PROJ-04: Missing required field "domain" returns 4xx', async () => {
      const body = { name: 'No Domain Project', description: 'test' };
      const res  = await apiClient.post('/api/projects/createproject', body, {
        headers: authHeader(managerToken)
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

  });

  // ----------------------------------------------------------
  //  GET /api/projects — List Projects
  // ----------------------------------------------------------
  describe('GET /api/projects', () => {

    test('TC-PROJ-05: Authenticated user gets a list of projects', async () => {
      const res = await apiClient.get('/api/projects/getprojects', {
        headers: authHeader(managerToken)
      });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
    });

    test('TC-PROJ-06: Unauthenticated request returns 401 or 403', async () => {
      const res = await apiClient.get('/api/projects/getprojects');
      expect([401, 403]).toContain(res.status);
    });

  });

  // ----------------------------------------------------------
  //  GET /api/projects/:id — Get Specific Project
  // ----------------------------------------------------------
  describe('GET /api/projects/:id', () => {

    test('TC-PROJ-07: Get project by valid ID returns correct project', async () => {
      expect(createdProjectId).toBeDefined(); // depends on TC-PROJ-01

      const res = await apiClient.get(`/api/projects/getproject/${createdProjectId}`, {
        headers: authHeader(managerToken)
      });
      expect(res.status).toBe(200);

      const project = new ProjectResponse(res.data);
      expect(project.id).toBe(createdProjectId);
    });

    test('TC-PROJ-08: Get project with non-existent ID returns 404', async () => {
      const res = await apiClient.get('/api/projects/getproject/999999', {
        headers: authHeader(managerToken)
      });
      expect(res.status).toBe(404);
    });

  });

  // ----------------------------------------------------------
  //  DELETE /api/projects/:id — Delete Project
  // ----------------------------------------------------------
  describe('DELETE /api/projects/:id', () => {

    test('TC-PROJ-09: Participant cannot delete a project (403)', async () => {
      expect(createdProjectId).toBeDefined();

      const res = await apiClient.delete(`/api/projects/deleteproject/${createdProjectId}`, {
        headers: authHeader(userToken)
      });
      // Participants must not be allowed to delete
      expect([403, 404]).toContain(res.status);
    });

    test('TC-PROJ-10: Project manager can delete their own project', async () => {
      expect(createdProjectId).toBeDefined();

      const res = await apiClient.delete(`/api/projects/deleteproject/${createdProjectId}`, {
        headers: authHeader(managerToken)
      });
      expect([200, 204]).toContain(res.status);
    });

    test('TC-PROJ-11: Deleting already-deleted project returns 404 or 403', async () => {
      expect(createdProjectId).toBeDefined();

      const res = await apiClient.delete(`/api/projects/deleteproject/${createdProjectId}`, {
        headers: authHeader(managerToken)
      });
      // Backend deletes memberships along with the project, so the membership
      // check fires before the 404 check, returning 403 instead of 404.
      expect([403, 404]).toContain(res.status);
    });

  });

});
