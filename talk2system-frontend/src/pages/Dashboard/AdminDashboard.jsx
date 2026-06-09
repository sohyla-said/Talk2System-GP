import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../api/authApi";
import { fetchAdminDashboardStats, fetchActivityFeed } from "../../api/dashboardApi";
import {
  getRecentWeeks, getRecentMonths, formatWeekLabel, formatMonthLabel,
  exportAuditFeedAsCSV,
} from "../../utils/feedFilterUtils";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso) {
  if (!iso) return "—";
  const sec = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (sec < 60)     return "just now";
  if (sec < 3600)   return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400)  return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

const pct = (num, denom) => (denom > 0 ? Math.round((num / denom) * 100) : 0);

const CHART_COLORS = [
  "#6366f1","#f59e0b","#10b981","#3b82f6","#ec4899",
  "#8b5cf6","#f97316","#14b8a6","#ef4444","#84cc16",
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />;
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon, iconBg, label, value, sub, badge, bar, loading, onClick }) {
  const base = "bg-white dark:bg-[#1C192B] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col gap-3";
  const interactive = onClick ? "cursor-pointer hover:border-primary/40 dark:hover:border-primary/40 transition-colors" : "";
  return (
    <div className={`${base} ${interactive}`} onClick={onClick}>
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
        {badge && (
          <span className={`text-xs font-semibold px-2 py-1 rounded ${badge.className}`}>{badge.text}</span>
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

// ─── DonutChart ───────────────────────────────────────────────────────────────
function DonutChart({ segments, size = 160, thickness = 28, sublabel }) {
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
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor"
          className="text-gray-100 dark:text-gray-800" strokeWidth={thickness} />
        {total > 0 && arcs.map((arc, i) =>
          arc.dash > 0 && (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={arc.color} strokeWidth={thickness}
              strokeDasharray={`${arc.dash} ${C - arc.dash}`}
              strokeDashoffset={arc.offset} strokeLinecap="butt"
            />
          )
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-black text-gray-900 dark:text-white">{total}</span>
        {sublabel && <span className="text-[10px] font-medium text-gray-400">{sublabel}</span>}
      </div>
    </div>
  );
}

// ─── BarChart (grouped) ───────────────────────────────────────────────────────
function BarChart({ labels, datasets, height = 120, highlightIndex = null }) {
  const maxVal = Math.max(...datasets.flatMap(d => d.values), 1);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-1 relative" style={{ height }}>
        {labels.map((label, i) => (
          <div
            key={i}
            className="flex-1 flex items-end gap-0.5 min-w-0 relative group transition-opacity duration-300"
            style={{ opacity: highlightIndex !== null && i !== highlightIndex ? 0.25 : 1 }}
          >
            {datasets.map((ds, di) => {
              const val = ds.values[i] || 0;
              const barHeight = (val / maxVal) * height;
              return (
                <div key={di} className="flex-1 flex flex-col items-center relative">
                  <div
                    className="flex-1 rounded-t transition-all duration-700 w-full flex items-end justify-center pb-1"
                    style={{
                      height: `${barHeight}px`,
                      backgroundColor: ds.color,
                      minHeight: val > 0 ? 2 : 0,
                    }}
                    title={`${ds.label}: ${val}`}
                  >
                    {val > 0 && barHeight > 20 && (
                      <span className="text-[9px] font-bold text-white drop-shadow-sm">{val}</span>
                    )}
                  </div>
                  {val > 0 && barHeight <= 20 && (
                    <span className="text-[9px] font-bold text-gray-700 dark:text-gray-300 mt-0.5">{val}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        {labels.map((label, i) => (
          <div key={i} className="flex-1 text-center min-w-0">
            <span
              className={`text-[9px] truncate block transition-colors duration-300 ${
                highlightIndex !== null && i === highlightIndex
                  ? "text-gray-700 dark:text-gray-200 font-semibold"
                  : "text-gray-400"
              }`}
            >
              {label.slice(-5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">{children}</h3>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children, className = "", border = "border-gray-100 dark:border-gray-800" }) {
  return (
    <div className={`bg-white dark:bg-[#1C192B] rounded-2xl border ${border} p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate   = useNavigate();
  const user       = getCurrentUser();

  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const [selectedGrowthMonth,  setSelectedGrowthMonth]  = useState("");
  const [selectedSessionWeek,  setSelectedSessionWeek]  = useState("");

  const [feedFilterType,  setFeedFilterType]  = useState("all");
  const [feedFilterValue, setFeedFilterValue] = useState("");
  const [feedEntries,     setFeedEntries]     = useState(null);
  const [feedLoading,     setFeedLoading]     = useState(false);
  const [feedError,       setFeedError]       = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAdminDashboardStats();
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
        const data = await fetchActivityFeed(feedFilterType, feedFilterValue);
        if (!cancelled) setFeedEntries(data);
      } catch (e) {
        if (!cancelled) setFeedError(e.message);
      } finally {
        if (!cancelled) setFeedLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [feedFilterType, feedFilterValue]);

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

  // Derived totals
  const availableUsers    = stats ? (stats.user_status_distribution?.values ?? []).reduce((a, b) => a + b, 0) : 0;
  const totalSessions  = stats ? (stats.sessions_per_week?.counts ?? []).reduce((a, b) => a + b, 0) : 0;
  const totalTasksDone = stats ? (stats.task_completion_time ?? []).reduce((s, t) => s + t.sample_count, 0) : 0;

  return (
    <div className="flex min-h-screen font-display bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100">
      <main className="flex-1 p-8 overflow-y-auto w-full">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-[#1F2937] dark:text-white text-3xl font-black leading-tight tracking-tight">
              Admin Dashboard
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Welcome back, {user?.full_name?.split(" ")[0] ?? "Admin"} 👋
            </p>
          </div>
          {!loading && stats?.pending_users?.length > 0 && (
            <button
              onClick={() => navigate("/role-approval")}
              className="flex items-center gap-2 text-sm font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700 px-3 py-2 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/40 transition"
            >
              <span className="material-symbols-outlined text-[18px]">pending_actions</span>
              {stats.pending_users.length} pending user{stats.pending_users.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>

        {/* ── Summary stat cards ── */}
        <div className="mb-10">
          <SectionTitle>System Overview</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

            <StatCard
              loading={loading}
              icon="group"
              iconBg="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
              label="Total Users"
              value={availableUsers || undefined}
              sub={stats ? `${stats.user_status_distribution?.values[0] ?? 0} Active · ${stats.user_status_distribution?.values[1] ?? 0} Pending · ${stats.user_status_distribution?.values[2] ?? 0} Suspended · ${stats.user_status_distribution?.values[3] ?? 0} Terminated · ${stats.user_status_distribution?.values[4] ?? 0} Archived`  : undefined}
            />

            <StatCard
              loading={loading}
              icon="pending_actions"
              iconBg="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
              label="Pending Approval"
              value={stats?.pending_users?.length}
              sub="awaiting activation"
              badge={stats?.pending_users?.length > 0 ? {
                text: "Needs action",
                className: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
              } : undefined}
              onClick={stats?.pending_users?.length > 0 ? () => navigate("/role-approval") : undefined}
            />

            <StatCard
              loading={loading}
              icon="mic"
              iconBg="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
              label="Sessions (6 weeks)"
              value={totalSessions || undefined}
              sub={stats?.sessions_per_week?.weeks?.length > 0 ? `across ${stats.sessions_per_week.weeks.length} weeks` : undefined}
            />

            <StatCard
              loading={loading}
              icon="task_alt"
              iconBg="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
              label="Successed Tasks"
              value={totalTasksDone || undefined}
              sub="background jobs done"
            />

          </div>
        </div>

        {/* ── Platform Growth + Sessions per week*/}  
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">

          <Card>
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Platform Growth</p>
              {!loading && stats?.platform_growth?.months?.length > 0 && (
                <select
                  value={selectedGrowthMonth}
                  onChange={e => setSelectedGrowthMonth(e.target.value)}
                  className="text-[11px] bg-white dark:bg-[#1C192B] border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-0.5 text-gray-500 dark:text-gray-400 focus:outline-none focus:border-primary shrink-0"
                >
                  <option value="">All months</option>
                  {stats.platform_growth.months.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mb-4">New users &amp; projects per month (last 12 months)</p>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : stats?.platform_growth?.months?.length > 0 ? (
              <>
                {selectedGrowthMonth && (() => {
                  const idx   = stats.platform_growth.months.indexOf(selectedGrowthMonth);
                  const users = stats.platform_growth.new_users[idx]    ?? 0;
                  const projs = stats.platform_growth.new_projects[idx] ?? 0;
                  return (
                    <div className="flex items-center gap-6 mb-4 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                      <div className="flex flex-col items-center">
                        <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">{users}</span>
                        <span className="text-[10px] text-gray-400 mt-0.5">New Users</span>
                      </div>
                      <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />
                      <div className="flex flex-col items-center">
                        <span className="text-2xl font-black text-emerald-500 dark:text-emerald-400 tabular-nums">{projs}</span>
                        <span className="text-[10px] text-gray-400 mt-0.5">New Projects</span>
                      </div>
                    </div>
                  );
                })()}
                <BarChart
                  labels={stats.platform_growth.months}
                  height={120}
                  highlightIndex={selectedGrowthMonth ? stats.platform_growth.months.indexOf(selectedGrowthMonth) : null}
                  datasets={[
                    { label: "New Users",    values: stats.platform_growth.new_users,    color: "#6366f1" },
                    { label: "New Projects", values: stats.platform_growth.new_projects, color: "#10b981" },
                  ]}
                />
                <div className="flex items-center gap-4 mt-3">
                  {[{ label: "New Users", color: "#6366f1" }, { label: "New Projects", color: "#10b981" }].map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-[11px] text-gray-400">{label}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState icon="bar_chart" label="No growth data yet" />
            )}
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sessions Created per Week</p>
              {!loading && stats?.sessions_per_week?.weeks?.length > 0 && (
                <select
                  value={selectedSessionWeek}
                  onChange={e => setSelectedSessionWeek(e.target.value)}
                  className="text-[11px] bg-white dark:bg-[#1C192B] border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-0.5 text-gray-500 dark:text-gray-400 focus:outline-none focus:border-primary shrink-0"
                >
                  <option value="">All weeks</option>
                  {stats.sessions_per_week.weeks.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mb-4">Last 6 weeks</p>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : stats?.sessions_per_week?.weeks?.length > 0 ? (
              <>
                {selectedSessionWeek && (() => {
                  const idx   = stats.sessions_per_week.weeks.indexOf(selectedSessionWeek);
                  const count = stats.sessions_per_week.counts[idx] ?? 0;
                  return (
                    <div className="flex items-center gap-4 mb-4 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                      <div className="flex flex-col items-center">
                        <span className="text-2xl font-black text-purple-600 dark:text-purple-400 tabular-nums">{count}</span>
                        <span className="text-[10px] text-gray-400 mt-0.5">Sessions this week</span>
                      </div>
                    </div>
                  );
                })()}
                <BarChart
                  labels={stats.sessions_per_week.weeks}
                  height={120}
                  highlightIndex={selectedSessionWeek ? stats.sessions_per_week.weeks.indexOf(selectedSessionWeek) : null}
                  datasets={[{ label: "Sessions", values: stats.sessions_per_week.counts, color: "#8b5cf6" }]}
                />
              </>
            ) : (
              <EmptyState icon="mic" label="No sessions this period" />
            )}
          </Card>

        </div>

        {/* Projects per PM ── */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">

          <Card>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Projects per PM</p>
            {loading ? (
              <div className="flex flex-col gap-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
              </div>
            ) : stats?.projects_per_pm?.length > 0 ? (
              <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto pr-1">
                {stats.projects_per_pm.map((pm, i) => {
                  const maxCount = stats.projects_per_pm[0].project_count;
                  return (
                    <div key={pm.user_id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{pm.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{pm.email}</p>
                      </div>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct(pm.project_count, maxCount)}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-5 text-right shrink-0">{pm.project_count}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon="manage_accounts" label="No project managers" />
            )}
          </Card>

        </div>

        {/* ── Most Active Users + Inactive Users ── */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">

          <Card>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Most Active Users</p>
            {loading ? (
              <div className="flex flex-col gap-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
              </div>
            ) : stats?.most_active_users?.length > 0 ? (
              <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                {stats.most_active_users.map((u, i) => (
                  <div key={u.user_id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="text-[11px] font-bold text-gray-400 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{u.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {u.sessions_participated} sessions · {u.approvals_given} approvals
                      </p>
                    </div>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0 tabular-nums">
                      {u.total_activity}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="leaderboard" label="No activity data yet" />
            )}
          </Card>

          <Card border="border-red-100 dark:border-red-700/40">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[16px] text-red-400">person_off</span>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Inactive Users
                <span className="ml-2 font-normal normal-case text-gray-400">— no session in last 60 days</span>
              </p>
              {!loading && stats?.inactive_users?.length > 0 && (
                <span className="ml-auto text-[11px] font-semibold bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 px-2 py-0.5 rounded-full">
                  {stats.inactive_users.length}
                </span>
              )}
            </div>
            {loading ? (
              <div className="flex flex-col gap-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
              </div>
            ) : stats?.inactive_users?.length > 0 ? (
              <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
                {stats.inactive_users.slice(0, 8).map((u) => (
                  <div key={u.user_id}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-700/20">
                    <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[14px] text-red-400">person</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{u.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-gray-400 dark:text-gray-600">
                <span className="material-symbols-outlined text-3xl">check_circle</span>
                <p className="text-xs font-medium">No inactive users</p>
              </div>
            )}
          </Card>

        </div>

        
        {/* ── Action Distribution  ── */}
        <div className="mb-6 grid grid-cols-1 gap-6">

          <Card>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Most Common Actions</p>
            {loading ? (
              <div className="flex flex-col gap-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
              </div>
            ) : stats?.action_distribution?.actions?.length > 0 ? (
              <div className="flex flex-col gap-3">
                {stats.action_distribution.actions.slice(0, 8).map((action, i) => {
                  const count    = stats.action_distribution.counts[i];
                  const maxCount = stats.action_distribution.counts[0];
                  return (
                    <div key={action} className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex-1 truncate">{action}</span>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct(count, maxCount)}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-12 text-right shrink-0 tabular-nums">{count}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon="bar_chart" label="No audit logs yet" />
            )}
          </Card>

        </div>

        {/* ── + Task Type Distribution + Successful & Failed Task Distribution ── */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">

          <Card>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-5">Successed Background Tasks Distribution</p>
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : stats?.task_type_distribution?.labels?.length > 0 ? (() => {
              const total = (stats.task_type_distribution.values ?? []).reduce((a, b) => a + b, 0);
              return (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <DonutChart
                    sublabel="tasks"
                    segments={stats.task_type_distribution.labels.map((label, i) => ({
                      label,
                      value: stats.task_type_distribution.values[i],
                      color: CHART_COLORS[i % CHART_COLORS.length],
                    }))}
                  />
                  <div className="flex flex-col gap-3 flex-1 w-full">
                    {stats.task_type_distribution.labels.map((label, i) => {
                      const val = stats.task_type_distribution.values[i];
                      return (
                        <div key={label} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate max-w-[120px]">{label}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-100 tabular-nums">{val}</span>
                            <span className="text-xs text-gray-400">({pct(val, total)}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })() : (
              <EmptyState icon="task" label="No background tasks yet" />
            )}
          </Card>

          <Card>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-5">Failed vs Successed Task Types</p>
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : stats?.failed_vs_done_task_type_distribution?.done_labels?.length > 0 || stats?.failed_vs_done_task_type_distribution?.failed_labels?.length > 0 ? (() => {
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
                <div className="flex flex-col gap-4">
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-1.5 pr-3 font-medium text-gray-400">Task Type</th>
                          <th className="text-right py-1.5 px-3 font-medium" style={{ color: "#10b981" }}>Done</th>
                          <th className="text-right py-1.5 pl-3 font-medium" style={{ color: "#ef4444" }}>Failed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allLabels.map(label => (
                          <tr key={label} className="border-b border-gray-50 last:border-0">
                            <td className="py-1.5 pr-3 text-gray-600 truncate max-w-[120px]">{label}</td>
                            <td className="text-right py-1.5 px-3 font-medium text-gray-700">{doneMap[label] ?? 0}</td>
                            <td className="text-right py-1.5 pl-3 font-medium text-gray-700">{failedMap[label] ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })() : (
              <EmptyState icon="task" label="No task data yet" />
            )}
          </Card>

        </div>

        {/* ── Task Completion Time ── */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">

          <Card>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Avg Task Completion Time</p>
            {loading ? (
              <div className="flex flex-col gap-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : stats?.task_completion_time?.length > 0 ? (
              <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                {stats.task_completion_time.map((t) => (
                  <div key={t.task_type} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{t.task_type}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {t.sample_count} sample{t.sample_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{t.avg_human}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="timer" label="No completed tasks yet" />
            )}
          </Card>

        </div>

        {/* ── Live Activity Feed (Audit Log) ── */}
        <div className="mb-6">
          <Card>
            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Live Activity Feed</p>
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
                    {type === "all" ? "Recent 50" : type === "week" ? "By Week" : "By Month"}
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
                {/* Export button */}
                {(() => {
                  const displayFeed = feedEntries ?? stats?.activity_feed ?? [];
                  return displayFeed.length > 0 && !loading && !feedLoading ? (
                    <button
                      onClick={() => exportFeedAsCSV(displayFeed)}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-700/40 px-2.5 py-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition"
                    >
                      <span className="material-symbols-outlined text-[14px]">download</span>
                      Export CSV
                    </button>
                  ) : null;
                })()}
              </div>
            </div>

            {/* Result count badge when filtered */}
            {feedFilterType !== "all" && feedFilterValue && !feedLoading && feedEntries && (
              <p className="text-[11px] text-gray-400 mb-3">
                {feedEntries.length} event{feedEntries.length !== 1 ? "s" : ""} found
              </p>
            )}

            {/* Feed list */}
            {(() => {
              const isInitialLoad  = loading && !stats;
              const isFilteredLoad = feedLoading;
              const showSkeleton   = isInitialLoad || isFilteredLoad;
              const needsValue     = feedFilterType !== "all" && !feedFilterValue;
              const displayFeed    = feedEntries ?? stats?.activity_feed ?? [];

              if (showSkeleton) return (
                <div className="flex flex-col gap-4">
                  {[...Array(5)].map((_, i) => (
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

              if (displayFeed.length === 0) return <EmptyState icon="inbox" label="No audit events for this period" />;

              return (
                <ul className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800 max-h-[420px] overflow-y-auto pr-1">
                  {displayFeed.map((e) => (
                    <li key={e.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="p-2 rounded-xl shrink-0 bg-indigo-50 dark:bg-indigo-900/20">
                        <span className="material-symbols-outlined text-[16px] text-indigo-500">history</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">{e.action}</span>
                          <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                            {e.entity}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                          {e.user_name ?? `User #${e.user_id}`}
                          {e.user_email ? ` · ${e.user_email}` : ""}
                          {e.project_name ? ` · ${e.project_name}` : ""}
                        </p>
                      </div>
                      <span className="text-[11px] text-gray-400 shrink-0 whitespace-nowrap">{timeAgo(e.created_at)}</span>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </Card>
        </div>


      </main>
    </div>
  );
}

function exportFeedAsCSV(feed) {
  exportAuditFeedAsCSV(feed);
}

function EmptyState({ icon, label }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-gray-400 dark:text-gray-600">
      <span className="material-symbols-outlined text-3xl">{icon}</span>
      <p className="text-xs font-medium">{label}</p>
    </div>
  );
}
