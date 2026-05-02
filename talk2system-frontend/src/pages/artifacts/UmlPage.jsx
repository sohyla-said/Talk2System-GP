import { useEffect, useState } from "react";
import UMLApprovalModal from "../../components/modals/UMLApprovalModal";
import { useNavigate, useParams, useLocation } from "react-router-dom"; // ✅ add useLocation
import { getToken } from "../../api/authApi";

import {
  generateUML,
  getVersions,
  getArtifact,
  approveArtifact,
  downloadArtifact,
} from "../../api/umlAPI";

const BASE_URL = "http://localhost:8000";

export default function UmlPage() {
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approved, setApproved] = useState(false);
  const [umlApproval, setUmlApproval] = useState({
    approved_members_count: 0,
    total_members_count: 0,
    current_user_approved: false,
    all_members_approved: false,
    status: "pending",
    exists: false,
  });
  const [diagramType, setDiagramType] = useState("usecase");

  const [diagramUrl, setDiagramUrl] = useState(null);
  const [artifactId, setArtifactId] = useState(null);
  const [versions, setVersions] = useState([]);
  const [sessionId, setSessionId] = useState(null);

  const navigate = useNavigate();
  const location = useLocation(); // ✅ NEW
  const { id: projectId } = useParams();
  const [loading, setLoading] = useState(false);

  const getAuthHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // ===============================
  // RESOLVE SESSION ID
  // Priority: route state (came from a specific session) > latest session fallback
  // ===============================
  useEffect(() => {
    const stateSessionId = location.state?.sessionId;

    if (stateSessionId) {
      // ✅ Came from a specific session — use it directly, no fetch needed
      setSessionId(stateSessionId);
    } else {
      // ✅ Accessed directly (e.g. from project Artifacts tab) — use latest session
      const fetchLatestSession = async () => {
        try {
          const res = await fetch(`${BASE_URL}/api/sessions/project/${projectId}`);
          const data = await res.json();
          if (data && data.length > 0) {
            setSessionId(data[0].id);
          }
        } catch (err) {
          console.error("Failed to fetch sessions:", err);
        }
      };
      fetchLatestSession();
    }
  }, [projectId, location.state]);

  const fetchVersions = async (resolvedSessionId = sessionId) => {
    if (!resolvedSessionId) return;

    try {
      const res = await fetch(
        `${BASE_URL}/api/projects/${projectId}/sessions/${resolvedSessionId}/artifacts/${diagramType}/versions`
      );

      if (!res.ok) {
        console.error(`Versions fetch failed: ${res.status}`);
        setVersions([]);
        setDiagramUrl(null);
        setArtifactId(null);
        setApproved(false);
        return;
      }

      const data = await res.json();
      const fetchedVersions = data.versions || [];
      setVersions(fetchedVersions);

      if (fetchedVersions.length > 0) {
        const latest = fetchedVersions[0];
        setDiagramUrl(`${BASE_URL}/${latest.file_path}`);
        setArtifactId(latest.id);
        setApproved(latest.approval_status === "approved");
      } else {
        setDiagramUrl(null);
        setArtifactId(null);
        setApproved(false);
      }
    } catch (err) {
      console.error("fetchVersions error:", err);
    }
  };

  const refreshUmlApproval = async (resolvedSessionId = sessionId) => {
    if (!resolvedSessionId) return;

    try {
      const res = await fetch(
        `${BASE_URL}/api/sessions/${resolvedSessionId}/features/approval-status`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) return;

      const data = await res.json();
      const feature = Array.isArray(data.features)
        ? data.features.find((f) => f.feature === "uml")
        : null;
      if (!feature) return;

      setUmlApproval(feature);
      setApproved(Boolean(feature.current_user_approved));
    } catch (err) {
      console.error("Failed to load UML approval status:", err);
    }
  };

  // In handleGenerate, pass sessionId explicitly:
  const handleGenerate = async () => {
    if (!sessionId) {
      alert("No session found for this project. Please start a meeting session first.");
      return;
    }
    
    try {
      setLoading(true);
      const res = await generateUML(projectId, sessionId, diagramType);
      const filePath = res.data.file_path;
      const artifact = res.data.artifact;
      setDiagramUrl(`${BASE_URL}/${filePath}`);
      setArtifactId(artifact.id);
      setApproved(false);
      fetchVersions(sessionId); // ✅ pass explicitly, no stale closure risk
      refreshUmlApproval(sessionId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when diagramType changes OR when sessionId is first resolved
  useEffect(() => {
    if (sessionId) {
      fetchVersions();
      refreshUmlApproval();
    }
  }, [diagramType, sessionId]); // ✅ sessionId in deps ensures fetch waits for resolution

  // ===============================
  // SELECT VERSION
  // ===============================
  const handleSelectVersion = async (artifactId) => {
    try {
      const res = await getArtifact(artifactId);
      setDiagramUrl(`${BASE_URL}/${res.data.file_path}`);
      setArtifactId(res.data.id);
      setApproved(Boolean(umlApproval.current_user_approved) || res.data.approval_status === "approved");
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
        `${BASE_URL}/api/sessions/${sessionId}/features/uml/approve`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || "Failed to approve UML");
      }

      setUmlApproval(data);
      setApproved(Boolean(data.current_user_approved));
      setShowApprovalModal(false);

      if (data.all_members_approved && artifactId) {
        await approveArtifact(artifactId);
        fetchVersions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ===============================
  // EXPORT
  // ===============================
  const handleExportClick = async (e) => {
    e.preventDefault();
    if (!artifactId) return;
    window.open(`${BASE_URL}/api/artifacts/${artifactId}/download`);
  };

  return (
    <div className="font-display bg-background-light dark:bg-background-dark min-h-screen text-[#100d1c] dark:text-white">
      
      <main className="max-w-5xl mx-auto pt-8 px-4">

        {/* Breadcrumb */}
        <div className="flex flex-wrap gap-2 text-sm">
          <button 
            onClick={() => navigate("/projects")}
            className="text-primary-accent dark:text-secondary-accent font-medium"
          >
            Projects
          </button>
          <span>/</span>
          <button 
            onClick={() => navigate(`/projects/${projectId}`)}
            className="text-primary-accent dark:text-secondary-accent font-medium"
          >
            Project
          </button>
          <span>/</span>
          <span>UML Diagrams</span>
        </div>

        {/* TITLE */}
        <div className="mb-6">
          <h1 className="text-4xl font-black">UML Diagrams</h1>
          {sessionId && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Session #{sessionId}
            </p>
          )}
        </div>

        {/* DIAGRAM TYPE */}
        <div className="bg-white dark:bg-background-dark rounded-xl shadow mb-4">

          <div className="flex gap-2 p-2 bg-[#e9e7f4] dark:bg-background-dark rounded-lg">
            {["usecase", "class", "sequence"].map((type) => (
              <label
                key={type}
                className={`flex-1 cursor-pointer text-center px-3 py-2 rounded-lg text-sm font-medium
                  ${diagramType === type
                    ? "bg-primary text-white shadow"
                    : "text-[#57499c] dark:text-white/60"
                  }`}
              >
                <input
                  type="radio"
                  className="hidden"
                  checked={diagramType === type}
                  onChange={() => setDiagramType(type)}
                />
                {type}
              </label>
            ))}
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex justify-between items-center gap-3 px-4 py-3 border-t">

            {/* LEFT SIDE */}
            <div className="flex gap-3 items-center">

              {/* GENERATE */}
              <button
                onClick={handleGenerate}
                disabled={loading || !sessionId}
                className="h-10 px-4 rounded-lg bg-primary text-white disabled:opacity-50"
              >
                {loading ? "Generating..." : "Generate UML"}
              </button>

              {/* VERSION DROPDOWN */}
              <select
                onChange={(e) => handleSelectVersion(e.target.value)}
                className="border px-8 py-2 rounded-lg"
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

            {/* RIGHT SIDE */}
            <div className="flex gap-3">

              {/* EXPORT */}
              <button
                onClick={handleExportClick}
                className="h-10 px-4 rounded-lg flex items-center gap-2 bg-gray-200 dark:bg-gray-700"
              >
                <span className="material-symbols-outlined">download</span>
                Export
              </button>

              {/* APPROVE */}
              <button
                onClick={() => setShowApprovalModal(true)}
                disabled={approved || !artifactId}
                className={`h-10 px-6 rounded-lg flex items-center gap-2 text-white
                  ${approved ? "bg-green-600" : "bg-primary"}`}
              >
                <span className="material-symbols-outlined">
                  {approved ? "check_circle" : "approval"}
                </span>
                {approved ? "Approved" : "Approve"}
              </button>

            </div>
          </div>
          {artifactId && (
            <div className="px-4 pb-3 text-sm text-slate-500 dark:text-slate-400">
              UML approvals: {umlApproval.approved_members_count}/
              {umlApproval.total_members_count}
              {umlApproval.all_members_approved ? " (all approved)" : " (waiting for members)"}
            </div>
          )}
        </div>

        {/* IMAGE */}
        <div className="bg-white dark:bg-[#1f1c2e] rounded-xl border p-6 flex justify-center">
          {diagramUrl ? (
            <img
              src={diagramUrl}
              alt="UML Diagram"
              className="max-w-full h-auto rounded-lg"
            />
          ) : (
            <p className="text-gray-400">No diagram generated yet</p>
          )}
        </div>

        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                Generating UML Diagram...
              </p>
            </div>
          </div>
        )}
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
