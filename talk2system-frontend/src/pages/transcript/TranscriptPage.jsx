import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TranscriptApprovalModal from "../../components/modals/TranscriptApprovalModal";
import TranscriptEditModal from "../../components/modals/TranscriptEditModal";

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

  // Extract Requirements loading state
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);

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

        // project_id is stored as FK on the session model —
        // backend returns it alongside the transcript
        if (data.project_id) {
          setProjectId(data.project_id);
        }

        if (!data.transcript || !data.transcript.length) {
          setTranscriptData([]);
          setLoading(false);
          return;
        }

        const mapped = data.transcript.map((item, index) => ({
          id: index + 1,
          name: item.speaker,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.speaker)}`,
          text: item.text,
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
  // Reformat transcript segments into the conversational string
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
  const handleExtractRequirements = async () => {
    if (!projectId) {
      alert("Project ID could not be resolved. Please try again.");
      return;
    }

    setIsSubmittingReq(true);
    try {
      const transcriptText = formatTranscriptForBackend(transcriptData);

      console.log("Sending to extract-requirements:");
      console.log("projectId:", projectId);
      console.log("transcript:\n", transcriptText);

      const response = await fetch(
        `http://127.0.0.1:8000/api/projects/${projectId}/extract-requirements`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: transcriptText }),
        }
      );

      const data = await response.json();
      console.log("Response:", data);

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail) // 422 detail is often an array
        );
      }

      navigate(`/projects/${projectId}/requirements`, {
        state: {
          requirementId: data.requirement_id,
          version: data.version,
          approvalStatus: data.approval_status,
          groupedData: data.data,
        },
      });
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
  const executeNavigation = (type) => {
    if (type === "uml") navigate(`/projects/${projectId}/artifacts/uml`);
    if (type === "srs") navigate(`/projects/${projectId}/artifacts/srs`);
    if (type === "req") handleExtractRequirements();
    if (type === "sum") navigate(`/projects/${projectId}/summary`);
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

  const handleSaveEdit = (updatedSpeaker) => {
    setTranscriptData(
      transcriptData.map((sp) =>
        sp.id === updatedSpeaker.id ? updatedSpeaker : sp
      )
    );
    setShowEditModal(false);
    setEditingSpeaker(null);
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
                Session Transcript #{sessionId}
              </h1>
              <div className="flex items-center gap-3">
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
              <div className="flex flex-col gap-8 bg-surface-light dark:bg-background-dark/50 rounded-xl p-4 sm:p-6 shadow-soft">
                {transcriptData.map((speaker) => (
                  <div key={speaker.id} className="flex gap-4 group/speaker">
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
                          </div>
                          <button
                            onClick={() => handleEditClick(speaker)}
                            className="flex items-center text-text-dark/40 hover:text-primary dark:text-text-light/40 dark:hover:text-primary transition-colors p-1"
                            title="Edit this line"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
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
                    className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary-accent px-4 py-3 text-base font-bold text-dark shadow-soft transition-colors hover:bg-primary-accent/90"
                  >
                    <span className="material-symbols-outlined text-xl">summarize</span>
                    Summarize Transcript
                  </button>

                  <button
                    onClick={() => handleGenerate("req")}
                    disabled={isSubmittingReq}
                    className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary-accent px-4 py-3 text-base font-bold text-dark shadow-soft transition-colors hover:bg-primary-accent/90 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmittingReq ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Processing…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-xl">checklist</span>
                        Extract Requirements
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleGenerate("uml")}
                    className="flex w-full items-center justify-center gap-3 rounded-lg bg-secondary-accent px-4 py-3 text-base font-bold text-dark shadow-soft transition-colors hover:bg-secondary-accent/90"
                  >
                    <span className="material-symbols-outlined text-xl">schema</span>
                    Generate UML Diagrams
                  </button>

                  <button
                    onClick={() => handleGenerate("srs")}
                    className="flex w-full items-center justify-center gap-3 rounded-lg bg-secondary-accent px-4 py-3 text-base font-bold text-dark shadow-soft transition-colors hover:bg-secondary-accent/90"
                  >
                    <span className="material-symbols-outlined text-xl">description</span>
                    Generate SRS
                  </button>
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
    </>
  );
}
