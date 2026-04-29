// import React, { useEffect, useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import { getToken } from "../../api/authApi";
// import {
//   fetchProject,
//   fetchMyRole,
//   fetchPendingRequests,
//   acceptInvitation,
//   rejectInvitation,
//   fetchMembers,
//   fetchProjectAuditLogs,
// } from "../../api/projectApi";

// const BASE_URL = "http://127.0.0.1:8000";

// const TAB_LIST = ["Requirements", "Transcript", "Artifacts"];

// function ApprovalBar({ approved, total }) {
//   const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
//   const color =
//     pct === 100
//       ? "var(--color-background-success)"
//       : pct >= 50
//       ? "#EF9F27"
//       : "var(--color-background-danger)";
//   return (
//     <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//       <div
//         style={{
//           flex: 1,
//           height: 6,
//           borderRadius: 99,
//           background: "var(--color-border-tertiary)",
//           overflow: "hidden",
//         }}
//       >
//         <div
//           style={{
//             width: `${pct}%`,
//             height: "100%",
//             background: color,
//             borderRadius: 99,
//             transition: "width 0.4s ease",
//           }}
//         />
//       </div>
//       <span
//         style={{
//           fontSize: 12,
//           color: "var(--color-text-secondary)",
//           minWidth: 44,
//           textAlign: "right",
//         }}
//       >
//         {approved}/{total}
//       </span>
//     </div>
//   );
// }

// function StatusBadge({ status }) {
//   const map = {
//     approved: {
//       bg: "var(--color-background-success)",
//       color: "var(--color-text-success)",
//       label: "Approved",
//     },
//     pending: {
//       bg: "var(--color-background-warning)",
//       color: "var(--color-text-warning)",
//       label: "Pending",
//     },
//     rejected: {
//       bg: "var(--color-background-danger)",
//       color: "var(--color-text-danger)",
//       label: "Rejected",
//     },
//     in_review: {
//       bg: "var(--color-background-info)",
//       color: "var(--color-text-info)",
//       label: "In Review",
//     },
//   };
//   const s = map[status] || map["pending"];
//   return (
//     <span
//       style={{
//         background: s.bg,
//         color: s.color,
//         fontSize: 11,
//         fontWeight: 700,
//         padding: "2px 10px",
//         borderRadius: 99,
//         letterSpacing: "0.02em",
//         whiteSpace: "nowrap",
//       }}
//     >
//       {s.label}
//     </span>
//   );
// }

// function SectionHeader({ icon, title, count }) {
//   return (
//     <div
//       style={{
//         display: "flex",
//         alignItems: "center",
//         gap: 8,
//         marginBottom: 12,
//       }}
//     >
//       <span
//         className="material-symbols-outlined"
//         style={{ fontSize: 18, color: "var(--color-text-secondary)" }}
//       >
//         {icon}
//       </span>
//       <span
//         style={{
//           fontSize: 13,
//           fontWeight: 700,
//           color: "var(--color-text-primary)",
//           textTransform: "uppercase",
//           letterSpacing: "0.08em",
//         }}
//       >
//         {title}
//       </span>
//       {count !== undefined && (
//         <span
//           style={{
//             marginLeft: 4,
//             background: "var(--color-background-secondary)",
//             color: "var(--color-text-secondary)",
//             fontSize: 11,
//             fontWeight: 700,
//             padding: "1px 8px",
//             borderRadius: 99,
//           }}
//         >
//           {count}
//         </span>
//       )}
//     </div>
//   );
// }

// export default function SessionDetailsPage() {
//   const navigate = useNavigate();
//   const { projectId, sessionId } = useParams();

//   const [project, setProject] = useState(null);
//   const [session, setSession] = useState(null);
//   const [myRole, setMyRole] = useState(null);
//   const [members, setMembers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [activeTab, setActiveTab] = useState("Requirements");

//   const [requirements, setRequirements] = useState([]);
//   const [transcript, setTranscript] = useState([]);
//   const [artifacts, setArtifacts] = useState({ uml: null, srs: null });

//   const [pendingRequests, setPendingRequests] = useState([]);
//   const [showRequestsPanel, setShowRequestsPanel] = useState(false);
//   const [showMembersModal, setShowMembersModal] = useState(false);
//   const [notification, setNotification] = useState(null);

//   const [auditLogs, setAuditLogs] = useState([]);
//   const [showLogsModal, setShowLogsModal] = useState(false);

//   useEffect(() => {
//     const load = async () => {
//       try {
//         const [proj, roleData, membersData, sessRes] = await Promise.all([
//           fetchProject(projectId),
//           fetchMyRole(projectId),
//           fetchMembers(projectId),
//           fetch(`${BASE_URL}/api/sessions/${sessionId}`, {
//             headers: { Authorization: `Bearer ${getToken()}` },
//           }).then((r) => r.json()),
//         ]);

//         setProject(proj);
//         setMyRole(roleData.role);
//         setMembers(membersData);
//         setSession(sessRes);

//         if (sessRes.transcript) {
//           setTranscript(
//             Array.isArray(sessRes.transcript)
//               ? sessRes.transcript
//               : [{ text: sessRes.transcript, speaker: "Unknown", timestamp: null }]
//           );
//         }

//         const reqRes = await fetch(
//           `${BASE_URL}/api/sessions/${sessionId}/requirements`,
//           { headers: { Authorization: `Bearer ${getToken()}` } }
//         ).then((r) => r.json().catch(() => null));

//         if (reqRes) {
//           const functional = reqRes.functional_requirements || reqRes.data?.functional_requirements || [];
//           const nonFunctional =
//             reqRes.nonfunctional_requirements ||
//             reqRes.non_functional_requirements ||
//             reqRes.data?.nonfunctional_requirements ||
//             reqRes.data?.non_functional_requirements ||
//             [];
//           setRequirements([
//             ...functional.map((r) => ({ ...r, type: "Functional" })),
//             ...nonFunctional.map((r) => ({ ...r, type: "Non-Functional" })),
//           ]);
//         }

//         const umlRes = await fetch(
//           `${BASE_URL}/api/sessions/${sessionId}/uml`,
//           { headers: { Authorization: `Bearer ${getToken()}` } }
//         )
//           .then((r) => r.json().catch(() => null))
//           .catch(() => null);

//         const srsRes = await fetch(
//           `${BASE_URL}/api/sessions/${sessionId}/srs`,
//           { headers: { Authorization: `Bearer ${getToken()}` } }
//         )
//           .then((r) => r.json().catch(() => null))
//           .catch(() => null);

//         setArtifacts({ uml: umlRes, srs: srsRes });

//         if (roleData.role === "project_manager") {
//           const reqs = await fetchPendingRequests();
//           setPendingRequests(reqs.filter((r) => r.project_id === Number(projectId)));
//         }
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     load();
//   }, [projectId, sessionId]);

