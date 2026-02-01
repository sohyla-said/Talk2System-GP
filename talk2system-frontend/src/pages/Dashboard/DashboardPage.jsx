import React from "react";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const navigate = useNavigate();
  
  return (
    <div className="flex min-h-screen font-display bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100">

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 overflow-y-auto w-full">

        {/* Dashboard Title */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h2 className="text-[#1F2937] dark:text-white text-3xl font-black leading-tight tracking-tight">
            Dashboard
          </h2>
        </div>

        {/* Statistics & Reports */}
        <div className="mb-10">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
            Statistics &amp; Reports
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1 */}
            <div className="bg-white dark:bg-[#1C192B] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">
                    mic
                  </span>
                </div>
                <span className="text-xs font-bold text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                  +12%
                </span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                Total Sessions
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">24</p>
              <div className="mt-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: "65%" }}></div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white dark:bg-[#1C192B] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">
                    task_alt
                  </span>
                </div>
                <span className="text-xs font-bold text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded">
                  Target: 10
                </span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                Projects Completed
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">8</p>
              <div className="mt-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: "80%" }}></div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white dark:bg-[#1C192B] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">
                    description
                  </span>
                </div>
                <span className="text-xs font-bold text-gray-400 px-2 py-1 rounded">
                  Last 30d
                </span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                Artifacts Generated
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">142</p>
                <span className="text-xs text-gray-400">units</span>
              </div>
              <div className="mt-4 flex gap-1 items-end h-4">
                <div className="w-full bg-amber-200 dark:bg-amber-800/40 h-1 rounded-sm"></div>
                <div className="w-full bg-amber-300 dark:bg-amber-800/60 h-2 rounded-sm"></div>
                <div className="w-full bg-amber-400 dark:bg-amber-700 h-4 rounded-sm"></div>
                <div className="w-full bg-amber-500 dark:bg-amber-600 h-3 rounded-sm"></div>
                <div className="w-full bg-amber-300 dark:bg-amber-800/60 h-2 rounded-sm"></div>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white dark:bg-[#1C192B] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">
                    timer
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
                  Active
                </span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                Hours Recorded
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">12.5h</p>
              <div className="mt-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: "45%" }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* No Active Projects */}
        <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C192B] p-8 flex flex-col items-center justify-center text-center">
          <div className="mb-5 flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 dark:bg-primary/20">
            <span className="material-symbols-outlined text-2xl text-primary">
              folder_open
            </span>
          </div>
          <h3 className="text-lg font-bold text-[#1F2937] dark:text-white mb-2">
            No Active Projects
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm text-sm leading-relaxed">
            Ready to transform your ideas? Create new project to start converting voice sessions into professional documentation.
          </p>
          <button
              onClick={() => navigate("/projects/new")}
              className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-white font-bold"
            >
              <span className="material-symbols-outlined">add</span>
              Create New Project
            </button>
        </div>

      </main>
    </div>
  );
}
