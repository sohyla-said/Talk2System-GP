import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signupApi } from "../../api/authApi";

export default function SignupPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!form.role) {
      setError("Please select a role");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const data = await signupApi(form);

      if (data.role === "admin") {
        navigate("/role-approval");        // admin → approval page
      } else if (data.status === "pending") {
        navigate("/pending-approval");     // waiting for admin approval
      } else {
        navigate("/dashboard");             // approved → dashboard
      }
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-display min-h-screen bg-background-light dark:bg-background-dark flex flex-col lg:flex-row">

      {/* LEFT SIDE */}
      <div className="lg:w-1/2 w-full flex flex-col items-center justify-center bg-primary/10 dark:bg-primary/20 p-8 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-primary/20 rounded-full opacity-50" />
        <div className="absolute -bottom-24 -right-16 w-80 h-80 bg-primary/20 rounded-full opacity-50" />

        <div className="w-full max-w-md flex flex-col items-center text-center">
          <div
            className="w-full aspect-square bg-center bg-no-repeat bg-contain"
            style={{
              backgroundImage:
                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuD0NIMW4MWdDil-LHDEL3XatVr5eSsIfuw1M8cIEbCy-VYKh-u77pUvuIYE8TNkqKvUlxLNhSNHc5_98AFyEank96nRHON9mFkvaQb7wom4ef9pZ-tvBYq0dZCtEZDl_RqJHAegC0DtdjF9rBhRpWq59nB0SKoC1bbk6PHpRGmsIYq6VE3dbP5XNLI0cYpaUVX5JxMuiNxUP-IuixHg9I4M_bciW-OJq1jVwjAPvwDNohie3mqm0rVecNtLgBqnftEVNjK-H6YVUwoT")',
            }}
          />
          <div className="flex flex-col gap-3 mt-8">
            <p className="text-primary dark:text-white text-4xl font-black">
              From Voice to Vision, Instantly.
            </p>
            <p className="text-primary/70 dark:text-white/70">
              Your ideas, structured and brought to life.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="lg:w-1/2 w-full flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="text-center lg:text-left">
            <h1 className="text-slate-800 dark:text-slate-200 text-[32px] font-bold">
              Create Your Account
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Fill in your details to get started.
            </p>
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
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full h-12 px-4 rounded-lg bg-slate-100 dark:bg-slate-800"
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full h-12 px-4 rounded-lg bg-slate-100 dark:bg-slate-800"
            />
            <input
              type="password"
              name="password"
              placeholder="Password (min 8 characters)"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full h-12 px-4 rounded-lg bg-slate-100 dark:bg-slate-800"
            />
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              className="w-full h-12 px-4 rounded-lg bg-slate-100 dark:bg-slate-800"
            />
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              required
              className="w-full h-12 px-4 rounded-lg bg-slate-100 dark:bg-slate-800"
            >
              <option value="">Select your role</option>
              <option value="Admin">Admin</option>
              <option value="Project Manager">Project Manager</option>
              <option value="Participant">Participant</option>
            </select>

            <button
              type="submit"
              className="h-12 bg-primary text-white rounded-lg font-bold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Free Account"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-bold">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}