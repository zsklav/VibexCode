"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import type { RootState } from "../store/store";

interface LeaderboardSummary {
  email: string;
  name: string;
  points: number;
  questionsDone: number;
}

type Tab = "following" | "followers";

const COLLECTION_NAME = "leaderboard";

const FriendsSection = () => {
  const { userData, status: isLoggedIn } = useSelector(
    (state: RootState) => state.auth
  );
  const myEmail = userData?.email?.toLowerCase() || null;

  const [tab, setTab] = useState<Tab>("following");
  const [followers, setFollowers] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Record<string, LeaderboardSummary>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  // Pull follow lists for the current user.
  useEffect(() => {
    if (!isLoggedIn || !myEmail) {
      setFollowers([]);
      setFollowing([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/follow?userEmail=${encodeURIComponent(myEmail)}`)
      .then((r) => r.json())
      .then((d: { followers?: string[]; following?: string[] }) => {
        if (cancelled) return;
        setFollowers(d.followers || []);
        setFollowing(d.following || []);
      })
      .catch(() => {
        if (!cancelled) {
          setFollowers([]);
          setFollowing([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, myEmail]);

  // Pull a tiny profile (name + points) for each follower/following from
  // the Firestore leaderboard. Single read of the whole leaderboard
  // collection — fine while leaderboards stay small. Move to a per-user
  // /api/users/[email] lookup if this gets heavy.
  useEffect(() => {
    if (!isLoggedIn) {
      setProfiles({});
      return;
    }
    let cancelled = false;
    const fetchProfiles = async () => {
      try {
        const snap = await getDocs(collection(db, COLLECTION_NAME));
        if (cancelled) return;
        const map: Record<string, LeaderboardSummary> = {};
        snap.docs.forEach((doc) => {
          const d = doc.data();
          const email = (d.email || doc.id).toLowerCase();
          const solved = Array.isArray(d.solvedQuestionIds)
            ? d.solvedQuestionIds.length
            : d.questionsDone || 0;
          map[email] = {
            email,
            name: d.name || email,
            points: typeof d.points === "number" ? d.points : 0,
            questionsDone: solved,
          };
        });
        setProfiles(map);
      } catch {
        // Non-fatal — we'll just show emails without names.
      }
    };
    fetchProfiles();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const unfollow = async (targetEmail: string) => {
    if (!myEmail) return;
    if (pending.has(targetEmail)) return;
    setPending((p) => new Set(p).add(targetEmail));
    // Optimistic removal.
    setFollowing((f) => f.filter((e) => e !== targetEmail));
    try {
      await fetch("/api/follow", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followerEmail: myEmail,
          followingEmail: targetEmail,
        }),
      });
    } catch {
      // Roll back if it failed.
      setFollowing((f) => Array.from(new Set([...f, targetEmail])));
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(targetEmail);
        return next;
      });
    }
  };

  const follow = async (targetEmail: string) => {
    if (!myEmail || targetEmail === myEmail) return;
    if (pending.has(targetEmail)) return;
    setPending((p) => new Set(p).add(targetEmail));
    setFollowing((f) => Array.from(new Set([...f, targetEmail])));
    try {
      await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followerEmail: myEmail,
          followingEmail: targetEmail,
        }),
      });
    } catch {
      setFollowing((f) => f.filter((e) => e !== targetEmail));
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(targetEmail);
        return next;
      });
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold mb-2">Network</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Log in to follow other coders.
        </p>
      </div>
    );
  }

  const list = tab === "following" ? following : followers;
  const followingSet = new Set(following);

  const searchQuery = search.trim().toLowerCase();
  const searchResults = searchQuery
    ? Object.values(profiles)
        .filter((p) => {
          if (p.email === myEmail) return false;
          return (
            p.name.toLowerCase().includes(searchQuery) ||
            p.email.toLowerCase().includes(searchQuery)
          );
        })
        .sort((a, b) => b.points - a.points)
        .slice(0, 20)
    : [];

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl shadow p-4 space-y-3">
      <h2 className="text-lg font-semibold">Network</h2>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name or email..."
          className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
        />
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
          />
        </svg>
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {/* Search results — replace tabs/list when query is active */}
      {searchQuery ? (
        <div className="space-y-2">
          {searchResults.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
              No users found for &ldquo;{search}&rdquo;.
            </p>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-y-auto">
              {searchResults.map((p) => {
                const isAlreadyFollowing = followingSet.has(p.email);
                const isPending = pending.has(p.email);
                return (
                  <li
                    key={p.email}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700/50"
                  >
                    <Link
                      href={`/u/${encodeURIComponent(p.email)}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-blue-500 to-purple-600">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate hover:text-purple-600 dark:hover:text-purple-300">
                          {p.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {p.points} pts · {p.questionsDone} solved
                        </p>
                      </div>
                    </Link>
                    {isAlreadyFollowing ? (
                      <button
                        onClick={() => unfollow(p.email)}
                        disabled={isPending}
                        className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-300 transition disabled:opacity-50"
                      >
                        {isPending ? "..." : "Following"}
                      </button>
                    ) : (
                      <button
                        onClick={() => follow(p.email)}
                        disabled={isPending}
                        className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {isPending ? "..." : "Follow"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <>
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-zinc-700 p-1 text-sm">
        <button
          onClick={() => setTab("following")}
          className={cn(
            "flex-1 py-1.5 rounded-md transition",
            tab === "following"
              ? "bg-white dark:bg-zinc-800 shadow text-purple-700 dark:text-purple-300 font-medium"
              : "text-gray-600 dark:text-gray-300"
          )}
        >
          Following {following.length > 0 && `(${following.length})`}
        </button>
        <button
          onClick={() => setTab("followers")}
          className={cn(
            "flex-1 py-1.5 rounded-md transition",
            tab === "followers"
              ? "bg-white dark:bg-zinc-800 shadow text-purple-700 dark:text-purple-300 font-medium"
              : "text-gray-600 dark:text-gray-300"
          )}
        >
          Followers {followers.length > 0 && `(${followers.length})`}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-gray-500 py-4 text-center">Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
          {tab === "following" ? (
            <>
              You aren&apos;t following anyone yet. Visit{" "}
              <a
                href="/Leaderboards"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Leaderboards
              </a>{" "}
              to find people.
            </>
          ) : (
            "No followers yet."
          )}
        </p>
      ) : (
        <ul className="space-y-2 max-h-72 overflow-y-auto">
          {list.map((email) => {
            const p = profiles[email];
            const name = p?.name || email;
            const isAlreadyFollowing = followingSet.has(email);
            const isPending = pending.has(email);
            return (
              <li
                key={email}
                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700/50"
              >
                <Link
                  href={`/u/${encodeURIComponent(email)}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-blue-500 to-purple-600">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate hover:text-purple-600 dark:hover:text-purple-300">
                      {name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {p
                        ? `${p.points} pts · ${p.questionsDone} solved`
                        : email}
                    </p>
                  </div>
                </Link>
                {tab === "following" ? (
                  <button
                    onClick={() => unfollow(email)}
                    disabled={isPending}
                    className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-300 transition disabled:opacity-50"
                  >
                    {isPending ? "..." : "Unfollow"}
                  </button>
                ) : isAlreadyFollowing ? (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-700 text-gray-500">
                    Mutual
                  </span>
                ) : (
                  <button
                    onClick={() => follow(email)}
                    disabled={isPending}
                    className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {isPending ? "..." : "Follow back"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
        </>
      )}
    </div>
  );
};

export default FriendsSection;
