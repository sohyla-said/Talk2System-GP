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

  // ─── UML & SRS notification navigations ───

  if (notification_type === "uml_generated" && project_id) {
    const sessionMatch = message?.match(/\[session_id:(\d+)\]/);
    const sId = sessionMatch ? parseInt(sessionMatch[1], 10) : null;
    const dtMatch = message?.match(/\[diagram_type:([a-z]+)\]/);
    const diagramType = dtMatch ? dtMatch[1] : null;
    if (sId) {
      navigate(`/projects/${project_id}/artifacts/uml`, {
        state: { source: "session", sessionId: sId, diagramType: diagramType || undefined },
      });
    } else {
      navigate(`/projects/${project_id}/artifacts/uml`, {
        state: { source: "project", diagramType: diagramType || undefined },
      });
    }
    return;
  }

  if (notification_type === "uml_generation_failed" && project_id) {
    const sessionMatch = message?.match(/\[session_id:(\d+)\]/);
    const sId = sessionMatch ? parseInt(sessionMatch[1], 10) : null;
    if (sId) {
      navigate(`/projects/${project_id}/artifacts/uml`, {
        state: { source: "session", sessionId: sId },
      });
    } else {
      navigate(`/projects/${project_id}/artifacts/uml`, {
        state: { source: "project" },
      });
    }
    return;
  }

  if (notification_type === "srs_generated" && project_id) {
    const sessionMatch = message?.match(/\[session_id:(\d+)\]/);
    const sId = sessionMatch ? parseInt(sessionMatch[1], 10) : null;
    const fvMatch = message?.match(/\[format_version:([a-z0-9_]+)\]/);
    const formatVersion = fvMatch ? fvMatch[1] : null;
    if (sId) {
      navigate(`/projects/${project_id}/sessions/${sId}/srs/generate`, {
        state: { formatVersion: formatVersion || undefined },
      });
    } else {
      navigate(`/projects/${project_id}/srs/generate`, {
        state: { source: "project", formatVersion: formatVersion || undefined },
      });
    }
    return;
  }

  if (notification_type === "srs_generation_failed" && project_id) {
    navigate(`/projects/${project_id}/srs/generate`);
    return;
  }

  // ── All leave result notifications → project list (never the project page) ──
  if (
    notification_type === "leave_approved" ||
    notification_type === "leave_rejected" ||
    notification_type === "pm_leave_approved" ||
    notification_type === "pm_leave_rejected"
  ) {
    navigate("/projects");
    return;
  }

  // ── All other types with a project: go to project details ──────────────────
  if (project_id) {
    navigate(`/projects/${project_id}`);
  }
}