import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TranscriptApprovalModal from "../../components/modals/TranscriptApprovalModal";

export default function TranscriptPage() {
  const [approved, setApproved] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const handleGenerate = (type) => {
    if (!approved) {
      setShowModal(true);
      return;
    }
    if (type === "uml") {
      navigate("/artifacts/uml");
      return;
    }
    if (type === "srs") {
      navigate("/artifacts/srs");
      return;
    }
    alert("Asset generation started 🚀");
  };

  return (
    <>
      <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-text-dark dark:text-text-light overflow-x-hidden">


        {/* MAIN */}
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-4">
            {/* Breadcrumb */}
            <div className="flex flex-wrap gap-2 text-sm">
              <a className="text-primary-accent dark:text-secondary-accent font-medium leading-normal" href="#">Projects</a>
              <span className="text-text-dark/50 dark:text-text-light/50 font-medium leading-normal">/</span>
              <a className="text-primary-accent dark:text-secondary-accent font-medium leading-normal" href="#">Session 1</a>
              <span className="text-text-dark/50 dark:text-text-light/50 font-medium leading-normal">/</span>
              <span className="text-text-dark dark:text-text-light font-medium leading-normal">Transcript</span>
            </div>
            {/* Title and Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="text-text-dark dark:text-text-light text-4xl font-black leading-tight tracking-[-0.033em] flex-1">Mobile Banking App - Initial Brainstorm</h1>
              <div className="flex items-center gap-3">
                <div className="relative min-w-[200px]">
                  <select className="form-select appearance-none w-full bg-surface-light dark:bg-background-dark/50 border-border-light dark:border-white/10 rounded-lg py-2 px-4 pr-10 text-sm font-medium text-text-dark dark:text-text-light focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer shadow-soft">
                    <option defaultValue>Version 3 (Latest) - 10:45 AM</option>
                    <option>Version 2 - Oct 23, 09:15 AM</option>
                    <option>Version 1 - Oct 22, 04:30 PM</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-dark/60 dark:text-text-light/60">
                    <span className="material-symbols-outlined text-xl">expand_more</span>
                  </div>
                </div>
                <button
                  onClick={() => {}}
                  disabled={approved}
                  className={`flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white shadow-soft transition-colors
                    ${approved ? "bg-green-600 cursor-default" : "bg-primary hover:bg-primary/90"}
                  `}
                >
                  <span className="material-symbols-outlined text-lg">
                    {approved ? "check_circle" : "approval"}
                  </span>
                  {approved ? "Approved" : "Approve Transcript"}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* LEFT CONTENT - Speaker Bubbles */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="flex flex-col gap-8 bg-surface-light dark:bg-background-dark/50 rounded-xl p-4 sm:p-6 shadow-soft">
                {/* Example Speaker Bubble 1 */}
                <div className="flex gap-4 group/speaker">
                  <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 flex-shrink-0" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAptLIO7pwsGP-E1vCtmR5R9tmy7svX0HFM7SYwdzydUUsyBPvdvaFa3tpQ0vYhTc9Dnl4Qe-opbfHMLNIqUfeHP6d_IbPS99KrashDM9SFd_HGKF2pHBNfednvqolmL3mS4vzsfBlmExnR1ASZf0mSpJpti53uGw-C7peKlKL5A6B1qJXpXGx_QLjCQEOHhMzUp0K6utaN-jrGd_Tp3o79-ij15KClyw6LMH5igpd7C8yXqGy1RgLSsJeSCL26XeNkbB0jvtFO8qHw")'}} data-alt="Avatar for Speaker 1"></div>
                  <div className="flex flex-1 flex-col items-stretch gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <p className="text-text-dark dark:text-text-light text-base font-bold leading-tight">Speaker 1</p>
                          <p className="text-text-dark/60 dark:text-text-light/60 text-sm font-normal leading-normal">00:01</p>
                        </div>
                        <button className="flex items-center text-text-dark/40 hover:text-primary dark:text-text-light/40 dark:hover:text-primary transition-colors p-1" title="Edit this line">
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                      </div>
                      <p className="text-text-dark/90 dark:text-text-light/90 text-base font-normal leading-relaxed">
                        Okay, let's kick off the brainstorming session for the new mobile banking app. What are the absolute core features we need for the MVP launch?
                      </p>
                    </div>
                  </div>
                </div>
                {/* Example Speaker Bubble 2 */}
                <div className="flex gap-4 group/speaker">
                  <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 flex-shrink-0" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAoUmoakIgWlvD3hmmLUKi29Kloxoxwt9Qb6MN3YZOTagGvRpedM33wo1jrHGWkI9pEDOeN4EL59M2bfeObZlbKhX43zTvOdQ1QylxA_UaeKR_Ah4tkGiIEaSZo0n3TI8q6hroEQ5lxk_iBYM-0ePuZxR_I9qJTKHYH42iJzFE2LavTCAx_noA5cX08dE8hnMidOSypc7Fc9lP5BoDclEuEzGlepPV_KmYJlV7CSQXONabsSL3Ji1gmodvp1pUyTXB-weM_6rdX2dk2")'}} data-alt="Avatar for Speaker 2"></div>
                  <div className="flex flex-1 flex-col items-stretch gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <p className="text-text-dark dark:text-text-light text-base font-bold leading-tight">Speaker 2</p>
                          <p className="text-text-dark/60 dark:text-text-light/60 text-sm font-normal leading-normal">00:15</p>
                        </div>
                        <button className="flex items-center text-text-dark/40 hover:text-primary dark:text-text-light/40 dark:hover:text-primary transition-colors p-1" title="Edit this line">
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                      </div>
                      <p className="text-text-dark/90 dark:text-text-light/90 text-base font-normal leading-relaxed">
                        Definitely account balance and transaction history. That's the bare minimum. I also think a simple transfer feature—P2P and to external accounts—is crucial.
                      </p>
                    </div>
                  </div>
                </div>
                {/* Example Speaker Bubble 3 */}
                <div className="flex gap-4 group/speaker">
                  <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 flex-shrink-0" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuD4vRBxKtx6RHaMwYp64Y1CoGdxQ8FIpQaMg85bkd3Al_96Iq_54DZLG7wWTrZ043TAekqYmX6Sa-jfX52PL7UB-beL5fLEbUOiGbKCTvFRDy-JYaiIoBSQrOrBkIoS7to4NAK3TTgjDUOzc15icg5ibDqwhBoFguu-vp2F7SWUqKsnuU4BFbQFnU0Y6_IVBxIDnIoKZYyOU0GMrM_4gFslm5uGeXtmwgXOdPyiyR2QvzGKz7pfg2oBugAH25yw-WSlx9vvh4EBQGCk")'}} data-alt="Avatar for Speaker 1"></div>
                  <div className="flex flex-1 flex-col items-stretch gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <p className="text-text-dark dark:text-text-light text-base font-bold leading-tight">Speaker 1</p>
                          <p className="text-text-dark/60 dark:text-text-light/60 text-sm font-normal leading-normal">00:32</p>
                        </div>
                        <button className="flex items-center text-text-dark/40 hover:text-primary dark:text-text-light/40 dark:hover:text-primary transition-colors p-1" title="Edit this line">
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                      </div>
                      <p className="text-text-dark/90 dark:text-text-light/90 text-base font-normal leading-relaxed">
                        Good point. What about security? Biometric login—Face ID or fingerprint—should be there from day one. Nobody wants to type passwords anymore.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* SIDEBAR */}
            <div className="lg:col-span-1 flex flex-col gap-8 sticky top-24">
              {/* Transcript Versions */}
              <div className="flex flex-col gap-4 bg-surface-light dark:bg-background-dark/50 rounded-xl p-6 shadow-soft">
                <h3 className="text-text-dark dark:text-text-light text-xl font-bold">Transcript Versions</h3>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20 cursor-pointer">
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-primary">Version 3 (Current)</span>
                        <span className="text-[10px] uppercase tracking-wider font-bold bg-primary text-white px-1.5 py-0.5 rounded">Latest</span>
                      </div>
                      <span className="text-xs text-text-dark/60 dark:text-text-light/60">Today, 10:45 AM • Edited by AI</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-background-light dark:hover:bg-white/5 border border-transparent cursor-pointer transition-colors group">
                    <div className="flex flex-col flex-1">
                      <span className="text-sm font-medium text-text-dark dark:text-text-light group-hover:text-primary transition-colors">Version 2</span>
                      <span className="text-xs text-text-dark/60 dark:text-text-light/60">Oct 23, 2023 • 09:15 AM</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-background-light dark:hover:bg-white/5 border border-transparent cursor-pointer transition-colors group">
                    <div className="flex flex-col flex-1">
                      <span className="text-sm font-medium text-text-dark dark:text-text-light group-hover:text-primary transition-colors">Version 1</span>
                      <span className="text-xs text-text-dark/60 dark:text-text-light/60">Oct 22, 2023 • 04:30 PM</span>
                    </div>
                  </div>
                </div>
                <button className="text-primary-accent dark:text-secondary-accent text-sm font-semibold hover:underline flex items-center gap-1 justify-center mt-2">
                  <span className="material-symbols-outlined text-sm">history</span>
                  View full history
                </button>
              </div>
              {/* Generate Assets */}
              <div className="flex flex-col gap-6 bg-white dark:bg-background-dark/50 rounded-xl p-6 shadow-soft border border-border-light dark:border-white/10">
                <h3 className="text-text-dark dark:text-text-light text-xl font-bold">Generate Assets</h3>
                <div className="flex flex-col gap-3">
                  <button onClick={() => handleGenerate()} className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary-accent px-4 py-3 text-base font-bold text-dark shadow-soft transition-colors hover:bg-primary-accent/90">
                    <span className="material-symbols-outlined text-xl">summarize</span>
                    Summarize Transcript
                  </button>
                  <button onClick={() => handleGenerate()} className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary-accent px-4 py-3 text-base font-bold text-dark shadow-soft transition-colors hover:bg-primary-accent/90">
                    <span className="material-symbols-outlined text-xl">checklist</span>
                    Extract Requirements
                  </button>
                  <button onClick={() => handleGenerate("uml")} className="flex w-full items-center justify-center gap-3 rounded-lg bg-secondary-accent px-4 py-3 text-base font-bold text-dark shadow-soft transition-colors hover:bg-secondary-accent/90">
                    <span className="material-symbols-outlined text-xl">schema</span>
                    Generate UML Diagrams
                  </button>
                  <button onClick={() => handleGenerate("srs")} className="flex w-full items-center justify-center gap-3 rounded-lg bg-secondary-accent px-4 py-3 text-base font-bold text-dark shadow-soft transition-colors hover:bg-secondary-accent/90">
                    <span className="material-symbols-outlined text-xl">description</span>
                    Generate SRS
                  </button>
                </div>
                <hr className="border-border-light dark:border-white/10" />
                <button onClick={handleGenerate} className="flex w-full items-center justify-center gap-3 rounded-lg border border-border-light dark:border-white/10 bg-white dark:bg-transparent px-4 py-3 text-base font-bold text-text-dark dark:text-text-light shadow-soft transition-colors hover:bg-background-light dark:hover:bg-white/5">
                  <span className="material-symbols-outlined text-xl">download</span>
                  Export Transcript
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
      <TranscriptApprovalModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onApprove={() => {
          setApproved(true);
          setShowModal(false);
        }}
        approved={approved}
      />
    </>
  );
}
