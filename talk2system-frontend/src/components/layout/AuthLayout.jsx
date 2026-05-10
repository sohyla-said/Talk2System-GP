import { NavLink, Outlet } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import LangToggle from "./LangToggle";
import { useTranslation } from "../../hooks/useTranslation";

export default function AuthLayout() {
  const { dir } = useLanguage();
  const { t } = useTranslation();

  const linkClasses = ({ isActive }) =>
    `text-sm font-semibold transition-colors
     ${
       isActive
         ? "text-primary"
         : "text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white"
     }`;

  return (
    <div dir={dir} className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark text-[#1F2937] dark:text-gray-200">

      {/* Header */}
      <header className="
        h-14 flex items-center justify-between
        whitespace-nowrap
        border-b border-gray-200 dark:border-gray-700
        px-6 sm:px-10 py-2
        bg-white/80 dark:bg-background-dark/80
        backdrop-blur-sm sticky top-0 z-20
      ">
        {/* Logo → Home */}
        <NavLink
          to="/"
          className="flex items-center gap-3 text-[#100d1c] dark:text-white hover:opacity-90 transition-opacity"
        >
          <img
          src="/logo.png"
          alt="Talk2System Logo"
          className="h-12 w-auto object-contain"
          onError={(e) => {
            e.target.onerror = null;
            e.target.style.display = 'none';
            console.error('Logo failed to load from /logo.png');
          }}
        />

        </NavLink>

        {/* Auth Links + Lang Toggle */}
        <nav className="flex items-center gap-6">
          <LangToggle />
          <NavLink to="/login" className={linkClasses}>
            {t("login")}
          </NavLink>
          <NavLink to="/signup" className={linkClasses}>
            {t("signup")}
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
