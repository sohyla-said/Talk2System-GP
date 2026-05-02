import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom"; // ADDED NavLink
import { getToken, logout } from "../../api/authApi";

const BASE_URL = "http://127.0.0.1:8000";

const linkClasses = ({ isActive }) =>
  `text-sm font-semibold transition-colors
   ${
     isActive
       ? "text-primary"
       : "text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white"
   }`;

export default function RoleApprovalPage() {
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [notification, setNotification] = useState(null);

  useEffect(() => { fetchPendingUsers(); }, []);

  async function fetchPendingUsers() {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/pending-users`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }
      const data = await res.json();
      if (res.ok) setUsers(data);
    } catch (err) {
      console.error("Failed to fetch pending users:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(userId, email) {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/users/${userId}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        showNotification(`${email} approved`, "success");
      } else {
        const d = await res.json();
        showNotification(d.detail || "Failed to approve", "error");
      }
    } catch {
      showNotification("Network error", "error");
    }
  }

  async function handleReject(userId, email) {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/users/${userId}/reject`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        showNotification(`${email} rejected`, "error");
      } else {
        const d = await res.json();
        showNotification(d.detail || "Failed to reject", "error");
      }
    } catch {
      showNotification("Network error", "error");
    }
  }

  async function handleBulkApprove() {
    for (const user of filteredUsers) {
      await handleApprove(user.id, user.email);
    }
  }

  function showNotification(message, type) {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(search.toLowerCase()))
  );

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark text-[#1F2937] dark:text-gray-200 font-display">
      
      <header className="
        h-14 flex items-center justify-between
        whitespace-nowrap
        border-b border-gray-200 dark:border-gray-700
        px-6 sm:px-10 py-2
        bg-white/80 dark:bg-background-dark/80
        backdrop-blur-sm sticky top-0 z-20
      ">   
        {/* Logo → Home */}
        <NavLink
          to="/"
          className="flex items-center gap-3 text-[#100d1c] dark:text-white hover:opacity-90 transition-opacity"
        >
          <img 
            src="/logo.png" 
            alt="Talk2System Logo" 
            className="h-12 w-auto object-contain"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
        </NavLink>

        {/* Auth Links */}
        <nav className="flex items-center gap-6">
          <NavLink to="/login" className={linkClasses}>
            Login
          </NavLink>
          {/* Log Out uses the same text style as the links */}
          <button 
            onClick={logout} 
            className="text-sm font-semibold transition-colors text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white bg-transparent border-none cursor-pointer"
          >
            Log Out
          </button>
        </nav>
      </header>
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 md:px-10 lg:px-20 py-8 space-y-6">

        {/* Title */}
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-black text-[#100d1c] dark:text-white">Pending Approvals</h1>
            <p className="text-[#57499c] dark:text-gray-400">
              Review and approve new user accounts.
              {filteredUsers.length > 0 && (
                <span className="ml-2 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-bold">
                  {filteredUsers.length} pending
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleBulkApprove}
            disabled={filteredUsers.length === 0}
            className="h-11 px-5 bg-primary text-white rounded-lg font-bold disabled:opacity-40"
          >
            Approve All
          </button>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-[#1a162e] rounded-xl border p-2">
          <input
            className="h-11 w-full rounded-lg px-4 bg-[#f6f5f8] dark:bg-[#2d2945] text-[#100d1c] dark:text-white"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border bg-white dark:bg-[#1a162e]">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#231e3d]">
              <tr>
                <Th>Full Name</Th>
                <Th>Email</Th>
                <Th>Signup Date</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                    No pending users.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <ApprovalRow
                    key={user.id}
                    name={user.full_name || "—"}
                    email={user.email}
                    date={formatDate(user.created_at)}
                    onApprove={() => handleApprove(user.id, user.email)}
                    onReject={() => handleReject(user.id, user.email)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Toast */}
      {notification && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-xl flex gap-3 border ${
          notification.type === "success"
            ? "bg-white dark:bg-[#1a162e] border-emerald-500/30"
            : "bg-white dark:bg-[#1a162e] border-red-500/30"
        }`}>
          <span className={`material-symbols-outlined ${
            notification.type === "success" ? "text-emerald-500" : "text-red-500"
          }`}>
            {notification.type === "success" ? "check_circle" : "cancel"}
          </span>
          <p className="font-bold">{notification.message}</p>
        </div>
      )}
    </div>
  );
}

function Th({ children, align }) {
  return (
    <th className={`px-6 py-4 text-xs font-bold uppercase ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function ApprovalRow({ name, email, date, onApprove, onReject }) {
  return (
    <tr className="border-t hover:bg-gray-50 dark:hover:bg-[#231e3d]">
      <td className="px-6 py-5 font-medium">{name}</td>
      <td className="px-6 py-5 text-sm text-gray-400">{email}</td>
      <td className="px-6 py-5 italic text-gray-400">{date}</td>
      <td className="px-6 py-5 text-right space-x-2">
        <button
          onClick={onApprove}
          className="bg-primary text-white px-3 py-1 rounded-lg text-xs hover:bg-primary/90"
        >
          Approve
        </button>
        <button
          onClick={onReject}
          className="border border-red-300 text-red-500 px-3 py-1 rounded-lg text-xs hover:bg-red-50"
        >
          Reject
        </button>
      </td>
    </tr>
  );
}