import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getToken } from "../../api/authApi";

const FEATURES = ["transcript", "requirements", "uml", "srs"];

export default function SessionDetailsPage() {
  const navigate = useNavigate();
  const { id: projectId, sessionId: paramSessionId } = useParams();
  const location = useLocation();

  const sessionIdFromState = location.state?.sessionId;
  const sessionId = paramSessionId || sessionIdFromState;

  const [session, setSession] = useState(null);
  const [members, setMembers] = useState([]);
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState(null);
  const [notification, setNotification] = useState(null);

  // Derive active tab from current path
  const currentPath = location.pathname;
  const getActiveTab = () => {
    if (currentPath.includes("/artifacts")) return "artifacts";
    if (currentPath.includes("/requirements")) return "requirements";
    if (currentPath.includes("/transcript")) return "transcript";
    return "overview";
  };
  const activeTab = getActiveTab();

  const getAuthHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    if (!sessionId) return;

    const load = async () => {
      setLoading(true);
      try {
        const headers = getAuthHeaders();

        const [sessionRes, membersRes, approvalRes] = await Promise.all([
          fetch(`http://127.0.0.1:8000/api/sessions/${sessionId}`, { headers }).then(async (r) => {
            if (!r.ok) throw new Error(`Session fetch failed: ${r.status}`);
            return r.json();
          }),
          fetch(`http://127.0.0.1:8000/api/sessions/${sessionId}/members`, { headers }).then(async (r) => {
            if (!r.ok) throw new Error(`Members fetch failed: ${r.status}`);
            return r.json();
          }),
          fetch(`http://127.0.0.1:8000/api/sessions/${sessionId}/features/approval-status`, { headers }).then(async (r) => {
            if (!r.ok) throw new Error(`Approval status fetch failed: ${r.status}`);
            return r.json();
          }),
        ]);

        setSession(sessionRes);
        const membersList = Array.isArray(membersRes) ? membersRes : [];
        setMembers(membersList);
        setApprovalStatus(approvalRes);

        const resolvedProjectId = projectId || sessionRes?.project_id;
        if (resolvedProjectId) {
          try {
            const projectRes = await fetch(
              `http://127.0.0.1:8000/api/projects/getproject/${resolvedProjectId}`,
              { headers }
            );
            if (projectRes.ok) {
              const projectData = await projectRes.json();
              setProjectName(projectData.name ?? null);
            }
          } catch {
            // silently fail
          }
        }
      } catch (err) {
        console.error("Failed to load session details:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [sessionId, projectId]);

  // Navigate to the feature's dedicated page for reviewing & approving
  const handleNavigateToFeature = (feature) => {
    const resolvedProjectId = projectId || session?.project_id;
    if (feature === "transcript") {
      navigate(`/transcript/${sessionId}`);
    } else if (feature === "requirements") {
      navigate(`/transcript/${sessionId}/requirements`);
     } else if (feature === "uml") {
      navigate(`/projects/${resolvedProjectId}/artifacts/uml`);
    } else if (feature === "srs"){
      navigate(`/projects/${resolvedProjectId}/sessions/${sessionId}/srs/generate`);
    }
  };

  const getStatusStyle = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "active" || s === "in_progress")
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    if (s === "completed" || s === "done")
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300";
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  };

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

  const title = session?.title || `Session #${sessionId}`;
  const status = session?.status || "pending";
  const createdAt = session?.created_at;
  const resolvedProjectId = projectId || session?.project_id;

  const avatarColors = [
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  ];

  // Tab class matches ProjectDetailsPage exactly
  const tabClass = (tab) =>
    `pb-[13px] pt-4 text-sm font-bold border-b-[3px] transition-colors whitespace-nowrap ${
      activeTab === tab
        ? "border-b-primary text-gray-900 dark:text-white"
        : "border-b-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
    }`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading session...
      </div>
    );
  }

  return (
    <div className="w-full font-display min-h-screen bg-gray-50 dark:bg-[#100d1c]">

      {/* ── Header — mirrors ProjectDetailsPage structure exactly ── */}
      <div className="px-4 sm:px-6 lg:px-10 flex flex-1 justify-center">
        <div className="flex flex-col w-full max-w-5xl">

          {/* Breadcrumb */}
          <div className="flex flex-wrap gap-2 text-sm pt-6 mb-3">
            <button
              onClick={() => navigate("/projects")}
              className="text-primary-accent dark:text-secondary-accent font-medium leading-normal"
            >
              Projects
            </button>
            <span className="text-text-dark/50 dark:text-text-light/50 font-medium leading-normal">/</span>
            <button
              onClick={() => navigate(`/projects/${resolvedProjectId}`)}
              className="text-primary-accent dark:text-secondary-accent font-medium leading-normal"
            >
              {projectName ?? "Project"}
            </button>
            <span className="text-text-dark/50 dark:text-text-light/50 font-medium leading-normal">/</span>
            <span className="text-text-dark dark:text-text-light font-medium leading-normal">{title}</span>
          </div>

          {/* Title + meta — same padding/sizing as project page */}
          <div className="flex flex-wrap justify-between items-start gap-4 p-4 pl-0">
            <div className="flex min-w-72 flex-col gap-2">
              <p className="text-gray-900 dark:text-white text-4xl font-black leading-tight">{title}</p>

              {/* Chips — styled identically to project page */}
              <div className="flex gap-3 pt-1 flex-wrap">
                {createdAt && (
                  <span className="flex h-7 items-center rounded-full bg-primary/10 px-3 text-primary text-xs font-medium">
                    Created: {new Date(createdAt).toLocaleDateString()}
                  </span>
                )}
                <span className={`flex h-7 items-center rounded-full px-3 text-xs font-medium ${getStatusStyle(status)}`}>
                  Status: {status.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          </div>

          {/* ── Tabs — each navigates to its own route ── */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-2">
            <div className="flex gap-8">
              <button
                onClick={() =>
                  navigate(
                    `/projects/${resolvedProjectId}/sessions/${sessionId}/sessiondetails`,
                    { state: { sessionId } }
                  )
                }
                className={tabClass("overview")}
              >
                Overview
              </button>
              <button
                onClick={() => navigate(`/transcript/${sessionId}`)}
                className={tabClass("transcript")}
              >
                Transcript
              </button>
              <button
                onClick={() => navigate(`/transcript/${sessionId}/requirements`)}
                className={tabClass("requirements")}
              >
                Requirements
              </button>
              <button
                onClick={() => navigate(`/projects/${resolvedProjectId}/sessions/${sessionId}/artifacts`)}
                className={tabClass("artifacts")}
              >
                Artifacts
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="py-8 space-y-8">

            {/* Members */}
            <section>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                Members ({members.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {members.length === 0 ? (
                  <p className="text-gray-400 text-sm col-span-4">No members found.</p>
                ) : (
                  members.map((member, idx) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-[#1a162e] rounded-xl border border-gray-200 dark:border-gray-700"
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          avatarColors[idx % avatarColors.length]
                        }`}
                      >
                        {(member.full_name || member.email || "?")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {member.full_name || member.email}
                        </p>
                        <p className="text-[11px] text-gray-400 capitalize">
                          {member.role.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Feature Approvals
                - transcript: always shown (a session cannot exist without one)
                - requirements, uml, srs: only shown when item.exists === true
                  (the approval-status endpoint sets exists=true once the artifact is generated)
            */}
            <section>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                Feature Approvals
              </p>
              {(() => {
                // Build a lookup map from the API response
                const featureMap = {};
                (approvalStatus?.features || []).forEach((f) => {
                  featureMap[f.feature] = f;
                });

                // transcript always gets a card; others only if exists
                const visibleFeatures = FEATURES.filter((key) => {
                  if (key === "transcript") return true;
                  return featureMap[key]?.exists === true;
                });

                if (visibleFeatures.length === 0) {
                  return (
                    <p className="text-gray-400 text-sm">No features available yet.</p>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {visibleFeatures.map((key) => {
                      // Use API data if present, otherwise sensible defaults for transcript
                      const item = featureMap[key] || {
                        feature: key,
                        approved_members_count: 0,
                        total_members_count: members.length || 1,
                        current_user_approved: false,
                        all_members_approved: false,
                        exists: key === "transcript", // transcript always exists
                      };

                      const pct =
                        item.total_members_count > 0
                          ? Math.round((item.approved_members_count / item.total_members_count) * 100)
                          : 0;

                      const featureMeta = {
                        transcript:   { label: "Transcript",    icon: "mic",          desc: "Review and approve the session transcript" },
                        requirements: { label: "Requirements",  icon: "checklist",    desc: "Review extracted requirements for this session" },
                        uml:          { label: "UML Diagrams",  icon: "account_tree", desc: "View and approve UML diagrams (Use-case, Class, Sequence)" },
                        srs:          { label: "SRS Document",  icon: "description",  desc: "Review the Software Requirements Specification" },
                      }[key] || { label: key.replace(/_/g, " "), icon: "folder", desc: "" };

                      return (
                        <div
                          key={key}
                          className="bg-white dark:bg-[#1a162e] rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition flex flex-col gap-3"
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-purple-500">{featureMeta.icon}</span>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{featureMeta.label}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${getPillStyle(item)}`}>
                              {getPillText(item)}
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-gray-500 dark:text-gray-400">{featureMeta.desc}</p>

                          {/* Progress bar */}
                          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${getBarColor(item)}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                              {item.approved_members_count}/{item.total_members_count} approved
                            </span>
                            <button
                              onClick={() => handleNavigateToFeature(key)}
                              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-lg bg-primary text-white hover:opacity-90 transition"
                            >
                              <span className="material-symbols-outlined text-xs">open_in_new</span>
                              {item.current_user_approved ? "View" : "Review & Approve"}
                            </button>
                          </div>

                          {item.current_user_approved && (
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">check_circle</span>
                              You approved this
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </section>

          </div>
        </div>
      </div>

      {/* Toast */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-xl flex gap-3 border z-50 ${
            notification.type === "success"
              ? "bg-white dark:bg-[#1a162e] border-emerald-500/30"
              : "bg-white dark:bg-[#1a162e] border-red-500/30"
          }`}
        >
          <span
            className={`material-symbols-outlined ${
              notification.type === "success" ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {notification.type === "success" ? "check_circle" : "cancel"}
          </span>
          <p className="font-bold text-sm">{notification.message}</p>
        </div>
      )}
    </div>
  );
}