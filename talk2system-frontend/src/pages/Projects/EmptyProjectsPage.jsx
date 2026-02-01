import { useNavigate } from "react-router-dom";

export default function EmptyProjectsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen font-display bg-background-light dark:bg-background-dark">

      {/* Main Content */}
      <div className="flex flex-1 flex-col w-full">
        
        {/* Empty State */}
        <main className="flex-1 px-6 sm:px-10 lg:px-16 flex items-center justify-center">
          <div
            className="
              flex flex-col items-center text-center
              w-full max-w-2xl
              bg-white dark:bg-[#1C192B]
              p-14 sm:p-16
              rounded-2xl
              border-2 border-dashed
              shadow-sm
            "
          >
            <span className="material-symbols-outlined text-7xl text-primary mb-6">
              add_circle
            </span>

            <h3 className="text-3xl font-black mb-4">
              No Projects Yet
            </h3>

            <p className="text-gray-500 text-lg max-w-md mb-8">
              Start a new project to convert meetings into transcripts and documentation.
            </p>

            {/* Create First Project */}
            <button
              onClick={() => navigate("/projects/new")}
              className="
                flex items-center justify-center gap-2
                px-8 py-4
                rounded-xl
                bg-primary text-white
                text-base font-bold
                shadow-lg shadow-primary/25
                hover:bg-primary/90
                transition
              "
            >
              <span className="material-symbols-outlined text-xl">add</span>
              <span>Create Your First Project</span>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
