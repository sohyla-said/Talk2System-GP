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
  


  const [pendingRequests, setPendingRequests]   = useState([]);
  const [showRequestsPanel, setShowRequestsPanel] = useState(false);
  const [notification, setNotification]         = useState(null);

  const [showLogsModal, setShowLogsModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [reqVersions, setReqVersions] = useState([]);
  const [reqDetailsMap, setReqDetailsMap] = useState({}); 
  const [sessionDetailsMap, setSessionDetailsMap] = useState({});

  const [showMembersModal, setShowMembersModal] = useState(false);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [proj, roleData, sessRes, membersData] = await Promise.all([
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
        setMembers(membersData); 

        const pm = membersData.find((m) => m.role === "project_manager");
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
  
  const openLogsModal = async () => {
    try {
      const [logData, versionsData] = await Promise.all([
        fetchProjectAuditLogs(projectId),
        fetch(`${BASE_URL}/api/projects/${projectId}/requirements/versions`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }).then((r) => r.json()).catch(() => []) 
      ]);
      
      setAuditLogs(logData);
      setReqVersions(Array.isArray(versionsData) ? versionsData : []);
      
      const editedReqIds = [...new Set(
        logData
          .filter(log => log.entity?.includes("requirement") && log.action?.includes("edit"))
          .map(log => log.entity_id)
          .filter(Boolean)
      )];

      const editedTranscriptIds = [...new Set(
        logData
          .filter(log => (log.entity?.includes("transcript") || log.entity?.includes("session")) && log.action?.includes("edit"))
          .map(log => log.entity_id)
          .filter(Boolean)
      )];

      if (editedReqIds.length > 0) {
        const detailsPromises = editedReqIds.map(async (id) => {
          try {
            let res = await fetch(`${BASE_URL}/api/projects/requirements/${id}`, {
              headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (!res.ok) {
              res = await fetch(`${BASE_URL}/api/sessions/requirements/${id}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
              });
            }
            if (!res.ok) throw new Error("Not found");
            
            const data = await res.json();
            const allReqs = [
              ...(data.data?.functional_requirements || []),
              ...(data.data?.nonfunctional_requirements || data.data?.non_functional_requirements || [])
            ];
            
            return {
              id,
              sessionTitle: allReqs[0]?.src_session_title || null,
              snippet: allReqs[0]?.text 
                ? (allReqs[0].text.length > 45 ? allReqs[0].text.substring(0, 45) + "..." : allReqs[0].text)
                : null
            };
          } catch(e) {
            return { id, sessionTitle: null, snippet: null };
          }
        });
        
        const detailsResults = await Promise.all(detailsPromises);
        const map = {};
        detailsResults.forEach(d => map[d.id] = d);
        setReqDetailsMap(map);
      } else {
        setReqDetailsMap({});
      }

      if (editedTranscriptIds.length > 0) {
        const transPromises = editedTranscriptIds.map(async (id) => {
          try {
            const res = await fetch(`${BASE_URL}/api/sessions/${id}`, {
              headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (!res.ok) throw new Error("Not found");
            
            const data = await res.json();
            let transText = "";
            if (Array.isArray(data.transcript) && data.transcript.length > 0) {
              transText = data.transcript[0].text || "";
            } else if (typeof data.transcript === "string") {
              transText = data.transcript;
            }            
            
            return {
              id,
              sessionTitle: data.title || null,
              snippet: transText 
                ? (transText.length > 45 ? transText.substring(0, 45) + "..." : transText)
                : null
            };
          } catch(e) {
            return { id, sessionTitle: null, snippet: null };
          }
        });

        const transResults = await Promise.all(transPromises);
        const sMap = {};
        transResults.forEach(d => sMap[d.id] = d);
        setSessionDetailsMap(sMap);
      } else {
        setSessionDetailsMap({});
      }

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

  const getTargetEntityLabel = (entity, entityId, action) => {
    if (!entityId) return "";

    if (entity === "user") {
      const targetMember = members.find((m) => m.user_id === entityId);
      if (targetMember) return targetMember.full_name || targetMember.email;
      return `User #${entityId}`;
    }

    if (entity.includes("requirement")) {
      if (action?.includes("edit") && reqDetailsMap[entityId]) {
        const details = reqDetailsMap[entityId];
        let label = "requirements";
        if (details.sessionTitle) label += ` from "${details.sessionTitle}"`;
        if (details.snippet) label += ` ("${details.snippet}")`;
        return label;
      }

      const req = reqVersions.find((r) => r.id === entityId);
      if (req) return `Requirements Version ${req.version}`;
      return `Requirement #${entityId}`;
    }

    // FIXED: Removed duplicate "transcript" word
    if (entity.includes("session") || entity.includes("transcript")) {
      if (sessionDetailsMap[entityId]) {
        const details = sessionDetailsMap[entityId];
        let label = "";
        if (details.sessionTitle) label += `from "${details.sessionTitle}"`;
        if (details.snippet && action?.includes("edit")) label += ` ("${details.snippet}")`;
        if (!label) label = "transcript";
        return label;
      }
      return `Transcript #${entityId}`;
    }

    return `${entity} #${entityId}`;
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
                      <button onClick={() => handleReject(req.id, req.invitee_full_name || `User #${req.invitee_user_id}`)} className="px-3 py-1 rounded-lg border border-red-300 text-red-500 text-xs font-bold hover:bg-red-50">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showLogsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a162e] rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl m-4">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h2 className="text-lg font-black text-[#100d1c] dark:text-white">Project Activity Log</h2>
              <button onClick={() => setShowLogsModal(false)} className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3">
              {auditLogs.length === 0 ? (
                <p className="text-gray-400 text-center py-10">No actions recorded yet.</p>
              ) : (
                auditLogs.map((log) => {
                  const roleName = getActingRole(log.user_email);
                  const targetName = getTargetEntityLabel(log.entity, log.entity_id, log.action);
                  return (
                    <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg bg-gray-50 dark:bg-[#231e3d]">
                      <span className="material-symbols-outlined text-primary mt-0.5 text-lg">circle</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {log.user_name || "Unknown User"}{" "}
                          {roleName && (<span className="font-normal text-gray-400 dark:text-gray-500 text-xs">({roleName})</span>)}{" "}
                          <span className="font-normal text-gray-500 dark:text-gray-400">
                            {log.action.replace(/_/g, " ")} {targetName}
                          </span>
                        </p>
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
          <div className="bg-white dark:bg-[#1a162e] rounded-xl w-full max-w-md max-h-[80vh] flex flex-col shadow-xl m-4">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h2 className="text-lg font-black text-[#100d1c] dark:text-white">Project Members <span className="ml-2 text-sm font-normal text-gray-400">({members.length})</span></h2>
              <button onClick={() => setShowMembersModal(false)} className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2">
              {members.length === 0 ? (<p className="text-gray-400 text-center py-10">No members found.</p>) : (
                members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[#231e3d]">
                    <div className="flex items-center gap-3">
                      <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 flex-shrink-0" style={{ backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name || member.email || "User")}&background=random&color=fff)` }} />
                      <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{member.full_name || "Unknown User"}</p>
                        <p className="text-xs text-gray-400">{member.email}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${member.role === "project_manager" ? "bg-primary/15 text-primary" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                      {member.role === "project_manager" ? "Project Manager" : "Member"}
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
          <div className="flex flex-wrap justify-between items-start gap-4 p-4">
            <div className="flex min-w-72 flex-col gap-2">
              <p className="text-gray-900 dark:text-white text-4xl font-black leading-tight">{project?.name}</p>
              {pmName && myRole !== "project_manager" && (<p className="text-sm text-gray-500 dark:text-gray-400">Project Manager: <span className="font-semibold text-gray-700 dark:text-gray-300">{pmName}</span></p>)}
              {myRole && (<span className="w-fit text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Your role: {myRole.replace("_", " ")}</span>)}
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {myRole && (<button onClick={() => setShowMembersModal(true)} className="relative flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"><span className="material-symbols-outlined text-sm">group</span>Members<span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{members.length}</span></button>)}
                {myRole === "project_manager" && (<button onClick={() => navigate(`/projects/${projectId}/add-participant`)} className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm transition"><span className="material-symbols-outlined text-sm">person_add</span>Add Participant</button>)}
                {myRole === "project_manager" && (<button onClick={() => setShowRequestsPanel(true)} className="relative flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"><span className="material-symbols-outlined text-sm">group_add</span>Requests{pendingRequests.length > 0 && (<span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-bold">{pendingRequests.length}</span>)}</button>)}
                {myRole === "project_manager" && (<button onClick={openLogsModal} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"><span className="material-symbols-outlined text-sm">history</span>Activity</button>)}
              </div>
              {myRole === "project_manager" && (<button onClick={() => navigate(`/projects/${projectId}/start-session`)} className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-white text-sm font-bold shadow hover:opacity-90 transition"><span className="material-symbols-outlined text-lg">mic</span>Start Meeting Session</button>)}
            </div>
          </div>
          <div className="flex gap-3 px-4 pt-1 pb-4 overflow-x-auto">
            <span className="flex h-7 items-center rounded-full bg-primary/10 px-3 text-primary text-xs font-medium">Created: {project?.created_at ? new Date(project.created_at).toLocaleDateString() : "—"}</span>
            <span className="flex h-7 items-center rounded-full bg-primary/10 px-3 text-primary text-xs font-medium">Status: {project?.project_status}</span>
            {project?.domain && (<span className="flex h-7 items-center rounded-full bg-primary/10 px-3 text-primary text-xs font-medium">Domain: {project.domain}</span>)}
          </div>
          <div className="border-b border-gray-200 dark:border-gray-700 px-4 mb-2">
            <div className="flex gap-8">
              {["Sessions", "Requirements", "Artifacts"].map((tab, i) => (
                <button key={tab} onClick={() => i === 0 ? navigate(`/projects/${projectId}`) : i === 1 ? navigate(`/projects/${projectId}/requirements`) : navigate(`/projects/${projectId}/results`)} className={`pb-[13px] pt-4 text-sm font-bold border-b-[3px] ${i === 0 ? "border-b-primary text-gray-900 dark:text-white" : "border-b-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"}`}>{tab}</button>
              ))}
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.length === 0 ? (<p className="text-gray-400 col-span-3">No sessions yet.</p>) : (
              sessions.map((session) => (
                <div key={session.id} onClick={() => navigate(`/transcript/${session.id}/requirements`)} className="flex flex-col gap-4 p-5 bg-white dark:bg-gray-800/50 rounded-lg border shadow-sm hover:shadow-md cursor-pointer transition">
                {/* <div key={session.id} onClick={() => navigate(`/projects/${projectId}/sessions/${session.id}`)} className="flex flex-col gap-4 p-5 bg-white dark:bg-gray-800/50 rounded-lg border shadow-sm hover:shadow-md cursor-pointer transition"> */}
                  <h3 className="font-bold text-lg">{session.title || `Session #${session.id}`}</h3>
                  <span className="text-sm text-gray-500">{new Date(session.created_at).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {notification && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-xl flex gap-3 border z-50 ${notification.type === "success" ? "bg-white dark:bg-[#1a162e] border-emerald-500/30" : "bg-white dark:bg-[#1a162e] border-red-500/30"}`}>
          <span className={`material-symbols-outlined ${notification.type === "success" ? "text-emerald-500" : "text-red-500"}`}>{notification.type === "success" ? "check_circle" : "cancel"}</span>
          <p className="font-bold text-sm">{notification.message}</p>
        </div>
      )}
    </div>
  );
}