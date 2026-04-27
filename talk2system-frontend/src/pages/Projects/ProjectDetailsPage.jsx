import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getToken } from "../../api/authApi";
import { fetchProject, fetchMyRole, fetchPendingRequests, acceptInvitation, rejectInvitation, fetchMembers, fetchProjectAuditLogs } from "../../api/projectApi";

const BASE_URL = "http://127.0.0.1:8000";

export default function ProjectDetailsPage() {
  const navigate    = useNavigate();
  const { id: projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [project, setProject]     = useState(null);
  const [sessions, setSessions]   = useState([]);
  const [myRole, setMyRole]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [pmName, setPmName]       = useState(null);
  
  // session modal
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionTitle, setSessionTitle]         = useState("");

  // join requests (only for PM)
  const [pendingRequests, setPendingRequests]   = useState([]);
  const [showRequestsPanel, setShowRequestsPanel] = useState(false);
  const [notification, setNotification]         = useState(null);

  // ACTIVITY LOG: Add states
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [proj, roleData, sessRes, members] = await Promise.all([
          fetchProject(projectId),
          fetchMyRole(projectId),
          fetch(`${BASE_URL}/api/sessions/project/${projectId}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          }).then((r) => r.json()),
          fetchMembers(projectId)
        ]);
        setProject(proj);
        setMyRole(roleData.role);
        setSessions(Array.isArray(sessRes) ? sessRes : []);

        const pm = members.find((m) => m.role === "project_manager");
        if (pm) {
          setPmName(pm.full_name || pm.email);
        }

        if (roleData.role === "project_manager") {
          const reqs = await fetchPendingRequests();
          setPendingRequests(reqs.filter((r) => r.project_id === Number(projectId)));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);
  
  // ACTIVITY LOG: Add fetch function
  const openLogsModal = async () => {
    try {
      const data = await fetchProjectAuditLogs(projectId);
      setAuditLogs(data);
      setShowLogsModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmSession = () => {
    if (!sessionTitle.trim()) return;
    navigate(`/projects/${projectId}/recording`, {
      state: { sessionTitle: sessionTitle.trim() },
    });
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

  const handleReject = async (invId, userName) => {
    try {
      await rejectInvitation(invId);
      setPendingRequests((prev) => prev.filter((r) => r.id !== invId));
      showToast(`${userName} rejected`, "error"); 
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  function showToast(message, type) {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }

  if (loading) return <p className="p-8 text-gray-400">Loading...</p>;

  return (
    <div className="w-full font-display">

      {/* SESSION TITLE MODAL */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              Start Meeting Session
            </h2>
            <input
              type="text"
              placeholder="e.g. Sprint 4 Planning"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 mb-4 dark:bg-gray-800 dark:border-gray-600"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowSessionModal(false)} className="px-4 py-2 rounded-lg border dark:border-gray-600 text-sm">Cancel</button>
              <button onClick={handleConfirmSession} disabled={!sessionTitle.trim()} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-50">Start</button>
            </div>
          </div>
        </div>
      )}

      {/* PENDING REQUESTS PANEL (PM only) */}
      {showRequestsPanel && myRole === "project_manager" && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a162e] rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg shadow-xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black text-[#100d1c] dark:text-white">
                Join Requests
                {pendingRequests.length > 0 && (
                  <span className="ml-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
                )}
              </h2>
              <button onClick={() => setShowRequestsPanel(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
                {pendingRequests.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">No pending requests.</p>
                ) : (
                  <div className="space-y-3">
                    {pendingRequests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between bg-gray-50 dark:bg-[#231e3d] rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div
                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 flex-shrink-0"
                            style={{
                              backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(
                                req.invitee_full_name || "User"
                              )}&background=random&color=fff)`,
                            }}
                          />
                          <div>
                            <p className="font-semibold text-sm">
                              {req.invitee_full_name || "Unknown User"}
                            </p>
                            <p className="text-xs text-gray-400">{req.invitee_email}</p>
                            {req.project_domain && (
                              <p className="text-xs text-gray-400">Domain: {req.project_domain}</p>
                            )}
                            <p className="text-xs text-gray-400">
                              {new Date(req.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAccept(req.id, req.invitee_full_name || `User #${req.invitee_user_id}`)}
                            className="px-3 py-1 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleReject(req.id, req.invitee_full_name || `User #${req.invitee_user_id}`)}
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

      {/* ACTIVITY LOG MODAL (PM only) */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a162e] rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl m-4">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h2 className="text-lg font-black text-[#100d1c] dark:text-white">Project Activity Log</h2>
              <button onClick={() => setShowLogsModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-3">
              {auditLogs.length === 0 ? (
                <p className="text-gray-400 text-center py-10">No actions recorded yet.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg bg-gray-50 dark:bg-[#231e3d]">
                    <span className="material-symbols-outlined text-primary mt-0.5 text-lg">circle</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {log.user_name || "Unknown User"}
                        <span className="font-normal text-gray-500 dark:text-gray-400 ml-2">
                          {log.action.replace(/_/g, " ")} {log.entity_id ? `#${log.entity_id}` : ""}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(log.created_at).toLocaleString()} • {log.user_email}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 lg:px-10 flex flex-1 justify-center py-8">
        <div className="flex flex-col w-full max-w-5xl">

          {/* Project Header */}
          <div className="flex flex-wrap justify-between items-start gap-4 p-4">
            <div className="flex min-w-72 flex-col gap-2">
              <p className="text-gray-900 dark:text-white text-4xl font-black leading-tight">{project?.name}</p>
              <p className="text-gray-500 dark:text-gray-400 text-base">{project?.description}</p>
              
              {pmName && myRole !== "project_manager" && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Project Manager: <span className="font-semibold text-gray-700 dark:text-gray-300">{pmName}</span>
                </p>
              )}
              {myRole && (
                <span className="w-fit text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Your role: {myRole.replace("_", " ")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">

              {myRole === "project_manager" && (
                <button onClick={() => navigate(`/projects/${projectId}/add-participant`)} className="flex items-center gap-2 h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 shadow transition">
                  <span className="material-symbols-outlined text-lg">person_add</span>
                  Add Participant
                </button>
              )}

              {myRole === "project_manager" && (
                <button onClick={() => setShowRequestsPanel(true)} className="relative flex items-center gap-2 h-10 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  <span className="material-symbols-outlined text-base">group_add</span>
                  Join Requests
                  {pendingRequests.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
              )}

              {/* ACTIVITY LOG BUTTON */}
              {myRole === "project_manager" && (
                <button 
                  onClick={openLogsModal} 
                  className="flex items-center gap-2 h-10 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <span className="material-symbols-outlined text-base">history</span>
                  Activity Log
                </button>
              )}

              {myRole === "project_manager" && (
                <button onClick={() => setShowSessionModal(true)} className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-white text-sm font-bold shadow hover:opacity-90 transition">
                  <span className="material-symbols-outlined text-lg">mic</span>
                  Start Meeting Session
                </button>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="flex gap-3 px-4 pt-1 pb-4 overflow-x-auto">
            <span className="flex h-7 items-center rounded-full bg-primary/10 px-3 text-primary text-xs font-medium">
              Created: {project?.created_at ? new Date(project.created_at).toLocaleDateString() : "—"}
            </span>
            <span className="flex h-7 items-center rounded-full bg-primary/10 px-3 text-primary text-xs font-medium">
              Status: {project?.project_status}
            </span>
            {project?.domain && (
              <span className="flex h-7 items-center rounded-full bg-primary/10 px-3 text-primary text-xs font-medium">
                Domain: {project.domain}
              </span>
            )}
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-4 mb-2">
            <div className="flex gap-8">
              {["Sessions", "Requirements", "Artifacts"].map((tab, i) => (
                <button
                  key={tab}
                  onClick={() =>
                    i === 0
                      ? navigate(`/projects/${projectId}`)
                      : i === 1
                      ? navigate(`/projects/${projectId}/requirements`)
                      : navigate(`/projects/${projectId}/results`)
                  }
                  className={`pb-[13px] pt-4 text-sm font-bold border-b-[3px] ${
                    i === 0
                      ? "border-b-primary text-gray-900 dark:text-white"
                      : "border-b-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Sessions Grid */}
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.length === 0 ? (
              <p className="text-gray-400 col-span-3">No sessions yet.</p>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => navigate(`/transcript/${session.id}/requirements`)}
                  className="flex flex-col gap-4 p-5 bg-white dark:bg-gray-800/50 rounded-lg border shadow-sm hover:shadow-md cursor-pointer transition"
                >
                  <h3 className="font-bold text-lg">
                    {session.title || `Session #${session.id}`}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {new Date(session.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>

        </div>
      </div>

      {/* Toast */}
      {notification && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-xl flex gap-3 border z-50 ${
          notification.type === "success"
            ? "bg-white dark:bg-[#1a162e] border-emerald-500/30"
            : "bg-white dark:bg-[#1a162e] border-red-500/30"
        }`}>
          <span className={`material-symbols-outlined ${
            notification.type === "success" ? "text-emerald-500" : "text-red-500"
          }`}>
            {notification.type === "success" ? "check_circle" : "cancel"}
          </span>
          <p className="font-bold text-sm">{notification.message}</p>
        </div>
      )}
    </div>
  );
}