"use client";

import { useEffect, useState, use } from "react";
import { useSelector } from "react-redux";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";
import {
  Trophy,
  Star,
  Target,
  Award,
  ArrowLeft,
} from "lucide-react";
import { db } from "@/lib/firebase";
import Navbar from "../../components/Navbar";
import type { RootState } from "../../store/store";

interface PublicProfile {
  email: string;
  username: string;
  bio: string;
  location: string;
  website: string;
  joinedDate: string | null;
}

interface LeaderboardRow {
  email: string;
  name: string;
  points: number;
  solved: number;
  rank: number;
}

const PublicProfilePage = ({
  params,
}: {
  params: Promise<{ email: string }>;
}) => {
  const { email: rawEmail } = use(params);
  const targetEmail = decodeURIComponent(rawEmail).toLowerCase();

  const { userData, status: isLoggedIn } = useSelector(
    (state: RootState) => state.auth
  );
  const myEmail = userData?.email?.toLowerCase() || null;
  const isSelf = myEmail === targetEmail;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow | null>(null);
  const [followers, setFollowers] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [iFollowThem, setIFollowThem] = useState(false);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    const load = async () => {
      const [profileRes, leaderboardSnap, theirFollowsRes, myFollowsRes] =
        await Promise.allSettled([
          fetch(`/api/user/profile?email=${encodeURIComponent(targetEmail)}`),
          getDocs(collection(db, "leaderboard")),
          fetch(`/api/follow?userEmail=${encodeURIComponent(targetEmail)}`),
          myEmail
            ? fetch(`/api/follow?userEmail=${encodeURIComponent(myEmail)}`)
            : Promise.resolve(null),
        ]);

      if (cancelled) return;

      // --- Mongo profile (bio/location/website + joined) ---
      let p: PublicProfile | null = null;
      if (profileRes.status === "fulfilled") {
        const res = profileRes.value;
        if (res.ok) {
          const json = await res.json();
          if (json?.success) {
            p = {
              email: json.profile.email,
              username:
                json.profile.username || json.profile.email.split("@")[0],
              bio: json.profile.bio || "",
              location: json.profile.location || "",
              website: json.profile.website || "",
              joinedDate: json.profile.createdAt || null,
            };
          }
        } else if (res.status === 404) {
          // No Mongo record — but they may still exist in the Firestore
          // leaderboard. Fall back to a synthesized profile.
          p = {
            email: targetEmail,
            username: targetEmail.split("@")[0],
            bio: "",
            location: "",
            website: "",
            joinedDate: null,
          };
        }
      }

      // --- Firestore leaderboard (points + solved + rank) ---
      let lbRow: LeaderboardRow | null = null;
      if (leaderboardSnap.status === "fulfilled") {
        const rows = leaderboardSnap.value.docs
          .map((doc) => {
            const d = doc.data();
            const solvedIds = Array.isArray(d.solvedQuestionIds)
              ? d.solvedQuestionIds.length
              : d.questionsDone || 0;
            return {
              email: (d.email || doc.id).toLowerCase(),
              name: d.name || (d.email || doc.id),
              points: typeof d.points === "number" ? d.points : 0,
              solved: solvedIds,
            };
          })
          .sort((a, b) => b.points - a.points || b.solved - a.solved);

        const idx = rows.findIndex((r) => r.email === targetEmail);
        if (idx >= 0) {
          lbRow = { ...rows[idx], rank: idx + 1 };
          // If Mongo had no record, use the Firestore name as username.
          if (p && !p.username) p.username = rows[idx].name;
        }
      }

      // If neither Mongo nor Firestore knew them, it's a real 404.
      if (!p && !lbRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      if (!p && lbRow) {
        p = {
          email: targetEmail,
          username: lbRow.name,
          bio: "",
          location: "",
          website: "",
          joinedDate: null,
        };
      }

      // --- Their follower/following lists ---
      let theirFollowers: string[] = [];
      let theirFollowing: string[] = [];
      if (theirFollowsRes.status === "fulfilled") {
        const json = await theirFollowsRes.value.json();
        if (json?.success) {
          theirFollowers = json.followers || [];
          theirFollowing = json.following || [];
        }
      }

      // --- Am I following them? ---
      let mine = false;
      if (myFollowsRes.status === "fulfilled" && myFollowsRes.value) {
        const json = await myFollowsRes.value.json();
        if (json?.success) {
          mine = (json.following || []).includes(targetEmail);
        }
      }

      setProfile(p);
      setLeaderboard(lbRow);
      setFollowers(theirFollowers);
      setFollowing(theirFollowing);
      setIFollowThem(mine);
      setLoading(false);
    };

    load().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [targetEmail, myEmail]);

  const toggleFollow = async () => {
    if (!myEmail || isSelf || pending) return;
    setPending(true);
    const wasFollowing = iFollowThem;
    setIFollowThem(!wasFollowing);
    setFollowers((prev) =>
      wasFollowing ? prev.filter((e) => e !== myEmail) : [...prev, myEmail]
    );
    try {
      const res = await fetch("/api/follow", {
        method: wasFollowing ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followerEmail: myEmail,
          followingEmail: targetEmail,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      // Roll back optimistic update.
      setIFollowThem(wasFollowing);
      setFollowers((prev) =>
        wasFollowing
          ? [...prev, myEmail]
          : prev.filter((e) => e !== myEmail)
      );
    } finally {
      setPending(false);
    }
  };

  const initials = (profile?.username || targetEmail)
    .split(/\s+|@/)
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const formatJoined = (date: string | null) => {
    if (!date) return "—";
    try {
      return new Date(date).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen dark:bg-[#020612] text-gray-900 dark:text-white">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-6xl mb-4">🤷</p>
          <h1 className="text-2xl font-bold mb-2">User not found</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            No coder with the email <code>{targetEmail}</code> exists.
          </p>
          <Link
            href="/Leaderboards"
            className="text-blue-600 hover:underline"
          >
            Browse the leaderboard →
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-[#020612] text-gray-900 dark:text-white">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/Leaderboards"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Leaderboards
        </Link>

        {loading ? (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow p-12 text-center">
            <div className="animate-spin mx-auto rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : profile ? (
          <>
            {/* Header card */}
            <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-[0_4px_20px_rgba(128,0,255,0.15)] p-6 mb-6">
              <div className="flex items-start gap-5">
                <div className="shrink-0 w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl bg-gradient-to-br from-blue-500 to-purple-600">
                  {initials || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold truncate">
                    {profile.username}
                    {isSelf && (
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        (you)
                      </span>
                    )}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {profile.email}
                  </p>
                  {profile.bio && (
                    <p className="text-sm mt-2 text-gray-700 dark:text-gray-200">
                      {profile.bio}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
                    {profile.location && <span>📍 {profile.location}</span>}
                    {profile.website && (
                      <a
                        href={
                          profile.website.startsWith("http")
                            ? profile.website
                            : `https://${profile.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        🔗 {profile.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                    <span>📅 Joined {formatJoined(profile.joinedDate)}</span>
                  </div>
                </div>
                {isLoggedIn && !isSelf && (
                  <button
                    onClick={toggleFollow}
                    disabled={pending}
                    className={`shrink-0 text-sm px-4 py-2 rounded-full font-medium transition ${
                      iFollowThem
                        ? "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-300"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    } disabled:opacity-50`}
                  >
                    {pending
                      ? "..."
                      : iFollowThem
                      ? "Following"
                      : "Follow"}
                  </button>
                )}
              </div>

              {/* Follower / Following counts */}
              <div className="flex gap-6 mt-5 pt-5 border-t border-gray-100 dark:border-zinc-700 text-sm">
                <div>
                  <span className="font-bold">{followers.length}</span>{" "}
                  <span className="text-gray-500 dark:text-gray-400">
                    Followers
                  </span>
                </div>
                <div>
                  <span className="font-bold">{following.length}</span>{" "}
                  <span className="text-gray-500 dark:text-gray-400">
                    Following
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <Stat
                icon={Trophy}
                label="Rank"
                value={
                  leaderboard?.rank ? `#${leaderboard.rank}` : "Unranked"
                }
              />
              <Stat
                icon={Star}
                label="Points"
                value={leaderboard?.points || 0}
              />
              <Stat
                icon={Award}
                label="Solved"
                value={leaderboard?.solved || 0}
              />
              <Stat
                icon={Target}
                label="Followers"
                value={followers.length}
              />
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
};

const Stat = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string | number;
}) => (
  <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-4 text-white text-center">
    <Icon className="w-5 h-5 mx-auto mb-1" />
    <p className="text-xs">{label}</p>
    <p className="text-xl font-bold">{value}</p>
  </div>
);

export default PublicProfilePage;
