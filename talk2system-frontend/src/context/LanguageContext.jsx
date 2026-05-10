import { createContext, useContext, useState, useEffect } from "react";

/**
 * LanguageContext
 * Provides `lang` ("en" | "ar"), `dir` ("ltr" | "rtl"), and `toggleLang`.
 * The choice is persisted in localStorage so it survives page refreshes.
 */
export const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(
    () => localStorage.getItem("app-lang") || "en"
  );

  const dir = lang === "ar" ? "rtl" : "ltr";

  // Apply dir + lang attributes to <html> so every element inherits them
  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
    localStorage.setItem("app-lang", lang);
  }, [lang, dir]);

  const toggleLang = () => setLang((prev) => (prev === "en" ? "ar" : "en"));

  return (
    <LanguageContext.Provider value={{ lang, dir, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Convenience hook */
export function useLanguage() {
  return useContext(LanguageContext);
}
