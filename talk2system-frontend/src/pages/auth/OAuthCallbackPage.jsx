import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { saveSession } from "../../api/authApi";

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const access_token = searchParams.get("access_token");
    const user_id      = searchParams.get("user_id");
    const email         = searchParams.get("email");
    const role          = searchParams.get("role");
    const status        = searchParams.get("status");
    const full_name     = searchParams.get("full_name");
    const redirectPath  = searchParams.get("redirect") || "/dashboard";

    if (!access_token) {
      navigate("/login");
      return;
    }
    saveSession(
      { access_token, user_id: parseInt(user_id), email, role, status, full_name },
      true
    );
    navigate(redirectPath, { replace: true });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center font-display">
      <div className="text-center space-y-4">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400">Signing you in...</p>
      </div>
    </div>
  );
}