//   const openLogsModal = async () => {
//     try {
//       const logData = await fetchProjectAuditLogs(projectId);
//       setAuditLogs(logData.filter((l) => String(l.session_id) === String(sessionId)));
//       setShowLogsModal(true);
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const getActingRole = (userEmail) => {
//     if (!userEmail) return "";
//     const member = members.find((m) => m.email === userEmail);
//     if (member) return member.role.replace(/_/g, " ");
//     return "Admin";
//   };

//   const handleAccept = async (invId, userName) => {
//     try {
//       await acceptInvitation(invId);
//       setPendingRequests((prev) => prev.filter((r) => r.id !== invId));
//       showToast(`${userName} accepted as participant`, "success");
//     } catch (err) {
//       showToast(err.message, "error");
//     }
//   };

//   const handleReject = async (invId, userName) => {
//     try {
//       await rejectInvitation(invId);
//       setPendingRequests((prev) => prev.filter((r) => r.id !== invId));
//       showToast(`${userName} rejected`, "error");
//     } catch (err) {
//       showToast(err.message, "error");
//     }
//   };

//   function showToast(message, type) {
//     setNotification({ message, type });
//     setTimeout(() => setNotification(null), 3000);
//   }

//   const sessionMembersCount = members.length;

//   const getApprovalStats = (req) => {
//     const approvals = req.approvals || [];
//     const approved = approvals.filter((a) => a.status === "approved").length;
//     return { approved, total: sessionMembersCount };
//   };

//   const overallStats = (() => {
//     const total = requirements.length;
//     const approved = requirements.filter((r) => r.status === "approved").length;
//     const pending = requirements.filter((r) => !r.status || r.status === "pending").length;
//     const rejected = requirements.filter((r) => r.status === "rejected").length;
//     return { total, approved, pending, rejected };
//   })();

//   if (loading)
//     return (
//       <p style={{ padding: "2rem", color: "var(--color-text-secondary)" }}>
//         Loading...
//       </p>
//     );

//   return (
//     <div style={{ width: "100%", fontFamily: "var(--font-sans)" }}>
//       {/* ── Requests panel ── */}
//       {showRequestsPanel && myRole === "project_manager" && (
//         <div
//           style={{
//             position: "fixed",
//             inset: 0,
//             background: "rgba(0,0,0,0.4)",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             zIndex: 50,
//           }}
//         >
//           <div
//             style={{
//               background: "var(--color-background-primary)",
//               borderRadius: "var(--border-radius-xl)",
//               width: "100%",
//               maxWidth: 480,
//               maxHeight: "80vh",
//               overflowY: "auto",
//               padding: "1.5rem",
//               boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
//               border: "0.5px solid var(--color-border-tertiary)",
//             }}
//           >
//             <div
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//                 marginBottom: 16,
//               }}
//             >
//               <h2
//                 style={{
//                   fontSize: 18,
//                   fontWeight: 700,
//                   color: "var(--color-text-primary)",
//                   margin: 0,
//                 }}
//               >
//                 Join Requests
//                 {pendingRequests.length > 0 && (
//                   <span
//                     style={{
//                       marginLeft: 8,
//                       background: "var(--color-background-danger)",
//                       color: "var(--color-text-danger)",
//                       fontSize: 11,
//                       fontWeight: 700,
//                       padding: "2px 8px",
//                       borderRadius: 99,
//                     }}
//                   >
//                     {pendingRequests.length}
//                   </span>
//                 )}
//               </h2>
//               <button
//                 onClick={() => setShowRequestsPanel(false)}
//                 style={{ background: "none", border: "none", cursor: "pointer" }}
//               >
//                 <span
//                   className="material-symbols-outlined"
//                   style={{ color: "var(--color-text-secondary)" }}
//                 >
//                   close
//                 </span>
//               </button>
//             </div>
//             {pendingRequests.length === 0 ? (
//               <p
//                 style={{
//                   color: "var(--color-text-secondary)",
//                   textAlign: "center",
//                   padding: "2rem 0",
//                   fontSize: 14,
//                 }}
//               >
//                 No pending requests.
//               </p>
//             ) : (
//               <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
//                 {pendingRequests.map((req) => (
//                   <div
//                     key={req.id}
//                     style={{
//                       display: "flex",
//                       alignItems: "center",
//                       justifyContent: "space-between",
//                       background: "var(--color-background-secondary)",
//                       borderRadius: "var(--border-radius-lg)",
//                       padding: "12px 16px",
//                     }}
//                   >
//                     <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//                       <img
//                         src={`https://ui-avatars.com/api/?name=${encodeURIComponent(req.invitee_full_name || "User")}&background=random&color=fff`}
//                         style={{ width: 36, height: 36, borderRadius: "50%" }}
//                         alt=""
//                       />
//                       <div>
//                         <p
//                           style={{
//                             fontWeight: 600,
//                             fontSize: 13,
//                             margin: 0,
//                             color: "var(--color-text-primary)",
//                           }}
//                         >
//                           {req.invitee_full_name || "Unknown User"}
//                         </p>
//                         <p
//                           style={{
//                             fontSize: 11,
//                             color: "var(--color-text-secondary)",
//                             margin: 0,
//                           }}
//                         >
//                           {req.invitee_email}
//                         </p>
//                       </div>
//                     </div>
//                     <div style={{ display: "flex", gap: 8 }}>
//                       <button
//                         onClick={() =>
//                           handleAccept(
//                             req.id,
//                             req.invitee_full_name || `User #${req.invitee_user_id}`
//                           )
//                         }
//                         style={{
//                           padding: "4px 14px",
//                           borderRadius: "var(--border-radius-md)",
//                           background: "var(--color-background-success)",
//                           color: "var(--color-text-success)",
//                           border: "none",
//                           fontSize: 12,
//                           fontWeight: 700,
//                           cursor: "pointer",
//                         }}
//                       >
//                         Accept
//                       </button>
//                       <button
//                         onClick={() =>
//                           handleReject(
//                             req.id,
//                             req.invitee_full_name || `User #${req.invitee_user_id}`
//                           )
//                         }
//                         style={{
//                           padding: "4px 14px",
//                           borderRadius: "var(--border-radius-md)",
//                           background: "var(--color-background-danger)",
//                           color: "var(--color-text-danger)",
//                           border: "none",
//                           fontSize: 12,
//                           fontWeight: 700,
//                           cursor: "pointer",
//                         }}
//                       >
//                         Reject
//                       </button>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       {/* ── Members modal ── */}
//       {showMembersModal && (
//         <div
//           style={{
//             position: "fixed",
//             inset: 0,
//             background: "rgba(0,0,0,0.4)",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             zIndex: 50,
//           }}
//         >
//           <div
//             style={{
//               background: "var(--color-background-primary)",
//               borderRadius: "var(--border-radius-xl)",
//               width: "100%",
//               maxWidth: 420,
//               maxHeight: "80vh",
//               display: "flex",
//               flexDirection: "column",
//               boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
//               border: "0.5px solid var(--color-border-tertiary)",
//             }}
//           >
//             <div
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//                 padding: "1.25rem 1.5rem",
//                 borderBottom: "0.5px solid var(--color-border-tertiary)",
//               }}
//             >
//               <h2
//                 style={{
//                   fontSize: 16,
//                   fontWeight: 700,
//                   margin: 0,
//                   color: "var(--color-text-primary)",
//                 }}
//               >
//                 Project Members{" "}
//                 <span
//                   style={{ fontWeight: 400, color: "var(--color-text-secondary)", fontSize: 13 }}
//                 >
//                   ({members.length})
//                 </span>
//               </h2>
//               <button
//                 onClick={() => setShowMembersModal(false)}
//                 style={{ background: "none", border: "none", cursor: "pointer" }}
//               >
//                 <span
//                   className="material-symbols-outlined"
//                   style={{ color: "var(--color-text-secondary)" }}
//                 >
//                   close
//                 </span>
//               </button>
//             </div>
//             <div
//               style={{
//                 padding: "1rem",
//                 overflowY: "auto",
//                 display: "flex",
//                 flexDirection: "column",
//                 gap: 8,
//               }}
//             >
//               {members.map((member) => (
//                 <div
//                   key={member.id}
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "space-between",
//                     padding: "10px 12px",
//                     borderRadius: "var(--border-radius-md)",
//                     background: "var(--color-background-secondary)",
//                   }}
//                 >
//                   <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//                     <img
//                       src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name || member.email || "User")}&background=random&color=fff`}
//                       style={{ width: 36, height: 36, borderRadius: "50%" }}
//                       alt=""
//                     />
//                     <div>
//                       <p
//                         style={{
//                           fontWeight: 600,
//                           fontSize: 13,
//                           margin: 0,
//                           color: "var(--color-text-primary)",
//                         }}
//                       >
//                         {member.full_name || "Unknown User"}
//                       </p>
//                       <p
//                         style={{
//                           fontSize: 11,
//                           color: "var(--color-text-secondary)",
//                           margin: 0,
//                         }}
//                       >
//                         {member.email}
//                       </p>
//                     </div>
//                   </div>
//                   <span
//                     style={{
//                       fontSize: 10,
//                       fontWeight: 700,
//                       padding: "2px 8px",
//                       borderRadius: 99,
//                       background:
//                         member.role === "project_manager"
//                           ? "var(--color-background-info)"
//                           : "var(--color-background-secondary)",
//                       color:
//                         member.role === "project_manager"
//                           ? "var(--color-text-info)"
//                           : "var(--color-text-secondary)",
//                       border: "0.5px solid var(--color-border-tertiary)",
//                     }}
//                   >
//                     {member.role === "project_manager" ? "Project Manager" : "Member"}
//                   </span>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ── Activity log modal ── */}
//       {showLogsModal && (
//         <div
//           style={{
//             position: "fixed",
//             inset: 0,
//             background: "rgba(0,0,0,0.4)",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             zIndex: 50,
//           }}
//         >
//           <div
//             style={{
//               background: "var(--color-background-primary)",
//               borderRadius: "var(--border-radius-xl)",
//               width: "100%",
//               maxWidth: 640,
//               maxHeight: "80vh",
//               display: "flex",
//               flexDirection: "column",
//               margin: "1rem",
//               boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
//               border: "0.5px solid var(--color-border-tertiary)",
//             }}
//           >
//             <div
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//                 padding: "1.25rem 1.5rem",
//                 borderBottom: "0.5px solid var(--color-border-tertiary)",
//               }}
//             >
//               <h2
//                 style={{
//                   fontSize: 16,
//                   fontWeight: 700,
//                   margin: 0,
//                   color: "var(--color-text-primary)",
//                 }}
//               >
//                 Session Activity Log
//               </h2>
//               <button
//                 onClick={() => setShowLogsModal(false)}
//                 style={{ background: "none", border: "none", cursor: "pointer" }}
//               >
//                 <span
//                   className="material-symbols-outlined"
//                   style={{ color: "var(--color-text-secondary)" }}
//                 >
//                   close
//                 </span>
//               </button>
//             </div>
//             <div
//               style={{
//                 padding: "1.25rem 1.5rem",
//                 overflowY: "auto",
//                 display: "flex",
//                 flexDirection: "column",
//                 gap: 10,
//               }}
//             >
//               {auditLogs.length === 0 ? (
//                 <p
//                   style={{
//                     color: "var(--color-text-secondary)",
//                     textAlign: "center",
//                     padding: "2rem 0",
//                     fontSize: 14,
//                   }}
//                 >
//                   No actions recorded yet.
//                 </p>
//               ) : (
//                 auditLogs.map((log) => {
//                   const roleName = getActingRole(log.user_email);
//                   return (
//                     <div
//                       key={log.id}
//                       style={{
//                         display: "flex",
//                         alignItems: "flex-start",
//                         gap: 12,
//                         padding: "10px 14px",
//                         borderRadius: "var(--border-radius-md)",
//                         background: "var(--color-background-secondary)",
//                       }}
//                     >
//                       <span
//                         className="material-symbols-outlined"
//                         style={{
//                           fontSize: 16,
//                           color: "var(--color-text-info)",
//                           marginTop: 2,
//                         }}
//                       >
//                         circle
//                       </span>
//                       <div style={{ flex: 1 }}>
//                         <p
//                           style={{
//                             fontSize: 13,
//                             fontWeight: 600,
//                             margin: 0,
//                             color: "var(--color-text-primary)",
//                           }}
//                         >
//                           {log.user_name || "Unknown"}{" "}
//                           {roleName && (
//                             <span
//                               style={{
//                                 fontWeight: 400,
//                                 color: "var(--color-text-secondary)",
//                                 fontSize: 11,
//                               }}
//                             >
//                               ({roleName})
//                             </span>
//                           )}{" "}
//                           <span
//                             style={{
//                               fontWeight: 400,
//                               color: "var(--color-text-secondary)",
//                             }}
//                           >
//                             {log.action.replace(/_/g, " ")}
//                           </span>
//                         </p>
//                         <p
//                           style={{
//                             fontSize: 11,
//                             color: "var(--color-text-secondary)",
//                             margin: "4px 0 0",
//                           }}
//                         >
//                           {new Date(log.created_at).toLocaleString()} · {log.user_email}
//                         </p>
//                       </div>
//                     </div>
//                   );
//                 })
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ── Main content ── */}
//       <div
//         style={{
//           padding: "2rem 1.5rem",
//           maxWidth: 1080,
//           margin: "0 auto",
//           display: "flex",
//           flexDirection: "column",
//           gap: 0,
//         }}
//       >
//         {/* Header row */}
//         <div
//           style={{
//             display: "flex",
//             flexWrap: "wrap",
//             justifyContent: "space-between",
//             alignItems: "flex-start",
//             gap: 16,
//             paddingBottom: "1rem",
//           }}
//         >
//           {/* Left: back + title + role */}
//           <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
//             <button
//               onClick={() => navigate(`/projects/${projectId}`)}
//               style={{
//                 display: "inline-flex",
//                 alignItems: "center",
//                 gap: 4,
//                 background: "none",
//                 border: "none",
//                 cursor: "pointer",
//                 color: "var(--color-text-secondary)",
//                 fontSize: 13,
//                 padding: 0,
//                 marginBottom: 4,
//               }}
//             >
//               <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
//                 arrow_back
//               </span>
//               {project?.name}
//             </button>
//             <h1
//               style={{
//                 fontSize: 28,
//                 fontWeight: 800,
//                 margin: 0,
//                 color: "var(--color-text-primary)",
//                 lineHeight: 1.2,
//               }}
//             >
//               {session?.title || `Session #${sessionId}`}
//             </h1>
//             {myRole && (
//               <span
//                 style={{
//                   width: "fit-content",
//                   fontSize: 11,
//                   fontWeight: 700,
//                   padding: "3px 10px",
//                   borderRadius: 99,
//                   background: "var(--color-background-info)",
//                   color: "var(--color-text-info)",
//                 }}
//               >
//                 Your role: {myRole.replace("_", " ")}
//               </span>
//             )}
//           </div>

