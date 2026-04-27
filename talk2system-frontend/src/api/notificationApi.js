import { getToken } from './authApi';

const BASE_URL = "http://127.0.0.1:8000";

async function apiCall(url, options = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed`);
  }
  return res.json();
}

export const fetchNotifications = (unreadOnly = false) => {
  const query = unreadOnly ? '?unread_only=true' : '';
  return apiCall(`${BASE_URL}/api/notifications${query}`);
};

export const fetchUnreadCount = () => apiCall(`${BASE_URL}/api/notifications/unread-count`);

export const markNotificationRead = (id) => 
  apiCall(`${BASE_URL}/api/notifications/${id}/read`, { method: 'PATCH' });

export const markAllNotificationsRead = () => 
  apiCall(`${BASE_URL}/api/notifications/read-all`, { method: 'PATCH' });