/**
 * Resolves and executes navigation for a notification click.
 * For requirements_extracted_both, fetches task_output from the DB first
 * so the choice page receives full extraction state.
 * For all other types, navigates synchronously.
 */
export async function handleNotificationNav(notif, navigate, getToken) {
  const { notification_type, project_id, message ,session_id } = notif;

  // Extract session_id from message suffix "[session_id:123]"
  const sessionMatch = message?.match(/\[session_id:(\d+)\]/);
  const sessionId = sessionMatch ? parseInt(sessionMatch[1], 10) : null;
  const hybridMatch = message?.match(/\[hybrid_run_id:(\d+)\]/);
  const llmMatch    = message?.match(/\[llm_run_id:(\d+)\]/);
  const hybridRunId = hybridMatch ? parseInt(hybridMatch[1], 10) : null;
  const llmRunId    = llmMatch    ? parseInt(llmMatch[1],    10) : null;

  if (
    notification_type === "transcription_done" ||
    notification_type === "translation_done"
  ) {
    if (session_id) {
      navigate(`/transcript/${session_id}`);  // ← navigate using the column value
      return;
    }
  }
  // ── Single-engine success: requirements view ──────────────────────────────
  if (notification_type === "requirements_extracted" && sessionId && project_id) {
    navigate(`/transcript/${sessionId}/requirements`, {
      state: { projectId: project_id },
    });
    return;
  }

  // ── Both-engine success: fetch task_output then go to choice page ─────────
  if (notification_type === "requirements_extracted_both" && sessionId && hybridRunId && llmRunId) {
    navigate(`/transcript/${sessionId}/requirements/choice`, {
      state: { projectId: project_id, hybridRunId, llmRunId },
    });
    return;
    // Fallback if fetch fails: go to transcript so user can re-trigger
    // navigate(`/transcript/${sessionId}`);
    // return;
  }

  // ── Failure: back to transcript to retry ─────────────────────────────────
  if (notification_type === "requirements_extraction_failed" && sessionId) {
    navigate(`/transcript/${sessionId}`);
    return;
  }

  // ── All existing notification types: project page (unchanged behaviour) ───
  if (project_id) {
    navigate(`/projects/${project_id}`);
  }
}