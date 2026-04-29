import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000/api",
});

// 1. Generate SRS — session level
export const generateSessionSRS = (projectId, sessionId) => {
  return API.post(`/projects/${projectId}/sessions/${sessionId}/generate-srs`);
};

// 2. Generate SRS — project level
export const generateProjectSRS = (projectId) => {
  return API.post(`/projects/${projectId}/generate-srs`);
};

// 3. Get session SRS versions
export const getSessionSrsVersions = (projectId, sessionId) => {
  return API.get(`/projects/${projectId}/sessions/${sessionId}/srs/versions`);
};

// 4. Get project SRS versions
export const getProjectSrsVersions = (projectId) => {
  return API.get(`/projects/${projectId}/srs/versions`);
};

// 5. Get specific artifact
export const getSrsArtifact = (artifactId) => {
  return API.get(`/artifacts/${artifactId}`);
};

// 6. Approve
export const approveSrsArtifact = (artifactId) => {
  return API.post(`/artifacts/${artifactId}/approve`);
};

// 7. Download as docx
export const downloadSrs = (artifactId) => {
  window.open(`http://localhost:8000/api/artifacts/${artifactId}/download-srs`);
};