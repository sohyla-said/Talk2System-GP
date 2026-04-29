// import { useNavigate, useParams } from "react-router-dom";
// import { useEffect, useState } from "react";
// import { getToken } from "../../api/authApi";
// import { fetchMembers } from "../../api/projectApi";

// const BASE_URL = "http://127.0.0.1:8000";

// export default function StartSessionPage() {
//   const navigate = useNavigate();
//   const { id: projectId } = useParams();

//   const [title, setTitle] = useState("");
//   const [members, setMembers] = useState([]);
//   const [selectedMembers, setSelectedMembers] = useState([]);
//   const [projectManager, setProjectManager] = useState(null);
//   const [loading, setLoading] = useState(false);

//   // Fetch members from API
//   useEffect(() => {
//     const loadMembers = async () => {
//       try {
//         setLoading(true);
//         const data = await fetchMembers(projectId);
//         setMembers(data);

//         // Find project manager
//         const manager = data.find((m) => m.role === "project_manager");
//         setProjectManager(manager);

//         if (manager) {
//           setSelectedMembers([manager.user_id]);
//         }
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadMembers();
//   }, [projectId]);

//   // ✅ Toggle participants
//   const toggleMember = (id) => {
//     if (id === projectManager?.user_id) return;

//     setSelectedMembers((prev) =>
//       prev.includes(id)
//         ? prev.filter((m) => m !== id)
//         : [...prev, id]
//     );
//   };

//   // Submit
//   const handleSubmit = (e) => {
//     e.preventDefault();

//     navigate(`/projects/${projectId}/recording`, {
//       state: {
//         sessionTitle: title,
//         participants: selectedMembers,
//       },
//     });
//   };

//   return (
//     <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
//       <div className="max-w-[960px] mx-auto px-4 sm:px-8 py-6">

//         {/* Back */}
//         <div className="mb-6">
//           <button
//             onClick={() => navigate(`/projects/${projectId}`)}
//             className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary"
//           >
//             <span className="material-symbols-outlined">arrow_back</span>
//             Back to Project
//           </button>
//         </div>

//         {/* Header */}
//         <div className="mb-6">
//           <h1 className="text-3xl font-black text-[#100d1c] dark:text-white">
//             Start Meeting Session
//           </h1>
//           <p className="text-gray-500 dark:text-gray-400 mt-1">
//             Add session title and participants
//           </p>
//         </div>

//         <div className="bg-white dark:bg-background-dark/50 border border-gray-200 dark:border-white/5 rounded-xl shadow">
//           <div className="p-6 md:p-8">

//             {loading ? (
//               <p className="text-gray-500">Loading members...</p>
//             ) : (
//               <form onSubmit={handleSubmit} className="space-y-6">

//                 {/* Title */}
//                 <div>
//                   <label className="block text-sm font-bold mb-1">
//                     Session Title
//                   </label>
//                   <input
//                     type="text"
//                     value={title}
//                     onChange={(e) => setTitle(e.target.value)}
//                     required
//                     className="w-full rounded-lg bg-background-light dark:bg-background-dark/80 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20"
//                   />
//                 </div>

//                 {/* Members */}
//                 <div>
//                   <label className="block text-sm font-bold mb-3">
//                     Participants
//                   </label>

//                   <div className="space-y-2">
//                     {members.map((m) => (
//                       <label key={m.user_id} className="flex gap-3 items-center">
//                         <input
//                           type="checkbox"
//                           checked={selectedMembers.includes(m.user_id)}
//                           onChange={() => toggleMember(m.user_id)}
//                           disabled={m.role === "project_manager"}
//                         />
//                         <span>
//                           {m.full_name || m.email}
//                           {m.role === "project_manager" && (
//                             <span className="ml-2 text-xs text-primary">
//                               (Project Manager)
//                             </span>
//                           )}
//                         </span>
//                       </label>
//                     ))}
//                   </div>
//                 </div>

