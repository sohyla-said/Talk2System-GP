import { NavLink, useNavigate } from "react-router-dom";
import { logout, getCurrentUser } from "../../api/authApi";

export default function Header() {
  const navigate = useNavigate();
  const user = getCurrentUser();

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

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="
      h-14 flex items-center justify-between
      whitespace-nowrap
      border-b border-gray-200 dark:border-gray-700
      px-6 sm:px-10 py-2
      bg-white/80 dark:bg-background-dark/80
      backdrop-blur-sm sticky top-0 z-20
    ">

      {/* LEFT: Logo */}
      <NavLink
        to="/"
        className="flex items-center gap-4 text-[#100d1c] dark:text-white hover:opacity-90 transition-opacity"
      >
        <img
          src="/logo.png"
          alt="Talk2System Logo"
          className="h-12 w-auto object-contain"
          onError={(e) => {
            e.target.onerror = null;
            e.target.style.display = "none";
          }}
        />
      </NavLink>

      {/* RIGHT: Nav links + user info + logout */}
      <div className="flex items-center gap-2 ml-auto">
        <NavLink to="/dashboard" className={navLinkClasses}>
          <span className="material-symbols-outlined text-xl">grid_view</span>
          Dashboard
        </NavLink>
        <NavLink to="/projects" className={navLinkClasses}>
          <span className="material-symbols-outlined text-xl">folder</span>
          Projects
        </NavLink>

        {/* ── User info ── */}
        {user?.email && (
          <div className="hidden md:flex flex-col items-end ml-2">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              {user.email}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
              {user.role?.replace("_", " ")}
            </span>
          </div>
        )}

        {/* ── Avatar ── */}
        <div
          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 ring-2 ring-white dark:ring-white/10 ml-2"
          style={{
            backgroundImage:
              'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAYI0aZKZE-VvkXhyWW_VwkFYcUyP5A363tXUVEJZI9IQnWLJZSWjkFjtum-9r3XSE2aVD8q0YI0GfCRdJIxBSKtp1Pfg7Zry0Fg84eK_N5mwr1GqwzCX5COa-xlc7aG6bGFjmklNozxNTGIxUGljxMdlZpIqIXGUGLRmHxXS6AL7I-lCz2VrQSTwq5dhA_r_SWqg4nvlg-lRdrXoX43iLvC3H9IyvL34_D9I_8Tj5CeSXFfNTeXhfQNhKm9MM-1TFcXFSXs8dmwWAe")',
          }}
        />

        {/* ── Logout button ── */}
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
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}