"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useSelector } from "react-redux";
import { collection, getDocs } from "firebase/firestore";
import {
  Trophy,
  Star,
  Target,
  Award,
  Calendar,
  Clock,
  Pencil,
  LucideIcon,
} from "lucide-react";
import { db } from "@/lib/firebase";
import type { RootState } from "../store/store";
import EditProfileModal from "./EditProfileModal";

// Level thresholds based on points earned. Tunable in one place.
const LEVELS: Array<{ name: string; min: number }> = [
  { name: "Beginner", min: 0 },
  { name: "Apprentice", min: 50 },
  { name: "Intermediate", min: 200 },
  { name: "Advanced", min: 500 },
  { name: "Expert", min: 1000 },
  { name: "Master", min: 2500 },
];

function levelForPoints(points: number): string {
  let current = LEVELS[0].name;
  for (const tier of LEVELS) {
    if (points >= tier.min) current = tier.name;
  }
  return current;
}

function formatJoinedDate(date: string | Date | null): string {
  if (!date) return "—";
  try {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  location: string;
  phone: string;
  website: string;
  bio: string;
  profileImage?: string;
  stats: {
    rank: number;
    points: number;
    streak: number;
    solved: number;
    level: string;
    completed: number;
    total: number;
    status: "online" | "offline";
    joinedDate: string;
  };
}

const EMPTY_PROFILE: UserProfile = {
  id: "",
  username: "",
  email: "",
  location: "",
  phone: "",
  website: "",
  bio: "",
  profileImage: "",
  stats: {
    rank: 0,
    points: 0,
    streak: 0,
    solved: 0,
    level: LEVELS[0].name,
    completed: 0,
    total: 0,
    status: "offline",
    joinedDate: "—",
  },
};

const ProfileSection = () => {
  const { userData, status: isLoggedIn } = useSelector(
    (state: RootState) => state.auth
  );
  const myEmail = userData?.email?.toLowerCase() || null;

  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    if (!isLoggedIn || !myEmail) {
      setProfile({
        ...EMPTY_PROFILE,
        username: "Guest",
        email: "",
      });
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const load = async () => {
      // Fan out the three data pulls in parallel.
      const [profileRes, leaderboardSnap, questionsRes] =
        await Promise.allSettled([
          fetch(`/api/user/profile?email=${encodeURIComponent(myEmail)}`).then(
            (r) => r.json()
          ),
          getDocs(collection(db, "leaderboard")),
          fetch("/api/questions").then((r) => r.json()),
        ]);

      if (cancelled) return;

      // --- Mongo profile (bio/location/website/phone + streak + joinedAt) ---
      let bio = "";
      let location = "";
      let website = "";
      let phone = "";
      let username = userData?.name || "";
      let streak = 0;
      let joinedDate: string = "—";
      let status: "online" | "offline" = "offline";

      if (profileRes.status === "fulfilled" && profileRes.value?.success) {
        const p = profileRes.value.profile;
        bio = p.bio || "";
        location = p.location || "";
        website = p.website || "";
        phone = p.phone || "";
        username = p.username || username;
        streak = p.stats?.currentStreak || 0;
        joinedDate = formatJoinedDate(p.createdAt);
        status = p.status && p.status !== "Offline" ? "online" : "offline";
      }

      // --- Firestore leaderboard (points + solved count + rank) ---
      let points = 0;
      let solved = 0;
      let rank = 0;
      if (leaderboardSnap.status === "fulfilled") {
        const players = leaderboardSnap.value.docs
          .map((doc) => {
            const d = doc.data();
            const solvedIds = Array.isArray(d.solvedQuestionIds)
              ? d.solvedQuestionIds.length
              : d.questionsDone || 0;
            return {
              email: (d.email || doc.id).toLowerCase(),
              points: typeof d.points === "number" ? d.points : 0,
              solved: solvedIds,
            };
          })
          .sort(
            (a, b) => b.points - a.points || b.solved - a.solved
          );

        const idx = players.findIndex((p) => p.email === myEmail);
        if (idx >= 0) {
          points = players[idx].points;
          solved = players[idx].solved;
          rank = idx + 1;
        }
      }

      // --- Total question pool size, for the completion bar ---
      let total = 0;
      if (questionsRes.status === "fulfilled") {
        const list = questionsRes.value?.questions;
        if (Array.isArray(list)) total = list.length;
      }

      setProfile({
        id: myEmail,
        username,
        email: myEmail,
        location,
        phone,
        website,
        bio,
        profileImage: "",
        stats: {
          rank,
          points,
          streak,
          solved,
          level: levelForPoints(points),
          completed: solved,
          total: Math.max(total, solved),
          status,
          joinedDate,
        },
      });
      setTotalQuestions(total);
      setIsLoading(false);
    };

    load().catch(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, myEmail, userData?.name]);

  const handleSaveProfile = async (updatedData: Partial<UserProfile>) => {
    if (!myEmail) return;

    // Only the four editable fields + username hit the server. Stats are derived.
    const payload: Record<string, string> = { email: myEmail };
    if (typeof updatedData.username === "string")
      payload.username = updatedData.username;
    if (typeof updatedData.bio === "string") payload.bio = updatedData.bio;
    if (typeof updatedData.location === "string")
      payload.location = updatedData.location;
    if (typeof updatedData.website === "string")
      payload.website = updatedData.website;
    if (typeof updatedData.phone === "string") payload.phone = updatedData.phone;

    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json?.success) {
      throw new Error(json?.error || `Save failed (HTTP ${res.status})`);
    }

    setProfile((prev) => ({ ...prev, ...updatedData }));
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  const percent = useMemo(() => {
    if (profile.stats.total === 0) return 0;
    return Math.min(
      100,
      (profile.stats.completed / profile.stats.total) * 100
    );
  }, [profile.stats.completed, profile.stats.total]);

  return (
    <>
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow p-6 space-y-6 flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-blue-500 flex items-center justify-center mb-3 bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-2xl overflow-hidden">
                  {profile.profileImage ? (
                    <Image
                      src={profile.profileImage}
                      alt="Profile"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(profile.username || profile.email)
                  )}
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-4 border-white dark:border-zinc-800 ${
                    profile.stats.status === "online"
                      ? "bg-green-500"
                      : "bg-gray-400"
                  }`}
                />
              </div>
              <h4 className="text-lg font-semibold">
                {profile.username || "—"}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {profile.email || "—"}
              </p>
              {profile.bio ? (
                <p className="text-xs text-gray-600 dark:text-gray-300 text-center mt-1">
                  {profile.bio}
                </p>
              ) : isLoggedIn ? (
                <p className="text-xs text-gray-400 italic mt-1">
                  No bio yet — add one below.
                </p>
              ) : null}
              {isLoggedIn && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="mt-3 flex items-center gap-2 text-blue-600 hover:underline transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit Profile
                </button>
              )}
            </div>

            {/* Stats Grid — all derived, no hardcoded values */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={Trophy}
                label="Rank"
                value={profile.stats.rank > 0 ? `#${profile.stats.rank}` : "—"}
              />
              <StatCard
                icon={Star}
                label="Points"
                value={profile.stats.points}
              />
              <StatCard
                icon={Target}
                label="Streak"
                value={profile.stats.streak}
              />
              <StatCard
                icon={Award}
                label="Solved"
                value={profile.stats.solved}
              />
            </div>

            {/* Profile Info */}
            <div className="bg-gray-100 dark:bg-zinc-700 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Profile Info
              </h4>
              <div className="space-y-2 text-sm">
                <InfoRow label="Level" value={profile.stats.level} />
                <InfoRow
                  label="Completed"
                  value={
                    profile.stats.total > 0
                      ? `${profile.stats.completed}/${profile.stats.total} Questions`
                      : `${profile.stats.completed} Questions`
                  }
                />
                {profile.location && (
                  <InfoRow label="Location" value={profile.location} />
                )}
                {profile.website && (
                  <InfoRow
                    label="Website"
                    value={
                      <a
                        href={
                          profile.website.startsWith("http")
                            ? profile.website
                            : `https://${profile.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate max-w-[160px] inline-block"
                      >
                        {profile.website.replace(/^https?:\/\//, "")}
                      </a>
                    }
                  />
                )}
                <InfoRow
                  label="Status"
                  value={
                    <span
                      className={`flex items-center gap-1 ${
                        profile.stats.status === "online"
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          profile.stats.status === "online"
                            ? "bg-green-500"
                            : "bg-gray-400"
                        }`}
                      />
                      {profile.stats.status === "online" ? "Online" : "Offline"}
                    </span>
                  }
                />
                <InfoRow label="Joined" value={profile.stats.joinedDate} />
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Progress
              </h4>
              <div className="w-full h-4 bg-gray-300 dark:bg-zinc-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
                <span>{percent.toFixed(0)}% Completed</span>
                <span>
                  {Math.max(0, profile.stats.total - profile.stats.completed)}{" "}
                  Remaining
                </span>
              </div>
              {totalQuestions === 0 && isLoggedIn && (
                <p className="text-[10px] text-gray-400">
                  No questions in the pool yet.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <EditProfileModal
        isOpen={isEditing}
        profile={profile}
        onClose={() => setIsEditing(false)}
        onSave={handleSaveProfile}
      />
    </>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) => (
  <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-3 text-white text-center">
    <Icon className="w-5 h-5 mx-auto mb-1" />
    <p className="text-xs font-medium">{label}</p>
    <p className="text-lg font-bold">{value}</p>
  </div>
);

const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex justify-between gap-2">
    <span className="text-gray-600 dark:text-gray-300 shrink-0">{label}:</span>
    <span className="font-medium text-right truncate">{value}</span>
  </div>
);

export default ProfileSection;