//                 {/* Buttons */}
//                 <div className="flex gap-4 pt-4">
//                   <button
//                     type="submit"
//                     className="px-6 py-2.5 rounded-lg text-white font-bold bg-primary"
//                   >
//                     Start & Record
//                   </button>

//                   <button
//                     type="button"
//                     onClick={() => navigate(`/projects/{id}/recording`)}
//                     className="px-6 py-2.5 rounded-lg font-bold text-gray-600"
//                   >
//                     Cancel
//                   </button>
//                 </div>

//               </form>
//             )}

//           </div>
//         </div>

//       </div>
//     </div>
//   );
// }
// // SessionDetailsPage.jsx
// // import React, { useEffect, useState } from "react";
// // import { useNavigate, useParams } from "react-router-dom";
// // import { getToken } from "../../api/authApi";

// // const BASE_URL = "http://127.0.0.1:8000";

// // export default function SessionDetailsPage() {
// //   const navigate = useNavigate();
// //   const { id: projectId, sessionId } = useParams();

// //   const [session, setSession]   = useState(null);
// //   const [members, setMembers]   = useState([]);
// //   const [myRole, setMyRole]     = useState(null);
// //   const [loading, setLoading]   = useState(true);
// //   const [notification, setNotification] = useState(null);

// //   const [showMembersModal, setShowMembersModal] = useState(false);

// //   useEffect(() => {
// //     const load = async () => {
// //       try {
// //         const headers = { Authorization: `Bearer ${getToken()}` };

// //         const [sessRes, membersRes, roleRes] = await Promise.all([
// //           fetch(`${BASE_URL}/api/sessions/${sessionId}`, { headers }).then(r => r.json()),
// //           fetch(`${BASE_URL}/api/sessions/${sessionId}/members`, { headers }).then(r => r.json()),
// //           fetch(`${BASE_URL}/api/projects/${projectId}/my-role`, { headers }).then(r => r.json()),
// //         ]);

// //         setSession(sessRes);
// //         setMembers(Array.isArray(membersRes) ? membersRes : []);
// //         setMyRole(roleRes?.role || null);
// //       } catch (err) {
// //         console.error(err);
// //       } finally {
// //         setLoading(false);
// //       }
// //     };
// //     load();
// //   }, [sessionId, projectId]);

// //   const handleDeleteSession = async () => {
// //     if (!confirm("Delete this session? This cannot be undone.")) return;
// //     try {
// //       const res = await fetch(`${BASE_URL}/api/sessions/${sessionId}`, {
// //         method: "DELETE",
// //         headers: { Authorization: `Bearer ${getToken()}` },
// //       });
// //       if (!res.ok) throw new Error("Failed to delete");
// //       showToast("Session deleted", "success");
// //       setTimeout(() => navigate(`/projects/${projectId}`), 1000);
// //     } catch (err) {
// //       showToast(err.message, "error");
// //     }
// //   };

// //   function showToast(message, type) {
// //     setNotification({ message, type });
// //     setTimeout(() => setNotification(null), 3000);
// //   }

// //   const statusColors = {
// //     processing: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
// //     completed:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
// //     failed:     "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
// //   };

// //   const roleColors = {
// //     owner:    "bg-primary/10 text-primary",
// //     member:   "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
// //     observer: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
// //   };

// //   if (loading) return <p className="p-8 text-gray-400">Loading...</p>;
// //   if (!session) return <p className="p-8 text-red-400">Session not found.</p>;

// //   const statusKey = session.status?.toLowerCase() || "processing";

// //   return (
// //     <div className="w-full font-display">

