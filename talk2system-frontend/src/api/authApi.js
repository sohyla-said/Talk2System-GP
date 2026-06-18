const BASE_URL = "http://127.0.0.1:8000";

function decodeJwtPayload(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

function getStorage(rememberMe) {
  return rememberMe ? localStorage : sessionStorage;
}

function getTokenStorage() {
  if (localStorage.getItem("access_token")) return localStorage;
  if (sessionStorage.getItem("access_token")) return sessionStorage;
  return localStorage;
}

const STORAGE_KEYS = [
  "access_token",
  "user_email",
  "user_id",
  "user_role",
  "user_status",
  "user_full_name",
  "user_created_at",
  "user_avatar",  
];

export function loginWithGoogle() {
  window.location.href = `http://127.0.0.1:8000/api/auth/google/login`;
}

export function loginWithGitHub() {
  window.location.href = `http://127.0.0.1:8000/api/auth/github/login`;
}

export function saveSession(data, rememberMe = true) {
  const storage = getStorage(rememberMe);
  const otherStorage = rememberMe ? sessionStorage : localStorage;

  STORAGE_KEYS.forEach((key) => otherStorage.removeItem(key));

  storage.setItem("access_token", data.access_token);
  storage.setItem("user_email", data.email);
  storage.setItem("user_id", String(data.user_id));
  storage.setItem("user_role", data.role);
  storage.setItem("user_status", data.status);
  storage.setItem("user_full_name", data.full_name);
  storage.setItem("user_created_at", data.created_at || "");
  storage.setItem("user_avatar", data.avatar_url || "");  
  window.dispatchEvent(new CustomEvent("avatar-updated", { detail: data.avatar_url }));
}

function clearSession() {
  STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

export async function signupApi(form) {
  const response = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: form.email,
      password: form.password,
      full_name: form.name,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Signup failed");
  saveSession(data, false);
  return data;
}

export async function loginApi(form, rememberMe = true) {
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
  saveSession(data, rememberMe);
  return data;
}

export function logout() {
  clearSession();
  window.location.replace("/login");
}

export function isLoggedIn() {
  const storage = getTokenStorage();
  const token = storage.getItem("access_token");
  if (!token) return false;
  if (isTokenExpired(token)) {
    clearSession();
    return false;
  }
  return true;
}

export function getToken() {
  const storage = getTokenStorage();
  const token = storage.getItem("access_token");
  if (isTokenExpired(token)) {
    clearSession();
    return null;
  }
  return token;
}

export function getCurrentUser() {
  const storage = getTokenStorage();
  const token = storage.getItem("access_token");
  if (isTokenExpired(token)) {
    clearSession();
    return null;
  }
  return {
    id: storage.getItem("user_id"),
    email: storage.getItem("user_email"),
    role: storage.getItem("user_role"),
    status: storage.getItem("user_status"),
    full_name: storage.getItem("user_full_name"),
    created_at: storage.getItem("user_created_at"),
    avatar_url: storage.getItem("user_avatar"), 
  };
}

export function isAdmin() {
  const storage = getTokenStorage();
  return storage.getItem("user_role") === "admin" && isLoggedIn();
}

export async function fetchProfile() {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Failed to fetch profile");
  const storage = getTokenStorage();
  storage.setItem("user_full_name", data.full_name || "");
  storage.setItem("user_avatar", data.avatar_url || "");
  window.dispatchEvent(new CustomEvent("avatar-updated", { detail: data.avatar_url }));
  return data;
}

export async function updateProfile(data) {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${BASE_URL}/api/auth/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  const responseData = await res.json();
  if (!res.ok) throw new Error(responseData.detail || "Update failed");
  
  const storage = getTokenStorage();
  if (data.full_name) storage.setItem("user_full_name", data.full_name);
  window.dispatchEvent(new CustomEvent("profile-updated", { 
    detail: { full_name: data.full_name }
  }));
  
  return responseData;
}

export async function uploadAvatar(file) {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${BASE_URL}/api/auth/upload-avatar`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Failed to upload avatar");
  const storage = getTokenStorage();
  storage.setItem("user_avatar", data.avatar_url);
  window.dispatchEvent(new CustomEvent("avatar-updated", { detail: data.avatar_url }));
  return data;
}

export async function deleteAvatar() {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const response = await fetch(`${BASE_URL}/api/auth/avatar`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Failed to delete avatar");
  const storage = getTokenStorage();
  storage.setItem("user_avatar", data.avatar_url);
  window.dispatchEvent(new CustomEvent("avatar-updated", { detail: data.avatar_url }));
  return data;
}

export async function changePassword(data) {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
    method: "POST",  
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  const responseData = await res.json();
  if (!res.ok) throw new Error(responseData.detail || "Password change failed");
  
  return responseData;
}

export async function fetchAllUsers() {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BASE_URL}/api/admin/all-users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Failed to fetch users");
  return data;
}

export async function adminSuspendUser(userId, reason) {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BASE_URL}/api/admin/users/${userId}/suspend`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to suspend user");
  return data;
}

export async function adminTerminateUser(userId, reason) {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BASE_URL}/api/admin/users/${userId}/terminate`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to terminate user");
  return data;
}

export async function adminArchiveUser(userId, reason) {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BASE_URL}/api/admin/users/${userId}/archive`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to archive user");
  return data;
}

export async function adminActivateUser(userId) {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BASE_URL}/api/admin/users/${userId}/restore`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to activate user");
  return data;
}

export const forgotPasswordApi = async (email) => {
  const response = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Failed to send reset email");
  return data;
};

export const resetPasswordApi = async (token, password) => {
  const response = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Failed to reset password");
  return data;
};