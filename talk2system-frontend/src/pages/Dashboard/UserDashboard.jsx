import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../api/authApi";
import { fetchUserDashboardStats, fetchUserActivityFeed, fetchUserMomentum } from "../../api/dashboardApi";
import {
  getRecentWeeks, getRecentMonths, formatWeekLabel, formatMonthLabel,
  // exportUserActivityAsCSV, // CSV export disabled for now — keep import ready for when it's needed again
} from "../../utils/feedFilterUtils";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function urgencyColor(days) {
  if (days >= 14) return "text-red-500 dark:text-red-400";
  if (days >= 7)  return "text-orange-500 dark:text-orange-400";
  return "text-amber-500 dark:text-amber-400";
}

function timeAgo(iso) {
  if (!iso) return "—";
  const sec = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (sec < 60)        return "just now";
  if (sec < 3600)      return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400)     return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800)    return `${Math.floor(sec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function getActivityUrl({ type, project_id, session_id }) {
  const p = project_id;
  const s = session_id;
  switch (type) {
    case "project_joined":
      return p ? `/projects/${p}` : null;
    case "session_joined":
      return p && s ? `/projects/${p}/sessions/${s}/sessiondetails` : null;
    case "srs_generated":
      return p && s ? `/projects/${p}/sessions/${s}/artifacts/srs`
           : p       ? `/projects/${p}/artifacts/srs`
           : null;
    case "uml_generated":
      return p && s ? `/projects/${p}/sessions/${s}/artifacts/uml`
           : p       ? `/projects/${p}/artifacts/uml`
           : null;
    case "requirements_extracted":
      return s ? `/transcript/${s}/requirements` : null;
    case "transcription_made":
      return s ? `/transcript/${s}` : null;
    default:
      return null;
  }
}

const FEED_PAGE_SIZE = 10;
const LIST_PREVIEW_COUNT = 6;

const MOMENTUM_RANGES = [4, 8, 12, 26];

const MOMENTUM_SERIES = [
  { key: "sessions",     label: "Sessions",     color: "#8b5cf6", field: "sessions_created" },
  { key: "requirements", label: "Requirements", color: "#10b981", field: "requirements_extracted" },
  { key: "artifacts",    label: "Artifacts",    color: "#f59e0b", field: "artifacts_generated" },
  { key: "approvals",    label: "Approvals",    color: "#3b82f6", field: "approvals_given" },
];

const CHART_COLORS = [
  "#6366f1","#f59e0b","#10b981","#3b82f6","#ec4899",
  "#8b5cf6","#f97316","#14b8a6","#ef4444","#84cc16",
];

const ACTIVITY_META = {
  project_joined:         { icon: "folder_open",  ring: "bg-blue-100 dark:bg-blue-900/30",   iconColor: "text-blue-600 dark:text-blue-400"   },
  session_joined:         { icon: "mic",           ring: "bg-purple-100 dark:bg-purple-900/30", iconColor: "text-purple-600 dark:text-purple-400" },
  srs_generated:          { icon: "description",   ring: "bg-amber-100 dark:bg-amber-900/30",  iconColor: "text-amber-600 dark:text-amber-400"  },
  uml_generated:          { icon: "account_tree",  ring: "bg-indigo-100 dark:bg-indigo-900/30", iconColor: "text-indigo-600 dark:text-indigo-400" },
  requirements_extracted: { icon: "list_alt",      ring: "bg-green-100 dark:bg-green-900/30",  iconColor: "text-green-600 dark:text-green-400"  },
  transcription_made:     { icon: "mic",           ring: "bg-teal-100 dark:bg-teal-900/30",    iconColor: "text-teal-600 dark:text-teal-400"    },
};

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

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ segments, size = 180, thickness = 32, sublabel }) {
  const r   = (size - thickness) / 2;
  const cx  = size / 2;
  const cy  = size / 2;
  const C   = 2 * Math.PI * r;

  const total = segments.reduce((s, seg) => s + (seg.value || 0), 0);

  let accumulated = 0;
  const arcs = segments.map(seg => {
    const dash = total > 0 ? ((seg.value || 0) / total) * C : 0;
    const arc  = { ...seg, dash, offset: C - accumulated };
    accumulated += dash;
    return arc;
  });

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}>
        {/* background track */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="currentColor"
          className="text-gray-100 dark:text-gray-800"
          strokeWidth={thickness} />
        {total > 0 && arcs.map((arc, i) =>
          arc.dash > 0 && (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={arc.color}
              strokeWidth={thickness}
              strokeDasharray={`${arc.dash} ${C - arc.dash}`}
              strokeDashoffset={arc.offset}
              strokeLinecap="butt"
            />
          )
        )}
      </svg>
      {/* centre label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-black text-gray-900 dark:text-white">{total}</span>
        {sublabel && (
          <span className="text-[10px] font-medium text-gray-400">{sublabel}</span>
        )}
      </div>
    </div>
  );
}

// ─── Line Chart ───────────────────────────────────────────────────────────────
function LineChart({ labels, series, height = 220 }) {
  const width     = 600;
  const padLeft   = 46;
  const padRight  = 16;
  const padTop    = 16;
  const padBottom = 28;
  const innerW    = width - padLeft - padRight;
  const innerH    = height - padTop - padBottom;

  // round the axis max up to a multiple of tickCount so ticks land on whole numbers
  const tickCount = 4;
  const rawMax    = Math.max(1, ...series.flatMap(s => s.values));
  const niceMax   = Math.max(tickCount, Math.ceil(rawMax / tickCount) * tickCount);
  const ticks     = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((niceMax / tickCount) * i));

  const n     = labels.length;
  const stepX = n > 1 ? innerW / (n - 1) : 0;

  const toPoint = (val, i) => [
    padLeft + i * stepX,
    padTop + innerH - (val / niceMax) * innerH,
  ];

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
        {/* y gridlines + value labels */}
        {ticks.map((t, i) => {
          const y = padTop + innerH - (t / niceMax) * innerH;
          return (
            <g key={i}>
              <line x1={padLeft} y1={y} x2={width - padRight} y2={y}
                stroke="currentColor" className="text-gray-100 dark:text-gray-800" strokeWidth={1} />
              <text x={padLeft - 8} y={y} textAnchor="end" dominantBaseline="middle"
                className="fill-gray-400" fontSize="10">{t}</text>
            </g>
          );
        })}

        {/* y-axis title */}
        <text x={14} y={padTop + innerH / 2} textAnchor="middle" className="fill-gray-400" fontSize="10"
          transform={`rotate(-90 14 ${padTop + innerH / 2})`}>Count</text>

        {series.map((s, si) => {
          const points = s.values.map((v, i) => toPoint(v, i));
          const path   = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
          return (
            <g key={si}>
              <path d={path} fill="none" stroke={s.color} strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round" />
              {points.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={2.5} fill={s.color}>
                  <title>{`${formatWeekLabel(labels[i])}: ${s.values[i]} ${s.name}`}</title>
                </circle>
              ))}
            </g>
          );
        })}

        {/* x-axis title */}
        <text x={padLeft + innerW / 2} y={height - 6} textAnchor="middle" className="fill-gray-400" fontSize="10">
          Week
        </text>
      </svg>

      <div className="flex items-center gap-4 mt-2 flex-wrap">
        {series.map(s => (
          <div key={s.name} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-[11px] text-gray-500 dark:text-gray-400">{s.name}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between mt-1" style={{ paddingLeft: padLeft, paddingRight: padRight }}>
        <span className="text-[10px] text-gray-400">{formatWeekLabel(labels[0])}</span>
        <span className="text-[10px] text-gray-400">{formatWeekLabel(labels[labels.length - 1])}</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function UserDashboardPage() {
  const navigate   = useNavigate();
  const user       = getCurrentUser();
  const isSuspended = user?.status === "suspended";

  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const [feedFilterType,  setFeedFilterType]  = useState("all");
  const [feedFilterValue, setFeedFilterValue] = useState("");
  const [feedEntries,     setFeedEntries]     = useState(null);
  const [feedLoading,     setFeedLoading]     = useState(false);
  const [feedError,       setFeedError]       = useState(null);
  const [feedPage,        setFeedPage]        = useState(1);

  const [momentumWeeks,   setMomentumWeeks]   = useState(8);
  const [momentum,        setMomentum]        = useState(null);
  const [momentumLoading, setMomentumLoading] = useState(true);
  const [momentumError,   setMomentumError]   = useState(null);
  const [momentumMetric,  setMomentumMetric]  = useState(MOMENTUM_SERIES[0].key);

  const [showAllPendingProjects, setShowAllPendingProjects] = useState(false);
  const [showAllPendingSessions, setShowAllPendingSessions] = useState(false);
  const [showAllStaleSessions,   setShowAllStaleSessions]   = useState(false);

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

  useEffect(() => {
    setFeedPage(1);
    if (feedFilterType === "all") {
      setFeedEntries(null);
      setFeedError(null);
      return;
    }
    if (!feedFilterValue) return;
    let cancelled = false;
    (async () => {
      try {
        setFeedLoading(true);
        setFeedError(null);
        const data = await fetchUserActivityFeed(feedFilterType, feedFilterValue);
        if (!cancelled) setFeedEntries(data);
      } catch (e) {
        if (!cancelled) setFeedError(e.message);
      } finally {
        if (!cancelled) setFeedLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [feedFilterType, feedFilterValue]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setMomentumLoading(true);
        setMomentumError(null);
        const data = await fetchUserMomentum(momentumWeeks);
        if (!cancelled) setMomentum(data);
      } catch (e) {
        if (!cancelled) setMomentumError(e.message);
      } finally {
        if (!cancelled) setMomentumLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [momentumWeeks]);

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
              onClick={() => navigate("/projects/pending-invitations")}
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
        {!loading && !isSuspended && (
          stats?.projects_pending_approval?.length > 0 || stats?.sessions_pending_approval?.length > 0
        ) && (
          <div className="mb-6 bg-white dark:bg-[#1C192B] rounded-2xl border border-red-200 dark:border-red-700/40 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[16px] text-red-500">pending_actions</span>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Approval</p>
            </div>

            <div className="flex flex-col gap-3">

              {stats?.projects_pending_approval?.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Projects ({stats.projects_pending_approval.length})
                  </p>
                  <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                    {(showAllPendingProjects
                      ? stats.projects_pending_approval
                      : stats.projects_pending_approval.slice(0, LIST_PREVIEW_COUNT)
                    ).map((p) => (
                      <li key={p.id}>
                        <button
                          onClick={() => navigate(`/projects/${p.id}`)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-700/30 hover:bg-red-100 dark:hover:bg-red-900/20 transition text-left"
                        >
                          <span className="material-symbols-outlined text-[14px] text-red-500 shrink-0">folder_open</span>
                          <span className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate flex-1">{p.name}</span>
                          <span className={`text-[11px] font-bold shrink-0 ${urgencyColor(p.days_waiting)}`}>{p.days_waiting}d</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {stats.projects_pending_approval.length > LIST_PREVIEW_COUNT && (
                    <button
                      onClick={() => setShowAllPendingProjects(v => !v)}
                      className="mt-1.5 text-[11px] font-semibold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition"
                    >
                      {showAllPendingProjects ? "Show less" : `+${stats.projects_pending_approval.length - LIST_PREVIEW_COUNT} more`}
                    </button>
                  )}
                </div>
              )}

              {stats?.sessions_pending_approval?.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Sessions ({stats.sessions_pending_approval.length})
                  </p>
                  <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                    {(showAllPendingSessions
                      ? stats.sessions_pending_approval
                      : stats.sessions_pending_approval.slice(0, LIST_PREVIEW_COUNT)
                    ).map((s) => (
                      <li key={s.id}>
                        <button
                          onClick={() => navigate(`/projects/${s.project_id}/sessions/${s.id}/sessiondetails`)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-700/30 hover:bg-red-100 dark:hover:bg-red-900/20 transition text-left"
                        >
                          <span className="material-symbols-outlined text-[14px] text-red-500 shrink-0">mic</span>
                          <span className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate flex-1">{s.name}</span>
                          <span className={`text-[11px] font-bold shrink-0 ${urgencyColor(s.days_waiting)}`}>{s.days_waiting}d</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {stats.sessions_pending_approval.length > LIST_PREVIEW_COUNT && (
                    <button
                      onClick={() => setShowAllPendingSessions(v => !v)}
                      className="mt-1.5 text-[11px] font-semibold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition"
                    >
                      {showAllPendingSessions ? "Show less" : `+${stats.sessions_pending_approval.length - LIST_PREVIEW_COUNT} more`}
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

        {/* ── Momentum ── */}
        <div className="mb-6 bg-white dark:bg-[#1C192B] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Momentum</p>
            <div className="flex items-center gap-2">
              {MOMENTUM_RANGES.map(w => (
                <button
                  key={w}
                  onClick={() => setMomentumWeeks(w)}
                  className={`text-[11px] font-semibold px-3 py-1 rounded-full border transition ${
                    momentumWeeks === w
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-transparent text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-400"
                  }`}
                >
                  {w}W
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-4">
            {MOMENTUM_SERIES.map(s => {
              const active = momentumMetric === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setMomentumMetric(s.key)}
                  className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full border transition ${
                    active ? "text-white border-transparent" : "bg-transparent text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400"
                  }`}
                  style={active ? { backgroundColor: s.color } : undefined}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: active ? "#ffffff" : s.color }} />
                  {s.label}
                </button>
              );
            })}
          </div>

          {momentumLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : momentumError ? (
            <div className="flex flex-col items-center gap-2 py-8 text-red-400">
              <span className="material-symbols-outlined text-3xl">error</span>
              <p className="text-xs font-medium">{momentumError}</p>
            </div>
          ) : momentum ? (
            (() => {
              const selected = MOMENTUM_SERIES.find(s => s.key === momentumMetric);
              return (
                <LineChart
                  labels={momentum.weeks}
                  series={[{ name: selected.label, color: selected.color, values: momentum[selected.field] }]}
                />
              );
            })()
          ) : null}
        </div>

        {/* ── Project charts row: status + domain ── */}
        {!loading && stats?.total_projects > 0 && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Status breakdown */}
            <div className="bg-white dark:bg-[#1C192B] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-5">
                Project Status Breakdown
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <DonutChart
                  size={160} thickness={28}
                  sublabel="projects"
                  segments={[
                    { label: "In Progress",          value: stats.active_projects,                        color: "#22c55e" },
                    { label: "Completed",        value: stats.completed_projects,                     color: "#3b82f6" },
                    { label: "Pending Approval", value: stats.projects_pending_approval?.length ?? 0, color: "#f59e0b" },
                    // { label: "Archived",         value: stats.archived_projects ?? 0,                 color: "#9ca3af" },
                  ]}
                />
                <div className="flex flex-col gap-3 flex-1 w-full">
                  {[
                    { label: "In Progress",          value: stats.active_projects,                        dot: "bg-green-500" },
                    { label: "Completed",        value: stats.completed_projects,                     dot: "bg-blue-500"  },
                    { label: "Pending Approval", value: stats.projects_pending_approval?.length ?? 0, dot: "bg-amber-500" },
                    // { label: "Archived",         value: stats.archived_projects ?? 0,                 dot: "bg-gray-400"  },
                  ].map(({ label, value, dot }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{value}</span>
                        <span className="text-xs text-gray-400">({pct(value, stats.total_projects)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Domain breakdown */}
            <div className="bg-white dark:bg-[#1C192B] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-5">
                Project Domain Breakdown
              </p>
              {(() => {
                const entries = Object.entries(stats.domain_distribution ?? {});
                const segments = entries.map(([label, value], i) => ({
                  label, value, color: CHART_COLORS[i % CHART_COLORS.length],
                }));
                return (
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <DonutChart
                      size={160} thickness={28}
                      sublabel="projects"
                      segments={segments}
                    />
                    <div className="flex flex-col gap-3 flex-1 w-full">
                      {segments.map(({ label, value, color }) => (
                        <div key={label} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate max-w-[120px]">{label}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{value}</span>
                            <span className="text-xs text-gray-400">({pct(value, stats.total_projects)}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>
        )}


        {/* ── Stale sessions (PM only) ── */}
        {!loading && !isSuspended && stats?.is_pm && stats?.stale_sessions?.length > 0 && (
          <div className="mb-6 bg-white dark:bg-[#1C192B] rounded-2xl border border-orange-200 dark:border-orange-700/40 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[16px] text-orange-500">schedule</span>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Stale Sessions</p>
              <span className="ml-auto text-[11px] font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">
                {stats.stale_sessions.length} session{stats.stale_sessions.length !== 1 ? "s" : ""}
              </span>
            </div>

            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1">
              {(showAllStaleSessions ? stats.stale_sessions : stats.stale_sessions.slice(0, LIST_PREVIEW_COUNT)).map((s) => {
                const daysColor = urgencyColor(s.days_stale);
                const statusLabel =
                  s.status === "In Progress" ? "In Progress" :
                  s.status === "processing"   ? "Processing"  : "Pending";
                const statusColor =
                  s.status === "In Progress" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" :
                  s.status === "processing"   ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" :
                                                "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400";
                return (
                  <li key={s.session_id}>
                    <button
                      onClick={() => navigate(`/projects/${s.project_id}/sessions/${s.session_id}/sessiondetails`)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-700/30 hover:bg-orange-100 dark:hover:bg-orange-900/20 transition text-left"
                    >
                      <span className="material-symbols-outlined text-[14px] text-orange-400 shrink-0">mic</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{s.title}</p>
                        <p className="text-[11px] text-gray-400 truncate">{s.project_name}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${statusColor}`}>
                        {statusLabel}
                      </span>
                      <span className={`text-[11px] font-bold shrink-0 ${daysColor}`}>{s.days_stale}d</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {stats.stale_sessions.length > LIST_PREVIEW_COUNT && (
              <button
                onClick={() => setShowAllStaleSessions(v => !v)}
                className="mt-1.5 text-[11px] font-semibold text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 transition"
              >
                {showAllStaleSessions ? "Show less" : `+${stats.stale_sessions.length - LIST_PREVIEW_COUNT} more`}
              </button>
            )}
          </div>
        )}

        {/* ── Artifact status + type distribution row ── */}
        {!loading && stats?.total_artifacts > 0 && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Artifact Status */}
            <div className="bg-white dark:bg-[#1C192B] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                Artifact Status
              </p>
              <div className="flex flex-col gap-5">

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

            {/* Artifact Type Distribution */}
            <div className="bg-white dark:bg-[#1C192B] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
              Artifact Type Distribution · {stats.total_artifacts} total
            </p>
            <div className="flex flex-col gap-3">
              {[
                { label: "Use Case Diagram", count: stats.usecase_count,      color: "bg-indigo-500" },
                { label: "Class Diagram",    count: stats.class_diagram_count, color: "bg-cyan-500"   },
                { label: "Sequence Diagram", count: stats.sequence_count,      color: "bg-rose-500"   },
              ].map(({ label, count, color }) => {
                const pctVal = pct(count, stats.total_artifacts);
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-36 shrink-0">{label}</span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pctVal}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-20 text-right shrink-0">{count} ({pctVal}%)</span>
                  </div>
                );
              })}

              {/* SRS standard — one row per format */}
              {Object.entries(stats.srs_format_distribution ?? {}).map(([label, count]) => {
                const pctVal = pct(count, stats.total_artifacts);
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-36 shrink-0">SRS {label}</span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all duration-700" style={{ width: `${pctVal}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-20 text-right shrink-0">{count} ({pctVal}%)</span>
                  </div>
                );
              })}
            </div>
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

        {/* ── Approval Contribution ── */}
        {!loading && stats?.approvals_given_total > 0 && (
          <div className="mb-6 bg-white dark:bg-[#1C192B] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Your Approval Contribution</p>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{stats.approvals_given_total} total</span>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { label: "Transcripts",    key: "transcript",   color: "bg-teal-500"   },
                { label: "Requirements",   key: "requirements", color: "bg-green-500"  },
                { label: "UML Diagrams",   key: "uml",           color: "bg-indigo-500" },
                { label: "SRS Documents",  key: "srs",           color: "bg-amber-500"  },
              ].map(({ label, key, color }) => {
                const count  = stats.approvals_by_feature?.[key] ?? 0;
                const pctVal = pct(count, stats.approvals_given_total);
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-32 shrink-0">{label}</span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pctVal}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-20 text-right shrink-0">{count} ({pctVal}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Task Type Distribution (Done vs Failed) ── */}
        {!loading && (stats?.failed_vs_done_task_type_distribution?.done_labels?.length > 0 || stats?.failed_vs_done_task_type_distribution?.failed_labels?.length > 0) && (
          <div className="mb-6 bg-white dark:bg-[#1C192B] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
              Task Type Status · Done vs Failed
            </p>
            {(() => {
              const allLabels = [...new Set([
                ...(stats.failed_vs_done_task_type_distribution.done_labels ?? []),
                ...(stats.failed_vs_done_task_type_distribution.failed_labels ?? [])
              ])];
              const doneMap = Object.fromEntries(
                (stats.failed_vs_done_task_type_distribution.done_labels ?? []).map((label, i) =>
                  [label, stats.failed_vs_done_task_type_distribution.done_values?.[i] ?? 0]
                )
              );
              const failedMap = Object.fromEntries(
                (stats.failed_vs_done_task_type_distribution.failed_labels ?? []).map((label, i) =>
                  [label, stats.failed_vs_done_task_type_distribution.failed_values?.[i] ?? 0]
                )
              );
              return (
                <div className="flex flex-col gap-3">
                  {allLabels.map((label) => {
                    const done = doneMap[label] || 0;
                    const failed = failedMap[label] || 0;
                    const total = done + failed;
                    const donePercent = total > 0 ? Math.round((done / total) * 100) : 0;
                    return (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 w-32 shrink-0 truncate">{label}</span>
                        <div className="flex-1 flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-1">
                            <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all duration-700"
                                style={{ width: `${donePercent}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-green-600 dark:text-green-400 font-semibold w-8 text-right">{done}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-red-600 dark:text-red-400 font-semibold w-8">{failed}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    {[{ label: "Done", color: "bg-green-500" }, { label: "Failed", color: "bg-red-500" }].map(({ label, color }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${color}`} />
                        <span className="text-[11px] text-gray-400">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Recent Activity Feed ── */}
        <div className="mb-6 bg-white dark:bg-[#1C192B] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">

          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recent Activity</p>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter type pills */}
              {["all", "week", "month"].map(type => (
                <button
                  key={type}
                  onClick={() => { setFeedFilterType(type); setFeedFilterValue(""); }}
                  className={`text-[11px] font-semibold px-3 py-1 rounded-full border transition ${
                    feedFilterType === type
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-transparent text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-400"
                  }`}
                >
                  {type === "all" ? "Recent 10" : type === "week" ? "By Week" : "By Month"}
                </button>
              ))}
              {/* Value dropdown */}
              {feedFilterType === "week" && (
                <select
                  value={feedFilterValue}
                  onChange={e => setFeedFilterValue(e.target.value)}
                  className="text-[11px] bg-white dark:bg-[#1C192B] border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-gray-500 dark:text-gray-400 focus:outline-none focus:border-primary"
                >
                  <option value="">Pick a week…</option>
                  {getRecentWeeks(12).map(w => (
                    <option key={w} value={w}>{formatWeekLabel(w)}</option>
                  ))}
                </select>
              )}
              {feedFilterType === "month" && (
                <select
                  value={feedFilterValue}
                  onChange={e => setFeedFilterValue(e.target.value)}
                  className="text-[11px] bg-white dark:bg-[#1C192B] border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-gray-500 dark:text-gray-400 focus:outline-none focus:border-primary"
                >
                  <option value="">Pick a month…</option>
                  {getRecentMonths(12).map(m => (
                    <option key={m} value={m}>{formatMonthLabel(m)}</option>
                  ))}
                </select>
              )}
              {/* Export button — disabled for now, keep logic for later
              {(() => {
                const displayFeed = feedEntries ?? stats?.recent_activity ?? [];
                return displayFeed.length > 0 && !loading && !feedLoading ? (
                  <button
                    onClick={() => exportUserActivityAsCSV(displayFeed)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-700/40 px-2.5 py-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition"
                  >
                    <span className="material-symbols-outlined text-[14px]">download</span>
                    Export CSV
                  </button>
                ) : null;
              })()}
              */}
            </div>
          </div>

          {/* Result count when filtered */}
          {feedFilterType !== "all" && feedFilterValue && !feedLoading && feedEntries && (
            <p className="text-[11px] text-gray-400 mb-3">
              {feedEntries.length} event{feedEntries.length !== 1 ? "s" : ""} found
            </p>
          )}

          {/* Feed list */}
          {(() => {
            const showSkeleton = (loading && !stats) || feedLoading;
            const needsValue   = feedFilterType !== "all" && !feedFilterValue;
            const displayFeed  = feedEntries ?? stats?.recent_activity ?? [];

            if (showSkeleton) return (
              <div className="flex flex-col gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                    <div className="flex-1 flex flex-col gap-1.5">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-3 w-14 shrink-0" />
                  </div>
                ))}
              </div>
            );

            if (needsValue) return (
              <div className="flex flex-col items-center gap-2 py-8 text-gray-400 dark:text-gray-600">
                <span className="material-symbols-outlined text-3xl">filter_list</span>
                <p className="text-xs font-medium">Select a {feedFilterType} to load activity</p>
              </div>
            );

            if (feedError) return (
              <div className="flex flex-col items-center gap-2 py-8 text-red-400">
                <span className="material-symbols-outlined text-3xl">error</span>
                <p className="text-xs font-medium">{feedError}</p>
              </div>
            );

            if (!displayFeed.length) return (
              <div className="flex flex-col items-center gap-2 py-8 text-gray-400 dark:text-gray-600">
                <span className="material-symbols-outlined text-3xl">inbox</span>
                <p className="text-xs font-medium">No activity for this period</p>
              </div>
            );

            const totalPages  = Math.max(1, Math.ceil(displayFeed.length / FEED_PAGE_SIZE));
            const currentPage = Math.min(feedPage, totalPages);
            const pagedFeed   = displayFeed.slice((currentPage - 1) * FEED_PAGE_SIZE, currentPage * FEED_PAGE_SIZE);

            return (
              <>
              <ul className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                {pagedFeed.map((item, i) => {
                  const meta = ACTIVITY_META[item.type] ?? ACTIVITY_META.project_joined;
                  const url  = getActivityUrl(item);
                  const Inner = (
                    <>
                      <div className={`p-2 rounded-xl shrink-0 ${meta.ring}`}>
                        <span className={`material-symbols-outlined text-[18px] ${meta.iconColor}`}>
                          {meta.icon}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug">
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{item.subtitle}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        <span className="text-[11px] text-gray-400 whitespace-nowrap">
                          {timeAgo(item.timestamp)}
                        </span>
                        {url && (
                          <span className="material-symbols-outlined text-[14px] text-gray-300 dark:text-gray-600">
                            chevron_right
                          </span>
                        )}
                      </div>
                    </>
                  );
                  return (
                    <li key={i}>
                      {url && !isSuspended ? (
                        <button
                          onClick={() => navigate(url)}
                          className="w-full flex items-start gap-3 py-3 first:pt-0 last:pb-0 text-left hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl px-2 -mx-2 transition-colors"
                        >
                          {Inner}
                        </button>
                      ) : (
                        <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 px-2 -mx-2">
                          {Inner}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {displayFeed.length > FEED_PAGE_SIZE && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setFeedPage(p => Math.max(1, p - 1))}
                    className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  >
                    ← Previous
                  </button>
                  <span className="text-[11px] text-gray-400">Page {currentPage} of {totalPages}</span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setFeedPage(p => Math.min(totalPages, p + 1))}
                    className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  >
                    Next →
                  </button>
                </div>
              )}
              </>
            );
          })()}
        </div>

      </main>
    </div>
  );
}
