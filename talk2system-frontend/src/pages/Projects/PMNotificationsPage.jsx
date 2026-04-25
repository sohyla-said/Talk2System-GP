import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchPendingRequests,
  acceptInvitation,
  rejectInvitation,
  fetchProject,
} from "../../api/projectApi";

export default function PMNotificationsPage() {
  const navigate = useNavigate();
  const [requests, setRequests]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [projectNames, setProjectNames] = useState({}); 
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchPendingRequests()
      .then(async (data) => {
        setRequests(data);

        const uniqueIds = [...new Set(data.map((r) => r.project_id))];
        const entries = await Promise.all(
          uniqueIds.map((id) =>
            fetchProject(id).then((p) => [id, p.name]).catch(() => [id, `Project #${id}`])
          )
        );
        setProjectNames(Object.fromEntries(entries));
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleAccept = async (req) => {
    try {
      await acceptInvitation(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      toast(`Request accepted`, "success");
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const handleReject = async (req) => {
    try {
      await rejectInvitation(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      toast(`Request rejected`, "error");
    } catch (err) {
      toast(err.message, "error");
    }
  };

  function toast(message, type) {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
      <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-8">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-black text-[#100d1c] dark:text-white">
              Join Requests
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Review requests from users who want to join your projects.
            </p>
          </div>
          {requests.length > 0 && (
            <span className="bg-primary text-white text-sm font-bold px-4 py-1.5 rounded-full">
              {requests.length} pending
            </span>
          )}
        </div>

        {/* CONTENT */}
        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="material-symbols-outlined text-6xl text-primary/40 mb-4">
              mark_email_read
            </span>
            <h3 className="text-2xl font-black text-gray-400 mb-2">All caught up!</h3>
            <p className="text-gray-400">No pending join requests.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white dark:bg-[#1a162e] rounded-xl border border-gray-200 dark:border-white/5 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">
                      person
                    </span>
                    <p className="font-bold text-[#100d1c] dark:text-white">
                      User #{req.invitee_user_id}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="material-symbols-outlined text-base">folder</span>
                    <button
                      onClick={() => navigate(`/projects/${req.project_id}`)}
                      className="hover:text-primary hover:underline font-medium"
                    >
                      {projectNames[req.project_id] || `Project #${req.project_id}`}
                    </button>
                  </div>

                  {req.project_domain && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="material-symbols-outlined text-base">category</span>
                      <span>Domain confirmed: <b>{req.project_domain}</b></span>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-1">
                    Requested {new Date(req.created_at).toLocaleDateString("en-US", {
                      year: "numeric", month: "short", day: "numeric",
                    })}
                  </p>
                </div>

                <div className="flex gap-3 shrink-0">
                  <button
                    onClick={() => handleAccept(req)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition"
                  >
                    <span className="material-symbols-outlined text-base">check</span>
                    Accept
                  </button>
                  <button
                    onClick={() => handleReject(req)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-300 text-red-500 text-sm font-bold hover:bg-red-50 transition"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {notification && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-xl flex gap-3 border z-50 ${
          notification.type === "success"
            ? "bg-white dark:bg-[#1a162e] border-emerald-500/30"
            : "bg-white dark:bg-[#1a162e] border-red-500/30"
        }`}>
          <span className={`material-symbols-outlined ${
            notification.type === "success" ? "text-emerald-500" : "text-red-500"
          }`}>
            {notification.type === "success" ? "check_circle" : "cancel"}
          </span>
          <p className="font-bold text-sm">{notification.message}</p>
        </div>
      )}
    </div>
  );
}