import { Link } from "react-router-dom";

export default function RoleApprovalPage() {
  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen text-[#100d1c] dark:text-white font-display">
      <div className="flex flex-col min-h-screen">

        {/* ================= MAIN CONTENT ================= */}
        <main className="flex-1 max-w-[1200px] mx-auto px-4 md:px-10 lg:px-20 py-8 space-y-6">

          {/* Page title + bulk actions */}
          <div className="flex justify-between items-end flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-black">Role Approval Queue</h1>
              <p className="text-[#57499c] dark:text-gray-400">
                Review and manage pending user role requests.
              </p>
            </div>

            {/* Bulk action buttons */}
            <div className="flex gap-3">
              <PrimaryBtn text="Bulk Approve All" />
              <SecondaryBtn text="Reject Selected" danger />
            </div>
          </div>

          {/* Search bar */}
          <div className="bg-white dark:bg-[#1a162e] rounded-xl border p-2 flex flex-col md:flex-row gap-2">
            <input
              className="h-11 w-full rounded-lg px-4 bg-[#f6f5f8] dark:bg-[#2d2945]"
              placeholder="Search by name, email, or company..."
            />
          </div>

          {/* Users table */}
          <div className="overflow-x-auto rounded-xl border bg-white dark:bg-[#1a162e]">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#231e3d]">
                <tr>
                  <Th>Full Name</Th>
                  <Th>Email</Th>
                  <Th>Requested Role</Th>
                  <Th>Signup Date</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>

                {/* Example rows */}
                <ApprovalRow
                  name="Alex Rivera"
                  email="alex.r@company.com"
                  role="participant"
                  date="Oct 24, 2023"
                />
                <ApprovalRow
                  name="Jordan Smith"
                  email="j.smith@tech.io"
                  role="Project Manager"
                  date="Oct 25, 2023"
                />
              </tbody>
            </table>
          </div>
        </main>

        {/* ================= Notification ================= */}
        <div className="fixed bottom-6 right-6 bg-white dark:bg-[#1a162e] border border-emerald-500/30 p-4 rounded-xl shadow-xl flex gap-3">
          <span className="material-symbols-outlined text-emerald-500">check_circle</span>
          <div>
            <p className="font-bold">User approved!</p>
            <p className="text-xs text-gray-400">Confirmation email sent</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Primary button (approve actions) */
function PrimaryBtn({ text }) {
  return (
    <button className="h-11 px-5 bg-primary text-white rounded-lg font-bold">
      {text}
    </button>
  );
}

/* Secondary button (reject actions) */
function SecondaryBtn({ text, danger }) {
  return (
    <button
      className={`h-11 px-5 rounded-lg font-bold ${
        danger ? "text-red-600" : ""
      } bg-[#e9e7f4] dark:bg-[#2d2945]`}
    >
      {text}
    </button>
  );
}

/* Table header cell */
function Th({ children, align }) {
  return (
    <th
      className={`px-6 py-4 text-xs font-bold uppercase ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

/* Single user row in the approval table */
function ApprovalRow({ name, email, role, date }) {
  return (
    <tr className="border-t hover:bg-gray-50 dark:hover:bg-[#231e3d]">
      <td className="px-6 py-5 font-medium">{name}</td>
      <td className="px-6 py-5 text-sm text-gray-400">{email}</td>
      <td className="px-6 py-5">
        <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
          {role}
        </span>
      </td>
      <td className="px-6 py-5 italic text-gray-400">{date}</td>
      <td className="px-6 py-5 text-right space-x-2">
        {/* Approve / Reject buttons */}
        <button className="bg-primary text-white px-3 py-1 rounded-lg text-xs">
          Approve
        </button>
        <button className="border border-red-300 text-red-500 px-3 py-1 rounded-lg text-xs">
          Reject
        </button>
      </td>
    </tr>
  );
}