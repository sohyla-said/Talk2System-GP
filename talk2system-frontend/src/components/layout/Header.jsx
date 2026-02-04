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
        <img 
          src="/logo.png" 
          alt="Talk2System Logo" 
          className="h-20 w-auto object-contain -my-4"
          onError={(e) => {
            e.target.onerror = null;
            e.target.style.display = 'none';
            console.error('Logo failed to load from /logo.png');
          }}
        />
       
      </NavLink>

      {/* NAV LINKS + User Avatar (Right) */}
      <div className="flex items-center gap-2 ml-auto">
        <NavLink to="/dashboard" className={navLinkClasses}>
          <span className="material-symbols-outlined text-xl">grid_view</span>
          Dashboard
        </NavLink>
        <NavLink to="/projects" className={navLinkClasses}>
          <span className="material-symbols-outlined text-xl">folder</span>
          Projects
        </NavLink>
        <div
          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 ring-2 ring-white dark:ring-white/10 ml-2"
          data-alt="User profile picture showing a smiling professional"
          style={{
            backgroundImage:
              'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAYI0aZKZE-VvkXhyWW_VwkFYcUyP5A363tXUVEJZI9IQnWLJZSWjkFjtum-9r3XSE2aVD8q0YI0GfCRdJIxBSKtp1Pfg7Zry0Fg84eK_N5mwr1GqwzCX5COa-xlc7aG6bGFjmklNozxNTGIxUGljxMdlZpIqIXGUGLRmHxXS6AL7I-lCz2VrQSTwq5dhA_r_SWqg4nvlg-lRdrXoX43iLvC3H9IyvL34_D9I_8Tj5CeSXFfNTeXhfQNhKm9MM-1TFcXFSXs8dmwWAe")',
          }}
        ></div>
      </div>
    </header>
  );
}
