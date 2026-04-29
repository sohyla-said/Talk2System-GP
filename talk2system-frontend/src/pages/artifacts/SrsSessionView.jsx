import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SrsMarkdownRenderer from "../../components/modals/SrsMarkdownRenderer";
import { getSessionSrsVersions, getSrsArtifact } from "../../api/srsAPI";

const BASE_URL = "http://localhost:8000";

export default function SrsSessionView() {
  const navigate = useNavigate();
  const { projectId, sessionId } = useParams();

  const [artifactId, setArtifactId] = useState(null);
  const [versions, setVersions] = useState([]);
  const [previewText, setPreviewText] = useState(null);
  const [approved, setApproved] = useState(false);

  const fetchVersions = async () => {
    const res = await getSessionSrsVersions(projectId, sessionId);
    const fetched = res.data.versions || [];
    setVersions(fetched);
    if (fetched.length > 0) {
      const latest = fetched[0];
      setArtifactId(latest.id);
      setApproved(latest.approval_status === "approved");
      fetchPreview(latest.id);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [projectId, sessionId]);

  const fetchPreview = async (id) => {
    const res = await fetch(`${BASE_URL}/api/artifacts/${id}/srs-text`);
    const data = await res.json();
    setPreviewText(data.text);
  };

  const handleSelectVersion = async (id) => {
    const res = await getSrsArtifact(id);
    setArtifactId(res.data.id);
    setApproved(res.data.approval_status === "approved");
    fetchPreview(res.data.id);
  };

  const handleExport = () => {
    if (!artifactId) return;
    window.open(`${BASE_URL}/api/artifacts/${artifactId}/download-srs`);
  };

  return (
    <div className="font-display bg-background-light dark:bg-background-dark min-h-screen text-[#100d1c] dark:text-white">
      <main className="max-w-6xl mx-auto pt-8 px-4 pb-16">

        {/* Breadcrumb */}
        <div className="flex gap-2 text-sm mb-6">
          <button onClick={() => navigate("/projects")} className="text-primary-accent dark:text-secondary-accent font-medium">Projects</button>
          <span>/</span>
          <button onClick={() => navigate(`/projects/${projectId}`)} className="text-primary-accent dark:text-secondary-accent font-medium">Project</button>
          <span>/</span>
          <button onClick={() => navigate(`/projects/${projectId}/sessions/${sessionId}/artifacts`)} className="text-primary-accent dark:text-secondary-accent font-medium">
            Session {sessionId}
          </button>
          <span>/</span>
          <span>SRS</span>
        </div>

        <h1 className="text-4xl font-black mb-6">SRS Document</h1>

        {/* Controls */}
        <div className="bg-white dark:bg-background-dark rounded-xl shadow mb-4">
          <div className="flex justify-between items-center gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-700">

            <select
              onChange={(e) => handleSelectVersion(e.target.value)}
              value={artifactId || ""}
              className="border px-4 py-2 rounded-lg dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="" disabled>Select Version</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.version} — {v.approval_status}
                </option>
              ))}
            </select>

            <button
              onClick={handleExport}
              disabled={!artifactId}
              className="h-10 px-4 rounded-lg flex items-center gap-2 bg-gray-200 dark:bg-gray-700 disabled:opacity-50 hover:opacity-90 transition"
            >
              <span className="material-symbols-outlined">download</span>
              Export
            </button>
          </div>
        </div>

        {/* Approval badge */}
        {artifactId && (
          <div className="mb-4">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${approved ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"}`}>
              {approved ? "✓ Approved" : "Pending Approval"}
            </span>
          </div>
        )}

        {/* IEEE Preview layout */}
        {previewText ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* SIDEBAR — Table of Contents */}
            <aside className="lg:col-span-1 lg:sticky lg:top-24 self-start">
              <div className="flex flex-col gap-3 bg-white dark:bg-[#1a1730] p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="material-symbols-outlined text-primary dark:text-indigo-300">menu_book</span>
                  <h2 className="text-sm font-bold text-[#100d1c] dark:text-white">Table of Contents</h2>
                </div>
                <nav className="flex flex-col gap-0.5 text-sm">
                  {[
                    { id: "s1", icon: "info",        label: "1. Introduction" },
                    { id: "s2", icon: "table_rows",  label: "2. Overall Description" },
                    { id: "s3", icon: "list",        label: "3. Functional Requirements" },
                    { id: "s4", icon: "security",    label: "4. Non-Functional Req." },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        const el = document.getElementById(item.id);
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-indigo-300 transition text-left w-full"
                    >
                      <span className="material-symbols-outlined text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* DOCUMENT BODY */}
            <article className="lg:col-span-3 bg-white dark:bg-[#1a1730] rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-visible">

              {/* Document header bar */}
              <div className="bg-[#1E105F] dark:bg-[#0f0a2e] px-8 py-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">IEEE Std 830</p>
                <h1 className="text-2xl font-black">Software Requirements Specification</h1>
                <p className="text-sm opacity-60 mt-1">
                  Session #{sessionId} · {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>

              {/* Approval ribbon */}
              <div className={`px-8 py-2 text-xs font-semibold flex items-center gap-2 ${
                approved
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-b border-green-200 dark:border-green-800"
                  : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-b border-yellow-200 dark:border-yellow-800"
              }`}>
                <span className="material-symbols-outlined text-base">{approved ? "verified" : "pending"}</span>
                {approved ? "This document has been approved" : "Pending approval — review before finalizing"}
              </div>

              {/* Rendered content */}
              <div className="px-8 py-8">
                <SrsMarkdownRenderer text={previewText} />
              </div>
            </article>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1f1c2e] rounded-xl border p-10 min-h-[300px] flex items-center justify-center">
            <p className="text-gray-400 text-center">No SRS document available for this session.</p>
          </div>
        )}

      </main>
    </div>
  );
}