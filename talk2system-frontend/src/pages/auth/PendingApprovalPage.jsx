import { Link } from "react-router-dom";
import { logout } from "../../api/authApi";

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center font-display">
      <div className="bg-white dark:bg-[#1a162e] max-w-md w-full p-8 rounded-xl shadow-lg text-center space-y-6">

        <span className="material-symbols-outlined text-primary text-6xl">
          hourglass_top
        </span>

        <h1 className="text-3xl font-black text-[#100d1c] dark:text-white">
          Account Pending Approval
        </h1>

        <p className="text-[#57499c] dark:text-gray-400">
          Your account has been created and is under admin review.
        </p>

        <div className="bg-primary/10 text-primary rounded-lg p-4 text-sm">
          You will be able to log in once your account is approved.
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          This usually takes less than 24 hours.
        </p>

        <button
          onClick={logout}
          className="inline-block mt-4 text-primary font-bold hover:underline"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}