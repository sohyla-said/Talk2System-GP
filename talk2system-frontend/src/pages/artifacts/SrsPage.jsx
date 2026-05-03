import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getToken } from "../../api/authApi";
import SrsApprovalModal from "../../components/modals/SrsApprovalModal";
import {
  generateSessionSRS,
  generateProjectSRS,
  getSessionSrsVersions,
  getSrsArtifact,
  approveSrsArtifact,
  downloadSrs,
} from "../../api/srsAPI";

// =============================================
// FORMAT OPTIONS
// =============================================
const FORMAT_OPTIONS = [
  {
    value: "ieee_830",
    label: "IEEE 830",
    badge: "1998 · Deprecated",
    badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    description: "Classic, widely recognized standard. Simple structure, best for academic use.",
  },
  {
    value: "iso_iec_29148",
    label: "ISO/IEC/IEEE 29148",
    badge: "2018 · Current Standard",
    badgeColor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    description: "Full lifecycle coverage with traceability and verification sections. Industry gold standard.",
  },
  {
    value: "modern_agile",
    label: "Modern Agile SRS",
    badge: "Recent · User-Centric",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    description: "User story format with acceptance criteria. Ideal for AI/modern systems and agile teams.",
  },
];

// =============================================
// BENCHMARKING TABLE DATA
// =============================================
const BENCHMARK_ROWS = [
  { criteria: "Year",                 ieee: "1998",           iso: "2011 / 2018",       agile: "Recent" },
  { criteria: "Status",               ieee: "⚠️ Deprecated",  iso: "✅ Current",         agile: "Not official" },
  { criteria: "Complexity",           ieee: "Low",            iso: "High",               agile: "Medium" },
  { criteria: "Lifecycle Coverage",   ieee: "❌ No",           iso: "✅ Full lifecycle",  agile: "⚠️ Partial" },
  { criteria: "Verification Section", ieee: "❌",              iso: "✅",                 agile: "✅" },
  { criteria: "Traceability",         ieee: "❌",              iso: "✅",                 agile: "✅ Often better" },
  { criteria: "AI / Modern Systems",  ieee: "❌",              iso: "⚠️ Limited",        agile: "✅ Strong" },
  { criteria: "Ease of Use",          ieee: "⭐⭐⭐⭐",          iso: "⭐⭐",                agile: "⭐⭐⭐⭐" },
  { criteria: "Academic Use",         ieee: "⭐⭐⭐⭐⭐",         iso: "⭐⭐⭐",               agile: "⭐⭐⭐" },
  { criteria: "Industry Use",         ieee: "⭐⭐",             iso: "⭐⭐⭐⭐⭐",             agile: "⭐⭐⭐⭐" },
];

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
  "1.": "s1", "2.": "s2", "3.": "s3", "4.": "s4",
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
// BENCHMARKING TABLE COMPONENT
// =============================================
function BenchmarkTable({ selectedFormat, onSelect }) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <button
        onClick={() => setVisible(v => !v)}
        className="flex items-center gap-1.5 text-sm font-semibold text-primary dark:text-indigo-300 hover:underline"
      >
        <span className="material-symbols-outlined text-base">
          {visible ? "expand_less" : "expand_more"}
        </span>
        {visible ? "Hide format comparison" : "Compare formats to help you choose"}
      </button>

      {visible && (
        <div className="mt-3 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto shadow-sm">
          <table className="w-full text-sm border-collapse min-w-[560px]">
            <thead>
              <tr className="bg-[#1E105F] text-white">
                <th className="px-4 py-3 text-left font-bold w-[200px]">Criteria</th>
                {FORMAT_OPTIONS.map(f => (
                  <th
                    key={f.value}
                    className={`px-4 py-3 text-center font-bold cursor-pointer transition-colors ${
                      selectedFormat === f.value ? "bg-white/20" : "hover:bg-white/10"
                    }`}
                    onClick={() => onSelect(f.value)}
                  >
                    {f.label}
                    {selectedFormat === f.value && (
                      <span className="ml-1.5 text-[10px] bg-white/25 px-1.5 py-0.5 rounded-full align-middle">selected</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BENCHMARK_ROWS.map((row, i) => (
                <tr key={row.criteria} className={i % 2 === 0 ? "bg-white dark:bg-[#1a1730]" : "bg-gray-50 dark:bg-[#13112a]"}>
                  <td className="px-4 py-2.5 font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800">
                    {row.criteria}
                  </td>
                  <td className={`px-4 py-2.5 text-center border-b border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 ${selectedFormat === "ieee_830" ? "bg-primary/5 dark:bg-primary/10" : ""}`}>
                    {row.ieee}
                  </td>
                  <td className={`px-4 py-2.5 text-center border-b border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 ${selectedFormat === "iso_iec_29148" ? "bg-primary/5 dark:bg-primary/10" : ""}`}>
                    {row.iso}
                  </td>
                  <td className={`px-4 py-2.5 text-center border-b border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 ${selectedFormat === "modern_agile" ? "bg-primary/5 dark:bg-primary/10" : ""}`}>
                    {row.agile}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 dark:text-gray-500 px-4 py-2 italic">
            Tip: Click a column header to select that format directly.
          </p>
        </div>
      )}
    </div>
  );
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
  const [hasNewUnapproved, setHasNewUnapproved] = useState(false); // ✅ NEW
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [srsContent, setSrsContent] = useState(null);
  const [srsApproval, setSrsApproval] = useState({
    approved_members_count: 0,
    total_members_count: 0,
    current_user_approved: false,
    all_members_approved: false,
    status: "pending",
    exists: false,
  });

  // track whether we came from the project-level requirements page
  const [isProjectSource, setIsProjectSource] = useState(false);
  const [formatVersion, setFormatVersion] = useState("ieee_830");

  const getAuthHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const refreshSrsApproval = async (resolvedSessionId = sessionId) => {
    if (!resolvedSessionId) return;

    try {
      const res = await fetch(
        `${BASE_URL}/api/sessions/${resolvedSessionId}/features/approval-status`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) return;

      const data = await res.json();
      const feature = Array.isArray(data.features)
        ? data.features.find((f) => f.feature === "srs")
        : null;
      if (!feature) return;

      setSrsApproval(feature);
      setApproved(Boolean(feature.current_user_approved));
    } catch (err) {
      console.error("Failed to load SRS approval status:", err);
    }
  };

  // ===============================
  // RESOLVE SESSION ID
  // ===============================
  useEffect(() => {
    const source = location.state?.source;

    if (source === "project") {
      // Came from Requirements_project_view — use project-level generation
      setIsProjectSource(true);
      // No session needed for project-level generation
    } else {
      // Session-level flow (existing behavior unchanged)
      setIsProjectSource(false);
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
    }
  }, [projectId, urlSessionId, location.state]);

  // ===============================
  // FETCH VERSIONS
  // ===============================
  const fetchVersions = async (resolvedSessionId = sessionId) => {
    try {
      let res;

      if (isProjectSource) {
        // Project-level: fetch from project SRS versions endpoint
        res = await fetch(`${BASE_URL}/api/projects/${projectId}/srs/versions`);
      } else {
        if (!resolvedSessionId) return;
        res = await fetch(
          `${BASE_URL}/api/projects/${projectId}/sessions/${resolvedSessionId}/srs/versions`
        );
      }

      if (!res.ok) { setVersions([]); return; }
      const data = await res.json();
      let fetched = data.versions || [];

      // For project source, only show artifacts with no session_id (project-level only)
      if (isProjectSource) {
        fetched = fetched.filter((v) => !v.session_id);
      }

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
    if (isProjectSource) {
      fetchVersions();
      // No approval refresh needed for project-level artifacts
    } else if (sessionId) {
      fetchVersions(sessionId);
      refreshSrsApproval(sessionId);
    }
  }, [sessionId, isProjectSource]);

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
        if (isProjectSource) {
      // PROJECT-LEVEL generation — new path, touches nothing in session logic
      try {
        setLoading(true);
        const res = await fetch(
          `${BASE_URL}/api/projects/${projectId}/generate-srs?format_version=${formatVersion}`,
          { method: "POST", headers: getAuthHeaders() }
        );
        if (!res.ok) throw new Error("SRS generation failed");
        const data = await res.json();
        const artifact = data.artifact;
        setArtifactId(artifact.id);
        setSrsContent(artifact.file_path);
        fetchSrsText(artifact.id);
        setApproved(false);
        fetchVersions(); // project-level fetchVersions (no sessionId needed)
      } catch (err) {
        console.error(err);
        alert("SRS generation failed. Make sure Ollama is running.");
      } finally {
        setLoading(false);
      }
      return; // ✅ Early return — session logic below never runs for project source
    }

    if (!sessionId) {
      alert("No session found. Please start a meeting session first.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(
        `${BASE_URL}/api/projects/${projectId}/sessions/${sessionId}/generate-srs?format_version=${formatVersion}`,
        { method: "POST", headers: getAuthHeaders() }
      );
      if (!res.ok) throw new Error("SRS generation failed");
      const data = await res.json();
      const artifact = data.artifact;
      setArtifactId(artifact.id);
      setSrsContent(artifact.file_path);
      fetchSrsText(artifact.id);
      setApproved(false);
      setHasNewUnapproved(true); 

      
      setSrsApproval((prev) => ({
        ...prev,
        approved_members_count: 0,
        current_user_approved: false,
        all_members_approved: false,
        status: "pending",
      }));

      
      await fetch(
        `${BASE_URL}/api/sessions/${sessionId}/features/srs/approvals`,
        { method: "DELETE", headers: getAuthHeaders() }
      );

      fetchVersions(sessionId);
      refreshSrsApproval(sessionId);
    } catch (err) {
      console.error(err);
      alert("SRS generation failed. Make sure Ollama is running.");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // APPROVE (project-level — direct artifact approval)
  // ===============================
  const handleProjectApprove = async () => {
    if (!artifactId) return;
    try {
      const res = await approveSrsArtifact(artifactId); // calls POST /api/artifacts/{id}/approve
      setApproved(res.data.status === "approved" || res.data.approval_status === "approved");
      fetchVersions(); // refresh version dropdown to show updated status
    } catch (err) {
      console.error("Failed to approve project SRS artifact:", err);
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
      setApproved(
        Boolean(srsApproval.current_user_approved) || res.data.approval_status === "approved"
      );
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
      const response = await fetch(
        `${BASE_URL}/api/sessions/${sessionId}/features/srs/approve`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || "Failed to approve SRS");
      }

      setSrsApproval(data);
      setApproved(Boolean(data.current_user_approved));
      setHasNewUnapproved(false); 
      setShowApprovalModal(false);

      const newStatus = data.all_members_approved ? "processing" : "pending approval";
      await fetch(
        `${BASE_URL}/api/sessions/${sessionId}/status?status=${newStatus}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );

      if (data.all_members_approved && artifactId) {
        await approveSrsArtifact(artifactId);
        fetchVersions(sessionId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Derived: is the button currently in "approved" display state?
  const isApprovedState = approved && !hasNewUnapproved; 

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
          {isProjectSource && (
            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              Project-Level
            </span>
          )}
        </div>


        {/* Title */}
        <div className="mb-6">
          <h1 className="text-4xl font-black">SRS Document</h1>
          {!isProjectSource && sessionId && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Session #{sessionId}</p>
          )}
          {isProjectSource && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Generated from all project sessions' aggregated requirements
            </p>
          )}
        </div>

        {/* =============================================
            FORMAT SELECTOR SECTION
        ============================================= */}
        <div className="bg-white dark:bg-[#1a1730] rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary dark:text-indigo-300">auto_stories</span>
            <h2 className="text-sm font-bold text-gray-800 dark:text-white">Choose SRS Format Standard</h2>
          </div>

          {/* Radio cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {FORMAT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                  formatVersion === opt.value
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-gray-200 dark:border-gray-700 hover:border-primary/40"
                }`}
              >
                <input
                  type="radio"
                  name="formatVersion"
                  value={opt.value}
                  checked={formatVersion === opt.value}
                  onChange={() => setFormatVersion(opt.value)}
                  className="hidden"
                />
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-bold ${formatVersion === opt.value ? "text-primary dark:text-indigo-300" : "text-gray-800 dark:text-white"}`}>
                      {opt.label}
                    </span>
                    {formatVersion === opt.value && (
                      <span className="material-symbols-outlined text-primary dark:text-indigo-300 text-base">check_circle</span>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit ${opt.badgeColor}`}>
                    {opt.badge}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {/* Benchmarking comparison toggle */}
          <BenchmarkTable selectedFormat={formatVersion} onSelect={setFormatVersion} />
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-background-dark rounded-xl shadow mb-4">
          <div className="flex justify-between items-center gap-3 px-4 py-3">

            {/* LEFT */}
            <div className="flex gap-3 items-center">
              <button
                onClick={handleGenerate}
                disabled={loading || (!isProjectSource && !sessionId)}
                className="h-10 px-4 rounded-lg bg-primary text-white disabled:opacity-50"
              >
                {loading ? "Generating..." : "Generate SRS"}
              </button>

              {/* Format badge shown next to button so user sees what will be generated */}
              {(() => {
                const opt = FORMAT_OPTIONS.find(f => f.value === formatVersion);
                return opt ? (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${opt.badgeColor}`}>
                    {opt.label}
                  </span>
                ) : null;
              })()}

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

              {/* APPROVE */}
              {isProjectSource ? (
                // Project-level: direct artifact approval
                <button
                  onClick={handleProjectApprove}
                  disabled={approved || !artifactId}
                  className={`h-10 px-6 rounded-lg flex items-center gap-2 text-white ${approved ? "bg-green-600" : "bg-primary"}`}
                >
                  <span className="material-symbols-outlined">{approved ? "check_circle" : "approval"}</span>
                  {approved ? "Approved" : "Approve"}
                </button>
              ) : (
              <button
                onClick={() => setShowApprovalModal(true)}
                disabled={isApprovedState || !artifactId}
                className={`h-10 px-6 rounded-lg flex items-center gap-2 text-white ${isApprovedState ? "bg-green-600" : "bg-primary"}`}
              >
                <span className="material-symbols-outlined">{isApprovedState ? "check_circle" : "approval"}</span>
                {isApprovedState ? "Approved" : "Approve"}
              </button>
              )}
            </div>
          </div>
        </div>

        {/* Approval badge */}
        {artifactId && (
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isApprovedState ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"}`}>
              {isApprovedState ? "✓ Approved" : "Pending Approval"}
            </span>
            {!isProjectSource && (
              <span className="text-xs text-gray-600 dark:text-gray-300">
                SRS approvals: {srsApproval.approved_members_count}/{srsApproval.total_members_count}
                {srsApproval.all_members_approved ? " (all approved)" : " (waiting for members)"}
              </span>
            )}
            {isProjectSource && !approved && (
              <span className="text-xs text-gray-600 dark:text-gray-300">
                Pending approval by project manager
              </span>
            )}
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
                    { id: "s1", icon: "info",             label: "1. Introduction" },
                    { id: "s2", icon: "table_rows",       label: "2. Overall Description" },
                    { id: "s3", icon: "check_circle",     label: "3. Functional Requirements" },
                    { id: "s4", icon: "tune",             label: "4. Non-Functional Requirements" },
                  ].map(({ id, icon, label }) => (
                    <a
                      key={id}
                      href={`#${id}`}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-primary dark:hover:text-indigo-300 transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">{icon}</span>
                      {label}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            {/* DOCUMENT BODY */}
            <article className="lg:col-span-3 bg-white dark:bg-[#1a1730] rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-visible">
              <div className={`px-8 py-2 text-xs font-semibold flex items-center gap-2 ${
                isApprovedState
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-b border-green-200 dark:border-green-800"
                  : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-b border-yellow-200 dark:border-yellow-800"
              }`}>
                <span className="material-symbols-outlined text-base">{isApprovedState ? "verified" : "pending"}</span>
                {isApprovedState ? "This document has been approved" : "Pending approval — review before finalizing"}
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
            <p className="text-gray-400 text-center">No SRS document generated yet. Choose a format above and click "Generate SRS" to start.</p>
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

      {/* MODAL — only for session-level approval flow */}
      {!isProjectSource && showApprovalModal && (
        <SrsApprovalModal
          onClose={() => setShowApprovalModal(false)}
          onApprove={handleApprove}
        />
      )}
    </div>
  );
}