// //       {/* ── Members Modal ── */}
// //       {showMembersModal && (
// //         <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
// //           <div className="bg-white dark:bg-[#1a162e] rounded-xl w-full max-w-md max-h-[80vh] flex flex-col shadow-xl m-4">
// //             <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
// //               <h2 className="text-lg font-black text-[#100d1c] dark:text-white">
// //                 Session Participants
// //                 <span className="ml-2 text-sm font-normal text-gray-400">({members.length})</span>
// //               </h2>
// //               <button onClick={() => setShowMembersModal(false)} className="text-gray-400 hover:text-gray-600">
// //                 <span className="material-symbols-outlined">close</span>
// //               </button>
// //             </div>
// //             <div className="p-4 overflow-y-auto space-y-2">
// //               {members.length === 0 ? (
// //                 <p className="text-gray-400 text-center py-10">No members in this session.</p>
// //               ) : (
// //                 members.map((m) => {
// //                   const name = m.user?.full_name || m.user?.email || `User #${m.user_id}`;
// //                   const role = m.role?.toLowerCase() || "member";
// //                   return (
// //                     <div key={m.user_id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[#231e3d]">
// //                       <div className="flex items-center gap-3">
// //                         <div
// //                           className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 flex-shrink-0"
// //                           style={{ backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff)` }}
// //                         />
// //                         <div>
// //                           <p className="font-semibold text-sm text-gray-900 dark:text-white">{name}</p>
// //                           <p className="text-xs text-gray-400">{m.user?.email || ""}</p>
// //                         </div>
// //                       </div>
// //                       <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleColors[role] || roleColors.member}`}>
// //                         {role.charAt(0).toUpperCase() + role.slice(1)}
// //                       </span>
// //                     </div>
// //                   );
// //                 })
// //               )}
// //             </div>
// //           </div>
// //         </div>
// //       )}

// //       <div className="px-4 sm:px-6 lg:px-10 flex flex-1 justify-center py-8">
// //         <div className="flex flex-col w-full max-w-5xl gap-6">

// //           {/* ── Back + Header ── */}
// //           <div className="flex flex-wrap justify-between items-start gap-4 p-4">
// //             <div className="flex flex-col gap-2 min-w-72">

// //               {/* Back link */}
// //               <button
// //                 onClick={() => navigate(`/projects/${projectId}`)}
// //                 className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 w-fit mb-1"
// //               >
// //                 <span className="material-symbols-outlined text-sm">arrow_back</span>
// //                 Back to project
// //               </button>

// //               {/* Title */}
// //               <p className="text-gray-900 dark:text-white text-4xl font-black leading-tight">
// //                 {session.title || `Session #${session.id}`}
// //               </p>

// //               {/* Pills row */}
// //               <div className="flex flex-wrap gap-2 mt-1">
// //                 <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColors[statusKey] || statusColors.processing}`}>
// //                   {session.status}
// //                 </span>
// //                 {myRole && (
// //                   <span className="w-fit text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
// //                     Your role: {myRole.replace("_", " ")}
// //                   </span>
// //                 )}
// //               </div>
// //             </div>

// //             {/* Action buttons */}
// //             <div className="flex flex-col items-end gap-3">
// //               <div className="flex items-center gap-2 flex-wrap">
// //                 {/* Members button */}
// //                 <button
// //                   onClick={() => setShowMembersModal(true)}
// //                   className="relative flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
// //                 >
// //                   <span className="material-symbols-outlined text-sm">group</span>
// //                   Participants
// //                   <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
// //                     {members.length}
// //                   </span>
// //                 </button>

// //                 {/* PM-only: delete */}
// //                 {myRole === "project_manager" && (
// //                   <button
// //                     onClick={handleDeleteSession}
// //                     className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-red-300 text-red-500 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition"
// //                   >
// //                     <span className="material-symbols-outlined text-sm">delete</span>
// //                     Delete
// //                   </button>
// //                 )}
// //               </div>
// //             </div>
// //           </div>

