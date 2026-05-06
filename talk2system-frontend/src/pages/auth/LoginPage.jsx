import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { loginApi, loginWithGoogle, loginWithGitHub } from "../../api/authApi";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm]       = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false); 
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) setError(oauthError);
  }, [searchParams]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      const data = await loginApi(form, rememberMe); 
      // backend only returns a token for active / admin accounts
      if (data.role === "admin") {
        navigate("/role-approval");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-background-light dark:bg-background-dark font-display">
      <div className="flex flex-col min-h-screen">
        <main className="flex flex-grow">
          <div className="flex flex-col lg:flex-row w-full">

            {/* Left */}
            <div className="lg:w-1/2 w-full flex flex-col items-center justify-center bg-primary/10 dark:bg-primary/20 p-8 relative overflow-hidden">
              <div className="absolute -top-20 -left-20 w-72 h-72 bg-primary/20 rounded-full opacity-50" />
              <div className="absolute -bottom-24 -right-16 w-80 h-80 bg-primary/20 rounded-full opacity-50" />
              <div className="w-full max-w-md flex flex-col items-center text-center">
                <div
                  className="w-full aspect-square mb-8 bg-cover bg-center rounded-xl"
                  style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuD0NIMW4MWdDil-LHDEL3XatVr5eSsIfuw1M8cIEbCy-VYKh-u77pUvuIYE8TNkqKvUlxLNhSNHc5_98AFyEank96nRHON9mFkvaQb7wom4ef9pZ-tvBYq0dZCtEZDl_RqJHAegC0DtdjF9rBhRpWq59nB0SKoC1bbk6PHpRGmsIYq6VE3dbP5XNLI0cYpaUVX5JxMuiNxUP-IuixHg9I4M_bciW-OJq1jVwjAPvwDNohie3mqm0rVecNtLgBqnftEVNjK-H6YVUwoT")' }}
                />
                <h1 className="text-4xl font-bold text-[#100d1c] dark:text-white mb-3">
                  From Voice to Vision
                </h1>
                <p className="text-[#100d1c]/80 dark:text-white/80">
                  Log in to instantly transform your ideas into tangible designs and documents.
                </p>
              </div>
            </div>

            {/* Right */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
              <div className="w-full max-w-md bg-white dark:bg-background-dark/50 p-8 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-[#100d1c] dark:text-white mb-6">
                  Welcome Back
                </h2>

                {/* Social Buttons */}
                <div className="grid grid-cols-2 gap-3 mb-6">
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

                <div className="relative flex items-center mb-6">
                  <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                  <span className="flex-shrink mx-4 text-sm text-gray-400 dark:text-gray-500">or continue with email</span>
                  <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                  {error && (
                    <p className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
                      {error}
                    </p>
                  )}

                  <div>
                    <label className="text-sm font-medium text-[#100d1c] dark:text-white">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="w-full h-12 mt-1 px-4 border rounded-lg focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#100d1c] dark:text-white">
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      placeholder="Enter your password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      className="w-full h-12 mt-1 px-4 border rounded-lg focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                    <label
                      htmlFor="rememberMe"
                      className="text-sm text-[#100d1c] dark:text-white cursor-pointer select-none"
                    >
                      Remember me
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? "Logging in…" : "Log In"}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm">
                  Don't have an account?{" "}
                  <Link to="/signup" className="text-primary font-semibold hover:underline">
                    Sign Up
                  </Link>
                </p>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}