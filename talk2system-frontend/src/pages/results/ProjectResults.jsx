import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import EmptyArtifacts from "../../pages/artifacts/EmptyArtifactsPage";
import { getProjectArtifacts, getProjectSRS } from "../../api/artifactsAPI";
import { getToken } from "../../api/authApi";

const BASE_URL = "http://127.0.0.1:8000";

const avatarColors = [
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
];

const getPillStyle = (item) => {
  if (item.all_members_approved)
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (item.approved_members_count > 0)
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300";
};

const getPillText = (item) => {
  if (item.all_members_approved) return "all approved";
  if (item.approved_members_count > 0) return "partial";
  return "pending";
};

const getBarColor = (item) => {
  if (item.all_members_approved) return "bg-emerald-500";
  if (item.approved_members_count > 0) return "bg-amber-400";
  return "bg-red-400";
};

export default function ProjectResults() {
  const navigate = useNavigate();
  const { id: projectId } = useParams();

  const [loading, setLoading] = useState(true);
  const [hasUML, setHasUML] = useState(false);
  const [hasSRS, setHasSRS] = useState(false);
  const [projectName, setProjectName] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [pendingPopup, setPendingPopup] = useState(null); // { label, pending_members }
  const [umlDiagramsBreakdown, setUmlDiagramsBreakdown] = useState([]);
  const [umlBreakdownExpanded, setUmlBreakdownExpanded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const headers = { Authorization: `Bearer ${getToken()}` };

        const [umlData, srsData, approvalRes] = await Promise.all([
          getProjectArtifacts(projectId),
          getProjectSRS(projectId),
          fetch(`${BASE_URL}/api/projects/${projectId}/features/approval-status`, { headers }).then(
            (r) => (r.ok ? r.json() : null)
          ),
        ]);

        // Only count project-level UML/SRS (no session_id)
        const hasUmlNow = umlData.filter((a) => !a.session_id).length > 0;
        setHasUML(hasUmlNow);
        setHasSRS(srsData.filter((a) => !a.session_id).length > 0);
        setApprovalStatus(approvalRes);

        // Per-diagram-type breakdown — only fetched when project-level UML exists, since
        // the aggregate "uml" snapshot above only reflects whichever type was generated last.
        if (hasUmlNow) {
          try {
            const breakdownRes = await fetch(
              `${BASE_URL}/api/projects/${projectId}/features/uml/diagrams-status`,
              { headers }
            );
            if (breakdownRes.ok) {
              setUmlDiagramsBreakdown(await breakdownRes.json());
            }
          } catch {
            // silently fail — the aggregate uml card still renders without the breakdown
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  // ===============================
  // FETCH PROJECT NAME FOR BREADCRUMB
  // ===============================
  useEffect(() => {
    if (!projectId) return;
    fetch(`${BASE_URL}/api/projects/getproject/${projectId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((data) => setProjectName(data.name ?? null))
      .catch(console.error);
  }, [projectId]);

  if (loading) return <p className="p-8 text-gray-400">Loading...</p>;

  // 🔥 KEY CHANGE
  if (!hasUML && !hasSRS) {
    return <EmptyArtifacts projectId={projectId} isSession={false} />;
  }

  const featureMap = {};
  (approvalStatus?.features || []).forEach((f) => {
    featureMap[f.feature] = f;
  });

  const getItem = (key) =>
    featureMap[key] || {
      approved_members_count: 0,
      total_members_count: 0,
      all_members_approved: false,
      current_user_approved: false,
      pending_members: [],
    };

  const umlItem = getItem("uml");
  const srsItem = getItem("srs");

  const renderApprovalFooter = (item, label) => {
    const pct =
      item.total_members_count > 0
        ? Math.round((item.approved_members_count / item.total_members_count) * 100)
        : 0;

    return (
      <>
        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getBarColor(item)}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            {item.approved_members_count}/{item.total_members_count} approved
            {!item.all_members_approved && item.pending_members?.length > 0 && (
              <button
                onClick={() =>
                  setPendingPopup({ label, pending_members: item.pending_members })
                }
                title="View members who haven't approved yet"
                className="flex items-center justify-center w-5 h-5 rounded-full text-gray-400 hover:text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition"
              >
                <span className="material-symbols-outlined text-sm">group</span>
              </button>
            )}
          </span>
        </div>

        {item.current_user_approved && (
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">check_circle</span>
            You approved this
          </p>
        )}
      </>
    );
  };

  return (
    <div className="font-display bg-background-light dark:bg-background-dark min-h-screen flex flex-col items-center py-8 px-4 lg:px-10">

      {/* ================= BREADCRUMB ================= */}
      <div className="flex gap-2 text-sm w-full max-w-[1200px]">
        <button onClick={() => navigate("/projects")} className="text-primary-accent dark:text-secondary-accent font-medium">
          Projects
        </button>
        <span>/</span>
        <button onClick={() => navigate(`/projects/${projectId}`)} className="text-primary-accent dark:text-secondary-accent font-medium">
          {projectName ?? `Project #${projectId}`}
        </button>
        <span>/</span>
        <span>Artifacts</span>
      </div>

      {/* ================= TITLE ================= */}
      <div className="w-full max-w-[1200px] py-4">
        <h1 className="text-3xl md:text-4xl font-black">Artifacts</h1>
      </div>

      {/* ================= CARDS ================= */}
      <div className="mt-6 w-full max-w-[1200px] grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ================= UML CARD ================= */}
        {hasUML && (
          <div className="bg-white dark:bg-[#1a162e] rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-500">account_tree</span>
                <p className="text-sm font-bold text-gray-900 dark:text-white">UML Diagrams</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${getPillStyle(umlItem)}`}>
                {getPillText(umlItem)}
              </span>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              View generated UML diagrams (Usecase, Class, Sequence)
            </p>

            {renderApprovalFooter(umlItem, "UML Diagrams")}

            <div className="flex justify-end">
              <button
                onClick={() => navigate(`/projects/${projectId}/artifacts/uml`, { state: { source: "project" } })}
                className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-lg bg-primary text-white hover:opacity-90 transition"
              >
                <span className="material-symbols-outlined text-xs">open_in_new</span>
                {umlItem.current_user_approved ? "View" : "Review & Approve"}
              </button>
            </div>

            {/* UML has 3 independently-versioned diagram types — the counts above only
                reflect the most recently generated one, so call out per-type status here
                to avoid confusing the user. */}
            {umlDiagramsBreakdown.length > 1 && (
              <div className="pt-2 mt-1 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setUmlBreakdownExpanded((v) => !v)}
                  className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  <span>Per-diagram status</span>
                  <span className="flex items-center gap-0.5 normal-case font-semibold">
                    {umlBreakdownExpanded ? "Show less" : "Show more"}
                    <span className="material-symbols-outlined text-sm">
                      {umlBreakdownExpanded ? "expand_less" : "expand_more"}
                    </span>
                  </span>
                </button>

                {umlBreakdownExpanded && (
                  <div className="flex flex-col gap-1 mt-1.5">
                    {umlDiagramsBreakdown.map((d) => (
                      <div key={d.diagram_type} className="flex items-center justify-between text-[11px]">
                        <span className="capitalize text-gray-600 dark:text-gray-300">
                          {d.diagram_type} ({d.version})
                        </span>
                        <span
                          className={`flex items-center gap-1 font-medium ${
                            d.all_members_approved
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          <span className="material-symbols-outlined text-xs">
                            {d.all_members_approved ? "check_circle" : "schedule"}
                          </span>
                          {d.all_members_approved
                            ? "Approved"
                            : `${d.approved_members_count}/${d.total_members_count}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {umlDiagramsBreakdown.some((d) => !d.all_members_approved) && (
                  <p className="mt-1.5 text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">info</span>
                    Other diagrams need approval{umlBreakdownExpanded ? " — see above." : " — click to view."}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= SRS CARD ================= */}
        {hasSRS && (
          <div className="bg-white dark:bg-[#1a162e] rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">description</span>
                <p className="text-sm font-bold text-gray-900 dark:text-white">SRS Document</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${getPillStyle(srsItem)}`}>
                {getPillText(srsItem)}
              </span>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Software Requirements Specification
            </p>

            {renderApprovalFooter(srsItem, "SRS Document")}

            <div className="flex justify-end">
              <button
                onClick={() => navigate(`/projects/${projectId}/srs/generate`, { state: { source: "project" } })}
                className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-lg bg-primary text-white hover:opacity-90 transition"
              >
                <span className="material-symbols-outlined text-xs">open_in_new</span>
                {srsItem.current_user_approved ? "View" : "Review & Approve"}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Pending approvers popup */}
      {pendingPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setPendingPopup(null)}
          />

          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-[#1a162e] p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Awaiting approval &middot; {pendingPopup.label}
              </h3>
              <button
                onClick={() => setPendingPopup(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {pendingPopup.pending_members.length === 0 ? (
              <p className="text-sm text-gray-400">Everyone has approved.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                {pendingPopup.pending_members.map((m, idx) => (
                  <div
                    key={m.user_id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-white/5"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        avatarColors[idx % avatarColors.length]
                      }`}
                    >
                      {(m.full_name || m.email || "?")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {m.full_name || m.email}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