// //           {/* ── Meta chips ── */}
// //           <div className="flex gap-3 px-4 flex-wrap">
// //             <span className="flex h-7 items-center rounded-full bg-primary/10 px-3 text-primary text-xs font-medium">
// //               Created: {session.created_at ? new Date(session.created_at).toLocaleDateString() : "—"}
// //             </span>
// //             <span className="flex h-7 items-center rounded-full bg-primary/10 px-3 text-primary text-xs font-medium">
// //               Project #{projectId}
// //             </span>
// //             {session.audio_file_path && (
// //               <span className="flex h-7 items-center rounded-full bg-primary/10 px-3 text-primary text-xs font-medium gap-1">
// //                 <span className="material-symbols-outlined text-sm">audio_file</span>
// //                 Audio attached
// //               </span>
// //             )}
// //           </div>

// //           {/* ── Body grid ── */}
// //           <div className="px-4 grid grid-cols-1 lg:grid-cols-3 gap-6">

// //             {/* Transcript card — spans 2 cols */}
// //             <div className="lg:col-span-2 flex flex-col gap-4">
// //               <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
// //                 <div className="flex items-center gap-2 mb-3">
// //                   <span className="material-symbols-outlined text-primary text-lg">transcript</span>
// //                   <p className="font-black text-sm text-gray-900 dark:text-white">Transcript</p>
// //                 </div>
// //                 {session.transcript_text ? (
// //                   <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
// //                     {session.transcript_text}
// //                   </p>
// //                 ) : (
// //                   <p className="text-sm text-gray-400 italic">No transcript available yet.</p>
// //                 )}
// //               </div>
// //             </div>

// //             {/* Side panel */}
// //             <div className="flex flex-col gap-4">

// //               {/* Stats */}
// //               <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
// //                 <p className="font-black text-sm text-gray-900 dark:text-white mb-3">Overview</p>
// //                 <div className="space-y-3">
// //                   {[
// //                     { icon: "group",      label: "Participants", val: members.length },
// //                     { icon: "folder",     label: "Project",      val: `#${projectId}` },
// //                     { icon: "schedule",   label: "Created",      val: session.created_at ? new Date(session.created_at).toLocaleDateString() : "—" },
// //                     { icon: "circle",     label: "Status",       val: session.status },
// //                   ].map(({ icon, label, val }) => (
// //                     <div key={label} className="flex items-center justify-between text-sm">
// //                       <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
// //                         <span className="material-symbols-outlined text-sm">{icon}</span>
// //                         {label}
// //                       </div>
// //                       <span className="font-semibold text-gray-800 dark:text-gray-200">{val}</span>
// //                     </div>
// //                   ))}
// //                 </div>
// //               </div>

// //               {/* Quick participants preview */}
// //               <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
// //                 <div className="flex items-center justify-between mb-3">
// //                   <p className="font-black text-sm text-gray-900 dark:text-white">Participants</p>
// //                   <button
// //                     onClick={() => setShowMembersModal(true)}
// //                     className="text-xs text-primary hover:underline font-semibold"
// //                   >
// //                     View all
// //                   </button>
// //                 </div>
// //                 {members.length === 0 ? (
// //                   <p className="text-xs text-gray-400">No participants yet.</p>
// //                 ) : (
// //                   <div className="space-y-2">
// //                     {members.slice(0, 4).map((m) => {
// //                       const name = m.user?.full_name || m.user?.email || `User #${m.user_id}`;
// //                       const role = m.role?.toLowerCase() || "member";
// //                       return (
// //                         <div key={m.user_id} className="flex items-center gap-2">
// //                           <div
// //                             className="bg-center bg-no-repeat bg-cover rounded-full size-7 flex-shrink-0"
// //                             style={{ backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=32)` }}
// //                           />
// //                           <div className="flex-1 min-w-0">
// //                             <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{name}</p>
// //                           </div>
// //                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${roleColors[role] || roleColors.member}`}>
// //                             {role.charAt(0).toUpperCase() + role.slice(1)}
// //                           </span>
// //                         </div>
// //                       );
// //                     })}
// //                     {members.length > 4 && (
// //                       <p className="text-xs text-gray-400 pt-1">+{members.length - 4} more</p>
// //                     )}
// //                   </div>
// //                 )}
// //               </div>

