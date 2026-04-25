import { getToken } from "./authApi";

const BASE_URL = "http://127.0.0.1:8000";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});


export async function fetchProjects() {
  const res = await fetch(`${BASE_URL}/api/projects/getprojects`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch projects");
  return data;
}

export async function fetchProject(projectId) {
  const res = await fetch(`${BASE_URL}/api/projects/getproject/${projectId}`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Project not found");
  return data;
}

export async function createProject(payload) {
  const res = await fetch(`${BASE_URL}/api/projects/createproject`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to create project");
  return data;
}

// My role in a project 

export async function fetchMyRole(projectId) {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/my-role`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch role");
  return data; // { role: "project_manager" | "participant" | null, is_member: bool }
}

// Members

export async function fetchMembers(projectId) {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/members`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch members");
  return data;
}

// Join request (user → PM) 

export async function sendJoinRequest(projectId, projectDomain) {
  const res = await fetch(`${BASE_URL}/api/projects/join`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ project_id: projectId, project_domain: projectDomain }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to send join request");
  return data;
}

export async function fetchMyJoinRequests() {
  const res = await fetch(`${BASE_URL}/api/projects/my-requests`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch requests");
  return data;
}

// PM actions

export async function fetchPendingRequests() {
  const res = await fetch(`${BASE_URL}/api/projects/pending-requests`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch pending requests");
  return data;
}

export async function acceptInvitation(invitationId) {
  const res = await fetch(`${BASE_URL}/api/projects/invitations/${invitationId}/accept`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to accept");
  return data;
}

export async function rejectInvitation(invitationId) {
  const res = await fetch(`${BASE_URL}/api/projects/invitations/${invitationId}/reject`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to reject");
  return data;
}
// My projects (only ones I own or am member of)
export async function fetchMyProjects() {
  const res = await fetch(`${BASE_URL}/api/projects/my-projects`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch projects");
  return data;
}

// ADMIN SYSTEM PROJECTS
export async function fetchAdminProjects() {
  const res = await fetch(`${BASE_URL}/api/admin/system-projects`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch system projects");
  return data;
}

export async function adminDeleteProject(projectId) {
  const res = await fetch(`${BASE_URL}/api/admin/system-projects/${projectId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete project");
  return;
}

export async function fetchAdminProjectMembers(projectId) {
  const res = await fetch(`${BASE_URL}/api/admin/system-projects/${projectId}/members`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch members");
  return data;
}

export async function adminRemoveMember(projectId, membershipId) {
  const res = await fetch(`${BASE_URL}/api/admin/system-projects/${projectId}/members/${membershipId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to remove member");
  return;
}

export async function adminChangePM(projectId, newPmEmail) {
  const res = await fetch(`${BASE_URL}/api/admin/system-projects/${projectId}/change-pm`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ email: newPmEmail }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to change PM");
  return data;
}

// Add participant directly
export async function addParticipantDirectly(projectId, email, notes) {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/participants`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, notes }),
  });
  
  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error("Server error. Please try again.");
  }

  if (!res.ok) throw new Error(data.detail || "Failed to add participant");
  return data;
}

// Remove participant
export async function removeParticipant(projectId, userId) {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/participants/${userId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  
  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error("Server error.");
  }

  if (!res.ok) throw new Error(data.detail || "Failed to remove participant");
  return data;
}

export async function fetchProjectAuditLogs(projectId) {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/audit-logs`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Failed to fetch logs");
  return data;
}