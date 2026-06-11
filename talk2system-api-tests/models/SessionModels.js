// ============================================================
//  POJO Models — Sessions Module
//  Maps to: /api/sessions/*
// ============================================================

/**
 * Request body for POST /api/sessions/project/:project_id
 */
class SessionCreateRequest {
  constructor(title, participantIds = []) {
    this.title           = title;
    this.participant_ids = participantIds;
  }
}

/**
 * Response shape for session endpoints
 */
class SessionResponse {
  constructor(data) {
    this.id              = data.id;
    this.title           = data.title;
    this.project_id      = data.project_id;
    this.status          = data.status;
    this.audio_file_path = data.audio_file_path;
    this.transcript_text = data.transcript_text;
    this.created_at      = data.created_at;
  }
}

/**
 * Response shape for GET /api/sessions/:session_id/members
 */
class SessionMemberResponse {
  constructor(data) {
    this.id          = data.id;
    this.session_id  = data.session_id;
    this.user_id     = data.user_id;
    this.role        = data.role;
    this.email       = data.email;
    this.full_name   = data.full_name;
    this.joined_at   = data.joined_at;
    this.user_status = data.user_status;
  }
}

module.exports = { SessionCreateRequest, SessionResponse, SessionMemberResponse };
