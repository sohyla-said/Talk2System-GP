import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchUnreadCount, fetchNotifications, markNotificationRead, markAllNotificationsRead } from "../../api/notificationApi";

const ICON_MAP = {
  join_accepted: { icon: "check_circle", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  join_rejected: { icon: "cancel", color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
  added_to_project: { icon: "person_add", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
  admin_assigned_pm: { icon: "admin_panel_settings", color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
  admin_added_participant: { icon: "group_add", color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
  admin_removed_participant: { icon: "person_remove", color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20" },
  admin_removed_you: { icon: "person_remove", color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
  admin_replaced_pm: { icon: "swap_horiz", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
  admin_deleted_project: { icon: "delete_forever", color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
  join_requested: { icon: "group_add", color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-900/20" },
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const data = await fetchUnreadCount();
      setUnreadCount(data.count);
    } catch (err) { console.error(err); }
  };

  const handleToggle = async () => {
    if (isOpen) { setIsOpen(false); return; }
    setIsOpen(true); setLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      loadUnreadCount();
    } catch (err) { console.error(err); }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      loadUnreadCount();
    } catch (err) { console.error(err); }
  };

  const formatTime = (dateStr) => {
    const diffMs = new Date() - new Date(dateStr);
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={handleToggle} className="relative flex items-center justify-center size-10 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" title="Notifications">
        <span className="material-symbols-outlined text-gray-600 dark:text-gray-300">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-[400px] max-h-[500px] bg-white dark:bg-[#1a162e] rounded-xl border border-gray-200 dark:border-white/10 shadow-2xl flex flex-col z-50 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700">
            <h3 className="font-black text-[#100d1c] dark:text-white">Notifications</h3>
            {unreadCount > 0 && <button onClick={handleMarkAllRead} className="text-xs text-primary font-bold hover:underline">Mark all read</button>}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12"><span className="material-symbols-outlined animate-spin text-gray-400">progress_activity</span></div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">notifications_off</span>
                <p className="text-gray-400 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const style = ICON_MAP[notif.notification_type] || ICON_MAP.added_to_project;
                return (
                  <div key={notif.id} onClick={() => { if (!notif.is_read) handleMarkRead(notif.id); setIsOpen(false); if (notif.project_id) navigate(`/projects/${notif.project_id}`); }}
                    className={`flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0 ${!notif.is_read ? style.bg : ""}`}>
                    <span className={`material-symbols-outlined mt-0.5 ${style.color}`}>{style.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!notif.is_read ? "font-bold" : "font-medium"} text-[#100d1c] dark:text-white`}>{notif.title}</p>
                        {!notif.is_read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notif.message}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {notif.actor_name && <span className="text-[11px] text-gray-400">by {notif.actor_name}</span>}
                        <span className="text-[11px] text-gray-400">• {formatTime(notif.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {notifications.length > 0 && (
            <div className="border-t dark:border-gray-700 px-5 py-3">
              <button onClick={() => { setIsOpen(false); navigate("/notifications"); }} className="w-full text-center text-sm text-primary font-bold hover:underline">View all notifications</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}