// //             </div>
// //           </div>

// //         </div>
// //       </div>

// //       {/* ── Toast ── */}
// //       {notification && (
// //         <div className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-xl flex gap-3 border z-50 ${
// //           notification.type === "success"
// //             ? "bg-white dark:bg-[#1a162e] border-emerald-500/30"
// //             : "bg-white dark:bg-[#1a162e] border-red-500/30"
// //         }`}>
// //           <span className={`material-symbols-outlined ${notification.type === "success" ? "text-emerald-500" : "text-red-500"}`}>
// //             {notification.type === "success" ? "check_circle" : "cancel"}
// //           </span>
// //           <p className="font-bold text-sm">{notification.message}</p>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }
// import { useNavigate, useParams } from "react-router-dom";
// import { useEffect, useState } from "react";
// import { getToken } from "../../api/authApi";
// import { fetchMembers } from "../../api/projectApi";

// const BASE_URL = "http://127.0.0.1:8000";

// export default function StartSessionPage() {
//   const navigate = useNavigate();
//   const { id: projectId } = useParams();

//   const [title, setTitle] = useState("");
//   const [members, setMembers] = useState([]);
//   const [selectedIds, setSelectedIds] = useState([]);
//   const [pmId, setPmId] = useState(null);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     const loadMembers = async () => {
//       try {
//         setLoading(true);
//         const data = await fetchMembers(projectId);
//         setMembers(data);

//         // fetchMembers returns objects with shape { id, user_id, full_name, email, role }
//         // use whichever id field your API returns — try user_id first, fall back to id
//         const manager = data.find((m) => m.role === "project_manager");
//         if (manager) {
//           const managerId = manager.user_id ?? manager.id;
//           setPmId(managerId);
//           // PM is always pre-selected
//           setSelectedIds([managerId]);
//         }
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadMembers();
//   }, [projectId]);

//   const getMemberId = (m) => m.user_id ?? m.id;

//   const toggleMember = (m) => {
//     const id = getMemberId(m);
//     // PM cannot be toggled off
//     if (id === pmId) return;

//     setSelectedIds((prev) =>
//       prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
//     );
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (!title.trim()) return;

//     navigate(`/projects/${projectId}/recording`, {
//       state: {
//         sessionTitle: title,
//         participants: selectedIds,   // ← passed through to RecordingSessionPage
//       },
//     });
//   };

//   return (
//     <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
//       <div className="max-w-[960px] mx-auto px-4 sm:px-8 py-6">

//         {/* Back */}
//         <div className="mb-6">
//           <button
//             onClick={() => navigate(`/projects/${projectId}`)}
//             className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary"
//           >
//             <span className="material-symbols-outlined">arrow_back</span>
//             Back to Project
//           </button>
//         </div>

//         {/* Header */}
//         <div className="mb-6">
//           <h1 className="text-3xl font-black text-[#100d1c] dark:text-white">
//             Start Meeting Session
//           </h1>
//           <p className="text-gray-500 dark:text-gray-400 mt-1">
//             Add session title and select participants
//           </p>
//         </div>

//         <div className="bg-white dark:bg-background-dark/50 border border-gray-200 dark:border-white/5 rounded-xl shadow">
//           <div className="p-6 md:p-8">

//             {loading ? (
//               <p className="text-gray-500">Loading members...</p>
//             ) : (
//               <form onSubmit={handleSubmit} className="space-y-6">

//                 {/* Title */}
//                 <div>
//                   <label className="block text-sm font-bold mb-1">
//                     Session Title
//                   </label>
//                   <input
//                     type="text"
//                     value={title}
//                     onChange={(e) => setTitle(e.target.value)}
//                     required
//                     placeholder="e.g. Sprint Planning – Week 3"
//                     className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-background-light dark:bg-background-dark/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
//                   />
//                 </div>

