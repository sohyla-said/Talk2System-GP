import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addParticipantDirectly } from '../../api/projectApi'; 
import { isAdmin } from '../../api/authApi'

export default function AddParticipantPage() {
  const navigate = useNavigate();
  const { id: projectId } = useParams();

  // Add state for form data
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Real submit handler that calls the backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const result = await addParticipantDirectly(projectId, email, notes);
      setSuccess(result.message || 'Participant added successfully!');
      
      setEmail('');
      setNotes('');

      // Go back after showing success message
      setTimeout(() => {
        if (isAdmin()) {
          navigate("/projects/system-projects");
        } else {
          navigate(`/projects/${projectId}`);
        }
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to add participant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">

      {/* PAGE CONTAINER */}
      <div className="max-w-[960px] mx-auto px-4 sm:px-8 py-6">

        {/* BACK LINK */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors group"
          >
            <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">
              arrow_back
            </span>
            Back to Project Details
          </button>
        </div>

        {/* TITLE */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-[#100d1c] dark:text-white">
            Add Participant
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Enter the details below to add a new participant to this project.
          </p>
        </div>

        {/* SUCCESS MESSAGE BOX */}
        {success && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">check_circle</span>
            <p className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">{success}</p>
          </div>
        )}

        {/* ERROR MESSAGE BOX (This will show the admin error!) */}
        {error && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400">error</span>
            <p className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* FORM CARD */}
        <div className="bg-white dark:bg-background-dark/50 border border-gray-200 dark:border-white/5 rounded-xl shadow">
          <div className="p-6 md:p-8">

            <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">

              {/* EMAIL */}
              <div>
                <label className="block text-sm font-bold mb-1 text-[#100d1c] dark:text-white">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. john.doe@example.com"
                  required
                  value={email}                        
                  onChange={(e) => setEmail(e.target.value)} 
                  disabled={loading}
                  className="w-full rounded-lg bg-background-light dark:bg-background-dark/80 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                />
              </div>

              {/* NOTES */}
              <div>
                <label className="block text-sm font-bold mb-1 text-[#100d1c] dark:text-white">
                  Notes <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Any additional information about this participant..."
                  value={notes}                       
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg bg-background-light dark:bg-background-dark/80 px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                />
              </div>

              {/* ACTIONS */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}                  
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                      Adding...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">person_add</span>
                      Add Participant
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
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