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

export async function fetchUserMomentum(weeks = 8) {
  const res = await fetch(`${BASE_URL}/api/dashboard/user-momentum?weeks=${weeks}`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch momentum data");
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

export async function fetchActivityFeed(filterBy = "all", filterValue = "") {
  const params = new URLSearchParams({ filter_by: filterBy });
  if (filterValue) params.set("filter_value", filterValue);
  const res = await fetch(`${BASE_URL}/api/dashboard/activity-feed?${params}`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch activity feed");
  return data;
}

export async function fetchUsersWorkloadReport() {
  const res = await fetch(`${BASE_URL}/api/dashboard/admin/users-workload`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch users workload report");
  return data;
}

export async function fetchUserActivityFeed(filterBy = "all", filterValue = "") {
  const params = new URLSearchParams({ filter_by: filterBy });
  if (filterValue) params.set("filter_value", filterValue);
  const res = await fetch(`${BASE_URL}/api/dashboard/user-activity-feed?${params}`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch activity feed");
  return data;
}
