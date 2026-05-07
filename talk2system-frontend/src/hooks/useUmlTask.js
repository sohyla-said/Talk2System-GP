import { useState, useEffect, useRef } from "react";
import { getToken } from "../api/authApi";

const POLL_INTERVAL = 3000;

export function useUmlTask({ onDone, onFailed } = {}) {
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState(null);
  const intervalRef = useRef(null);
  const onDoneRef = useRef(onDone);
  const onFailedRef = useRef(onFailed);

  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  useEffect(() => { onFailedRef.current = onFailed; }, [onFailed]);

  const getAuthHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const trackTask = (id) => { setTaskId(id); setStatus("pending"); };
  const cancelTracking = () => {
    clearInterval(intervalRef.current);
    setTaskId(null); setStatus(null);
  };

  useEffect(() => {
    if (!taskId) return;

    const poll = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/uml-tasks/${taskId}/status`,
          { headers: getAuthHeaders() }
        );
        if (!res.ok) return;
        const data = await res.json();
        setStatus(data.status);
        if (data.status === "done") {
          clearInterval(intervalRef.current);
          onDoneRef.current?.(data);
        } else if (data.status === "failed") {
          clearInterval(intervalRef.current);
          onFailedRef.current?.(data);
        }
      } catch (err) {
        console.error("UML polling error:", err);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [taskId]);

  return { taskId, status, trackTask, cancelTracking };
}