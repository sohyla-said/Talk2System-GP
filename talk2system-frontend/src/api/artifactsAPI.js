import { getToken } from "./authApi";

const BASE_URL = "http://127.0.0.1:8000";

export async function getProjectArtifacts(projectId) {
  const types = ["usecase", "class", "sequence"];

  const results = await Promise.all(
    types.map(async (type) => {
      const res = await fetch(
        `${BASE_URL}/api/projects/${projectId}/artifacts/${type}/versions`,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );

      const data = await res.json();
      return data.versions || [];
    })
  );

  return results.flat();
}

export async function getSessionArtifacts(projectId, sessionId) {
  const types = ["usecase", "class", "sequence"];

  const results = await Promise.all(
    types.map(async (type) => {
      const res = await fetch(
        `${BASE_URL}/api/projects/${projectId}/sessions/${sessionId}/artifacts/${type}/versions`,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );

      const data = await res.json();
      return data.versions || [];
    })
  );

  // flatten all results
  return results.flat();
}

export async function checkSummary(sessionId) {
  try {
    const res = await fetch(`http://localhost:8000/api/summary/${sessionId}`);
    if (!res.ok) return false;

    const data = await res.json();
    return Boolean(data?.summary);
  } catch {
    return false;
  }
}

export async function checkSRS(projectId, sessionId) {
  try {
    const res = await fetch(
      `${BASE_URL}/api/projects/${projectId}/sessions/${sessionId}/srs/versions`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    );
    if (!res.ok) return false;
    const data = await res.json();
    return (data.versions || []).length > 0;
  } catch {
    return false;
  }
}

export async function getProjectSRS(projectId) {
  try {
    const res = await fetch(
      `${BASE_URL}/api/projects/${projectId}/srs/versions`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.versions || []).filter(v => !v.session_id);
  } catch {
    return [];
  }
}