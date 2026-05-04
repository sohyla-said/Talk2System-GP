/**
 * Resolves and executes navigation for a notification click.
 * For requirements_extracted_both, fetches task_output from the DB first
 * so the choice page receives full extraction state.
 * For all other types, navigates synchronously.
 */
export async function handleNotificationNav(notif, navigate, getToken) {
  const { notification_type, project_id, message } = notif;

  // Extract session_id from message suffix "[session_id:123]"
  const sessionMatch = message?.match(/\[session_id:(\d+)\]/);
  const sessionId = sessionMatch ? parseInt(sessionMatch[1], 10) : null;

  // ── Single-engine success: requirements view ──────────────────────────────
  if (notification_type === "requirements_extracted" && sessionId && project_id) {
    navigate(`/transcript/${sessionId}/requirements`, {
      state: { projectId: project_id },
    });
    return;
  }

  // ── Both-engine success: fetch task_output then go to choice page ─────────
  if (notification_type === "requirements_extracted_both" && sessionId && project_id) {
    try {
      // Find the most recent done task for this session from the status endpoint.
      // We query by session — the backend returns the latest matching task.
      const res = await fetch(
        `http://localhost:8000/api/sessions/${sessionId}/extraction-tasks/latest`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (res.ok) {
        const data = await res.json();
        const out = data.task_output || {};
        navigate(`/transcript/${sessionId}/requirements/choice`, {
          state: {
            projectId:      project_id,
            commonData:     out.common_data,
            hybridRunId:    out.hybrid_run_id,
            hybridData:     out.hybrid_data,
            hybridOnlyData: out.hybrid_only_data,
            llmRunId:       out.llm_run_id,
            llmData:        out.llm_data,
            llmOnlyData:    out.llm_only_data,
          },
        });
        return;
      }
    } catch (err) {
      console.error("Failed to fetch task output for notification nav:", err);
    }

    // Fallback if fetch fails: go to transcript so user can re-trigger
    navigate(`/transcript/${sessionId}`);
    return;
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