export default function Toast({ toast, onDismiss }) {
  if (!toast) return null;

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-xl px-5 py-4 shadow-lg min-w-[300px] max-w-sm border bg-white dark:bg-background-dark ${
      toast.type === "error"   ? "border-red-200 dark:border-red-800/50" :
      toast.type === "warning" ? "border-amber-200 dark:border-amber-800/50" :
      toast.type === "success" ? "border-green-200 dark:border-green-800/50" :
                                 "border-blue-200 dark:border-blue-800/50"
    }`}>
      <span className={`material-symbols-outlined shrink-0 text-xl mt-0.5 ${
        toast.type === "error"   ? "text-red-500 dark:text-red-400" :
        toast.type === "warning" ? "text-amber-500 dark:text-amber-400" :
        toast.type === "success" ? "text-green-600 dark:text-green-400" :
                                   "text-blue-500 dark:text-blue-400"
      }`}>
        {toast.type === "error" ? "error" : toast.type === "warning" ? "warning" : toast.type === "success" ? "check_circle" : "info"}
      </span>
      <p className="flex-1 text-sm text-slate-900 dark:text-white leading-snug">{toast.message}</p>
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
