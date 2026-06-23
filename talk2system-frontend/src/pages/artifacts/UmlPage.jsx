import { useEffect, useState, useRef } from "react";
import UMLApprovalModal from "../../components/modals/UMLApprovalModal";
import Toast from "../../components/Toast";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getToken } from "../../api/authApi";
import { useContext } from "react";
import { UmlContext } from "../../App";

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
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [approved, setApproved] = useState(false);
  const [projectCompleted, setProjectCompleted] = useState(false);
  const [hasNewUnapproved, setHasNewUnapproved] = useState(false); 
  const [umlApproval, setUmlApproval] = useState({
    approved_members_count: 0,
    total_members_count: 0,
    current_user_approved: false,
    all_members_approved: false,
    status: "pending",
    exists: false,
  });
  const [projectUmlApproval, setProjectUmlApproval] = useState({
  approved_members_count: 0,
  total_members_count: 0,
  current_user_approved: false,
  all_members_approved: false,
  status: "pending",
});
  const navigate = useNavigate();
  const location = useLocation();
  const { id: projectId } = useParams();

  const [diagramType, setDiagramType] = useState(location.state?.diagramType ?? "usecase");

  const [diagramUrl, setDiagramUrl] = useState(null);
  const [artifactId, setArtifactId] = useState(null);
  const [versions, setVersions] = useState([]);
  const [sessionId, setSessionId] = useState(null);

  const [isProjectSource, setIsProjectSource] = useState(false);
  const [projectName, setProjectName] = useState(null);
  const [sessionName, setSessionName] = useState(null);
  const [loading, setLoading] = useState(false);

  // ── Toast notifications ──────────────────────────────────────────────────
  const [toast, setToast] = useState(null); // { message, type: "error"|"warning"|"info"|"success" }
  const showToast = (message, type = "error") => setToast({ message, type });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const getAuthHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // ===============================
  // RESOLVE SESSION ID
  // Priority: route state (came from a specific session) > latest session fallback
  // ===============================
  useEffect(() => {
    const source = location.state?.source;

    if (source === "project") {
      // Came from Requirements_project_view — use project-level generation
      setIsProjectSource(true);
      // No session needed for project-level generation
    } else {
      //  Session-level flow (existing behavior unchanged)
      setIsProjectSource(false);
      const stateSessionId = location.state?.sessionId;

      if (stateSessionId) {
        // Came from a specific session — use it directly, no fetch needed
        setSessionId(stateSessionId);
      } else {
        // Accessed directly (e.g. from project Artifacts tab) — use latest session
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
    }
  }, [projectId, location.state]);

  useEffect(() => {
  if (isProjectSource) return;
  const projectCompletedFromState = location.state?.projectCompleted === true;
  if (projectCompletedFromState) {
    setSessionCompleted(true);
    return;
  }
  if (!sessionId) return;
  fetch(`${BASE_URL}/api/sessions/${sessionId}`, {
    headers: getAuthHeaders(),
  })
    .then((r) => r.json())
    .then((data) => setSessionCompleted(data.status === "completed"))
    .catch(console.error);
  }, [sessionId, isProjectSource]);

  // ===============================
  // FETCH PROJECT / SESSION NAMES FOR BREADCRUMB
  // ===============================
  useEffect(() => {
    if (!projectId) return;
    fetch(`${BASE_URL}/api/projects/getproject/${projectId}`, {
      headers: getAuthHeaders(),
    })
      .then((r) => r.json())
      .then((data) => setProjectName(data.name ?? null))
      .catch(console.error);
  }, [projectId]);

  useEffect(() => {
    if (isProjectSource || !sessionId) return;
    fetch(`${BASE_URL}/api/sessions/${sessionId}`, {
      headers: getAuthHeaders(),
    })
      .then((r) => r.json())
      .then((data) => setSessionName(data.title ?? null))
      .catch(console.error);
  }, [sessionId, isProjectSource]);

  const fetchVersions = async (resolvedSessionId = sessionId) => {
    try {
      let res;

      if (isProjectSource) {
        // Project-level: fetch artifacts with no session (project-wide)
        res = await fetch(
          `${BASE_URL}/api/projects/${projectId}/artifacts/${diagramType}/versions`
        );
      } else {
        if (!resolvedSessionId) return;
        res = await fetch(
          `${BASE_URL}/api/projects/${projectId}/sessions/${resolvedSessionId}/artifacts/${diagramType}/versions`
        );
      }

      if (!res.ok) {
        console.error(`Versions fetch failed: ${res.status}`);
        setVersions([]);
        setDiagramUrl(null);
        setArtifactId(null);
        setApproved(false);
        return;
      }

      const data = await res.json();
      let fetchedVersions = data.versions || [];

      // For project source, only show artifacts that have no session_id (project-level only)
      if (isProjectSource) {
        fetchedVersions = fetchedVersions.filter((v) => !v.session_id);
      }

      setVersions(fetchedVersions);

      if (fetchedVersions.length > 0) {
        const latest = fetchedVersions[0];
        setDiagramUrl(`${BASE_URL}/${latest.file_path}`);
        setArtifactId(latest.id);
        setApproved(latest.approval_status === "approved");
        if (isProjectSource) {
          await refreshProjectUmlApproval();
        }
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

  const refreshProjectUmlApproval = async () => {
    if (!projectId) return;
    try {
      const res = await fetch(
        `${BASE_URL}/api/projects/${projectId}/features/approval-status`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) return;

      const data = await res.json();
      const feature = Array.isArray(data.features)
        ? data.features.find((f) => f.feature === "uml")
        : null;
      if (!feature) return;

      setProjectUmlApproval(feature);
      setApproved(Boolean(feature.current_user_approved));
    } catch (err) {
      console.error("Failed to load project UML approval status:", err);
    }
  };

  const { startUmlGeneration, umlTaskStatus, umlProjectId, umlSessionId } = useContext(UmlContext);

  const handleGenerate = async () => {

    // ── PROJECT-LEVEL generation ───────────────────────────────────────────────
    if (isProjectSource) {
      try {
        await startUmlGeneration({
          projectId,
          sessionId: null,
          diagramType,
          source: "project",
        });
        // Background task started — UmlToast will notify when done.
        // fetchVersions will be called when user returns to this page via the toast.
        if (projectId) {
          const projectStatusRes = await fetch(
            `http://localhost:8000/api/projects/${projectId}/computed-status`,
            { headers: { Authorization: `Bearer ${getToken()}` } }
          );
          if (projectStatusRes.ok) {
            const { status: projectStatus } = await projectStatusRes.json();
            await fetch(
              `http://localhost:8000/api/projects/${projectId}/status?status=${projectStatus}`,
              { method: "PUT", headers: { Authorization: `Bearer ${getToken()}` } }
            );
          }
        }
      } catch (err) {
        console.error(err);
        showToast("Failed to start UML generation.");
      }
      return;
    }

    // ── SESSION-LEVEL generation ───────────────────────────────────────────────
    if (!sessionId) {
      showToast("No session found for this project. Please start a meeting session first.");
      return;
    }

    try {
      await startUmlGeneration({
        projectId,
        sessionId,
        diagramType,
        source: "session",
      });
      // Background task started — UmlToast will notify when done.
    } catch (err) {
      console.error(err);
      showToast("Failed to start UML generation.");
    }
  };



  // Auto-refresh when the background UML task for this page's project/session completes
  const prevUmlStatusRef = useRef(umlTaskStatus);
  useEffect(() => {
    const prevStatus = prevUmlStatusRef.current;
    prevUmlStatusRef.current = umlTaskStatus;
    if (umlTaskStatus !== "done" || prevStatus === "done") return;
    if (String(umlProjectId) !== String(projectId)) return;
    if (isProjectSource && umlSessionId == null) {
      fetchVersions();
    } else if (!isProjectSource && String(umlSessionId) === String(sessionId)) {
      fetchVersions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [umlTaskStatus]);
  // ===============================
  // APPROVE (project-level — direct artifact approval, no session members)
  // ===============================
  const handleProjectApprove = async () => {
  if (!artifactId) return;
  try {
    // Approve via project approval service
    const res = await fetch(
      `${BASE_URL}/api/projects/${projectId}/features/uml/approve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ version_id: artifactId }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail);

    setProjectUmlApproval(data);
    setApproved(Boolean(data.current_user_approved));

    // If all approved, also mark artifact as approved
    if (data.all_members_approved) {
      await approveArtifact(artifactId);
      fetchVersions();
    }

    // Update project status
    const statusRes = await fetch(
      `${BASE_URL}/api/projects/${projectId}/computed-status`,
      { headers: getAuthHeaders() }
    );
    if (statusRes.ok) {
      const { status: computedStatus } = await statusRes.json();
      await fetch(
        `${BASE_URL}/api/projects/${projectId}/status?status=${computedStatus}`,
        { method: "PUT", headers: getAuthHeaders() }
      );
    }
  } catch (err) {
    console.error("Failed to approve project artifact:", err);
  }
};

  // Re-fetch when diagramType changes OR when sessionId/isProjectSource is first resolved
  useEffect(() => {
  if (isProjectSource) {
    fetchVersions();
    // Fetch project completed status
    if (projectId) {
      fetch(`${BASE_URL}/api/projects/getproject/${projectId}`, {
        headers: getAuthHeaders(),
      })
        .then((r) => r.json())
        .then((data) => setProjectCompleted(data.project_status === "completed" || data.project_status === "suspended"))
        .catch(console.error);
    }
  } else if (sessionId) {
    fetchVersions();
    refreshUmlApproval();
  }
}, [diagramType, sessionId, isProjectSource]);
  // ===============================
  // SELECT VERSION
  // ===============================
 const handleSelectVersion = async (selectedArtifactId) => {
  try {
    const res = await getArtifact(selectedArtifactId);
    setDiagramUrl(`${BASE_URL}/${res.data.file_path}`);
    setArtifactId(res.data.id);

    // Fetch the real approval status for THIS specific version
    if (!isProjectSource && sessionId) {
      const approvalRes = await fetch(
        `${BASE_URL}/api/sessions/${sessionId}/features/uml/approval-status/${selectedArtifactId}`,
        { headers: getAuthHeaders() }
      );
      if (approvalRes.ok) {
        const approvalData = await approvalRes.json();
        setUmlApproval(approvalData);
        setApproved(Boolean(approvalData.current_user_approved));
        setHasNewUnapproved(!approvalData.all_members_approved);
      }
    } else if (isProjectSource) {
      const approvalRes = await fetch(
        `${BASE_URL}/api/projects/${projectId}/features/uml/approval-status/${selectedArtifactId}`,
        { headers: getAuthHeaders() }
      );
      if (approvalRes.ok) {
        const approvalData = await approvalRes.json();
        setProjectUmlApproval(approvalData);
        setApproved(Boolean(approvalData.current_user_approved));
      }
    }
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
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ version_id: artifactId }),   // ← pass current artifact as version
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || "Failed to approve UML");
    }

    setUmlApproval(data);
    setApproved(Boolean(data.current_user_approved));
    setHasNewUnapproved(false);
    setShowApprovalModal(false);

    // Use computed-status instead of hardcoded string
    const statusRes = await fetch(
      `${BASE_URL}/api/sessions/${sessionId}/computed-status`,
      { headers: getAuthHeaders() }
    );
    if (statusRes.ok) {
      const { status: computedStatus } = await statusRes.json();
      await fetch(
        `${BASE_URL}/api/sessions/${sessionId}/status?status=${computedStatus}`,
        { method: "PUT", headers: getAuthHeaders() }
      );
    }

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

  // Derived: is the button currently in "approved" display state?
  const isApprovedState = approved && !hasNewUnapproved; 

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
            {projectName ?? `Project #${projectId}`}
          </button>
          {!isProjectSource && sessionId && (
            <>
              <span>/</span>
              <button
                onClick={() => navigate(`/projects/${projectId}/sessions/${sessionId}/sessiondetails`)}
                className="text-primary-accent dark:text-secondary-accent font-medium"
              >
                {sessionName ?? `Session #${sessionId}`}
              </button>
            </>
          )}
          <span>/</span>
          <span>UML Diagrams</span>
          {isProjectSource && (
            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              Project-Level
            </span>
          )}
        </div>

        {/* TITLE */}
        <div className="mb-6">
          <h1 className="text-4xl font-black">UML Diagrams</h1>
          {!isProjectSource && sessionId && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {sessionName ?? `Session #${sessionId}`}
            </p>
          )}
          {isProjectSource && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Generated from all project sessions' aggregated requirements
            </p>
          )}
          {sessionCompleted && (
          <div className="flex items-center gap-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-4 py-3 text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-4">
            <span className="material-symbols-outlined text-lg">lock</span>
            This session is completed. Generation is disabled — view only.
          </div>
        )}
        {isProjectSource && projectCompleted && (
          <div className="flex items-center gap-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-4 py-3 text-sm font-medium text-indigo-700 dark:text-indigo-300 mt-2">
            <span className="material-symbols-outlined text-lg">lock</span>
            This project is completed. Generation is disabled — view only.
          </div>
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
                disabled={
                  (isProjectSource && projectCompleted) ||
                  (!isProjectSource && sessionCompleted)
                }
                className="h-10 px-4 rounded-lg bg-primary text-white disabled:opacity-50"
              >
                Generate UML
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

              {/* APPROVE — uses isApprovedState so new versions re-enable it */}

              {isProjectSource ? (
                // Project-level: direct artifact approval, no session members needed
                <button
                  onClick={handleProjectApprove}
                  disabled={approved || !artifactId || projectCompleted}
                  className={`h-10 px-6 rounded-lg flex items-center gap-2 text-white
                    ${approved ? "bg-green-600" : "bg-primary"}`}
                >
                  <span className="material-symbols-outlined">
                    {approved ? "check_circle" : "approval"}
                  </span>
                  {approved ? "Approved" : "Approve"}
                </button>
              ) : (
                <button
                  onClick={() => setShowApprovalModal(true)}
                  disabled={isApprovedState || !artifactId|| sessionCompleted}
                className={`h-10 px-6 rounded-lg flex items-center gap-2 text-white
                  ${isApprovedState ? "bg-green-600" : "bg-primary"}`}
              >
                <span className="material-symbols-outlined">
                  {isApprovedState ? "check_circle" : "approval"}
                </span>
                {isApprovedState ? "Approved" : "Approve"}
              </button>
            )}

            </div>
          </div>

          {!isProjectSource && artifactId && (
            <div className="px-4 pb-3 text-sm text-slate-500 dark:text-slate-400">
              UML approvals: {umlApproval.approved_members_count}/
              {umlApproval.total_members_count}
              {umlApproval.all_members_approved ? " (all approved)" : " (waiting for members)"}
            </div>
          )}
          {isProjectSource && artifactId && (
            <div className="px-4 pb-3 text-sm text-slate-500 dark:text-slate-400">
              Project approvals: {projectUmlApproval.approved_members_count}/
              {projectUmlApproval.total_members_count}
              {projectUmlApproval.all_members_approved
                ? " (all approved)"
                : " (waiting for members)"}
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
      {!isProjectSource && showApprovalModal && (
        <UMLApprovalModal
          onClose={() => setShowApprovalModal(false)}
          onApprove={handleApprove}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}