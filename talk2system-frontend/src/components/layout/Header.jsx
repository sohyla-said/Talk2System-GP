import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { logout, getCurrentUser, isAdmin } from "../../api/authApi";
import { fetchMyRole } from "../../api/projectApi";
import NotificationBell from "./NotificationBell";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const projectPath = isAdmin() ? "/projects/system-projects" : "/projects";

  const [projectRole, setProjectRole] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const match = location.pathname.match(/^\/projects\/(\d+)(\/|$)/);
    if (match) {
      const projectId = match[1];
      fetchMyRole(projectId)
        .then((data) => setProjectRole(data.role))
        .catch(() => setProjectRole(null));
    } else if (
      location.pathname === "/dashboard" ||
      location.pathname === "/projects" ||
      location.pathname === "/projects/system-projects" ||
      location.pathname === "/"
    ) {
      setProjectRole(null);
    }
  }, [location.pathname]);

  const displayRole = projectRole || user?.role;

  const navLinkClasses = ({ isActive }) =>
    `flex items-center gap-2 h-10 px-3 lg:px-4 rounded-lg text-sm font-bold tracking-[0.015em]
     text-gray-500 dark:text-gray-400
     hover:text-primary dark:hover:text-white
     hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors
     ${isActive ? "bg-primary/10 dark:bg-primary/20 text-primary dark:text-indigo-300 shadow-md" : ""}`;

  const navLabel = "hidden lg:inline";

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="
      h-14 flex items-center justify-between
      border-b border-gray-200 dark:border-gray-700
      px-4 sm:px-6 lg:px-10 py-2
      bg-white/80 dark:bg-background-dark/80
      backdrop-blur-sm sticky top-0 z-20
    ">

      {/* LEFT: Logo */}
      <NavLink
        to="/"
        className="flex items-center gap-4 text-[#100d1c] dark:text-white hover:opacity-90 transition-opacity shrink-0"
      >
        <img
          src="/logo.png"
          alt="Talk2System Logo"
          className="h-12 w-auto object-contain"
          onError={(e) => { e.target.onerror = null; e.target.style.display = "none"; }}
        />
      </NavLink>

      {/* RIGHT: Desktop nav (hidden on mobile, visible from md/tablet up) */}
      <div className="hidden md:flex items-center gap-1 lg:gap-2 ml-auto">
        <NavLink to="/dashboard" className={navLinkClasses}>
          <span className="material-symbols-outlined text-xl">grid_view</span>
          <span className={navLabel}>Dashboard</span>
        </NavLink>
        <NavLink to={projectPath} className={navLinkClasses}>
          <span className="material-symbols-outlined text-xl">folder</span>
          <span className={navLabel}>Projects</span>
        </NavLink>
        {isAdmin() && (
          <NavLink to="/admin/all-users" className={navLinkClasses}>
            <span className="material-symbols-outlined text-xl">manage_accounts</span>
            <span className={navLabel}>Users</span>
          </NavLink>
        )}
        {!isAdmin() && <NotificationBell />}

        {/* User info */}
        {user?.email && (
          <div className="flex flex-col items-end ml-2">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              {user.full_name}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
              {displayRole?.replace("_", " ") || user.role?.replace("_", " ")}
            </span>
          </div>
        )}

        {/* Avatar */}
        <div
          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 ring-2 ring-white dark:ring-white/10 ml-2"
          style={{
            backgroundImage:
              'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAYI0aZKZE-VvkXhyWW_VwkFYcUyP5A363tXUVEJZI9IQnWLJZSWjkFjtum-9r3XSE2aVD8q0YI0GfCRdJIxBSKtp1Pfg7Zry0Fg84eK_N5mwr1GqwzCX5COa-xlc7aG6bGFjmklNozxNTGIxUGljxMdlZpIqIXGUGLRmHxXS6AL7I-lCz2VrQSTwq5dhA_r_SWqg4nvlg-lRdrXoX43iLvC3H9IyvL34_D9I_8Tj5CeSXFfNTeXhfQNhKm9MM-1TFcXFSXs8dmwWAe")',
          }}
        />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 h-10 px-3 rounded-lg text-sm font-bold
            text-gray-500 dark:text-gray-400
            hover:text-red-500 dark:hover:text-red-400
            hover:bg-red-50 dark:hover:bg-red-900/20
            transition-colors ml-1"
          title="Logout"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
          <span className="hidden xl:inline">Logout</span>
        </button>
      </div>

      {/* RIGHT: Mobile controls (visible only below md) */}
      <div className="flex md:hidden items-center gap-2 ml-auto">
        {!isAdmin() && <NotificationBell />}

        {/* Avatar (always visible) */}
        <div
          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 ring-2 ring-white dark:ring-white/10"
          style={{
            backgroundImage:
              'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAYI0aZKZE-VvkXhyWW_VwkFYcUyP5A363tXUVEJZI9IQnWLJZSWjkFjtum-9r3XSE2aVD8q0YI0GfCRdJIxBSKtp1Pfg7Zry0Fg84eK_N5mwr1GqwzCX5COa-xlc7aG6bGFjmklNozxNTGIxUGljxMdlZpIqIXGUGLRmHxXS6AL7I-lCz2VrQSTwq5dhA_r_SWqg4nvlg-lRdrXoX43iLvC3H9IyvL34_D9I_8Tj5CeSXFfNTeXhfQNhKm9MM-1TFcXFSXs8dmwWAe")',
          }}
        />

        {/* Hamburger button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center justify-center w-10 h-10 rounded-lg
            text-gray-500 dark:text-gray-400
            hover:bg-gray-100 dark:hover:bg-gray-800
            transition-colors"
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined text-2xl">
            {menuOpen ? "close" : "menu"}
          </span>
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="
          md:hidden absolute top-14 left-0 right-0
          bg-white dark:bg-background-dark
          border-b border-gray-200 dark:border-gray-700
          shadow-xl z-30
          px-4 py-3 flex flex-col gap-1
        ">
          {/* User info row */}
          {user?.email && (
            <div className="flex items-center gap-3 px-3 py-2 mb-1 border-b border-gray-100 dark:border-gray-700">
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 ring-2 ring-white dark:ring-white/10 shrink-0"
                style={{
                  backgroundImage:
                    'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAYI0aZKZE-VvkXhyWW_VwkFYcUyP5A363tXUVEJZI9IQnWLJZSWjkFjtum-9r3XSE2aVD8q0YI0GfCRdJIxBSKtp1Pfg7Zry0Fg84eK_N5mwr1GqwzCX5COa-xlc7aG6bGFjmklNozxNTGIxUGljxMdlZpIqIXGUGLRmHxXS6AL7I-lCz2VrQSTwq5dhA_r_SWqg4nvlg-lRdrXoX43iLvC3H9IyvL34_D9I_8Tj5CeSXFfNTeXhfQNhKm9MM-1TFcXFSXs8dmwWAe")',
                }}
              />
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {user.full_name}
                </p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                  {displayRole?.replace("_", " ") || user.role?.replace("_", " ")}
                </span>
              </div>
            </div>
          )}

          {/* Nav links */}
          <NavLink to="/dashboard" className={navLinkClasses}>
            <span className="material-symbols-outlined text-xl">grid_view</span>
            Dashboard
          </NavLink>
          <NavLink to={projectPath} className={navLinkClasses}>
            <span className="material-symbols-outlined text-xl">folder</span>
            Projects
          </NavLink>
          {isAdmin() && (
            <NavLink to="/admin/all-users" className={navLinkClasses}>
              <span className="material-symbols-outlined text-xl">manage_accounts</span>
              Users
            </NavLink>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-bold
              text-gray-500 dark:text-gray-400
              hover:text-red-500 dark:hover:text-red-400
              hover:bg-red-50 dark:hover:bg-red-900/20
              transition-colors mt-1"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            Logout
          </button>
        </div>
      )}
    </header>
  );
}