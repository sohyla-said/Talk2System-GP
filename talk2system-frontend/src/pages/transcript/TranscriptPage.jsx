
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TranscriptApprovalModal from "../../components/modals/TranscriptApprovalModal";
import TranscriptEditModal from "../../components/modals/TranscriptEditModal";
import EngineChoiceModal from "../../components/modals/EngineChoiceModal";
import { getToken } from "../../api/authApi";

export default function TranscriptPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams(); // only sessionId needed from URL

  const [approved, setApproved] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transcriptData, setTranscriptData] = useState([]);

  // projectId is resolved from the session record (project_id FK),
  // so we never depend on it being in the URL
  const [projectId, setProjectId] = useState(null);

  // Session title — populated from the backend response
  const [sessionTitle, setSessionTitle] = useState("");

  // Extract Requirements loading state
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);

  // Engine choice modal
  const [showEngineModal, setShowEngineModal] = useState(false);
  const [pendingEngineAction, setPendingEngineAction] = useState(null); // "req"

  // Existing session requirement — if set, skip generation and redirect instead
  const [existingRequirementId, setExistingRequirementId] = useState(null);
  const [isCheckingReq, setIsCheckingReq] = useState(false);

  // Summarize loading state
  const [isSummarizing, setIsSummarizing] = useState(false);

  // -----------------------------
  // Multi-select & delete state
  // -----------------------------
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // -----------------------------
  // Fetch transcript + resolve projectId from session
  // -----------------------------
  useEffect(() => {
    const fetchTranscript = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/sessions/${sessionId}/transcript`
        );

        if (!res.ok) {
          setTranscriptData([]);
          setLoading(false);
          return;
        }

        const data = await res.json();

        // project_id and title are stored on the session model —
        // backend returns them alongside the transcript
        if (data.project_id) {
          setProjectId(data.project_id);
        }
        if (data.title) {
          setSessionTitle(data.title);
        }

        if (!data.transcript || !data.transcript.length) {
          setTranscriptData([]);
          setLoading(false);
          return;
        }

        const mapped = data.transcript.map((item, index) => ({
          id: index + 1,
          name: item.speaker ?? null,
          avatar: item.speaker
            ? `https://ui-avatars.com/api/?name=${encodeURIComponent(item.speaker)}`
            : null,
          text: item.text,
          startTime: item.start_time ?? null,
          endTime: item.end_time ?? null,
        }));

        setTranscriptData(mapped);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching transcript:", err);
        setLoading(false);
      }
    };

    fetchTranscript();
  }, [sessionId]);

  // -----------------------------
  // Check if a requirement already exists for this session
  // Runs after projectId is resolved from the transcript fetch
  // -----------------------------
  useEffect(() => {
    if (!projectId || !sessionId) return;

    const checkExistingRequirement = async () => {
      setIsCheckingReq(true);
      try {
        const res = await fetch(
          `http://localhost:8000/api/projects/${projectId}/session/${sessionId}/requirements`
        );
        if (res.ok) {
          const data = await res.json();
          // Backend returns the latest requirement object; grab its id
          if (data?.id) {
            setExistingRequirementId(data.id);
          }
        }
        // 404 means no requirement yet — stay null, that's fine
      } catch (err) {
        console.error("Error checking existing requirement:", err);
      } finally {
        setIsCheckingReq(false);
      }
    };

    checkExistingRequirement();
  }, [projectId, sessionId]);

  // -----------------------------
  // the backend expects:  Speaker: "text"\nSpeaker: "text"\n...
  // -----------------------------
  const formatTranscriptForBackend = (segments) => {
    return segments
      .filter((item) => item.name && item.text)
      .map((item) => `${item.name.trim()}: "${item.text.trim()}"`)
      .join("\n");
  };

  // -----------------------------
  // Extract Requirements — calls backend then navigates
  // -----------------------------
  const handleExtractRequirements = async (engine = "both") => {
    if (!projectId) {
      alert("Project ID could not be resolved. Please try again.");
      return;
    }

    setShowEngineModal(false);
    setIsSubmittingReq(true);
    try {
      const transcriptText = formatTranscriptForBackend(transcriptData);

      const response = await fetch(
        `http://127.0.0.1:8000/api/projects/${projectId}/session/${sessionId}/extract-requirements`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ transcript: transcriptText, engine: engine }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail)
        );
      }

      if (engine === "both") {
        navigate(`/transcript/${sessionId}/requirements/choice`, {
          state: {
            projectId,
            commonData: data.common_data,
            hybridRunId: data.Hybrid_run_id,
            hybridData: data.Hybrid_data,
            hybridOnlyData: data.Hybird_only_data,
            llmRunId: data.LLM_run_id,
            llmData: data.LLM_data,
            llmOnlyData: data.LLM_only_data,
          },
        });
      } else if (engine === "hybrid") {
              try{
                const response = await fetch(
                `http://127.0.0.1:8000/api/projects/${projectId}/session/${sessionId}/choose-requirements`,
                {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({
                      requirements_json: data.Hybrid_data,
                      src_run_id: data.Hybrid_run_id
                    })
                  }
                );
                if (!response.ok) {
                  throw new Error(data.detail || "Failed to save preferred requirements");
                }
      
              }catch (error) {
                console.error(error);
                alert(error.message);
              }
              navigate(`/transcript/${sessionId}/requirements`, {
                state: {
                  projectId,
                  requirementId: data.Hybrid_run_id,
                  groupedData: data.Hybrid_data,
                  preferredType: 'hybrid'
                },
              });
            } else if (engine === "llm") {
              try{
                const response = await fetch(
                `http://127.0.0.1:8000/api/projects/${projectId}/session/${sessionId}/choose-requirements`,
                {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({
                      requirements_json: data.LLM_data,
                      src_run_id: data.LLM_run_id
                    })
                  }
                );
                if (!response.ok) {
                  throw new Error(data.detail || "Failed to save preferred requirements");
                }
      
              }catch (error) {
                console.error(error);
                alert(error.message);
              }
      
              navigate(`/transcript/${sessionId}/requirements`, {
                state: {
                  projectId,
                  requirementId: data.LLM_run_id,
                  groupedData: data.LLM_data,
                  preferredType: 'llm'
                },
              });
            }
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsSubmittingReq(false);
    }
  };

  // -----------------------------
  // Asset generation navigation
  // executeNavigation is called only after approval is confirmed,
  // avoiding the stale-state bug of re-checking approved inside handleGenerate
  // -----------------------------
  // -----------------------------
  // Summarize — POSTs to backend then navigates to Summary page
  // -----------------------------
  const handleSummarize = async () => {
    setIsSummarizing(true);
    try {
      const res = await fetch(`http://localhost:8000/api/summarize/${sessionId}`, {
        method: "POST",
        headers: {  Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Failed to generate summary");
      }

      // Navigate to the Summary page — Summary.jsx fetches and displays it
      navigate(`/summary/${sessionId}`);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsSummarizing(false);
    }
  };

  const executeNavigation = (type) => {
    if (type === "req") {
      setShowEngineModal(true);
      setPendingEngineAction("req");
    }
    if (type === "sum") handleSummarize();
  };

  const handleEngineConfirm = (engine) => {
    if (pendingEngineAction === "req") {
      handleExtractRequirements(engine);
    }
    setPendingEngineAction(null);
  };

  const handleGenerate = (type) => {
    if (!approved) {
      setPendingNavigation(type);
      setShowModal(true);
      return;
    }
    executeNavigation(type);
  };

  // approved is still false when this runs, so pass pending directly
  // to executeNavigation instead of re-calling handleGenerate
  const handleApprove = () => {
    setApproved(true);
    setShowModal(false);

    if (pendingNavigation) {
      const pending = pendingNavigation;
      setPendingNavigation(null);
      executeNavigation(pending);
    }
  };

  // -----------------------------
  // Editing transcript lines
  // -----------------------------
  const handleEditClick = (speaker) => {
    setEditingSpeaker(speaker);
    setShowEditModal(true);
  };
  

  const handleSaveEdit = async (updatedSpeaker) => {
    // segment_index is 0-based; the frontend assigns id = index + 1
    const segmentIndex = updatedSpeaker.id - 1;

    try {
      const res = await fetch(
        `http://localhost:8000/api/sessions/${sessionId}/transcript/segment`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({
            segment_index: segmentIndex,
            speaker: updatedSpeaker.name,
            text: updatedSpeaker.text,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Failed to save segment");
      }

      // Update local state only after the backend confirms success
      setTranscriptData(
        transcriptData.map((sp) =>
          sp.id === updatedSpeaker.id ? updatedSpeaker : sp
        )
      );
    } catch (error) {
      console.error("Error saving transcript edit:", error);
      alert(error.message);
    } finally {
      setShowEditModal(false);
      setEditingSpeaker(null);
    }
  };

  // -----------------------------
  // Multi-select & delete handlers
  // -----------------------------
  const toggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    setSelectedIds(new Set());
  };

  const toggleSegmentSelection = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transcriptData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transcriptData.map((s) => s.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    // segment_index is 0-based; frontend id = index + 1
    const indices = Array.from(selectedIds).map((id) => id - 1);

    setIsDeleting(true);
    try {
      const res = await fetch(
        `http://localhost:8000/api/sessions/${sessionId}/transcript/segments`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ segment_indices: indices }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Failed to delete segments");
      }

      // Remove deleted segments from local state and re-assign sequential ids
      const remaining = transcriptData
        .filter((s) => !selectedIds.has(s.id))
        .map((s, i) => ({ ...s, id: i + 1 }));

      setTranscriptData(remaining);
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch (error) {
      console.error("Error deleting segments:", error);
      alert(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // -----------------------------
  // UI Rendering
  // -----------------------------
  if (loading) {
    return (
      <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-text-dark dark:text-text-light overflow-x-hidden">
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20 gap-3 text-primary">
            <svg
              className="animate-spin h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
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
            <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600">
              transcribe
            </span>
            <p className="text-lg font-medium text-text-dark/60 dark:text-text-light/60">
              No transcription available for this session.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-text-dark dark:text-text-light overflow-x-hidden">
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-4">
            {/* Breadcrumb */}
            <div className="flex flex-wrap gap-2 text-sm">
              <button
                onClick={() => navigate("/projects")}
                className="text-primary-accent dark:text-secondary-accent font-medium leading-normal"
              >
                Projects
              </button>
              <span className="text-text-dark/50 dark:text-text-light/50 font-medium leading-normal">/</span>
              <button
                onClick={() => navigate(`/projects/${projectId}`)}
                className="text-primary-accent dark:text-secondary-accent font-medium leading-normal"
              >
                Project #{projectId}
              </button>
              <span className="text-text-dark/50 dark:text-text-light/50 font-medium leading-normal">/</span>
              <span className="text-text-dark dark:text-text-light font-medium leading-normal">
                Transcript
              </span>
            </div>

            {/* Title and Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="text-text-dark dark:text-text-light text-4xl font-black leading-tight tracking-[-0.033em] flex-1">
                {sessionTitle || `Session Transcript #${sessionId}`}
              </h1>
              <div className="flex items-center gap-3">
                {/* Selection mode toggle */}
                <button
                  onClick={toggleSelectionMode}
                  className={`flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold shadow-soft transition-colors
                    ${selectionMode
                      ? "bg-gray-200 dark:bg-white/10 text-text-dark dark:text-text-light hover:bg-gray-300 dark:hover:bg-white/20"
                      : "bg-surface-light dark:bg-white/10 text-text-dark dark:text-text-light border border-border-light dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/20"
                    }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    {selectionMode ? "close" : "checklist"}
                  </span>
                  {selectionMode ? "Cancel" : "Select"}
                </button>

                <button
                  onClick={() => setApproved(true)}
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

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* LEFT CONTENT - Speaker Bubbles */}
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
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Deleting…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">delete</span>
                        Delete Selected
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-8 bg-surface-light dark:bg-background-dark/50 rounded-xl p-4 sm:p-6 shadow-soft">
                {transcriptData.map((speaker) => (
                  <div
                    key={speaker.id}
                    className={`flex gap-4 group/speaker rounded-lg transition-colors
                      ${selectionMode ? "cursor-pointer p-2 -mx-2 hover:bg-black/5 dark:hover:bg-white/5" : ""}
                      ${selectionMode && selectedIds.has(speaker.id) ? "bg-red-50 dark:bg-red-900/20 ring-1 ring-red-300 dark:ring-red-700 rounded-lg p-2 -mx-2" : ""}
                    `}
                    onClick={selectionMode ? () => toggleSegmentSelection(speaker.id) : undefined}
                  >
                    {/* Checkbox shown only in selection mode */}
                    {selectionMode && (
                      <div className="flex items-start pt-1 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(speaker.id)}
                          onChange={() => toggleSegmentSelection(speaker.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 accent-primary rounded cursor-pointer"
                        />
                      </div>
                    )}
                    <div
                      className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 flex-shrink-0"
                      style={{ backgroundImage: `url("${speaker.avatar}")` }}
                      data-alt={`Avatar for ${speaker.name}`}
                    />
                    <div className="flex flex-1 flex-col items-stretch gap-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <p className="text-text-dark dark:text-text-light text-base font-bold leading-tight">
                              {speaker.name}
                            </p>
                            {speaker.startTime && (
                              <span className="text-xs font-mono text-text-dark/50 dark:text-text-light/40 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full">
                                {speaker.startTime}
                                {speaker.endTime && ` – ${speaker.endTime}`}
                              </span>
                            )}
                          </div>
                          {!selectionMode && (
                            <button
                              onClick={() => handleEditClick(speaker)}
                              className="flex items-center text-text-dark/40 hover:text-primary dark:text-text-light/40 dark:hover:text-primary transition-colors p-1"
                              title="Edit this line"
                            >
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                          )}
                        </div>
                        <p className="text-text-dark/90 dark:text-text-light/90 text-base font-normal leading-relaxed">
                          {speaker.text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SIDEBAR */}
            <div className="lg:col-span-1 flex flex-col gap-8 sticky top-24">
              <div className="flex flex-col gap-6 bg-white dark:bg-background-dark/50 rounded-xl p-6 shadow-soft border border-border-light dark:border-white/10">
                <h3 className="text-text-dark dark:text-text-light text-xl font-bold">
                  Generate Assets
                </h3>
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
                    // Requirement already exists — offer navigation instead of re-generation
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() =>
                          navigate(`/transcript/${sessionId}/requirements`)
                        }
                        className="flex w-full items-center justify-center gap-3 rounded-lg bg-green-600 hover:bg-green-700 px-4 py-3 text-base font-bold text-white shadow-soft transition-colors"
                      >
                        <span className="material-symbols-outlined text-xl">task_alt</span>
                        View Requirements
                      </button>
                      <button
                        onClick={() => handleGenerate("req")}
                        disabled={isSubmittingReq || isCheckingReq}
                        className="flex w-full items-center justify-center gap-3 rounded-lg border border-primary-accent/50 bg-transparent px-4 py-2.5 text-sm font-semibold text-primary-accent hover:bg-primary-accent/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmittingReq ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Processing…
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-base">refresh</span>
                            Re-extract Requirements
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    // No requirement yet — show the primary generate button
                    <button
                      onClick={() => handleGenerate("req")}
                      disabled={isSubmittingReq || isCheckingReq}
                      className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary-accent px-4 py-3 text-base font-bold text-dark shadow-soft transition-colors hover:bg-primary-accent/90 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSubmittingReq || isCheckingReq ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          {isCheckingReq ? "Checking…" : "Processing…"}
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-xl">checklist</span>
                          Extract Requirements
                        </>
                      )}
                    </button>
                  )}


                </div>

                <hr className="border-border-light dark:border-white/10" />

                {!approved && (
                  <p className="text-xs text-text-dark/50 dark:text-text-light/50 text-center">
                    You'll be prompted to approve the transcript before generating assets.
                  </p>
                )}
                {approved && (
                  <p className="text-xs text-green-600 dark:text-green-400 text-center flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Transcript approved — ready to generate
                  </p>
                )}
                {existingRequirementId && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 text-center flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">info</span>
                    Requirements already generated for this session
                  </p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      <TranscriptApprovalModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setPendingNavigation(null);
        }}
        onApprove={handleApprove}
        approved={approved}
      />
      <TranscriptEditModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingSpeaker(null);
        }}
        onSave={handleSaveEdit}
        speakerData={editingSpeaker}
      />
      <EngineChoiceModal
        open={showEngineModal}
        onClose={() => {
          setShowEngineModal(false);
          setPendingEngineAction(null);
        }}
        onConfirm={handleEngineConfirm}
        isLoading={isSubmittingReq}
      />
    </>
  );
}

