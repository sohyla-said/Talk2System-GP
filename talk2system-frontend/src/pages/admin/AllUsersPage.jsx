import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAllUsers, adminSuspendUser, adminTerminateUser, adminArchiveUser, adminActivateUser } from "../../api/authApi";

const STATUS_REASONS = {
  suspend: {
    Security: [
      "Suspicious login activity detected",
      "Multiple failed login attempts",
      "Security investigation in progress",
      "Potential account compromise",
    ],

    Policy: [
      "Violation of project guidelines",
      "Unauthorized modification attempts",
      "Misuse of system resources",
      "Inappropriate collaboration behavior",
    ],

    Administrative: [
      "Temporary access restriction",
      "Account under verification",
      "Temporary leave of absence",
    ],
  },

  terminate: {
    Membership: [
      "Member resigned",
      "Member left the organization",
    ],

    Security: [
      "Serious policy violation",
      "Unauthorized data access attempt",
    ],
  },

archive: {
    Inactivity: [
      "Account inactive for extended period",
      "Inactive user account",
    ],
  },
};

const REASONS_FOR_STATUS = {
  suspended: STATUS_REASONS.suspend,
  terminated: STATUS_REASONS.terminate,
  archived: STATUS_REASONS.archive,
};

const REASON_TO_CATEGORY = {};
Object.entries(STATUS_REASONS).forEach(([_status, categories]) => {
  Object.entries(categories).forEach(([category, reasons]) => {
    reasons.forEach((reason) => {
      REASON_TO_CATEGORY[reason] = category;
    });
  });
});

const ACTION_CONFIG = {
  suspend: {
    title: "Suspend User",
    icon: "pause_circle",
    iconColor: "text-orange-500",
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
    confirmButtonClass: "bg-orange-600 hover:bg-orange-700",
    confirmButtonText: "Suspend User",
    categoryPlaceholder: "Select a reason for suspension...",
  },
  terminate: {
    title: "Terminate User",
    icon: "block",
    iconColor: "text-red-500",
    iconBg: "bg-red-100 dark:bg-red-900/30",
    confirmButtonClass: "bg-red-600 hover:bg-red-700",
    confirmButtonText: "Terminate User",
    categoryPlaceholder: "Select a reason for termination...",
  },
  archive: {
    title: "Archive User",
    icon: "archive",
    iconColor: "text-gray-500 dark:text-gray-400",
    iconBg: "bg-gray-100 dark:bg-gray-700",
    confirmButtonClass: "bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600",
    confirmButtonText: "Archive User",
    categoryPlaceholder: "Select a reason for archiving...",
  },
};

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

