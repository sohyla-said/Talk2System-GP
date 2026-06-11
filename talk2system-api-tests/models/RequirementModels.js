// ============================================================
//  POJO Models — Requirements Module
//  Maps to: POST /api/projects/{project_id}/session/{session_id}/extract-requirements-async
//           GET  /api/sessions/extraction-tasks/{task_id}/status
//           GET  /api/sessions/{session_id}/extraction-tasks/latest
//           GET  /api/sessions/requirements/comparison
//           POST /api/projects/{project_id}/session/{session_id}/choose-requirements
//           GET  /api/projects/{project_id}/requirements
//           GET  /api/projects/{project_id}/requirements/versions
//           GET  /api/projects/requirements/{requirement_id}
//           PUT  /api/projects/requirements/{requirement_id}
//           PATCH /api/projects/requirements/{requirement_id}/approve
// ============================================================

/**
 * Request body for POST .../extract-requirements-async
 * engine: 'llm' | 'hybrid' | 'gemini'
 */
class AsyncExtractRequest {
  constructor(transcript, engine = 'llm') {
    this.transcript = transcript;
    this.engine     = engine;
  }
}

/**
 * Response shape for POST .../extract-requirements-async
 */
class ExtractionTaskResponse {
  constructor(data) {
    this.task_id = data.task_id;
    this.status  = data.status;
  }
}

/**
 * Response shape for GET /api/sessions/extraction-tasks/{task_id}/status
 */
class ExtractionTaskStatusResponse {
  constructor(data) {
    this.task_id       = data.task_id;
    this.status        = data.status;        // pending | in_progress | done | failed
    this.task_type     = data.task_type;
    this.session_id    = data.session_id;
    this.project_id    = data.project_id;
    this.task_output   = data.task_output;
    this.error_message = data.error_message;
  }
}

/**
 * Response shape for GET /api/projects/{project_id}/requirements
 */
class ProjectRequirementResponse {
  constructor(data) {
    this.id              = data.id;
    this.project_id      = data.project_id;
    this.version         = data.version;
    this.data            = data.data;
    this.approval_status = data.approval_status;
    this.created_at      = data.created_at;
  }
}

/**
 * Request body for POST .../choose-requirements
 */
class ChooseRequirementRequest {
  constructor(requirementsJson, srcRunId) {
    this.requirements_json = requirementsJson;
    this.src_run_id        = srcRunId;
  }
}

/**
 * Request body for PUT /api/projects/requirements/{requirement_id}
 */
class UpdateRequirementsRequest {
  constructor(grouped) {
    this.grouped = grouped;
  }
}

module.exports = {
  AsyncExtractRequest,
  ExtractionTaskResponse,
  ExtractionTaskStatusResponse,
  ProjectRequirementResponse,
  ChooseRequirementRequest,
  UpdateRequirementsRequest,
};
