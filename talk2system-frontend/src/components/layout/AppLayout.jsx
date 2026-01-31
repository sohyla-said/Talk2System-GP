import { useLocation } from "react-router-dom";

export default function AppLayout({ children }) {
  const location = useLocation(); // get current path
  const currentPath = location.pathname;

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-[#1F2937] dark:text-gray-200">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 dark:border-gray-700 px-6 sm:px-10 py-4 bg-white/80 dark:bg-background-dark/80 backdrop-blur-sm sticky top-0 z-20">

        {/* LEFT: Logo + App Name */}
        <div className="flex items-center gap-4 text-[#100d1c] dark:text-white">
          <div className="size-8 text-primary">
            <svg fill="none" viewBox="0 0 48 48">
              <path fill="currentColor" fillRule="evenodd" d="M39.475 21.6262C40.358 21.4363..." />
            </svg>
          </div>
          <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">Talk2System</h2>
        </div>

        {/* CENTER: NAV LINKS (Desktop only) */}
        <div className="hidden lg:flex items-center gap-2">
          <a
            href="/dashboard"
            className={`flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-bold tracking-[0.015em]
                        text-gray-500 dark:text-gray-400
                        hover:text-primary dark:hover:text-white
                        hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors
                        ${currentPath === "/dashboard" ? "bg-primary/10 dark:bg-primary/20 text-primary dark:text-indigo-300 shadow-md" : ""}`}
          >
            <span className="material-symbols-outlined text-xl">grid_view</span>
            Dashboard
          </a>

          <a
            href="/projects"
            className={`flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-bold tracking-[0.015em]
                        text-gray-500 dark:text-gray-400
                        hover:text-primary dark:hover:text-white
                        hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors
                        ${currentPath === "/projects" ? "bg-primary/10 dark:bg-primary/20 text-primary dark:text-indigo-300 shadow-md" : ""}`}
          >
            <span className="material-symbols-outlined text-xl">folder</span>
            Projects
          </a>
        </div>
      </header>

      <main className="flex-grow w-full max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      <footer className="w-full text-center p-4 mt-8 text-gray-500 dark:text-gray-400">
        © 2024 Talk2System. All rights reserved.
      </footer>
    </div>
  );
}
