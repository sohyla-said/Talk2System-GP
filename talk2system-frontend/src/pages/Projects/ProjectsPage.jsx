import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // fetch projects from backend
  const fetchProjects = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/projects/getprojects");
      const data = await res.json();
      setProjects(data);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  // LOAD ON PAGE OPEN
  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <div className="flex min-h-screen font-display bg-background-light dark:bg-background-dark">

      <div className="flex flex-1 flex-col w-full">

        <main className="flex-1 p-8 overflow-y-auto">

          {/* HEADER */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-4xl font-black text-[#1F2937] dark:text-white">
              Projects
            </h2>

            <button
              onClick={() => navigate("/projects/new")}
              className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-white font-bold"
            >
              <span className="material-symbols-outlined">add</span>
              Create New Project
            </button>
          </div>

          {/* LOADING */}
          {loading ? (
            <p>Loading projects...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

              {/* DYNAMIC PROJECTS */}
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  title={project.name}
                  date={new Date(project.created_at).toLocaleDateString()}
                  status={project.project_status}
                  color="blue"
                  onClick={() => navigate(`/projects/${project.id}`)}
                />
              ))}

              {/* EMPTY STATE */}
              {projects.length === 0 && (
                <p className="text-gray-500">No projects yet</p>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

/* ---------------------------------- */
/* PROJECT CARD COMPONENT              */
/* ---------------------------------- */
function ProjectCard({ title, date, status, color, onClick }) {
  const colorMap = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    amber:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    green:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    gray:
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <div
      onClick={onClick}
      className="
        flex flex-col rounded-xl shadow bg-white dark:bg-[#1C192B]
        hover:shadow-lg hover:-translate-y-1
        transition-all cursor-pointer
      "
    >
      <div className="p-5 flex flex-col gap-4">
        <p className="text-lg font-bold">{title}</p>
        <p className="text-sm text-gray-500">Created on {date}</p>

        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${colorMap[color]}`}
        >
          <span className={`w-1.5 h-1.5 mr-1.5 rounded-full bg-${color}-500`} />
          {status}
        </span>
      </div>
    </div>
  );
}