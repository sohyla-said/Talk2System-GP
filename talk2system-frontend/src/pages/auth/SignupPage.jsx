import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signupApi, loginWithGoogle, loginWithGitHub } from "../../api/authApi";
import { useTranslation } from "../../hooks/useTranslation";
import ReCAPTCHA from "react-google-recaptcha";

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

export default function SignupPage() {
  const navigate = useNavigate();
  const recaptchaRef = useRef();                                      
  const [form, setForm]       = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const [showPassword, setShowPassword]         = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  useEffect(() => {
    setForm({ name: "", email: "", password: "", confirmPassword: "" });
    setError("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    if (recaptchaRef.current) recaptchaRef.current.reset();
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(t("passwordsMismatch"));
      return;
    }

    const recaptchaValue = recaptchaRef.current?.getValue();
    if (!recaptchaValue) {
      setError(t("pleaseCompleteCaptcha") || "Please complete the captcha verification");
      return;
    }

    setLoading(true);
    try {
      await signupApi(form);
      navigate("/pending-approval");
    } catch (err) {
      setError(err.message || t("signupFailed"));
    } finally {
      setLoading(false);
      if (recaptchaRef.current) recaptchaRef.current.reset();          
    }
  };

  return (
    <div className="font-display min-h-screen bg-background-light dark:bg-background-dark flex flex-col lg:flex-row">

      {/* Left */}
      <div className="lg:w-1/2 w-full flex flex-col items-center justify-center bg-primary/10 dark:bg-primary/20 p-8 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-primary/20 rounded-full opacity-50" />
        <div className="absolute -bottom-24 -right-16 w-80 h-80 bg-primary/20 rounded-full opacity-50" />
        <div className="w-full max-w-md flex flex-col items-center text-center">
          <div
            className="w-full aspect-square bg-center bg-no-repeat bg-contain"
            style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuD0NIMW4MWdDil-LHDEL3XatVr5eSsIfuw1M8cIEbCy-VYKh-u77pUvuIYE8TNkqKvUlxLNhSNHc5_98AFyEank96nRHON9mFkvaQb7wom4ef9pZ-tvBYq0dZCtEZDl_RqJHAegC0DtdjF9rBhRpWq59nB0SKoC1bbk6PHpRGmsIYq6VE3dbP5XNLI0cYpaUVX5JxMuiNxUP-IuixHg9I4M_bciW-OJq1jVwjAPvwDNohie3mqm0rVecNtLgBqnftEVNjK-H6YVUwoT")' }}
          />
          <div className="flex flex-col gap-3 mt-8">
            <p className="text-primary dark:text-white text-4xl font-black">
              {t("fromVoiceToVisionInstantly")}
            </p>
            <p className="text-primary/70 dark:text-white/70">
              {t("signupTagline")}
            </p>
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="lg:w-1/2 w-full flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="text-center lg:text-left">
            <h1 className="text-slate-800 dark:text-slate-200 text-[32px] font-bold">
              {t("createYourAccount")}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              {t("fillInDetails")}
            </p>
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={loginWithGoogle}
              className="flex items-center justify-center gap-2 h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Google</span>
            </button>

            <button type="button" onClick={loginWithGitHub}
              className="flex items-center justify-center gap-2 h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">GitHub</span>
            </button>
          </div>
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
            <span className="flex-shrink mx-4 text-sm text-gray-400 dark:text-gray-500">{t("orUseEmail")}</span>
            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {error && (
              <p className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
                {error}
              </p>
            )}

            <input
              type="text"
              name="name"
              placeholder={t("fullName")}
              value={form.name}
              onChange={handleChange}
              autoComplete="off"                                       
              className="w-full h-12 px-4 rounded-lg bg-slate-100 dark:bg-slate-800"
            />
            <input
              type="email"
              name="email"
              placeholder={t("emailAddress")}
              value={form.email}
              onChange={handleChange}
              autoComplete="off"
              className="w-full h-12 px-4 rounded-lg bg-slate-100 dark:bg-slate-800"
            />
            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder={t("passwordMinHint")}
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  className="w-full h-12 px-4 pr-12 rounded-lg bg-slate-100 dark:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            <div>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder={t("confirmPassword")}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  className="w-full h-12 px-4 pr-12 rounded-lg bg-slate-100 dark:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Google reCAPTCHA */}
            <div className="flex justify-center">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey="6LexYiMtAAAAAHVa32NeoLu4OFMqtHscJpafrqQK"
                theme="dark"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-12 bg-primary text-white rounded-lg font-bold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {loading ? t("creating") : t("createFreeAccount")}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500">
            {t("haveAccount")}{" "}
            <Link to="/login" className="text-primary font-bold">{t("logInLink")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}