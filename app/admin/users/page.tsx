"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Navbar from "../../components/Navbar";
import { isAdminEmail } from "@/lib/auth";
import type { RootState } from "../../store/store";

type User = {
  _id: string;
  email: string;
  name?: string;
  username?: string;
  status?: "Online" | "Idle" | "Busy" | "Offline";
};

const STATUS_OPTIONS: User["status"][] = ["Online", "Idle", "Busy", "Offline"];

const statusClass: Record<NonNullable<User["status"]>, string> = {
  Online: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  Idle: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  Busy: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  Offline: "bg-gray-200 text-gray-700 dark:bg-zinc-700 dark:text-gray-300",
};

export default function AdminUsersPage() {
  const { userData } = useSelector((state: RootState) => state.auth);
  const adminEmail = userData?.email || null;
  const isAdmin = isAdminEmail(adminEmail);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/dev/users");
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = (await res.json()) as User[];
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (userId: string, newStatus: User["status"]) => {
    setUpdating(userId);
    try {
      const res = await fetch(`/api/dev/users/${userId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, status: newStatus } : u))
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchUsers();
    else setLoading(false);
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen dark:bg-[#020612] text-gray-900 dark:text-white">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-6xl mb-4">🔒</p>
          <h1 className="text-2xl font-bold">Admins only</h1>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-[#020612] text-gray-900 dark:text-white">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Admin home
        </Link>

        <h1 className="text-3xl font-bold mb-1">Users</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          {users.length} registered
        </p>

        {loading ? (
          <p className="text-center py-12 text-gray-500">Loading...</p>
        ) : error ? (
          <p className="text-center py-12 text-red-500">{error}</p>
        ) : users.length === 0 ? (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-12 text-center shadow">
            <p className="text-gray-500">No users found.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow overflow-hidden">
            {users.map((user, i) => (
              <div
                key={user._id}
                className={`flex items-center justify-between gap-4 p-4 ${
                  i !== users.length - 1
                    ? "border-b border-gray-100 dark:border-zinc-700"
                    : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    {user.name || user.username || "—"}
                    <Link
                      href={`/u/${encodeURIComponent(user.email)}`}
                      className="ml-2 inline-flex items-center text-xs text-blue-600 hover:underline"
                    >
                      view <ExternalLink className="w-3 h-3 ml-0.5" />
                    </Link>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      statusClass[user.status || "Offline"]
                    }`}
                  >
                    {user.status || "Offline"}
                  </span>
                  <select
                    value={user.status || "Offline"}
                    onChange={(e) =>
                      updateStatus(user._id, e.target.value as User["status"])
                    }
                    disabled={updating === user._id}
                    className="text-xs px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-700 disabled:opacity-50"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
