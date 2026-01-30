import { useState } from "react";
import UMLApprovalModal from "../../components/modals/UMLApprovalModal";

const DIAGRAM_IMAGES = {
  usecase: "/uml/usecase.png",
  class: "/uml/class.png",
  sequence: "/uml/sequence.png",
};

export default function UmlPage() {
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approved, setApproved] = useState(false);
  const [diagramType, setDiagramType] = useState("usecase");

  const handleApprove = () => {
    setApproved(true);
    setShowApprovalModal(false);
  };

  return (
    <div className="font-display bg-background-light dark:bg-background-dark min-h-screen text-[#100d1c] dark:text-white">

      {/* MAIN */}
      <main className="max-w-5xl mx-auto pt-8 px-4">

        {/* TITLE */}
        <div className="mb-6">
          <h1 className="text-4xl font-black">UML Diagrams</h1>
          <p className="text-primary/70 mt-1">
            Generated from “E-commerce Checkout Flow” session
          </p>
        </div>

        {/* DIAGRAM TYPE TABS */}
        <div className="bg-white dark:bg-background-dark rounded-xl shadow mb-4">

          <div className="flex gap-2 p-2 bg-[#e9e7f4] dark:bg-background-dark rounded-lg">
            {[
              { key: "usecase", label: "Use-Case" },
              { key: "class", label: "Class Diagram" },
              { key: "sequence", label: "Sequence Diagram" },
            ].map(({ key, label }) => (
              <label
                key={key}
                className={`flex-1 cursor-pointer text-center px-3 py-2 rounded-lg text-sm font-medium
                  ${diagramType === key
                    ? "bg-primary text-white shadow"
                    : "text-[#57499c] dark:text-white/60"
                  }`}
              >
                <input
                  type="radio"
                  name="diagram"
                  className="hidden"
                  checked={diagramType === key}
                  onChange={() => setDiagramType(key)}
                />
                {label}
              </label>
            ))}
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex justify-end gap-3 px-4 py-3 border-t border-gray-200 dark:border-white/10">


            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-primary/20 rounded-lg">
                <span className="material-symbols-outlined text-lg">
                  download
                </span>
                Export
                <span className="material-symbols-outlined text-lg transition-transform group-hover:rotate-180">
                  expand_more
                </span>
              </button>

              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-background-dark rounded-lg shadow-lg border opacity-0 invisible group-hover:visible group-hover:opacity-100">
                {["PNG", "PDF", "SVG"].map((f) => (
                  <a
                    key={f}
                    href="#"
                    className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-primary/20"
                  >
                    Export as {f}
                  </a>
                ))}
              </div>
            </div>
           <button
              onClick={() => setShowApprovalModal(true)}
              disabled={approved}
              className={`h-10 px-6 rounded-lg flex items-center gap-2 text-white
                ${approved ? "bg-green-600" : "bg-primary hover:opacity-90"}`}
            >
              <span className="material-symbols-outlined">
                {approved ? "check_circle" : "approval"}
              </span>
              {approved ? "Approved" : "Approve"}
            </button>
          </div>
        </div>

        {/* UML PLACEHOLDER IMAGE */}
        <div className="bg-white dark:bg-[#1f1c2e] rounded-xl border overflow-hidden p-6 flex justify-center">
          <img
            src={DIAGRAM_IMAGES[diagramType]}
            alt={`${diagramType} diagram`}
            className="max-w-full h-auto rounded-lg"
          />
        </div>
      </main>

      {/* MODAL */}
      {showApprovalModal && (
        <UMLApprovalModal
          onClose={() => setShowApprovalModal(false)}
          onApprove={handleApprove}
        />
      )}
    </div>
  );
}
