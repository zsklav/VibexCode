"use client";

import { useEffect, useState } from "react";
import { FaCode, FaGamepad, FaPython, FaBolt } from "react-icons/fa";
import { SiLeetcode } from "react-icons/si";

import Navbar from "../components/Navbar";
import ChatWindow from "../components/ChatWindow";
import authservice from "@/app/auth/firebase-auth";

interface User {
  $id: string;
  name: string;
}

interface Forum {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const forums: Forum[] = [
  {
    key: "general",
    label: "General",
    description: "Off-topic chat and intros.",
    icon: <FaBolt />,
  },
  {
    key: "dev",
    label: "Dev",
    description: "Frontend, backend, devops talk.",
    icon: <FaCode />,
  },
  {
    key: "cp",
    label: "Competitive",
    description: "LeetCode, Codeforces, contest strats.",
    icon: <SiLeetcode />,
  },
  {
    key: "python",
    label: "Python",
    description: "Python questions, libraries, tricks.",
    icon: <FaPython />,
  },
  {
    key: "games",
    label: "Games",
    description: "Game-dev, game algorithms, fun stuff.",
    icon: <FaGamepad />,
  },
];

interface MemberSummary {
  _id: string;
  email: string;
  name?: string;
  username?: string;
  status?: "Online" | "Idle" | "Busy" | "Offline";
}

export default function CommunityPage() {
  const [selected, setSelected] = useState<string>("general");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [members, setMembers] = useState<MemberSummary[]>([]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const authUser = await authservice.checkUser();
        if (authUser) {
          setUser({
            $id: authUser.$id,
            name: authUser.name || authUser.email || "User",
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Pull the member list for the right rail. Re-fetched once per session;
  // status is stale-ish but good enough until we wire real presence.
  useEffect(() => {
    fetch("/api/dev/users")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMembers(data);
      })
      .catch(() => setMembers([]));
  }, []);

  const activeForum = forums.find((f) => f.key === selected) || forums[0];

  // Group members by online status so Online appears first.
  const groupedMembers = {
    online: members.filter((m) => m.status === "Online"),
    idle: members.filter((m) => m.status === "Idle"),
    busy: members.filter((m) => m.status === "Busy"),
    offline: members.filter(
      (m) => !m.status || m.status === "Offline"
    ),
  };

  if (loading) {
    return (
      <div className="min-h-screen dark:bg-[#020612] text-gray-900 dark:text-white">
        <Navbar />
        <main className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen dark:bg-[#020612] text-gray-900 dark:text-white">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-6xl mb-4">🔒</p>
          <h1 className="text-2xl font-bold mb-2">Log in to join the chat</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Community forums are visible only to signed-in users.
          </p>
        </main>
      </div>
    );
  }

  const sidebar = (
    <aside className="w-full md:w-64 shrink-0 bg-white dark:bg-zinc-900 md:border-r border-gray-200 dark:border-zinc-800 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
        <h2 className="text-lg font-bold">Forums</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {forums.length} channels
        </p>
      </div>
      <ul className="flex-1 overflow-y-auto p-2 space-y-1">
        {forums.map((forum) => {
          const isSelected = forum.key === selected;
          return (
            <li key={forum.key}>
              <button
                onClick={() => {
                  setSelected(forum.key);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition text-left
                  ${
                    isSelected
                      ? "bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-purple-700 dark:text-purple-300"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  }`}
              >
                <span
                  className={
                    isSelected ? "text-purple-600" : "text-gray-400"
                  }
                >
                  {forum.icon}
                </span>
                <span>#{forum.key}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );

  return (
    <div className="h-screen flex flex-col dark:bg-[#020612] text-gray-900 dark:text-white">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — desktop always, mobile via toggle */}
        {!isMobile && sidebar}
        {isMobile && mobileSidebarOpen && (
          <div className="absolute inset-0 z-30 flex">
            <div className="flex-1 max-w-xs h-full">{sidebar}</div>
            <div
              className="flex-1 bg-black/40"
              onClick={() => setMobileSidebarOpen(false)}
            />
          </div>
        )}

        {/* Main chat panel */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-900">
          <header className="px-4 md:px-6 py-3 border-b border-gray-200 dark:border-zinc-800 flex items-center gap-3">
            {isMobile && (
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="p-1 -ml-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                aria-label="Open forum list"
              >
                ☰
              </button>
            )}
            <div className="text-purple-600 text-xl">{activeForum.icon}</div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold leading-tight">
                #{activeForum.key}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {activeForum.description}
              </p>
            </div>
          </header>

          <div className="flex-1 overflow-hidden">
            <ChatWindow
              conversationId={selected}
              selfId={user.$id}
              selfName={user.name}
              channelName={activeForum.key}
              channelDescription={activeForum.description}
            />
          </div>
        </main>

        {/* Members rail (desktop only) — fills the otherwise-empty right side */}
        {!isMobile && (
          <aside className="w-60 shrink-0 bg-white dark:bg-zinc-900 border-l border-gray-200 dark:border-zinc-800 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Members
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {members.length} total ·{" "}
                <span className="text-green-600">
                  {groupedMembers.online.length} online
                </span>
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-4">
              <MemberGroup
                label="Online"
                color="bg-green-500"
                members={groupedMembers.online}
              />
              <MemberGroup
                label="Idle"
                color="bg-yellow-500"
                members={groupedMembers.idle}
              />
              <MemberGroup
                label="Busy"
                color="bg-red-500"
                members={groupedMembers.busy}
              />
              <MemberGroup
                label="Offline"
                color="bg-gray-400"
                members={groupedMembers.offline}
                muted
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

const MemberGroup = ({
  label,
  color,
  members,
  muted = false,
}: {
  label: string;
  color: string;
  members: MemberSummary[];
  muted?: boolean;
}) => {
  if (members.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-2 mb-1">
        {label} — {members.length}
      </p>
      <ul className="space-y-0.5">
        {members.map((m) => {
          const display = m.name || m.username || m.email;
          const initial = (display.charAt(0) || "?").toUpperCase();
          return (
            <li key={m._id}>
              <a
                href={`/u/${encodeURIComponent(m.email)}`}
                className={`flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 ${
                  muted ? "opacity-60" : ""
                }`}
              >
                <div className="relative shrink-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                    {initial}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900 ${color}`}
                  />
                </div>
                <span className="text-sm truncate flex-1">{display}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
