import React, { useState, useEffect } from "react";
import EmptyArtifacts from "../../pages/artifacts/EmptyArtifactsPage";
import { getSessionArtifacts,checkSummary } from "../../api/artifactsAPI";
import { useNavigate, useParams } from "react-router-dom";

export default function SessionResults() {
  const navigate = useNavigate();
  const { sessionId, projectId } = useParams();
  const [loading, setLoading] = useState(true);
  const [hasUML, setHasUML] = useState(false);
  const [hasSummary, setHasSummary] = useState(false);
  // const [hasSRS, setHasSRS] = useState(false); // future-ready

  useEffect(() => {
    const load = async () => {
      try {
        const umlData = await getSessionArtifacts(projectId, sessionId);
        setHasUML(umlData.length > 0);

        const summaryExists = await checkSummary(sessionId);
        setHasSummary(summaryExists);

        // 🔜 later when SRS exists:
        // const srsExists = await checkSRS(sessionId);
        // setHasSRS(srsExists);

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [projectId, sessionId]);

  if (loading) return <p className="p-8 text-gray-400">Loading...</p>;

  if (!hasUML && !hasSummary /* && !hasSRS */) {
    return (
      <EmptyArtifacts
        projectId={projectId}
        sessionId={sessionId}
        isSession={true}
      />
    );
  }

  return (
    <div className="font-display bg-background-light dark:bg-background-dark min-h-screen flex flex-col items-center py-8 px-4 lg:px-10">

      {/* BREADCRUMB */}
      <div className="flex gap-2 text-sm w-full max-w-[1200px] mb-4">
        <button onClick={() => navigate("/projects")} className="text-primary-accent dark:text-secondary-accent font-medium">
          Projects
        </button>
        <span>/</span>
        <button onClick={() => navigate(`/projects/${projectId}`)} className="text-primary-accent dark:text-secondary-accent font-medium">
          Project
        </button>
        <span>/</span>
        <span>Session #{sessionId} Artifacts</span>
      </div>

      {/* TITLE */}
      <div className="w-full max-w-[1200px] py-4">
        <h1 className="text-3xl md:text-4xl font-black">Session Artifacts</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Artifacts generated from Session #{sessionId}
        </p>
      </div>

      {/* CARDS */}
      <div className="mt-6 w-full max-w-[1200px] grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* UML CARD */}
        {hasUML && (
          <div
            onClick={() => navigate(`/projects/${projectId}/sessions/${sessionId}/artifacts/uml`)}
            className="bg-card-light dark:bg-card-dark rounded-xl border p-5 shadow-sm hover:shadow-lg transition cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-purple-500">account_tree</span>
              <h3 className="font-bold">UML Diagrams</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              View generated UML diagrams for this session (Usecase, Class, Sequence)
            </p>
            <div className="flex justify-end">
              <button className="text-primary font-bold flex items-center gap-1">
                View <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* Summary CARD */}
        {hasSummary && (
          <div
            onClick={() => navigate(`/summary/${sessionId}`)}
            className="bg-card-light dark:bg-card-dark rounded-xl border p-5 shadow-sm hover:shadow-lg transition cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-purple-500">account_tree</span>
              <h3 className="font-bold">Summary</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            View the summary for this session
          </p>
          <div className="flex justify-end">
            <button className="text-primary font-bold flex items-center gap-1">
              View <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}