//           {/* Right: action buttons */}
//           <div
//             style={{
//               display: "flex",
//               flexDirection: "column",
//               alignItems: "flex-end",
//               gap: 10,
//             }}
//           >
//             <div
//               style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
//             >
//               {myRole && (
//                 <button
//                   onClick={() => setShowMembersModal(true)}
//                   style={{
//                     display: "inline-flex",
//                     alignItems: "center",
//                     gap: 6,
//                     height: 32,
//                     padding: "0 12px",
//                     borderRadius: "var(--border-radius-md)",
//                     border: "0.5px solid var(--color-border-secondary)",
//                     background: "var(--color-background-primary)",
//                     fontSize: 12,
//                     fontWeight: 700,
//                     cursor: "pointer",
//                     color: "var(--color-text-primary)",
//                   }}
//                 >
//                   <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
//                     group
//                   </span>
//                   Members
//                   <span
//                     style={{
//                       background: "var(--color-background-secondary)",
//                       color: "var(--color-text-secondary)",
//                       fontSize: 10,
//                       fontWeight: 700,
//                       padding: "1px 6px",
//                       borderRadius: 99,
//                     }}
//                   >
//                     {members.length}
//                   </span>
//                 </button>
//               )}

//               {myRole === "project_manager" && (
//                 <button
//                   onClick={() => navigate(`/projects/${projectId}/add-participant`)}
//                   style={{
//                     display: "inline-flex",
//                     alignItems: "center",
//                     gap: 6,
//                     height: 32,
//                     padding: "0 12px",
//                     borderRadius: "var(--border-radius-md)",
//                     border: "none",
//                     background: "#059669",
//                     color: "#fff",
//                     fontSize: 12,
//                     fontWeight: 700,
//                     cursor: "pointer",
//                   }}
//                 >
//                   <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
//                     person_add
//                   </span>
//                   Add Participant
//                 </button>
//               )}

//               {myRole === "project_manager" && (
//                 <button
//                   onClick={() => setShowRequestsPanel(true)}
//                   style={{
//                     position: "relative",
//                     display: "inline-flex",
//                     alignItems: "center",
//                     gap: 6,
//                     height: 32,
//                     padding: "0 12px",
//                     borderRadius: "var(--border-radius-md)",
//                     border: "0.5px solid var(--color-border-secondary)",
//                     background: "var(--color-background-primary)",
//                     fontSize: 12,
//                     fontWeight: 700,
//                     cursor: "pointer",
//                     color: "var(--color-text-primary)",
//                   }}
//                 >
//                   <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
//                     group_add
//                   </span>
//                   Requests
//                   {pendingRequests.length > 0 && (
//                     <span
//                       style={{
//                         position: "absolute",
//                         top: -6,
//                         right: -6,
//                         width: 16,
//                         height: 16,
//                         borderRadius: "50%",
//                         background: "var(--color-background-danger)",
//                         color: "var(--color-text-danger)",
//                         fontSize: 9,
//                         display: "flex",
//                         alignItems: "center",
//                         justifyContent: "center",
//                         fontWeight: 700,
//                       }}
//                     >
//                       {pendingRequests.length}
//                     </span>
//                   )}
//                 </button>
//               )}

//               {myRole === "project_manager" && (
//                 <button
//                   onClick={openLogsModal}
//                   style={{
//                     display: "inline-flex",
//                     alignItems: "center",
//                     gap: 6,
//                     height: 32,
//                     padding: "0 12px",
//                     borderRadius: "var(--border-radius-md)",
//                     border: "0.5px solid var(--color-border-secondary)",
//                     background: "var(--color-background-primary)",
//                     fontSize: 12,
//                     fontWeight: 700,
//                     cursor: "pointer",
//                     color: "var(--color-text-primary)",
//                   }}
//                 >
//                   <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
//                     history
//                   </span>
//                   Activity
//                 </button>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Meta chips */}
//         <div
//           style={{
//             display: "flex",
//             gap: 8,
//             flexWrap: "wrap",
//             paddingBottom: "1rem",
//           }}
//         >
//           {session?.created_at && (
//             <span
//               style={{
//                 height: 28,
//                 display: "inline-flex",
//                 alignItems: "center",
//                 padding: "0 12px",
//                 borderRadius: 99,
//                 background: "var(--color-background-info)",
//                 color: "var(--color-text-info)",
//                 fontSize: 12,
//                 fontWeight: 500,
//               }}
//             >
//               {new Date(session.created_at).toLocaleDateString()}
//             </span>
//           )}
//           {session?.status && (
//             <span
//               style={{
//                 height: 28,
//                 display: "inline-flex",
//                 alignItems: "center",
//                 padding: "0 12px",
//                 borderRadius: 99,
//                 background: "var(--color-background-secondary)",
//                 color: "var(--color-text-secondary)",
//                 fontSize: 12,
//                 fontWeight: 500,
//                 border: "0.5px solid var(--color-border-tertiary)",
//               }}
//             >
//               Status: {session.status}
//             </span>
//           )}
//           <span
//             style={{
//               height: 28,
//               display: "inline-flex",
//               alignItems: "center",
//               padding: "0 12px",
//               borderRadius: 99,
//               background: "var(--color-background-secondary)",
//               color: "var(--color-text-secondary)",
//               fontSize: 12,
//               fontWeight: 500,
//               border: "0.5px solid var(--color-border-tertiary)",
//             }}
//           >
//             <span className="material-symbols-outlined" style={{ fontSize: 13, marginRight: 4 }}>
//               group
//             </span>
//             {sessionMembersCount} members
//           </span>
//         </div>

