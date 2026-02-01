import { useState } from "react";
import { useNavigate } from "react-router-dom";
export default function CheckoutSummary() {
  const [approved, setApproved] = useState(false);
  const navigate = useNavigate();


  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-[#100d1c] dark:text-white min-h-screen flex flex-col items-center py-12 px-4 md:px-10 lg:px-20 xl:px-40">
      
      {/* Breadcrumb / Section Info */}
      <div className="flex flex-col gap-6 text-center items-center mb-10">
        <div className="flex flex-wrap gap-2 text-sm w-full max-w-[1200px]">
            <button 
                onClick={() => navigate("/projects")}
                className="text-primary-accent dark:text-secondary-accent font-medium leading-normal"
            >
                Projects
            </button>
            <span className="text-text-dark/50 dark:text-text-light/50 font-medium leading-normal">/</span>
            <button 
                onClick={() => navigate("/projects/1")}
                className="text-primary-accent dark:text-secondary-accent font-medium leading-normal"
            >
                E-commerce App Redesign
            </button>
            <span className="text-text-dark/50 dark:text-text-light/50 font-medium leading-normal">/</span>
            <span className="text-text-dark dark:text-text-light font-medium leading-normal">Artifacts</span>
        </div>

        <div className="flex flex-col gap-3 items-center">
          <h1 className="text-[#100d1c] dark:text-white text-3xl md:text-4xl lg:text-5xl font-black leading-tight tracking-[-0.033em]">
            Brainstorming Session: Checkout Flow
          </h1>
          <p className="text-[#57499c] text-base font-normal leading-normal flex items-center justify-center gap-2 bg-[#e9e7f4] dark:bg-white/5 px-4 py-1.5 rounded-full mt-2">
            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
            Oct 24, 2023
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-white dark:bg-[#1a1728] rounded-2xl p-8 md:p-12 shadow-lg shadow-purple-900/5 border border-[#e9e7f4] dark:border-white/5 relative overflow-hidden group w-full max-w-[800px]">
        <div className="absolute -top-6 -right-6 opacity-[0.03] dark:opacity-[0.05] pointer-events-none group-hover:opacity-[0.06] transition-opacity duration-500">
          <span className="material-symbols-outlined text-[200px] text-primary">format_quote</span>
        </div>

        <div className="relative z-10 flex flex-col gap-8">
          <div className="flex items-center gap-4 border-b border-[#e9e7f4] dark:border-white/10 pb-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary shadow-sm">
              <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-[#100d1c] dark:text-white">
                Executive Summary
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Key takeaways and action items</p>
            </div>
          </div>
          <div className="prose prose-lg max-w-none text-[#100d1c] dark:text-gray-300 leading-relaxed font-normal">
            <p>
              The team focused on streamlining the e-commerce checkout process to reduce cart abandonment. Key decisions included removing the mandatory registration step in favor of a guest checkout option and prioritizing the integration of Apple Pay and Google Pay.
            </p>
            <p>
              Concerns regarding security validation for guest users were raised but deferred to the technical feasibility phase. The design team is tasked with creating a single-page checkout mock-up.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mt-6">
        <button 
          onClick={() => navigate('/transcript')}
          className="group flex items-center gap-2 text-sm font-semibold text-[#57499c] hover:text-primary transition-colors"
        >
          <div className="p-2 rounded-full bg-transparent group-hover:bg-[#e9e7f4] dark:group-hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-[20px] block">description</span>
          </div>
          View Full Transcript
        </button>
        <button
            onClick={() => setApproved(true)}
              disabled={approved}
              className={`flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white shadow-soft transition-colors
                ${approved ? "bg-green-600 cursor-default" : "bg-primary hover:bg-primary/90"}
              `}
            >
              <span className="material-symbols-outlined text-lg">
                {approved ? "check_circle" : "approval"}
               </span>
              {approved ? "Approved" : "Approve"}
        </button>
      </div>
    </div>
  );
}
