import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      const response = await fakeLoginApi(form);
      // response: { status: "success" | "failed", role: "Admin" | "Project Manager" | "Participant" }
      if (response.status === "success") {
        if (response.role === "Admin") navigate("/role-approval");
        else navigate("/dashboard");
      } else {
        setError("Invalid email or password");
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

        {/* Main */}
        <main className="flex flex-grow">
          <div className="flex flex-col lg:flex-row w-full">

            {/* Left Section */}
            <div className="lg:w-1/2 w-full flex flex-col items-center justify-center bg-primary/10 dark:bg-primary/20 p-8 relative overflow-hidden">
              <div className="absolute -top-20 -left-20 w-72 h-72 bg-primary/20 rounded-full opacity-50" />
              <div className="absolute -bottom-24 -right-16 w-80 h-80 bg-primary/20 rounded-full opacity-50" />
              <div className="w-full max-w-md flex flex-col items-center text-center">
                <div
                  className="w-full aspect-square mb-8 bg-cover bg-center rounded-xl"
                  style={{
                    backgroundImage:
                      'url("https://lh3.googleusercontent.com/aida-public/AB6AXuD0NIMW4MWdDil-LHDEL3XatVr5eSsIfuw1M8cIEbCy-VYKh-u77pUvuIYE8TNkqKvUlxLNhSNHc5_98AFyEank96nRHON9mFkvaQb7wom4ef9pZ-tvBYq0dZCtEZDl_RqJHAegC0DtdjF9rBhRpWq59nB0SKoC1bbk6PHpRGmsIYq6VE3dbP5XNLI0cYpaUVX5JxMuiNxUP-IuixHg9I4M_bciW-OJq1jVwjAPvwDNohie3mqm0rVecNtLgBqnftEVNjK-H6YVUwoT")',
                  }}
                />

                <h1 className="text-4xl font-bold text-[#100d1c] dark:text-white mb-3">
                  From Voice to Vision
                </h1>

                <p className="text-[#100d1c]/80 dark:text-white/80">
                  Log in to instantly transform your ideas into tangible designs and documents.
                </p>
              </div>
            </div>

            {/* Right Section */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
              <div className="w-full max-w-md bg-white dark:bg-background-dark/50 p-8 rounded-xl shadow-lg">

                <h2 className="text-2xl font-bold text-[#100d1c] dark:text-white mb-6">
                  Welcome Back
                </h2>

                <form className="space-y-6" onSubmit={handleSubmit}>
                  {error && <p className="text-red-600 text-sm">{error}</p>}

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
                      className="w-full h-12 mt-1 px-4 border rounded-lg focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full h-12 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90"
                    disabled={loading}
                  >
                    {loading ? "Logging in..." : "Log In"}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm">
                  Don’t have an account?{" "}
                  <Link
                    to="/signup"
                    className="text-primary font-semibold hover:underline"
                  >
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

// Fake login API simulation
function fakeLoginApi(form) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // any email with "admin" will be Admin, else Participant
      if (form.email && form.password) {
        if (form.email.includes("admin")) resolve({ status: "success", role: "Admin" });
        else resolve({ status: "success", role: "Participant" });
      } else {
        resolve({ status: "failed" });
      }
    }, 1000);
  });
}
