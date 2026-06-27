import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getToken } from "../../api/authApi";
import { fetchProject, fetchMyRole, fetchPendingRequests, acceptInvitation, rejectInvitation, fetchMembers, fetchProjectAuditLogs, fetchPendingLeaveRequests, approveLeaveRequest, rejectLeaveRequest } from "../../api/projectApi";

const BASE_URL = "http://127.0.0.1:8000";

const formatSessionStatus = (status) =>
  (status || "pending").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Mirrors the 4 values produced by the backend: project_approval_service.compute_project_status,
// project_service.complete_project, admin_routes suspend/unsuspend, plus legacy "Active" rows.
const PROJECT_STATUS_LABELS = {
  in_progress:      "In Progress",
  pending_approval: "Pending Approval",
  suspended:        "Suspended",
  completed:        "Completed",
};

const formatProjectStatus = (status) => {
  if (!status) return "";
  let key = status.trim().toLowerCase().replace(/\s+/g, "_");
  if (key === "active") key = "in_progress";
  return PROJECT_STATUS_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const isPendingApprovalStatus = (status) =>
  (status || "").trim().toLowerCase().replace(/\s+/g, "_") === "pending_approval";

// Mirrors PROJECT_FEATURES in project_approval_service.py
const PENDING_FEATURE_INFO = {
  requirements: { label: "Requirements", icon: "checklist" },
  uml:          { label: "UML Diagrams", icon: "schema" },
  srs:          { label: "SRS Document", icon: "description" },
};

export default function ProjectDetailsPage() {
  const navigate    = useNavigate();
  const { id: projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [project, setProject]     = useState(null);
  const [sessions, setSessions]   = useState([]);
  const [sessionPage, setSessionPage] = useState(1);
  const SESSIONS_PER_PAGE = 6;
  const [sessionSearchQuery, setSessionSearchQuery] = useState("");
  const [sessionStatusFilter, setSessionStatusFilter] = useState("all");
  const [myRole, setMyRole]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [pmName, setPmName]       = useState(null);

  const [pendingRequests, setPendingRequests]   = useState([]);
  const [showRequestsPanel, setShowRequestsPanel] = useState(false);
  const [notification, setNotification]         = useState(null);

  const [showLogsModal, setShowLogsModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [logSearchQuery, setLogSearchQuery] = useState(""); 
  const [reqVersions, setReqVersions] = useState([]);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [members, setMembers] = useState([]);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [memberSessionIds, setMemberSessionIds] = useState(null); // null = not computed yet

  const [rejectModal, setRejectModal] = useState({ show: false, req: null, reason: "" });

  // Leave requests (PM view)
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState([]);
  const [showLeavePanel, setShowLeavePanel] = useState(false);
  const [leaveRejectModal, setLeaveRejectModal] = useState({ show: false, req: null, reason: "" });

  // "What's pending?" popout on the status chip — project-level features pending
  // approval (fetched) plus sessions stuck in pending_approval (already loaded
  // in `sessions`, so just filtered, not re-fetched).
  const [pendingFeatures, setPendingFeatures] = useState([]);
  const [showPendingPopout, setShowPendingPopout] = useState(false);
  const [pendingPopoutPos, setPendingPopoutPos] = useState({ top: 0, left: 0 });
  const pendingIconRef = useRef(null);
  const pendingPopoutPanelRef = useRef(null);

  const pendingSessions = useMemo(
    () => sessions.filter((s) => isPendingApprovalStatus(s.status)),
    [sessions]
  );

  useEffect(() => {
    if (!showPendingPopout) return;
    const close = (e) => {
      if (e.type === "scroll") {
        setShowPendingPopout(false);
        return;
      }
      if (
        pendingIconRef.current && !pendingIconRef.current.contains(e.target) &&
        pendingPopoutPanelRef.current && !pendingPopoutPanelRef.current.contains(e.target)
      ) {
        setShowPendingPopout(false);
      }
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [showPendingPopout]);

  const togglePendingPopout = () => {
    if (!showPendingPopout && pendingIconRef.current) {
      const rect = pendingIconRef.current.getBoundingClientRect();
      setPendingPopoutPos({ top: rect.bottom + 6, left: rect.left });
    }
    setShowPendingPopout((v) => !v);
  };

  const goToPendingFeature = (feature) => {
    setShowPendingPopout(false);
    if (feature === "requirements") navigate(`/projects/${projectId}/requirements`);
    else if (feature === "uml") navigate(`/projects/${projectId}/artifacts/uml`, { state: { source: "project" } });
    else if (feature === "srs") navigate(`/projects/${projectId}/srs/generate`, { state: { source: "project" } });
  };

  const goToPendingSession = (session) => {
    setShowPendingPopout(false);
    navigate(`/projects/${projectId}/sessions/${session.id}/sessiondetails`, {
      state: { sessionId: session.id, projectCompleted: false },
    });
  };

  useEffect(() => {
    const load = async () => {
      try {
        const proj = await fetchProject(projectId);

        const [roleData, sessRes, membersData] = await Promise.all([
          fetchMyRole(projectId),
          fetch(`${BASE_URL}/api/sessions/project/${projectId}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          }).then((r) => r.json()),
          fetchMembers(projectId)
        ]);
        setProject(proj);
        setMyRole(roleData.role);
        const sessionList = Array.isArray(sessRes) ? sessRes : [];
        setSessions(sessionList);
        setMembers(membersData);

        // PM is always a session member by default — only probe per-session
        // access for participants (and admins, who are allowed through anyway).
        if (roleData.role === "project_manager") {
          setMemberSessionIds(new Set(sessionList.map((s) => s.id)));
        } else {
          Promise.all(
            sessionList.map((s) =>
              fetch(`${BASE_URL}/api/sessions/${s.id}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
              })
                .then((r) => ({ id: s.id, ok: r.ok }))
                .catch(() => ({ id: s.id, ok: false }))
            )
          ).then((checks) => {
            setMemberSessionIds(new Set(checks.filter((c) => c.ok).map((c) => c.id)));
          });
        }

        const pm = membersData.find((m) => m.role === "project_manager");
        if (pm) {
          setPmName(pm.full_name || pm.email);
        }

        if (isPendingApprovalStatus(proj?.project_status)) {
          fetch(`${BASE_URL}/api/projects/${projectId}/features/approval-status`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
              setPendingFeatures((data?.features || []).filter((f) => f.exists && f.status === "pending"));
            })
            .catch(() => {});
        }

        if (roleData.role === "project_manager") {
          const [reqs, leaveReqs] = await Promise.all([
            fetchPendingRequests(),
            fetchPendingLeaveRequests(),
          ]);
          setPendingRequests(reqs.filter((r) => r.project_id === Number(projectId)));
          setPendingLeaveRequests(leaveReqs.filter((r) => r.project_id === Number(projectId)));
        }
      } catch (err) {
        console.error(err);
        if (err.status === 403) {
          setAccessDenied(true);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);
  
   const openLogsModal = async () => {
    try {
      const logData = await fetchProjectAuditLogs(projectId);
      setAuditLogs(logData);
      setLogSearchQuery(""); 
      setShowLogsModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const getActingRole = (userEmail) => {
    if (!userEmail) return "";
    const member = members.find((m) => m.email === userEmail);
    if (member) return member.role.replace(/_/g, " ");
    return "Admin";
  };

  const handleAccept = async (invId, userName) => {
    try {
      await acceptInvitation(invId);
      setPendingRequests((prev) => prev.filter((r) => r.id !== invId));
      showToast(`${userName} accepted as participant`, "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleReject = async (invId, userName, reason) => {
    try {
      await rejectInvitation(invId, reason);
      setPendingRequests((prev) => prev.filter((r) => r.id !== invId));
      showToast(`${userName} rejected`, "error");
      setRejectModal({ show: false, req: null, reason: "" });
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleApproveLeave = async (req) => {
    try {
      await approveLeaveRequest(req.project_id, req.id);
      setPendingLeaveRequests((prev) => prev.filter((r) => r.id !== req.id));
      showToast(`${req.user_full_name || req.user_email} has left the project`, "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleRejectLeave = async (req, reason) => {
    try {
      await rejectLeaveRequest(req.project_id, req.id, reason);
      setPendingLeaveRequests((prev) => prev.filter((r) => r.id !== req.id));
      setLeaveRejectModal({ show: false, req: null, reason: "" });
      showToast(`Leave request from ${req.user_full_name || req.user_email} rejected`, "error");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  function showToast(message, type) {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }
  const handleCompleteProject = async () => {
    setIsCompleting(true);
    try {
      const res = await fetch(
        `${BASE_URL}/api/projects/${projectId}/complete`,
        { method: "PATCH", headers: { Authorization: `Bearer ${getToken()}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to complete project");

      setProject((prev) => ({ ...prev, project_status: "completed" }));
      setShowCompleteModal(false);
      showToast("Project marked as completed.", "success");
    } catch (err) {
      console.error(err);
      showToast(err.message, "error");
    } finally {
      setIsCompleting(false);
    }
  };
  const uniqueSessionStatuses = useMemo(() => {
    const statuses = sessions.map((s) => s.status?.toLowerCase()).filter(Boolean);
    return [...new Set(statuses)];
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    let result = sessions;
    if (sessionSearchQuery.trim()) {
      const q = sessionSearchQuery.toLowerCase().trim();
      result = result.filter((s) => (s.title || `Session #${s.id}`).toLowerCase().includes(q));
    }
    if (sessionStatusFilter !== "all") {
      result = result.filter((s) => (s.status || "").toLowerCase() === sessionStatusFilter);
    }
    return result;
  }, [sessions, sessionSearchQuery, sessionStatusFilter]);

  useEffect(() => { setSessionPage(1); }, [sessionSearchQuery, sessionStatusFilter]);

  const filteredLogs = auditLogs.filter((log) => {
    if (!logSearchQuery.trim()) return true;
    const query = logSearchQuery.toLowerCase();
    return (
      (log.user_name && log.user_name.toLowerCase().includes(query)) ||
      (log.user_email && log.user_email.toLowerCase().includes(query))
    );
  });

  const handleExportLogs = () => {
    const logsToExport = logSearchQuery.trim() ? filteredLogs : auditLogs;
    if (logsToExport.length === 0) {
      showToast("No logs to export.", "error");
      return;
    }

    const formatChangeSummary = (details) => {
      if (!details) return "—";
      const lines = [];
      const typeLabels = {
        FRs: "Functional Req.",
        NFRs: "Non-Functional Req.",
        Actors: "Actor",
        Features: "Feature",
      };

      // Changed items
      for (const [key, label] of Object.entries(typeLabels)) {
        const items = details[`changed_${key}`];
        if (items?.length) {
          items.forEach((item) => {
            lines.push(`${label}: "${item.before}" → "${item.after}"`);
          });
        }
      }

      // Added items
      for (const [key, label] of Object.entries(typeLabels)) {
        const items = details[`added_${key}`];
        if (items?.length) {
          lines.push(`Added ${label}(s): ${items.map((a) => `"${a}"`).join(", ")}`);
        }
      }

      // Deleted items
      for (const [key, label] of Object.entries(typeLabels)) {
        const items = details[`deleted_${key}`];
        if (items?.length) {
          lines.push(`Deleted ${label}(s): ${items.map((d) => `"${d}"`).join(", ")}`);
        }
      }
      if (details.before && details.after && !lines.length) {
        lines.push(`"${details.before}" → "${details.after}"`);
      }
      if (details.deleted_texts?.length) {
        lines.push(`Deleted: ${details.deleted_texts.map((t) => `"${t}"`).join(", ")}`);
      }
      if (details.extra) {
        lines.push(`${details.extra}`);
      }
      if (details.reason) {
        lines.push(`Reason: ${details.reason}`);
      }
      return lines.length > 0 ? lines.join("\n") : "—";
    };

    const formatAction = (action) => {
      return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const esc = (val) => {
      const s = String(val == null ? "" : val);
      if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = [];
    const exportDate = new Date().toLocaleString();
    const projectName = project?.name || "Project";
    // rows.push([`Activity Log — ${projectName}`, `Exported: ${exportDate}`, `Total Records: ${logsToExport.length}`].join(","));
    // rows.push("");
    // Header row
    const headers = ["ID", "Date & Time", "User", "Email", "Role", "Action", "Target", "Change Summary"];
    rows.push(headers.map(esc).join(","));
    
    // Data rows
    logsToExport.forEach((log, index) => {
      const roleName = getActingRole(log.user_email);
      const action = formatAction(log.action);
      const target = log.details?.label || `${log.entity} #${log.entity_id}`;
      const summary = formatChangeSummary(log.details);
      rows.push([
        esc(index + 1),
        esc(new Date(log.created_at).toLocaleString()),
        esc(log.user_name || "Unknown"),
        esc(log.user_email || ""),
        esc(roleName || "—"),
        esc(action),
        esc(target),
        esc(summary),
      ].join(","));
    });

    const BOM = "\uFEFF";
    const csvContent = BOM + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName = (projectName || "project").replace(/[^a-zA-Z0-9_-]/g, "_");
    link.download = `${safeName}_activity_log.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Exported ${logsToExport.length} record(s) successfully.`, "success");
  };

  if (loading) return <p className="p-8 text-gray-400">Loading...</p>;

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center px-4">
        <span className="material-symbols-outlined text-6xl text-red-400">block</span>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white">Access Denied</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">
          You are not a member of this project, so you don't have permission to view its details.
        </p>
        <button
          onClick={() => navigate("/projects")}
          className="mt-2 h-10 px-5 rounded-lg bg-primary text-white text-sm font-bold shadow hover:opacity-90 transition"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="w-full font-display">



      {showRequestsPanel && myRole === "project_manager" && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a162e] rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg shadow-xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black text-[#100d1c] dark:text-white">
                Join Requests
                {pendingRequests.length > 0 && (<span className="ml-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">{pendingRequests.length}</span>)}
              </h2>
              <button onClick={() => setShowRequestsPanel(false)} className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
            </div>
            {pendingRequests.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No pending requests.</p>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between bg-gray-50 dark:bg-[#231e3d] rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 flex-shrink-0" style={{ backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(req.invitee_full_name || "User")}&background=random&color=fff)` }} />
                      <div>
                        <p className="font-semibold text-sm">{req.invitee_full_name || "Unknown User"}</p>
                        <p className="text-xs text-gray-400">{req.invitee_email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAccept(req.id, req.invitee_full_name || `User #${req.invitee_user_id}`)} className="px-3 py-1 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90">Accept</button>
                      <button onClick={() => setRejectModal({ show: true, req, reason: "" })} className="px-3 py-1 rounded-lg border border-red-300 text-red-500 text-xs font-bold hover:bg-red-50">Reject</button>                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
            {/* Reject Reason Modal */}
      {rejectModal.show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-[#1a162e] rounded-xl w-full max-w-sm shadow-xl p-6 m-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-500 text-xl">cancel</span>
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Reject Request</h3>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Rejecting <span className="font-bold text-gray-700 dark:text-gray-200">{rejectModal.req?.invitee_full_name || "this user"}</span> from joining the project.
            </p>

            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Reason for rejection <span className="text-red-500">*</span></label>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Please provide a reason for rejecting this request..."
              rows={3}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#231e3d] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none mb-1"
            />
            {!rejectModal.reason.trim() && (
              <p className="text-xs text-red-500 mb-5">Reason is required to reject a join request.</p>
            )}
            {rejectModal.reason.trim() && (
              <div className="mb-5"></div>
            )}

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setRejectModal({ show: false, req: null, reason: "" })} 
                className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleReject(rejectModal.req.id, rejectModal.req.invitee_full_name, rejectModal.reason)} 
                disabled={!rejectModal.reason.trim()}
                className={`px-4 py-2.5 rounded-lg text-white text-sm font-bold transition ${
                  rejectModal.reason.trim() 
                    ? "bg-red-600 hover:bg-red-700" 
                    : "bg-gray-300 dark:bg-gray-600 cursor-not-allowed opacity-50"
                }`}
              >
                Reject User
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a162e] rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl m-4">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h2 className="text-lg font-black text-[#100d1c] dark:text-white">Project Activity Log</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportLogs} 
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  Export CSV
                </button>
                <button onClick={() => { setShowLogsModal(false); setLogSearchQuery(""); }} className="text-gray-400 hover:text-gray-600">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-6 pt-4 pb-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-gray-50 dark:bg-[#231e3d] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>
            <div className="p-6 pt-2 overflow-y-auto space-y-3">
              {filteredLogs.length === 0 ? (
                <p className="text-gray-400 text-center py-10">
                  {logSearchQuery ? "No matching logs found." : "No actions recorded yet."}
                </p>
              ) : (
                filteredLogs.map((log) => {
                  const roleName = getActingRole(log.user_email);
                  const targetName = log.details?.label || `${log.entity} #${log.entity_id}`;
                  const extraInfo = log.details?.extra || "";
                  const isStatusChangeLog = log.action?.includes("_user_in_project");
                  let targetUserName = "";
                  let projectName = "";
                  let actionVerb = "";
                  let statusIcon = "circle";

                  const statusConfig = {
                    suspended: { icon: "pause_circle", bg: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", dot: "text-yellow-500", border: "border-yellow-200 dark:border-yellow-800/40 bg-yellow-50/50 dark:bg-yellow-900/10" },
                    terminated: { icon: "cancel", bg: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", dot: "text-red-500", border: "border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-900/10" },
                    archived: { icon: "archive", bg: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-400", dot: "text-gray-500", border: "bg-gray-50 dark:bg-[#231e3d]" },
                  };
                  const currentStatus = Object.keys(statusConfig).find(s => log.action?.includes(s)) || "";
                  const config = statusConfig[currentStatus] || {};

                  if (isStatusChangeLog) {
                    const parts = log.details?.label?.split(" in Project: ");
                    if (parts?.length === 2) {
                      targetUserName = parts[0].replace("User ", "").replace(currentStatus, "").trim();
                      projectName = parts[1];
                    }
                    actionVerb = log.action?.replace("_user_in_project", "").replace(/_/g, " "); 
                  }

                  
                  if (isStatusChangeLog) statusIcon = config.icon;
                  return (
                    <div key={log.id} className={`flex items-start gap-4 p-3 rounded-lg border ${isStatusChangeLog ? config.border : "border-transparent bg-gray-50 dark:bg-[#231e3d]"}`}>
                      <span className={`material-symbols-outlined mt-0.5 text-lg ${isStatusChangeLog ? config.dot : "text-primary"}`}>{statusIcon}</span>
                      <div className="flex-1 min-w-0">
                        {isStatusChangeLog ? (
                          <div className="flex flex-col gap-1.5">
                            <p className="text-sm text-gray-900 dark:text-white leading-relaxed">
                              <span className="font-black">{log.user_name || "Unknown User"}</span>{" "}
                              {roleName && (<span className="font-normal text-gray-400 dark:text-gray-500 text-xs">({roleName})</span>)}{" "}
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${config.bg} tracking-wide`}>
                                {actionVerb}
                              </span>{" "}
                              user <span className="font-black">{targetUserName}</span>                              
                              {log.details?.reason && (
                                <> for reason <span className="font-medium text-gray-600 dark:text-gray-300">{log.details.reason}</span></>
                              )}
                            </p>
                            <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 pl-0.5">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">folder_open</span>
                                {projectName}
                              </span>
                              {log.details?.user_role_in_project && (
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">badge</span>
                                  {log.details.user_role_in_project.replace(/_/g, " ")}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* LOG LAYOUT */
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {log.user_name || "Unknown User"}{" "}
                            {roleName && (<span className="font-normal text-gray-400 dark:text-gray-500 text-xs">({roleName})</span>)}{" "}
                            <span className="font-normal text-gray-500 dark:text-gray-400">
                              {log.action.replace(/_/g, " ")} {targetName}
                            </span>
                            {extraInfo && (
                              <span className="font-normal text-primary text-xs ml-1">{extraInfo}</span>
                            )}
                          </p>
                        )}
                        
                        {log.details?.before && (
                          <div className="mt-2 p-2.5 rounded-lg bg-white dark:bg-[#1a162e] border border-gray-200 dark:border-white/10 text-xs font-mono space-y-1.5">
                            <div className="flex items-start gap-2">
                              <span className="text-red-500 font-bold min-w-[55px]">Before:</span>
                              <span className="text-red-400 line-through break-words">{log.details.before}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-green-600 font-bold min-w-[55px]">After:</span>
                              <span className="text-green-600 break-words">{log.details.after}</span>
                            </div>
                          </div>
                        )}

                        {log.details?.deleted_texts && log.details.deleted_texts.length > 0 && (
                          <div className="mt-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
                            <p className="text-xs font-bold text-red-500 mb-1">{log.details.extra || "Deleted Text:"}</p>
                            <ul className="space-y-1">
                              {log.details.deleted_texts.map((text, i) => (
                                <li key={i} className="text-xs font-mono text-red-400 line-through break-words">
                                  - {text}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {log.details?.before_FRs && (
                          <div className="mt-2 p-2.5 rounded-lg bg-white dark:bg-[#1a162e] border border-gray-200 dark:border-white/10 text-xs font-mono space-y-1.5">
                            <p className="text-xs font-bold text-indigo-500 mb-1">Functional Requirements:</p>
                            <div className="flex items-start gap-2">
                              <span className="text-red-500 font-bold min-w-[55px]">Before:</span>
                              <span className="text-red-400 line-through break-words">{log.details.before_FRs.join(", ")}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-green-600 font-bold min-w-[55px]">After:</span>
                              <span className="text-green-600 break-words">{log.details.after_FRs.join(", ")}</span>
                            </div>
                          </div>
                        )}

                        {log.details?.before_NFRs && (
                          <div className="mt-2 p-2.5 rounded-lg bg-white dark:bg-[#1a162e] border border-gray-200 dark:border-white/10 text-xs font-mono space-y-1.5">
                            <p className="text-xs font-bold text-amber-500 mb-1">Non-Functional Requirements:</p>
                            <div className="flex items-start gap-2">
                              <span className="text-red-500 font-bold min-w-[55px]">Before:</span>
                              <span className="text-red-400 line-through break-words">{log.details.before_NFRs.join(", ")}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-green-600 font-bold min-w-[55px]">After:</span>
                              <span className="text-green-600 break-words">{log.details.after_NFRs.join(", ")}</span>
                            </div>
                          </div>
                        )}

                        {(log.details?.Actors || log.details?.Features) && (
                          <div className="mt-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 text-xs">
                            <p className="text-xs font-bold text-blue-600 mb-1">Included in update:</p>
                            {log.details.Actors && <p className="text-blue-500 break-words">Actors: {log.details.Actors.join(", ")}</p>}
                            {log.details.Features && <p className="text-blue-500 break-words">Features: {log.details.Features.join(", ")}</p>}
                          </div>
                        )}

                        {log.details?.added_FRs && (
                          <div className="mt-2 p-2.5 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 text-xs">
                            <p className="text-xs font-bold text-green-600 mb-1">➕ Added Functional Requirements:</p>
                            <ul className="space-y-0.5">
                              {log.details.added_FRs.map((text, i) => (
                                <li key={i} className="text-green-600 break-words">+ {text}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {log.details?.added_NFRs && (
                          <div className="mt-2 p-2.5 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 text-xs">
                            <p className="text-xs font-bold text-green-600 mb-1">➕ Added Non-Functional Requirements:</p>
                            <ul className="space-y-0.5">
                              {log.details.added_NFRs.map((text, i) => (
                                <li key={i} className="text-green-600 break-words">+ {text}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {log.details?.added_Actors && (
                          <div className="mt-2 p-2.5 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 text-xs">
                            <p className="text-xs font-bold text-green-600 mb-1">➕ Added Actors:</p>
                            <ul className="space-y-0.5">
                              {log.details.added_Actors.map((text, i) => (
                                <li key={i} className="text-green-600 break-words">+ {text}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {log.details?.added_Features && (
                          <div className="mt-2 p-2.5 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 text-xs">
                            <p className="text-xs font-bold text-green-600 mb-1">➕ Added Features:</p>
                            <ul className="space-y-0.5">
                              {log.details.added_Features.map((text, i) => (
                                <li key={i} className="text-green-600 break-words">+ {text}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {log.details?.deleted_FRs && (
                          <div className="mt-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 text-xs">
                            <p className="text-xs font-bold text-red-500 mb-1">➖ Deleted Functional Requirements:</p>
                            <ul className="space-y-0.5">
                              {log.details.deleted_FRs.map((text, i) => (
                                <li key={i} className="text-red-500 line-through break-words">- {text}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {log.details?.deleted_NFRs && (
                          <div className="mt-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 text-xs">
                            <p className="text-xs font-bold text-red-500 mb-1">➖ Deleted Non-Functional Requirements:</p>
                            <ul className="space-y-0.5">
                              {log.details.deleted_NFRs.map((text, i) => (
                                <li key={i} className="text-red-500 line-through break-words">- {text}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {log.details?.deleted_Actors && (
                          <div className="mt-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 text-xs">
                            <p className="text-xs font-bold text-red-500 mb-1">➖ Deleted Actors:</p>
                            <ul className="space-y-0.5">
                              {log.details.deleted_Actors.map((text, i) => (
                                <li key={i} className="text-red-500 line-through break-words">- {text}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {log.details?.deleted_Features && (
                          <div className="mt-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 text-xs">
                            <p className="text-xs font-bold text-red-500 mb-1">➖ Deleted Features:</p>
                            <ul className="space-y-0.5">
                              {log.details.deleted_Features.map((text, i) => (
                                <li key={i} className="text-red-500 line-through break-words">- {text}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {log.details?.changed_FRs && (
                          <div className="mt-2 p-2.5 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 text-xs font-mono space-y-1.5">
                            <p className="text-xs font-bold text-yellow-600 mb-1">✏️ Changed Functional Requirements:</p>
                            {log.details.changed_FRs.map((item, i) => (
                              <div key={i} className="space-y-0.5">
                                <div className="flex items-start gap-2">
                                  <span className="text-red-500 font-bold min-w-[55px]">Before:</span>
                                  <span className="text-red-400 line-through break-words">{item.before}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-green-600 font-bold min-w-[55px]">After:</span>
                                  <span className="text-green-600 break-words">{item.after}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {log.details?.changed_NFRs && (
                          <div className="mt-2 p-2.5 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 text-xs font-mono space-y-1.5">
                            <p className="text-xs font-bold text-yellow-600 mb-1">✏️ Changed Non-Functional Requirements:</p>
                            {log.details.changed_NFRs.map((item, i) => (
                              <div key={i} className="space-y-0.5">
                                <div className="flex items-start gap-2">
                                  <span className="text-red-500 font-bold min-w-[55px]">Before:</span>
                                  <span className="text-red-400 line-through break-words">{item.before}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-green-600 font-bold min-w-[55px]">After:</span>
                                  <span className="text-green-600 break-words">{item.after}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {log.details?.changed_Actors && (
                          <div className="mt-2 p-2.5 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 text-xs font-mono space-y-1.5">
                            <p className="text-xs font-bold text-yellow-600 mb-1">✏️ Changed Actors:</p>
                            {log.details.changed_Actors.map((item, i) => (
                              <div key={i} className="space-y-0.5">
                                <div className="flex items-start gap-2">
                                  <span className="text-red-500 font-bold min-w-[55px]">Before:</span>
                                  <span className="text-red-400 line-through break-words">{item.before}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-green-600 font-bold min-w-[55px]">After:</span>
                                  <span className="text-green-600 break-words">{item.after}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {log.details?.changed_Features && (
                          <div className="mt-2 p-2.5 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 text-xs font-mono space-y-1.5">
                            <p className="text-xs font-bold text-yellow-600 mb-1">✏️ Changed Features:</p>
                            {log.details.changed_Features.map((item, i) => (
                              <div key={i} className="space-y-0.5">
                                <div className="flex items-start gap-2">
                                  <span className="text-red-500 font-bold min-w-[55px]">Before:</span>
                                  <span className="text-red-400 line-through break-words">{item.before}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-green-600 font-bold min-w-[55px]">After:</span>
                                  <span className="text-green-600 break-words">{item.after}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* SRS Generation Log */}
                        {log.entity === "srs_document" && log.action === "generated" && (
                          <div className="mt-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="material-symbols-outlined text-blue-500 text-base">auto_stories</span>
                              <p className="text-xs font-bold text-blue-600">SRS Document Generated</p>
                            </div>
                            {log.details?.label && (<p className="text-blue-500 break-words">{log.details.label}</p>)}
                            {log.details?.extra && (<p className="text-blue-400 break-words mt-0.5">Format: {log.details.extra}</p>)}
                          </div>
                        )}

                        {/* SRS Approval Log */}
                        {log.entity === "srs_document" && log.action === "approved" && (
                          <div className="mt-2 p-2.5 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="material-symbols-outlined text-green-500 text-base">verified</span>
                              <p className="text-xs font-bold text-green-600">SRS Document Approved</p>
                            </div>
                            {log.details?.label && (<p className="text-green-500 break-words">{log.details.label}</p>)}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-green-600 font-bold min-w-[55px]">Status:</span>
                              <span className="text-red-400 line-through">{log.details?.before || "pending"}</span>
                              <span className="text-gray-400 mx-1">→</span>
                              <span className="text-green-600 font-semibold">{log.details?.after || "approved"}</span>
                            </div>
                            {log.details?.extra && (<p className="text-green-400 break-words mt-0.5">Scope: {log.details.extra}</p>)}
                          </div>
                        )}

                        {/* UML Generation Log */}
                        {log.entity === "uml_diagram" && log.action === "generated" && (
                          <div className="mt-2 p-2.5 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="material-symbols-outlined text-purple-500 text-base">account_tree</span>
                              <p className="text-xs font-bold text-purple-600">UML Diagram Generated</p>
                            </div>
                            {log.details?.label && (<p className="text-purple-500 break-words">{log.details.label}</p>)}
                            {log.details?.extra && (<p className="text-purple-400 break-words mt-0.5">Type: {log.details.extra}</p>)}
                          </div>
                        )}

                        {/* UML Approval Log */}
                        {log.entity === "uml_diagram" && log.action === "approved" && (
                          <div className="mt-2 p-2.5 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="material-symbols-outlined text-green-500 text-base">verified</span>
                              <p className="text-xs font-bold text-green-600">UML Diagram Approved</p>
                            </div>
                            {log.details?.label && (<p className="text-green-500 break-words">{log.details.label}</p>)}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-green-600 font-bold min-w-[55px]">Status:</span>
                              <span className="text-red-400 line-through">{log.details?.before || "pending"}</span>
                              <span className="text-gray-400 mx-1">→</span>
                              <span className="text-green-600 font-semibold">{log.details?.after || "approved"}</span>
                            </div>
                            {log.details?.extra && (<p className="text-green-400 break-words mt-0.5">Scope: {log.details.extra}</p>)}
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{new Date(log.created_at).toLocaleString()} • {log.user_email}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {showMembersModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a162e] rounded-xl w-full max-w-md shadow-xl m-4">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h2 className="text-lg font-black text-[#100d1c] dark:text-white">
                Project Members ({members.length})
              </h2>
              <button onClick={() => setShowMembersModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {members.length === 0 ? (
                <p className="text-gray-400 text-center py-6">No members found.</p>
              ) : (
                members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[#231e3d]">
                    <div className="flex items-center gap-3">
                      <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 flex-shrink-0" 
                           style={{ backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name || "User")}&background=random&color=fff)` }} />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">
                            {m.full_name || m.email}
                          </p>
                          {m.user_status && m.user_status !== "active" && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              m.user_status === "suspended" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                              m.user_status === "terminated" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                              m.user_status === "archived" ? "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400" :
                              m.user_status === "pending" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                              "bg-gray-100 text-gray-500"
                            }`}>
                              {m.user_status.charAt(0).toUpperCase() + m.user_status.slice(1)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{m.email}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap ${
                      m.role === "project_manager" 
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" 
                        : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                    }`}>
                      {m.role.replace(/_/g, " ")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 lg:px-10 flex flex-1 justify-center py-8">
        <div className="flex flex-col w-full max-w-5xl">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-4">
            <div className="flex flex-1 min-w-0 flex-col gap-2">
              <p className="text-gray-900 dark:text-white text-4xl font-black leading-tight break-words">{project?.name}</p>
              {pmName && myRole !== "project_manager" && (<p className="text-sm text-gray-500 dark:text-gray-400">Project Manager: <span className="font-semibold text-gray-700 dark:text-gray-300">{pmName}</span></p>)}
              {myRole && (<span className="w-fit text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Your role: {myRole.replace("_", " ")}</span>)}
            </div>
            <div className="flex flex-col items-end gap-3 flex-shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                {myRole && (<button onClick={() => setShowMembersModal(true)} className="relative flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"><span className="material-symbols-outlined text-sm">group</span>Members<span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{members.length}</span></button>)}
                {myRole === "project_manager" && (<button onClick={() => navigate(`/projects/${projectId}/add-participant`)} className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm transition"><span className="material-symbols-outlined text-sm">person_add</span>Add Participant</button>)}
                {myRole === "project_manager" && (<button onClick={() => setShowRequestsPanel(true)} className="relative flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"><span className="material-symbols-outlined text-sm">group_add</span>Requests{pendingRequests.length > 0 && (<span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-bold">{pendingRequests.length}</span>)}</button>)}
                {myRole === "project_manager" && (<button onClick={() => setShowLeavePanel(true)} className="relative flex items-center gap-1.5 h-8 px-3 rounded-lg border border-red-300 dark:border-red-700 text-red-500 dark:text-red-400 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition"><span className="material-symbols-outlined text-sm">exit_to_app</span>Leave Request{pendingLeaveRequests.length > 0 && (<span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">{pendingLeaveRequests.length}</span>)}</button>)}
                {myRole === "project_manager" && (<button onClick={openLogsModal} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"><span className="material-symbols-outlined text-sm">history</span>Activity</button>)}
              </div>
             <div className="flex items-center gap-3">
              {myRole === "project_manager" && !["completed", "suspended"].includes(project?.project_status) && (
                <button
                  onClick={() => navigate(`/projects/${projectId}/start-session`)}
                  className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-white text-sm font-bold shadow hover:opacity-90 transition"
                >
                  <span className="material-symbols-outlined text-lg">mic</span>
                  Start Meeting Session
                </button>
              )}

              {myRole === "project_manager" && !["completed", "suspended"].includes(project?.project_status) && (
                <button
                  onClick={() => setShowCompleteModal(true)}
                  className="flex items-center gap-2 h-10 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow transition"
                >
                  <span className="material-symbols-outlined text-lg">task_alt</span>
                  Mark as Completed
                </button>
              )}

              {project?.project_status === "completed" && (
                <div className="flex items-center gap-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 px-4 py-2.5 text-sm font-bold text-indigo-700 dark:text-indigo-300">
                  <span className="material-symbols-outlined text-lg">verified</span>
                  Project Completed
                </div>
              )}

              {project?.project_status === "suspended" && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 px-4 py-2.5 text-sm font-bold text-amber-700 dark:text-amber-300">
                  <span className="material-symbols-outlined text-lg">pause_circle</span>
                  Project Suspended — Pending PM Reassignment
                </div>
              )}
            </div>
            </div>
          </div>
          <div className="flex gap-3 px-4 pt-1 pb-4 overflow-x-auto">
            <span className="flex h-7 items-center rounded-full bg-primary/10 px-3 text-primary text-xs font-medium">Created: {project?.created_at ? new Date(project.created_at).toLocaleDateString() : "—"}</span>
            <span className="flex h-7 items-center rounded-full bg-primary/10 px-3 text-primary text-xs font-medium">Status: {formatProjectStatus(project?.project_status)}</span>
            {isPendingApprovalStatus(project?.project_status) && (
              <button
                ref={pendingIconRef}
                onClick={togglePendingPopout}
                title="What's pending approval?"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition"
              >
                <span className="material-symbols-outlined text-[16px]">pending_actions</span>
              </button>
            )}
            {project?.domain && (<span className="flex h-7 items-center rounded-full bg-primary/10 px-3 text-primary text-xs font-medium">Domain: {project.domain}</span>)}
          </div>
          {showPendingPopout && (
            <div
              ref={pendingPopoutPanelRef}
              style={{ top: pendingPopoutPos.top, left: pendingPopoutPos.left }}
              className="fixed z-30 w-64 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1C192B] shadow-lg p-1.5"
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 px-2 pt-1.5 pb-1">Pending approval</p>
              {pendingFeatures.length === 0 && pendingSessions.length === 0 ? (
                <p className="text-xs text-gray-400 px-2 pb-2">Nothing pending right now.</p>
              ) : (
                <>
                  {pendingFeatures.map((f) => (
                    <button
                      key={`feature-${f.feature}`}
                      onClick={() => goToPendingFeature(f.feature)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-left transition"
                    >
                      <span className="material-symbols-outlined text-[16px] text-amber-500 shrink-0">
                        {PENDING_FEATURE_INFO[f.feature]?.icon || "task"}
                      </span>
                      <span className="flex-1 text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
                        {PENDING_FEATURE_INFO[f.feature]?.label || f.feature}
                      </span>
                      <span className="text-[11px] text-gray-400 shrink-0">{f.approved_members_count}/{f.total_members_count}</span>
                    </button>
                  ))}
                  {pendingSessions.map((s) => (
                    <button
                      key={`session-${s.id}`}
                      onClick={() => goToPendingSession(s)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-left transition"
                    >
                      <span className="material-symbols-outlined text-[16px] text-amber-500 shrink-0">mic</span>
                      <span className="flex-1 text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
                        {s.title || `Session #${s.id}`}
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
          <div className="border-b border-gray-200 dark:border-gray-700 px-4 mb-2">
            <div className="flex gap-8">
              {["Sessions", "Requirements", "Artifacts"].map((tab, i) => (
                <button key={tab} onClick={() => i === 0 ? navigate(`/projects/${projectId}`) : i === 1 ? navigate(`/projects/${projectId}/requirements`) : navigate(`/projects/${projectId}/results`)} className={`pb-[13px] pt-4 text-sm font-bold border-b-[3px] ${i === 0 ? "border-b-primary text-gray-900 dark:text-white" : "border-b-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"}`}>{tab}</button>
              ))}
            </div>
          </div>
          {sessions.length > 0 && (
            <div className="mx-4 mt-2 mb-1 bg-white dark:bg-[#1C192B] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm p-4">

              {/* Search */}
              <div className="relative mb-3">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">search</span>
                <input
                  type="text"
                  placeholder="Search sessions by title…"
                  value={sessionSearchQuery}
                  onChange={(e) => setSessionSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-10 rounded-lg bg-gray-50 dark:bg-[#100d1c] border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
                {sessionSearchQuery && (
                  <button
                    onClick={() => setSessionSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}
              </div>

              {/* Status pills + count */}
              <div className="flex flex-wrap items-center gap-2">
                {uniqueSessionStatuses.length > 1 && (
                  <>
                    <button
                      onClick={() => setSessionStatusFilter("all")}
                      className={`inline-flex items-center h-8 px-3 rounded-full border text-xs font-semibold transition-all ${
                        sessionStatusFilter === "all"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#100d1c] text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20"
                      }`}
                    >
                      All
                    </button>
                    {uniqueSessionStatuses.map((s) => {
                      const dotColor =
                        s === "completed" ? "bg-indigo-500" :
                        s === "in_progress" ? "bg-emerald-500" :
                        "bg-amber-500";
                      return (
                        <button
                          key={s}
                          onClick={() => setSessionStatusFilter(s)}
                          className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-semibold transition-all ${
                            sessionStatusFilter === s
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#100d1c] text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                          {formatSessionStatus(s)}
                        </button>
                      );
                    })}
                  </>
                )}

                <div className="ml-auto flex items-center gap-3">
                  {(sessionSearchQuery || sessionStatusFilter !== "all") && (
                    <button
                      onClick={() => { setSessionSearchQuery(""); setSessionStatusFilter("all"); }}
                      className="text-xs font-semibold text-primary hover:text-primary/70 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-medium tabular-nums">
                    {filteredSessions.length} / {sessions.length}
                  </span>
                </div>
              </div>

            </div>
          )}
          {(() => {
            const totalSessionPages = Math.max(1, Math.ceil(filteredSessions.length / SESSIONS_PER_PAGE));
            const safeSessionPage = Math.min(sessionPage, totalSessionPages);
            const paginatedSessions = filteredSessions.slice(
              (safeSessionPage - 1) * SESSIONS_PER_PAGE,
              safeSessionPage * SESSIONS_PER_PAGE
            );
            const getSessionPageNumbers = () => {
              const pages = [];
              const maxVisible = 5;
              let start = Math.max(1, safeSessionPage - Math.floor(maxVisible / 2));
              let end = Math.min(totalSessionPages, start + maxVisible - 1);
              if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
              for (let i = start; i <= end; i++) pages.push(i);
              return pages;
            };
            return (
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSessions.length === 0 ? (
                    <p className="text-gray-400 col-span-3">
                      {sessions.length === 0 ? "No sessions yet." : "No sessions match your search or filter."}
                    </p>
                  ) : (
                    paginatedSessions.map((session) => {
                      const isLocked = memberSessionIds !== null && !memberSessionIds.has(session.id);
                      return (
                      <div
                        key={session.id}
                        onClick={() => {
                          if (isLocked) {
                            showToast("You're not a participant in this session.", "error");
                            return;
                          }
                          navigate(
                            `/projects/${projectId}/sessions/${session.id}/sessiondetails`,
                            { state: { sessionId: session.id, projectCompleted: ["completed", "suspended"].includes(project?.project_status) } }
                          );
                        }}
                        className={`flex flex-col gap-4 p-5 bg-white dark:bg-gray-800/50 rounded-lg border shadow-sm transition ${
                          isLocked ? "opacity-60 cursor-not-allowed" : "hover:shadow-md cursor-pointer"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <h3 className="font-bold text-lg">{session.title || `Session #${session.id}`}</h3>
                          <div className="flex items-center gap-1">
                            {isLocked && (
                              <span className="material-symbols-outlined text-gray-400 text-base" title="You're not a participant in this session">lock</span>
                            )}
                            {["completed", "suspended"].includes(project?.project_status) && (
                              <span className="material-symbols-outlined text-indigo-400 text-base">lock</span>
                            )}
                          </div>
                        </div>
                        <span className={`self-start flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${
                          (session.status || "").toLowerCase() === "completed"
                            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                            : (session.status || "").toLowerCase() === "in_progress"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        }`}>
                          {formatSessionStatus(session.status)}
                        </span>
                      </div>
                      );
                    })
                  )}
                </div>

                {totalSessionPages > 1 && (
                  <div className="flex items-center justify-between mt-6 px-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {(safeSessionPage - 1) * SESSIONS_PER_PAGE + 1}–{Math.min(safeSessionPage * SESSIONS_PER_PAGE, filteredSessions.length)} of {filteredSessions.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSessionPage((p) => Math.max(1, p - 1))}
                        disabled={safeSessionPage <= 1}
                        className="w-8 h-8 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                      </button>

                      {safeSessionPage > 3 && totalSessionPages > 5 && (
                        <>
                          <button onClick={() => setSessionPage(1)} className="w-8 h-8 rounded-md flex items-center justify-center text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">1</button>
                          <span className="w-8 h-8 flex items-center justify-center text-gray-400 text-xs">...</span>
                        </>
                      )}

                      {getSessionPageNumbers().map((page) => (
                        <button
                          key={page}
                          onClick={() => setSessionPage(page)}
                          className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-medium transition-colors ${
                            page === safeSessionPage
                              ? "bg-primary text-white shadow-sm"
                              : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
                          }`}
                        >
                          {page}
                        </button>
                      ))}

                      {safeSessionPage < totalSessionPages - 2 && totalSessionPages > 5 && (
                        <>
                          <span className="w-8 h-8 flex items-center justify-center text-gray-400 text-xs">...</span>
                          <button onClick={() => setSessionPage(totalSessionPages)} className="w-8 h-8 rounded-md flex items-center justify-center text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">{totalSessionPages}</button>
                        </>
                      )}

                      <button
                        onClick={() => setSessionPage((p) => Math.min(totalSessionPages, p + 1))}
                        disabled={safeSessionPage >= totalSessionPages}
                        className="w-8 h-8 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
      
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCompleteModal(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-6">
                <span className="material-symbols-outlined text-4xl">task_alt</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Mark Project as Completed?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                This will lock the entire project. All sessions will become <strong>view-only</strong>, and no new sessions, requirements, or artifacts can be generated. This action cannot be undone.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleCompleteProject}
                disabled={isCompleting}
                className="inline-flex w-full justify-center items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-3 text-sm font-bold text-white transition-all"
              >
                <span className="material-symbols-outlined text-lg">
                  {isCompleting ? "hourglass_empty" : "check_circle"}
                </span>
                {isCompleting ? "Completing..." : "Yes, Mark as Completed"}
              </button>
              <button
                onClick={() => setShowCompleteModal(false)}
                disabled={isCompleting}
                className="inline-flex w-full justify-center items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEAVE REQUESTS PANEL (PM) */}
      {showLeavePanel && myRole === "project_manager" && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a162e] rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg shadow-xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black text-[#100d1c] dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-red-500 text-xl">exit_to_app</span>
                Leave Requests
                {pendingLeaveRequests.length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingLeaveRequests.length}</span>
                )}
              </h2>
              <button onClick={() => setShowLeavePanel(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {pendingLeaveRequests.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No pending leave requests.</p>
            ) : (
              <div className="space-y-3">
                {pendingLeaveRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 flex-shrink-0"
                        style={{ backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(req.user_full_name || "User")}&background=random&color=fff)` }}
                      />
                      <div>
                        <p className="font-semibold text-sm">{req.user_full_name || "Unknown User"}</p>
                        <p className="text-xs text-gray-400">{req.user_email}</p>
                        <p className="text-xs text-red-500 font-medium mt-0.5">Wants to leave this project</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveLeave(req)}
                        className="px-3 py-1 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setLeaveRejectModal({ show: true, req, reason: "" })}
                        className="px-3 py-1 rounded-lg border border-red-300 text-red-500 text-xs font-bold hover:bg-red-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEAVE REJECT REASON MODAL */}
      {leaveRejectModal.show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-[#1a162e] rounded-xl w-full max-w-sm shadow-xl p-6 m-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-500 text-xl">cancel</span>
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Reject Leave Request</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Rejecting leave request from <span className="font-bold text-gray-700 dark:text-gray-200">{leaveRejectModal.req?.user_full_name || "this user"}</span>.
            </p>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Reason <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={leaveRejectModal.reason}
              onChange={(e) => setLeaveRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g., Your participation is critical right now..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#231e3d] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none mb-5"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setLeaveRejectModal({ show: false, req: null, reason: "" })}
                className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectLeave(leaveRejectModal.req, leaveRejectModal.reason)}
                className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-xl flex gap-3 border z-50 ${notification.type === "success" ? "bg-white dark:bg-[#1a162e] border-emerald-500/30" : "bg-white dark:bg-[#1a162e] border-red-500/30"}`}>
          <span className={`material-symbols-outlined ${notification.type === "success" ? "text-emerald-500" : "text-red-500"}`}>{notification.type === "success" ? "check_circle" : "cancel"}</span>
          <p className="font-bold text-sm">{notification.message}</p>
        </div>
      )}
    </div>
  );
}