//         {/* ── Approval summary cards (PM only) ── */}
//         {myRole === "project_manager" && requirements.length > 0 && (
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
//               gap: 10,
//               marginBottom: "1.5rem",
//             }}
//           >
//             {[
//               {
//                 label: "Total Requirements",
//                 value: overallStats.total,
//                 color: "var(--color-text-primary)",
//                 bg: "var(--color-background-secondary)",
//               },
//               {
//                 label: "Approved",
//                 value: overallStats.approved,
//                 color: "var(--color-text-success)",
//                 bg: "var(--color-background-success)",
//               },
//               {
//                 label: "Pending Approval",
//                 value: overallStats.pending,
//                 color: "var(--color-text-warning)",
//                 bg: "var(--color-background-warning)",
//               },
//               {
//                 label: "Rejected",
//                 value: overallStats.rejected,
//                 color: "var(--color-text-danger)",
//                 bg: "var(--color-background-danger)",
//               },
//             ].map((stat) => (
//               <div
//                 key={stat.label}
//                 style={{
//                   background: stat.bg,
//                   borderRadius: "var(--border-radius-md)",
//                   padding: "14px 16px",
//                   display: "flex",
//                   flexDirection: "column",
//                   gap: 4,
//                 }}
//               >
//                 <span
//                   style={{
//                     fontSize: 12,
//                     color: stat.color,
//                     opacity: 0.75,
//                     fontWeight: 500,
//                   }}
//                 >
//                   {stat.label}
//                 </span>
//                 <span
//                   style={{ fontSize: 26, fontWeight: 700, color: stat.color, lineHeight: 1 }}
//                 >
//                   {stat.value}
//                 </span>
//               </div>
//             ))}
//           </div>
//         )}

//         {/* ── Tabs ── */}
//         <div
//           style={{
//             borderBottom: "0.5px solid var(--color-border-tertiary)",
//             marginBottom: "1.5rem",
//           }}
//         >
//           <div style={{ display: "flex", gap: "2rem" }}>
//             {TAB_LIST.map((tab) => (
//               <button
//                 key={tab}
//                 onClick={() => setActiveTab(tab)}
//                 style={{
//                   background: "none",
//                   border: "none",
//                   borderBottom: activeTab === tab
//                     ? "2.5px solid var(--color-text-info)"
//                     : "2.5px solid transparent",
//                   padding: "12px 0 10px",
//                   fontSize: 13,
//                   fontWeight: 700,
//                   cursor: "pointer",
//                   color:
//                     activeTab === tab
//                       ? "var(--color-text-primary)"
//                       : "var(--color-text-secondary)",
//                   transition: "color 0.15s",
//                 }}
//               >
//                 {tab}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* ── Tab content ── */}

//         {/* REQUIREMENTS TAB */}
//         {activeTab === "Requirements" && (
//           <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
//             {requirements.length === 0 ? (
//               <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
//                 No requirements extracted yet.
//               </p>
//             ) : (
//               <>
//                 {/* Functional */}
//                 {requirements.filter((r) => r.type === "Functional").length > 0 && (
//                   <div>
//                     <SectionHeader
//                       icon="check_circle"
//                       title="Functional Requirements"
//                       count={requirements.filter((r) => r.type === "Functional").length}
//                     />
//                     <div
//                       style={{
//                         display: "flex",
//                         flexDirection: "column",
//                         gap: 8,
//                       }}
//                     >
//                       {requirements
//                         .filter((r) => r.type === "Functional")
//                         .map((req, i) => {
//                           const { approved, total } = getApprovalStats(req);
//                           const isPending = !req.status || req.status === "pending";
//                           return (
//                             <div
//                               key={req.id || i}
//                               style={{
//                                 background: "var(--color-background-primary)",
//                                 border: "0.5px solid var(--color-border-tertiary)",
//                                 borderRadius: "var(--border-radius-lg)",
//                                 padding: "14px 18px",
//                                 display: "flex",
//                                 flexDirection: "column",
//                                 gap: 10,
//                               }}
//                             >
//                               <div
//                                 style={{
//                                   display: "flex",
//                                   justifyContent: "space-between",
//                                   alignItems: "flex-start",
//                                   gap: 12,
//                                 }}
//                               >
//                                 <p
//                                   style={{
//                                     margin: 0,
//                                     fontSize: 14,
//                                     color: "var(--color-text-primary)",
//                                     lineHeight: 1.6,
//                                     flex: 1,
//                                   }}
//                                 >
//                                   {req.text || req.description || `Requirement ${i + 1}`}
//                                 </p>
//                                 <StatusBadge status={req.status || "pending"} />
//                               </div>
//                               {isPending && total > 0 && (
//                                 <div>
//                                   <p
//                                     style={{
//                                       margin: "0 0 6px",
//                                       fontSize: 11,
//                                       color: "var(--color-text-secondary)",
//                                       fontWeight: 500,
//                                     }}
//                                   >
//                                     Member approvals
//                                   </p>
//                                   <ApprovalBar approved={approved} total={total} />
//                                 </div>
//                               )}
//                             </div>
//                           );
//                         })}
//                     </div>
//                   </div>
//                 )}

//                 {/* Non-Functional */}
//                 {requirements.filter((r) => r.type === "Non-Functional").length > 0 && (
//                   <div>
//                     <SectionHeader
//                       icon="tune"
//                       title="Non-Functional Requirements"
//                       count={requirements.filter((r) => r.type === "Non-Functional").length}
//                     />
//                     <div
//                       style={{
//                         display: "flex",
//                         flexDirection: "column",
//                         gap: 8,
//                       }}
//                     >
//                       {requirements
//                         .filter((r) => r.type === "Non-Functional")
//                         .map((req, i) => {
//                           const { approved, total } = getApprovalStats(req);
//                           const isPending = !req.status || req.status === "pending";
//                           return (
//                             <div
//                               key={req.id || i}
//                               style={{
//                                 background: "var(--color-background-primary)",
//                                 border: "0.5px solid var(--color-border-tertiary)",
//                                 borderRadius: "var(--border-radius-lg)",
//                                 padding: "14px 18px",
//                                 display: "flex",
//                                 flexDirection: "column",
//                                 gap: 10,
//                               }}
//                             >
//                               <div
//                                 style={{
//                                   display: "flex",
//                                   justifyContent: "space-between",
//                                   alignItems: "flex-start",
//                                   gap: 12,
//                                 }}
//                               >
//                                 <p
//                                   style={{
//                                     margin: 0,
//                                     fontSize: 14,
//                                     color: "var(--color-text-primary)",
//                                     lineHeight: 1.6,
//                                     flex: 1,
//                                   }}
//                                 >
//                                   {req.text || req.description || `Requirement ${i + 1}`}
//                                 </p>
//                                 <StatusBadge status={req.status || "pending"} />
//                               </div>
//                               {isPending && total > 0 && (
//                                 <div>
//                                   <p
//                                     style={{
//                                       margin: "0 0 6px",
//                                       fontSize: 11,
//                                       color: "var(--color-text-secondary)",
//                                       fontWeight: 500,
//                                     }}
//                                   >
//                                     Member approvals
//                                   </p>
//                                   <ApprovalBar approved={approved} total={total} />
//                                 </div>
//                               )}
//                             </div>
//                           );
//                         })}
//                     </div>
//                   </div>
//                 )}
//               </>
//             )}
//           </div>
//         )}

