import { getToken } from "./authApi";

const BASE_URL = "http://127.0.0.1:8000";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

export async function fetchUserDashboardStats() {
  const res = await fetch(`${BASE_URL}/api/dashboard/user-stats`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch dashboard stats");
  return data;
}

export async function fetchAdminDashboardStats() {
  const res = await fetch(`${BASE_URL}/api/dashboard/admin-stats`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch dashboard stats");
  return data;
}
