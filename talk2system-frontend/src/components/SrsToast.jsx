import { useNavigate } from "react-router-dom";

export default function SrsToast({
  status,      // "pending" | "in_progress" | "done" | "failed"
  projectId,
  sessionId,   // null for project-level generation
  taskOutput,  // set by onDone; null while pending/in_progress
  onDismiss,
  onRetry,
}) {
  const navigate = useNavigate();

    const rawError = taskOutput?.error_message || "";
    const failedMessage = (rawError && rawError.length < 200 && !rawError.includes("<"))
    ? rawError
    : "SRS generation failed. Please retry or try again in a moment.";

  const formatVersion = taskOutput?.format_version ?? "";

  const handleView = () => {
    if (sessionId) {
      navigate(
        `/projects/${projectId}/sessions/${sessionId}/srs/generate`,
        { state: { source: "session", sessionId } }
      );
    } else {
      navigate(
        `/projects/${projectId}/srs/generate`,
        { state: { source: "project" } }
      );
    }
    onDismiss();
  };

  // ── Pending / In-progress ──────────────────────────────────────────────────
  if (!status || status === "pending" || status === "in_progress") {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-white dark:bg-background-dark border border-[#d3cee8]/50 dark:border-white/10 px-5 py-4 shadow-lg min-w-[300px] max-w-sm">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-slate-900 dark:text-white text-sm font-semibold">
            Generating SRS Document…
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            Ollama is writing your document. You can navigate freely — we'll notify you when it's ready.
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

  // ── Done ───────────────────────────────────────────────────────────────────
  if (status === "done") {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-white dark:bg-background-dark border border-green-200 dark:border-green-800/50 px-5 py-4 shadow-lg min-w-[300px] max-w-sm">
        <span className="material-symbols-outlined text-green-600 dark:text-green-400 shrink-0 text-xl">
          check_circle
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-slate-900 dark:text-white text-sm font-semibold">
            SRS Document ready!
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            {formatVersion
              ? `Document generated (${formatVersion.replace(/_/g, " ").toUpperCase()}).`
              : "Document generated successfully."}
          </p>
        </div>
        <button
          onClick={handleView}
          className="text-xs font-semibold text-primary hover:underline whitespace-nowrap shrink-0 transition-colors"
        >
          View
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

  // ── Failed ─────────────────────────────────────────────────────────────────
  if (status === "failed") {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-white dark:bg-background-dark border border-red-200 dark:border-red-800/50 px-5 py-4 shadow-lg min-w-[300px] max-w-sm">
        <span className="material-symbols-outlined text-red-500 dark:text-red-400 shrink-0 text-xl">
          error
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-slate-900 dark:text-white text-sm font-semibold">
            SRS generation failed
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