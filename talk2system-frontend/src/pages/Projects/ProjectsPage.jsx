import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { fetchMyProjects, sendJoinRequest, fetchProjects, requestLeaveProject } from "../../api/projectApi";
import { isAdmin, getCurrentUser } from "../../api/authApi";
import { useTranslation } from "../../hooks/useTranslation";

const STATUS_LABELS = {
  in_progress:      "In Progress",
  pending_approval: "Pending approval",
  suspended:        "Suspended",
  completed:        "Completed",
};

const normalizeStatus = (status) => {
  const s = status?.trim().toLowerCase().replace(/\s+/g, "_");
  return s === "active" ? "in_progress" : s;
};

const formatStatus = (status) => {
  if (!status) return "";
  const key = normalizeStatus(status);
  return STATUS_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [myProjects, setMyProjects]   = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const { t } = useTranslation();

  const currentUser = getCurrentUser();
  const isSuspended = currentUser?.status === "suspended";
  const [showSuspendedPopup, setShowSuspendedPopup] = useState(false);

  // Join modal
  const [showJoinModal, setShowJoinModal]   = useState(false);
  const [joinProjectId, setJoinProjectId]   = useState("");
  const [joinLoading, setJoinLoading]       = useState(false);
  const [joinError, setJoinError]           = useState("");
  const [joinSuccess, setJoinSuccess]       = useState("");

  // Leave modal
  const [leaveModal, setLeaveModal] = useState({ show: false, project: null });
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PROJECTS_PER_PAGE = 6;

  // Filters
  const [searchQuery, setSearchQuery]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter]     = useState("all");
  const [domainFilter, setDomainFilter] = useState("all");
  const [sortOrder, setSortOrder]       = useState("newest");

  // Date filter
  const [dateMode, setDateMode]     = useState("none"); // "none" | "preset" | "month_year" | "range"
  const [datePreset, setDatePreset] = useState("");
  const [dateMonth, setDateMonth]   = useState("");
  const [dateYear, setDateYear]     = useState("");
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");

  const [viewMode, setViewMode] = useState(() => localStorage.getItem("projects_view") || "grid");
  const setView = (mode) => { setViewMode(mode); localStorage.setItem("projects_view", mode); };

  useEffect(() => {
    Promise.all([fetchMyProjects(), fetchProjects()])
      .then(([mine, all]) => {
        setMyProjects(mine);
        setAllProjects(all);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const myProjectIds  = new Set(myProjects.map((p) => p.id));
  const joinableProjects = allProjects.filter((p) => !myProjectIds.has(p.id));
  const selectedProject = joinableProjects.find((p) => String(p.id) === joinProjectId);

  const uniqueStatuses = useMemo(() => {
    const statuses = myProjects.map((p) => normalizeStatus(p.project_status)).filter(Boolean);
    return [...new Set(statuses)];
  }, [myProjects]);

  const uniqueDomains = useMemo(() => {
    const domains = myProjects.map((p) => p.domain?.trim().toLowerCase()).filter(Boolean);
    return [...new Set(domains)].sort();
  }, [myProjects]);

  const uniqueYears = useMemo(() => {
    const years = myProjects.map((p) => new Date(p.created_at).getFullYear());
    return [...new Set(years)].sort((a, b) => b - a);
  }, [myProjects]);

  const filteredProjects = useMemo(() => {
    let result = myProjects;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") result = result.filter((p) => normalizeStatus(p.project_status) === statusFilter);
    if (roleFilter !== "all")   result = result.filter((p) => p.user_role === roleFilter);
    if (domainFilter !== "all") result = result.filter((p) => p.domain?.trim().toLowerCase() === domainFilter);

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
      if (cutoff) result = result.filter((p) => new Date(p.created_at) >= cutoff);
    }
    if (dateMode === "month_year") {
      if (dateMonth) result = result.filter((p) => new Date(p.created_at).getMonth() + 1 === Number(dateMonth));
      if (dateYear)  result = result.filter((p) => new Date(p.created_at).getFullYear() === Number(dateYear));
    }
    if (dateMode === "range") {
      if (dateFrom) result = result.filter((p) => new Date(p.created_at) >= new Date(dateFrom));
      if (dateTo)   result = result.filter((p) => new Date(p.created_at) <= new Date(dateTo + "T23:59:59"));
    }

    return [...result].sort((a, b) => {
      const diff = new Date(b.created_at) - new Date(a.created_at);
      return sortOrder === "newest" ? diff : -diff;
    });
  }, [myProjects, searchQuery, statusFilter, roleFilter, domainFilter, sortOrder, dateMode, datePreset, dateMonth, dateYear, dateFrom, dateTo]);

  const hasActiveDateFilter = dateMode !== "none" && (
    (dateMode === "preset" && datePreset) ||
    (dateMode === "month_year" && (dateMonth || dateYear)) ||
    (dateMode === "range" && (dateFrom || dateTo))
  );
  const hasActiveFilters = searchQuery || statusFilter !== "all" || roleFilter !== "all" || domainFilter !== "all" || hasActiveDateFilter;

  const clearDateFilter = () => { setDateMode("none"); setDatePreset(""); setDateMonth(""); setDateYear(""); setDateFrom(""); setDateTo(""); };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setRoleFilter("all");
    setDomainFilter("all");
    setSortOrder("newest");
    clearDateFilter();
    setCurrentPage(1);
  };

  const totalProjectPages = Math.max(1, Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalProjectPages);
  const paginatedProjects = filteredProjects.slice(
    (safeCurrentPage - 1) * PROJECTS_PER_PAGE,
    safeCurrentPage * PROJECTS_PER_PAGE
  );

  const getProjectPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, safeCurrentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalProjectPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const goToProjectPage = (page) => {
    if (page < 1 || page > totalProjectPages) return;
    setCurrentPage(page);
  };

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, roleFilter, domainFilter, sortOrder, dateMode, datePreset, dateMonth, dateYear, dateFrom, dateTo]);

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    setJoinError("");
    setJoinSuccess("");
    if (!joinProjectId) { setJoinError(t("pleaseSelectProject")); return; }
    setJoinLoading(true);
    try {
      const domainToSend = selectedProject?.domain || "";
      await sendJoinRequest(Number(joinProjectId), domainToSend);
      setJoinSuccess(t("joinRequestSent"));
      setJoinProjectId("");
      setTimeout(() => { setShowJoinModal(false); setJoinSuccess(""); }, 2000);
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLeaveClick = (e, project) => {
    e.stopPropagation();
    setLeaveError("");
    setLeaveModal({ show: true, project });
  };

  const handleLeaveConfirm = async () => {
    const { project } = leaveModal;
    setLeaveLoading(true);
    setLeaveError("");
    try {
      await requestLeaveProject(project.id);
      // Mark project as having a pending leave request
      setMyProjects((prev) =>
        prev.map((p) => p.id === project.id ? { ...p, has_pending_leave_request: true } : p)
      );
      setLeaveModal({ show: false, project: null });
    } catch (err) {
      setLeaveError(err.message);
    } finally {
      setLeaveLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen font-display bg-background-light dark:bg-background-dark">
      <div className="flex flex-1 flex-col w-full">
        <main className="flex-1 p-8 overflow-y-auto">

          {/* HEADER */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <h2 className="text-4xl font-black text-[#1F2937] dark:text-white">
              {t("myProjects")}
            </h2>
            {!isSuspended ? (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="flex items-center gap-2 h-10 px-5 rounded-lg border border-primary text-primary font-bold hover:bg-primary/5 transition"
                >
                  <span className="material-symbols-outlined">login</span>
                  {t("joinProject")}
                </button>

                <button
                  onClick={() => navigate(isAdmin() ? "/projects/new-admin" : "/projects/new")}
                  className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-white font-bold"
                >
                  <span className="material-symbols-outlined">add</span>
                  {t("createNewProject")}
                </button>
              </div>
            ) : (
              <div className="h-10"></div>
            )}
          </div>

          {error && <p className="text-red-500 mb-4">{error}</p>}

          {/* FILTERS BAR */}
          {!loading && myProjects.length > 0 && (
            <div className="mb-6 bg-white dark:bg-[#1C192B] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm p-4">

              {/* Search */}
              <div className="relative mb-3">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">search</span>
                <input
                  type="text"
                  placeholder="Search projects by name…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-10 rounded-lg bg-gray-50 dark:bg-[#100d1c] border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}
              </div>

              {/* Filter chips */}
              <div className="flex flex-wrap items-center gap-2">

                <FilterChip
                  icon="radio_button_checked"
                  active={statusFilter !== "all"}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "all", label: "Status" },
                    ...uniqueStatuses.map((s) => ({
                      value: s,
                      label: STATUS_LABELS[s] ?? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                    })),
                  ]}
                />

                <FilterChip
                  icon="badge"
                  active={roleFilter !== "all"}
                  value={roleFilter}
                  onChange={setRoleFilter}
                  options={[
                    { value: "all",             label: "Role" },
                    { value: "project_manager", label: "Project Manager" },
                    { value: "participant",      label: "Participant" },
                  ]}
                />

                {uniqueDomains.length > 0 && (
                  <FilterChip
                    icon="category"
                    active={domainFilter !== "all"}
                    value={domainFilter}
                    onChange={setDomainFilter}
                    options={[
                      { value: "all", label: "Domain" },
                      ...uniqueDomains.map((d) => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) })),
                    ]}
                  />
                )}

                {/* Date toggle chip */}
                <button
                  onClick={() => dateMode === "none" ? setDateMode("preset") : clearDateFilter()}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-semibold transition-all ${
                    dateMode !== "none"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#100d1c] text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                  Date
                </button>

                <div className="ml-auto flex items-center gap-3">
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-xs font-semibold text-primary hover:text-primary/70 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-medium tabular-nums">
                    {filteredProjects.length} / {myProjects.length}
                  </span>
                </div>

              </div>

              {/* DATE FILTER PANEL */}
              {dateMode !== "none" && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5">

                  {/* Mode tabs */}
                  <div className="flex gap-1 mb-4 p-1 bg-gray-100 dark:bg-[#100d1c] rounded-lg w-fit">
                    {[
                      { id: "preset",     label: "Quick",       icon: "bolt" },
                      { id: "month_year", label: "Month / Year", icon: "calendar_view_month" },
                      { id: "range",      label: "Date range",  icon: "date_range" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => { setDateMode(tab.id); setDatePreset(""); setDateMonth(""); setDateYear(""); setDateFrom(""); setDateTo(""); }}
                        className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-semibold transition-all ${
                          dateMode === tab.id
                            ? "bg-white dark:bg-[#1C192B] text-primary shadow-sm"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">{tab.icon}</span>
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Quick presets */}
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
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-primary/40 hover:text-primary"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Month + Year pills */}
                  {dateMode === "month_year" && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Month</p>
                        <div className="flex flex-wrap gap-1.5">
                          {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                            <button
                              key={i + 1}
                              onClick={() => setDateMonth(dateMonth === String(i + 1) ? "" : String(i + 1))}
                              className={`h-8 w-12 rounded-lg text-xs font-semibold border transition-all ${
                                dateMonth === String(i + 1)
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-primary/40 hover:text-primary"
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
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-primary/40 hover:text-primary"
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

                  {/* Custom date range */}
                  {dateMode === "range" && (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">From</span>
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="h-8 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#100d1c] text-xs text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                        />
                      </div>
                      <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-[18px]">arrow_forward</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">To</span>
                        <input
                          type="date"
                          value={dateTo}
                          min={dateFrom || undefined}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="h-8 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#100d1c] text-xs text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

          {loading ? (
            <p className="text-gray-400">{t("loading")}</p>
          ) : myProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="material-symbols-outlined text-7xl text-primary mb-4">
                add_circle
              </span>
              <h3 className="text-3xl font-black mb-3">{t("noProjectsYet")}</h3>
              <p className="text-gray-500 mb-6">
                {t("createOrJoinDesc")}
              </p>
              {!isSuspended ? (
                <div className="flex gap-4">
                  <button
                    onClick={() => navigate(isAdmin() ? "/projects/new-admin" : "/projects/new")}
                    className="flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-white font-bold shadow-lg hover:bg-primary/90 transition"
                  >
                    <span className="material-symbols-outlined">add</span>
                    {t("createProject")}
                  </button>

                  <button onClick={() => setShowJoinModal(true)} className="flex items-center gap-2 h-10 px-5 rounded-lg border border-primary text-primary font-bold hover:bg-primary/5 transition">
                    <span className="material-symbols-outlined">login</span>
                    {t("joinProject")}
                  </button>
                </div>
              ) : (
                <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-2 font-medium">
                  Your account is suspended. You cannot create or join projects.
                </p>
              )}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">search_off</span>
              <h3 className="text-xl font-black text-gray-700 dark:text-gray-200 mb-2">No projects match your filters</h3>
              <p className="text-gray-400 dark:text-gray-500 text-sm mb-5">Try adjusting your search or filters.</p>
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
                Clear filters
              </button>
            </div>
          ) : (
            <>
              {/* View toggle */}
              <div className="flex items-center justify-end mb-4">
                <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-[#100d1c] rounded-lg">
                  {[
                    { mode: "grid", icon: "grid_view", title: "Grid view" },
                    { mode: "list", icon: "view_list", title: "List view" },
                  ].map(({ mode, icon, title }) => (
                    <button
                      key={mode}
                      onClick={() => setView(mode)}
                      title={title}
                      className={`w-8 h-7 flex items-center justify-center rounded-md transition-all ${
                        viewMode === mode
                          ? "bg-white dark:bg-[#1C192B] text-primary shadow-sm"
                          : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-200"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={
                viewMode === "list"
                  ? "flex flex-col gap-2"
                  : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
              }>
                {paginatedProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isSuspended={isSuspended}
                    viewMode={viewMode}
                    onNavigate={() => {
                      if (isSuspended) {
                        setShowSuspendedPopup(true);
                        return;
                      }
                      navigate(`/projects/${project.id}`);
                    }}
                    onLeave={(e) => handleLeaveClick(e, project)}
                    t={t}
                  />
                ))}
              </div>

              {totalProjectPages > 1 && (
                <div className="flex items-center justify-between mt-6 px-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {(safeCurrentPage - 1) * PROJECTS_PER_PAGE + 1}–{Math.min(safeCurrentPage * PROJECTS_PER_PAGE, filteredProjects.length)} of {filteredProjects.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => goToProjectPage(safeCurrentPage - 1)}
                      disabled={safeCurrentPage <= 1}
                      className="w-8 h-8 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                    </button>

                    {safeCurrentPage > 3 && totalProjectPages > 5 && (
                      <>
                        <button onClick={() => goToProjectPage(1)} className="w-8 h-8 rounded-md flex items-center justify-center text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">1</button>
                        <span className="w-8 h-8 flex items-center justify-center text-gray-400 text-xs">...</span>
                      </>
                    )}

                    {getProjectPageNumbers().map((page) => (
                      <button
                        key={page}
                        onClick={() => goToProjectPage(page)}
                        className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-medium transition-colors ${
                          page === safeCurrentPage
                            ? "bg-primary text-white shadow-sm"
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    {safeCurrentPage < totalProjectPages - 2 && totalProjectPages > 5 && (
                      <>
                        <span className="w-8 h-8 flex items-center justify-center text-gray-400 text-xs">...</span>
                        <button onClick={() => goToProjectPage(totalProjectPages)} className="w-8 h-8 rounded-md flex items-center justify-center text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">{totalProjectPages}</button>
                      </>
                    )}

                    <button
                      onClick={() => goToProjectPage(safeCurrentPage + 1)}
                      disabled={safeCurrentPage >= totalProjectPages}
                      className="w-8 h-8 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </main>
      </div>

      {/* JOIN MODAL */}
      {showJoinModal && !isSuspended && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a162e] rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-black mb-1 text-[#100d1c] dark:text-white">
              {t("requestToJoin")}
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              {t("selectProjectToJoin")}
            </p>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              {joinError && (
                <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                  {joinError}
                </p>
              )}
              {joinSuccess && (
                <p className="text-emerald-600 text-sm bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
                  {joinSuccess}
                </p>
              )}

              <div>
                <label className="block text-sm font-bold mb-1">{t("project")}</label>
                <select
                  value={joinProjectId}
                  onChange={(e) => setJoinProjectId(e.target.value)}
                  required
                  className="w-full h-11 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm"
                >
                  <option value="">{t("selectAProject")}</option>
                  {joinableProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProject?.domain && (
                <p className="text-sm text-gray-500">
                  {t("domain")}: <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedProject.domain}</span>
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowJoinModal(false); setJoinError(""); }}
                  className="px-4 py-2 rounded-lg border dark:border-gray-600 text-sm font-semibold"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={joinLoading}
                  className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-60"
                >
                  {joinLoading ? t("sending") : t("sendRequest")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAVE CONFIRMATION MODAL */}
      {leaveModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-[#1a162e] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-red-50 dark:bg-red-900/20 px-8 pt-8 pb-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 mb-4">
                <span className="material-symbols-outlined text-red-500 text-3xl">exit_to_app</span>
              </div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1">
                Leave Project
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                {leaveModal.project?.name}
              </p>
            </div>

            <div className="px-8 py-6 space-y-4">
              {leaveModal.project?.user_role === "project_manager" ? (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <span className="material-symbols-outlined text-amber-500 text-xl flex-shrink-0 mt-0.5">warning</span>
                  <div>
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">
                      You are the Project Manager
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-300">
                      This will <strong>suspend the project</strong> and send a leave request to the admin. The project resumes once a new PM is assigned.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Your leave request will be sent to the <strong>Project Manager</strong> for approval. You will remain a member until the PM approves your request.
                </p>
              )}

              {leaveError && (
                <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                  {leaveError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setLeaveModal({ show: false, project: null }); setLeaveError(""); }}
                  disabled={leaveLoading}
                  className="flex-1 h-11 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLeaveConfirm}
                  disabled={leaveLoading}
                  className="flex-1 h-11 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition disabled:opacity-60"
                >
                  {leaveLoading ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUSPENDED ACCOUNT POPUP */}
      {showSuspendedPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-[#1a162e] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 px-8 pt-8 pb-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/40 mb-4">
                <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-3xl">lock_person</span>
              </div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                Access Restricted
              </h2>
            </div>

            <div className="px-8 py-6">
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
                You cannot view project details because your account has been
                <span className="font-bold text-yellow-600 dark:text-yellow-400"> temporarily suspended</span>.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSuspendedPopup(false)}
                  className="flex-1 h-11 px-4 rounded-xl bg-primary hover:opacity-90 text-white text-sm font-bold transition"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    setShowSuspendedPopup(false);
                    navigate("/help/account-status");
                  }}
                  className="flex-1 h-11 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Get Help
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ icon, active, value, onChange, options }) {
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  return (
    <div className={`inline-flex items-center h-8 rounded-full border text-xs font-semibold transition-all ${
      active
        ? "border-primary bg-primary/10 text-primary"
        : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#100d1c] text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20"
    }`}>
      <span className="material-symbols-outlined pl-2.5 text-[14px] pointer-events-none select-none">{icon}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full pl-1.5 pr-5 bg-transparent border-0 outline-none cursor-pointer text-xs font-semibold text-inherit"
        style={{ width: `${selectedLabel.length + 4}ch` }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function ProjectCard({ project, isSuspended, viewMode = "grid", onNavigate, onLeave, t }) {
  const isProjectSuspended = normalizeStatus(project.project_status) === "suspended";
  const hasPendingLeave = project.has_pending_leave_request;

  const leaveBtn = hasPendingLeave ? (
    <span title="Leave request pending" className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed">
      <span className="material-symbols-outlined text-base">hourglass_empty</span>
    </span>
  ) : (
    <button onClick={onLeave} title="Leave project" className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20 text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-500 transition-colors">
      <span className="material-symbols-outlined text-base">exit_to_app</span>
    </button>
  );

  const statusBadge = (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
      isProjectSuspended
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    }`}>
      {formatStatus(project.project_status)}
    </span>
  );

  const roleBadge = project.user_role === "project_manager" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary flex-shrink-0">
      <span className="material-symbols-outlined text-xs">badge</span>
      PM
    </span>
  ) : null;

  /* ── List view ─────────────────────────────────────────── */
  if (viewMode === "list") {
    return (
      <div
        onClick={onNavigate}
        className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border transition-all ${
          isSuspended ? "cursor-not-allowed opacity-80" : "cursor-pointer hover:shadow-md"
        } bg-white dark:bg-[#1C192B] border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10`}
      >
        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${isProjectSuspended ? "bg-amber-400" : "bg-green-400"}`} />

        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 dark:text-white truncate">{project.name}</p>
          {project.domain && (
            <span className="text-xs text-primary font-medium">{project.domain}</span>
          )}
        </div>

        <div className="hidden sm:block">{statusBadge}</div>
        <div className="hidden md:block">{roleBadge}</div>

        <p className="hidden lg:flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
          <span className="material-symbols-outlined text-sm">calendar_today</span>
          {new Date(project.created_at).toLocaleDateString()}
        </p>

        <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">{leaveBtn}</div>
      </div>
    );
  }

  /* ── Grid view (default) ───────────────────────────────── */
  return (
    <div
      onClick={onNavigate}
      className={`flex flex-col rounded-xl shadow bg-white dark:bg-[#1C192B] hover:shadow-lg hover:-translate-y-1 transition-all ${
        isSuspended ? "cursor-not-allowed opacity-80" : "cursor-pointer"
      }`}
    >
      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold">{project.name}</p>
          <div className="flex items-center gap-1.5">
            {isSuspended && (
              <span className="material-symbols-outlined text-yellow-500 text-lg">lock</span>
            )}
            {isProjectSuspended && !isSuspended && (
              <span className="material-symbols-outlined text-amber-500 text-lg" title="Project suspended">pause_circle</span>
            )}
          </div>
        </div>

        {project.domain && (
          <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full w-fit">
            {project.domain}
          </span>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {statusBadge}
          {roleBadge}
        </div>

        <div className="flex items-center justify-between mt-1">
          <p className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <span className="material-symbols-outlined text-sm">calendar_today</span>
            {t("created")} {new Date(project.created_at).toLocaleDateString()}
          </p>
          <div onClick={(e) => e.stopPropagation()}>{leaveBtn}</div>
        </div>
      </div>
    </div>
  );
}
