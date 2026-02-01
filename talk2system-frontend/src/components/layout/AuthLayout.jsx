import { NavLink, Outlet } from "react-router-dom";

export default function AuthLayout() {
  const linkClasses = ({ isActive }) =>
    `text-sm font-semibold transition-colors
     ${
       isActive
         ? "text-primary"
         : "text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white"
     }`;

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark text-[#1F2937] dark:text-gray-200">

      {/* Header */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-4 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-background-dark/80 backdrop-blur-sm">
        
        {/* Logo → Home */}
        <NavLink
          to="/"
          className="flex items-center gap-3 text-[#100d1c] dark:text-white hover:opacity-90 transition-opacity"
        >
          <div className="size-8 text-primary">
            <svg fill="none" viewBox="0 0 48 48">
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M39.475 21.6262C40.358 21.4363..."
              />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">
            Talk2System
          </span>
        </NavLink>

        {/* Auth Links */}
        <nav className="flex items-center gap-6">
          <NavLink to="/login" className={linkClasses}>
            Login
          </NavLink>
          <NavLink to="/signup" className={linkClasses}>
            Sign up
          </NavLink>
        </nav>
      </header>

      {/* Page Content */}
      <main className="flex-grow flex items-center justify-center px-4 py-10">
        <Outlet />
      </main>
    </div>
  );
}
