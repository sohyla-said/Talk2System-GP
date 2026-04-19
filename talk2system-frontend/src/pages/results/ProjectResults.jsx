import React from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function ProjectResults() {
  const navigate = useNavigate();
  const { id: projectId } = useParams(); // 🔥 dynamic project

  return (
    <div className="font-display bg-background-light dark:bg-background-dark min-h-screen flex flex-col items-center py-8 px-4 lg:px-10">

      {/* ================= BREADCRUMB ================= */}
      <div className="flex gap-2 text-sm w-full max-w-[1200px]">
        <button onClick={() => navigate("/projects")} className="text-primary-accent">
          Projects
        </button>
        <span>/</span>
        <button onClick={() => navigate(`/projects/${projectId}`)} className="text-primary-accent">
          Project
        </button>
        <span>/</span>
        <span>Artifacts</span>
      </div>

      {/* ================= TITLE ================= */}
      <div className="w-full max-w-[1200px] py-4">
        <h1 className="text-3xl md:text-4xl font-black">Artifacts</h1>
      </div>

      {/* ================= CARDS ================= */}
      <div className="mt-6 w-full max-w-[1200px] grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ================= SRS CARD ================= */}
        <div className="bg-card-light dark:bg-card-dark rounded-xl border p-5 shadow-sm hover:shadow-lg transition">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-blue-500">description</span>
            <h3 className="font-bold">SRS Document</h3>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Software Requirements Specification
          </p>

          <div className="flex justify-end">
            <button
              onClick={() => alert("SRS coming soon")}
              className="text-primary font-bold flex items-center gap-1"
            >
              View <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* ================= UML CARD ================= */}
        <div className="bg-card-light dark:bg-card-dark rounded-xl border p-5 shadow-sm hover:shadow-lg transition">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-purple-500">account_tree</span>
            <h3 className="font-bold">UML Diagrams</h3>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            View generated UML diagrams (Usecase, Class, Sequence)
          </p>

          <div className="flex justify-end">
            <button
              onClick={() => navigate(`/projects/${projectId}/artifacts/uml-view`)} 
              className="text-primary font-bold flex items-center gap-1"
            >
              View <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}