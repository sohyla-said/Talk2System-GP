import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPendingRequests } from "../../api/projectApi";

function timeAgo(iso) {
  if (!iso) return "—";
  const sec = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (sec < 60)     return "just now";
  if (sec < 3600)   return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400)  return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function PendingInvitationsPage() {
  const navigate = useNavigate();

  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchPendingRequests();
        if (!cancelled) setInvitations(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex min-h-screen font-display bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100">
      <main className="flex-1 p-8 overflow-y-auto w-full">

        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h2 className="text-[#1F2937] dark:text-white text-3xl font-black leading-tight tracking-tight">
              Pending Invitations
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Join requests waiting for your action across your projects
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1C192B] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-5 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                  <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-12 text-red-400">
              <span className="material-symbols-outlined text-3xl">error</span>
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : invitations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-gray-400 dark:text-gray-600">
              <span className="material-symbols-outlined text-3xl">mark_email_read</span>
              <p className="text-sm font-medium">No pending invitations</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
              {invitations.map((inv) => (
                <li key={inv.id} className="flex items-center gap-4 p-5">
                  <div
                    className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 shrink-0"
                    style={{
                      backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(inv.invitee_full_name || "User")}&background=random&color=fff)`,
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                      {inv.invitee_full_name || "Unknown User"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{inv.invitee_email}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <button
                      onClick={() => navigate(`/projects/${inv.project_id}`)}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      {inv.project_name || `Project #${inv.project_id}`}
                    </button>
                    <span className="text-[11px] text-gray-400">{timeAgo(inv.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </main>
    </div>
  );
}
