import { useNavigate } from "react-router-dom";

export default function ProjectsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen font-display bg-background-light dark:bg-background-dark">

      {/* MAIN */}
      <div className="flex flex-1 flex-col w-full">

        {/* CONTENT */}
        <main className="flex-1 p-8 overflow-y-auto">

          {/* PAGE HEADER */}
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

          {/* PROJECTS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

            <ProjectCard
              title="E-commerce App "
              date="Sep 12, 2025"
              status="Completed"
              color="green"
              onClick={() => navigate("/projects/1")}
            />

            <ProjectCard
              title="Website Redesign Brainstorm"
              date="Oct 26, 2024"
              status="Ongoing"
              color="blue"
              onClick={() => navigate("/projects/2")}
            />

            <ProjectCard
              title="Mobile App Feature Planning"
              date="Nov 02, 2025"
              status="Pending Approval"
              color="amber"
              onClick={() => navigate("/projects/3")}
            />

            <ProjectCard
              title="New API Requirements"
              date="Nov 15, 2025"
              status="Archived"
              color="gray"
              onClick={() => navigate("/projects/4")}
            />

          </div>
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