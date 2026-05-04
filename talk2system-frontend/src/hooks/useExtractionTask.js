import { useState, useEffect, useRef } from "react";
import { getToken } from "../api/authApi";

const POLL_INTERVAL = 3000;

export function useExtractionTask({ onDone, onFailed } = {}) {
  const [taskId, setTaskId]   = useState(null);
  const [status, setStatus]   = useState(null);
  const intervalRef           = useRef(null);
  // keep latest callbacks in a ref so the interval closure never goes stale
  const onDoneRef             = useRef(onDone);
  const onFailedRef           = useRef(onFailed);

  useEffect(() => { onDoneRef.current   = onDone;   }, [onDone]);
  useEffect(() => { onFailedRef.current = onFailed; }, [onFailed]);

  const getAuthHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Call this immediately after POST /extract-requirements-async returns a task_id
  const trackTask = (id) => {
    setTaskId(id);
    setStatus("pending");
  };

  // Call this to abort polling (e.g. before a Retry)
  const cancelTracking = () => {
    clearInterval(intervalRef.current);
    setTaskId(null);
    setStatus(null);
  };

  useEffect(() => {
    if (!taskId) return;

    const poll = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/sessions/extraction-tasks/${taskId}/status`,
          { headers: getAuthHeaders() }
        );

        if (!res.ok) {
          // Non-200 from the polling endpoint itself — treat as a transient error,
          // keep polling rather than marking the task as failed.
          console.warn("Polling returned non-OK status:", res.status);
          return;
        }

        const data = await res.json();
        setStatus(data.status);

        if (data.status === "done") {
          clearInterval(intervalRef.current);
          onDoneRef.current?.(data);
        } else if (data.status === "failed") {
          clearInterval(intervalRef.current);
          onFailedRef.current?.(data);
        }
        // pending / in_progress → keep polling
      } catch (err) {
        // Network error — keep polling, don't surface to user
        console.error("Polling network error:", err);
      }
    };

    // Fire immediately, then on interval
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);

    // Clean up when taskId changes or component unmounts
    return () => clearInterval(intervalRef.current);
  }, [taskId]);

  return { taskId, status, trackTask, cancelTracking };
}