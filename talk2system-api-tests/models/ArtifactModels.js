// ============================================================
//  POJO Models — Artifact Module (UML & SRS)
//  Maps to: POST /api/projects/{project_id}/sessions/{session_id}/generate-uml-async
//           GET  /api/uml-tasks/{task_id}/status
//           POST /api/projects/{project_id}/sessions/{session_id}/generate-srs-async
//           GET  /api/srs-tasks/{task_id}/status
//           GET  /api/projects/{project_id}/sessions/{session_id}/artifacts/{type}/versions
//           GET  /api/projects/{project_id}/artifacts/{type}/versions
//           GET  /api/projects/{project_id}/sessions/{session_id}/srs/versions
//           GET  /api/projects/{project_id}/srs/versions
//           POST /api/artifacts/{artifact_id}/approve
//           GET  /api/artifacts/{artifact_id}
//           GET  /api/artifacts/{artifact_id}/download
//           GET  /api/artifacts/{artifact_id}/srs-text
//           GET  /api/artifacts/{artifact_id}/download-srs
// ============================================================

/**
 * Request body for POST .../generate-uml-async
 * diagramType: 'usecase' | 'class' | 'sequence'
 * source: 'session' | 'project'
 */
class AsyncUmlRequest {
  constructor(diagramType, source = 'session') {
    this.diagram_type = diagramType;
    this.source       = source;
  }
}

/**
 * Response shape for POST .../generate-uml-async
 */
class UmlTaskResponse {
  constructor(data) {
    this.task_id = data.task_id;
    this.status  = data.status;
  }
}

/**
 * Response shape for GET /api/uml-tasks/{task_id}/status
 */
class UmlTaskStatusResponse {
  constructor(data) {
    this.task_id       = data.task_id;
    this.status        = data.status;        // pending | in_progress | done | failed
    this.task_type     = data.task_type;
    this.project_id    = data.project_id;
    this.session_id    = data.session_id;
    this.task_output   = data.task_output;
    this.error_message = data.error_message;
  }
}

/**
 * Response shape for GET /api/srs-tasks/{task_id}/status
 */
class SrsTaskStatusResponse {
  constructor(data) {
    this.task_id       = data.task_id;
    this.status        = data.status;        // pending | in_progress | done | failed
    this.task_type     = data.task_type;
    this.project_id    = data.project_id;
    this.session_id    = data.session_id;
    this.task_output   = data.task_output;
    this.error_message = data.error_message;
  }
}

/**
 * Response shape for GET .../artifacts/{type}/versions
 */
class ArtifactVersionsResponse {
  constructor(data) {
    this.project_id = data.project_id;
    this.versions   = data.versions; // array of {id, version, approval_status, created_at, file_path}
  }
}

/**
 * Response shape for GET /api/artifacts/{artifact_id}
 */
class ArtifactResponse {
  constructor(data) {
    this.id              = data.id;
    this.project_id      = data.project_id;
    this.session_id      = data.session_id;
    this.file_path       = data.file_path;
    this.version         = data.version;
    this.approval_status = data.approval_status;
    this.created_at      = data.created_at;
  }
}

module.exports = {
  AsyncUmlRequest,
  UmlTaskResponse,
  UmlTaskStatusResponse,
  SrsTaskStatusResponse,
  ArtifactVersionsResponse,
  ArtifactResponse,
};
