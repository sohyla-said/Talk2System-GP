import { useState, useRef } from "react";
import { BrowserRouter } from "react-router-dom";
import { createContext } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AppRoutes from "./routes/AppRoutes";
import { useExtractionTask } from "./hooks/useExtractionTask";
import { useUmlTask } from "./hooks/useUmlTask";
import { useSrsTask } from "./hooks/useSrsTask";
import ExtractionToast from "./components/ExtractionToast";
import UmlToast from "./components/UmlToast";
import SrsToast from "./components/SrsToast";
import { getToken } from "./api/authApi";
import { LanguageProvider } from "./context/LanguageContext";
export const ExtractionContext = createContext();
export const UmlContext = createContext();
export const SrsContext = createContext();

// ─── Inner component — lives INSIDE BrowserRouter so useNavigate works ────────
function AppInner() {

  // ── Extraction state (unchanged) ──────────────────────────────────────────
  const [toastVisible, setToastVisible]       = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [taskOutput, setTaskOutput]           = useState(null);
  const [taskStatus, setTaskStatus]           = useState(null);
  const lastCallRef = useRef(null);

  const { taskId: activeTaskId, trackTask, cancelTracking } = useExtractionTask({
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
    return data.task_id;
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

  // ── UML state ──────────────────────────────────────────────────────────────
  const [umlToastVisible, setUmlToastVisible] = useState(false);
  const [umlTaskStatus,   setUmlTaskStatus]   = useState(null);
  const [umlTaskOutput,   setUmlTaskOutput]   = useState(null);
  const [umlProjectId,    setUmlProjectId]    = useState(null);
  const [umlSessionId,    setUmlSessionId]    = useState(null);
  const [umlDiagramType, setUmlDiagramType] = useState(null);
  const lastUmlCallRef = useRef(null);

  const { trackTask: trackUml, cancelTracking: cancelUml } = useUmlTask({
    onDone: (data) => {
      setUmlTaskOutput(data.task_output ?? null);
      setUmlTaskStatus("done");
      setUmlToastVisible(true);
    },
    onFailed: (data) => {
      setUmlTaskOutput({
        error_message: data?.error_message ?? "UML generation failed.",
      });
      setUmlTaskStatus("failed");
      setUmlToastVisible(true);
    },
  });

  const startUmlGeneration = async ({ projectId, sessionId, diagramType, source }) => {
    lastUmlCallRef.current = { projectId, sessionId, diagramType, source };
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    };

    const url = sessionId
      ? `http://localhost:8000/api/projects/${projectId}/sessions/${sessionId}/generate-uml-async`
      : `http://localhost:8000/api/projects/${projectId}/generate-uml-async?diagram_type=${diagramType}`;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: sessionId
        ? JSON.stringify({ diagram_type: diagramType, source })
        : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || "Failed to start UML generation");
    }

    const data = await res.json();
    setUmlDiagramType(diagramType);
    setUmlProjectId(projectId);
    setUmlSessionId(sessionId ?? null);
    setUmlTaskOutput(null);
    setUmlTaskStatus("pending");
    setUmlToastVisible(true);
    trackUml(data.task_id);
  };

  // ── SRS state ──────────────────────────────────────────────────────────────
  const [srsToastVisible, setSrsToastVisible] = useState(false);
  const [srsTaskStatus,   setSrsTaskStatus]   = useState(null);
  const [srsTaskOutput,   setSrsTaskOutput]   = useState(null);
  const [srsProjectId,    setSrsProjectId]    = useState(null);
  const [srsSessionId,    setSrsSessionId]    = useState(null);
  const lastSrsCallRef = useRef(null);

  const { trackTask: trackSrs, cancelTracking: cancelSrs } = useSrsTask({
    onDone: (data) => {
      setSrsTaskOutput(data.task_output ?? null);
      setSrsTaskStatus("done");
      setSrsToastVisible(true);
    },
    onFailed: (data) => {
      setSrsTaskOutput({
        error_message: data?.error_message ?? "SRS generation failed.",
      });
      setSrsTaskStatus("failed");
      setSrsToastVisible(true);
    },
  });

  const startSrsGeneration = async ({ projectId, sessionId, formatVersion }) => {
    lastSrsCallRef.current = { projectId, sessionId, formatVersion };
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    };

    const url = sessionId
      ? `http://localhost:8000/api/projects/${projectId}/sessions/${sessionId}/generate-srs-async?format_version=${formatVersion}`
      : `http://localhost:8000/api/projects/${projectId}/generate-srs-async?format_version=${formatVersion}`;

    const res = await fetch(url, { method: "POST", headers });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || "Failed to start SRS generation");
    }

    const data = await res.json();
    setSrsProjectId(projectId);
    setSrsSessionId(sessionId ?? null);
    setSrsTaskOutput(null);
    setSrsTaskStatus("pending");
    setSrsToastVisible(true);
    trackSrs(data.task_id);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ExtractionContext.Provider value={{ startExtraction, taskStatus, taskOutput, activeSessionId, activeProjectId, activeTaskId }}>
    <UmlContext.Provider value={{ startUmlGeneration, umlTaskStatus, umlProjectId, umlSessionId }}>
    <SrsContext.Provider value={{ startSrsGeneration }}>
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

      {/* UML generation toast */}
      {umlToastVisible && (
        <UmlToast
          status={umlTaskStatus}
          projectId={umlProjectId}
          sessionId={umlSessionId}
          taskOutput={umlTaskOutput}
          diagramType={umlTaskOutput?.diagram_type || umlDiagramType}
          onDismiss={() => setUmlToastVisible(false)}
          onRetry={() => {
            if (!lastUmlCallRef.current) return;
            cancelUml();
            setUmlTaskStatus("pending");
            setUmlTaskOutput(null);
            startUmlGeneration(lastUmlCallRef.current);
          }}
        />
      )}

      {/* SRS generation toast */}
      {srsToastVisible && (
        <SrsToast
          status={srsTaskStatus}
          projectId={srsProjectId}
          sessionId={srsSessionId}
          taskOutput={srsTaskOutput}
          onDismiss={() => setSrsToastVisible(false)}
          onRetry={() => {
            if (!lastSrsCallRef.current) return;
            cancelSrs();
            setSrsTaskStatus("pending");
            setSrsTaskOutput(null);
            startSrsGeneration(lastSrsCallRef.current);
          }}
        />
      )}
    </SrsContext.Provider>
    </UmlContext.Provider>
    </ExtractionContext.Provider>
  );
}

// ─── Root — BrowserRouter wraps everything so useNavigate works everywhere ────
export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </LanguageProvider>
    
  );
}