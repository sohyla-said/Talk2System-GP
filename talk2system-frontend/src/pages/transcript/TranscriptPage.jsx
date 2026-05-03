// import { useState, useEffect } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import TranscriptApprovalModal from "../../components/modals/TranscriptApprovalModal";
// import TranscriptEditModal from "../../components/modals/TranscriptEditModal";
// import EngineChoiceModal from "../../components/modals/EngineChoiceModal";
// import { getToken } from "../../api/authApi";

// export default function TranscriptPage() {
//   const navigate = useNavigate();
//   const { sessionId } = useParams();

//   const [approved, setApproved] = useState(false);
//   const [transcriptApproval, setTranscriptApproval] = useState({
//     approved_members_count: 0,
//     total_members_count: 0,
//     current_user_approved: false,
//     all_members_approved: false,
//     status: "pending",
//   });
//   const [showModal, setShowModal] = useState(false);
//   const [pendingNavigation, setPendingNavigation] = useState(null);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [editingSpeaker, setEditingSpeaker] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [transcriptData, setTranscriptData] = useState([]);

//   const [projectId, setProjectId] = useState(null);
//   const [sessionTitle, setSessionTitle] = useState("");
//   const [isSubmittingReq, setIsSubmittingReq] = useState(false);

//   const [showEngineModal, setShowEngineModal] = useState(false);
//   const [pendingEngineAction, setPendingEngineAction] = useState(null);

//   const [existingRequirementId, setExistingRequirementId] = useState(null);
//   const [isCheckingReq, setIsCheckingReq] = useState(false);

//   const [isSummarizing, setIsSummarizing] = useState(false);

//   const [selectionMode, setSelectionMode] = useState(false);
//   const [selectedIds, setSelectedIds] = useState(new Set());
//   const [isDeleting, setIsDeleting] = useState(false);

//   const getAuthHeaders = (includeJson = false) => {
//     const token = getToken();
//     return {
//       ...(includeJson ? { "Content-Type": "application/json" } : {}),
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//     };
//   };

//   // -----------------------------
//   // Fetch transcript + resolve projectId from session
//   // -----------------------------
//   useEffect(() => {
//     const fetchTranscript = async () => {
//       try {
//         const res = await fetch(
//           `http://localhost:8000/api/sessions/${sessionId}/transcript`
//         );

//         if (!res.ok) {
//           setTranscriptData([]);
//           setLoading(false);
//           return;
//         }

//         const data = await res.json();

//         if (data.project_id) setProjectId(data.project_id);
//         if (data.title) setSessionTitle(data.title);

//         if (!data.transcript || !data.transcript.length) {
//           setTranscriptData([]);
//           setLoading(false);
//           return;
//         }

//         const mapped = data.transcript.map((item, index) => ({
//           id: index + 1,
//           name: item.speaker ?? null,
//           avatar: item.speaker
//             ? `https://ui-avatars.com/api/?name=${encodeURIComponent(item.speaker)}`
//             : null,
//           text: item.text,
//           startTime: item.start_time ?? null,
//           endTime: item.end_time ?? null,
//         }));

//         setTranscriptData(mapped);
//         setLoading(false);
//       } catch (err) {
//         console.error("Error fetching transcript:", err);
//         setLoading(false);
//       }
//     };

//     fetchTranscript();
//   }, [sessionId]);

//   useEffect(() => {
//     const fetchTranscriptApproval = async () => {
//       try {
//         const res = await fetch(
//           `http://localhost:8000/api/sessions/${sessionId}/features/approval-status`,
//           { headers: getAuthHeaders() }
//         );
//         if (!res.ok) return;
//         const data = await res.json();
//         const transcriptFeature = Array.isArray(data.features)
//           ? data.features.find((f) => f.feature === "transcript")
//           : null;
//         if (!transcriptFeature) return;
//         setTranscriptApproval(transcriptFeature);
//         setApproved(Boolean(transcriptFeature.current_user_approved));
//       } catch (err) {
//         console.error("Error fetching transcript feature approval:", err);
//       }
//     };

//     fetchTranscriptApproval();
//   }, [sessionId]);

//   useEffect(() => {
//     if (!projectId || !sessionId) return;

//     const checkExistingRequirement = async () => {
//       setIsCheckingReq(true);
//       try {
//         const res = await fetch(
//           `http://localhost:8000/api/projects/${projectId}/session/${sessionId}/requirements`
//         );
//         if (res.ok) {
//           const data = await res.json();
//           if (data?.id) setExistingRequirementId(data.id);
//         }
//       } catch (err) {
//         console.error("Error checking existing requirement:", err);
//       } finally {
//         setIsCheckingReq(false);
//       }
//     };

//     checkExistingRequirement();
//   }, [projectId, sessionId]);

//   // -----------------------------
//   // Reset approvals after any edit (transcript segment edit or bulk delete)
//   // -----------------------------
//   const resetApprovalAfterEdit = async () => {
//     try {
//       // Clear approvals on the server
//       await fetch(
//         `http://localhost:8000/api/sessions/${sessionId}/features/transcript/approvals`,
//         { method: "DELETE", headers: getAuthHeaders() }
//       );

//       //  Set session status back to pending approval
//       await fetch(
//         `http://localhost:8000/api/sessions/${sessionId}/status?status=pending approval`,
//         { method: "PUT", headers: getAuthHeaders() }
//       );

//       //  Reset approval UI state immediately
//       setApproved(false);
//       setTranscriptApproval((prev) => ({
//         ...prev,
//         approved_members_count: 0,
//         current_user_approved: false,
//         all_members_approved: false,
//         status: "pending",
//       }));
//     } catch (err) {
//       console.error("Failed to reset approval after edit:", err);
//     }
//   };

//   const formatTranscriptForBackend = (segments) => {
//     return segments
//       .filter((item) => item.name && item.text)
//       .map((item) => `${item.name.trim()}: "${item.text.trim()}"`)
//       .join("\n");
//   };

