import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from "../api/notificationApi";
import { handleNotificationNav } from "../utils/notificationNavigation";
import { getToken } from "../api/authApi";

const ICON_MAP = {
  /* ─── Join Requests ────────────────────────────────────── */
  join_accepted: { icon: "check_circle", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800" },
  join_rejected: { icon: "cancel", color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800" },
  join_requested: { icon: "group_add", color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-900/20", border: "border-teal-200 dark:border-teal-800" },
  
  /* ─── Project Membership ───────────────────────────────── */
  added_to_project: { icon: "person_add", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800" },
  admin_assigned_pm: { icon: "admin_panel_settings", color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-200 dark:border-purple-800" },
  admin_removed_participant: { icon: "person_remove", color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800" },
  admin_replaced_pm: { icon: "swap_horiz", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800" },
  
  /* ─── Projects ────────────────────────────────── */
  admin_deleted_project: { icon: "delete_forever", color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800" },
  project_suspended:         { icon: "pause_circle",     color: "text-yellow-500",  bg: "bg-yellow-50 dark:bg-yellow-900/20",  border: "border-yellow-200 dark:border-yellow-800" },
  project_resumed:           { icon: "play_circle",      color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20",border: "border-emerald-200 dark:border-emerald-800" },
  
  /* ─── Account Status ───────────────────────────────────── */
  account_suspended: { icon: "lock_person", color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800" },
  account_restored: { icon: "lock_open", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800" },
  
  /* ─── Requirements ─────────────────────────────────────── */
  requirements_extracted:         { icon: "task_alt",  color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-900/20", border: "border-violet-200 dark:border-violet-800" },
  requirements_extracted_both:    { icon: "compare",   color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-900/20", border: "border-violet-200 dark:border-violet-800" },
  requirements_extraction_failed: { icon: "error",     color: "text-red-500",    bg: "bg-red-50 dark:bg-red-900/20",       border: "border-red-200 dark:border-red-800" },
  
  /* ─── Transcription ────────────────────────────────────── */
  transcription_done: { icon: "fact_check", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800" },
  
  /* ─── SRS Document ─────────────────────────────────────── */
  srs_generated:       { icon: "description",     color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20", border: "border-indigo-200 dark:border-indigo-800" },
  srs_generation_failed: { icon: "error",         color: "text-red-500",    bg: "bg-red-50 dark:bg-red-900/20",       border: "border-red-200 dark:border-red-800" },
  /* ─── UML Diagrams ─────────────────────────────────────── */ 
  uml_generated:       { icon: "account_tree",    color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-200 dark:border-purple-800" },
  uml_generation_failed: { icon: "error",         color: "text-red-500",    bg: "bg-red-50 dark:bg-red-900/20",       border: "border-red-200 dark:border-red-800" },
  /* ─── Leave Requests ───────────────────────────────────── */
  leave_request_received:    { icon: "exit_to_app",      color: "text-orange-500",  bg: "bg-orange-50 dark:bg-orange-900/20",  border: "border-orange-200 dark:border-orange-800" },
  pm_leave_request_received: { icon: "manage_accounts",  color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-900/20",    border: "border-amber-200 dark:border-amber-800" },
  leave_approved:            { icon: "check_circle",     color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20",border: "border-emerald-200 dark:border-emerald-800" },
  leave_rejected:            { icon: "cancel",           color: "text-red-500",     bg: "bg-red-50 dark:bg-red-900/20",        border: "border-red-200 dark:border-red-800" },

};

const TYPE_CATEGORIES = {
  project: {
    label: "Project",
    icon: "folder",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    types: [
      "join_accepted", "join_rejected", "added_to_project",
      "admin_assigned_pm", "admin_added_participant",
      "admin_removed_participant", "admin_removed_you",
      "admin_replaced_pm", "admin_deleted_project", "join_requested",
      "leave_request_received", "pm_leave_request_received",
      "leave_approved", "leave_rejected",
      "project_suspended", "project_resumed",
    ],
  },
  requirements: {
    label: "Requirements",
    icon: "task_alt",
    color: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    types: ["requirements_extracted", "requirements_extracted_both", "requirements_extraction_failed"],
  },
  srs: {
    label: "SRS",
    icon: "description",
    color: "text-indigo-500",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    types: ["srs_generated", "srs_generation_failed"],
  },
  uml: {
    label: "UML",
    icon: "account_tree",
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    types: ["uml_generated", "uml_generation_failed"],
  },
  transcription: {
    label: "Transcription",
    icon: "fact_check",
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    types: ["transcription_done"],
  },
  account: {
    label: "Account",
    icon: "lock_person",
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    types: ["account_suspended", "account_restored"],
  },
};

const TYPE_TO_CATEGORY = Object.entries(TYPE_CATEGORIES).reduce((acc, [key, val]) => {
  val.types.forEach((t) => (acc[t] = key));
  return acc;
}, {});
const DATE_PRESET_LABELS = {
  "7d":  "Last 7 days",
  "30d": "Last 30 days",
  "3m":  "Last 3 months",
  "6m":  "Last 6 months",
  "1y":  "This year",
};

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getDateFilterLabel({ dateMode, datePreset, dateMonth, dateYear, dateFrom, dateTo }) {
  if (dateMode === "preset" && datePreset) return DATE_PRESET_LABELS[datePreset] || datePreset;
  if (dateMode === "month_year") {
    const parts = [];
    if (dateMonth) parts.push(MONTH_LABELS[Number(dateMonth) - 1]);
    if (dateYear) parts.push(dateYear);
    return parts.join(" ") || "Date";
  }
  if (dateMode === "range") {
    if (dateFrom && dateTo) return `From (${dateFrom}) To (${dateTo})`;
    if (dateFrom) return dateFrom;
    return "Date";
  }
  return "Date";
}

function renderMessage(message) {
  if (!message) return null;
  if (message.includes("[pm_note]")) {
    const parts = message.split(/\[pm_note\](.*?)\[\/pm_note\]/s);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <div key={index} className="mt-3 p-3 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg">
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">edit_note</span>
              Note from PM:
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{part}</p>
          </div>
        );
      }
      return <span key={index}>{part}</span>;
    });
  }
  if (message.includes("[reason]")) {
    const parts = message.split(/\[reason\](.*?)\[\/reason\]/s);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <div key={index} className="mt-3 p-3 border-l-4 border-red-400 bg-red-50 dark:bg-red-900/20 rounded-r-lg">
            <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-1 flex items-center gap-1">
              Reason for rejection:
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{part}</p>
          </div>
        );
      }
      return <span key={index}>{part}</span>;
    });
  }
  const plainMatch = message.match(/^(.*?)(Note from PM:\s*)(.*)$/s);
  if (plainMatch) {
    return (
      <>
        <span>{plainMatch[1]}</span>
        <div className="mt-3 p-3 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg">
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">edit_note</span>
            {plainMatch[2]}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{plainMatch[3]}</p>
        </div>
      </>
    );
  }
  return <span>{message}</span>;
}

function FilterChip({ label, icon, color, active, onClick, count }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
        active
          ? `${color} border-current/20 shadow-sm`
          : "text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      {icon && <span className="material-symbols-outlined text-sm">{icon}</span>}
      {label}
      {count !== undefined && (
        <span className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${
          active ? "bg-black/10 dark:bg-white/10" : "bg-gray-100 dark:bg-gray-800"
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | unread | read
  const [dateMode, setDateMode]     = useState("none");
  const [datePreset, setDatePreset] = useState("");
  const [dateMonth, setDateMonth]   = useState("");
  const [dateYear, setDateYear]     = useState("");
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");
  const [showToDate, setShowToDate] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | category key
  const [projectFilter, setProjectFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleGoToProject = async (notif) => {
    if (!notif.is_read) {
      await markNotificationRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }
    await handleNotificationNav(notif, navigate, getToken);
  };

  const uniqueProjects = useMemo(() => {
    const map = new Map();
    notifications.forEach((n) => {
      if (n.project_id && n.project_name) {
        map.set(n.project_id, n.project_name);
      }
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [notifications]);

  const uniqueYears = useMemo(() => {
    const years = notifications.map((n) => new Date(n.created_at).getFullYear());
    return [...new Set(years)].sort((a, b) => b - a);
  }, [notifications]);

  const categoryCounts = useMemo(() => {
    const counts = { all: notifications.length };
    Object.entries(TYPE_CATEGORIES).forEach(([key, cat]) => {
      counts[key] = notifications.filter((n) => cat.types.includes(n.notification_type)).length;
    });
    return counts;
  }, [notifications]);

  const projectCounts = useMemo(() => {
    const counts = { all: notifications.length };
    uniqueProjects.forEach((p) => {
      counts[p.id] = notifications.filter((n) => n.project_id === p.id).length;
    });
    // Count notifications without a project
    const noProject = notifications.filter((n) => !n.project_id).length;
    if (noProject > 0) counts["none"] = noProject;
    return counts;
  }, [notifications, uniqueProjects]);

  const hasActiveDateFilter = dateMode !== "none" && (
    (dateMode === "preset" && datePreset) ||
    (dateMode === "month_year" && (dateMonth || dateYear)) ||
    (dateMode === "range" && (dateFrom || dateTo))
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "all") count++;
    if (hasActiveDateFilter) count++;
    if (typeFilter !== "all") count++;
    if (projectFilter !== "all") count++;
    if (searchQuery) count++;
    return count;
  }, [statusFilter, hasActiveDateFilter, typeFilter, projectFilter, searchQuery]);

  const clearDateFilter = () => {
    setDateMode("none");
    setDatePreset("");
    setDateMonth("");
    setDateYear("");
    setDateFrom("");
    setDateTo("");
    setShowToDate(false);
  };
  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setProjectFilter("all");
    clearDateFilter();
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Status filter
      if (statusFilter === "unread" && n.is_read) return false;
      if (statusFilter === "read" && !n.is_read) return false;

      // Date filter
      if (dateMode === "preset" && datePreset) {
        const now = new Date();
        const cutoffs = {
          "7d":  new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          "30d": new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          "3m":  new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
          "6m":  new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
          "1y":  new Date(now.getFullYear(), 0, 1),
        };
        const cutoff = cutoffs[datePreset];
        if (cutoff && new Date(n.created_at) < cutoff) return false;
      }
      if (dateMode === "month_year") {
        if (dateMonth && new Date(n.created_at).getMonth() + 1 !== Number(dateMonth)) return false;
        if (dateYear && new Date(n.created_at).getFullYear() !== Number(dateYear)) return false;
      }
      if (dateMode === "range") {
        if (dateFrom && dateTo) {
          if (new Date(n.created_at) < new Date(dateFrom)) return false;
          if (new Date(n.created_at) > new Date(dateTo + "T23:59:59")) return false;
        } else if (dateFrom) {
          const d = new Date(n.created_at);
          const start = new Date(dateFrom);
          const end = new Date(dateFrom + "T23:59:59");
          if (d < start || d > end) return false;
        }
      }

      // Type filter
      if (typeFilter !== "all") {
        const cat = TYPE_CATEGORIES[typeFilter];
        if (cat && !cat.types.includes(n.notification_type)) return false;
      }

      // Project filter
      if (projectFilter !== "all") {
        if (projectFilter === "none") {
          if (n.project_id) return false;
        } else {
          if (n.project_id !== projectFilter) return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          n.title?.toLowerCase().includes(query) ||
          n.actor_name?.toLowerCase().includes(query) ||
          n.actor_email?.toLowerCase().includes(query) ||
          n.project_name?.toLowerCase().includes(query) ||
          n.message?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [notifications, statusFilter, dateMode, datePreset, dateMonth, dateYear, dateFrom, dateTo, typeFilter, projectFilter, searchQuery]);

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
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition"
              >
                <span className="material-symbols-outlined text-base">done_all</span>
                Mark all as read ({unreadCount})
              </button>
            )}
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="relative mb-4">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder="Search by sender name, email, project, or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-20 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a162e] text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none shadow-sm"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="p-1 text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                showFilters || activeFilterCount > 0
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <span className="material-symbols-outlined text-sm">tune</span>
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* EXPANDABLE FILTER PANEL */}
        {showFilters && (
          <div className="mb-6 p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a162e] shadow-sm space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
            
            {/* Active filter pills and clear */}
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 font-medium">Active:</span>
                {statusFilter !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {statusFilter === "unread" ? "Unread" : "Read"}
                    <button onClick={() => setStatusFilter("all")} className="hover:text-primary/80">
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </span>
                )}
                {hasActiveDateFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-medium">
                    {getDateFilterLabel({ dateMode, datePreset, dateMonth, dateYear, dateFrom, dateTo })}
                    <button onClick={clearDateFilter} className="hover:text-amber-500">
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </span>
                )}
                {typeFilter !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 text-xs font-medium">
                    {TYPE_CATEGORIES[typeFilter]?.label}
                    <button onClick={() => setTypeFilter("all")} className="hover:text-violet-500">
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </span>
                )}
                {projectFilter !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium">
                    {projectFilter === "none" ? "No Project" : projectCounts[projectFilter] ? uniqueProjects.find(p => p.id === projectFilter)?.name : "Unknown"}
                    <button onClick={() => setProjectFilter("all")} className="hover:text-blue-500">
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </span>
                )}
                <button
                  onClick={clearAllFilters}
                  className="ml-auto text-xs text-gray-400 hover:text-red-500 font-medium transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* STATUS FILTER */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Status</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: "All" },
                  { key: "unread", label: "Unread", icon: "mark_email_unread" },
                  { key: "read", label: "Read", icon: "drafts" },
                ].map((tab) => (
                  <FilterChip
                    key={tab.key}
                    label={tab.label}
                    icon={tab.icon}
                    color="text-primary"
                    active={statusFilter === tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    count={
                      tab.key === "all"
                        ? notifications.length
                        : tab.key === "unread"
                        ? unreadCount
                        : notifications.length - unreadCount
                    }
                  />
                ))}
              </div>
            </div>

            {/* DATE FILTER */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Time Period</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => dateMode === "none" ? setDateMode("preset") : clearDateFilter()}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-semibold transition-all ${
                    dateMode !== "none"
                      ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                      : "text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                  Date
                </button>
              </div>

              {dateMode !== "none" && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5">

                  <div className="flex gap-1 mb-4 p-1 bg-gray-100 dark:bg-[#100d1c] rounded-lg w-fit">
                    {[
                      { id: "preset",     label: "Presets",      icon: "bolt" },
                      { id: "month_year", label: "Month / Year", icon: "calendar_view_month" },
                      { id: "range",      label: "Date",         icon: "calendar_today" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => { setDateMode(tab.id); setDatePreset(""); setDateMonth(""); setDateYear(""); setDateFrom(""); setDateTo(""); setShowToDate(false); }}
                        className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-semibold transition-all ${
                          dateMode === tab.id
                            ? "bg-white dark:bg-[#1a162e] text-amber-600 dark:text-amber-400 shadow-sm"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">{tab.icon}</span>
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {dateMode === "preset" && (
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "7d",  label: "Last 7 days" },
                        { value: "30d", label: "Last 30 days" },
                        { value: "3m",  label: "Last 3 months" },
                        { value: "6m",  label: "Last 6 months" },
                        { value: "1y",  label: "This year" },
                      ].map((p) => (
                        <button
                          key={p.value}
                          onClick={() => setDatePreset(datePreset === p.value ? "" : p.value)}
                          className={`h-8 px-4 rounded-full text-xs font-semibold border transition-all ${
                            datePreset === p.value
                              ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                              : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-amber-400/40 hover:text-amber-600 dark:hover:text-amber-400"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {dateMode === "month_year" && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Month</p>
                        <div className="flex flex-wrap gap-1.5">
                          {MONTH_LABELS.map((m, i) => (
                            <button
                              key={i + 1}
                              onClick={() => setDateMonth(dateMonth === String(i + 1) ? "" : String(i + 1))}
                              className={`h-8 w-12 rounded-lg text-xs font-semibold border transition-all ${
                                dateMonth === String(i + 1)
                                  ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                                  : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-amber-400/40 hover:text-amber-600 dark:hover:text-amber-400"
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      {uniqueYears.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Year</p>
                          <div className="flex flex-wrap gap-1.5">
                            {uniqueYears.map((y) => (
                              <button
                                key={y}
                                onClick={() => setDateYear(dateYear === String(y) ? "" : String(y))}
                                className={`h-8 px-4 rounded-lg text-xs font-semibold border transition-all ${
                                  dateYear === String(y)
                                    ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                                    : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-amber-400/40 hover:text-amber-600 dark:hover:text-amber-400"
                                }`}
                              >
                                {y}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {dateMode === "range" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); if (dateTo && e.target.value > dateTo) { setDateTo(""); setShowToDate(false); } }}
                        className="h-8 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#100d1c] text-xs text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 cursor-pointer"
                      />
                      {!showToDate && dateFrom && (
                        <button
                          type="button"
                          onClick={() => setShowToDate(true)}
                          className="inline-flex items-center gap-0.5 text-xs text-amber-500 hover:text-amber-600 font-medium transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">add</span>
                          to
                        </button>
                      )}
                      {showToDate && (
                        <>
                          <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-[18px]">arrow_forward</span>
                          <input
                            type="date"
                            value={dateTo}
                            min={dateFrom || undefined}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="h-8 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#100d1c] text-xs text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 cursor-pointer"
                          />
                          <button
                            onClick={() => { setDateTo(""); setShowToDate(false); }}
                            className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* TYPE FILTER */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Type</p>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  label="All Types"
                  icon="apps"
                  color="text-violet-500"
                  active={typeFilter === "all"}
                  onClick={() => setTypeFilter("all")}
                  count={categoryCounts.all}
                />
                {Object.entries(TYPE_CATEGORIES).map(([key, cat]) => (
                  <FilterChip
                    key={key}
                    label={cat.label}
                    icon={cat.icon}
                    color={cat.color}
                    active={typeFilter === key}
                    onClick={() => setTypeFilter(typeFilter === key ? "all" : key)}
                    count={categoryCounts[key]}
                  />
                ))}
              </div>
            </div>

            {/* PROJECT FILTER */}
            {uniqueProjects.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Project</p>
                <div className="flex flex-wrap gap-2">
                  <FilterChip
                    label="All Projects"
                    icon="folder"
                    color="text-blue-500"
                    active={projectFilter === "all"}
                    onClick={() => setProjectFilter("all")}
                    count={projectCounts.all}
                  />
                  {uniqueProjects.map((p) => (
                    <FilterChip
                      key={p.id}
                      label={p.name.length > 20 ? p.name.slice(0, 20) + "…" : p.name}
                      icon="folder_open"
                      color="text-blue-500"
                      active={projectFilter === p.id}
                      onClick={() => setProjectFilter(projectFilter === p.id ? "all" : p.id)}
                      count={projectCounts[p.id]}
                    />
                  ))}
                  {projectCounts["none"] > 0 && (
                    <FilterChip
                      label="No Project"
                      icon="folder_off"
                      color="text-gray-500"
                      active={projectFilter === "none"}
                      onClick={() => setProjectFilter(projectFilter === "none" ? "all" : "none")}
                      count={projectCounts["none"]}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* RESULTS SUMMARY */}
        {!loading && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-400">
              Showing <span className="font-semibold text-gray-600 dark:text-gray-300">{filteredNotifications.length}</span> of{" "}
              <span className="font-semibold text-gray-600 dark:text-gray-300">{notifications.length}</span> notifications
            </p>
          </div>
        )}

        {/* LIST */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <span className="material-symbols-outlined text-4xl text-gray-300 animate-spin mb-3">progress_activity</span>
            <p className="text-gray-400">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
              {searchQuery || activeFilterCount > 0 ? "filter_list_off" : "notifications_off"}
            </span>
            <h3 className="text-2xl font-black text-gray-400 mb-2">
              {searchQuery || activeFilterCount > 0 ? "No matching notifications" : "No notifications"}
            </h3>
            <p className="text-gray-400 max-w-sm">
              {searchQuery || activeFilterCount > 0
                ? "Try adjusting your search or filters to find what you're looking for."
                : "Notifications will appear here when there's activity on your projects."}
            </p>
            {(searchQuery || activeFilterCount > 0) && (
              <button
                onClick={clearAllFilters}
                className="mt-4 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notif) => {
              const style = ICON_MAP[notif.notification_type] || ICON_MAP.added_to_project;
              const categoryKey = TYPE_TO_CATEGORY[notif.notification_type];
              const category = categoryKey ? TYPE_CATEGORIES[categoryKey] : null;
              return (
                <div
                  key={notif.id}
                  onClick={() => handleGoToProject(notif)}
                  className={`flex items-start gap-4 p-5 rounded-xl border transition-all cursor-pointer hover:shadow-md group ${
                    !notif.is_read
                      ? `${style.bg} ${style.border}`
                      : "bg-white dark:bg-[#1a162e] border-gray-200 dark:border-white/5"
                  }`}
                >
                  <div className={`flex-shrink-0 ${style.color}`}>
                    <span className="material-symbols-outlined text-2xl">{style.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h3
                        className={`text-sm ${
                          !notif.is_read ? "font-black" : "font-semibold"
                        } text-[#100d1c] dark:text-white`}
                      >
                        {notif.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Type badge */}
                        {category && (
                          <span
                            className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${category.bg} ${category.color}`}
                          >
                            <span className="material-symbols-outlined text-xs">{category.icon}</span>
                            {category.label}
                          </span>
                        )}
                        {!notif.is_read && (
                          <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {renderMessage(notif.message)}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
                      {notif.actor_name && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="material-symbols-outlined text-sm">person</span>
                          <span>{notif.actor_name}</span>
                          {notif.actor_email && (
                            <span className="text-gray-400">({notif.actor_email})</span>
                          )}
                        </div>
                      )}
                      {notif.project_name && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="material-symbols-outlined text-sm">folder</span>
                          <span>{notif.project_name}</span>
                        </div>
                      )}
                      {/* Mobile type badge */}
                      {category && (
                        <span
                          className={`sm:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${category.bg} ${category.color}`}
                        >
                          <span className="material-symbols-outlined text-xs">{category.icon}</span>
                          {category.label}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        <span>{new Date(notif.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-gray-300 group-hover:text-gray-500 flex-shrink-0 mt-1 transition-colors">
                    arrow_forward
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}