// import React, { useEffect, useState } from "react";
// import { useNavigate, useParams, Outlet, useLocation } from "react-router-dom";

// const SessionDetailsPage = () => {
//   const navigate = useNavigate();
//   const { projectId, sessionId } = useParams();
//   const location = useLocation();

//   const [session, setSession] = useState(null);
//   const [loading, setLoading] = useState(true);

//   const currentTab = location.pathname.includes("transcript")
//     ? "transcript"
//     : location.pathname.includes("artifacts")
//     ? "artifacts"
//     : "requirements";

//   useEffect(() => {
//     const fetchSession = async () => {
//       try {
//         const res = await fetch(
//           `http://localhost:8000/api/sessions/${sessionId}`
//         );
//         const data = await res.json();
//         setSession(data);
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchSession();
//   }, [sessionId]);

//   const go = (tab) => {
//     navigate(
//       `/projects/${projectId}/sessions/${sessionId}/${tab === "requirements" ? "" : tab}`
//     );
//   };

//   return (
//     <div className="w-full px-6 py-6">

//       {/* HEADER */}
//       <div className="flex justify-between items-start mb-6">
//         <div>
//           <h1 className="text-3xl font-bold">
//             {session?.title || "Session Loading..."}
//           </h1>

//           <p className="text-gray-500 mt-1">
//             Created:{" "}
//             {session?.created_at
//               ? new Date(session.created_at).toLocaleDateString()
//               : "Loading..."}
//           </p>

//           <p className="text-gray-500">
//             Status: {session?.status || "Unknown"}
//           </p>
//         </div>

//         <button
//           onClick={() =>
//             navigate(
//               `/projects/${projectId}/sessions/${sessionId}/add-participant`
//             )
//           }
//           className="px-4 py-2 bg-gray-800 text-white rounded-lg"
//         >
//           Add Participant
//         </button>
//       </div>

//       {/* TABS */}
//       <div className="flex gap-6 border-b mb-6">
//         <button
//           onClick={() => go("requirements")}
//           className={`pb-2 ${
//             currentTab === "requirements"
//               ? "border-b-2 border-blue-500 font-bold"
//               : "text-gray-500"
//           }`}
//         >
//           Requirements
//         </button>

//         <button
//           onClick={() => navigate(`/transcript/${session.id}`)}
//           className={`pb-2 ${
//             currentTab === "transcript"
//               ? "border-b-2 border-blue-500 font-bold"
//               : "text-gray-500"
//           }`}
//         >
//           Transcript
//         </button>

//         <button
//           onClick={() => navigate(`/projects/${projectId}/artifacts/uml`)}
//             className={`pb-2 ${
//               currentTab === "diagrams"
//                 ? "border-b-2 border-blue-500 font-bold"
//                 : "text-gray-500"
//             }`}
//           >
//             Diagrams
//         </button>

//       <button
//         onClick={() => navigate(`/projects/${projectId}/artifacts/srs`)}
//         className={`pb-2 ${
//           currentTab === "documents"
//             ? "border-b-2 border-blue-500 font-bold"
//             : "text-gray-500"
//         }`}
//       >
//         Documents
//       </button>

//       </div>

//       {/* PAGE CONTENT */}
//       <Outlet />
//     </div>
//   );
// };

// export default SessionDetailsPage;
// import React, { useEffect, useState } from "react";
// import { useNavigate, useParams, Outlet, useLocation } from "react-router-dom";

// const SessionDetailsPage = () => {
//   const navigate = useNavigate();
//   const { projectId, sessionId } = useParams();
//   const location = useLocation();

//   const [session, setSession] = useState(null);
//   const [loading, setLoading] = useState(true);

//   const currentTab = location.pathname.includes("transcript")
//     ? "transcript"
//     : location.pathname.includes("diagrams")
//     ? "diagrams"
//     : location.pathname.includes("documents")
//     ? "documents"
//     : "requirements";

//   useEffect(() => {
//     const fetchSession = async () => {
//       try {
//         const res = await fetch(
//           `http://localhost:8000/api/sessions/${sessionId}`
//         );
//         const data = await res.json();
//         setSession(data);
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchSession();
//   }, [sessionId]);

//   const go = (tab) => {
//     navigate(
//       `/projects/${projectId}/sessions/${sessionId}/${
//         tab === "requirements" ? "" : tab
//       }`
//     );
//   };

//   return (
//     <div className="w-full px-6 py-6">

//       {/* HEADER (Project-style) */}
//       <div className="flex flex-wrap justify-between items-start gap-4 p-4">
//         <div className="flex min-w-72 flex-col gap-3">
//           <p className="text-gray-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
//             {session?.title || "Session Loading..."}
//           </p>

//       <div className="flex gap-3 flex-wrap">
  
//         <div className="flex h-8 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20 px-3">
//           <p className="text-primary dark:text-indigo-300 text-sm font-medium">
//             Created:{" "}
//             {session?.created_at
//               ? new Date(session.created_at).toLocaleDateString()
//               : "Loading..."}
//           </p>
//         </div>

//         {/* Status Chip */}
//         <div className="flex h-8 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20 px-3">
//           <p className="text-primary dark:text-indigo-300 text-sm font-medium">
//             Status: {session?.status || "Unknown"}
//           </p>
//         </div>
//       </div>

//         {/* Action Button */}
//         <div className="flex items-center gap-3">
//           <button
//             onClick={() =>
//               navigate(
//                 `/projects/${projectId}/sessions/${sessionId}/add-participant`
//               )
//             }
//             className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-bold leading-normal tracking-[0.015em] gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
//           >
//             <span className="material-symbols-outlined">person_add</span>
//             <span className="truncate">Add Participants</span>
//           </button>
//         </div>
//       </div>

//       {/* TABS */}
//       <div className="flex gap-6 border-b mb-6 px-4 mt-4">

//         <button
//           onClick={() => go("requirements")}
//           className={`pb-2 ${
//             currentTab === "requirements"
//               ? "border-b-2 border-blue-500 font-bold"
//               : "text-gray-500"
//           }`}
//         >
//           Requirements
//         </button>

//         <button
//           onClick={() => navigate(`/transcript/${sessionId}`)}
//           className={`pb-2 ${
//             currentTab === "transcript"
//               ? "border-b-2 border-blue-500 font-bold"
//               : "text-gray-500"
//           }`}
//         >
//           Transcript
//         </button>

//         <button
//           onClick={() =>
//             navigate(`/projects/${projectId}/artifacts/uml`)
//           }
//           className={`pb-2 ${
//             currentTab === "diagrams"
//               ? "border-b-2 border-blue-500 font-bold"
//               : "text-gray-500"
//           }`}
//         >
//           Diagrams
//         </button>

//         <button
//           onClick={() =>
//             navigate(`/projects/${projectId}/artifacts/srs`)
//           }
//           className={`pb-2 ${
//             currentTab === "documents"
//               ? "border-b-2 border-blue-500 font-bold"
//               : "text-gray-500"
//           }`}
//         >
//           Documents
//         </button>

//       </div>

//       {/* PAGE CONTENT */}
//       <Outlet />
//     </div>
//   );
// };

// export default SessionDetailsPage;