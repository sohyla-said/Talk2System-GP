import { NavLink } from "react-router-dom";

export default function Header() {
  const navLinkClasses = ({ isActive }) =>
    `flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-bold tracking-[0.015em]
     text-gray-500 dark:text-gray-400
     hover:text-primary dark:hover:text-white
     hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors
     ${
       isActive
         ? "bg-primary/10 dark:bg-primary/20 text-primary dark:text-indigo-300 shadow-md"
         : ""
     }`;

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 dark:border-gray-700 px-6 sm:px-10 py-4 bg-white/80 dark:bg-background-dark/80 backdrop-blur-sm sticky top-0 z-20">

      {/* LEFT: Logo + App Name → Home */}
      <NavLink
        to="/"
        className="flex items-center gap-4 text-[#100d1c] dark:text-white hover:opacity-90 transition-opacity"
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
        <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">
          Talk2System
        </h2>
      </NavLink>

      {/* CENTER: NAV LINKS (Desktop only) */}
      <nav className="hidden lg:flex items-center gap-2">
        <NavLink to="/dashboard" className={navLinkClasses}>
          <span className="material-symbols-outlined text-xl">grid_view</span>
          Dashboard
        </NavLink>

        <NavLink to="/projects" className={navLinkClasses}>
          <span className="material-symbols-outlined text-xl">folder</span>
          Projects
        </NavLink>
      </nav>
    </header>
  );
}