//         {/* TRANSCRIPT TAB */}
//         {activeTab === "Transcript" && (
//           <div>
//             <SectionHeader icon="record_voice_over" title="Session Transcript" count={transcript.length} />
//             {transcript.length === 0 ? (
//               <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
//                 No transcript available for this session.
//               </p>
//             ) : (
//               <div
//                 style={{
//                   display: "flex",
//                   flexDirection: "column",
//                   gap: 12,
//                 }}
//               >
//                 {transcript.map((entry, i) => (
//                   <div
//                     key={i}
//                     style={{
//                       display: "flex",
//                       gap: 14,
//                       alignItems: "flex-start",
//                     }}
//                   >
//                     <div
//                       style={{
//                         width: 32,
//                         height: 32,
//                         borderRadius: "50%",
//                         background: "var(--color-background-info)",
//                         display: "flex",
//                         alignItems: "center",
//                         justifyContent: "center",
//                         fontSize: 12,
//                         fontWeight: 700,
//                         color: "var(--color-text-info)",
//                         flexShrink: 0,
//                       }}
//                     >
//                       {(entry.speaker || "?")[0].toUpperCase()}
//                     </div>
//                     <div
//                       style={{
//                         flex: 1,
//                         background: "var(--color-background-secondary)",
//                         borderRadius: "var(--border-radius-lg)",
//                         padding: "10px 14px",
//                       }}
//                     >
//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                           marginBottom: 4,
//                         }}
//                       >
//                         <span
//                           style={{
//                             fontSize: 12,
//                             fontWeight: 700,
//                             color: "var(--color-text-primary)",
//                           }}
//                         >
//                           {entry.speaker || "Speaker"}
//                         </span>
//                         {entry.timestamp && (
//                           <span
//                             style={{
//                               fontSize: 11,
//                               color: "var(--color-text-secondary)",
//                             }}
//                           >
//                             {entry.timestamp}
//                           </span>
//                         )}
//                       </div>
//                       <p
//                         style={{
//                           margin: 0,
//                           fontSize: 13,
//                           color: "var(--color-text-primary)",
//                           lineHeight: 1.6,
//                         }}
//                       >
//                         {entry.text}
//                       </p>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         )}

//         {/* ARTIFACTS TAB */}
//         {activeTab === "Artifacts" && (
//           <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
//             <SectionHeader icon="widgets" title="Generated Artifacts" />

//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
//                 gap: 14,
//               }}
//             >
//               {/* UML Diagram card */}
//               <div
//                 style={{
//                   background: "var(--color-background-primary)",
//                   border: "0.5px solid var(--color-border-tertiary)",
//                   borderRadius: "var(--border-radius-lg)",
//                   padding: "1.25rem",
//                   display: "flex",
//                   flexDirection: "column",
//                   gap: 12,
//                 }}
//               >
//                 <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//                   <div
//                     style={{
//                       width: 36,
//                       height: 36,
//                       borderRadius: "var(--border-radius-md)",
//                       background: "var(--color-background-info)",
//                       display: "flex",
//                       alignItems: "center",
//                       justifyContent: "center",
//                     }}
//                   >
//                     <span
//                       className="material-symbols-outlined"
//                       style={{ fontSize: 20, color: "var(--color-text-info)" }}
//                     >
//                       account_tree
//                     </span>
//                   </div>
//                   <div>
//                     <p
//                       style={{
//                         margin: 0,
//                         fontWeight: 700,
//                         fontSize: 14,
//                         color: "var(--color-text-primary)",
//                       }}
//                     >
//                       UML Diagram
//                     </p>
//                     <p
//                       style={{
//                         margin: 0,
//                         fontSize: 11,
//                         color: "var(--color-text-secondary)",
//                       }}
//                     >
//                       System architecture model
//                     </p>
//                   </div>
//                 </div>
//                 {artifacts.uml ? (
//                   <button
//                     onClick={() =>
//                       navigate(`/projects/${projectId}/sessions/${sessionId}/uml`)
//                     }
//                     style={{
//                       display: "inline-flex",
//                       alignItems: "center",
//                       justifyContent: "center",
//                       gap: 6,
//                       height: 34,
//                       borderRadius: "var(--border-radius-md)",
//                       border: "0.5px solid var(--color-border-secondary)",
//                       background: "var(--color-background-secondary)",
//                       fontSize: 12,
//                       fontWeight: 700,
//                       cursor: "pointer",
//                       color: "var(--color-text-primary)",
//                     }}
//                   >
//                     <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
//                       open_in_new
//                     </span>
//                     View UML
//                   </button>
//                 ) : (
//                   <span
//                     style={{
//                       fontSize: 12,
//                       color: "var(--color-text-secondary)",
//                       padding: "6px 0",
//                     }}
//                   >
//                     Not generated yet
//                   </span>
//                 )}
//               </div>

//               {/* SRS card */}
//               <div
//                 style={{
//                   background: "var(--color-background-primary)",
//                   border: "0.5px solid var(--color-border-tertiary)",
//                   borderRadius: "var(--border-radius-lg)",
//                   padding: "1.25rem",
//                   display: "flex",
//                   flexDirection: "column",
//                   gap: 12,
//                 }}
//               >
//                 <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//                   <div
//                     style={{
//                       width: 36,
//                       height: 36,
//                       borderRadius: "var(--border-radius-md)",
//                       background: "var(--color-background-success)",
//                       display: "flex",
//                       alignItems: "center",
//                       justifyContent: "center",
//                     }}
//                   >
//                     <span
//                       className="material-symbols-outlined"
//                       style={{ fontSize: 20, color: "var(--color-text-success)" }}
//                     >
//                       description
//                     </span>
//                   </div>
//                   <div>
//                     <p
//                       style={{
//                         margin: 0,
//                         fontWeight: 700,
//                         fontSize: 14,
//                         color: "var(--color-text-primary)",
//                       }}
//                     >
//                       SRS Document
//                     </p>
//                     <p
//                       style={{
//                         margin: 0,
//                         fontSize: 11,
//                         color: "var(--color-text-secondary)",
//                       }}
//                     >
//                       Software requirements spec
//                     </p>
//                   </div>
//                 </div>
//                 {artifacts.srs ? (
//                   <button
//                     onClick={() =>
//                       navigate(`/projects/${projectId}/sessions/${sessionId}/srs`)
//                     }
//                     style={{
//                       display: "inline-flex",
//                       alignItems: "center",
//                       justifyContent: "center",
//                       gap: 6,
//                       height: 34,
//                       borderRadius: "var(--border-radius-md)",
//                       border: "0.5px solid var(--color-border-secondary)",
//                       background: "var(--color-background-secondary)",
//                       fontSize: 12,
//                       fontWeight: 700,
//                       cursor: "pointer",
//                       color: "var(--color-text-primary)",
//                     }}
//                   >
//                     <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
//                       open_in_new
//                     </span>
//                     View SRS
//                   </button>
//                 ) : (
//                   <span
//                     style={{
//                       fontSize: 12,
//                       color: "var(--color-text-secondary)",
//                       padding: "6px 0",
//                     }}
//                   >
//                     Not generated yet
//                   </span>
//                 )}
//               </div>

//               {/* Transcript artifact card */}
//               <div
//                 style={{
//                   background: "var(--color-background-primary)",
//                   border: "0.5px solid var(--color-border-tertiary)",
//                   borderRadius: "var(--border-radius-lg)",
//                   padding: "1.25rem",
//                   display: "flex",
//                   flexDirection: "column",
//                   gap: 12,
//                 }}
//               >
//                 <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//                   <div
//                     style={{
//                       width: 36,
//                       height: 36,
//                       borderRadius: "var(--border-radius-md)",
//                       background: "var(--color-background-warning)",
//                       display: "flex",
//                       alignItems: "center",
//                       justifyContent: "center",
//                     }}
//                   >
//                     <span
//                       className="material-symbols-outlined"
//                       style={{ fontSize: 20, color: "var(--color-text-warning)" }}
//                     >
//                       mic
//                     </span>
//                   </div>
//                   <div>
//                     <p
//                       style={{
//                         margin: 0,
//                         fontWeight: 700,
//                         fontSize: 14,
//                         color: "var(--color-text-primary)",
//                       }}
//                     >
//                       Transcript
//                     </p>
//                     <p
//                       style={{
//                         margin: 0,
//                         fontSize: 11,
//                         color: "var(--color-text-secondary)",
//                       }}
//                     >
//                       Full meeting transcript
//                     </p>
//                   </div>
//                 </div>
//                 {transcript.length > 0 ? (
//                   <button
//                     onClick={() => setActiveTab("Transcript")}
//                     style={{
//                       display: "inline-flex",
//                       alignItems: "center",
//                       justifyContent: "center",
//                       gap: 6,
//                       height: 34,
//                       borderRadius: "var(--border-radius-md)",
//                       border: "0.5px solid var(--color-border-secondary)",
//                       background: "var(--color-background-secondary)",
//                       fontSize: 12,
//                       fontWeight: 700,
//                       cursor: "pointer",
//                       color: "var(--color-text-primary)",
//                     }}
//                   >
//                     <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
//                       visibility
//                     </span>
//                     View Transcript
//                   </button>
//                 ) : (
//                   <span
//                     style={{
//                       fontSize: 12,
//                       color: "var(--color-text-secondary)",
//                       padding: "6px 0",
//                     }}
//                   >
//                     Not available yet
//                   </span>
//                 )}
//               </div>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Toast */}
//       {notification && (
//         <div
//           style={{
//             position: "fixed",
//             bottom: 24,
//             right: 24,
//             padding: "12px 18px",
//             borderRadius: "var(--border-radius-lg)",
//             background: "var(--color-background-primary)",
//             border: `0.5px solid ${
//               notification.type === "success"
//                 ? "var(--color-border-success)"
//                 : "var(--color-border-danger)"
//             }`,
//             display: "flex",
//             alignItems: "center",
//             gap: 10,
//             zIndex: 99,
//             boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
//           }}
//         >
//           <span
//             className="material-symbols-outlined"
//             style={{
//               color:
//                 notification.type === "success"
//                   ? "var(--color-text-success)"
//                   : "var(--color-text-danger)",
//               fontSize: 18,
//             }}
//           >
//             {notification.type === "success" ? "check_circle" : "cancel"}
//           </span>
//           <p
//             style={{
//               margin: 0,
//               fontSize: 13,
//               fontWeight: 600,
//               color: "var(--color-text-primary)",
//             }}
//           >
//             {notification.message}
//           </p>
//         </div>
//       )}
//     </div>
//   );
// }
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getToken } from "../../api/authApi";
import {
  fetchProject,
  fetchMyRole,
  fetchPendingRequests,
  acceptInvitation,
  rejectInvitation,
  fetchProjectAuditLogs,
} from "../../api/projectApi";

