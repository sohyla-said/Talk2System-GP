import { useState } from "react";

// The parent must pass a unique `key` (e.g. segment id) so React remounts
// this component fresh each time a different segment is opened — that avoids
// the "setState in effect" anti-pattern entirely.
export default function TranscriptEditModal({ open, onClose, onSave, speakerData }) {
  // Initialise directly from props — no useEffect needed because the parent
  // remounts this component via key={editingSpeaker?.id} whenever it changes.
  const [editedText, setEditedText] = useState(speakerData?.text || "");

  const handleSave = () => {
    onSave({ ...speakerData, text: editedText });
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!open) return null;

  const speakerLabel = speakerData?.speaker || speakerData?.name || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-background-dark rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-2xl">edit_note</span>
            <div>
              <h2 className="text-xl font-bold text-text-dark dark:text-text-light">
                Edit Segment
              </h2>
              {speakerLabel && (
                <p className="text-sm text-text-dark/50 dark:text-text-light/40 mt-0.5">
                  {speakerLabel}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <label className="block text-sm font-bold text-text-dark dark:text-text-light">
            Transcript Text
          </label>
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={12}
            autoFocus
            className="w-full px-4 py-3 rounded-lg bg-background-light dark:bg-background-dark/80 border border-gray-200 dark:border-white/10 text-text-dark dark:text-text-light focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
            placeholder="Enter transcript text"
          />
          <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
            <span>Edit the transcript text above</span>
            <span>{editedText.length} characters</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-white/10">
          <button
            onClick={handleCancel}
            className="px-6 py-2.5 rounded-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
          >
            <span className="material-symbols-outlined text-lg">save</span>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