//                 {/* Participants */}
//                 <div>
//                   <label className="block text-sm font-bold mb-1">
//                     Participants
//                   </label>
//                   <p className="text-xs text-gray-400 mb-3">
//                     The Project Manager is always included. Select additional participants.
//                   </p>

//                   <div className="space-y-2 rounded-lg border border-gray-200 dark:border-white/10 divide-y divide-gray-100 dark:divide-white/5 overflow-hidden">
//                     {members.map((m) => {
//                       const id = getMemberId(m);
//                       const isPM = id === pmId;
//                       const isChecked = selectedIds.includes(id);

//                       return (
//                         <label
//                           key={id}
//                           className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
//                             ${isPM
//                               ? "bg-primary/5 dark:bg-primary/10 cursor-default"
//                               : "hover:bg-gray-50 dark:hover:bg-white/5"
//                             }`}
//                         >
//                           <input
//                             type="checkbox"
//                             checked={isChecked}
//                             onChange={() => toggleMember(m)}
//                             disabled={isPM}
//                             className="accent-primary w-4 h-4 rounded flex-shrink-0"
//                           />

//                           {/* Avatar */}
//                           <div
//                             className="w-8 h-8 rounded-full bg-center bg-cover flex-shrink-0"
//                             style={{
//                               backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(
//                                 m.full_name || m.email || "U"
//                               )}&background=random&color=fff&size=32)`,
//                             }}
//                           />

//                           <div className="flex-1 min-w-0">
//                             <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
//                               {m.full_name || "Unknown"}
//                             </p>
//                             <p className="text-xs text-gray-400 truncate">{m.email}</p>
//                           </div>

//                           {isPM && (
//                             <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary flex-shrink-0">
//                               Project Manager
//                             </span>
//                           )}
//                         </label>
//                       );
//                     })}

//                     {members.length === 0 && (
//                       <p className="px-4 py-6 text-sm text-gray-400 text-center">
//                         No members found in this project.
//                       </p>
//                     )}
//                   </div>

//                   <p className="text-xs text-gray-400 mt-2">
//                     {selectedIds.length} participant{selectedIds.length !== 1 ? "s" : ""} selected
//                   </p>
//                 </div>

//                 {/* Buttons */}
//                 <div className="flex gap-4 pt-2">
//                   <button
//                     type="submit"
//                     disabled={!title.trim()}
//                     className="px-6 py-2.5 rounded-lg text-white font-bold bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
//                   >
//                     Start & Record
//                   </button>

//                   <button
//                     type="button"
//                     onClick={() => navigate(`/projects/${projectId}`)}
//                     className="px-6 py-2.5 rounded-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition"
//                   >
//                     Cancel
//                   </button>
//                 </div>

//               </form>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }



///////////final shrouk code/////
// import { useNavigate, useParams } from "react-router-dom";
// import { useEffect, useState } from "react";
// import { fetchMembers } from "../../api/projectApi";

// export default function StartSessionPage() {
//   const navigate = useNavigate();
//   const { id: projectId } = useParams();

//   const [title, setTitle] = useState("");
//   const [members, setMembers] = useState([]);
//   const [selectedIds, setSelectedIds] = useState([]);
//   const [pmId, setPmId] = useState(null);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     const loadMembers = async () => {
//       try {
//         setLoading(true);
//         const data = await fetchMembers(projectId);
//         setMembers(data);

//         const manager = data.find((m) => m.role === "project_manager");
//         if (manager) {
//           const managerId = manager.user_id ?? manager.id;
//           setPmId(managerId);
//           // PM is tracked but NOT added to selectedIds (backend handles it)
//           setSelectedIds([]);
//         }
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadMembers();
//   }, [projectId]);

//   const getMemberId = (m) => m.user_id ?? m.id;

