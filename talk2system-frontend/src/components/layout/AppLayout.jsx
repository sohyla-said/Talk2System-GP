import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { useLanguage } from "../../context/LanguageContext";
import { getCurrentUser } from "../../api/authApi";

export default function AppLayout() {
  const { dir } = useLanguage();
  const user = getCurrentUser();
  const isSuspended = user?.status === "suspended";

  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div dir={dir} className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-[#1F2937] dark:text-gray-200">

      <Header />

      {/* ===== YELLOW SUSPENDED BANNER ===== */}
      {isSuspended && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-400 dark:border-yellow-600 px-4 py-3 w-full">
          <div className="flex items-center justify-center gap-3 max-w-screen-2xl mx-auto flex-wrap">
            <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-[20px]">warning</span>
            <p className="text-yellow-800 dark:text-yellow-300 text-sm font-medium text-center">
              Your account has been temporarily suspended. You cannot perform any actions.
            </p>
            <a 
              href="/help/account-status" 
              className="text-yellow-800 dark:text-yellow-300 underline underline-offset-2 font-bold text-sm hover:text-yellow-900 dark:hover:text-yellow-100 whitespace-nowrap transition-colors"
            >
              Learn more
            </a>
          </div>
        </div>
      )}
      <main className="flex-grow w-full max-w-screen-2xl mx-auto px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>

      <Footer />

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 w-11 h-11 flex items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5 transition-all"
          aria-label="Scroll to top"
        >
          <span className="material-symbols-outlined text-[22px]">arrow_upward</span>
        </button>
      )}
    </div>
  );
}