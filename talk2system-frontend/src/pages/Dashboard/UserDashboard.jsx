import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../api/authApi";
import { fetchUserDashboardStats } from "../../api/dashboardApi";

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, iconBg, label, value, sub, badge, bar, loading, onClick }) {
  const base =
    "bg-white dark:bg-[#1C192B] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col gap-3";
  const interactive = onClick ? "cursor-pointer hover:border-primary/40 dark:hover:border-primary/40 transition-colors" : "";

  return (
    <div className={`${base} ${interactive}`} onClick={onClick}>
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
        {badge && (
          <span className={`text-xs font-semibold px-2 py-1 rounded ${badge.className}`}>
            {badge.text}
          </span>
        )}
      </div>

      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{label}</p>

      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? "–"}</p>
          {sub && <span className="text-xs text-gray-400">{sub}</span>}
        </div>
      )}

      {loading ? (
        <Skeleton className="h-1.5 w-full" />
      ) : bar ? (
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-700 ${bar.colorClass}`}
            style={{ width: `${Math.min(bar.value ?? 0, 100)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function UserDashboardPage() {
  const navigate   = useNavigate();
  const user       = getCurrentUser();

  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchUserDashboardStats();
        if (!cancelled) setStats(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Derived percentages ────────────────────────────────────────────────────
  const pct = (num, denom) => (denom > 0 ? Math.round((num / denom) * 100) : 0);

  const projectPct  = pct(stats?.completed_projects,    stats?.total_projects);
  const sessionPct  = pct(stats?.completed_sessions,    stats?.total_sessions);
  const reqApprPct  = pct(stats?.approved_requirements, stats?.total_session_requirements);
  const llmPct      = pct(stats?.llm_runs,              stats?.total_runs);
  const hybridPct   = pct(stats?.hybrid_runs,           stats?.total_runs);
  const geminiPct   = pct(stats?.gemini_runs,           stats?.total_runs);

  const projectsCompleted = stats?.completed_projects
  const sessionsCompleted = stats?.completed_sessions
  const approvedRequirements = stats?.approved_requirements

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center space-y-3">
          <span className="material-symbols-outlined text-4xl text-red-400">error</span>
          <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <button onClick={() => window.location.reload()}
            className="text-primary text-sm font-semibold underline">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen font-display bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100">
      <main className="flex-1 p-8 overflow-y-auto w-full">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-[#1F2937] dark:text-white text-3xl font-black leading-tight tracking-tight">
              Dashboard
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Welcome back, {user?.full_name?.split(" ")[0] ?? "there"} 👋
            </p>
          </div>

          {/* PM alert — pending invitations */}
          {!loading && stats?.pending_invitations > 0 && (
            <button
              onClick={() => navigate("/projects")}
              className="flex items-center gap-2 text-sm font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700 px-3 py-2 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/40 transition"
            >
              <span className="material-symbols-outlined text-[18px]">mark_email_unread</span>
              {stats.pending_invitations} pending invitation{stats.pending_invitations !== 1 ? "s" : ""}
            </button>
          )}
        </div>

        {/* ── Stat cards ── */}
        <div className="mb-10">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            Statistics &amp; Reports
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* 1 · My Projects */}
            <StatCard
              loading={loading}
              icon="folder_open"
              iconBg="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
              label="My Projects"
              value={stats?.total_projects}
              sub={stats ? `${stats.project_manager_projects} as Project Manager · ${stats.participant_projects} as participant` : undefined}
              badge={stats ? {
                text: `${projectsCompleted} completed`,
                className: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
              } : undefined}
              bar={{ value: projectPct, colorClass: "bg-blue-600" }}
              onClick={() => navigate("/projects")}
            />

            {/* 2 · My Sessions */}
            <StatCard
              loading={loading}
              icon="mic"
              iconBg="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
              label="My Sessions"
              value={stats?.total_sessions}
              sub={stats ? `${stats.owner_sessions} owned · ${stats.participant_sessions} joined` : undefined}
              badge={stats ? {
                text: `${sessionsCompleted} completed `,
                className: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20",
              } : undefined}
              bar={{ value: sessionPct, colorClass: "bg-purple-600" }}
            />

            {/* 3 · Requirements */}
            <StatCard
              loading={loading}
              icon="list_alt"
              iconBg="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
              label="Requirements Extracted"
              value={stats?.total_session_requirements}
              sub={stats ? `${approvedRequirements} approved · ${stats.pending_requirements} pending` : undefined}
              badge={stats ? {
                text: `${approvedRequirements} approved`,
                className: stats?.approved_requirements === stats?.total_session_requirements
                  ? "text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30"
                  : "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800",
              } : undefined}
              bar={{ value: reqApprPct, colorClass: "bg-green-600" }}
            />

            {/* 4 · Artifacts */}
            <StatCard
              loading={loading}
              icon="description"
              iconBg="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
              label="Artifacts Generated"
              value={stats?.total_artifacts}
              sub={stats ? `${stats.srs_count} SRS · ${stats.uml_count} UML` : undefined}
            //   badge={stats?.total_runs > 0 ? {
            //     text: `${stats.total_runs} run${stats.total_runs !== 1 ? "s" : ""}`,
            //     className: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
            //   } : undefined}
            //   bar={{ value: hybridPct, colorClass: "bg-amber-500" }}
            />
          </div>
        </div>

        {/* ── Pending approval section ── */}
        {!loading && (
          (stats?.projects_pending_approval?.length > 0 || stats?.sessions_pending_approval?.length > 0)
        ) && (
          <div className="mb-10 bg-white dark:bg-[#1C192B] rounded-2xl border border-red-200 dark:border-red-700/40 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[18px] text-red-500">pending_actions</span>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Pending Approval
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              {/* Pending Projects */}
              {stats.projects_pending_approval?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Projects ({stats.projects_pending_approval.length})
                  </p>
                  <ul className="flex flex-col gap-2">
                    {stats.projects_pending_approval.map((p) => (
                      <li key={p.id}>
                        <button
                          onClick={() => navigate(`/projects/${p.id}`)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-700/30 hover:bg-red-100 dark:hover:bg-red-900/20 transition text-left"
                        >
                          <span className="material-symbols-outlined text-[16px] text-red-500">folder_open</span>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate flex-1">{p.name}</span>
                          <span className="material-symbols-outlined text-[16px] text-gray-400">chevron_right</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pending Sessions */}
              {stats.sessions_pending_approval?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Sessions ({stats.sessions_pending_approval.length})
                  </p>
                  <ul className="flex flex-col gap-2">
                    {stats.sessions_pending_approval.map((s) => (
                      <li key={s.id}>
                        <button
                          onClick={() => navigate(`/projects/${s.project_id}/sessions/${s.id}/sessiondetails`)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-700/30 hover:bg-red-100 dark:hover:bg-red-900/20 transition text-left"
                        >
                          <span className="material-symbols-outlined text-[16px] text-red-500">mic</span>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate flex-1">{s.name}</span>
                          <span className="material-symbols-outlined text-[16px] text-gray-400">chevron_right</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ── Artifact approval strip ── */}
        {!loading && stats?.total_artifacts > 0 && (
          <div className="mb-6 bg-white dark:bg-[#1C192B] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
              Artifact Status
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* SRS */}
              {stats.srs_count > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      SRS Documents ({stats.srs_count})
                    </span>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      {stats.srs_approved} approved · {stats.srs_pending} pending
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-700"
                      style={{ width: `${pct(stats.srs_approved, stats.srs_count)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* UML */}
              {stats.uml_count > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      UML Diagrams ({stats.uml_count})
                    </span>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      {stats.uml_approved} approved · {stats.uml_pending} pending
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-700"
                      style={{ width: `${pct(stats.uml_approved, stats.uml_count)}%` }}
                    />
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ── Extraction engine runs strip ── */}
        {!loading && stats?.total_runs > 0 && (
          <div className="mb-10 bg-white dark:bg-[#1C192B] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
              Extraction Engine Usage · {stats.total_runs} run{stats.total_runs !== 1 ? "s" : ""}
            </p>
            <div className="flex flex-col gap-3">

              {[
                { label: "LLM",    count: stats.llm_runs,    pctVal: llmPct,    color: "bg-violet-500" },
                { label: "Hybrid", count: stats.hybrid_runs, pctVal: hybridPct, color: "bg-blue-500"   },
                { label: "Gemini", count: stats.gemini_runs, pctVal: geminiPct, color: "bg-teal-500"   },
              ].map(({ label, count, pctVal, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-12">{label}</span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all duration-700`}
                      style={{ width: `${pctVal}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-16 text-right">{count} ({pctVal}%)</span>
                </div>
              ))}

            </div>
          </div>
        )}

        {/* ── Placeholder for future charts ── */}
        
      </main>
    </div>
  );
}
