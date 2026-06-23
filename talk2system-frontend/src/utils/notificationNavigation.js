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
  const engineMatch = message?.match(/\[engine:(\w+)\]/);
  const runIdMatch  = message?.match(/\[run_id:(\d+)\]/);
  const singleEngine = engineMatch ? engineMatch[1] : null;
  const singleRunId  = runIdMatch  ? parseInt(runIdMatch[1], 10) : null;

  if (
    notification_type === "transcription_done" ||
    notification_type === "translation_done"
  ) {
    if (session_id) {
      navigate(`/transcript/${session_id}`);  // ← navigate using the column value
      return;
    }
  }
  // ── Single-engine success ──────────────────────────────────────────────────
  if (notification_type === "requirements_extracted" && sessionId && project_id) {
    // This single engine may have just been regenerated from the choice page
    // for an existing, unfinished comparison (Requirements_choice_page persists
    // that comparison to localStorage until a preferred set is chosen). If so,
    // merge the new run id in and go back to the choice page — same as the
    // live extraction toast already does — instead of the single-result view.
    if (singleEngine === "llm" || singleEngine === "hybrid") {
      const storageKey = `extractionState_session_${sessionId}`;
      try {
        const stored = localStorage.getItem(storageKey);
        const prior = stored ? JSON.parse(stored) : null;
        if (prior && (prior.hybridRunId || prior.llmRunId)) {
          const updated = {
            ...prior,
            projectId: project_id,
            hybridRunId: singleEngine === "hybrid" ? (singleRunId ?? prior.hybridRunId) : prior.hybridRunId,
            llmRunId: singleEngine === "llm" ? (singleRunId ?? prior.llmRunId) : prior.llmRunId,
          };
          localStorage.setItem(storageKey, JSON.stringify(updated));
          navigate(`/transcript/${sessionId}/requirements/choice`, { state: updated });
          return;
        }
      } catch {
        // fall through to the single-result view below
      }
    }

    navigate(`/transcript/${sessionId}/requirements`, {
      state: { projectId: project_id },
    });
    return;
  }

  // ── Both-engine run finished: go to choice page ────────────────────────────
  // Only sessionId + at least one run id is required — one engine can come back
  // empty (e.g. a local model crash during preprocessing) while the run still
  // completes. The choice page already shows a "Regenerate" button for whichever
  // engine has no data, same as the live extraction toast already does.
  if (notification_type === "requirements_extracted_both" && sessionId && (hybridRunId || llmRunId)) {
    navigate(`/transcript/${sessionId}/requirements/choice`, {
      state: { projectId: project_id, hybridRunId, llmRunId },
    });
    return;
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