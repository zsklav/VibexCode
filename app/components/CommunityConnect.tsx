"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Tab } from "@headlessui/react";
import { useSelector } from "react-redux";
import { cn } from "@/lib/utils";
import { Loader2, AlertTriangle, LogOut } from "lucide-react";
import type { RootState } from "../store/store";

interface Clan {
  $id: string;
  name: string;
  tag: string;
  memberCount: number;
  ownerEmail?: string;
}

const CommunityConnect: React.FC = () => {
  const { userData, status: isLoggedIn } = useSelector(
    (state: RootState) => state.auth
  );
  const userEmail = userData?.email ?? null;

  const [myClan, setMyClan] = useState<Clan | null>(null);
  const [joinKey, setJoinKey] = useState<string>("");
  const [newClanName, setNewClanName] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial clan data from MongoDB-backed API.
  useEffect(() => {
    let cancelled = false;

    const fetchUserClanData = async () => {
      if (!isLoggedIn || !userEmail) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/clan?userEmail=${encodeURIComponent(userEmail)}`
        );

        if (res.status === 404) {
          // Not in a clan — normal state, no error.
          if (!cancelled) setMyClan(null);
        } else if (res.ok) {
          const data = (await res.json()) as Clan;
          if (!cancelled) setMyClan(data);
        } else {
          const body = await res.json().catch(() => ({}));
          if (!cancelled)
            setError(
              body?.message ||
                "Could not load your community information. Please try refreshing."
            );
        }
      } catch (err) {
        console.error("Failed to fetch user clan data:", err);
        if (!cancelled)
          setError(
            "Could not load your community information. Please try refreshing."
          );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchUserClanData();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, userEmail]);

  // --- API HANDLERS ---

  const handleJoinClan = async () => {
    if (!joinKey.trim() || !userEmail) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const joinRes = await fetch("/api/clan/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail, clanId: joinKey.trim() }),
      });
      const joinBody = await joinRes.json().catch(() => ({}));
      if (!joinRes.ok) {
        throw new Error(joinBody?.message || "Failed to join clan.");
      }

      const clanRes = await fetch(
        `/api/clan/${encodeURIComponent(joinKey.trim())}`
      );
      if (clanRes.ok) {
        const clanData = (await clanRes.json()) as Clan;
        setMyClan(clanData);
      }
      setJoinKey("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join clan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateClan = async () => {
    if (!newClanName.trim() || !userEmail) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/clan/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail, name: newClanName.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || "Failed to create clan.");
      }
      setMyClan(body as Clan);
      setNewClanName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create clan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveClan = async () => {
    if (!userEmail) return;
    if (!window.confirm("Are you sure you want to leave this clan?")) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/clan/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || "Failed to leave clan.");
      }
      setMyClan(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave clan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDER STATES ---

  if (!isLoggedIn || !userEmail) {
    return (
      <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 border text-center">
        <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">
          Community Connect
        </h3>
        <p className="text-gray-600 dark:text-slate-300 text-sm">
          Log in to join or create a clan.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 flex items-center justify-center h-64 border">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Loading Community...</p>
        </div>
      </div>
    );
  }

  if (error && !isSubmitting) {
    return (
      <div className="w-full max-w-md mx-auto bg-slate-800 rounded-2xl shadow-xl p-6 border border-slate-700 text-center">
        <AlertTriangle size={48} className="mx-auto mb-2 text-red-400" />
        <h3 className="text-lg font-semibold text-white">An Error Occurred</h3>
        <p className="text-slate-300 text-sm my-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6 h-full"
    >
      <h2 className="text-2xl font-bold mb-4 text-center text-gray-800 dark:text-white">
        Community Connect
      </h2>

      <Tab.Group>
        <Tab.List className="flex space-x-2 rounded-xl bg-gray-200 dark:bg-gray-700 p-1 mb-4">
          {["My Clan", "Join Clan", "Create Clan"].map((tab) => (
            <Tab
              key={tab}
              className={({ selected }) =>
                cn(
                  "w-full rounded-lg py-2 text-sm font-medium leading-5 transition",
                  "focus:outline-none focus:ring-2 focus:ring-purple-500/40",
                  selected
                    ? "bg-white text-purple-700 shadow dark:bg-gray-800 dark:text-purple-300"
                    : "text-gray-700 hover:bg-white/40 dark:text-gray-300 dark:hover:bg-gray-600/40"
                )
              }
            >
              {tab}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels className="mt-2">
          {/* My Clan Panel */}
          <Tab.Panel>
            {myClan ? (
              <div className="space-y-4 text-center">
                <h3 className="text-2xl font-semibold text-gray-800 dark:text-white">
                  {myClan.name} [{myClan.tag}]
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Members: {myClan.memberCount}
                </p>
                <p className="text-sm text-gray-500">
                  Clan ID:{" "}
                  <code className="bg-gray-200 dark:bg-gray-700 p-1 rounded">
                    {myClan.$id}
                  </code>
                </p>
                <button
                  onClick={handleLeaveClan}
                  disabled={isSubmitting}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2 mx-auto disabled:bg-gray-400"
                >
                  <LogOut size={16} />{" "}
                  {isSubmitting ? "Leaving..." : "Leave Clan"}
                </button>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                You&apos;re not in a clan yet. Join or create one!
              </p>
            )}
          </Tab.Panel>

          {/* Join Clan Panel */}
          <Tab.Panel>
            <div className="space-y-4">
              <label
                htmlFor="join-key"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Enter Clan ID to Join:
              </label>
              <input
                id="join-key"
                value={joinKey}
                onChange={(e) => setJoinKey(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g., 65d8c..."
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={handleJoinClan}
                disabled={isSubmitting}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                {isSubmitting ? "Joining..." : "Join Clan"}
              </button>
            </div>
          </Tab.Panel>

          {/* Create Clan Panel */}
          <Tab.Panel>
            <div className="space-y-4">
              <label
                htmlFor="clan-name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                New Clan Name:
              </label>
              <input
                id="clan-name"
                value={newClanName}
                onChange={(e) => setNewClanName(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g., The Code Crusaders"
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleCreateClan}
                disabled={isSubmitting}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
              >
                {isSubmitting ? "Creating..." : "Create Clan"}
              </button>
            </div>
          </Tab.Panel>
        </Tab.Panels>

        {error && isSubmitting && (
          <p className="text-red-500 text-sm mt-4 text-center">{error}</p>
        )}
      </Tab.Group>
    </motion.div>
  );
};

export default CommunityConnect;