//   const toggleMember = (m) => {
//     const id = getMemberId(m);
//     setSelectedIds((prev) =>
//       prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
//     );
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (!title.trim()) return;

//     navigate(`/projects/${projectId}/recording`, {
//       state: {
//         sessionTitle: title,
//         participants: selectedIds, // backend always adds PM separately
//       },
//     });
//   };

//   const nonPmMembers = members.filter((m) => getMemberId(m) !== pmId);

//   return (
//     <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
//       <div className="max-w-[960px] mx-auto px-4 sm:px-8 py-6">

//         {/* Back */}
//         <div className="mb-6">
//           <button
//             onClick={() => navigate(`/projects/${projectId}`)}
//             className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary"
//           >
//             <span className="material-symbols-outlined">arrow_back</span>
//             Back to Project
//           </button>
//         </div>

//         {/* Header */}
//         <div className="mb-6">
//           <h1 className="text-3xl font-black text-[#100d1c] dark:text-white">
//             Start Meeting Session
//           </h1>
//           <p className="text-gray-500 dark:text-gray-400 mt-1">
//             Add session title and select additional participants
//           </p>
//         </div>

//         <div className="bg-white dark:bg-background-dark/50 border border-gray-200 dark:border-white/5 rounded-xl shadow">
//           <div className="p-6 md:p-8">

//             {loading ? (
//               <p className="text-gray-500">Loading members...</p>
//             ) : (
//               <form onSubmit={handleSubmit} className="space-y-6">

//                 {/* Session Title */}
//                 <div>
//                   <label className="block text-sm font-bold mb-1">
//                     Session Title
//                   </label>
//                   <input
//                     type="text"
//                     value={title}
//                     onChange={(e) => setTitle(e.target.value)}
//                     required
//                     placeholder="e.g. Sprint Planning – Week 3"
//                     className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-background-light dark:bg-background-dark/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
//                   />
//                 </div>

//                 {/* Participants */}
//                 <div>
//                   <label className="block text-sm font-bold mb-1">
//                     Participants
//                   </label>
//                   <p className="text-xs text-gray-400 mb-3">
//                     The Project Manager is always included automatically. Select any additional participants below.
//                   </p>

//                   <div className="space-y-2 rounded-lg border border-gray-200 dark:border-white/10 divide-y divide-gray-100 dark:divide-white/5 overflow-hidden">
//                     {nonPmMembers.map((m) => {
//                       const id = getMemberId(m);
//                       const isChecked = selectedIds.includes(id);

//                       return (
//                         <label
//                           key={id}
//                           className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
//                         >
//                           <input
//                             type="checkbox"
//                             checked={isChecked}
//                             onChange={() => toggleMember(m)}
//                             className="accent-primary w-4 h-4 rounded flex-shrink-0"
//                           />

//                           {/* Avatar */}
//                           <div
//                             className="w-8 h-8 rounded-full bg-center bg-cover flex-shrink-0"
//                             style={{
//                               backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(
//                                 m.full_name || m.email || "U"
//                               )}&background=random&color=fff&size=32)`,
//                             }}
//                           />

//                           <div className="flex-1 min-w-0">
//                             <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
//                               {m.full_name || "Unknown"}
//                             </p>
//                             <p className="text-xs text-gray-400 truncate">
//                               {m.email}
//                             </p>
//                           </div>
//                         </label>
//                       );
//                     })}

//                     {nonPmMembers.length === 0 && (
//                       <p className="px-4 py-6 text-sm text-gray-400 text-center">
//                         No other members in this project.
//                       </p>
//                     )}
//                   </div>

//                   <p className="text-xs text-gray-400 mt-2">
//                     {selectedIds.length} additional participant{selectedIds.length !== 1 ? "s" : ""} selected
//                     — Project Manager always included
//                   </p>
//                 </div>

