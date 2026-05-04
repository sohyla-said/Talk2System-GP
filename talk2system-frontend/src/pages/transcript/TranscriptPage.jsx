import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TranscriptApprovalModal from "../../components/modals/TranscriptApprovalModal";
import TranscriptEditModal from "../../components/modals/TranscriptEditModal";
import EngineChoiceModal from "../../components/modals/EngineChoiceModal";
import { getToken } from "../../api/authApi";

// ─── AssemblyAI Universal-2 benchmark data ────────────────────────────────────
const MODEL_INFO = {
  provider: "AssemblyAI",
  model: "Universal-2",
  languages: 99,
  englishWER: "6.1%",
  englishAcc: "93.9%",
  perLanguage: [
    { lang: "English", wer: "4.38%", acc: "95.62%" },
    { lang: "Arabic",  wer: "N/A",   acc: "N/A"    },
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
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [showModal, setShowModal] = useState(false);
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

  // ── Translation state ────────────────────────────────────────────────────
  const [detectedLanguage, setDetectedLanguage] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationData, setTranslationData] = useState(null);

  // ── Ref guard: prevents auto-translate from firing more than once ────────
  // Set to true when either a valid cached translation is loaded OR a fresh
  // background translation is kicked off — whichever happens first.
  const translationTriggeredRef = useRef(false);

  // ── Multi-select & delete ────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Derived ──────────────────────────────────────────────────────────────
  // A translation is "ready" when we have segments and the transcript is not English.
  const hasTranslation = !!(
    translationData &&
    !translationData.is_english &&
    Array.isArray(translationData.translated_segments) &&
    translationData.translated_segments.length > 0
  );

  // True when we know the session is non-English (from any source).
  const shouldAutoTranslate =
    (detectedLanguage !== null && detectedLanguage !== "english") ||
    (translationData !== null && translationData.is_english === false);

  const activeSegments = transcriptData;

  // ── Requirement extraction text ──────────────────────────────────────────
  const formatSegmentsForBackend = (segments) =>
    segments
      .filter((item) => item.text && item.text.trim())
      .map((item) => {
        const spk = (item.speaker || item.name || "").trim();
        return spk ? `${spk}: "${item.text.trim()}"` : item.text.trim();
      })
      .join("\n");

  /**
   * Returns the transcript text to send to the extraction endpoint.
   * - Non-English + translation ready  → translated segments (English)
   * - Non-English + translation NOT ready → returns null (caller must block)
   * - English → original segments
   */
  const getTranscriptTextForExtraction = () => {
    if (shouldAutoTranslate) {
      // We know the session is non-English — only proceed if translation is ready
      if (hasTranslation) {
        return translationData.translated_segments
          .filter((s) => s.text?.trim())
          .map((s) => {
            const spk = (s.speaker || s.name || "").trim();
            return spk ? `${spk}: "${s.text.trim()}"` : `"${s.text.trim()}"`;
          })
          .join("\n");
      }
      // Translation not ready yet — signal to caller to block
      return null;
    }
    // English transcript — use original segments
    return formatSegmentsForBackend(transcriptData);
  };

  // ── Fetch transcript ─────────────────────────────────────────────────────
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

        setTranscriptData(
          (data.transcript || []).map((seg, i) => ({
            ...seg,
            id: i + 1,
            name: seg.speaker || "",
          }))
        );
        setProjectId(data.project_id);
        setSessionTitle(data.title || "");
        setApproved(data.approval_status === "approved");
        if (data.detected_language) setDetectedLanguage(data.detected_language);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTranscript();
  }, [sessionId]);

  // ── Fetch transcript approval ─────────────────────────────────────────────
  useEffect(() => {
    const fetchTranscriptApproval = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/sessions/${sessionId}/features/approval-status`,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        if (!res.ok) return;
        const data = await res.json();
        const transcriptFeature = Array.isArray(data.features)
          ? data.features.find((f) => f.feature === "transcript")
          : null;
        if (!transcriptFeature) return;
        setTranscriptApproval(transcriptFeature);
        setApproved(Boolean(transcriptFeature.current_user_approved));
      } catch (err) {
        console.error("Error fetching transcript feature approval:", err);
      }
    };
    fetchTranscriptApproval();
  }, [sessionId]);

  // ── Check existing requirement ───────────────────────────────────────────
  useEffect(() => {
    if (!projectId || !sessionId) return;
    const check = async () => {
      setIsCheckingReq(true);
      try {
        const res = await fetch(
          `http://localhost:8000/api/projects/${projectId}/session/${sessionId}/requirements`
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.id) setExistingRequirementId(data.id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsCheckingReq(false);
      }
    };
    check();
  }, [projectId, sessionId]);

  // ── Load cached translation ──────────────────────────────────────────────
  // Runs once on mount. If a valid cached translation is found, lock the ref
  // immediately so the auto-trigger effect never fires a redundant POST.
  useEffect(() => {
    const fetchCached = async () => {
      try {
        const token = getToken();
        const res = await fetch(
          `http://localhost:8000/api/sessions/${sessionId}/translation`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setTranslationData(data);
          if (data && !data.is_english) {
            setDetectedLanguage(data.detected_language);
          }
          // If we got valid translated segments, mark as done so the
          // auto-trigger below never fires an unnecessary POST.
          if (
            data &&
            !data.is_english &&
            Array.isArray(data.translated_segments) &&
            data.translated_segments.length > 0
          ) {
            translationTriggeredRef.current = true;
          }
        }
      } catch {
        // No cached translation — leave ref false so auto-trigger can fire.
      }
    };
    fetchCached();
  }, [sessionId]);

  // ── Auto-trigger background translation ──────────────────────────────────
  // Fires when:
  //   1. The session is non-English (detectedLanguage or translationData says so)
  //   2. No translation is loaded yet (translationData === null)
  //   3. A translation isn't already running
  //   4. We have transcript segments to translate
  //   5. We haven't already triggered (or loaded from cache) a translation
  //
  // translationData is included in the dep array so that if the cached-fetch
  // effect resolves after this one, a re-evaluation happens correctly.
  useEffect(() => {
    if (
      shouldAutoTranslate &&
      translationData === null &&
      !isTranslating &&
      transcriptData.length > 0 &&
      !translationTriggeredRef.current
    ) {
      translationTriggeredRef.current = true;
      runBackgroundTranslation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedLanguage, transcriptData.length, translationData]);

  // ── Background translation ───────────────────────────────────────────────
  const runBackgroundTranslation = async () => {
    setIsTranslating(true);
    try {
      const token = getToken();
      const res = await fetch(
        `http://localhost:8000/api/sessions/${sessionId}/translate`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Translation failed");

      // Store result — this is what getTranscriptTextForExtraction() reads.
      setTranslationData(data);
      if (!data.is_english) {
        setDetectedLanguage(data.detected_language);
      }
    // AFTER:
    } catch (err) {
      console.error("[background translation failed]", err);
      // Surface the failure so the user knows extraction won't work
      // (don't alert() here as it's background, but set a flag so the UI can warn)
      setTranslationData(null); // ensure hasTranslation stays false
    } finally {
      setIsTranslating(false);
    }
  };

  // ── Edit segment ─────────────────────────────────────────────────────────
  const handleEditClick = (speaker) => {
    setEditingSpeaker(speaker);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedSpeaker) => {
    const segmentIndex = updatedSpeaker.id - 1;
    try {
      const res = await fetch(
        `http://localhost:8000/api/sessions/${sessionId}/transcript/segment`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
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
      setTranscriptData((prev) =>
        prev.map((sp) => (sp.id === updatedSpeaker.id ? updatedSpeaker : sp))
      );
    } catch (error) {
      console.error("Error saving transcript edit:", error);
      alert(error.message);
    } finally {
      setShowEditModal(false);
      setEditingSpeaker(null);
    }
  };

  // ── Approve ──────────────────────────────────────────────────────────────
  const handleApprove = () => {
    const approveTranscript = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/sessions/${sessionId}/features/transcript/approve`,
          { method: "POST", headers: { Authorization: `Bearer ${getToken()}` } }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || "Failed to approve transcript");

        setTranscriptApproval(data);
        setApproved(Boolean(data.current_user_approved));
        setShowModal(false);

        const newStatus = data.all_members_approved ? "processing" : "pending approval";
        await fetch(
          `http://localhost:8000/api/sessions/${sessionId}/status?status=${newStatus}`,
          { method: "PUT", headers: { Authorization: `Bearer ${getToken()}` } }
        );

        if (data.all_members_approved) {
          try {
            await fetch(
              `http://localhost:8000/api/sessions/${sessionId}/transcript/approve`,
              { method: "PATCH", headers: { Authorization: `Bearer ${getToken()}` } }
            );
          } catch (err) {
            console.error(err);
          }
        }

        if (pendingNavigation === "req" && !data.all_members_approved) {
          alert(
            `Your approval is saved. Waiting for others: ${data.approved_members_count}/${data.total_members_count}.`
          );
          setPendingNavigation(null);
          return;
        }

        if (pendingNavigation) {
          const pending = pendingNavigation;
          setPendingNavigation(null);
          executeNavigation(pending);
        }
      } catch (error) {
        console.error(error);
        alert(error.message);
      }
    };
    approveTranscript();
  };

  // ── Generate assets ──────────────────────────────────────────────────────
  const executeNavigation = (type) => {
    if (type === "req") {
      setPendingEngineAction("req");
      setShowEngineModal(true);
    } else if (type === "sum") {
      navigate(`/summary/${sessionId}`);
    }
  };

  const handleGenerate = (type , forceReExtract = false) => {
    if (type === "req") {
      if (!transcriptApproval.all_members_approved) {
        alert(
          `All session members must approve the transcript first (${transcriptApproval.approved_members_count}/${transcriptApproval.total_members_count}).`
        );
        return;
      }
      if (!approved) {
        setPendingNavigation(type);
        setShowModal(true);
        return;
      }
      if (existingRequirementId && !forceReExtract) {
        navigate(`/projects/${projectId}/session/${sessionId}/requirements/${existingRequirementId}`);
        return;
      }
    }
    if (type === "sum") {
      navigate(`/summary/${sessionId}`);
      return;
    }
    executeNavigation(type);
  };

  const handleEngineConfirm = (engine) => {
    if (pendingEngineAction === "req") extractRequirements(engine);
    setPendingEngineAction(null);
  };

  const extractRequirements = async (engine) => {
    if (!projectId) { alert("Project ID could not be resolved."); return; }

    // Block if translation is still running in the background.
    // AFTER:
    if (isTranslating) {
      alert("The transcript is being translated in the background. Please wait a moment and try again.");
      return;
    }

    // If this is a non-English session but translation hasn't been fetched/cached yet,
    // trigger it now and block extraction until it finishes.
    if (shouldAutoTranslate && !translationData) {
      alert("Translation is not ready yet. Retrying translation — please wait a moment and try again.");
      runBackgroundTranslation(); // re-trigger in case it silently failed
      return;
    }

    // Block if the session is non-English but translation hasn't completed yet.
    // This guards against the window where isTranslating is false but
    // translationData is still null (e.g. translation failed silently).
    const transcriptText = getTranscriptTextForExtraction();
    if (transcriptText === null) {
      alert(
        "Translation is not ready yet. Please wait a moment and try again. " +
        "If this persists, refresh the page."
      );
      return;
    }

    setIsSubmittingReq(true);
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/projects/${projectId}/session/${sessionId}/extract-requirements`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ transcript: transcriptText, engine }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail));
      }

      if (engine === "both") {
        navigate(`/transcript/${sessionId}/requirements/choice`, {
          state: {
            projectId,
            transcriptText,
            commonData:     data.common_data,
            hybridRunId:    data.Hybrid_run_id,
            hybridData:     data.Hybrid_data,
            hybridOnlyData: data.Hybrid_only_data,
            llmRunId:       data.LLM_run_id,
            llmData:        data.LLM_data,
            llmOnlyData:    data.LLM_only_data,
          },
        });
      } else if (engine === "hybrid") {
        try {
          await fetch(
            `http://127.0.0.1:8000/api/projects/${projectId}/session/${sessionId}/choose-requirements`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
              body: JSON.stringify({
                requirements_json: data.Hybrid_data,
                src_run_id: data.Hybrid_run_id,
              }),
            }
          );
        } catch (err) {
          console.error("choose-requirements failed:", err);
        }
        navigate(`/transcript/${sessionId}/requirements`, {
          state: {
            projectId,
            requirementId: data.Hybrid_run_id,
            groupedData: data.Hybrid_data,
            preferredType: "hybrid",
          },
        });
      } else if (engine === "llm") {
        try {
          await fetch(
            `http://127.0.0.1:8000/api/projects/${projectId}/session/${sessionId}/choose-requirements`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
              body: JSON.stringify({
                requirements_json: data.LLM_data,
                src_run_id: data.LLM_run_id,
              }),
            }
          );
        } catch (err) {
          console.error("choose-requirements failed:", err);
        }
        navigate(`/transcript/${sessionId}/requirements`, {
          state: {
            projectId,
            requirementId: data.LLM_run_id,
            groupedData: data.LLM_data,
            preferredType: "llm",
          },
        });
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmittingReq(false);
    }
  };

  // ── Select / delete segments ─────────────────────────────────────────────
  const toggleSelectAll = () => {
    if (selectedIds.size === activeSegments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(activeSegments.map((s) => s.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.size) return;
    setIsDeleting(true);

    const indices = [...selectedIds].map((id) => id - 1).sort((a, b) => a - b);

    try {
      const token = getToken();
      const res = await fetch(
        `http://localhost:8000/api/sessions/${sessionId}/transcript/segments`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

  // ── Loading / empty ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display">
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
      <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display">
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

  // ── Derived button-disable logic ─────────────────────────────────────────
  // For non-English sessions: block extraction until translation is ready.
  const translationPending = shouldAutoTranslate && !hasTranslation;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-text-dark dark:text-text-light overflow-x-hidden">
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Page header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black">{sessionTitle || "Session Transcript"}</h1>
            <p className="text-sm text-text-dark/50 dark:text-text-light/50 mt-1">
              {activeSegments.length} segment{activeSegments.length !== 1 ? "s" : ""}
              {/* Show a subtle inline badge while background translation is running */}
              {isTranslating && (
                <span className="ml-3 inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Translating…
                </span>
              )}
              {hasTranslation && !isTranslating && (
                <span className="ml-3 inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                  <span className="material-symbols-outlined text-sm">translate</span>
                  Translation ready
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => { setSelectionMode((v) => !v); setSelectedIds(new Set()); }}
              className="flex items-center gap-2 rounded-lg border border-border-light dark:border-white/10 px-4 py-2.5 text-sm font-semibold bg-white dark:bg-background-dark/50 hover:bg-gray-50 dark:hover:bg-white/5 shadow-soft transition-colors"
            >
              <span className="material-symbols-outlined text-lg">
                {selectionMode ? "close" : "checklist"}
              </span>
              {selectionMode ? "Cancel" : "Select"}
            </button>

            <button
              onClick={handleApprove}
              disabled={approved}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white shadow-soft transition-colors
                ${approved ? "bg-green-600 cursor-default" : "bg-primary hover:bg-primary/90"}`}
            >
              <span className="material-symbols-outlined text-lg">
                {approved ? "check_circle" : "approval"}
              </span>
              {approved ? "Approved" : "Approve Transcript"}
            </button>
          </div>
        </div>

        {/* ── Body grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* ── LEFT: segments ── */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Selection bar */}
            {selectionMode && (
              <div className="flex items-center justify-between gap-3 bg-white dark:bg-background-dark/70 border border-border-light dark:border-white/10 rounded-xl px-4 py-3 shadow-soft">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === activeSegments.length && activeSegments.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                  <span className="text-sm font-medium">
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

            {/* Segment bubbles */}
            {activeSegments.map((speaker) => (
              <div
                key={speaker.id}
                className={`flex gap-4 group ${selectionMode ? "cursor-pointer" : ""}`}
                onClick={
                  selectionMode
                    ? () => setSelectedIds((prev) => {
                        const next = new Set(prev);
                        next.has(speaker.id) ? next.delete(speaker.id) : next.add(speaker.id);
                        return next;
                      })
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
                    {(speaker.speaker || speaker.name || "?").replace("Speaker ", "")[0] || "?"}
                  </span>
                </div>

                <div className="flex-1 bg-white dark:bg-background-dark/50 rounded-xl p-4 shadow-soft border border-border-light dark:border-white/10">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-primary">
                        {speaker.speaker || speaker.name || "Unknown"}
                      </p>
                      {speaker.start_time && (
                        <span className="text-xs text-text-dark/40 dark:text-text-light/40 font-mono">
                          {speaker.start_time}{speaker.end_time ? ` – ${speaker.end_time}` : ""}
                        </span>
                      )}
                    </div>
                    {!selectionMode && (
                      <button
                        onClick={() => handleEditClick(speaker)}
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
            <div className="flex flex-col gap-4 bg-white dark:bg-background-dark/50 rounded-xl p-6 shadow-soft border border-border-light dark:border-white/10">
              <h3 className="text-xl font-bold">Generate Assets</h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleGenerate("sum")}
                  className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary-accent px-4 py-3 text-base font-bold text-dark shadow-soft transition-colors hover:bg-primary-accent/90"
                >
                  <span className="material-symbols-outlined text-xl">summarize</span>
                  Summarize Transcript
                </button>

                {existingRequirementId ? (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => navigate(`/transcript/${sessionId}/requirements`)}
                      className="flex w-full items-center justify-center gap-3 rounded-lg bg-green-600 hover:bg-green-700 px-4 py-3 text-base font-bold text-white shadow-soft transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">task_alt</span>
                      View Requirements
                    </button>
                    <button
                      onClick={() => handleGenerate("req", true)}
                      disabled={isSubmittingReq || isCheckingReq || isTranslating || (shouldAutoTranslate && !translationData)}
                      className="flex w-full items-center justify-center gap-3 rounded-lg border border-primary-accent/50 bg-transparent px-4 py-2.5 text-sm font-semibold text-primary-accent hover:bg-primary-accent/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingReq || isCheckingReq ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          {isCheckingReq ? "Checking…" : "Processing…"}
                        </>
                      ) : translationPending ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Translating…
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
                  <button
                    onClick={() => handleGenerate("req")}
                    disabled={isSubmittingReq || isTranslating || (shouldAutoTranslate && !translationData)}
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
                    ) : translationPending ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Translating…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-xl">checklist</span>
                        Extract Requirements
                      </>
                    )}
                  </button>
                )}

                <hr className="border-border-light dark:border-white/10" />

                {!approved && (
                  <p className="text-xs text-text-dark/50 dark:text-text-light/50 text-center">
                    You&apos;ll be prompted to approve the transcript before generating assets.
                  </p>
                )}
                {approved && (
                  <p className="text-xs text-green-600 dark:text-green-400 text-center flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Transcript approved — ready to generate
                  </p>
                )}

                <p className="text-xs text-text-dark/60 dark:text-text-light/60 text-center">
                  Session approvals: {transcriptApproval.approved_members_count}/
                  {transcriptApproval.total_members_count}
                  {transcriptApproval.all_members_approved ? " (all approved)" : " (waiting for members)"}
                </p>

                {/* Translation status hint for non-English sessions */}
                {shouldAutoTranslate && (
                  <p className={`text-xs text-center flex items-center justify-center gap-1 ${
                    hasTranslation
                      ? "text-green-600 dark:text-green-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}>
                    <span className="material-symbols-outlined text-sm">
                      {hasTranslation ? "translate" : "hourglass_top"}
                    </span>
                    {hasTranslation
                      ? `Translated from ${detectedLanguage} — extraction ready`
                      : `Translating from ${detectedLanguage || "detected language"}…`}
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

            {/* AssemblyAI Model Info Card */}
            <div className="flex flex-col gap-4 bg-gradient-to-br from-[#f0eeff] to-[#e9f0ff] dark:from-[#1a1830] dark:to-[#151c30] rounded-xl p-6 shadow-soft border border-[#ddd9f0] dark:border-[#2e2a4a]">
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

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Languages",    value: `${MODEL_INFO.languages}+`, icon: "language"   },
                  { label: "Eng. WER",     value: MODEL_INFO.englishWER,      icon: "bar_chart"  },
                  { label: "Eng. Acc.",    value: MODEL_INFO.englishAcc,      icon: "verified"   },
                  { label: "Evaluated on", value: "250+ hrs",                 icon: "audio_file" },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="flex flex-col gap-1 bg-white/60 dark:bg-white/5 rounded-lg px-3 py-2.5">
                    <div className="flex items-center gap-1 text-[#57499c] dark:text-[#a99df5]">
                      <span className="material-symbols-outlined text-sm">{icon}</span>
                      <span className="text-[10px] uppercase font-semibold tracking-wider">{label}</span>
                    </div>
                    <p className="text-sm font-black text-[#100d1c] dark:text-white">{value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] uppercase font-semibold tracking-wider text-[#57499c] dark:text-[#a99df5] mb-1">
                  Language Benchmarks (FLEURS · Jan 2026)
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
                        <tr key={row.lang} className={i % 2 === 0 ? "bg-white/40 dark:bg-white/[0.02]" : ""}>
                          <td className="px-3 py-1.5 font-medium text-[#100d1c] dark:text-white">{row.lang}</td>
                          <td className="px-2 py-1.5 text-center font-mono text-[#57499c] dark:text-[#c4bbf5]">{row.wer}</td>
                          <td className="px-2 py-1.5 text-center">
                            {row.acc === "N/A"
                              ? <span className="text-gray-400 dark:text-gray-500 italic">—</span>
                              : <span className="font-bold text-green-600 dark:text-green-400">{row.acc}</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-[#9b92c8] dark:text-[#6b6490] mt-1 leading-relaxed">
                  WER = Word Error Rate (lower is better).
                  Arabic not yet in AssemblyAI&apos;s public FLEURS table for Universal-2.
                </p>
              </div>

              <a
                href="https://www.assemblyai.com/docs/pre-recorded-audio/benchmarks"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline w-fit"
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
          onClose={() => { setShowModal(false); setPendingNavigation(null); }}
          approved={approved}
        />
      )}

      {showEditModal && editingSpeaker && (
        <TranscriptEditModal
          key={editingSpeaker.id}
          open={showEditModal}
          speakerData={editingSpeaker}
          onClose={() => { setShowEditModal(false); setEditingSpeaker(null); }}
          onSave={handleSaveEdit}
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
