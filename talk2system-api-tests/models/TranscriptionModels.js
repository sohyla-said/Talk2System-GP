// ============================================================
//  POJO Models — Transcription Module
//  Maps to: POST /api/projects/{project_id}/UploadTranscript
//           GET  /api/sessions/{session_id}/transcript
//           PATCH /api/sessions/{session_id}/transcript/segment
//           DELETE /api/sessions/{session_id}/transcript/segments
//           PATCH /api/sessions/{session_id}/transcript/approve
// ============================================================

/**
 * Request body for POST /api/projects/{project_id}/UploadTranscript
 */
class TranscriptUploadRequest {
  constructor(transcript, title = null, participantIds = null) {
    this.transcript = transcript;
    if (title !== null) this.title = title;
    if (participantIds !== null) this.participant_ids = participantIds;
  }
}

/**
 * Response shape for POST /api/projects/{project_id}/UploadTranscript
 */
class TranscriptUploadResponse {
  constructor(data) {
    this.session_id        = data.session_id;
    this.project_id        = data.project_id;
    this.transcript        = data.transcript;
    this.detected_language = data.detected_language;
  }
}

/**
 * Response shape for GET /api/sessions/{session_id}/transcript
 */
class TranscriptResponse {
  constructor(data) {
    this.session_id        = data.session_id;
    this.project_id        = data.project_id;
    this.title             = data.title;
    this.approval_status   = data.approval_status;
    this.detected_language = data.detected_language;
    this.transcript        = data.transcript; // array of segment objects
  }
}

/**
 * Request body for PATCH /api/sessions/{session_id}/transcript/segment
 */
class SegmentUpdateRequest {
  constructor(segmentIndex, speaker, text) {
    this.segment_index = segmentIndex;
    this.speaker       = speaker;
    this.text          = text;
  }
}

/**
 * Request body for DELETE /api/sessions/{session_id}/transcript/segments
 */
class SegmentDeleteRequest {
  constructor(segmentIndices) {
    this.segment_indices = segmentIndices;
  }
}

module.exports = {
  TranscriptUploadRequest,
  TranscriptUploadResponse,
  TranscriptResponse,
  SegmentUpdateRequest,
  SegmentDeleteRequest,
};
