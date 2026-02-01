import React from "react";
import { useNavigate } from "react-router-dom";

export default function ArtifactsView() {
    const navigate = useNavigate()
  return (
    <div className="font-display bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark transition-colors duration-200 min-h-screen flex flex-col items-center py-8 px-4 lg:px-10">
      
      {/* Breadcrumb */}
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

      {/* Page Title & Date */}
      <div className="flex flex-col md:flex-row justify-between gap-4 py-4 items-start md:items-end w-full max-w-[1200px]">
        <div className="flex flex-col gap-2">
          <h1 className="text-text-main-light dark:text-text-main-dark text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">
            E-commerce App Redesign
          </h1>
          <p className="text-text-sub-light dark:text-text-sub-dark text-base font-normal flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
            October 24, 2023
          </p>
        </div>
      </div>

      {/* Tabs */}
        <div className="flex flex-col mt-4">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4">
              <div className="flex gap-8">
                <button 
                  onClick={() => navigate('/projects/1')}
                  className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 pb-[13px] pt-4"
                >
                  <p className="text-sm font-bold leading-normal tracking-[0.015em]">Sessions</p>
                </button>
                <button 
                  onClick={() => navigate('/requirements')}
                  className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 pb-[13px] pt-4"
                >
                  <p className="text-sm font-bold leading-normal tracking-[0.015em]">Requirements</p>
                </button>
                <button 
                  onClick={() => navigate('/results')}
                  className="flex flex-col items-center justify-center border-b-[3px] border-b-primary text-gray-900 dark:text-white pb-[13px] pt-4"
                >
                  <p className="text-sm font-bold leading-normal tracking-[0.015em]">Artifacts</p>
                </button>
              </div>
            </div>

      {/* Artifacts Grid */}
      <div className="mt-8 w-full max-w-[1200px]">
        
        {/* Source Material */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[20px]">description</span>
            </div>
            <h3 className="text-text-main-light dark:text-text-main-dark text-lg font-bold leading-tight">
              Source Material
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Full Transcript Card */}
            <div className="group flex flex-col bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-200">
              <div className="p-5 flex flex-col h-full">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[24px]">record_voice_over</span>
                    <h4 className="font-bold text-text-main-light dark:text-text-main-dark">Full Transcript</h4>
                  </div>
                  <button className="text-text-sub-light dark:text-text-sub-dark hover:bg-background-light dark:hover:bg-background-dark p-1 rounded transition-colors">
                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                  </button>
                </div>
                <div className="grow relative">
                  <p className="text-text-sub-light dark:text-text-sub-dark text-sm leading-relaxed mb-4 line-clamp-4">
                    <span className="font-semibold text-text-main-light dark:text-text-main-dark">Speaker 1:</span> Alright, so for the login screen, I think we really need to focus on biometric authentication as a primary method. <br/>
                    <span className="font-semibold text-text-main-light dark:text-text-main-dark">Speaker 2:</span> Agreed. FaceID integration is a must for the iOS version. What about password recovery?
                  </p>
                  <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-card-light dark:from-card-dark to-transparent"></div>
                </div>
                <div className="mt-4 pt-4 border-t border-border-light dark:border-border-dark flex justify-between items-center">
                  <span className="text-xs font-medium text-text-sub-light dark:text-text-sub-dark">Generated 2h ago</span>
                  <button className="text-primary hover:text-primary/80 text-sm font-bold flex items-center gap-1" onClick={() => navigate("/transcript")}>
                    View <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Summary Card */}
            <div className="group flex flex-col bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-200">
              <div className="p-5 flex flex-col h-full">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-500 text-[24px]">auto_awesome</span>
                    <h4 className="font-bold text-text-main-light dark:text-text-main-dark">Transcript Summary</h4>
                  </div>
                  <button className="text-text-sub-light dark:text-text-sub-dark hover:bg-background-light dark:hover:bg-background-dark p-1 rounded transition-colors">
                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                  </button>
                </div>
                <div className="grow">
                  <ul className="list-disc list-inside text-sm text-text-main-light dark:text-text-main-dark space-y-2 marker:text-primary">
                    <li>Focus heavily on biometric authentication (FaceID).</li>
                    <li>Implement a "Magic Link" for password recovery.</li>
                    <li>Dashboard should default to "Recent Activity" view.</li>
                    <li>Dark mode is a P1 requirement.</li>
                  </ul>
                </div>
                <div className="mt-4 pt-4 border-t border-border-light dark:border-border-dark flex justify-between items-center">
                  <div className="flex gap-2">
                    <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-0.5 rounded font-medium">Completed</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-primary hover:text-primary/80 text-sm font-bold flex items-center gap-1" onClick={() => navigate("/transcript/summary")}>
                    View <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Technical Specs */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[20px]">settings_suggest</span>
            </div>
            <h3 className="text-text-main-light dark:text-text-main-dark text-lg font-bold leading-tight">Technical Specs</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Requirement Card */}
            <div className="group flex flex-col bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-200">
              <div className="p-5 flex flex-col h-full">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-orange-500 text-[24px]">list_alt</span>
                    <h4 className="font-bold text-text-main-light dark:text-text-main-dark">Requirements</h4>
                  </div>
                </div>
                <div className="grow space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold bg-background-light dark:bg-background-dark px-1.5 py-0.5 rounded text-text-sub-light border border-border-light dark:border-border-dark mt-0.5">REQ-01</span>
                    <p className="text-sm text-text-main-light dark:text-text-main-dark">User MUST be able to reset password via email link.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold bg-background-light dark:bg-background-dark px-1.5 py-0.5 rounded text-text-sub-light border border-border-light dark:border-border-dark mt-0.5">REQ-02</span>
                    <p className="text-sm text-text-main-light dark:text-text-main-dark">System shall support OAuth2.0 for Google login.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold bg-background-light dark:bg-background-dark px-1.5 py-0.5 rounded text-text-sub-light border border-border-light dark:border-border-dark mt-0.5">REQ-03</span>
                    <p className="text-sm text-text-main-light dark:text-text-main-dark">All API responses must be in JSON format.</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border-light dark:border-border-dark flex justify-between items-center">
                  <span className="text-xs font-medium text-text-sub-light dark:text-text-sub-dark">12 Requirements extracted</span>
                  <button className="text-primary hover:text-primary/80 text-sm font-bold flex items-center gap-1" onClick={() => navigate("/requirements")}>
                    View <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
            {/* SRS Document Card */}
            <div className="group flex flex-col bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-200">
              <div className="p-5 flex flex-col h-full">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500 text-[24px]">description</span>
                    <h4 className="font-bold text-text-main-light dark:text-text-main-dark">SRS Document</h4>
                  </div>
                  <button className="text-text-sub-light dark:text-text-sub-dark hover:bg-background-light dark:hover:bg-background-dark p-1 rounded transition-colors">
                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                  </button>
                </div>
                <div className="grow z-10">
                  <h4 className="font-bold text-lg text-text-main-light dark:text-text-main-dark mb-1">SRS_Mobile_V2.pdf</h4>
                  <p className="text-sm text-text-sub-light dark:text-text-sub-dark">Software Requirements Specification</p>
                  <div className="flex gap-4 mt-4 text-xs text-text-sub-light dark:text-text-sub-dark font-medium">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">hard_drive</span> 2.4 MB</span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">history</span> v1.0</span>
                  </div>
                </  div>
                <div className="mt-4 pt-4 border-t border-border-light dark:border-border-dark flex justify-end">
                  <button className="text-primary hover:text-primary/80 text-sm font-bold flex items-center gap-1" onClick={() => navigate("/artifacts/srs")}>
                    View <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        

      </div>
    </div>
    </div>
  );
}
