import { useState, useEffect } from "react";

/**
 * EngineChoiceModal
 *
 * Props:
 *   open        – boolean, controls visibility
 *   onClose     – () => void
 *   onConfirm   – (engine: "both" | "hybrid" | "llm") => void
 *   isLoading   – boolean, shows spinner on confirm button while API is running
 */
export default function EngineChoiceModal({ open, onClose, onConfirm, isLoading = false }) {
  const [selected, setSelected] = useState("both");

  // Reset selection every time the modal opens
  useEffect(() => {
    if (open) setSelected("both");
  }, [open]);

  if (!open) return null;

  const options = [
    {
      id: "both",
      icon: "compare_arrows",
      label: "Both Engines",
      sublabel: "Hybrid + LLM",
      desc: "Run both engines and compare results side-by-side to choose the best output.",
      accent: "from-[#6c5fc7] to-[#a99df5]",
      ring: "ring-[#6c5fc7]",
      bg: "bg-[#f0eeff] dark:bg-[#2a2650]",
      iconColor: "text-[#6c5fc7] dark:text-[#a99df5]",
    },
    {
      id: "hybrid",
      icon: "hub",
      label: "Hybrid Engine",
      sublabel: "Rule-based + LLM fusion",
      desc: "Combines structured rule extraction with AI reasoning for precise, traceable requirements.",
      accent: "from-[#0ea5e9] to-[#38bdf8]",
      ring: "ring-[#0ea5e9]",
      bg: "bg-[#e0f2fe] dark:bg-[#0c2a3a]",
      iconColor: "text-[#0ea5e9]",
    },
    {
      id: "llm",
      icon: "psychology",
      label: "LLM Engine",
      sublabel: "Pure language model",
      desc: "Uses the language model directly for flexible, context-aware requirement extraction.",
      accent: "from-[#10b981] to-[#34d399]",
      ring: "ring-[#10b981]",
      bg: "bg-[#d1fae5] dark:bg-[#052e1c]",
      iconColor: "text-[#10b981]",
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-lg bg-white dark:bg-[#1a1830] rounded-2xl shadow-2xl border border-[#e9e7f4] dark:border-[#2e2a4a] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-[#e9e7f4] dark:border-[#2e2a4a]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ede9ff] dark:bg-[#2e2a4a] flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-xl text-[#6c5fc7]">
                    tune
                  </span>
                </div>
                <div>
                  <h2 className="text-[#100d1c] dark:text-white font-black text-lg leading-tight">
                    Choose Extraction Engine
                  </h2>
                  <p className="text-[#57499c] dark:text-[#9b92c8] text-xs mt-0.5">
                    Select which engine(s) to use for requirement extraction
                  </p>
                </div>
              </div>
              {!isLoading && (
                <button
                  onClick={onClose}
                  className="text-[#9b92c8] hover:text-[#57499c] dark:hover:text-white transition-colors p-1 flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="px-6 py-5 flex flex-col gap-3">
            {options.map((opt) => {
              const isSelected = selected === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelected(opt.id)}
                  disabled={isLoading}
                  className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-150 flex items-start gap-4
                    ${isSelected
                      ? `${opt.bg} border-transparent ring-2 ${opt.ring}`
                      : "bg-[#f9f8ff] dark:bg-[#1e1c35] border-[#e9e7f4] dark:border-[#2e2a4a] hover:border-[#c4bdf5] dark:hover:border-[#4a4570]"
                    }
                    ${isLoading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5
                    ${isSelected ? "bg-white/70 dark:bg-black/20" : "bg-[#ede9ff] dark:bg-[#2e2a4a]"}
                  `}>
                    <span className={`material-symbols-outlined text-lg ${isSelected ? opt.iconColor : "text-[#7b6fd4]"}`}>
                      {opt.icon}
                    </span>
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#100d1c] dark:text-white text-sm">
                        {opt.label}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                        ${isSelected
                          ? "bg-white/60 dark:bg-black/20 text-[#57499c] dark:text-[#c4bdf5]"
                          : "bg-[#ede9ff] dark:bg-[#2e2a4a] text-[#7b6fd4]"
                        }`}>
                        {opt.sublabel}
                      </span>
                    </div>
                    <p className="text-[#57499c] dark:text-[#9b92c8] text-xs mt-1 leading-relaxed">
                      {opt.desc}
                    </p>
                  </div>

                  {/* Radio dot */}
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-1 flex items-center justify-center transition-all
                    ${isSelected
                      ? "border-[#6c5fc7] bg-[#6c5fc7]"
                      : "border-[#c4bdf5] dark:border-[#4a4570]"
                    }`}>
                    {isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-[#57499c] dark:text-[#9b92c8] bg-[#f0eeff] dark:bg-[#2e2a4a] hover:bg-[#e4e0f7] dark:hover:bg-[#3a3565] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(selected)}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-[#6c5fc7] hover:bg-[#5a4fb5] shadow-md shadow-[#6c5fc7]/30 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Processing…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">auto_awesome</span>
                  Extract Requirements
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
