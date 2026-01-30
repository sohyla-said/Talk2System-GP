
export default function SrsApprovalModal({ onClose, onApprove }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-center text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 mb-6">
            <span className="material-symbols-outlined text-4xl">
              warning
            </span>
          </div>

          <h3 className="text-xl font-bold text-[#100d1c] dark:text-white mb-3">
            Document Not Approved
          </h3>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            This document hasn't been approved yet. We recommend getting final
            approval before exporting to ensure all project participants are
            aligned.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onApprove}
            className="inline-flex w-full justify-center items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined text-lg">
              check_circle
            </span>
            Approve Now
          </button>

          <button
            onClick={onClose}
            className="inline-flex w-full justify-center items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            Review Again
          </button>
        </div>
      </div>
    </div>
  );
}
