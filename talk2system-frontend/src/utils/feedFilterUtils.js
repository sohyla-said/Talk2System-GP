export function getRecentWeeks(count = 12) {
  const weeks = [];
  const now = new Date();
  const daysToMonday = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() - i * 7);
    weeks.push(d.toISOString().slice(0, 10));
  }
  return weeks;
}

export function getRecentMonths(count = 12) {
  const months = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export function formatWeekLabel(iso) {
  const start = new Date(iso);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = d => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function formatMonthLabel(yyyyMM) {
  const [y, m] = yyyyMM.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

const escapeCell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;

function downloadCSV(csvString, filename) {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAuditFeedAsCSV(feed) {
  const headers = ["ID", "Action", "Entity", "Entity ID", "User Name", "User Email", "Project Name", "Details", "Timestamp"];
  const rows = feed.map(e => [
    e.id, e.action, e.entity, e.entity_id,
    e.user_name ?? "", e.user_email ?? "", e.project_name ?? "",
    typeof e.details === "object" ? JSON.stringify(e.details) : (e.details ?? ""),
    e.created_at ?? "",
  ].map(escapeCell).join(","));
  downloadCSV([headers.map(escapeCell).join(","), ...rows].join("\r\n"),
    `activity_feed_${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportUserActivityAsCSV(feed) {
  const headers = ["Type", "Title", "Subtitle", "Role", "Project ID", "Session ID", "Timestamp"];
  const rows = feed.map(e => [
    e.type ?? "", e.title ?? "", e.subtitle ?? "", e.role ?? "",
    e.project_id ?? "", e.session_id ?? "", e.timestamp ?? "",
  ].map(escapeCell).join(","));
  downloadCSV([headers.map(escapeCell).join(","), ...rows].join("\r\n"),
    `my_activity_${new Date().toISOString().slice(0, 10)}.csv`);
}
