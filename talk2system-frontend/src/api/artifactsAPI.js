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