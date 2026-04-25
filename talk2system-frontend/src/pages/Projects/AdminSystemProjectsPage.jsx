import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAdminProjects, adminDeleteProject, fetchAdminProjectMembers, adminChangePM, removeParticipant } from "../../api/projectApi";

export default function AdminSystemProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [modalProject, setModalProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [newPmEmail, setNewPmEmail] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");
  
  // Search state for modal members
  const [memberSearch, setMemberSearch] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

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

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return;
    try {
      await adminDeleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (showModal && modalProject?.id === id) setShowModal(false);
    } catch (err) {
      alert(err.message);
    }
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
      alert(err.message);
    }
  };

  const handleRemoveMember = async (projectId, userId, email) => {
    if (!confirm(`Remove ${email} from this project?`)) return;
    try {
      await removeParticipant(projectId, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (err) {
      setModalError(err.message);
    }
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
        setModalProject(null); // Clear old data
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

  if (loading) return <p className="p-8 text-gray-400">Loading system projects...</p>;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-[#100d1c] dark:text-white">System Projects</h1>
            <p className="text-gray-500 mt-1">Full control over all projects in the system.</p>
          </div>
          <button onClick={() => navigate("/projects/new-admin")} className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-white font-bold">
            <span className="material-symbols-outlined">add</span>
            Create New Project
          </button>
        </div>

        {projects.length === 0 ? (
          <p className="text-gray-400 text-center py-20">No projects in the system.</p>
        ) : (
          <div className="bg-white dark:bg-[#1a162e] rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#231e3d] text-left">
                <tr>
                  <th className="px-6 py-4 font-bold">Project Name</th>
                  <th className="px-6 py-4 font-bold">Domain</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const pmTerminated = p.pm_status === "terminated" || p.pm_status === "suspended";
                  
                  return (
                    <tr 
                      key={p.id} 
                      className={`border-t hover:bg-gray-50 dark:hover:bg-[#1a162e] ${pmTerminated ? "bg-red-50/50 dark:bg-red-900/10" : ""}`}
                    >
                      <td className="px-6 py-4 font-medium">
                        {p.name}
                        {pmTerminated && (
                          <span className="block text-xs text-red-500 font-bold mt-1">
                            ⚠️ Project Manager is {p.pm_status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500">{p.domain || "—"}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">{p.status}</span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        
                        {pmTerminated ? (
                          <button 
                            onClick={() => openMemberModal(p)} 
                            className="px-3 py-1 bg-orange-500 text-white rounded text-xs font-bold hover:bg-orange-600 transition-colors"
                          >
                            <span className="inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">swap_horiz</span>
                              Reassign PM
                            </span>
                          </button>
                        ) : (
                          <>
                            <button 
                              onClick={() => navigate(`/projects/${p.id}/add-participant`)} 
                              className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded text-xs font-bold hover:bg-emerald-100 transition-colors"
                            >
                              <span className="inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">person_add</span>
                                Add Participant
                              </span>
                            </button>
                            <button onClick={() => openMemberModal(p)} className="px-3 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold hover:bg-blue-100">Manage Team</button>
                          </>
                        )}
                        
                        <button onClick={() => handleDelete(p.id, p.name)} className="px-3 py-1 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100">Delete Project</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MEMBERS MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a162e] rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="text-xl font-black">{modalProject?.name} - Team</h2>
                {modalProject?.pm_status === "terminated" && (
                  <p className="text-sm text-red-500 font-bold mt-1">
                    ⚠️ Manager is terminated. Please assign a new PM below.
                  </p>
                )}
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              {modalError && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded">{modalError}</p>}
              {modalSuccess && <p className="text-emerald-500 text-sm bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded">{modalSuccess}</p>}

              {/* CURRENT PROJECT MANAGER INFO */}
              {currentPM && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/20">
                  <span className="material-symbols-outlined text-primary text-xl">badge</span>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      Current Manager: {currentPM.full_name || "Unknown"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {currentPM.email}
                    </p>
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
                  {filteredMembers.map((m) => (
                    <div key={m.user_id} className="flex items-center justify-between bg-gray-50 dark:bg-[#231e3d] p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 flex-shrink-0"
                          style={{
                            backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name || "User")})`
                          }}
                        />
                        <div>
                          <p className="font-bold text-sm">{m.full_name || "No Name"}</p>
                          <p className="text-xs text-gray-500">{m.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          m.role === "project_manager" ? "bg-primary text-white" : "bg-gray-200 text-gray-700 dark:bg-gray-600"
                        }`}>
                          {m.role.replace("_", " ")}
                        </span>
                        {m.role !== "project_manager" && (
                          <button onClick={() => handleRemoveMember(modalProject.id, m.user_id, m.email)} className="text-red-500 text-xs hover:underline">Remove</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* CHANGE PM FORM */}
              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-bold mb-2">Assign new Project Manager:</p>
                <form onSubmit={handleChangePM} className="flex gap-2">
                  <input type="email" required placeholder="new-manager@example.com" value={newPmEmail} onChange={(e) => setNewPmEmail(e.target.value)} className="flex-1 px-3 py-2 rounded border dark:bg-slate-800 text-sm" />
                  <button type="submit" className="px-4 py-2 bg-primary text-white rounded text-sm font-bold">Change PM</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}