import React, { useEffect, useState } from "react";
import { getCurrentUser } from "../../api/authApi";

function Skeleton({ className = "" }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
  );
}

function StatCard({ icon, iconBg, label, value, sub, badge, bar, loading }) {
  const base =
    "bg-white dark:bg-[#1C192B] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col gap-3";

  return (
    <div className={base}>
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
        {badge && (
          <span className={`text-xs font-semibold px-2 py-1 rounded ${badge.className}`}>
            {badge.text}
          </span>
        )}
      </div>

      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{label}</p>

      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? "–"}</p>
          {sub && <span className="text-xs text-gray-400">{sub}</span>}
        </div>
      )}

      {loading ? (
        <Skeleton className="h-1.5 w-full" />
      ) : bar ? (
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-700 ${bar.colorClass}`}
            style={{ width: `${Math.min(bar.value ?? 0, 100)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function AdminDashboard() {
  const user = getCurrentUser();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <div className="flex min-h-screen font-display bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100">
      <main className="flex-1 p-8 overflow-y-auto w-full">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-[#1F2937] dark:text-white text-3xl font-black leading-tight tracking-tight">
              Admin Dashboard
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Welcome back, {user?.full_name?.split(" ")[0] ?? "there"} 👋
            </p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mb-10">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            System Statistics
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              loading={loading}
              icon="group"
              iconBg="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
              label="Total Users"
              value="–"
              sub="Pending stats"
            />

            <StatCard
              loading={loading}
              icon="folder_open"
              iconBg="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
              label="Total Projects"
              value="–"
              sub="Pending stats"
            />

            <StatCard
              loading={loading}
              icon="mic"
              iconBg="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
              label="Total Sessions"
              value="–"
              sub="Pending stats"
            />

            <StatCard
              loading={loading}
              icon="description"
              iconBg="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
              label="Total Artifacts"
              value="–"
              sub="Pending stats"
            />
          </div>
        </div>

        {/* Placeholder */}
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Admin dashboard stats coming soon...
          </p>
        </div>

      </main>
    </div>
  );
}
