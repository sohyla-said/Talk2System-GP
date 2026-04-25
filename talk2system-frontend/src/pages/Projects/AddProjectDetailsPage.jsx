import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { createProject } from "../../api/projectApi"; 

export default function AddProjectDetailsPage() {
  const navigate = useNavigate();

  const [name, setName]             = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain]         = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await createProject({ name, description, domain });  
      navigate("/projects");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
      <div className="max-w-[960px] mx-auto px-4 sm:px-8 py-6">

        <div className="mb-6">
          <button
            onClick={() => navigate("/projects")}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors group"
          >
            <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">
              arrow_back
            </span>
            Back to Projects List
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-black text-[#100d1c] dark:text-white">
            Add Project Details
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Enter the details below to create a new project workspace.
          </p>
        </div>

        <div className="bg-white dark:bg-background-dark/50 border border-gray-200 dark:border-white/5 rounded-xl shadow">
          <div className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">

              {error && (
                <p className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <div>
                <label className="block text-sm font-bold mb-1">Project Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Talk2System Mobile App"
                  required
                  className="w-full rounded-lg bg-background-light dark:bg-background-dark/80 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Description</label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the project scope, main features, and objectives..."
                  className="w-full rounded-lg bg-background-light dark:bg-background-dark/80 px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Domain</label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. Healthcare, Fintech, Education"
                  className="w-full rounded-lg bg-background-light dark:bg-background-dark/80 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-bold shadow-lg transition-all ${
                    loading ? "bg-gray-400 cursor-not-allowed" : "bg-primary hover:bg-primary/90 shadow-primary/25"
                  }`}
                >
                  <span className="material-symbols-outlined">save</span>
                  {loading ? "Creating..." : "Create Project"}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/projects")}
                  className="px-6 py-2.5 rounded-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>

      </div>
    </div>
  );
}