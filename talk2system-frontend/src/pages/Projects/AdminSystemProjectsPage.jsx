import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAdminProjects, adminDeleteProject, fetchAdminProjectMembers, adminChangePM, removeParticipant, fetchPendingPmLeaveRequests, approvePmLeaveRequest, rejectPmLeaveRequest } from "../../api/projectApi";

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

export default function AdminSystemProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [showModal, setShowModal] = useState(false);
  const [modalProject, setModalProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [newPmEmail, setNewPmEmail] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  // Search state for modal members
  const [memberSearch, setMemberSearch] = useState("");

  // PM leave requests
  const [pmLeaveRequests, setPmLeaveRequests] = useState([]);
  const [leaveRequestsLoading, setLeaveRequestsLoading] = useState(true);
  const [showLeavePanel, setShowLeavePanel] = useState(false);
  const [pmLeaveRejectModal, setPmLeaveRejectModal] = useState({ show: false, req: null, reason: "" });
  const [leaveActionMsg, setLeaveActionMsg] = useState({ text: "", type: "" });
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: "",
    message: "",
    icon: "help",
    iconBg: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-500",
    confirmText: "Confirm",
    confirmClass: "bg-red-600 hover:bg-red-700",
    onConfirm: null,
  });

  const [alertDialog, setAlertDialog] = useState({
    show: false,
    title: "Error",
    message: "",
    icon: "error",
    iconBg: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-500",
  });

  const showConfirm = useCallback((config) => {
    setConfirmDialog({ show: true, ...config });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmDialog((prev) => ({ ...prev, show: false, onConfirm: null }));
  }, []);

  const showAlert = useCallback((message, type = "error") => {
    const configs = {
      error: { icon: "error", iconBg: "bg-red-100 dark:bg-red-900/30", iconColor: "text-red-500", title: "Error" },
      success: { icon: "check_circle", iconBg: "bg-emerald-100 dark:bg-emerald-900/30", iconColor: "text-emerald-500", title: "Success" },
      warning: { icon: "warning", iconBg: "bg-amber-100 dark:bg-amber-900/30", iconColor: "text-amber-500", title: "Warning" },
    };
    const c = configs[type] || configs.error;
    setAlertDialog({ show: true, message, ...c });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertDialog((prev) => ({ ...prev, show: false }));
  }, []);

  useEffect(() => {
    loadProjects();
    loadPmLeaveRequests();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const loadPmLeaveRequests = async () => {
    try {
      const data = await fetchPendingPmLeaveRequests();
      setPmLeaveRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLeaveRequestsLoading(false);
    }
  };

  const handleApprovePmLeave = async (req) => {
    try {
      await approvePmLeaveRequest(req.id);
      setPmLeaveRequests((prev) => prev.filter((r) => r.id !== req.id));
      setLeaveActionMsg({ text: `${req.user_full_name || req.user_email}'s leave approved. Assign a new PM to resume the project.`, type: "success" });
      loadProjects();
      setTimeout(() => setLeaveActionMsg({ text: "", type: "" }), 5000);
    } catch (err) {
      setLeaveActionMsg({ text: err.message, type: "error" });
    }
  };

  const handleRejectPmLeave = async (req, reason) => {
    try {
      await rejectPmLeaveRequest(req.id, reason);
      setPmLeaveRequests((prev) => prev.filter((r) => r.id !== req.id));
      setPmLeaveRejectModal({ show: false, req: null, reason: "" });
      setLeaveActionMsg({ text: `Leave request from ${req.user_full_name || req.user_email} rejected. Project restored.`, type: "success" });
      loadProjects();
      setTimeout(() => setLeaveActionMsg({ text: "", type: "" }), 4000);
    } catch (err) {
      setLeaveActionMsg({ text: err.message, type: "error" });
    }
  };

  const loadProjects = async () => {
    try {
      const data = await fetchAdminProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id, name) => {
    showConfirm({
      title: "Delete Project",
      message: (
        <>
          Are you sure you want to delete{" "}
          <span className="font-bold text-gray-900 dark:text-white">"{name}"</span>?
          <br />
          <span className="text-red-500 dark:text-red-400 font-semibold text-xs mt-1 block">This action cannot be undone.</span>
        </>
      ),
      icon: "delete_forever",
      iconBg: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-500",
      confirmText: "Delete Project",
      confirmClass: "bg-red-600 hover:bg-red-700",
      onConfirm: async () => {
        closeConfirm();
        try {
          await adminDeleteProject(id);
          setProjects((prev) => prev.filter((p) => p.id !== id));
          if (showModal && modalProject?.id === id) setShowModal(false);
        } catch (err) {
          showAlert(err.message, "error");
        }
      },
    });
  };

  const openMemberModal = async (project) => {
    setModalProject(project);
    setModalError("");
    setModalSuccess("");
    setMemberSearch("");
    try {
      const data = await fetchAdminProjectMembers(project.id);
      setMembers(data);
      setShowModal(true);
    } catch (err) {
      showAlert(err.message, "error");
    }
  };

  const handleRemoveMember = (projectId, userId, email) => {
    showConfirm({
      title: "Remove Member",
      message: (
        <>
          Are you sure you want to remove{" "}
          <span className="font-bold text-gray-900 dark:text-white">{email}</span>{" "}
          from this project?
        </>
      ),
      icon: "person_remove",
      iconBg: "bg-orange-100 dark:bg-orange-900/30",
      iconColor: "text-orange-500",
      confirmText: "Remove Member",
      confirmClass: "bg-orange-600 hover:bg-orange-700",
      onConfirm: async () => {
        closeConfirm();
        try {
          await removeParticipant(projectId, userId);
          setMembers((prev) => prev.filter((m) => m.user_id !== userId));
        } catch (err) {
          setModalError(err.message);
        }
      },
    });
  };

  const handleChangePM = async (e) => {
    e.preventDefault();
    if (!newPmEmail) return;
    setModalError("");
    try {
      const data = await adminChangePM(modalProject.id, newPmEmail);
      setModalSuccess(data.message);
      setNewPmEmail("");
      const updatedMembers = await fetchAdminProjectMembers(modalProject.id);
      setMembers(updatedMembers);
      loadProjects();
      setTimeout(() => {
        setShowModal(false);
        setModalProject(null);
      }, 1500);
    } catch (err) {
      setModalError(err.message);
    }
  };

  const handleAddParticipant = () => {
    if (modalProject) {
      navigate(`/projects/${modalProject.id}/add-participant`);
    }
  };

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.domain && p.domain.toLowerCase().includes(query)) ||
        p.status.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  // Pagination math
  const totalProjects = filteredProjects.length;
  const totalPages = Math.max(1, Math.ceil(totalProjects / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalProjects);
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

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
  };

  // Filter members by search query
  const filteredMembers = members.filter((m) => {
    const query = memberSearch.toLowerCase();
    if (!query) return true;
    return (
      m.full_name?.toLowerCase().includes(query) ||
      m.email?.toLowerCase().includes(query)
    );
  });

  // Find the current PM from the members list
  const currentPM = members.find((m) => m.role === "project_manager");

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-400">Loading system projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
      {/* Top Bar */}
      <div className="bg-white dark:bg-[#1a162e] border-b border-gray-200 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-5 gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#100d1c] dark:text-white">System Projects</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{totalProjects} total projects</p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:w-72">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                <input
                  type="text"
                  placeholder="Search name, domain, status..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-10 pr-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-[#231e3d] text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-[#231e3d] transition-all outline-none"
                />
              </div>
              <button
                onClick={() => setShowLeavePanel(true)}
                className="relative h-9 px-4 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors whitespace-nowrap flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">exit_to_app</span>
                <span className="hidden sm:inline">PM Leave Requests</span>
                <span className="sm:hidden">Leave</span>
                {pmLeaveRequests.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {pmLeaveRequests.length}
                  </span>
                )}
              </button>
              <button onClick={() => navigate("/projects/new-admin")} className="h-9 px-4 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors whitespace-nowrap flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">add</span>
                Create New Project
              </button>
            </div>
          </div>
        </div>
      </div>

      {leaveActionMsg.text && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm ${
            leaveActionMsg.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
          }`}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">
                {leaveActionMsg.type === "success" ? "check_circle" : "error"}
              </span>
              {leaveActionMsg.text}
            </div>
            <button onClick={() => setLeaveActionMsg({ text: "", type: "" })} className="hover:opacity-70 transition-opacity">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        <div className="hidden lg:block bg-white dark:bg-[#1a162e] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-[#1f1b35]">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Project Name</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Domain</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {paginatedProjects.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-5 py-16 text-center">
                      <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 block mb-2">folder_off</span>
                      <p className="text-gray-400 dark:text-gray-500 text-sm">
                        {searchQuery ? `No projects found for "${searchQuery}"` : "No projects in the system."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedProjects.map((p) => {
                    const pmTerminated = p.pm_status === "terminated" || p.pm_status === "suspended" || p.pm_status === "archived";
                    const needsPm = p.status === "suspended" && !p.has_active_pm;

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors ${
                          needsPm
                            ? "bg-amber-50/70 dark:bg-amber-900/15"
                            : pmTerminated
                            ? "bg-red-50/50 dark:bg-red-900/10"
                            : ""
                        }`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            {needsPm && (
                              <span className="mt-0.5 flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 animate-pulse">
                                <span className="material-symbols-outlined text-white text-[14px]">priority_high</span>
                              </span>
                            )}
                            <div>
                              <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                              {needsPm && (
                                <span className="block text-xs text-amber-600 dark:text-amber-400 font-bold mt-1">
                                  Action required — no Project Manager assigned
                                </span>
                              )}
                              {pmTerminated && !needsPm && (
                                <span className="block text-xs text-red-500 font-bold mt-1">
                                  ⚠️ Project Manager is {p.pm_status}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{p.domain || "—"}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                            p.status === "suspended"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                              : p.status === "completed"
                              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              p.status === "suspended" ? "bg-amber-500"
                              : p.status === "completed" ? "bg-indigo-500"
                              : "bg-emerald-500"
                            }`}></span>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {needsPm ? (
                              <button
                                onClick={() => openMemberModal(p)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-xs font-semibold transition-colors shadow-sm"
                              >
                                <span className="material-symbols-outlined text-sm">manage_accounts</span>
                                Assign New PM
                              </button>
                            ) : pmTerminated ? (
                              <button
                                onClick={() => openMemberModal(p)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-xs font-semibold transition-colors"
                              >
                                <span className="material-symbols-outlined text-sm">swap_horiz</span>
                                Reassign PM
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => navigate(`/projects/${p.id}/add-participant`)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md text-xs font-semibold transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">person_add</span>
                                  Add Participant
                                </button>
                                <button
                                  onClick={() => openMemberModal(p)}
                                  className="px-2.5 py-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md text-xs font-semibold transition-colors"
                                >
                                  Manage Team
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDelete(p.id, p.name)}
                              className="px-2.5 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-xs font-semibold transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

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
                {totalProjects === 0 ? "0 projects" : `${startIndex + 1}–${endIndex} of ${totalProjects}`}
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

        {/* Tablet Table */}
        <div className="hidden md:block lg:hidden bg-white dark:bg-[#1a162e] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-[#1f1b35]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Domain</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {paginatedProjects.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-12 text-center text-gray-400 text-sm">
                      {searchQuery ? `No projects found for "${searchQuery}"` : "No projects in the system."}
                    </td>
                  </tr>
                ) : (
                  paginatedProjects.map((p) => {
                    const pmTerminated = p.pm_status === "terminated" || p.pm_status === "suspended" || p.pm_status === "archived";
                    const needsPm = p.status === "suspended" && !p.has_active_pm;

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors ${
                          needsPm ? "bg-amber-50/70 dark:bg-amber-900/15" : pmTerminated ? "bg-red-50/50 dark:bg-red-900/10" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2.5">
                            {needsPm && (
                              <span className="mt-0.5 flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 animate-pulse">
                                <span className="material-symbols-outlined text-white text-[12px]">priority_high</span>
                              </span>
                            )}
                            <div className="min-w-0">
                              <span className="font-medium text-gray-900 dark:text-white text-[13px] truncate block max-w-[160px]">{p.name}</span>
                              {needsPm && <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">No PM assigned</span>}
                              {pmTerminated && !needsPm && <span className="block text-[10px] text-red-500 font-bold mt-0.5">PM {p.pm_status}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-[13px]">{p.domain || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            p.status === "suspended"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                              : p.status === "completed"
                              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              p.status === "suspended" ? "bg-amber-500" : p.status === "completed" ? "bg-indigo-500" : "bg-emerald-500"
                            }`}></span>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            {needsPm ? (
                              <button onClick={() => openMemberModal(p)} className="px-2 py-1 bg-amber-500 text-white rounded text-[11px] font-semibold hover:bg-amber-600 transition-colors">Assign PM</button>
                            ) : pmTerminated ? (
                              <button onClick={() => openMemberModal(p)} className="px-2 py-1 bg-orange-500 text-white rounded text-[11px] font-semibold hover:bg-orange-600 transition-colors">Reassign</button>
                            ) : (
                              <>
                                <button onClick={() => navigate(`/projects/${p.id}/add-participant`)} className="px-2 py-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded text-[11px] font-semibold transition-colors">Add</button>
                                <button onClick={() => openMemberModal(p)} className="px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-[11px] font-semibold transition-colors">Team</button>
                              </>
                            )}
                            <button onClick={() => handleDelete(p.id, p.name)} className="px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-[11px] font-semibold transition-colors">Delete</button>
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
              <span>{totalProjects === 0 ? "0 projects" : `${startIndex + 1}–${endIndex} of ${totalProjects}`}</span>
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

        {/* Mobile Cards */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {totalProjects === 0 ? "0 projects" : `${startIndex + 1}–${endIndex} of ${totalProjects}`}
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
            {paginatedProjects.length === 0 ? (
              <div className="bg-white dark:bg-[#1a162e] rounded-xl border border-gray-200 dark:border-white/10 p-10 text-center">
                <span className="material-symbols-outlined text-3xl text-gray-300 dark:text-gray-600 block mb-1.5">folder_off</span>
                <p className="text-gray-400 text-sm">{searchQuery ? `No projects found for "${searchQuery}"` : "No projects in the system."}</p>
              </div>
            ) : (
              paginatedProjects.map((p) => {
                const pmTerminated = p.pm_status === "terminated" || p.pm_status === "suspended" || p.pm_status === "archived";
                const needsPm = p.status === "suspended" && !p.has_active_pm;

                return (
                  <div key={p.id} className={`bg-white dark:bg-[#1a162e] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden ${
                    needsPm ? "ring-1 ring-amber-400/50" : pmTerminated ? "ring-1 ring-red-400/30" : ""
                  }`}>
                    <div className="px-4 py-3.5 space-y-2.5">
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          needsPm ? "bg-amber-100 dark:bg-amber-900/30" : pmTerminated ? "bg-red-100 dark:bg-red-900/30" : "bg-primary/10"
                        }`}>
                          <span className={`material-symbols-outlined text-lg ${
                            needsPm ? "text-amber-500" : pmTerminated ? "text-red-500" : "text-primary"
                          }`}>
                            {needsPm ? "priority_high" : pmTerminated ? "warning" : "folder"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{p.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.domain || "No domain"}</p>
                          {needsPm && <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-1">Action required — no PM assigned</p>}
                          {pmTerminated && !needsPm && <p className="text-[11px] text-red-500 font-bold mt-1">⚠️ PM is {p.pm_status}</p>}
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border flex-shrink-0 ${
                          p.status === "suspended"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                            : p.status === "completed"
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            p.status === "suspended" ? "bg-amber-500" : p.status === "completed" ? "bg-indigo-500" : "bg-emerald-500"
                          }`}></span>
                          {p.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-50/80 dark:bg-[#1f1b35]/50 border-t border-gray-100 dark:border-white/5">
                      {needsPm ? (
                        <button onClick={() => openMemberModal(p)} className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition-colors text-center">Assign New PM</button>
                      ) : pmTerminated ? (
                        <button onClick={() => openMemberModal(p)} className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 transition-colors text-center">Reassign PM</button>
                      ) : (
                        <>
                          <button onClick={() => navigate(`/projects/${p.id}/add-participant`)} className="flex-1 py-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg text-xs font-semibold transition-colors text-center">Add Participant</button>
                          <button onClick={() => openMemberModal(p)} className="flex-1 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-xs font-semibold transition-colors text-center">Manage Team</button>
                        </>
                      )}
                      <button onClick={() => handleDelete(p.id, p.name)} className="py-2 px-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-xs font-semibold transition-colors">Delete</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

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

      {showLeavePanel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowLeavePanel(false); }}>
          <div className="bg-white dark:bg-[#1a162e] rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-white/10">
              <span className="material-symbols-outlined text-primary text-xl">exit_to_app</span>
              <div className="flex-1">
                <h2 className="text-base font-black text-gray-900 dark:text-white">PM Leave Requests</h2>
                <p className="text-xs text-gray-500">Project managers requesting to leave their projects</p>
              </div>
              {pmLeaveRequests.length > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {pmLeaveRequests.length} pending
                </span>
              )}
              <button onClick={() => setShowLeavePanel(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-2">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {leaveActionMsg.text && (
              <div className={`mx-6 mt-4 px-4 py-3 rounded-lg text-sm font-semibold border ${leaveActionMsg.type === "success" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"}`}>
                {leaveActionMsg.text}
              </div>
            )}

            <div className="p-6 space-y-3 overflow-y-auto">
              {leaveRequestsLoading ? (
                <p className="text-gray-400 text-sm text-center py-4">Loading...</p>
              ) : pmLeaveRequests.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No pending PM leave requests.</p>
              ) : (
                pmLeaveRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#231e3d] border border-gray-200 dark:border-white/10">
                    <div className="flex items-center gap-4">
                      <div
                        className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 flex-shrink-0"
                        style={{ backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(req.user_full_name || "PM")}&background=random&color=fff)` }}
                      />
                      <div>
                        <p className="font-bold text-sm text-gray-900 dark:text-white">{req.user_full_name || "Unknown PM"}</p>
                        <p className="text-xs text-gray-500">{req.user_email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="material-symbols-outlined text-amber-500 text-xs">folder</span>
                          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{req.project_name}</span>
                          <span className="text-xs text-gray-400">· {new Date(req.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprovePmLeave(req)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition"
                      >
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Approve
                      </button>
                      <button
                        onClick={() => setPmLeaveRejectModal({ show: true, req, reason: "" })}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-500 dark:text-red-400 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                      >
                        <span className="material-symbols-outlined text-sm">cancel</span>
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* PM LEAVE REJECT MODAL */}
      {pmLeaveRejectModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setPmLeaveRejectModal({ show: false, req: null, reason: "" }); }}>
          <div className="bg-white dark:bg-[#1a162e] rounded-xl w-full max-w-sm shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-500 text-xl">cancel</span>
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Reject PM Leave Request</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Rejecting leave request from <span className="font-bold text-gray-700 dark:text-gray-200">{pmLeaveRejectModal.req?.user_full_name || "this PM"}</span> for project <span className="font-bold text-primary">{pmLeaveRejectModal.req?.project_name}</span>. The project will be restored to active.
            </p>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Reason <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={pmLeaveRejectModal.reason}
              onChange={(e) => setPmLeaveRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g., No suitable replacement available at this time..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#231e3d] text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none mb-5"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPmLeaveRejectModal({ show: false, req: null, reason: "" })}
                className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectPmLeave(pmLeaveRejectModal.req, pmLeaveRejectModal.reason)}
                className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEMBERS MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white dark:bg-[#1a162e] rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-white/10">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">{modalProject?.name} - Team</h2>
                {modalProject?.pm_status === "terminated" && (
                  <p className="text-sm text-red-500 font-bold mt-1">
                    ⚠️ Manager is terminated. Please assign a new PM below.
                  </p>
                )}
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {modalError && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">{modalError}</p>}
              {modalSuccess && <p className="text-emerald-500 text-sm bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">{modalSuccess}</p>}

              {/* CURRENT PROJECT MANAGER INFO */}
              {currentPM && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/20">
                  <span className="material-symbols-outlined text-primary text-xl">badge</span>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      Current Manager: {currentPM.full_name || "Unknown"}
                    </p>
                    <p className="text-xs text-gray-500">{currentPM.email}</p>
                  </div>
                </div>
              )}

              {/* SEARCH BAR */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search members by name or email..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#231e3d] text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                />
              </div>

              <button
                onClick={handleAddParticipant}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 transition-colors"
              >
                <span className="material-symbols-outlined">person_add</span>
                Add New Participant
              </button>

              {/* FILTERED MEMBERS LIST */}
              {filteredMembers.length === 0 ? (
                <p className="text-gray-400 text-center py-10">
                  {memberSearch ? "No members match your search." : "No members found."}
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredMembers.map((m) => {
                    const isAdmin = m.role === "admin";  // Note: this is the system role, not project role
                    const isPM = m.role === "project_manager"; // project role
                    
                    return (
                      <div
                        key={m.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          isAdmin
                            ? "bg-red-50/50 dark:bg-red-900/10 border-red-200/50 dark:border-red-800/30 opacity-60"
                            : "bg-gray-50 dark:bg-[#231e3d] border-gray-200 dark:border-white/10 hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div
                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 flex-shrink-0"
                            style={{
                              backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name || m.email)}&background=random&color=fff)`
                            }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm text-gray-900 dark:text-white">
                                {m.full_name || "Unknown"}
                              </p>
                              {/* System role badge */}
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                m.user_status === "active"
                                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                              }`}>
                                {m.user_status}
                              </span>
                              {/* Project role badge */}
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isPM
                                  ? "bg-primary/10 text-primary"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                              }`}>
                                {isPM ? "PM" : "Participant"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{m.email}</p>
                          </div>
                        </div>
                        
                        {/* Actions - hide remove button for admins */}
                        <div className="flex items-center gap-1.5">
                          {isAdmin ? (
                            <span className="text-[10px] font-bold text-red-500 dark:text-red-400 px-2 py-1">
                              Cannot be PM
                            </span>
                          ) : (
                            <button
                              onClick={() => handleRemoveMember(modalProject.id, m.user_id, m.email)}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Remove member"
                            >
                              <span className="material-symbols-outlined text-[16px]">person_remove</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* CHANGE PM FORM */}
              <div className="border-t border-gray-200 dark:border-white/10 pt-4 mt-4">
                <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Assign new Project Manager:</p>
                <form onSubmit={handleChangePM} className="flex gap-2">
                  <input type="email" required placeholder="new-manager@example.com" value={newPmEmail} onChange={(e) => setNewPmEmail(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-[#231e3d] text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors">Change PM</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={(e) => { if (e.target === e.currentTarget) closeConfirm(); }}>
          <div className="bg-white dark:bg-[#1a162e] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-2">
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${confirmDialog.iconBg} flex items-center justify-center`}>
                  <span className={`material-symbols-outlined ${confirmDialog.iconColor} text-2xl`}>{confirmDialog.icon}</span>
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">{confirmDialog.title}</h3>
                </div>
              </div>
            </div>
            <div className="px-6 pb-2 pt-3">
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{confirmDialog.message}</p>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 bg-gray-50/80 dark:bg-[#1f1b35]/50 border-t border-gray-100 dark:border-white/5">
              <button
                onClick={closeConfirm}
                className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                }}
                className={`px-4 py-2.5 rounded-lg text-white text-sm font-bold transition shadow-sm ${confirmDialog.confirmClass}`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {alertDialog.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={(e) => { if (e.target === e.currentTarget) closeAlert(); }}>
          <div className="bg-white dark:bg-[#1a162e] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-2">
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${alertDialog.iconBg} flex items-center justify-center`}>
                  <span className={`material-symbols-outlined ${alertDialog.iconColor} text-2xl`}>{alertDialog.icon}</span>
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">{alertDialog.title}</h3>
                </div>
              </div>
            </div>
            <div className="px-6 pb-2 pt-3">
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{alertDialog.message}</p>
            </div>
            <div className="flex items-center justify-end px-6 py-4 bg-gray-50/80 dark:bg-[#1f1b35]/50 border-t border-gray-100 dark:border-white/5">
              <button
                onClick={closeAlert}
                className="px-5 py-2.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}