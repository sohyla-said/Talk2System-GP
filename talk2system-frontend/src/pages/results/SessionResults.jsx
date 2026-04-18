// // import React from "react";
// // import { useNavigate, useParams } from "react-router-dom";

// // export default function SessionResults() {
// //   const navigate = useNavigate();

// //   const { projectId, sessionId } = useParams(); // 🔥 dynamic params

// //   return (
// //     <div className="font-display bg-background-light dark:bg-background-dark min-h-screen flex flex-col items-center py-8 px-4 lg:px-10">

// //       {/* ================= BREADCRUMB ================= */}
// //       <div className="flex gap-2 text-sm w-full max-w-[1200px]">
// //         <button onClick={() => navigate("/projects")} className="text-primary-accent">
// //           Projects
// //         </button>
// //         <span>/</span>

// //         <button 
// //           onClick={() => navigate(`/projects/${projectId}`)} 
// //           className="text-primary-accent"
// //         >
// //           Project
// //         </button>
// //         <span>/</span>

// //         <button 
// //           onClick={() => navigate(`/projects/${projectId}/sessions/${sessionId}`)} 
// //           className="text-primary-accent"
// //         >
// //           Session
// //         </button>
// //         <span>/</span>

// //         <span>Results</span>
// //       </div>

// //       {/* ================= TITLE ================= */}
// //       <div className="w-full max-w-[1200px] py-4">
// //         <h1 className="text-3xl md:text-4xl font-black">
// //           Session Results
// //         </h1>
// //       </div>

// //       {/* ================= CARDS ================= */}
// //       <div className="mt-6 w-full max-w-[1200px] grid grid-cols-1 md:grid-cols-2 gap-6">

// //         {/* ================= SRS CARD ================= */}
// //         <div className="bg-card-light dark:bg-card-dark rounded-xl border p-5 shadow-sm hover:shadow-lg transition">
          
// //           <div className="flex items-center gap-2 mb-3">
// //             <span className="material-symbols-outlined text-blue-500">
// //               description
// //             </span>
// //             <h3 className="font-bold">SRS Document</h3>
// //           </div>

// //           <p className="text-sm text-gray-500 mb-4">
// //             Session-based Software Requirements Specification
// //           </p>

// //           <div className="flex justify-end">
// //             <button
// //               onClick={() =>
// //                 navigate(`/projects/${projectId}/sessions/${sessionId}/artifacts/srs`)
// //               }
// //               className="text-primary font-bold flex items-center gap-1"
// //             >
// //               View
// //               <span className="material-symbols-outlined text-[16px]">
// //                 arrow_forward
// //               </span>
// //             </button>
// //           </div>
// //         </div>

// //         {/* ================= UML CARD ================= */}
// //         <div className="bg-card-light dark:bg-card-dark rounded-xl border p-5 shadow-sm hover:shadow-lg transition">
          
// //           <div className="flex items-center gap-2 mb-3">
// //             <span className="material-symbols-outlined text-purple-500">
// //               account_tree
// //             </span>
// //             <h3 className="font-bold">UML Diagrams</h3>
// //           </div>

// //           <p className="text-sm text-gray-500 mb-4">
// //             Generate & view UML diagrams for this session
// //           </p>

// //           <div className="flex justify-end">
// //             <button
// //               onClick={() =>
// //                 navigate(`sessions/${sessionId}/artifacts/umlview`)
// //               }
// //               className="text-primary font-bold flex items-center gap-1"
// //             >
// //               Open
// //               <span className="material-symbols-outlined text-[16px]">
// //                 arrow_forward
// //               </span>
// //             </button>
// //           </div>
// //         </div>

// //       </div>
// //     </div>
// //   );
// // }
// import React from "react";
// import { useNavigate, useParams } from "react-router-dom";

// export default function SessionResults() {
//   const navigate = useNavigate();
//   const { projectId, sessionId } = useParams();

//   return (
//     <div className="font-display bg-background-light dark:bg-background-dark min-h-screen flex flex-col items-center py-8 px-4 lg:px-10">

//       {/* BREADCRUMB */}
//       <div className="flex gap-2 text-sm w-full max-w-[1200px]">
//         <button onClick={() => navigate("/projects")} className="text-primary-accent">
//           Projects
//         </button>
//         <span>/</span>

//         <button
//           onClick={() => navigate(`/projects/${projectId}`)}
//           className="text-primary-accent"
//         >
//           Project
//         </button>
//         <span>/</span>

//         <button
//           onClick={() =>
//             navigate(`/projects/${projectId}/sessions/${sessionId}`)
//           }
//           className="text-primary-accent"
//         >
//           Session
//         </button>
//         <span>/</span>

//         <span>Results</span>
//       </div>

//       {/* TITLE */}
//       <div className="w-full max-w-[1200px] py-4">
//         <h1 className="text-3xl md:text-4xl font-black">
//           Session Results
//         </h1>
//       </div>

//       {/* CARDS */}
//       <div className="mt-6 w-full max-w-[1200px] grid grid-cols-1 md:grid-cols-2 gap-6">

//         {/* SRS */}
//         <div className="bg-card-light dark:bg-card-dark rounded-xl border p-5 shadow-sm hover:shadow-lg transition">

//           <h3 className="font-bold mb-2">SRS Document</h3>

//           <button
//             onClick={() =>
//               navigate(`/projects/${projectId}/sessions/${sessionId}/artifacts/srs`)
//             }
//             className="text-primary font-bold"
//           >
//             View →
//           </button>
//         </div>

//         {/* UML */}
//         <div className="bg-card-light dark:bg-card-dark rounded-xl border p-5 shadow-sm hover:shadow-lg transition">

//           <h3 className="font-bold mb-2">UML Diagrams</h3>

//           <button
//             onClick={() =>
//               navigate(`/projects/${projectId}/sessions/${sessionId}/artifacts/umlview`)
//             }
//             className="text-primary font-bold"
//           >
//             Open →
//           </button>
//         </div>

//       </div>
//     </div>
//   );
// }