export default function AllUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Action Modals
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState(null);
  const [modalUser, setModalUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Activate Modal
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [activateUser, setActivateUser] = useState(null);
  const [activateSubmitting, setActivateSubmitting] = useState(false);

  const [expandedReason, setExpandedReason] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const loadUsers = async () => {
    try {
      const data = await fetchAllUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(query) ||
        (u.full_name && u.full_name.toLowerCase().includes(query))
    );
  }, [users, searchQuery]);

  // Pagination math
  const totalUsers = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalUsers);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Page number array for display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, safeCurrentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    setExpandedReason(null);
  };

  const openActionModal = (action, user) => {
    setModalAction(action);
    setModalUser(user);
    setSelectedCategory("");
    setSelectedReason("");
    setCustomReason("");
    setModalError("");
    setShowModal(true);
  };

  const closeActionModal = () => {
    setShowModal(false);
    setModalAction(null);
    setModalUser(null);
    setSelectedCategory("");
    setSelectedReason("");
    setCustomReason("");
    setModalError("");
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setSelectedReason("");
    setModalError("");
  };

  const handleReasonChange = (e) => {
    setSelectedReason(e.target.value);
    if (e.target.value !== "other") setCustomReason("");
    setModalError("");
  };

  const getFinalReason = () => {
    if (selectedReason === "other") return customReason.trim();
    return selectedReason;
  };

  const handleModalSubmit = async () => {
    const finalReason = getFinalReason();
    if (!selectedCategory) { setModalError("Please select a category"); return; }
    if (!selectedReason) { setModalError("Please select a reason"); return; }
    if (selectedReason === "other" && !customReason.trim()) { setModalError("Please enter a custom reason"); return; }

    setModalSubmitting(true);
    setModalError("");

    try {
      let res;
      if (modalAction === "suspend") res = await adminSuspendUser(modalUser.id, finalReason);
      else if (modalAction === "terminate") res = await adminTerminateUser(modalUser.id, finalReason);
      else if (modalAction === "archive") res = await adminArchiveUser(modalUser.id, finalReason);

      setMessage(res.message);
      closeActionModal();
      await loadUsers();
    } catch (err) {
      setModalError(err.message || "An error occurred");
    } finally {
      setModalSubmitting(false);
    }
  };

  const openActivateModal = (user) => {
    setActivateUser(user);
    setShowActivateModal(true);
  };

  const closeActivateModal = () => {
    setShowActivateModal(false);
    setActivateUser(null);
  };

  const handleActivateSubmit = async () => {
    if (!activateUser) return;
    setActivateSubmitting(true);
    setMessage("");
    try {
      const res = await adminActivateUser(activateUser.id);
      setMessage(res.message);
      closeActivateModal();
      await loadUsers();
    } catch (err) {
      setMessage(err.message);
      closeActivateModal();
    } finally {
      setActivateSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
      pending: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      suspended: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
      terminated: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
      archived: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600",
    };
    return styles[status] || styles.active;
  };

  const getStatusDot = (status) => {
    const dots = {
      active: "bg-emerald-500",
      pending: "bg-amber-500",
      suspended: "bg-orange-500",
      terminated: "bg-red-500",
      archived: "bg-gray-400",
    };
    return dots[status] || dots.active;
  };

  const getReasonCategory = (reason) => {
    if (!reason) return null;
    return REASON_TO_CATEGORY[reason] || null;
  };

  const currentCategories = modalAction ? Object.keys(STATUS_REASONS[modalAction] || {}) : [];
  const currentReasons = selectedCategory ? (STATUS_REASONS[modalAction]?.[selectedCategory] || []) : [];
  const currentConfig = modalAction ? ACTION_CONFIG[modalAction] : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0f0d1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-400">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0d1a]">
      {/* Top Bar */}
      <div className="bg-white dark:bg-[#1a162e] border-b border-gray-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-5 gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">All Users</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{totalUsers} total users</p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:w-72">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-10 pr-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-[#231e3d] text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-[#231e3d] transition-all outline-none"
                />
              </div>
              <button
                onClick={() => navigate("/role-approval")}
                className="h-9 px-4 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors whitespace-nowrap flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                <span className="hidden sm:inline">Pending Approvals</span>
                <span className="sm:hidden">Approvals</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <span className="material-symbols-outlined text-[18px]">info</span>
              {message}
            </div>
            <button onClick={() => setMessage("")} className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 transition-colors">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="hidden lg:block bg-white dark:bg-[#1a162e] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-[#1f1b35]">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Global Role</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[180px]">Status</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-5 py-16 text-center">
                      <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 block mb-2">group_off</span>
                      <p className="text-gray-400 dark:text-gray-500 text-sm">
                        {searchQuery ? `No users found for "${searchQuery}"` : "No users in system."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u) => {
                    const category = getReasonCategory(u.status_reason);
                    const isExpanded = expandedReason === u.id;
                    const statusReasonsList = REASONS_FOR_STATUS[u.status];

                    return (
                      <tr key={u.id} className="hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                              {(u.full_name || u.email).charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]">{u.full_name || "—"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-500 dark:text-gray-400 truncate max-w-[220px]">{u.email}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                            u.role === "admin" || u.role === "Admin"
                              ? "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                          }`}>
                            <span className="material-symbols-outlined text-[13px]">
                              {u.role === "admin" || u.role === "Admin" ? "admin_panel_settings" : "person"}
                            </span>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border w-fit ${getStatusBadge(u.status)}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(u.status)}`}></span>
                              {u.status}
                            </span>

                            {u.status !== "active" && u.status !== "pending" && u.status_reason && (
                              <>
                                <button
                                  onClick={() => setExpandedReason(isExpanded ? null : u.id)}
                                  className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors w-fit group"
                                >
                                  <span className={`material-symbols-outlined text-[14px] transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}>chevron_right</span>
                                  <span className="truncate max-w-[180px] group-hover:text-gray-600 dark:group-hover:text-gray-300">
                                    {category ? `${category}: ${u.status_reason}` : u.status_reason}
                                  </span>
                                </button>

                                {isExpanded && (
                                  <div className="ml-5 mt-1 p-3 rounded-lg bg-gray-50 dark:bg-[#231e3d] border border-gray-200 dark:border-white/10 text-xs space-y-1.5 animate-in">
                                    {category && <p className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">{category}</p>}
                                    <p className="text-gray-700 dark:text-gray-200 leading-relaxed">{u.status_reason}</p>
                                    {statusReasonsList && Object.entries(statusReasonsList).map(
                                      ([cat, reasons]) =>
                                        reasons.includes(u.status_reason) ? (
                                          <div key={cat} className="pt-1.5 mt-1.5 border-t border-gray-200 dark:border-white/10">
                                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">All {cat} reasons:</p>
                                            <ul className="space-y-0.5">
                                              {reasons.map((r) => (
                                                <li key={r} className={`flex items-center gap-1.5 ${r === u.status_reason ? "text-orange-600 dark:text-orange-400 font-semibold" : "text-gray-400"}`}>
                                                  <span className="material-symbols-outlined text-[10px]">
                                                    {r === u.status_reason ? "radio_button_checked" : "radio_button_unchecked"}
                                                  </span>
                                                  {r}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        ) : null
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {u.status === "active" && u.role !== "admin" && u.role !== "Admin" && (
                              <>
                                <button disabled={actionLoading === u.id} onClick={() => openActionModal("suspend", u)}
                                  className="px-2.5 py-1.5 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md text-xs font-semibold disabled:opacity-50 transition-colors"
                                  title="Suspend user">Suspend</button>
                                <button disabled={actionLoading === u.id} onClick={() => openActionModal("terminate", u)}
                                  className="px-2.5 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-xs font-semibold disabled:opacity-50 transition-colors"
                                  title="Terminate user">Terminate</button>
                                <button disabled={actionLoading === u.id} onClick={() => openActionModal("archive", u)}
                                  className="px-2.5 py-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md text-xs font-semibold disabled:opacity-50 transition-colors"
                                  title="Archive user">Archive</button>
                              </>
                            )}
                            {u.status !== "active" && u.status !== "pending" && (
                              <button disabled={actionLoading === u.id} onClick={() => openActivateModal(u)}
                                className="px-2.5 py-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md text-xs font-semibold disabled:opacity-50 transition-colors"
                                title="Activate user">Activate</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-[#1f1b35]/50">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="h-7 px-2 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#231e3d] text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary cursor-pointer"
              >
                {ROWS_PER_PAGE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="ml-2">
                {totalUsers === 0 ? "0 users" : `${startIndex + 1}–${endIndex} of ${totalUsers}`}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(safeCurrentPage - 1)}
                disabled={safeCurrentPage <= 1}
                className="w-8 h-8 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>

              {safeCurrentPage > 3 && totalPages > 5 && (
                <>
                  <button onClick={() => goToPage(1)} className="w-8 h-8 rounded-md flex items-center justify-center text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">1</button>
                  <span className="w-8 h-8 flex items-center justify-center text-gray-400 text-xs">...</span>
                </>
              )}

              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-medium transition-colors ${
                    page === safeCurrentPage
                      ? "bg-primary text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
                  }`}
                >
                  {page}
                </button>
              ))}

              {safeCurrentPage < totalPages - 2 && totalPages > 5 && (
                <>
                  <span className="w-8 h-8 flex items-center justify-center text-gray-400 text-xs">...</span>
                  <button onClick={() => goToPage(totalPages)} className="w-8 h-8 rounded-md flex items-center justify-center text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">{totalPages}</button>
                </>
              )}

              <button
                onClick={() => goToPage(safeCurrentPage + 1)}
                disabled={safeCurrentPage >= totalPages}
                className="w-8 h-8 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        <div className="hidden md:block lg:hidden bg-white dark:bg-[#1a162e] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-[#1f1b35]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-12 text-center text-gray-400 text-sm">
                      {searchQuery ? `No users found for "${searchQuery}"` : "No users in system."}
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u) => {
                    const category = getReasonCategory(u.status_reason);
                    const isExpanded = expandedReason === u.id;
                    const statusReasonsList = REASONS_FOR_STATUS[u.status];

                    return (
                      <tr key={u.id} className="hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[11px] flex-shrink-0">
                              {(u.full_name || u.email).charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white truncate max-w-[140px]">{u.full_name || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 truncate max-w-[180px]">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                            u.role === "admin" || u.role === "Admin"
                              ? "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border w-fit ${getStatusBadge(u.status)}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(u.status)}`}></span>
                              {u.status}
                            </span>
                            {u.status !== "active" && u.status !== "pending" && u.status_reason && (
                              <button
                                onClick={() => setExpandedReason(isExpanded ? null : u.id)}
                                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors w-fit"
                              >
                                <span className={`material-symbols-outlined text-[12px] transition-transform ${isExpanded ? "rotate-90" : ""}`}>chevron_right</span>
                                <span className="truncate max-w-[150px]">{category ? `${category}: ${u.status_reason}` : u.status_reason}</span>
                              </button>
                            )}
                            {isExpanded && (
                              <div className="ml-4 mt-1 p-2 rounded-lg bg-gray-50 dark:bg-[#231e3d] border border-gray-200 dark:border-white/10 text-xs space-y-1">
                                {category && <p className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">{category}</p>}
                                <p className="text-gray-700 dark:text-gray-200">{u.status_reason}</p>
                                {statusReasonsList && Object.entries(statusReasonsList).map(
                                  ([cat, reasons]) =>
                                    reasons.includes(u.status_reason) ? (
                                      <div key={cat} className="pt-1 mt-1 border-t border-gray-200 dark:border-white/10">
                                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">All {cat} reasons:</p>
                                        <ul className="space-y-0.5">
                                          {reasons.map((r) => (
                                            <li key={r} className={`flex items-center gap-1 ${r === u.status_reason ? "text-orange-600 dark:text-orange-400 font-semibold" : "text-gray-400"}`}>
                                              <span className="material-symbols-outlined text-[10px]">{r === u.status_reason ? "radio_button_checked" : "radio_button_unchecked"}</span>
                                              {r}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    ) : null
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            {u.status === "active" && u.role !== "admin" && u.role !== "Admin" && (
                              <>
                              <button disabled={actionLoading === u.id} onClick={() => openActionModal("suspend", u)} className="px-2 py-1 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded text-[11px] font-semibold disabled:opacity-50 transition-colors">Suspend</button>
                              <button disabled={actionLoading === u.id} onClick={() => openActionModal("terminate", u)} className="px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-[11px] font-semibold disabled:opacity-50 transition-colors">Terminate</button>
                              <button disabled={actionLoading === u.id} onClick={() => openActionModal("archive", u)} className="px-2 py-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded text-[11px] font-semibold disabled:opacity-50 transition-colors">Archive</button>
                              </>
                            )}
                            {u.status !== "active" && u.status !== "pending" && (
                              <button disabled={actionLoading === u.id} onClick={() => openActivateModal(u)} className="px-2 py-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded text-[11px] font-semibold disabled:opacity-50 transition-colors">Activate</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Tablet Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-[#1f1b35]/50">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Show</span>
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="h-7 px-2 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#231e3d] text-xs text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer"
              >
                {ROWS_PER_PAGE_OPTIONS.map((n) => (<option key={n} value={n}>{n}</option>))}
              </select>
              <span>{totalUsers === 0 ? "0 users" : `${startIndex + 1}–${endIndex} of ${totalUsers}`}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => goToPage(safeCurrentPage - 1)} disabled={safeCurrentPage <= 1} className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              {getPageNumbers().map((page) => (
                <button key={page} onClick={() => goToPage(page)} className={`w-7 h-7 rounded flex items-center justify-center text-xs font-medium transition-colors ${page === safeCurrentPage ? "bg-primary text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"}`}>{page}</button>
              ))}
              <button onClick={() => goToPage(safeCurrentPage + 1)} disabled={safeCurrentPage >= totalPages} className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        <div className="md:hidden">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {totalUsers === 0 ? "0 users" : `${startIndex + 1}–${endIndex} of ${totalUsers}`}
            </span>
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="h-7 px-2 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#231e3d] text-xs text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer"
            >
              {ROWS_PER_PAGE_OPTIONS.map((n) => (<option key={n} value={n}>{n} / page</option>))}
            </select>
          </div>

          <div className="space-y-2.5">
            {paginatedUsers.length === 0 ? (
              <div className="bg-white dark:bg-[#1a162e] rounded-xl border border-gray-200 dark:border-white/10 p-10 text-center">
                <span className="material-symbols-outlined text-3xl text-gray-300 dark:text-gray-600 block mb-1.5">group_off</span>
                <p className="text-gray-400 text-sm">{searchQuery ? `No users found for "${searchQuery}"` : "No users in system."}</p>
              </div>
            ) : (
              paginatedUsers.map((u) => {
                const category = getReasonCategory(u.status_reason);
                const isExpanded = expandedReason === u.id;
                const statusReasonsList = REASONS_FOR_STATUS[u.status];

                return (
                  <div key={u.id} className="bg-white dark:bg-[#1a162e] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
                    {/* Card body */}
                    <div className="px-4 py-3.5 space-y-3">
                      {/* Row 1: Avatar + Name + Status */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                          {(u.full_name || u.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{u.full_name || "—"}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{u.email}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border flex-shrink-0 ${getStatusBadge(u.status)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(u.status)}`}></span>
                          {u.status}
                        </span>
                      </div>

                      {/* Row 2: Role */}
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          u.role === "admin" || u.role === "Admin"
                            ? "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300"
                        }`}>
                          <span className="material-symbols-outlined text-[12px]">
                            {u.role === "admin" || u.role === "Admin" ? "admin_panel_settings" : "person"}
                          </span>
                          {u.role}
                        </span>
                      </div>

                      {/* Row 3: Status reason */}
                      {u.status !== "active" && u.status !== "pending" && u.status_reason && (
                        <div>
                          <button
                            onClick={() => setExpandedReason(isExpanded ? null : u.id)}
                            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          >
                            <span className={`material-symbols-outlined text-[14px] transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}>chevron_right</span>
                            <span className="truncate">{category ? `${category}: ${u.status_reason}` : u.status_reason}</span>
                          </button>
                          {isExpanded && (
                            <div className="ml-5 mt-2 p-2.5 rounded-lg bg-gray-50 dark:bg-[#231e3d] border border-gray-200 dark:border-white/10 text-xs space-y-1">
                              {category && <p className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">{category}</p>}
                              <p className="text-gray-700 dark:text-gray-200">{u.status_reason}</p>
                              {statusReasonsList && Object.entries(statusReasonsList).map(
                                ([cat, reasons]) =>
                                  reasons.includes(u.status_reason) ? (
                                    <div key={cat} className="pt-1 mt-1 border-t border-gray-200 dark:border-white/10">
                                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">All {cat} reasons:</p>
                                      <ul className="space-y-0.5">
                                        {reasons.map((r) => (
                                          <li key={r} className={`flex items-center gap-1 ${r === u.status_reason ? "text-orange-600 dark:text-orange-400 font-semibold" : "text-gray-400"}`}>
                                            <span className="material-symbols-outlined text-[10px]">{r === u.status_reason ? "radio_button_checked" : "radio_button_unchecked"}</span>
                                            {r}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : null
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-50/80 dark:bg-[#1f1b35]/50 border-t border-gray-100 dark:border-white/5">
                      {u.status === "active" && u.role !== "admin" && u.role !== "Admin" && (
                        <>
                          <button disabled={actionLoading === u.id} onClick={() => openActionModal("suspend", u)} className="flex-1 py-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors text-center">Suspend</button>
                          <button disabled={actionLoading === u.id} onClick={() => openActionModal("terminate", u)} className="flex-1 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors text-center">Terminate</button>
                          <button disabled={actionLoading === u.id} onClick={() => openActionModal("archive", u)} className="flex-1 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors text-center">Archive</button>
                        </>
                      )}
                      {u.status !== "active" && u.status !== "pending" && (
                        <button disabled={actionLoading === u.id} onClick={() => openActivateModal(u)} className="flex-1 py-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors text-center">Activate</button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Mobile Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 bg-white dark:bg-[#1a162e] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => goToPage(safeCurrentPage - 1)}
                  disabled={safeCurrentPage <= 1}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  Prev
                </button>

                <div className="flex items-center gap-1 overflow-x-auto">
                  {getPageNumbers().map((page) => (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`min-w-[32px] h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-colors ${
                        page === safeCurrentPage
                          ? "bg-primary text-white shadow-sm"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => goToPage(safeCurrentPage + 1)}
                  disabled={safeCurrentPage >= totalPages}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ACTION MODAL (Suspend / Terminate / Archive) */}
      {showModal && modalUser && currentConfig && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) closeActionModal(); }}>
          <div className="bg-white dark:bg-[#1a162e] w-full sm:max-w-lg shadow-2xl overflow-hidden sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            {/* Modal Header */}
            <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className={`flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${currentConfig.iconBg} flex items-center justify-center`}>
                  <span className={`material-symbols-outlined ${currentConfig.iconColor} text-xl sm:text-2xl`}>{currentConfig.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{currentConfig.title}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">This action will change the user's access immediately.</p>
                </div>
                <button onClick={closeActionModal} className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-gray-400 text-xl">close</span>
                </button>
              </div>
            </div>

            {/* User Info */}
            <div className="mx-5 sm:mx-6 mt-4 px-4 py-3 bg-gray-50 dark:bg-[#231e3d] rounded-xl border border-gray-200 dark:border-gray-600/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                  {(modalUser.full_name || modalUser.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{modalUser.full_name || "—"}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{modalUser.email}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border flex-shrink-0 ${getStatusBadge(modalUser.status)}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(modalUser.status)}`}></span>
                  {modalUser.status}
                </span>
              </div>
            </div>

            {/* Form */}
            <div className="px-5 sm:px-6 py-5 space-y-4">
              {modalError && (
                <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">error</span>
                    {modalError}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {currentConfig.categoryPlaceholder} <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#231e3d] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
                >
                  <option value="">Choose a category...</option>
                  {currentCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {selectedCategory && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Reason <span className="text-red-500">*</span></label>
                  <select
                    value={selectedReason}
                    onChange={handleReasonChange}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#231e3d] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
                  >
                    <option value="">Select a reason...</option>
                    {currentReasons.map((reason) => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                    <option value="other" className="font-semibold">Other</option>
                  </select>
                </div>
              )}

              {selectedReason === "other" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Custom Reason <span className="text-red-500">*</span></label>
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter the reason..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#231e3d] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                  />
                </div>
              )}

              {selectedReason && selectedReason !== "other" && (
                <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-0.5 font-medium">Selected Reason</p>
                  <p className="text-sm text-blue-800 dark:text-blue-300">{selectedReason}</p>
                </div>
              )}

              {selectedReason === "other" && customReason.trim() && (
                <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-0.5 font-medium">Custom Reason</p>
                  <p className="text-sm text-blue-800 dark:text-blue-300">{customReason.trim()}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/80 dark:bg-[#1f1b35]/50">
              <button type="button" onClick={closeActionModal} disabled={modalSubmitting} className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors">Cancel</button>
              <button
                type="button"
                onClick={handleModalSubmit}
                disabled={modalSubmitting}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors ${currentConfig.confirmButtonClass}`}
              >
                {modalSubmitting ? (
                  <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Processing...</>
                ) : (
                  <><span className="material-symbols-outlined text-lg">{currentConfig.icon}</span>{currentConfig.confirmButtonText}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVATE MODAL */}
      {showActivateModal && activateUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) closeActivateModal(); }}>
          <div className="bg-white dark:bg-[#1a162e] w-full sm:max-w-md shadow-2xl overflow-hidden sm:rounded-2xl rounded-t-2xl border dark:border-white/10 animate-slide-up">
            <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-xl">check_circle</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Activate User</h2>
                </div>
                <button onClick={closeActivateModal} className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-gray-400 text-xl">close</span>
                </button>
              </div>
            </div>

            <div className="px-5 sm:px-6 py-5">
              <div className="p-4 bg-gray-50 dark:bg-[#231e3d] rounded-xl border border-gray-200 dark:border-gray-600/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {(activateUser.full_name || activateUser.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{activateUser.full_name || "—"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{activateUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600/50 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${getStatusBadge(activateUser.status)}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(activateUser.status)}`}></span>
                    {activateUser.status}
                  </span>
                  <span className="material-symbols-outlined text-gray-400 text-lg">arrow_forward</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    active
                  </span>
                  {activateUser.status_reason && (
                    <p className="w-full text-[10px] text-gray-400 italic mt-1">Status reason will be cleared upon activation.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/80 dark:bg-[#1f1b35]/50">
              <button type="button" onClick={closeActivateModal} disabled={activateSubmitting} className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors">Cancel</button>
              <button
                onClick={handleActivateSubmit}
                disabled={activateSubmitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition disabled:opacity-50"
              >
                {activateSubmitting ? (
                  <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Activating...</>
                ) : (
                  <><span className="material-symbols-outlined text-lg">how_to_reg</span>Confirm Activation</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}