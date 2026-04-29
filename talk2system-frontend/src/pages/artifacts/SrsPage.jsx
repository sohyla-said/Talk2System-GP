import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import SrsApprovalModal from "../../components/modals/SrsApprovalModal";
import {
  generateSessionSRS,
  getSessionSrsVersions,
  getSrsArtifact,
  approveSrsArtifact,
  downloadSrs,
} from "../../api/srsAPI";

const BASE_URL = "http://localhost:8000";

// =============================================
// INLINE BOLD RENDERER
// =============================================
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="font-bold text-[#1E105F] dark:text-indigo-300">{part.slice(2, -2)}</strong>
      : part
  );
}

// =============================================
// SECTION ANCHOR MAP
// =============================================
const SECTION_IDS = {
  "1.": "s1", "2.": "s2", "3.": "s3","4.": "s4", 
};

// =============================================
// SRS MARKDOWN RENDERER
// =============================================
function SrsMarkdownRenderer({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      elements.push(<div key={key++} className="h-3" />);
      continue;
    }

    const sectionKey = Object.keys(SECTION_IDS).find(k =>
      line.replace(/^#+\s*/, "").startsWith(k)
    );
    const anchorId = sectionKey ? SECTION_IDS[sectionKey] : undefined;

    if (line.startsWith("#### ")) {
      elements.push(
        <h4 key={key++} className="text-base font-bold mt-4 mb-1 text-[#1E105F] dark:text-indigo-300">
          {renderInline(line.slice(5))}
        </h4>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={key++} className="text-lg font-bold mt-5 mb-2 text-[#1E105F] dark:text-indigo-300">
          {renderInline(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} id={anchorId} className="text-xl font-bold mt-6 mb-2 text-[#100d1c] dark:text-white border-b border-gray-200 dark:border-gray-700 pb-1 scroll-mt-28">
          {renderInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1 key={key++} id={anchorId} className="text-2xl font-black mt-8 mb-3 text-[#1E105F] dark:text-indigo-200 scroll-mt-28">
          {renderInline(line.slice(2))}
        </h1>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={key++} className="ml-5 list-disc text-gray-700 dark:text-gray-300 mb-1">
          {renderInline(line.slice(2))}
        </li>
      );
    } else if (/^\d+\./.test(line)) {
      elements.push(
        <li key={key++} className="ml-5 list-decimal text-gray-700 dark:text-gray-300 mb-1">
          {renderInline(line)}
        </li>
      );
    } else if (line.startsWith("|") && line.includes("|")) {
      const cells = line.split("|").filter(c => c.trim() !== "");
      const isHeader = lines[i + 1]?.includes("---");
      if (line.includes("---")) continue;
      elements.push(
        <div
          key={key++}
          className={`grid gap-px mb-px text-sm font-mono ${isHeader ? "bg-[#1E105F] text-white rounded-t" : "bg-gray-50 dark:bg-gray-800/50"}`}
          style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}
        >
          {cells.map((c, ci) => (
            <div
              key={ci}
              className={`px-3 py-1.5 ${isHeader ? "font-bold text-white" : "text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"}`}
            >
              {c.trim()}
            </div>
          ))}
        </div>
      );
    } else if (line.startsWith("---")) {
      elements.push(<hr key={key++} className="my-6 border-gray-200 dark:border-gray-700" />);
    } else {
      elements.push(
        <p key={key++} className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
          {renderInline(line)}
        </p>
      );
    }
  }

  return <div className="space-y-0.5">{elements}</div>;
}

// =============================================
// MAIN PAGE
// =============================================
export default function SrsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: projectId, sessionId: urlSessionId } = useParams();

  const [previewText, setPreviewText] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState([]);
  const [artifactId, setArtifactId] = useState(null);
  const [approved, setApproved] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [srsContent, setSrsContent] = useState(null);

  // ===============================
  // RESOLVE SESSION ID
  // ===============================
  useEffect(() => {
    const stateSessionId = location.state?.sessionId;
    if (stateSessionId) {
      setSessionId(stateSessionId);
    } else if (urlSessionId) {
      setSessionId(parseInt(urlSessionId));
    } else {
      const fetchLatestSession = async () => {
        try {
          const res = await fetch(`${BASE_URL}/api/sessions/project/${projectId}`);
          const data = await res.json();
          if (data && data.length > 0) setSessionId(data[0].id);
        } catch (err) {
          console.error("Failed to fetch sessions:", err);
        }
      };
      fetchLatestSession();
    }
  }, [projectId, urlSessionId, location.state]);

  // ===============================
  // FETCH VERSIONS
  // ===============================
  const fetchVersions = async (resolvedSessionId = sessionId) => {
    if (!resolvedSessionId) return;
    try {
      const res = await fetch(
        `${BASE_URL}/api/projects/${projectId}/sessions/${resolvedSessionId}/srs/versions`
      );
      if (!res.ok) { setVersions([]); return; }
      const data = await res.json();
      const fetched = data.versions || [];
      setVersions(fetched);
      if (fetched.length > 0) {
        const latest = fetched[0];
        setArtifactId(latest.id);
        setSrsContent(latest.file_path);
        setApproved(latest.approval_status === "approved");
        fetchSrsText(latest.id);
      } else {
        setArtifactId(null);
        setSrsContent(null);
        setApproved(false);
      }
    } catch (err) {
      console.error("fetchVersions error:", err);
    }
  };

  useEffect(() => {
    if (sessionId) fetchVersions(sessionId);
  }, [sessionId]);

  // ===============================
  // FETCH SRS TEXT FOR PREVIEW
  // ===============================
  const fetchSrsText = async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/api/artifacts/${id}/srs-text`);
      const data = await res.json();
      setPreviewText(data.text);
      setPreviewMode(true);
    } catch (err) {
      console.error("Failed to fetch SRS preview", err);
    }
  };

  // ===============================
  // GENERATE SRS
  // ===============================
  const handleGenerate = async () => {
    if (!sessionId) {
      alert("No session found. Please start a meeting session first.");
      return;
    }
    try {
      setLoading(true);
      const res = await generateSessionSRS(projectId, sessionId);
      const artifact = res.data.artifact;
      setArtifactId(artifact.id);
      setSrsContent(artifact.file_path);
      fetchSrsText(artifact.id);
      setApproved(false);
      fetchVersions(sessionId);
    } catch (err) {
      console.error(err);
      alert("SRS generation failed. Make sure Ollama is running.");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // SELECT VERSION
  // ===============================
  const handleSelectVersion = async (selectedId) => {
    try {
      const res = await getSrsArtifact(selectedId);
      setArtifactId(res.data.id);
      setSrsContent(res.data.file_path);
      setApproved(res.data.approval_status === "approved");
      setPreviewText(null);
      setPreviewMode(false);
      await fetchSrsText(res.data.id);
    } catch (err) {
      console.error(err);
    }
  };

  // ===============================
  // APPROVE
  // ===============================
  const handleApprove = async () => {
    try {
      await approveSrsArtifact(artifactId);
      setApproved(true);
      setShowApprovalModal(false);
      fetchVersions(sessionId);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="font-display bg-background-light dark:bg-background-dark min-h-screen text-[#100d1c] dark:text-white">
      <main className="max-w-6xl mx-auto pt-8 px-4 pb-16">

        {/* Breadcrumb */}
        <div className="flex flex-wrap gap-2 text-sm mb-6">
          <button onClick={() => navigate("/projects")} className="text-primary-accent dark:text-secondary-accent font-medium">Projects</button>
          <span>/</span>
          <button onClick={() => navigate(`/projects/${projectId}`)} className="text-primary-accent dark:text-secondary-accent font-medium">Project</button>
          <span>/</span>
          <span>SRS Document</span>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-4xl font-black">SRS Document</h1>
          {sessionId && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Session #{sessionId}</p>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-background-dark rounded-xl shadow mb-4">
          <div className="flex justify-between items-center gap-3 px-4 py-3">

            {/* LEFT */}
            <div className="flex gap-3 items-center">
              <button
                onClick={handleGenerate}
                disabled={loading || !sessionId}
                className="h-10 px-4 rounded-lg bg-primary text-white disabled:opacity-50"
              >
                {loading ? "Generating..." : "Generate SRS"}
              </button>

              <select
                onChange={(e) => handleSelectVersion(e.target.value)}
                className="border px-4 py-2 rounded-lg"
                value={artifactId || ""}
              >
                <option value="" disabled>Select Version</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.version} — {v.approval_status}
                  </option>
                ))}
              </select>
            </div>

            {/* RIGHT */}
            <div className="flex gap-3">
              <button
                onClick={() => downloadSrs(artifactId)}
                disabled={!artifactId}
                className="h-10 px-4 rounded-lg flex items-center gap-2 bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
              >
                <span className="material-symbols-outlined">download</span>
                Export
              </button>

              <button
                onClick={() => setShowApprovalModal(true)}
                disabled={approved || !artifactId}
                className={`h-10 px-6 rounded-lg flex items-center gap-2 text-white ${approved ? "bg-green-600" : "bg-primary"}`}
              >
                <span className="material-symbols-outlined">{approved ? "check_circle" : "approval"}</span>
                {approved ? "Approved" : "Approve"}
              </button>
            </div>
          </div>
        </div>

        {/* Approval badge */}
        {artifactId && (
          <div className="mb-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${approved ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"}`}>
              {approved ? "✓ Approved" : "Pending Approval"}
            </span>
          </div>
        )}

        {/* Tab toggle */}
        {srsContent && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setPreviewMode(false)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${!previewMode ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}
            >
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-base">download</span>
                Download
              </span>
            </button>
            <button
              onClick={() => {
                if (!previewText && artifactId) fetchSrsText(artifactId);
                setPreviewMode(true);
              }}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${previewMode ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}
            >
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-base">visibility</span>
                Preview
              </span>
            </button>
          </div>
        )}

        {/* Main content area */}
        {loading ? (
          <div className="bg-white dark:bg-[#1f1c2e] rounded-xl border p-6 min-h-[300px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Generating SRS Document via Ollama...</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">This may take several minutes</p>
            </div>
          </div>
        ) : previewMode && previewText ? (
          // ===================== IEEE PREVIEW LAYOUT =====================
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

              {/* Rendered markdown */}
              <div className="px-8 py-8">
                <SrsMarkdownRenderer text={previewText} />
              </div>
            </article>
          </div>

        ) : srsContent ? (
          // ===================== DOWNLOAD VIEW =====================
          <div className="bg-white dark:bg-[#1f1c2e] rounded-xl border p-10 min-h-[300px] flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-blue-500">description</span>
            </div>
            <p className="font-bold text-gray-700 dark:text-gray-300 text-lg">SRS Document ready</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{srsContent.split("/").pop()}</p>
            <button
              onClick={() => downloadSrs(artifactId)}
              className="mt-2 h-10 px-6 rounded-lg bg-primary text-white flex items-center gap-2 hover:opacity-90 transition"
            >
              <span className="material-symbols-outlined">download</span>
              Download .docx
            </button>
          </div>

        ) : (
          <div className="bg-white dark:bg-[#1f1c2e] rounded-xl border p-10 min-h-[300px] flex items-center justify-center">
            <p className="text-gray-400 text-center">No SRS document generated yet. Click "Generate SRS" to start.</p>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Generating SRS Document...</p>
              <p className="text-xs text-gray-400">Ollama is writing your document. Please wait.</p>
            </div>
          </div>
        )}

      </main>

      {showApprovalModal && (
        <SrsApprovalModal
          onClose={() => setShowApprovalModal(false)}
          onApprove={handleApprove}
        />
      )}
    </div>
  );
}