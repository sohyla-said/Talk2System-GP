// Thin router — checks the user's role and renders the correct dashboard.
// All stat logic lives in AdminDashboardPage / UserDashboardPage.

import { isAdmin } from "../../api/authApi";
import AdminDashboard from "./AdminDashboard";
import UserDashboard  from "./UserDashboard";

export default function DashboardPage() {
  return isAdmin() ? <AdminDashboard /> : <UserDashboard />;
}