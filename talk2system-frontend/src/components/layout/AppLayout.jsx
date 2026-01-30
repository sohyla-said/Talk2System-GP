// src/components/layout/AppLayout.jsx
export default function AppLayout({ children }) {
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-[#1F2937] dark:text-gray-200">

      {/* HEADER / NAVBAR */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 dark:border-gray-700 px-6 sm:px-10 py-4 bg-white/80 dark:bg-background-dark/80 backdrop-blur-sm sticky top-0 z-20">

        {/* LEFT: Logo + App Name */}
        <div className="flex items-center gap-4 text-[#100d1c] dark:text-white">
          <div className="size-8 text-primary">
            {/* SVG LOGO */}
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
        </div>

        {/* CENTER: NAV LINKS (Desktop only) */}
        <div className="hidden lg:flex items-center gap-2">
          <a
            href="#"
            className="flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-bold tracking-[0.015em]
                       text-gray-500 dark:text-gray-400
                       hover:text-primary dark:hover:text-white
                       hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">
              grid_view
            </span>
            Dashboard
          </a>

          <a
            href="#"
            className="flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-bold tracking-[0.015em]
                       bg-primary/10 dark:bg-primary/20
                       text-primary dark:text-indigo-300"
          >
            <span className="material-symbols-outlined text-xl">
              folder
            </span>
            Projects
          </a>
        </div>

        {/* RIGHT: ACTIONS */}
        <div className="flex flex-1 justify-end gap-2 sm:gap-4 items-center">

          <button className="flex items-center justify-center h-10 px-2.5 rounded-lg
                             bg-primary/10 dark:bg-primary/20
                             text-[#100d1c] dark:text-white">
            <span className="material-symbols-outlined text-xl">
              notifications
            </span>
          </button>

          <button className="flex items-center justify-center h-10 px-2.5 rounded-lg
                             bg-primary/10 dark:bg-primary/20
                             text-[#100d1c] dark:text-white">
            <span className="material-symbols-outlined text-xl">
              help
            </span>
          </button>

          {/* USER AVATAR */}
          <div
            className="size-10 rounded-full bg-center bg-no-repeat bg-cover"
            style={{
              backgroundImage:
                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDseSu_UQbEFNK-jmnbDwZ6fJaIXNVWcf3eOr9SZyy2Rwx1SMkR4lafxL0ipo6FOIaVYcEeh7X6y4b3ovsxl-u4VwJk7BNbEUV6qLnaiHEcbiSq13EDq3u1-QyQhIxKZOlmT8LwtJ2mKDYhekhKxbO9osCzNxsDvLhstxuKb6BtolVlVgbPCvShLKGjDebB8A9d5KMouyX5tQxV5hTyYTHmih8aNXK1Xu11OmXDsBU9FdmZ1N9XMS7f-I1NNhMR35AvHmgmTo6bwvo")',
            }}
          />
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-grow w-full max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="w-full text-center p-4 mt-8 text-gray-500 dark:text-gray-400">
        © 2024 Talk2System. All rights reserved.
      </footer>
    </div>
  );
}
