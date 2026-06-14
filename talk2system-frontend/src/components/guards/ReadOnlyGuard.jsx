import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../api/authApi";

export default function ReadOnlyGuard({ children }) {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isSuspended = user?.status === "suspended";

  if (!isSuspended) {
    return children;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-[#1a162e] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 px-8 pt-8 pb-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/40 mb-4">
            <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-3xl">lock_person</span>
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">
            Action Not Allowed
          </h2>
        </div>
        
        <div className="px-8 py-6">
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
            Your account is <span className="font-bold text-yellow-600 dark:text-yellow-400">temporarily suspended</span>. 
            You cannot perform this action. You can only view your project list.
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/projects")}
              className="flex-1 h-11 px-4 rounded-xl bg-primary hover:opacity-90 text-white text-sm font-bold transition"
            >
              Back
            </button>
            <button
              onClick={() => navigate("/help/account-status")}
              className="flex-1 h-11 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Get Help
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}