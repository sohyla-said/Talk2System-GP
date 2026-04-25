import { useState, useEffect } from "react";
import { fetchAllUsers, adminSuspendUser, adminTerminateUser, adminArchiveUser, adminActivateUser } from "../../api/authApi";

export default function AllUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState("");
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await fetchAllUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search query (Name or Email)
  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(query) ||
      (u.full_name && u.full_name.toLowerCase().includes(query))
    );
  });

  const handleAction = async (action, userId, userName) => {
    if (!confirm(`Are you sure you want to ${action} "${userName}"?`)) return;
    
    setActionLoading(userId);
    setMessage("");

    try {
      let res;
      if (action === "suspend") res = await adminSuspendUser(userId);
      if (action === "terminate") res = await adminTerminateUser(userId);
      if (action === "archive") res = await adminArchiveUser(userId);
      if (action === "activate") res = await adminActivateUser(userId);

      setMessage(res.message);
      const updatedUsers = await fetchAllUsers();
      setUsers(updatedUsers);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      suspended: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      terminated: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      archived: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
    };
    return styles[status] || styles.active;
  };

  if (loading) return <p className="p-8 text-gray-400">Loading users...</p>;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black text-[#100d1c] dark:text-white">All Users</h1>
            <p className="text-gray-500 mt-1">Manage user statuses and access.</p>
          </div>
          
          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
              search
            </span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#231e3d] text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            />
          </div>
        </div>

        {message && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium">
            {message}
          </div>
        )}

        <div className="bg-white dark:bg-[#1a162e] rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[#231e3d] text-left">
              <tr>
                <th className="px-6 py-4 font-bold">Name</th>
                <th className="px-6 py-4 font-bold">Email</th>
                <th className="px-6 py-4 font-bold">Global Role</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Handle empty search results */}
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-gray-400">
                    {searchQuery ? `No users found for "${searchQuery}"` : "No users in system."}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="border-t hover:bg-gray-50 dark:hover:bg-[#1a162e]">
                    <td className="px-6 py-4 font-medium">{u.full_name || "—"}</td>
                    <td className="px-6 py-4 text-gray-500">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold capitalize">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize ${getStatusBadge(u.status)}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        
                        {u.status === "active" && (
                          <>
                            <button 
                              disabled={actionLoading === u.id}
                              onClick={() => handleAction("suspend", u.id, u.email)}
                              className="px-3 py-1 bg-orange-50 text-orange-600 rounded text-xs font-bold hover:bg-orange-100 disabled:opacity-50"
                            >
                              Suspend
                            </button>
                            <button 
                              disabled={actionLoading === u.id}
                              onClick={() => handleAction("terminate", u.id, u.email)}
                              className="px-3 py-1 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100 disabled:opacity-50"
                            >
                              Terminate
                            </button>
                            <button 
                              disabled={actionLoading === u.id}
                              onClick={() => handleAction("archive", u.id, u.email)}
                              className="px-3 py-1 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded text-xs font-bold hover:bg-gray-200 disabled:opacity-50"
                            >
                              Archive
                            </button>
                          </>
                        )}

                        {u.status !== "active" && u.status !== "pending" && (
                          <button 
                            disabled={actionLoading === u.id}
                            onClick={() => handleAction("activate", u.id, u.email)}
                            className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded text-xs font-bold hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Activate
                          </button>
                        )}

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}