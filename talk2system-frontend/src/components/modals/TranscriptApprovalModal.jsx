export default function TranscriptApprovalModal({ open, onApprove, onClose, approved }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
      <div className="w-full max-w-lg mx-4 bg-white dark:bg-background-dark rounded-2xl shadow-xl-soft border border-border-light dark:border-white/10 overflow-hidden transform transition-all">
        <div className="p-8">
          <div className="flex flex-col items-center text-center gap-6">
            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-4xl">verified_user</span>
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-black text-text-dark dark:text-text-light tracking-tight">Approval Required</h2>
              <p className="text-text-dark/70 dark:text-text-light/70 text-base leading-relaxed">
                Please approve the transcript before generating project assets. This ensures the AI uses the most accurate and reviewed version of your session.
              </p>
            </div>
            <div className="flex flex-col w-full gap-3 mt-4">
              <button
                onClick={onApprove}
                disabled={approved}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-bold text-white shadow-lg transition-all active:scale-[0.98] ${approved ? 'bg-green-600' : 'bg-primary hover:bg-primary/90'}`}
              >
                <span className="material-symbols-outlined text-xl">{approved ? 'check_circle' : 'approval'}</span>
                {approved ? 'Approved' : 'Approve Now'}
              </button>
              <button
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/40 dark:border-primary/60 bg-transparent px-6 py-3.5 text-base font-bold text-primary dark:text-primary-accent hover:bg-primary/5 dark:hover:bg-primary/10 transition-all"
              >
                Review Again
              </button>
            </div>
          </div>
        </div>
        <div className="h-1.5 w-full bg-gradient-to-r from-primary-accent to-secondary-accent"></div>
      </div>
    </div>
  );
}
