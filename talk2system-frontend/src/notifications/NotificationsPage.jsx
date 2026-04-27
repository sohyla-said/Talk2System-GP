import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from "../api/notificationApi";

const ICON_MAP = {
  join_accepted: { icon: "check_circle", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800" },
  join_rejected: { icon: "cancel", color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800" },
  added_to_project: { icon: "person_add", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800" },
  admin_assigned_pm: { icon: "admin_panel_settings", color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-200 dark:border-purple-800" },
  admin_added_participant: { icon: "group_add", color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20", border: "border-indigo-200 dark:border-indigo-800" },
  admin_removed_participant: { icon: "person_remove", color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800" },
  admin_removed_you: { icon: "person_remove", color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800" },
  admin_replaced_pm: { icon: "swap_horiz", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800" },
  admin_deleted_project: { icon: "delete_forever", color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800" },
  join_requested: { icon: "group_add", color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-900/20", border: "border-teal-200 dark:border-teal-800" },

};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    try { 
      const data = await fetchNotifications(); 
      setNotifications(data); 
    }
    catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const handleMarkAllRead = async () => {
    try { 
      await markAllNotificationsRead(); 
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true }))); 
    }
    catch (err) { console.error(err); }
  };

  const handleGoToProject = async (notif) => {
    if (!notif.is_read) { 
      await markNotificationRead(notif.id); 
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))); 
    }
    if (notif.project_id) navigate(`/projects/${notif.project_id}`);
  };

  // Filter by status (all/unread/read)
  const statusFiltered = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    if (filter === "read") return n.is_read;
    return true;
  });

  const filteredNotifications = statusFiltered.filter((n) => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    return (
      n.title?.toLowerCase().includes(query) ||
      n.actor_name?.toLowerCase().includes(query) ||
      n.actor_email?.toLowerCase().includes(query) ||
      n.project_name?.toLowerCase().includes(query) ||
      n.message?.toLowerCase().includes(query)
    );
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
      <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-8">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-black text-[#100d1c] dark:text-white">Notifications</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Stay updated on your project activity.</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition">
              <span className="material-symbols-outlined text-base">done_all</span> Mark all as read ({unreadCount})
            </button>
          )}
        </div>

        {/* SEARCH BAR */}
        <div className="relative mb-6">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder="Search by sender name, email, project, or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a162e] text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none shadow-sm"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          )}
        </div>

        {/* FILTER TABS */}
        <div className="flex gap-2 mb-6">
          {[{ key: "all", label: "All" }, { key: "unread", label: "Unread" }, { key: "read", label: "Read" }].map((tab) => (
            <button key={tab.key} onClick={() => setFilter(tab.key)} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${filter === tab.key ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* LIST */}
        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
              {searchQuery ? "search_off" : "notifications_off"}
            </span>
            <h3 className="text-2xl font-black text-gray-400 mb-2">
              {searchQuery ? "No results found" : (filter === "unread" ? "No unread notifications" : "No notifications")}
            </h3>
            <p className="text-gray-400">
              {searchQuery ? `No notifications match "${searchQuery}"` : (filter === "unread" ? "You're all caught up!" : "Notifications will appear here.")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notif) => {
              const style = ICON_MAP[notif.notification_type] || ICON_MAP.added_to_project;
              return (
                <div key={notif.id} onClick={() => handleGoToProject(notif)} className={`flex items-start gap-4 p-5 rounded-xl border transition-all cursor-pointer hover:shadow-md ${!notif.is_read ? `${style.bg} ${style.border}` : "bg-white dark:bg-[#1a162e] border-gray-200 dark:border-white/5"}`}>
                  <div className={`flex-shrink-0 ${style.color}`}><span className="material-symbols-outlined text-2xl">{style.icon}</span></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className={`text-sm ${!notif.is_read ? "font-black" : "font-semibold"} text-[#100d1c] dark:text-white`}>{notif.title}</h3>
                      {!notif.is_read && <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1" />}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notif.message}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
                      {notif.actor_name && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="material-symbols-outlined text-sm">person</span>
                          <span>{notif.actor_name}</span>
                          {notif.actor_email && <span className="text-gray-400">({notif.actor_email})</span>}
                        </div>
                      )}
                      {notif.project_name && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="material-symbols-outlined text-sm">folder</span>
                          <span>{notif.project_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        <span>{new Date(notif.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  {notif.project_id && <span className="material-symbols-outlined text-gray-400 flex-shrink-0">arrow_forward</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}