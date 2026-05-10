import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchMyProjects, sendJoinRequest, fetchProjects } from "../../api/projectApi";
import { isAdmin } from "../../api/authApi";
import { useTranslation } from "../../hooks/useTranslation";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [myProjects, setMyProjects]   = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const { t } = useTranslation();
  // Join modal
  const [showJoinModal, setShowJoinModal]           = useState(false);
  const [joinProjectId, setJoinProjectId]           = useState("");
  const [joinLoading, setJoinLoading]               = useState(false);
  const [joinError, setJoinError]                   = useState("");
  const [joinSuccess, setJoinSuccess]               = useState("");

  useEffect(() => {
    Promise.all([fetchMyProjects(), fetchProjects()])
      .then(([mine, all]) => {
        setMyProjects(mine);
        setAllProjects(all);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // projects not already mine available to join
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
      // Send the domain directly from the selectedProject object
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

  // Check if user can add participants (admin or PM of project)
  const canAddParticipants = (project) => {
    return isAdmin() || project.user_role === "project_manager";
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
            <div className="flex gap-3">
              {/* Removed joinableProjects.length > 0 so button ALWAYS shows */}
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
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {myProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  canAddParticipants={canAddParticipants(project)}
                  onNavigate={() => navigate(`/projects/${project.id}`)}
                  onAddParticipant={(e) => {
                    e.stopPropagation();
                    navigate(`/projects/${project.id}/add-participant`);
                  }}
                  t={t}
                />
              ))}
            </div>
          )}

        </main>
      </div>

      {/* JOIN MODAL */}
      {showJoinModal && (
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
                      {/* Only show project name now */}
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">
                  {t("confirmDomain")}{" "}
                  <span className="text-gray-400 font-normal">{t("autoFilledFromDB")}</span>
                </label>
                <input
                  type="text"
                  value={selectedProject?.domain || ""}
                  readOnly
                  placeholder={t("selectProjectAbove")}
                  className="w-full h-11 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm opacity-70 cursor-not-allowed"
                />
              </div>

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
    </div>
  );
}

function ProjectCard({ project, canAddParticipants, onNavigate, onAddParticipant, t }) {
  return (
    <div
      onClick={onNavigate}
      className="flex flex-col rounded-xl shadow bg-white dark:bg-[#1C192B] hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
    >
      <div className="p-5 flex flex-col gap-3">
        <p className="text-lg font-bold">{project.name}</p>
        {project.domain && (
          <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full w-fit">
            {project.domain}
          </span>
        )}
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 w-fit">
          {project.project_status}
        </span>
        <p className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <span className="material-symbols-outlined text-sm">calendar_today</span>
          {t("created")} {new Date(project.created_at).toLocaleDateString()}
        </p>
        

        {/* ADD PARTICIPANT BUTTON - Only for Admin/PM */}
        {canAddParticipants && (
          <button
            onClick={onAddParticipant}
            className="mt-2 flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-bold hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            {t("addParticipant")}
          </button>
        )}
      </div>
    </div>
  );
}