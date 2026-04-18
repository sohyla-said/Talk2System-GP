// import { useEffect, useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import { getSessionVersions } from "../../api/umlAPI";

// const BASE_URL = "http://localhost:8000";

// export default function UMLSessionViewPage() {
//   const navigate = useNavigate();
//   const { projectId, sessionId } = useParams();

//   const [diagramType, setDiagramType] = useState("usecase");
//   const [diagramUrl, setDiagramUrl] = useState(null);
//   const [versions, setVersions] = useState([]);

//   const fetchVersions = async () => {
//     try {
//       const res = await getSessionVersions(projectId, sessionId, diagramType);

//       const versionsData = res.data.versions || [];
//       setVersions(versionsData);

//       if (versionsData.length > 0) {
//         const latest = versionsData[0];
//         setDiagramUrl(`${BASE_URL}/${latest.file_path}`);
//       } else {
//         setDiagramUrl(null);
//       }
//     } catch (err) {
//       console.error("Session UML fetch error:", err);
//       setVersions([]);
//       setDiagramUrl(null);
//     }
//   };

//   useEffect(() => {
//     if (projectId && sessionId) {
//       fetchVersions();
//     }
//   }, [diagramType, projectId, sessionId]); // 🔥 FIXED

//   const handleSelectVersion = (artifactId) => {
//     const selected = versions.find((v) => v.id == artifactId);
//     if (selected) {
//       setDiagramUrl(`${BASE_URL}/${selected.file_path}`);
//     }
//   };

//   return (
//     <div className="font-display bg-background-light dark:bg-background-dark min-h-screen text-[#100d1c] dark:text-white">

//       <main className="max-w-5xl mx-auto pt-8 px-4">

//         {/* Breadcrumb */}
//         <div className="flex gap-2 text-sm mb-4">
//           <button onClick={() => navigate("/projects")} className="text-primary-accent">
//             Projects
//           </button>
//           <span>/</span>

//           <button
//             onClick={() => navigate(`/projects/${projectId}`)}
//             className="text-primary-accent"
//           >
//             Project
//           </button>
//           <span>/</span>

//           <button
//             onClick={() =>
//               navigate(`/projects/${projectId}/sessions/${sessionId}`)
//             }
//             className="text-primary-accent"
//           >
//             Session
//           </button>
//           <span>/</span>

//           <span>UML View</span>
//         </div>

//         {/* TITLE */}
//         <h1 className="text-4xl font-black mb-6">
//           Session UML Diagrams
//         </h1>

//         {/* TYPE SWITCH */}
//         <div className="bg-white dark:bg-background-dark rounded-xl shadow mb-4">

//           <div className="flex gap-2 p-2 bg-[#e9e7f4] rounded-lg">
//             {["usecase", "class", "sequence"].map((type) => (
//               <label
//                 key={type}
//                 className={`flex-1 cursor-pointer text-center px-3 py-2 rounded-lg text-sm font-medium
//                 ${diagramType === type ? "bg-primary text-white" : "text-[#57499c]"}`}
//               >
//                 <input
//                   type="radio"
//                   className="hidden"
//                   checked={diagramType === type}
//                   onChange={() => setDiagramType(type)}
//                 />
//                 {type}
//               </label>
//             ))}
//           </div>

//           {/* VERSION SELECT */}
//           <div className="px-4 py-3 border-t">
//             <select
//               onChange={(e) => handleSelectVersion(e.target.value)}
//               className="border px-6 py-2 rounded-lg"
//             >
//               <option>Select Version</option>
//               {versions.map((v) => (
//                 <option key={v.id} value={v.id}>
//                   {v.version} ({v.approval_status})
//                 </option>
//               ))}
//             </select>
//           </div>
//         </div>

//         {/* IMAGE */}
//         <div className="bg-white dark:bg-[#1f1c2e] rounded-xl border p-6 flex justify-center">
//           {diagramUrl ? (
//             <img
//               src={diagramUrl}
//               alt="UML Diagram"
//               className="max-w-full h-auto rounded-lg"
//             />
//           ) : (
//             <p className="text-gray-400">No UML diagram available</p>
//           )}
//         </div>

//       </main>
//     </div>
//   );
// }