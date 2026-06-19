export default function ConfirmModal({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-center text-center">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full mb-6 ${
            danger
              ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500"
              : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500"
          }`}>
            <span className="material-symbols-outlined text-4xl">
              {danger ? "delete" : "warning"}
            </span>
          </div>

          <h3 className="text-xl font-bold text-[#100d1c] dark:text-white mb-3">
            {title}
          </h3>

          {message && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
              {message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className={`inline-flex w-full justify-center items-center gap-2 rounded-lg px-4 py-3 text-sm font-bold text-white hover:opacity-90 transition-all ${
              danger ? "bg-red-500" : "bg-primary"
            }`}
          >
            <span className="material-symbols-outlined text-lg">
              {danger ? "delete" : "check_circle"}
            </span>
            {confirmLabel}
          </button>

          <button
            onClick={onCancel}
            className="inline-flex w-full justify-center items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
