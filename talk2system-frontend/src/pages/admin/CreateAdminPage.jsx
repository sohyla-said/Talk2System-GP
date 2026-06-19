import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import ThemeToggle from "../../components/layout/ThemeToggle";
import LangToggle from "../../components/layout/LangToggle";
import { useTranslation } from "../../hooks/useTranslation";

export default function CreateAdminPage() {
  const { t } = useTranslation();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    secret_key: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [createdAdmin, setCreatedAdmin] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const EyeIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
  const EyeOffIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const validate = () => {
    if (!form.email.trim()) return t("emailRequired") || "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return t("invalidEmail") || "Please enter a valid email address.";
    if (!form.password) return t("passwordRequired") || "Password is required.";
    if (form.password.length < 8)
      return t("passwordTooShort");
    if (form.password !== form.confirmPassword)
      return t("passwordsMismatch");
    if (!form.secret_key.trim()) return t("secretKeyRequired");
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...payload } = form;

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/api/auth/create-admin`,
        payload,
        { headers: { "Content-Type": "application/json" } }
      );

      setCreatedAdmin(response.data);
      setSuccess(true);
      setForm({
        full_name: "",
        email: "",
        password: "",
        confirmPassword: "",
        secret_key: "",
      });
    } catch (err) {
      setError(err.response?.data?.detail || t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  const MinimalNavbar = () => (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#1C192B]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Talk2System Logo"
            className="h-9 sm:h-12 w-auto object-contain block dark:hidden"
            onError={(e) => { e.target.onerror = null; e.target.style.display = "none"; }}
          />
          <img
            src="/Darkmode_logo.png"
            alt="Talk2SystemLogo"
            className="h-9 sm:h-12 w-auto object-contain hidden dark:block"
            onError={(e) => { e.target.onerror = null; e.target.style.display = "none"; }}
          />
        </div>
        <div className="flex items-center gap-1">
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );

  if (success && createdAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        <MinimalNavbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="bg-white dark:bg-[#1C192B] rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-8 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-3xl">
                  check_circle
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t("adminAccountCreated")}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {t("adminCreatedSuccess")}
              </p>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-6 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t("id")}</span>
                  <span className="font-mono text-gray-900 dark:text-white">#{createdAdmin.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t("email")}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{createdAdmin.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t("name")}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{createdAdmin.full_name || "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t("role")}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                    {createdAdmin.role}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t("status")}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                    {createdAdmin.status}
                  </span>
                </div>
              </div>
              <Link
                to="/login"
                className="block w-full px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold text-center transition-all"
              >
                {t("goToLogin")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <MinimalNavbar />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-primary text-2xl">
                shield_person
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("adminAccountSetup")}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
              {t("adminSetupWarning")}
            </p>
          </div>

          <div className="bg-white dark:bg-[#1C192B] rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                <span className="material-symbols-outlined text-red-500 text-xl mt-0.5">error</span>
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t("fullName")}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xl">person</span>
                  <input
                    type="text" id="full_name" name="full_name"
                    value={form.full_name} onChange={handleChange}
                    placeholder={t("adminNamePlaceholder")} required autoComplete="off"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t("emailAddress")}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xl">mail</span>
                  <input
                    type="email" id="email" name="email"
                    value={form.email} onChange={handleChange}
                    placeholder={t("adminEmailPlaceholder")} required autoComplete="off"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t("password")}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xl">lock</span>
                  <input
                    type={showPassword ? "text" : "password"} id="password" name="password"
                    value={form.password} onChange={handleChange}
                    placeholder={t("passwordMinHint")} required minLength={8} autoComplete="new-password"
                    className="w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  <button
                    type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t("confirmPassword")}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xl">lock</span>
                  <input
                    type={showConfirmPassword ? "text" : "password"} id="confirmPassword" name="confirmPassword"
                    value={form.confirmPassword} onChange={handleChange}
                    placeholder={t("reEnterPassword")} required autoComplete="new-password"
                    className="w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  <button
                    type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                  >
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white dark:bg-[#1C192B] px-3 text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {t("authorization")}
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="secret_key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t("secretKey")}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xl">vpn_key</span>
                  <input
                    type="password" id="secret_key" name="secret_key"
                    value={form.secret_key} onChange={handleChange}
                    placeholder={t("secretKeyPlaceholder")} required autoComplete="off"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full py-3 px-6 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t("creatingAdminAccount")}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">person_add</span>
                    {t("createAdminAccount")}
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
            {t("copyright")}
          </p>
        </div>
      </div>
    </div>
  );
}