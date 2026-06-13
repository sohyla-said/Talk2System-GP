import { useState, useEffect } from "react";
import { useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { logout, getCurrentUser, isAdmin } from "../../api/authApi";
import { fetchMyRole } from "../../api/projectApi";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import LangToggle from "./LangToggle";
import { useTranslation } from "../../hooks/useTranslation";

const DEFAULT_AVATAR = "https://lh3.googleusercontent.com/aida-public/AB6AXuAYI0aZKZE-VvkXhyWW_VwkFYcUyP5A363tXUVEJZI9IQnWLJZSWjkFjtum-9r3XSE2aVD8q0YI0GfCRdJIxBSKtp1Pfg7Zry0Fg84eK_N5mwr1GqwzCX5COa-xlc7aG6bGFjmklNozxNTGIxUGljxMdlZpIqIXGUGLRmHxXS6AL7I-lCz2VrQSTwq5dhA_r_SWqg4nvlg-lRdrXoX43iLvC3H9IyvL34_D9I_8Tj5CeSXFfNTeXhfQNhKm9MM-1TFcXFSXs8dmwWAe";

function UserAvatar({ size = "md", editable = false, avatarUrl, onAvatarChange, t }) {
  const fileInputRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const sizeClasses = { sm: "size-8", md: "size-10", lg: "size-12" };
  const hasCustomAvatar = avatarUrl && avatarUrl !== DEFAULT_AVATAR;

  useEffect(() => {
    const handleAvatarUpdate = (e) => {
      onAvatarChange?.(e.detail);
    };
    window.addEventListener("avatar-updated", handleAvatarUpdate);
    return () => window.removeEventListener("avatar-updated", handleAvatarUpdate);
  }, [onAvatarChange]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Image must be less than 2MB"); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      localStorage.setItem("user_avatar", base64);
      onAvatarChange?.(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    setDropdownOpen(false);
  };

  const handleRemove = () => {
    localStorage.removeItem("user_avatar");
    onAvatarChange?.(null);
    setDropdownOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => editable && setDropdownOpen(!dropdownOpen)}
        className={`bg-center bg-no-repeat aspect-square bg-cover rounded-full ring-2 ring-white dark:ring-white/10 ${sizeClasses[size]} ${editable ? "cursor-pointer hover:ring-primary/50 transition-all" : ""}`}
        style={{ backgroundImage: `url("${avatarUrl || DEFAULT_AVATAR}")` }}
      />
      {editable && (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary border-2 border-white dark:border-gray-900 flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-[10px] leading-none">edit</span>
        </div>
      )}
      {editable && dropdownOpen && (
        <div className="absolute top-full mt-2 end-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 py-1 min-w-[160px]">
          <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <span className="material-symbols-outlined text-lg text-primary">photo_camera</span>
            {t?.("changePhoto") || "Change Photo"}
          </button>
          {hasCustomAvatar && (
            <button onClick={handleRemove} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <span className="material-symbols-outlined text-lg">delete</span>
              {t?.("removePhoto") || "Remove Photo"}
            </button>
          )}
        </div>
      )}
      {editable && <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />}
    </div>
  );
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const projectPath = isAdmin() ? "/projects/system-projects" : "/projects";

  const [projectRole, setProjectRole] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const { t, dir } = useTranslation();
  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);
  
  // load saved avatar from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("user_avatar");
    if (saved) setAvatarUrl(saved);
  }, []);

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
    localStorage.removeItem("user_avatar");
    logout();
    navigate("/login");
  }

  return (
    <header dir={dir} className="
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
        {/* Light Mode Logo */}
        <img
          src="/logo.png"
          alt="Talk2System Logo"
          className="h-12 w-auto object-contain block dark:hidden"
          onError={(e) => { e.target.onerror = null; e.target.style.display = "none"; }}
        />
        {/* Dark Mode Logo */}
        <img
          src="/Darkmode_logo.png"
          alt="Talk2SystemLogo"
          className="h-12 w-auto object-contain hidden dark:block"
          onError={(e) => { e.target.onerror = null; e.target.style.display = "none"; }}
        />
      </NavLink>

      {/* RIGHT: Desktop nav (hidden on mobile, visible from md/tablet up) */}
      <div className="hidden md:flex items-center gap-1 lg:gap-2 ms-auto">
        <NavLink to="/dashboard" className={navLinkClasses}>
          <span className="material-symbols-outlined text-xl">grid_view</span>
          <span className={navLabel}>{t("dashboard")}</span>
        </NavLink>
        <NavLink to={projectPath} className={navLinkClasses}>
          <span className="material-symbols-outlined text-xl">folder</span>
          <span className={navLabel}>{t("projects")}</span>
        </NavLink>
        {isAdmin() && (
          <NavLink to="/admin/all-users" className={navLinkClasses}>
            <span className="material-symbols-outlined text-xl">manage_accounts</span>
            <span className={navLabel}>{t("users")}</span>
          </NavLink>
        )}
        {!isAdmin() && <NotificationBell />}
        
        {/* ── Theme Toggle ── */}
        <ThemeToggle />
        <LangToggle />
        {/* User info */}
        {user?.email && (
          <div className="flex flex-col items-end ms-2">
            <NavLink to="/profile" className="text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-primary transition-colors flex items-center gap-1">
              {user.full_name}
            </NavLink>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
              {displayRole?.replace("_", " ") || user.role?.replace("_", " ")}
            </span>
          </div>
        )}

        {/* Avatar */}
        <div className="ms-2">
          <UserAvatar size="md" editable={true} avatarUrl={avatarUrl} onAvatarChange={setAvatarUrl} t={t} />
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 h-10 px-3 rounded-lg text-sm font-bold
            text-gray-500 dark:text-gray-400
            hover:text-red-500 dark:hover:text-red-400
            hover:bg-red-50 dark:hover:bg-red-900/20
            transition-colors ms-1"
          title="Logout"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
          <span className="hidden xl:inline">{t("logout")}</span>
        </button>
      </div>

      {/* RIGHT: Mobile controls (visible only below md) */}
      <div className="flex md:hidden items-center gap-2 ms-auto">
        {!isAdmin() && <NotificationBell />}

        {/* Avatar (always visible) */}
        <UserAvatar size="sm" editable={true} avatarUrl={avatarUrl} onAvatarChange={setAvatarUrl} t={t} />

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
              <UserAvatar size="sm" editable={false} avatarUrl={avatarUrl} />
              <div>
                <NavLink to="/profile" onClick={() => setMenuOpen(false)} className="text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-primary transition-colors flex items-center gap-1">
                  {user.full_name}
                </NavLink>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                  {displayRole?.replace("_", " ") || user.role?.replace("_", " ")}
                </span>
              </div>
            </div>
          )}

          {/* Nav links */}
          <NavLink to="/dashboard" className={navLinkClasses}>
            <span className="material-symbols-outlined text-xl">grid_view</span>
            {t("dashboard")}
          </NavLink>
          <NavLink to={projectPath} className={navLinkClasses}>
            <span className="material-symbols-outlined text-xl">folder</span>
            {t("projects")}
          </NavLink>
          {isAdmin() && (
            <NavLink to="/admin/all-users" className={navLinkClasses}>
              <span className="material-symbols-outlined text-xl">manage_accounts</span>
              {t("users")}
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
            {t("logout")}
          </button>
        </div>
      )}
    </header>
  );
}