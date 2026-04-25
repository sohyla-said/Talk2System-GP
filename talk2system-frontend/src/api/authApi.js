const BASE_URL = "http://127.0.0.1:8000";

const KEYS = ["access_token", "user_email", "user_id", "user_role", "user_status", "user_full_name"];
  
function saveSession(data) {
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("user_email",   data.email);
  localStorage.setItem("user_id",      String(data.user_id));
  localStorage.setItem("user_role",    data.role);
  localStorage.setItem("user_status",  data.status);
}

function clearSession() {
  KEYS.forEach((k) => localStorage.removeItem(k));
}

export async function signupApi(form) {
  const response = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email:     form.email,
      password:  form.password,
      full_name: form.name,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Signup failed");

  // ── Save to LocalStorage ──
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("user_id", data.user_id);     
    localStorage.setItem("user_email", data.email);
    localStorage.setItem("user_role", data.role);
    localStorage.setItem("user_status", data.status);
    localStorage.setItem("user_full_name", data.full_name); 
  return data;
}

export async function loginApi(form) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email:    form.email,
      password: form.password,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Login failed");


  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("user_id", data.user_id);
  localStorage.setItem("user_email", data.email);
  localStorage.setItem("user_role", data.role);
  localStorage.setItem("user_status", data.status);
  localStorage.setItem("user_full_name", data.full_name); 

  return data;
}
export function logout() {
  clearSession();
  window.location.replace("/login");   
}

export function isLoggedIn() {
  return !!localStorage.getItem("access_token");
}

export function getToken() {
  return localStorage.getItem("access_token");
}

export function getCurrentUser() {
  return {
    id:     localStorage.getItem("user_id"),
    email:  localStorage.getItem("user_email"),
    role:   localStorage.getItem("user_role"),
    status: localStorage.getItem("user_status"),
    full_name: localStorage.getItem("user_full_name"),
  };
}

export function isAdmin() {
  return localStorage.getItem("user_role") === "admin";
}


export async function fetchAllUsers() {
  const res = await fetch(`${BASE_URL}/api/admin/all-users`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Failed to fetch users");
  return data;
}

export async function adminSuspendUser(userId) {
  const res = await fetch(`${BASE_URL}/api/admin/users/${userId}/suspend`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to suspend user");
  return data;
}

export async function adminTerminateUser(userId) {
  const res = await fetch(`${BASE_URL}/api/admin/users/${userId}/terminate`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to terminate user");
  return data;
}

export async function adminArchiveUser(userId) {
  const res = await fetch(`${BASE_URL}/api/admin/users/${userId}/archive`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to archive user");
  return data;
}

export async function adminActivateUser(userId) {
  const res = await fetch(`${BASE_URL}/api/admin/users/${userId}/approve`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to activate user");
  return data;
}