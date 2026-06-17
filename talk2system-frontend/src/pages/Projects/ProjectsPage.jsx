import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchMyProjects, sendJoinRequest, fetchProjects, requestLeaveProject } from "../../api/projectApi";
import { isAdmin, getCurrentUser } from "../../api/authApi";
import { useTranslation } from "../../hooks/useTranslation";

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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {myProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isSuspended={isSuspended}
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

function ProjectCard({ project, isSuspended, onNavigate, onLeave, t }) {
  const isProjectSuspended = project.project_status === "suspended";
  const hasPendingLeave = project.has_pending_leave_request;

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
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold w-fit ${
            isProjectSuspended
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          }`}>
            {isProjectSuspended ? "suspended" : project.project_status}
          </span>
          {project.user_role === "project_manager" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary w-fit">
              <span className="material-symbols-outlined text-xs">badge</span>
              PM
            </span>
          )}
        </div>

        {/* Bottom row: date on left, leave icon on right */}
        <div className="flex items-center justify-between mt-1">
          <p className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <span className="material-symbols-outlined text-sm">calendar_today</span>
            {t("created")} {new Date(project.created_at).toLocaleDateString()}
          </p>

          {hasPendingLeave ? (
            <span
              title="Leave request pending"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-base">hourglass_empty</span>
            </span>
          ) : (
            <button
              onClick={onLeave}
              title="Leave project"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20 text-red-400 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-500 transition-colors"
            >
              <span className="material-symbols-outlined text-base">exit_to_app</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
