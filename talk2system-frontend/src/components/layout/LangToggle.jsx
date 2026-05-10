import { useTranslation } from "../../hooks/useTranslation";

/**
 * LangToggle
 * A compact pill button that switches between English ⇄ Arabic.
 * Drop it anywhere in the header / toolbar.
 *
 * Props:
 *   className – extra Tailwind classes (optional)
 */
export default function LangToggle({ className = "" }) {
  const { t, lang, toggleLang } = useTranslation();

  return (
    <button
      onClick={toggleLang}
      aria-label="Toggle language"
      title={lang === "en" ? "Switch to Arabic" : "Switch to English"}
      className={`
        inline-flex items-center gap-1.5
        h-9 px-3 rounded-lg
        text-sm font-bold tracking-wide
        border border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-800
        text-gray-600 dark:text-gray-300
        hover:border-primary hover:text-primary
        dark:hover:border-primary dark:hover:text-primary
        transition-colors select-none
        ${className}
      `}
    >
      {/* Globe icon */}
      <span className="material-symbols-outlined text-[18px] leading-none">
        language
      </span>
      {/* Shows "العربية" when in English mode, "English" when in Arabic mode */}
      {t("switchToArabic")}
    </button>
  );
}
