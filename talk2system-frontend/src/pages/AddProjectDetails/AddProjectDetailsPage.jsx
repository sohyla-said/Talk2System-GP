export default function AddProjectDetailsPage() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">

      {/* PAGE CONTAINER */}
      <div className="max-w-[960px] mx-auto px-4 sm:px-8 py-6">

        {/* BACK LINK */}
        <div className="mb-6">
          <a
            href="/projects"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors group"
          >
            <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">
              arrow_back
            </span>
            Back to Projects List
          </a>
        </div>

        {/* TITLE */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-[#100d1c] dark:text-white">
            Add Project Details
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Enter the details below to create a new project workspace.
          </p>
        </div>

        {/* FORM CARD */}
        <div className="bg-white dark:bg-background-dark/50 border border-gray-200 dark:border-white/5 rounded-xl shadow">
          <div className="p-6 md:p-8">

            <form className="space-y-6 max-w-3xl">

              {/* PROJECT NAME */}
              <div>
                <label className="block text-sm font-bold mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Talk2System Mobile App"
                  className="w-full rounded-lg bg-background-light dark:bg-background-dark/80 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="block text-sm font-bold mb-1">
                  Description
                </label>
                <textarea
                  rows={5}
                  placeholder="Describe the project scope, main features, and objectives..."
                  className="w-full rounded-lg bg-background-light dark:bg-background-dark/80 px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* DOMAIN */}
              <div>
                <label className="block text-sm font-bold mb-1">
                  Domain
                </label>
                <input
                  type="text"
                  placeholder="e.g. Healthcare, Fintech, Education"
                  className="w-full rounded-lg bg-background-light dark:bg-background-dark/80 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* ACTIONS */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
                >
                  <span className="material-symbols-outlined">save</span>
                  Create Project
                </button>

                <a
                  href="/projects"
                  className="px-6 py-2.5 rounded-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  Cancel
                </a>
              </div>

            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
