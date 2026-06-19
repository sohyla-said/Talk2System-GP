import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ExtractionToast({
  status,       // "pending" | "in_progress" | "done" | "failed"
  sessionId,    // always set — used for both navigation targets
  projectId,    // always set — used for choice page and requirements view
  taskOutput,   // set by onDone; null while pending/in_progress
  onDismiss,
  onRetry,
}) {
  const navigate = useNavigate();
  const failedMessage =
    taskOutput?.error_message ||
    "Something went wrong. You can retry or dismiss.";

  // ─── Derive intent from task output ──────────────────────────────────────
  const engine       = taskOutput?.engine;          // "hybrid" | "llm" | "both" | "gemini"
  const isBoth       = engine === "both";

  // single-engine completion can also be a regeneration of a previously-failed
  // engine, triggered from the choice page for an existing comparison. That state
  // is persisted (by Requirements_choice_page) under this same key, so its presence
  // tells us to route back to the choice page instead of the single-result view.
  const choiceStorageKey = sessionId ? `extractionState_session_${sessionId}` : null;
  const readChoiceState = () => {
    if (!choiceStorageKey) return null;
    try {
      const raw = localStorage.getItem(choiceStorageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const priorChoiceState = !isBoth ? readChoiceState() : null;
  const isEngineRegeneration =
    !isBoth && !!priorChoiceState && (priorChoiceState.hybridRunId || priorChoiceState.llmRunId);
  const isChoiceFlow = isBoth || isEngineRegeneration;

  // ─── Navigation handlers ─────────────────────────────────────────────────

  // single-engine, fresh extraction (no prior comparison in progress): go
  // straight to the requirements view. Requirements_session_view fetches the
  // latest version on mount via fetchLatestRequirements(), so no state needs
  // to be passed.
  const goToRequirements = () => {
    navigate(`/transcript/${sessionId}/requirements`, {
      state: {
        projectId,
        requirementId: taskOutput.session_req_id,
        groupedData: taskOutput.data,
        preferredType: taskOutput.preferred_type,
       },
    });
    onDismiss();
  };

  // both-engine, or a single-engine regeneration of a failed engine for an
  // existing comparison: go to the choice page, merging the newly-finished
  // engine's run id with whatever the other engine's run id already was.
  const goToChoicePage = () => {
    const prior = priorChoiceState || {};
    const state = {
      ...prior,
      projectId,
      hybridRunId: isBoth
        ? taskOutput.Hybrid_run_id
        : (engine === "hybrid" ? taskOutput.run_id : prior.hybridRunId),
      llmRunId: isBoth
        ? taskOutput.LLM_run_id
        : (engine === "llm" ? taskOutput.run_id : prior.llmRunId),
    };
    if (choiceStorageKey) {
      try {
        localStorage.setItem(choiceStorageKey, JSON.stringify(state));
      } catch {}
    }
    navigate(`/transcript/${sessionId}/requirements/choice`, { state });
    onDismiss();
  };

  const handleView = isChoiceFlow ? goToChoicePage : goToRequirements;
  const viewLabel  = isChoiceFlow ? "Compare" : "View";
  const doneSubtitle = isBoth
    ? "Both engines finished. Compare results."
    : isEngineRegeneration
      ? "Engine finished. View the updated comparison."
      : "Extraction completed successfully.";

  // Auto-open compare page once both-engine extraction is done.
  // useEffect(() => {
  //   if (status === "done" && isBoth && taskOutput) {
  //     goToChoicePage();
  //   }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [status, isBoth, taskOutput]);

  // ─── Render ──────────────────────────────────────────────────────────────

  // In-progress (pending or in_progress)
  if (!status || status === "pending" || status === "in_progress") {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-white dark:bg-background-dark border border-[#d3cee8]/50 dark:border-white/10 px-5 py-4 shadow-lg min-w-[300px] max-w-sm">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-slate-900 dark:text-white text-sm font-semibold">
            Extracting requirements…
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            Requirement Extraction takes some time. You can navigate freely. We'll notify you when done.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 transition-colors"
          aria-label="Dismiss"
        >
          <span className="material-symbols-outlined text-base leading-none">close</span>
        </button>
      </div>
    );
  }

  // Done
  if (status === "done") {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-white dark:bg-background-dark border border-green-200 dark:border-green-800/50 px-5 py-4 shadow-lg min-w-[300px] max-w-sm">
        <span className="material-symbols-outlined text-green-600 dark:text-green-400 shrink-0 text-xl">
          check_circle
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-slate-900 dark:text-white text-sm font-semibold">
            Requirements ready!
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            {doneSubtitle}
          </p>
        </div>
        <button
          onClick={handleView}
          className="text-xs font-semibold text-primary hover:underline whitespace-nowrap shrink-0 transition-colors"
        >
          {viewLabel}
        </button>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 transition-colors"
          aria-label="Dismiss"
        >
          <span className="material-symbols-outlined text-base leading-none">close</span>
        </button>
      </div>
    );
  }

  // Failed
  if (status === "failed") {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-white dark:bg-background-dark border border-red-200 dark:border-red-800/50 px-5 py-4 shadow-lg min-w-[300px] max-w-sm">
        <span className="material-symbols-outlined text-red-500 dark:text-red-400 shrink-0 text-xl">
          error
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-slate-900 dark:text-white text-sm font-semibold">
            Extraction failed
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            {failedMessage}
          </p>
        </div>
        <button
          onClick={onRetry}
          className="text-xs font-semibold text-primary hover:underline whitespace-nowrap shrink-0 transition-colors"
        >
          Retry
        </button>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 transition-colors"
          aria-label="Dismiss"
        >
          <span className="material-symbols-outlined text-base leading-none">close</span>
        </button>
      </div>
    );
  }

  return null;
}