import { useLanguage } from "../context/LanguageContext";
import translations from "../lang/translations";

/**
 * useTranslation
 *
 * Returns a `t(key)` function that looks up the current language string.
 * Also re-exports `lang` and `dir` for convenience.
 *
 * Example:
 *   const { t, lang, dir } = useTranslation();
 *   <p>{t("dashboard")}</p>          // "Dashboard" or "لوحة التحكم"
 *   <div dir={dir}>…</div>
 */
export function useTranslation() {
  const { lang, dir, toggleLang } = useLanguage();

  function t(key) {
    const entry = translations[key];
    if (!entry) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[i18n] Missing translation key: "${key}"`);
      }
      return key; // fallback: return the key itself
    }
    return entry[lang] ?? entry["en"] ?? key;
  }

  return { t, lang, dir, toggleLang };
}
