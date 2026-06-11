// ============================================================
//  POJO Models — Projects Module
//  Maps to: /api/projects/*
// ============================================================

/**
 * Request body for POST /api/projects
 */
class ProjectCreateRequest {
  constructor(name, description, domain, managerEmail = null) {
    this.name        = name;
    this.description = description;
    this.domain      = domain;
    if (managerEmail) this.manager_email = managerEmail;
  }
}

/**
 * Response shape for project endpoints
 */
class ProjectResponse {
  constructor(data) {
    this.id             = data.id;
    this.name           = data.name;
    this.description    = data.description;
    this.domain         = data.domain;
    this.created_at     = data.created_at;
    this.project_status = data.project_status;
  }
}

/**
 * Request body for POST /api/projects/:id/add-participant (join/invite)
 */
class JoinRequest {
  constructor(projectId, projectDomain = null) {
    this.project_id     = projectId;
    this.project_domain = projectDomain;
  }
}

module.exports = { ProjectCreateRequest, ProjectResponse, JoinRequest };
