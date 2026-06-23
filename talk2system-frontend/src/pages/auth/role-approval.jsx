import { useState, useEffect } from "react";
import { getToken, logout } from "../../api/authApi";
import Header from "../../components/layout/Header";

const BASE_URL = "http://127.0.0.1:8000";

export default function RoleApprovalPage() {
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [notification, setNotification] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

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
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
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
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
        return true;
      } else {
        const d = await res.json();
        showNotification(d.detail || `Failed to reject ${email}`, "error");
        return false;
      }
    } catch {
      showNotification("Network error", "error");
      return false;
    }
  }

  async function handleBulkApprove() {
    if (filteredUsers.length === 0) return;
    setBulkLoading(true);
    let count = 0;
    for (const user of filteredUsers) {
      try {
        const res = await fetch(`${BASE_URL}/api/admin/users/${user.id}/approve`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          setUsers((prev) => prev.filter((u) => u.id !== user.id));
          count++;
        }
      } catch {
      }
    }
    setBulkLoading(false);
    setSelectedIds(new Set());
    if (count > 0) showNotification(`${count} user${count > 1 ? "s" : ""} approved`, "success");
  }

  async function handleBulkReject() {
    if (filteredUsers.length === 0) return;
    setBulkLoading(true);
    let count = 0;
    for (const user of filteredUsers) {
      const success = await handleReject(user.id, user.email);
      if (success) count++;
    }
    setBulkLoading(false);
    setSelectedIds(new Set());
    if (count > 0) showNotification(`${count} user${count > 1 ? "s" : ""} rejected`, "error");
  }

  async function handleSelectedApprove() {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    let count = 0;
    for (const userId of selectedIds) {
      const user = users.find((u) => u.id === userId);
      if (!user) continue;
      try {
        const res = await fetch(`${BASE_URL}/api/admin/users/${userId}/approve`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          setUsers((prev) => prev.filter((u) => u.id !== userId));
          count++;
        }
      } catch {
      }
    }
    setBulkLoading(false);
    setSelectedIds(new Set());
    if (count > 0) showNotification(`${count} user${count > 1 ? "s" : ""} approved`, "success");
  }

  async function handleSelectedReject() {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    let count = 0;
    for (const userId of selectedIds) {
      const user = users.find((u) => u.id === userId);
      if (!user) continue;
      try {
        const res = await fetch(`${BASE_URL}/api/admin/users/${userId}/reject`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          setUsers((prev) => prev.filter((u) => u.id !== userId));
          count++;
        }
      } catch {
      }
    }
    setBulkLoading(false);
    setSelectedIds(new Set());
    if (count > 0) showNotification(`${count} user${count > 1 ? "s" : ""} rejected`, "error");
  }

  function toggleSelect(userId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUsers.map((u) => u.id)));
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

  const allSelected = filteredUsers.length > 0 && selectedIds.size === filteredUsers.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredUsers.length;

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark text-[#1F2937] dark:text-gray-200 font-display">

      <Header />
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
          <div className="flex gap-3 flex-wrap">
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={handleSelectedApprove}
                  disabled={bulkLoading}
                  className="h-11 px-5 bg-emerald-500 text-white rounded-lg font-bold disabled:opacity-40 hover:bg-emerald-600 transition-colors flex items-center gap-2"
                >
                  {bulkLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Approve Selected ({selectedIds.size})
                </button>
                <button
                  onClick={handleSelectedReject}
                  disabled={bulkLoading}
                  className="h-11 px-5 bg-red-500 text-white rounded-lg font-bold disabled:opacity-40 hover:bg-red-600 transition-colors flex items-center gap-2"
                >
                  {bulkLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Reject Selected ({selectedIds.size})
                </button>
              </>
            )}
            <button
              onClick={handleBulkApprove}
              disabled={filteredUsers.length === 0 || bulkLoading}
              className="h-11 px-5 bg-primary text-white rounded-lg font-bold disabled:opacity-40 hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              {bulkLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Approve All
            </button>
            <button
              onClick={handleBulkReject}
              disabled={filteredUsers.length === 0 || bulkLoading}
              className="h-11 px-5 border border-red-300 text-red-500 rounded-lg font-bold disabled:opacity-40 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center gap-2"
            >
              {bulkLoading && <span className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />}
              Reject All
            </button>
          </div>
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
                <th className="px-4 py-4 w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  />
                </th>
                <Th>Full Name</Th>
                <Th>Email</Th>
                <Th>Signup Date</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
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
                    selected={selectedIds.has(user.id)}
                    onSelect={() => toggleSelect(user.id)}
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

function ApprovalRow({ name, email, date, selected, onSelect, onApprove, onReject }) {
  return (
    <tr className={`border-t transition-colors ${selected ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-gray-50 dark:hover:bg-[#231e3d]"}`}>
      <td className="px-4 py-5 w-12">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
        />
      </td>
      <td className="px-6 py-5 font-medium">{name}</td>
      <td className="px-6 py-5 text-sm text-gray-400">{email}</td>
      <td className="px-6 py-5 italic text-gray-400">{date}</td>
      <td className="px-6 py-5 text-right space-x-2">
        <button
          onClick={onApprove}
          className="bg-primary text-white px-3 py-1 rounded-lg text-xs hover:bg-primary/90 transition-colors"
        >
          Approve
        </button>
        <button
          onClick={onReject}
          className="border border-red-300 text-red-500 px-3 py-1 rounded-lg text-xs hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
        >
          Reject
        </button>
      </td>
    </tr>
  );
}