const BASE_URL = "http://127.0.0.1:8000";

const TAB_LIST = ["Requirements", "Transcript", "Artifacts"];

function ApprovalBar({ approved, total }) {
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
  const color =
    pct === 100
      ? "var(--color-background-success)"
      : pct >= 50
      ? "#EF9F27"
      : "var(--color-background-danger)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 6,
          borderRadius: 99,
          background: "var(--color-border-tertiary)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 99,
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 12,
          color: "var(--color-text-secondary)",
          minWidth: 44,
          textAlign: "right",
        }}
      >
        {approved}/{total}
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    approved: {
      bg: "var(--color-background-success)",
      color: "var(--color-text-success)",
      label: "Approved",
    },
    pending: {
      bg: "var(--color-background-warning)",
      color: "var(--color-text-warning)",
      label: "Pending",
    },
    rejected: {
      bg: "var(--color-background-danger)",
      color: "var(--color-text-danger)",
      label: "Rejected",
    },
    in_review: {
      bg: "var(--color-background-info)",
      color: "var(--color-text-info)",
      label: "In Review",
    },
  };
  const s = map[status] || map["pending"];
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 10px",
        borderRadius: 99,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

function SectionHeader({ icon, title, count }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 18, color: "var(--color-text-secondary)" }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "var(--color-text-primary)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {title}
      </span>
      {count !== undefined && (
        <span
          style={{
            marginLeft: 4,
            background: "var(--color-background-secondary)",
            color: "var(--color-text-secondary)",
            fontSize: 11,
            fontWeight: 700,
            padding: "1px 8px",
            borderRadius: 99,
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

export default function SessionDetailsPage() {
  const navigate = useNavigate();
  const { projectId, sessionId } = useParams();

  const [project, setProject] = useState(null);
  const [session, setSession] = useState(null);
  const [myRole, setMyRole] = useState(null);
  // ✅ members now holds SESSION members only (fetched from /api/sessions/:id/members)
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Requirements");

  const [requirements, setRequirements] = useState([]);
  const [transcript, setTranscript] = useState([]);
  const [artifacts, setArtifacts] = useState({ uml: null, srs: null });

  const [pendingRequests, setPendingRequests] = useState([]);
  const [showRequestsPanel, setShowRequestsPanel] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [notification, setNotification] = useState(null);

  const [auditLogs, setAuditLogs] = useState([]);
  const [showLogsModal, setShowLogsModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const headers = { Authorization: `Bearer ${getToken()}` };

        // ✅ Fetch session members from the correct session-scoped endpoint
        const [proj, roleData, sessRes, sessionMembersData] = await Promise.all([
          fetchProject(projectId),
          fetchMyRole(projectId),
          fetch(`${BASE_URL}/api/sessions/${sessionId}`, { headers }).then((r) => r.json()),
          fetch(`${BASE_URL}/api/sessions/${sessionId}/members`, { headers }).then((r) => r.json()),
        ]);

        setProject(proj);
        setMyRole(roleData.role);
        setSession(sessRes);
        // ✅ Only participants of THIS session are stored in members
        setMembers(Array.isArray(sessionMembersData) ? sessionMembersData : []);

        if (sessRes.transcript) {
          setTranscript(
            Array.isArray(sessRes.transcript)
              ? sessRes.transcript
              : [{ text: sessRes.transcript, speaker: "Unknown", timestamp: null }]
          );
        }

        const reqRes = await fetch(
          `${BASE_URL}/api/sessions/${sessionId}/requirements`,
          { headers }
        ).then((r) => r.json().catch(() => null));

        if (reqRes) {
          const functional = reqRes.functional_requirements || reqRes.data?.functional_requirements || [];
          const nonFunctional =
            reqRes.nonfunctional_requirements ||
            reqRes.non_functional_requirements ||
            reqRes.data?.nonfunctional_requirements ||
            reqRes.data?.non_functional_requirements ||
            [];
          setRequirements([
            ...functional.map((r) => ({ ...r, type: "Functional" })),
            ...nonFunctional.map((r) => ({ ...r, type: "Non-Functional" })),
          ]);
        }

        const umlRes = await fetch(
          `${BASE_URL}/api/sessions/${sessionId}/uml`,
          { headers }
        )
          .then((r) => r.json().catch(() => null))
          .catch(() => null);

        const srsRes = await fetch(
          `${BASE_URL}/api/sessions/${sessionId}/srs`,
          { headers }
        )
          .then((r) => r.json().catch(() => null))
          .catch(() => null);

        setArtifacts({ uml: umlRes, srs: srsRes });

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
  }, [projectId, sessionId]);

  const openLogsModal = async () => {
    try {
      const logData = await fetchProjectAuditLogs(projectId);
      setAuditLogs(logData.filter((l) => String(l.session_id) === String(sessionId)));
      setShowLogsModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ Updated to use session member shape: { user_id, role, user: { full_name, email } }
  const getMemberName = (m) =>
    m.user?.full_name || m.user?.email || `User #${m.user_id}`;

  const getMemberEmail = (m) => m.user?.email || "";

  const getMemberRole = (m) => m.role?.toLowerCase() || "member";

  const getActingRole = (userEmail) => {
    if (!userEmail) return "";
    const member = members.find((m) => getMemberEmail(m) === userEmail);
    if (member) return getMemberRole(member).replace(/_/g, " ");
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

  const sessionMembersCount = members.length;

  const getApprovalStats = (req) => {
    const approvals = req.approvals || [];
    const approved = approvals.filter((a) => a.status === "approved").length;
    return { approved, total: sessionMembersCount };
  };

  const overallStats = (() => {
    const total = requirements.length;
    const approved = requirements.filter((r) => r.status === "approved").length;
    const pending = requirements.filter((r) => !r.status || r.status === "pending").length;
    const rejected = requirements.filter((r) => r.status === "rejected").length;
    return { total, approved, pending, rejected };
  })();

  if (loading)
    return (
      <p style={{ padding: "2rem", color: "var(--color-text-secondary)" }}>
        Loading...
      </p>
    );

  return (
    <div style={{ width: "100%", fontFamily: "var(--font-sans)" }}>
      {/* ── Requests panel ── */}
      {showRequestsPanel && myRole === "project_manager" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "var(--color-background-primary)",
              borderRadius: "var(--border-radius-xl)",
              width: "100%",
              maxWidth: 480,
              maxHeight: "80vh",
              overflowY: "auto",
              padding: "1.5rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              border: "0.5px solid var(--color-border-tertiary)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                  margin: 0,
                }}
              >
                Join Requests
                {pendingRequests.length > 0 && (
                  <span
                    style={{
                      marginLeft: 8,
                      background: "var(--color-background-danger)",
                      color: "var(--color-text-danger)",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 99,
                    }}
                  >
                    {pendingRequests.length}
                  </span>
                )}
              </h2>
              <button
                onClick={() => setShowRequestsPanel(false)}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  close
                </span>
              </button>
            </div>
            {pendingRequests.length === 0 ? (
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  textAlign: "center",
                  padding: "2rem 0",
                  fontSize: 14,
                }}
              >
                No pending requests.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "var(--color-background-secondary)",
                      borderRadius: "var(--border-radius-lg)",
                      padding: "12px 16px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(req.invitee_full_name || "User")}&background=random&color=fff`}
                        style={{ width: 36, height: 36, borderRadius: "50%" }}
                        alt=""
                      />
                      <div>
                        <p
                          style={{
                            fontWeight: 600,
                            fontSize: 13,
                            margin: 0,
                            color: "var(--color-text-primary)",
                          }}
                        >
                          {req.invitee_full_name || "Unknown User"}
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: "var(--color-text-secondary)",
                            margin: 0,
                          }}
                        >
                          {req.invitee_email}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() =>
                          handleAccept(
                            req.id,
                            req.invitee_full_name || `User #${req.invitee_user_id}`
                          )
                        }
                        style={{
                          padding: "4px 14px",
                          borderRadius: "var(--border-radius-md)",
                          background: "var(--color-background-success)",
                          color: "var(--color-text-success)",
                          border: "none",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() =>
                          handleReject(
                            req.id,
                            req.invitee_full_name || `User #${req.invitee_user_id}`
                          )
                        }
                        style={{
                          padding: "4px 14px",
                          borderRadius: "var(--border-radius-md)",
                          background: "var(--color-background-danger)",
                          color: "var(--color-text-danger)",
                          border: "none",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
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

      {/* ── Members modal ── */}
      {showMembersModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "var(--color-background-primary)",
              borderRadius: "var(--border-radius-xl)",
              width: "100%",
              maxWidth: 420,
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              border: "0.5px solid var(--color-border-tertiary)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1.25rem 1.5rem",
                borderBottom: "0.5px solid var(--color-border-tertiary)",
              }}
            >
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  margin: 0,
                  color: "var(--color-text-primary)",
                }}
              >
                {/* ✅ Label clarified to "Session Participants" */}
                Session Participants{" "}
                <span
                  style={{ fontWeight: 400, color: "var(--color-text-secondary)", fontSize: 13 }}
                >
                  ({members.length})
                </span>
              </h2>
              <button
                onClick={() => setShowMembersModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  close
                </span>
              </button>
            </div>
            <div
              style={{
                padding: "1rem",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {members.length === 0 ? (
                <p
                  style={{
                    color: "var(--color-text-secondary)",
                    textAlign: "center",
                    padding: "2rem 0",
                    fontSize: 14,
                  }}
                >
                  No participants in this session.
                </p>
              ) : (
                // ✅ Uses session member shape: m.user.full_name, m.user.email, m.role
                members.map((m) => {
                  const name = getMemberName(m);
                  const email = getMemberEmail(m);
                  const role = getMemberRole(m);
                  return (
                    <div
                      key={m.user_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        borderRadius: "var(--border-radius-md)",
                        background: "var(--color-background-secondary)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <img
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`}
                          style={{ width: 36, height: 36, borderRadius: "50%" }}
                          alt=""
                        />
                        <div>
                          <p
                            style={{
                              fontWeight: 600,
                              fontSize: 13,
                              margin: 0,
                              color: "var(--color-text-primary)",
                            }}
                          >
                            {name}
                          </p>
                          <p
                            style={{
                              fontSize: 11,
                              color: "var(--color-text-secondary)",
                              margin: 0,
                            }}
                          >
                            {email}
                          </p>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background:
                            role === "session_owner"
                              ? "var(--color-background-info)"
                              : "var(--color-background-secondary)",
                          color:
                            role === "session_owner"
                              ? "var(--color-text-info)"
                              : "var(--color-text-secondary)",
                          border: "0.5px solid var(--color-border-tertiary)",
                        }}
                      >
                        {role === "session_owner"
                          ? "Owner"
                          : role.charAt(0).toUpperCase() + role.slice(1)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Activity log modal ── */}
      {showLogsModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "var(--color-background-primary)",
              borderRadius: "var(--border-radius-xl)",
              width: "100%",
              maxWidth: 640,
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              margin: "1rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              border: "0.5px solid var(--color-border-tertiary)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1.25rem 1.5rem",
                borderBottom: "0.5px solid var(--color-border-tertiary)",
              }}
            >
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  margin: 0,
                  color: "var(--color-text-primary)",
                }}
              >
                Session Activity Log
              </h2>
              <button
                onClick={() => setShowLogsModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  close
                </span>
              </button>
            </div>
            <div
              style={{
                padding: "1.25rem 1.5rem",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {auditLogs.length === 0 ? (
                <p
                  style={{
                    color: "var(--color-text-secondary)",
                    textAlign: "center",
                    padding: "2rem 0",
                    fontSize: 14,
                  }}
                >
                  No actions recorded yet.
                </p>
              ) : (
                auditLogs.map((log) => {
                  const roleName = getActingRole(log.user_email);
                  return (
                    <div
                      key={log.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "10px 14px",
                        borderRadius: "var(--border-radius-md)",
                        background: "var(--color-background-secondary)",
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: 16,
                          color: "var(--color-text-info)",
                          marginTop: 2,
                        }}
                      >
                        circle
                      </span>
                      <div style={{ flex: 1 }}>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            margin: 0,
                            color: "var(--color-text-primary)",
                          }}
                        >
                          {log.user_name || "Unknown"}{" "}
                          {roleName && (
                            <span
                              style={{
                                fontWeight: 400,
                                color: "var(--color-text-secondary)",
                                fontSize: 11,
                              }}
                            >
                              ({roleName})
                            </span>
                          )}{" "}
                          <span
                            style={{
                              fontWeight: 400,
                              color: "var(--color-text-secondary)",
                            }}
                          >
                            {log.action.replace(/_/g, " ")}
                          </span>
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: "var(--color-text-secondary)",
                            margin: "4px 0 0",
                          }}
                        >
                          {new Date(log.created_at).toLocaleString()} · {log.user_email}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div
        style={{
          padding: "2rem 1.5rem",
          maxWidth: 1080,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            paddingBottom: "1rem",
          }}
        >
          {/* Left: back + title + role */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={() => navigate(`/projects/${projectId}`)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-secondary)",
                fontSize: 13,
                padding: 0,
                marginBottom: 4,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                arrow_back
              </span>
              {project?.name}
            </button>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                margin: 0,
                color: "var(--color-text-primary)",
                lineHeight: 1.2,
              }}
            >
              {session?.title || `Session #${sessionId}`}
            </h1>
            {myRole && (
              <span
                style={{
                  width: "fit-content",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 99,
                  background: "var(--color-background-info)",
                  color: "var(--color-text-info)",
                }}
              >
                Your role: {myRole.replace("_", " ")}
              </span>
            )}
          </div>

          {/* Right: action buttons */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 10,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
            >
              {myRole && (
                <button
                  onClick={() => setShowMembersModal(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    height: 32,
                    padding: "0 12px",
                    borderRadius: "var(--border-radius-md)",
                    border: "0.5px solid var(--color-border-secondary)",
                    background: "var(--color-background-primary)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    group
                  </span>
                  Participants
                  <span
                    style={{
                      background: "var(--color-background-secondary)",
                      color: "var(--color-text-secondary)",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 99,
                    }}
                  >
                    {members.length}
                  </span>
                </button>
              )}

              {myRole === "project_manager" && (
                <button
                  onClick={() => navigate(`/projects/${projectId}/add-participant`)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    height: 32,
                    padding: "0 12px",
                    borderRadius: "var(--border-radius-md)",
                    border: "none",
                    background: "#059669",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    person_add
                  </span>
                  Add Participant
                </button>
              )}

              {myRole === "project_manager" && (
                <button
                  onClick={() => setShowRequestsPanel(true)}
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    height: 32,
                    padding: "0 12px",
                    borderRadius: "var(--border-radius-md)",
                    border: "0.5px solid var(--color-border-secondary)",
                    background: "var(--color-background-primary)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    group_add
                  </span>
                  Requests
                  {pendingRequests.length > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: "var(--color-background-danger)",
                        color: "var(--color-text-danger)",
                        fontSize: 9,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                      }}
                    >
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
              )}

              {myRole === "project_manager" && (
                <button
                  onClick={openLogsModal}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    height: 32,
                    padding: "0 12px",
                    borderRadius: "var(--border-radius-md)",
                    border: "0.5px solid var(--color-border-secondary)",
                    background: "var(--color-background-primary)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    history
                  </span>
                  Activity
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Meta chips */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            paddingBottom: "1rem",
          }}
        >
          {session?.created_at && (
            <span
              style={{
                height: 28,
                display: "inline-flex",
                alignItems: "center",
                padding: "0 12px",
                borderRadius: 99,
                background: "var(--color-background-info)",
                color: "var(--color-text-info)",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {new Date(session.created_at).toLocaleDateString()}
            </span>
          )}
          {session?.status && (
            <span
              style={{
                height: 28,
                display: "inline-flex",
                alignItems: "center",
                padding: "0 12px",
                borderRadius: 99,
                background: "var(--color-background-secondary)",
                color: "var(--color-text-secondary)",
                fontSize: 12,
                fontWeight: 500,
                border: "0.5px solid var(--color-border-tertiary)",
              }}
            >
              Status: {session.status}
            </span>
          )}
          <span
            style={{
              height: 28,
              display: "inline-flex",
              alignItems: "center",
              padding: "0 12px",
              borderRadius: 99,
              background: "var(--color-background-secondary)",
              color: "var(--color-text-secondary)",
              fontSize: 12,
              fontWeight: 500,
              border: "0.5px solid var(--color-border-tertiary)",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 13, marginRight: 4 }}>
              group
            </span>
            {/* ✅ Now shows session participant count, not project member count */}
            {sessionMembersCount} participants
          </span>
        </div>

        {/* ── Approval summary cards (PM only) ── */}
        {myRole === "project_manager" && requirements.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
              marginBottom: "1.5rem",
            }}
          >
            {[
              {
                label: "Total Requirements",
                value: overallStats.total,
                color: "var(--color-text-primary)",
                bg: "var(--color-background-secondary)",
              },
              {
                label: "Approved",
                value: overallStats.approved,
                color: "var(--color-text-success)",
                bg: "var(--color-background-success)",
              },
              {
                label: "Pending Approval",
                value: overallStats.pending,
                color: "var(--color-text-warning)",
                bg: "var(--color-background-warning)",
              },
              {
                label: "Rejected",
                value: overallStats.rejected,
                color: "var(--color-text-danger)",
                bg: "var(--color-background-danger)",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: stat.bg,
                  borderRadius: "var(--border-radius-md)",
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: stat.color,
                    opacity: 0.75,
                    fontWeight: 500,
                  }}
                >
                  {stat.label}
                </span>
                <span
                  style={{ fontSize: 26, fontWeight: 700, color: stat.color, lineHeight: 1 }}
                >
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Tabs ── */}
        <div
          style={{
            borderBottom: "0.5px solid var(--color-border-tertiary)",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", gap: "2rem" }}>
            {TAB_LIST.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === tab
                    ? "2.5px solid var(--color-text-info)"
                    : "2.5px solid transparent",
                  padding: "12px 0 10px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  color:
                    activeTab === tab
                      ? "var(--color-text-primary)"
                      : "var(--color-text-secondary)",
                  transition: "color 0.15s",
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab content ── */}

        {/* REQUIREMENTS TAB */}
        {activeTab === "Requirements" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {requirements.length === 0 ? (
              <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
                No requirements extracted yet.
              </p>
            ) : (
              <>
                {/* Functional */}
                {requirements.filter((r) => r.type === "Functional").length > 0 && (
                  <div>
                    <SectionHeader
                      icon="check_circle"
                      title="Functional Requirements"
                      count={requirements.filter((r) => r.type === "Functional").length}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {requirements
                        .filter((r) => r.type === "Functional")
                        .map((req, i) => {
                          const { approved, total } = getApprovalStats(req);
                          const isPending = !req.status || req.status === "pending";
                          return (
                            <div
                              key={req.id || i}
                              style={{
                                background: "var(--color-background-primary)",
                                border: "0.5px solid var(--color-border-tertiary)",
                                borderRadius: "var(--border-radius-lg)",
                                padding: "14px 18px",
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  gap: 12,
                                }}
                              >
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: 14,
                                    color: "var(--color-text-primary)",
                                    lineHeight: 1.6,
                                    flex: 1,
                                  }}
                                >
                                  {req.text || req.description || `Requirement ${i + 1}`}
                                </p>
                                <StatusBadge status={req.status || "pending"} />
                              </div>
                              {isPending && total > 0 && (
                                <div>
                                  <p
                                    style={{
                                      margin: "0 0 6px",
                                      fontSize: 11,
                                      color: "var(--color-text-secondary)",
                                      fontWeight: 500,
                                    }}
                                  >
                                    Participant approvals
                                  </p>
                                  <ApprovalBar approved={approved} total={total} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Non-Functional */}
                {requirements.filter((r) => r.type === "Non-Functional").length > 0 && (
                  <div>
                    <SectionHeader
                      icon="tune"
                      title="Non-Functional Requirements"
                      count={requirements.filter((r) => r.type === "Non-Functional").length}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {requirements
                        .filter((r) => r.type === "Non-Functional")
                        .map((req, i) => {
                          const { approved, total } = getApprovalStats(req);
                          const isPending = !req.status || req.status === "pending";
                          return (
                            <div
                              key={req.id || i}
                              style={{
                                background: "var(--color-background-primary)",
                                border: "0.5px solid var(--color-border-tertiary)",
                                borderRadius: "var(--border-radius-lg)",
                                padding: "14px 18px",
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  gap: 12,
                                }}
                              >
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: 14,
                                    color: "var(--color-text-primary)",
                                    lineHeight: 1.6,
                                    flex: 1,
                                  }}
                                >
                                  {req.text || req.description || `Requirement ${i + 1}`}
                                </p>
                                <StatusBadge status={req.status || "pending"} />
                              </div>
                              {isPending && total > 0 && (
                                <div>
                                  <p
                                    style={{
                                      margin: "0 0 6px",
                                      fontSize: 11,
                                      color: "var(--color-text-secondary)",
                                      fontWeight: 500,
                                    }}
                                  >
                                    Participant approvals
                                  </p>
                                  <ApprovalBar approved={approved} total={total} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TRANSCRIPT TAB */}
        {activeTab === "Transcript" && (
          <div>
            <SectionHeader icon="record_voice_over" title="Session Transcript" count={transcript.length} />
            {transcript.length === 0 ? (
              <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
                No transcript available for this session.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {transcript.map((entry, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "var(--color-background-info)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--color-text-info)",
                        flexShrink: 0,
                      }}
                    >
                      {(entry.speaker || "?")[0].toUpperCase()}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        background: "var(--color-background-secondary)",
                        borderRadius: "var(--border-radius-lg)",
                        padding: "10px 14px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>
                          {entry.speaker || "Speaker"}
                        </span>
                        {entry.timestamp && (
                          <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                            {entry.timestamp}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.6 }}>
                        {entry.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ARTIFACTS TAB */}
        {activeTab === "Artifacts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <SectionHeader icon="widgets" title="Generated Artifacts" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              {/* UML Diagram card */}
              <div
                style={{
                  background: "var(--color-background-primary)",
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: "var(--border-radius-lg)",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36, height: 36,
                      borderRadius: "var(--border-radius-md)",
                      background: "var(--color-background-info)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--color-text-info)" }}>
                      account_tree
                    </span>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--color-text-primary)" }}>
                      UML Diagram
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-secondary)" }}>
                      System architecture model
                    </p>
                  </div>
                </div>
                {artifacts.uml ? (
                  <button
                    onClick={() => navigate(`/projects/${projectId}/sessions/${sessionId}/uml`)}
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                      height: 34, borderRadius: "var(--border-radius-md)",
                      border: "0.5px solid var(--color-border-secondary)",
                      background: "var(--color-background-secondary)",
                      fontSize: 12, fontWeight: 700, cursor: "pointer", color: "var(--color-text-primary)",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_new</span>
                    View UML
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)", padding: "6px 0" }}>
                    Not generated yet
                  </span>
                )}
              </div>

              {/* SRS card */}
              <div
                style={{
                  background: "var(--color-background-primary)",
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: "var(--border-radius-lg)",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36, height: 36,
                      borderRadius: "var(--border-radius-md)",
                      background: "var(--color-background-success)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--color-text-success)" }}>
                      description
                    </span>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--color-text-primary)" }}>
                      SRS Document
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-secondary)" }}>
                      Software requirements spec
                    </p>
                  </div>
                </div>
                {artifacts.srs ? (
                  <button
                    onClick={() => navigate(`/projects/${projectId}/sessions/${sessionId}/srs`)}
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                      height: 34, borderRadius: "var(--border-radius-md)",
                      border: "0.5px solid var(--color-border-secondary)",
                      background: "var(--color-background-secondary)",
                      fontSize: 12, fontWeight: 700, cursor: "pointer", color: "var(--color-text-primary)",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_new</span>
                    View SRS
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)", padding: "6px 0" }}>
                    Not generated yet
                  </span>
                )}
              </div>

              {/* Transcript artifact card */}
              <div
                style={{
                  background: "var(--color-background-primary)",
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: "var(--border-radius-lg)",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36, height: 36,
                      borderRadius: "var(--border-radius-md)",
                      background: "var(--color-background-warning)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--color-text-warning)" }}>
                      mic
                    </span>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--color-text-primary)" }}>
                      Transcript
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-secondary)" }}>
                      Full meeting transcript
                    </p>
                  </div>
                </div>
                {transcript.length > 0 ? (
                  <button
                    onClick={() => setActiveTab("Transcript")}
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                      height: 34, borderRadius: "var(--border-radius-md)",
                      border: "0.5px solid var(--color-border-secondary)",
                      background: "var(--color-background-secondary)",
                      fontSize: 12, fontWeight: 700, cursor: "pointer", color: "var(--color-text-primary)",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>visibility</span>
                    View Transcript
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)", padding: "6px 0" }}>
                    Not available yet
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {notification && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            padding: "12px 18px",
            borderRadius: "var(--border-radius-lg)",
            background: "var(--color-background-primary)",
            border: `0.5px solid ${
              notification.type === "success"
                ? "var(--color-border-success)"
                : "var(--color-border-danger)"
            }`,
            display: "flex",
            alignItems: "center",
            gap: 10,
            zIndex: 99,
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              color:
                notification.type === "success"
                  ? "var(--color-text-success)"
                  : "var(--color-text-danger)",
              fontSize: 18,
            }}
          >
            {notification.type === "success" ? "check_circle" : "cancel"}
          </span>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
            {notification.message}
          </p>
        </div>
      )}
    </div>
  );
}