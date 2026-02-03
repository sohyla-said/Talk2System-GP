import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AddParticipantPage() {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission logic here
    navigate('/projects/1'); // Navigate back to project details
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

        {/* FORM CARD */}
        <div className="bg-white dark:bg-background-dark/50 border border-gray-200 dark:border-white/5 rounded-xl shadow">
          <div className="p-6 md:p-8">

            <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">

              {/* EMAIL */}
              <div>
                <label className="block text-sm font-bold mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. john.doe@example.com"
                  required
                  className="w-full rounded-lg bg-background-light dark:bg-background-dark/80 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>


              {/* NOTES */}
              <div>
                <label className="block text-sm font-bold mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={4}
                  placeholder="Any additional information about this participant..."
                  className="w-full rounded-lg bg-background-light dark:bg-background-dark/80 px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* ACTIONS */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
                >
                  <span className="material-symbols-outlined">person_add</span>
                  Add Participant
                </button>

                <button
                  type="button"
                  onClick={() => navigate(-1)}
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