//   // -----------------------------
//   // Extract Requirements
//   // -----------------------------
//   const handleExtractRequirements = async (engine = "both") => {
//     if (!projectId) {
//       alert("Project ID could not be resolved. Please try again.");
//       return;
//     }

//     setShowEngineModal(false);
//     setIsSubmittingReq(true);
//     try {
//       const transcriptText = formatTranscriptForBackend(transcriptData);

//       const response = await fetch(
//         `http://127.0.0.1:8000/api/projects/${projectId}/session/${sessionId}/extract-requirements`,
//         {
//           method: "POST",
//           headers: getAuthHeaders(true),
//           body: JSON.stringify({ transcript: transcriptText, engine }),
//         }
//       );

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(
//           typeof data.detail === "string"
//             ? data.detail
//             : JSON.stringify(data.detail)
//         );
//       }

//       if (engine === "both") {
//         navigate(`/transcript/${sessionId}/requirements/choice`, {
//           state: {
//             projectId,
//             commonData: data.common_data,
//             hybridRunId: data.Hybrid_run_id,
//             hybridData: data.Hybrid_data,
//             hybridOnlyData: data.Hybird_only_data,
//             llmRunId: data.LLM_run_id,
//             llmData: data.LLM_data,
//             llmOnlyData: data.LLM_only_data,
//           },
//         });
//       } else if (engine === "hybrid") {
//         try {
//           const r = await fetch(
//             `http://127.0.0.1:8000/api/projects/${projectId}/session/${sessionId}/choose-requirements`,
//             {
//               method: "POST",
//               headers: getAuthHeaders(true),
//               body: JSON.stringify({
//                 requirements_json: data.Hybrid_data,
//                 src_run_id: data.Hybrid_run_id,
//               }),
//             }
//           );
//           if (!r.ok) throw new Error(data.detail || "Failed to save preferred requirements");
//         } catch (error) {
//           console.error(error);
//           alert(error.message);
//         }
//         navigate(`/transcript/${sessionId}/requirements`, {
//           state: {
//             projectId,
//             requirementId: data.Hybrid_run_id,
//             groupedData: data.Hybrid_data,
//             preferredType: "hybrid",
//           },
//         });
//       } else if (engine === "llm") {
//         try {
//           const r = await fetch(
//             `http://127.0.0.1:8000/api/projects/${projectId}/session/${sessionId}/choose-requirements`,
//             {
//               method: "POST",
//               headers: getAuthHeaders(true),
//               body: JSON.stringify({
//                 requirements_json: data.LLM_data,
//                 src_run_id: data.LLM_run_id,
//               }),
//             }
//           );
//           if (!r.ok) throw new Error(data.detail || "Failed to save preferred requirements");
//         } catch (error) {
//           console.error(error);
//           alert(error.message);
//         }
//         navigate(`/transcript/${sessionId}/requirements`, {
//           state: {
//             projectId,
//             requirementId: data.LLM_run_id,
//             groupedData: data.LLM_data,
//             preferredType: "llm",
//           },
//         });
//       }
//     } catch (error) {
//       console.error(error);
//       alert(error.message);
//     } finally {
//       setIsSubmittingReq(false);
//     }
//   };

//   // -----------------------------
//   // Summarize
//   // -----------------------------
//   const handleSummarize = async () => {
//     setIsSummarizing(true);
//     try {
//       const res = await fetch(`http://localhost:8000/api/summarize/${sessionId}`, {
//         method: "POST",
//         headers: getAuthHeaders(),
//       });

//       if (!res.ok) {
//         const err = await res.json();
//         throw new Error(err.detail ?? "Failed to generate summary");
//       }

//       navigate(`/summary/${sessionId}`);
//     } catch (error) {
//       console.error(error);
//       alert(error.message);
//     } finally {
//       setIsSummarizing(false);
//     }
//   };

//   const executeNavigation = (type) => {
//     if (type === "req") {
//       setShowEngineModal(true);
//       setPendingEngineAction("req");
//     }
//     if (type === "sum") handleSummarize();
//   };

//   const handleEngineConfirm = (engine) => {
//     if (pendingEngineAction === "req") handleExtractRequirements(engine);
//     setPendingEngineAction(null);
//   };

//   const handleGenerate = (type) => {
//     if (type === "req" && !transcriptApproval.all_members_approved) {
//       alert(
//         `All session members must approve transcript first (${transcriptApproval.approved_members_count}/${transcriptApproval.total_members_count}).`
//       );
//       return;
//     }
//     if (!approved) {
//       setPendingNavigation(type);
//       setShowModal(true);
//       return;
//     }
//     executeNavigation(type);
//   };

//   // -----------------------------
//   // Approve transcript
//   // -----------------------------
//   const handleApprove = () => {
//     const approveTranscript = async () => {
//       try {
//         const res = await fetch(
//           `http://localhost:8000/api/sessions/${sessionId}/features/transcript/approve`,
//           { method: "POST", headers: getAuthHeaders() }
//         );
//         const data = await res.json().catch(() => ({}));
//         if (!res.ok) throw new Error(data.detail || "Failed to approve transcript");

//         setTranscriptApproval(data);
//         setApproved(Boolean(data.current_user_approved));
//         setShowModal(false);

//         const newStatus = data.all_members_approved ? "processing" : "pending approval";
//         await fetch(
//           `http://localhost:8000/api/sessions/${sessionId}/status?status=${newStatus}`,
//           { method: "PUT", headers: getAuthHeaders() }
//         );

//         if (data.all_members_approved) {
//           try {
//             await fetch(
//               `http://localhost:8000/api/sessions/${sessionId}/transcript/approve`,
//               { method: "PATCH", headers: getAuthHeaders() }
//             );
//           } catch (err) {
//             console.error(err);
//           }
//         }

//         if (pendingNavigation === "req" && !data.all_members_approved) {
//           alert(
//             `Your approval is saved. Waiting for others: ${data.approved_members_count}/${data.total_members_count}.`
//           );
//           setPendingNavigation(null);
//           return;
//         }

//         if (pendingNavigation) {
//           const pending = pendingNavigation;
//           setPendingNavigation(null);
//           executeNavigation(pending);
//         }
//       } catch (error) {
//         console.error(error);
//         alert(error.message);
//       }
//     };

//     approveTranscript();
//   };

//   // -----------------------------
//   // Editing transcript lines
//   // -----------------------------
//   const handleEditClick = (speaker) => {
//     setEditingSpeaker(speaker);
//     setShowEditModal(true);
//   };

//   const handleSaveEdit = async (updatedSpeaker) => {
//     const segmentIndex = updatedSpeaker.id - 1;

//     try {
//       const res = await fetch(
//         `http://localhost:8000/api/sessions/${sessionId}/transcript/segment`,
//         {
//           method: "PATCH",
//           headers: getAuthHeaders(true),
//           body: JSON.stringify({
//             segment_index: segmentIndex,
//             speaker: updatedSpeaker.name,
//             text: updatedSpeaker.text,
//           }),
//         }
//       );

//       if (!res.ok) {
//         const err = await res.json();
//         throw new Error(err.detail ?? "Failed to save segment");
//       }

//       //  Update local transcript state
//       setTranscriptData(
//         transcriptData.map((sp) =>
//           sp.id === updatedSpeaker.id ? updatedSpeaker : sp
//         )
//       );

//       // Reset approval state so members must re-approve the edited transcript
//       await resetApprovalAfterEdit();
//     } catch (error) {
//       console.error("Error saving transcript edit:", error);
//       alert(error.message);
//     } finally {
//       setShowEditModal(false);
//       setEditingSpeaker(null);
//     }
//   };

//   // -----------------------------
//   // Multi-select & delete handlers
//   // -----------------------------
//   const toggleSelectionMode = () => {
//     setSelectionMode((prev) => !prev);
//     setSelectedIds(new Set());
//   };

//   const toggleSegmentSelection = (id) => {
//     setSelectedIds((prev) => {
//       const next = new Set(prev);
//       if (next.has(id)) next.delete(id);
//       else next.add(id);
//       return next;
//     });
//   };

//   const toggleSelectAll = () => {
//     if (selectedIds.size === transcriptData.length) {
//       setSelectedIds(new Set());
//     } else {
//       setSelectedIds(new Set(transcriptData.map((s) => s.id)));
//     }
//   };

//   const handleDeleteSelected = async () => {
//     if (selectedIds.size === 0) return;

//     const indices = Array.from(selectedIds).map((id) => id - 1);

//     setIsDeleting(true);
//     try {
//       const res = await fetch(
//         `http://localhost:8000/api/sessions/${sessionId}/transcript/segments`,
//         {
//           method: "DELETE",
//           headers: getAuthHeaders(true),
//           body: JSON.stringify({ segment_indices: indices }),
//         }
//       );

//       if (!res.ok) {
//         const err = await res.json();
//         throw new Error(err.detail ?? "Failed to delete segments");
//       }

//       const remaining = transcriptData
//         .filter((s) => !selectedIds.has(s.id))
//         .map((s, i) => ({ ...s, id: i + 1 }));

//       setTranscriptData(remaining);
//       setSelectedIds(new Set());
//       setSelectionMode(false);

//       // Reset approval state so members must re-approve after deletion
//       await resetApprovalAfterEdit();
//     } catch (error) {
//       console.error("Error deleting segments:", error);
//       alert(error.message);
//     } finally {
//       setIsDeleting(false);
//     }
//   };

//   // -----------------------------
//   // UI Rendering
//   // -----------------------------
//   if (loading) {
//     return (
//       <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-text-dark dark:text-text-light overflow-x-hidden">
//         <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//           <div className="flex items-center justify-center py-20 gap-3 text-primary">
//             <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
//             </svg>
//             <span className="text-lg font-medium">Loading transcript...</span>
//           </div>
//         </main>
//       </div>
//     );
//   }

//   if (!transcriptData.length) {
//     return (
//       <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-text-dark dark:text-text-light overflow-x-hidden">
//         <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//           <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
//             <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600">transcribe</span>
//             <p className="text-lg font-medium text-text-dark/60 dark:text-text-light/60">
//               No transcription available for this session.
//             </p>
//           </div>
//         </main>
//       </div>
//     );
//   }

//   return (
//     <>
//       <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-text-dark dark:text-text-light overflow-x-hidden">
//         <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//           <div className="flex flex-col gap-4">
//             {/* Breadcrumb */}
//             <div className="flex flex-wrap gap-2 text-sm">
//               <button
//                 onClick={() => navigate("/projects")}
//                 className="text-primary-accent dark:text-secondary-accent font-medium leading-normal"
//               >
//                 Projects
//               </button>
//               <span className="text-text-dark/50 dark:text-text-light/50 font-medium leading-normal">/</span>
//               <button
//                 onClick={() => navigate(`/projects/${projectId}`)}
//                 className="text-primary-accent dark:text-secondary-accent font-medium leading-normal"
//               >
//                 Project #{projectId}
//               </button>
//               <span className="text-text-dark/50 dark:text-text-light/50 font-medium leading-normal">/</span>
//               <span className="text-text-dark dark:text-text-light font-medium leading-normal">Transcript</span>
//             </div>

//             {/* Title and Actions */}
//             <div className="flex flex-wrap items-center justify-between gap-4">
//               <h1 className="text-text-dark dark:text-text-light text-4xl font-black leading-tight tracking-[-0.033em] flex-1">
//                 {sessionTitle || `Session Transcript #${sessionId}`}
//               </h1>
//               <div className="flex items-center gap-3">
//                 <button
//                   onClick={toggleSelectionMode}
//                   className={`flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold shadow-soft transition-colors
//                     ${selectionMode
//                       ? "bg-gray-200 dark:bg-white/10 text-text-dark dark:text-text-light hover:bg-gray-300 dark:hover:bg-white/20"
//                       : "bg-surface-light dark:bg-white/10 text-text-dark dark:text-text-light border border-border-light dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/20"
//                     }`}
//                 >
//                   <span className="material-symbols-outlined text-lg">
//                     {selectionMode ? "close" : "checklist"}
//                   </span>
//                   {selectionMode ? "Cancel" : "Select"}
//                 </button>

//                 <button
//                   onClick={handleApprove}
//                   disabled={approved}
//                   className={`flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white shadow-soft transition-colors
//                     ${approved ? "bg-green-600 cursor-default" : "bg-primary hover:bg-primary/90"}`}
//                 >
//                   <span className="material-symbols-outlined text-lg">
//                     {approved ? "check_circle" : "approval"}
//                   </span>
//                   {approved ? "Approved" : "Approve Transcript"}
//                 </button>
//               </div>
//             </div>
//           </div>

//           <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
//             {/* LEFT CONTENT - Speaker Bubbles */}
//             <div className="lg:col-span-2 flex flex-col gap-6">

//               {/* Selection action bar */}
//               {selectionMode && (
//                 <div className="flex items-center justify-between gap-3 bg-white dark:bg-background-dark/70 border border-border-light dark:border-white/10 rounded-xl px-4 py-3 shadow-soft">
//                   <div className="flex items-center gap-3">
//                     <input
//                       type="checkbox"
//                       checked={selectedIds.size === transcriptData.length && transcriptData.length > 0}
//                       onChange={toggleSelectAll}
//                       className="w-4 h-4 accent-primary rounded cursor-pointer"
//                     />
//                     <span className="text-sm font-medium text-text-dark dark:text-text-light">
//                       {selectedIds.size === 0
//                         ? "Select segments to delete"
//                         : `${selectedIds.size} segment${selectedIds.size > 1 ? "s" : ""} selected`}
//                     </span>
//                   </div>
//                   <button
//                     onClick={handleDeleteSelected}
//                     disabled={selectedIds.size === 0 || isDeleting}
//                     className="flex items-center gap-2 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-bold text-white transition-colors"
//                   >
//                     {isDeleting ? (
//                       <>
//                         <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
//                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
//                         </svg>
//                         Deleting…
//                       </>
//                     ) : (
//                       <>
//                         <span className="material-symbols-outlined text-base">delete</span>
//                         Delete Selected
//                       </>
//                     )}
//                   </button>
//                 </div>
//               )}

//               <div className="flex flex-col gap-8 bg-surface-light dark:bg-background-dark/50 rounded-xl p-4 sm:p-6 shadow-soft">
//                 {transcriptData.map((speaker) => (
//                   <div
//                     key={speaker.id}
//                     className={`flex gap-4 group/speaker rounded-lg transition-colors
//                       ${selectionMode ? "cursor-pointer p-2 -mx-2 hover:bg-black/5 dark:hover:bg-white/5" : ""}
//                       ${selectionMode && selectedIds.has(speaker.id) ? "bg-red-50 dark:bg-red-900/20 ring-1 ring-red-300 dark:ring-red-700 rounded-lg p-2 -mx-2" : ""}
//                     `}
//                     onClick={selectionMode ? () => toggleSegmentSelection(speaker.id) : undefined}
//                   >
//                     {selectionMode && (
//                       <div className="flex items-start pt-1 flex-shrink-0">
//                         <input
//                           type="checkbox"
//                           checked={selectedIds.has(speaker.id)}
//                           onChange={() => toggleSegmentSelection(speaker.id)}
//                           onClick={(e) => e.stopPropagation()}
//                           className="w-4 h-4 accent-primary rounded cursor-pointer"
//                         />
//                       </div>
//                     )}
//                     <div
//                       className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 flex-shrink-0"
//                       style={{ backgroundImage: `url("${speaker.avatar}")` }}
//                       data-alt={`Avatar for ${speaker.name}`}
//                     />
//                     <div className="flex flex-1 flex-col items-stretch gap-2">
//                       <div className="flex flex-col gap-1">
//                         <div className="flex flex-wrap items-center justify-between gap-3">
//                           <div className="flex items-center gap-3">
//                             <p className="text-text-dark dark:text-text-light text-base font-bold leading-tight">
//                               {speaker.name}
//                             </p>
//                             {speaker.startTime && (
//                               <span className="text-xs font-mono text-text-dark/50 dark:text-text-light/40 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full">
//                                 {speaker.startTime}
//                                 {speaker.endTime && ` – ${speaker.endTime}`}
//                               </span>
//                             )}
//                           </div>
//                           {!selectionMode && (
//                             <button
//                               onClick={() => handleEditClick(speaker)}
//                               className="flex items-center text-text-dark/40 hover:text-primary dark:text-text-light/40 dark:hover:text-primary transition-colors p-1"
//                               title="Edit this line"
//                             >
//                               <span className="material-symbols-outlined text-lg">edit</span>
//                             </button>
//                           )}
//                         </div>
//                         <p className="text-text-dark/90 dark:text-text-light/90 text-base font-normal leading-relaxed">
//                           {speaker.text}
//                         </p>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* SIDEBAR */}
//             <div className="lg:col-span-1 flex flex-col gap-8 sticky top-24">
//               <div className="flex flex-col gap-6 bg-white dark:bg-background-dark/50 rounded-xl p-6 shadow-soft border border-border-light dark:border-white/10">
//                 <h3 className="text-text-dark dark:text-text-light text-xl font-bold">
//                   Generate Assets
//                 </h3>
//                 <div className="flex flex-col gap-3">
//                   <button
//                     onClick={() => handleGenerate("sum")}
//                     disabled={isSummarizing}
//                     className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary-accent px-4 py-3 text-base font-bold text-dark shadow-soft transition-colors hover:bg-primary-accent/90 disabled:opacity-60 disabled:cursor-not-allowed"
//                   >
//                     {isSummarizing ? (
//                       <>
//                         <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
//                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
//                         </svg>
//                         Summarizing…
//                       </>
//                     ) : (
//                       <>
//                         <span className="material-symbols-outlined text-xl">summarize</span>
//                         Summarize Transcript
//                       </>
//                     )}
//                   </button>

//                   {existingRequirementId ? (
//                     <div className="flex flex-col gap-2">
//                       <button
//                         onClick={() => navigate(`/transcript/${sessionId}/requirements`)}
//                         className="flex w-full items-center justify-center gap-3 rounded-lg bg-green-600 hover:bg-green-700 px-4 py-3 text-base font-bold text-white shadow-soft transition-colors"
//                       >
//                         <span className="material-symbols-outlined text-xl">task_alt</span>
//                         View Requirements
//                       </button>
//                       <button
//                         onClick={() => handleGenerate("req")}
//                         disabled={
//                           isSubmittingReq ||
//                           isCheckingReq ||
//                           !transcriptApproval.all_members_approved
//                         }
//                         className="flex w-full items-center justify-center gap-3 rounded-lg border border-primary-accent/50 bg-transparent px-4 py-2.5 text-sm font-semibold text-primary-accent hover:bg-primary-accent/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//                       >
//                         {isSubmittingReq ? (
//                           <>
//                             <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
//                               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
//                             </svg>
//                             Processing…
//                           </>
//                         ) : (
//                           <>
//                             <span className="material-symbols-outlined text-base">refresh</span>
//                             Re-extract Requirements
//                           </>
//                         )}
//                       </button>
//                     </div>
//                   ) : (
//                     <button
//                       onClick={() => handleGenerate("req")}
//                       disabled={
//                         isSubmittingReq ||
//                         isCheckingReq ||
//                         !transcriptApproval.all_members_approved
//                       }
//                       className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary-accent px-4 py-3 text-base font-bold text-dark shadow-soft transition-colors hover:bg-primary-accent/90 disabled:opacity-60 disabled:cursor-not-allowed"
//                     >
//                       {isSubmittingReq || isCheckingReq ? (
//                         <>
//                           <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
//                             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
//                           </svg>
//                           {isCheckingReq ? "Checking…" : "Processing…"}
//                         </>
//                       ) : (
//                         <>
//                           <span className="material-symbols-outlined text-xl">checklist</span>
//                           Extract Requirements
//                         </>
//                       )}
//                     </button>
//                   )}
//                 </div>

//                 <hr className="border-border-light dark:border-white/10" />

//                 {!approved && (
//                   <p className="text-xs text-text-dark/50 dark:text-text-light/50 text-center">
//                     You'll be prompted to approve the transcript before generating assets.
//                   </p>
//                 )}
//                 {approved && (
//                   <p className="text-xs text-green-600 dark:text-green-400 text-center flex items-center justify-center gap-1">
//                     <span className="material-symbols-outlined text-sm">check_circle</span>
//                     Transcript approved — ready to generate
//                   </p>
//                 )}
//                 <p className="text-xs text-text-dark/60 dark:text-text-light/60 text-center">
//                   Session approvals: {transcriptApproval.approved_members_count}/
//                   {transcriptApproval.total_members_count}
//                   {transcriptApproval.all_members_approved ? " (all approved)" : " (waiting for members)"}
//                 </p>
//                 {existingRequirementId && (
//                   <p className="text-xs text-blue-600 dark:text-blue-400 text-center flex items-center justify-center gap-1">
//                     <span className="material-symbols-outlined text-sm">info</span>
//                     Requirements already generated for this session
//                   </p>
//                 )}
//               </div>
//             </div>
//           </div>
//         </main>
//       </div>

//       <TranscriptApprovalModal
//         open={showModal}
//         onClose={() => {
//           setShowModal(false);
//           setPendingNavigation(null);
//         }}
//         onApprove={handleApprove}
//         approved={approved}
//       />
//       <TranscriptEditModal
//         open={showEditModal}
//         onClose={() => {
//           setShowEditModal(false);
//           setEditingSpeaker(null);
//         }}
//         onSave={handleSaveEdit}
//         speakerData={editingSpeaker}
//       />
//       <EngineChoiceModal
//         open={showEngineModal}
//         onClose={() => {
//           setShowEngineModal(false);
//           setPendingEngineAction(null);
//         }}
//         onConfirm={handleEngineConfirm}
//         isLoading={isSubmittingReq}
//       />
//     </>
//   );
// }

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TranscriptApprovalModal from "../../components/modals/TranscriptApprovalModal";
import TranscriptEditModal from "../../components/modals/TranscriptEditModal";
import EngineChoiceModal from "../../components/modals/EngineChoiceModal";
import { getToken } from "../../api/authApi";

// ─── AssemblyAI Universal-2 benchmark data (from assemblyai.com/docs/pre-recorded-audio/benchmarks) ───
const MODEL_INFO = {
  provider: "AssemblyAI",
  model: "Universal-2",
  languages: 99,
  englishWER: "6.1%",   // mean WER on English benchmarks (Jan 2026)
  englishAcc: "93.9%",
  perLanguage: [
    { lang: "English", wer: "4.38%", acc: "95.62%" },
    { lang: "Arabic",  wer: "N/A",   acc: "N/A"    },   // not in FLEURS table for Universal-2
    { lang: "French",  wer: "7.56%", acc: "92.44%" },
    { lang: "German",  wer: "6.22%", acc: "93.78%" },
  ],
};

export default function TranscriptPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const [approved, setApproved] = useState(false);
  const [transcriptApproval, setTranscriptApproval] = useState({
    approved_members_count: 0,
    total_members_count: 0,
    current_user_approved: false,
    all_members_approved: false,
    status: "pending",
  });
  const [showModal, setShowModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transcriptData, setTranscriptData] = useState([]);
  const [projectId, setProjectId] = useState(null);
  const [sessionTitle, setSessionTitle] = useState("");
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);
  const [showEngineModal, setShowEngineModal] = useState(false);
  const [pendingEngineAction, setPendingEngineAction] = useState(null);
  const [existingRequirementId, setExistingRequirementId] = useState(null);
  const [isCheckingReq, setIsCheckingReq] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // ── Translation state ──────────────────────────────────────────────────
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationData, setTranslationData] = useState(null); // { detected_language, translated_segments, is_english }
  const [showTranslated, setShowTranslated] = useState(false);  // toggle original ↔ translated
  const [translationError, setTranslationError] = useState(null);

  // Multi-select & delete state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Fetch transcript on mount ──────────────────────────────────────────
  useEffect(() => {
    const fetchTranscript = async () => {
      try {
        const token = getToken();
        const res = await fetch(
          `http://localhost:8000/api/sessions/${sessionId}/transcript`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Failed to fetch transcript");
        const data = await res.json();

        const segments = (data.transcript || []).map((seg, i) => ({
          ...seg,
          id: i + 1,
        }));
        setTranscriptData(segments);
        setProjectId(data.project_id);
        setSessionTitle(data.title || "");
        setApproved(data.approval_status === "approved");
        setTranscriptApproval(
          data.transcript_approval || {
            approved_members_count: 0,
            total_members_count: 0,
            current_user_approved: false,
            all_members_approved: false,
            status: "pending",
          }
        );

        // Check for existing requirement
        setIsCheckingReq(true);
        const reqRes = await fetch(
          `http://localhost:8000/api/sessions/${sessionId}/requirement`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (reqRes.ok) {
          const reqData = await reqRes.json();
          if (reqData?.id) setExistingRequirementId(reqData.id);
        }
        setIsCheckingReq(false);

        // Check for existing translation (non-blocking)
        fetchCachedTranslation();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTranscript();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ── Fetch cached translation (non-blocking, called on mount) ──────────
  const fetchCachedTranslation = async () => {
    try {
      const token = getToken();
      const res = await fetch(
        `http://localhost:8000/api/sessions/${sessionId}/translation`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setTranslationData(data);
      }
    } catch {
      // no cached translation — that's fine
    }
  };

  // ── Trigger translation ────────────────────────────────────────────────
  const handleTranslate = async () => {
    setIsTranslating(true);
    setTranslationError(null);
    try {
      const token = getToken();
      const res = await fetch(
        `http://localhost:8000/api/sessions/${sessionId}/translate`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Translation failed");

      if (data.is_english === false) {
        setTranslationData(data);
        setShowTranslated(true);
      } else {
        // Already English
        setTranslationData({ is_english: true, detected_language: "english" });
      }
    } catch (err) {
      console.error(err);
      setTranslationError(err.message);
    } finally {
      setIsTranslating(false);
    }
  };

  // Decide which transcript to display
  const displayedTranscript =
    showTranslated && translationData?.translated_segments
      ? translationData.translated_segments.map((s, i) => ({ ...s, id: i + 1 }))
      : transcriptData;

  // ── Approval ───────────────────────────────────────────────────────────
  const handleApprove = async () => {
    const token = getToken();
    try {
      const res = await fetch(
        `http://localhost:8000/api/sessions/${sessionId}/features/transcript/approve`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to approve");
      const data = await res.json();
      setTranscriptApproval(data);
      if (data.all_members_approved) {
        await fetch(
          `http://localhost:8000/api/sessions/${sessionId}/transcript/approve`,
          { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }
        );
        setApproved(true);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // ── Generate (requirements / summary) ─────────────────────────────────
  const handleGenerate = (action) => {
    if (action === "req") {
      if (existingRequirementId) {
        navigate(`/projects/${projectId}/session/${sessionId}/requirements/${existingRequirementId}`);
        return;
      }
      setPendingEngineAction("req");
      setShowEngineModal(true);
    } else if (action === "sum") {
      handleSummarize();
    }
  };

  const handleSummarize = async () => {
    setIsSummarizing(true);
    try {
      navigate(`/summary/${sessionId}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleEngineConfirm = async (engine) => {
    setShowEngineModal(false);
    if (pendingEngineAction === "req") await extractRequirements(engine);
  };

  const extractRequirements = async (engine) => {
    setIsSubmittingReq(true);
    try {
      const token = getToken();
      const res = await fetch(
        `http://localhost:8000/api/projects/${projectId}/session/${sessionId}/extract-requirements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ engine }),
        }
      );
      if (!res.ok) throw new Error("Extraction failed");
      const data = await res.json();
      navigate(
        `/projects/${projectId}/session/${sessionId}/requirements/${data.requirement_id}`
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmittingReq(false);
    }
  };

  // ── Delete selected segments ───────────────────────────────────────────
  const toggleSelectAll = () => {
    if (selectedIds.size === transcriptData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transcriptData.map((s) => s.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.size) return;
    setIsDeleting(true);
    try {
      const token = getToken();
      const indices = [...selectedIds].map((id) => id - 1);
      const res = await fetch(
        `http://localhost:8000/api/sessions/${sessionId}/transcript/segments`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ segment_indices: indices }),
        }
      );
      if (!res.ok) throw new Error("Failed to delete segments");
      const remaining = transcriptData
        .filter((s) => !selectedIds.has(s.id))
        .map((s, i) => ({ ...s, id: i + 1 }));
      setTranscriptData(remaining);
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Loading / empty states ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-text-dark dark:text-text-light overflow-x-hidden">
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20 gap-3 text-primary">
            <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-lg font-medium">Loading transcript...</span>
          </div>
        </main>
      </div>
    );
  }

  if (!transcriptData.length) {
    return (
      <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-text-dark dark:text-text-light overflow-x-hidden">
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600">transcribe</span>
            <p className="text-lg font-medium text-text-dark/60 dark:text-text-light/60">
              No transcription available for this session.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-text-dark dark:text-text-light overflow-x-hidden">
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Header ── */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-text-dark dark:text-text-light">
                {sessionTitle || "Session Transcript"}
              </h1>
              <p className="text-sm text-text-dark/50 dark:text-text-light/50 mt-1">
                {transcriptData.length} segments
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setSelectionMode((v) => !v)}
                className="flex items-center gap-2 rounded-lg border border-border-light dark:border-white/10 px-4 py-2.5 text-sm font-semibold text-text-dark dark:text-text-light bg-white dark:bg-background-dark/50 hover:bg-gray-50 dark:hover:bg-white/5 shadow-soft transition-colors"
              >
                <span className="material-symbols-outlined text-lg">
                  {selectionMode ? "close" : "checklist"}
                </span>
                {selectionMode ? "Cancel" : "Select"}
              </button>

              <button
                onClick={handleApprove}
                disabled={approved}
                className={`flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white shadow-soft transition-colors
                  ${approved ? "bg-green-600 cursor-default" : "bg-primary hover:bg-primary/90"}`}
              >
                <span className="material-symbols-outlined text-lg">
                  {approved ? "check_circle" : "approval"}
                </span>
                {approved ? "Approved" : "Approve Transcript"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Body grid ── */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* ── LEFT: Speaker Bubbles ── */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Selection action bar */}
            {selectionMode && (
              <div className="flex items-center justify-between gap-3 bg-white dark:bg-background-dark/70 border border-border-light dark:border-white/10 rounded-xl px-4 py-3 shadow-soft">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === transcriptData.length && transcriptData.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                  <span className="text-sm font-medium text-text-dark dark:text-text-light">
                    {selectedIds.size === 0
                      ? "Select segments to delete"
                      : `${selectedIds.size} segment${selectedIds.size > 1 ? "s" : ""} selected`}
                  </span>
                </div>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.size === 0 || isDeleting}
                  className="flex items-center gap-2 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-bold text-white transition-colors"
                >
                  {isDeleting ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <span className="material-symbols-outlined text-lg">delete</span>
                  )}
                  Delete
                </button>
              </div>
            )}

            {/* Translation toggle banner */}
            {translationData && !translationData.is_english && (
              <div className="flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <span className="material-symbols-outlined text-lg">translate</span>
                  <span className="text-sm font-medium capitalize">
                    Transcript detected as <strong>{translationData.detected_language}</strong> — translated to English
                  </span>
                </div>
                <button
                  onClick={() => setShowTranslated((v) => !v)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100 hover:opacity-80 transition-opacity"
                >
                  {showTranslated ? "View Original" : "View Translation"}
                </button>
              </div>
            )}

            {/* Segments */}
            {displayedTranscript.map((speaker) => (
              <div
                key={speaker.id}
                className={`flex gap-4 group ${selectionMode ? "cursor-pointer" : ""}`}
                onClick={
                  selectionMode
                    ? () => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          next.has(speaker.id) ? next.delete(speaker.id) : next.add(speaker.id);
                          return next;
                        });
                      }
                    : undefined
                }
              >
                {selectionMode && (
                  <div className="flex items-start pt-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(speaker.id)}
                      onChange={() => {}}
                      className="w-4 h-4 accent-primary rounded cursor-pointer"
                    />
                  </div>
                )}

                {/* Avatar */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">
                    {speaker.speaker ? speaker.speaker.replace("Speaker ", "")[0] : "?"}
                  </span>
                </div>

                <div className="flex-1 bg-white dark:bg-background-dark/50 rounded-xl p-4 shadow-soft border border-border-light dark:border-white/10">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-primary">{speaker.speaker || "Unknown"}</p>
                      {speaker.start_time && (
                        <span className="text-xs text-text-dark/40 dark:text-text-light/40 font-mono">
                          {speaker.start_time}
                          {speaker.end_time ? ` – ${speaker.end_time}` : ""}
                        </span>
                      )}
                    </div>
                    {!selectionMode && (
                      <button
                        onClick={() => {
                          setEditingSpeaker(speaker);
                          setShowEditModal(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-text-dark/40 dark:text-text-light/40 hover:text-primary p-1 rounded"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                    )}
                  </div>
                  <p className="text-text-dark/90 dark:text-text-light/90 text-base font-normal leading-relaxed">
                    {speaker.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ── SIDEBAR ── */}
          <div className="lg:col-span-1 flex flex-col gap-6 sticky top-24">

            {/* Generate Assets */}
            <div className="flex flex-col gap-6 bg-white dark:bg-background-dark/50 rounded-xl p-6 shadow-soft border border-border-light dark:border-white/10">
              <h3 className="text-text-dark dark:text-text-light text-xl font-bold">Generate Assets</h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleGenerate("sum")}
                  disabled={isSummarizing}
                  className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary-accent px-4 py-3 text-base font-bold text-dark shadow-soft transition-colors hover:bg-primary-accent/90 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSummarizing ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Summarizing…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-xl">summarize</span>
                      Summarize Transcript
                    </>
                  )}
                </button>

                {existingRequirementId ? (
                  <button
                    onClick={() => handleGenerate("req")}
                    className="flex w-full items-center justify-center gap-3 rounded-lg bg-green-500 px-4 py-3 text-base font-bold text-white shadow-soft transition-colors hover:bg-green-600"
                  >
                    <span className="material-symbols-outlined text-xl">visibility</span>
                    View Requirements
                  </button>
                ) : (
                  <button
                    onClick={() => handleGenerate("req")}
                    disabled={isSubmittingReq || isCheckingReq}
                    className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary px-4 py-3 text-base font-bold text-white shadow-soft transition-colors hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmittingReq ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Extracting…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-xl">auto_awesome</span>
                        Extract Requirements
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* ── Translation Card ─────────────────────────────────────── */}
            <div className="flex flex-col gap-4 bg-white dark:bg-background-dark/50 rounded-xl p-6 shadow-soft border border-border-light dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-xl">translate</span>
                <h3 className="text-text-dark dark:text-text-light text-base font-bold">Translation</h3>
              </div>

              {translationData?.is_english ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  Transcript is already in English
                </div>
              ) : translationData ? (
                <div className="flex flex-col gap-3">
                  <div className="text-sm text-text-dark/70 dark:text-text-light/60">
                    <span className="font-semibold capitalize text-amber-600 dark:text-amber-400">
                      {translationData.detected_language}
                    </span>{" "}
                    → English translation ready
                  </div>
                  <button
                    onClick={() => setShowTranslated((v) => !v)}
                    className="flex items-center justify-center gap-2 rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5 text-sm font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/30 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showTranslated ? "article" : "translate"}
                    </span>
                    {showTranslated ? "Show Original" : "Show Translation"}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-text-dark/50 dark:text-text-light/40 leading-relaxed">
                    If the transcript is in a non-English language, translate it to English so it can be
                    processed by the requirements pipeline.
                  </p>
                  {translationError && (
                    <p className="text-xs text-red-500">{translationError}</p>
                  )}
                  <button
                    onClick={handleTranslate}
                    disabled={isTranslating}
                    className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-bold text-white shadow-soft transition-colors"
                  >
                    {isTranslating ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Translating…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg">translate</span>
                        Detect &amp; Translate
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* ── AssemblyAI Model Info Card ────────────────────────────── */}
            <div className="flex flex-col gap-4 bg-gradient-to-br from-[#f0eeff] to-[#e9f0ff] dark:from-[#1a1830] dark:to-[#151c30] rounded-xl p-6 shadow-soft border border-[#ddd9f0] dark:border-[#2e2a4a]">

              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                  <span className="material-symbols-outlined text-primary text-xl">graphic_eq</span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#57499c] dark:text-[#a99df5]">
                    Transcription Engine
                  </p>
                  <p className="text-base font-black text-[#100d1c] dark:text-white leading-tight">
                    {MODEL_INFO.provider} · {MODEL_INFO.model}
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Languages", value: `${MODEL_INFO.languages}+`, icon: "language" },
                  { label: "Eng. WER",  value: MODEL_INFO.englishWER, icon: "bar_chart" },
                  { label: "Eng. Acc.", value: MODEL_INFO.englishAcc, icon: "verified" },
                  { label: "Evaluated on", value: "250+ hrs", icon: "audio_file" },
                ].map(({ label, value, icon }) => (
                  <div
                    key={label}
                    className="flex flex-col gap-1 bg-white/60 dark:bg-white/5 rounded-lg px-3 py-2.5"
                  >
                    <div className="flex items-center gap-1 text-[#57499c] dark:text-[#a99df5]">
                      <span className="material-symbols-outlined text-sm">{icon}</span>
                      <span className="text-[10px] uppercase font-semibold tracking-wider">{label}</span>
                    </div>
                    <p className="text-sm font-black text-[#100d1c] dark:text-white">{value}</p>
                  </div>
                ))}
              </div>

              {/* Per-language table */}
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] uppercase font-semibold tracking-wider text-[#57499c] dark:text-[#a99df5] mb-1">
                  Language Benchmarks (FLEURS)
                </p>
                <div className="rounded-lg overflow-hidden border border-[#ddd9f0] dark:border-[#2e2a4a]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#e9e7f4] dark:bg-[#2a2650]">
                        <th className="text-left px-3 py-2 font-semibold text-[#57499c] dark:text-[#a99df5]">Language</th>
                        <th className="text-center px-2 py-2 font-semibold text-[#57499c] dark:text-[#a99df5]">WER</th>
                        <th className="text-center px-2 py-2 font-semibold text-[#57499c] dark:text-[#a99df5]">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MODEL_INFO.perLanguage.map((row, i) => (
                        <tr
                          key={row.lang}
                          className={`${i % 2 === 0 ? "bg-white/40 dark:bg-white/[0.02]" : "bg-transparent"}`}
                        >
                          <td className="px-3 py-1.5 font-medium text-[#100d1c] dark:text-white">{row.lang}</td>
                          <td className="px-2 py-1.5 text-center text-[#57499c] dark:text-[#c4bbf5] font-mono">{row.wer}</td>
                          <td className="px-2 py-1.5 text-center">
                            {row.acc === "N/A" ? (
                              <span className="text-gray-400 dark:text-gray-500 italic">—</span>
                            ) : (
                              <span className="font-bold text-green-600 dark:text-green-400">{row.acc}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-[#9b92c8] dark:text-[#6b6490] mt-1 leading-relaxed">
                  WER = Word Error Rate (lower is better). Benchmarks from Jan 2026.
                  Arabic not yet included in AssemblyAI's public FLEURS table for Universal-2.
                </p>
              </div>

              {/* Link */}
              <a
                href="https://www.assemblyai.com/docs/pre-recorded-audio/benchmarks"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mt-1 w-fit"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                View full benchmarks
              </a>
            </div>

          </div>{/* end sidebar */}
        </div>
      </main>

      {/* Modals */}
      {showModal && (
        <TranscriptApprovalModal
          open={showModal}
          onApprove={handleApprove}
          onClose={() => {
            setShowModal(false);
            setPendingNavigation(null);
          }}
          approved={approved}
        />
      )}

      {showEditModal && editingSpeaker && (
        <TranscriptEditModal
          open={showEditModal}
          segment={editingSpeaker}
          sessionId={sessionId}
          onClose={() => {
            setShowEditModal(false);
            setEditingSpeaker(null);
          }}
          onSave={(updated) => {
            setTranscriptData((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s))
            );
            setShowEditModal(false);
            setEditingSpeaker(null);
          }}
        />
      )}

      <EngineChoiceModal
        open={showEngineModal}
        onClose={() => setShowEngineModal(false)}
        onConfirm={handleEngineConfirm}
        isLoading={isSubmittingReq}
      />
    </div>
  );
}
