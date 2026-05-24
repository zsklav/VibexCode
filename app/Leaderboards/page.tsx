"use client";

import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";
import { db } from "@/lib/firebase";
import Navbar from "../components/Navbar";
import type { RootState } from "../store/store";

interface Player {
  name: string;
  email: string;
  questionsDone: number;
  points: number;
}

const COLLECTION_NAME = "leaderboard";

const LeaderboardsPage = () => {
  const { userData, status: isLoggedIn } = useSelector(
    (state: RootState) => state.auth
  );
  const myEmail = userData?.email?.toLowerCase() || null;

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [pendingEmails, setPendingEmails] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const snapshot = await getDocs(collection(db, COLLECTION_NAME));
        const data: Player[] = snapshot.docs.map((doc) => {
          const d = doc.data();
          const solvedIds = Array.isArray(d.solvedQuestionIds)
            ? d.solvedQuestionIds
            : [];
          return {
            name: d.name || "Anonymous",
            email: (d.email || doc.id).toLowerCase(),
            questionsDone: solvedIds.length || d.questionsDone || 0,
            points: typeof d.points === "number" ? d.points : 0,
          };
        });
        data.sort(
          (a, b) => b.points - a.points || b.questionsDone - a.questionsDone
        );
        setPlayers(data);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to load leaderboard"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  // Fetch which users the current user is already following so we can
  // render "Following" instead of "Follow" on those rows.
  useEffect(() => {
    if (!isLoggedIn || !myEmail) {
      setFollowingSet(new Set());
      return;
    }
    fetch(`/api/follow?userEmail=${encodeURIComponent(myEmail)}`)
      .then((r) => r.json())
      .then((d: { following?: string[] }) =>
        setFollowingSet(new Set(d.following || []))
      )
      .catch(() => setFollowingSet(new Set()));
  }, [isLoggedIn, myEmail]);

  const toggleFollow = async (targetEmail: string) => {
    if (!myEmail) return;
    if (pendingEmails.has(targetEmail)) return;

    const isFollowing = followingSet.has(targetEmail);
    setPendingEmails((p) => new Set(p).add(targetEmail));

    // Optimistic UI update — rolled back if request fails.
    setFollowingSet((s) => {
      const next = new Set(s);
      if (isFollowing) next.delete(targetEmail);
      else next.add(targetEmail);
      return next;
    });

    try {
      const res = await fetch("/api/follow", {
        method: isFollowing ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followerEmail: myEmail,
          followingEmail: targetEmail,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error("Follow toggle failed:", e);
      // Roll back optimistic update.
      setFollowingSet((s) => {
        const next = new Set(s);
        if (isFollowing) next.add(targetEmail);
        else next.delete(targetEmail);
        return next;
      });
    } finally {
      setPendingEmails((p) => {
        const next = new Set(p);
        next.delete(targetEmail);
        return next;
      });
    }
  };

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen dark:bg-[#020612] text-gray-900 dark:text-white">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🏆 Leaderboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Top problem solvers in the community
          </p>
        </div>

        {loading && (
          <p className="text-center py-12 text-gray-500">
            Loading leaderboard...
          </p>
        )}

        {error && !loading && (
          <p className="text-center py-12 text-red-500">Error: {error}</p>
        )}

        {!loading && !error && players.length === 0 && (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-12 text-center shadow">
            <p className="text-gray-500">
              No one has solved any problems yet.
            </p>
            <p className="text-sm text-gray-400 mt-2">Be the first!</p>
          </div>
        )}

        {!loading && !error && players.length > 0 && (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-[0_4px_20px_rgba(128,0,255,0.15)] overflow-hidden">
            {players.map((player, i) => {
              const isSelf = isLoggedIn && player.email === myEmail;
              const isFollowing = followingSet.has(player.email);
              const isPending = pendingEmails.has(player.email);
              return (
                <div
                  key={player.email}
                  className={`flex items-center justify-between p-5 ${
                    i !== players.length - 1
                      ? "border-b border-gray-100 dark:border-zinc-700"
                      : ""
                  } ${
                    i < 3
                      ? "bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-900/10 dark:to-transparent"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-lg font-semibold text-gray-500 dark:text-gray-400 w-8">
                      #{i + 1}
                    </span>
                    <div
                      className={`shrink-0 rounded-full h-12 w-12 flex items-center justify-center text-white font-bold text-lg ${
                        i === 0
                          ? "bg-yellow-500"
                          : i === 1
                          ? "bg-gray-400"
                          : i === 2
                          ? "bg-yellow-800"
                          : "bg-purple-500"
                      }`}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">
                        <Link
                          href={`/u/${encodeURIComponent(player.email)}`}
                          className="hover:underline hover:text-purple-600 dark:hover:text-purple-300 transition"
                        >
                          {player.name}
                        </Link>
                        {isSelf && (
                          <span className="ml-2 text-xs text-gray-400">
                            (you)
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-purple-600 dark:text-purple-300">
                          {player.points} pts
                        </span>
                        <span className="mx-1.5">·</span>
                        {player.questionsDone}{" "}
                        {player.questionsDone === 1 ? "problem" : "problems"}{" "}
                        solved
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {isLoggedIn && !isSelf && (
                      <button
                        onClick={() => toggleFollow(player.email)}
                        disabled={isPending}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                          isFollowing
                            ? "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-300"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        } disabled:opacity-50`}
                      >
                        {isPending
                          ? "..."
                          : isFollowing
                          ? "Following"
                          : "Follow"}
                      </button>
                    )}
                    <div className="text-2xl">{medals[i] || "🎖️"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default LeaderboardsPage;
