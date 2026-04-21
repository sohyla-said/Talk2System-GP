const BASE_URL = "http://127.0.0.1:8000";

// SIGNUP 
export async function signupApi(form) {
  const response = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: form.email,
      password: form.password,
      full_name: form.name,
      role: form.role.toLowerCase().replace(" ", "_"), // "Project Manager" → "project_manager"
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Signup failed");

  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("user_email", data.email);
  localStorage.setItem("user_id", String(data.user_id));
  localStorage.setItem("user_role", data.role);
  localStorage.setItem("user_status", data.status);

  return data;
}

//  LOGIN 
export async function loginApi(form) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: form.email,
      password: form.password,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Login failed");

  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("user_email", data.email);
  localStorage.setItem("user_id", String(data.user_id));
  localStorage.setItem("user_role", data.role);
  localStorage.setItem("user_status", data.status);

  return data;
}

//  LOGOUT 
export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_email");
  localStorage.removeItem("user_id");
  localStorage.removeItem("user_role");
  localStorage.removeItem("user_status");
  window.location.href = "/auth/login";
}

//  CHECK IF LOGGED IN 
export function isLoggedIn() {
  return !!localStorage.getItem("access_token");
}

//  GET TOKEN (for other API calls) 
export function getToken() {
  return localStorage.getItem("access_token");
}

//  GET CURRENT USER INFO 
export function getCurrentUser() {
  return {
    id: localStorage.getItem("user_id"),
    email: localStorage.getItem("user_email"),
    role: localStorage.getItem("user_role"),
    status: localStorage.getItem("user_status"),
  };
}

//  ROLE HELPERS 
export function isAdmin() {
  return localStorage.getItem("user_role") === "admin";
}

export function isProjectManager() {
  return localStorage.getItem("user_role") === "project_manager";
}

export function isParticipant() {
  return localStorage.getItem("user_role") === "participant";
}