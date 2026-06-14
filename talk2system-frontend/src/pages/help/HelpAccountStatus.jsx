import { Link } from "react-router-dom";

export default function HelpAccountStatus() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display flex items-center justify-center p-8">
      <div className="bg-white dark:bg-[#1a162e] rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-8 max-w-2xl w-full">
        
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-4xl text-primary">help</span>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Account Status Help</h1>
        </div>

        <div className="space-y-8 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
          
          {/* Suspended Section */}
          <div className="border-l-4 border-yellow-500 pl-4">
            <h2 className="text-lg font-bold text-yellow-700 dark:text-yellow-400 mb-2">⚠️ Suspended</h2>
            <p>Your account is temporarily restricted. You can still log in and view your projects, but you cannot create, edit, or delete anything.</p>
            <p className="mt-2"><strong>How to restore:</strong> This is usually caused by a policy violation. Please reply to the notification you received or contact your system administrator to review your account.</p>
          </div>

          {/* Terminated Section */}
          <div className="border-l-4 border-red-500 pl-4">
            <h2 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">🚫 Terminated</h2>
            <p>Your account has been permanently banned. You cannot log in or access any data.</p>
            <p className="mt-2"><strong>How to appeal:</strong> If you believe this was a mistake, you can submit an appeal by emailing support directly.</p>
          </div>

          {/* Archived Section */}
          <div className="border-l-4 border-gray-400 pl-4">
            <h2 className="text-lg font-bold text-gray-700 dark:text-gray-400 mb-2">📦 Archived / Deactivated</h2>
            <p>Your account has been hidden from the system. All your previous work (projects, documents) is safely preserved in the database for historical records.</p>
            <p className="mt-2"><strong>How to restore:</strong> Accounts are usually archived when they are no longer needed. Contact an administrator if this was done in error.</p>
          </div>

          {/* Contact Section */}
          <div className="bg-gray-50 dark:bg-[#231e3d] rounded-xl p-5 mt-8">
            <h3 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">email</span>
              Contact Support
            </h3>
            <p>If you need immediate assistance regarding your account status, please reach out to:</p>
            <a 
              href="mailto:support@talk2system.com" 
              className="text-primary font-bold hover:underline mt-1 inline-block"
            >
              support@talk2system.com
            </a>
            <p className="text-xs text-gray-400 mt-2">* Please include your registered email address and the name of your project in the email so we can help you faster.</p>
          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
          <Link to="/login" className="text-primary font-bold text-sm hover:underline">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}