//                 {/* Action Buttons */}
//                 <div className="flex gap-4 pt-2">
//                   <button
//                     type="submit"
//                     disabled={!title.trim()}
//                     className="px-6 py-2.5 rounded-lg text-white font-bold bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
//                   >
//                     Start & Record
//                   </button>

//                   <button
//                     type="button"
//                     onClick={() => navigate(`/projects/${projectId}`)}
//                     className="px-6 py-2.5 rounded-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition"
//                   >
//                     Cancel
//                   </button>
//                 </div>

//               </form>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchMembers } from "../../api/projectApi";

export default function StartSessionPage() {
  const navigate = useNavigate();
  const { id: projectId } = useParams();

  const [title, setTitle] = useState("");
  const [members, setMembers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pmId, setPmId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        setLoading(true);
        const data = await fetchMembers(projectId);
        setMembers(data);

        const manager = data.find((m) => m.role === "project_manager");
        if (manager) {
          const managerId = manager.user_id ?? manager.id;
          setPmId(managerId);
          // PM is tracked but NOT added to selectedIds (backend handles it)
          setSelectedIds([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [projectId]);

  const getMemberId = (m) => m.user_id ?? m.id;

  const toggleMember = (m) => {
    const id = getMemberId(m);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    navigate(`/projects/${projectId}/recording`, {
      state: {
        sessionTitle: title,
        participants: selectedIds, // non-PM participants; backend adds PM from project membership
        pmId,                      // forwarded so RecordingSessionPage can pass it onward if needed
      },
    });
  };

  const nonPmMembers = members.filter((m) => getMemberId(m) !== pmId);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
      <div className="max-w-[960px] mx-auto px-4 sm:px-8 py-6">

        {/* Back */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Project
          </button>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-[#100d1c] dark:text-white">
            Start Meeting Session
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Add session title and select additional participants
          </p>
        </div>

        <div className="bg-white dark:bg-background-dark/50 border border-gray-200 dark:border-white/5 rounded-xl shadow">
          <div className="p-6 md:p-8">

            {loading ? (
              <p className="text-gray-500">Loading members...</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Session Title */}
                <div>
                  <label className="block text-sm font-bold mb-1">
                    Session Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="e.g. Sprint Planning – Week 3"
                    className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-background-light dark:bg-background-dark/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Participants */}
                <div>
                  <label className="block text-sm font-bold mb-1">
                    Participants
                  </label>
                  <p className="text-xs text-gray-400 mb-3">
                    The Project Manager is always included automatically. Select any additional participants below.
                  </p>

                  <div className="space-y-2 rounded-lg border border-gray-200 dark:border-white/10 divide-y divide-gray-100 dark:divide-white/5 overflow-hidden">
                    {nonPmMembers.map((m) => {
                      const id = getMemberId(m);
                      const isChecked = selectedIds.includes(id);

                      return (
                        <label
                          key={id}
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleMember(m)}
                            className="accent-primary w-4 h-4 rounded flex-shrink-0"
                          />

                          {/* Avatar */}
                          <div
                            className="w-8 h-8 rounded-full bg-center bg-cover flex-shrink-0"
                            style={{
                              backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(
                                m.full_name || m.email || "U"
                              )}&background=random&color=fff&size=32)`,
                            }}
                          />

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {m.full_name || "Unknown"}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {m.email}
                            </p>
                          </div>
                        </label>
                      );
                    })}

                    {nonPmMembers.length === 0 && (
                      <p className="px-4 py-6 text-sm text-gray-400 text-center">
                        No other members in this project.
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 mt-2">
                    {selectedIds.length} additional participant{selectedIds.length !== 1 ? "s" : ""} selected
                    — Project Manager always included
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-2">
                  <button
                    type="submit"
                    disabled={!title.trim()}
                    className="px-6 py-2.5 rounded-lg text-white font-bold bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Start & Record
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/projects/${projectId}`)}
                    className="px-6 py-2.5 rounded-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                  >
                    Cancel
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}