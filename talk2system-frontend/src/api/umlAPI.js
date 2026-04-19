import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000/api",
});

// 1. Generate UML — session-level route
export const generateUML = (projectId, sessionId, diagramType) => {
  return API.post(
    `/projects/${projectId}/sessions/${sessionId}/generate-uml`,
    null,
    { params: { diagram_type: diagramType, source: "session" } }
  );
};

// 2. Get versions — FIXED: added return + correct API usage
export const getVersions = (projectId, type) => {
  return API.get(`/projects/${projectId}/artifacts/${type}/versions`);
};


// 3. Get specific artifact
export const getArtifact = (artifactId) => {
  return API.get(`/artifacts/${artifactId}`);
};

// 4. Approve
export const approveArtifact = (artifactId) => {
  return API.post(`/artifacts/${artifactId}/approve`);
};

// 5. Download
export const downloadArtifact = (artifactId) => {
  return API.get(`/artifacts/${artifactId}/download`);
};