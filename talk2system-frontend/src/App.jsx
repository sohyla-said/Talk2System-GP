import { useState, useRef } from "react";
import { BrowserRouter } from "react-router-dom";
import { createContext } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AppRoutes from "./routes/AppRoutes";
import { useExtractionTask } from "./hooks/useExtractionTask";
import ExtractionToast from "./components/ExtractionToast";
import { getToken } from "./api/authApi";

export const ExtractionContext = createContext();

// ─── Inner component — lives INSIDE BrowserRouter so useNavigate works ────────
function AppInner() {
  const [toastVisible, setToastVisible]       = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [taskOutput, setTaskOutput]           = useState(null);
  const [taskStatus, setTaskStatus]           = useState(null);

  const lastCallRef = useRef(null);

  const { trackTask, cancelTracking } = useExtractionTask({
    onDone: (data) => {
      setTaskOutput(data.task_output ?? null);
      setTaskStatus("done");
      setToastVisible(true);
    },
    onFailed: (data) => {
      setTaskOutput({
        ...(data?.task_output ?? {}),
        error_message: data?.error_message ?? "Requirement extraction failed.",
      });
      setTaskStatus("failed");
      setToastVisible(true);
    },
  });

  const startExtraction = async (sessionId, projectId, transcript, engine) => {
    lastCallRef.current = { sessionId, projectId, transcript, engine };

    const res = await fetch(
      `http://localhost:8000/api/projects/${projectId}/session/${sessionId}/extract-requirements-async`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ transcript, engine }),
      }
    );

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody?.detail || "Failed to start background extraction");
    }

    const data = await res.json();

    setActiveSessionId(sessionId);
    setActiveProjectId(projectId);
    setTaskOutput(null);
    setTaskStatus("pending");
    setToastVisible(true);
    trackTask(data.task_id);
  };

  const handleRetry = () => {
    if (!lastCallRef.current) return;
    const { sessionId, projectId, transcript, engine } = lastCallRef.current;
    cancelTracking();
    setTaskStatus("pending");
    setTaskOutput(null);
    startExtraction(sessionId, projectId, transcript, engine);
  };

  const handleDismiss = () => {
    setToastVisible(false);
  };

  return (
    <ExtractionContext.Provider value={{ startExtraction }}>
      <AppRoutes />

      {/* General app notifications — errors, success alerts from any page */}
      <ToastContainer
        position="bottom-left"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      {/* Extraction-specific toast — bottom-right, manually controlled */}
      {toastVisible && (
        <ExtractionToast
          status={taskStatus}
          sessionId={activeSessionId}
          projectId={activeProjectId}
          taskOutput={taskOutput}
          onDismiss={handleDismiss}
          onRetry={handleRetry}
        />
      )}
    </ExtractionContext.Provider>
  );
}

// ─── Root — BrowserRouter wraps everything so useNavigate works everywhere ────
export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}