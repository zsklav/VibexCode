"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bookmark, Search } from "lucide-react";

import Navbar from "../components/Navbar";
import authservice from "@/app/auth/firebase-auth";

type BookmarkMessage = {
  _id: string;
  conversation: string;
  senderName?: string;
  body?: string;
  createdAt?: string;
};

export default function BookmarksPage() {
  const [userId, setUserId] = useState("");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<BookmarkMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authservice
      .checkUser()
      .then((user) => {
        if (!user || cancelled) return null;
        setUserId(user.$id);
        return fetch(`/api/bookmarks/${encodeURIComponent(user.$id)}`);
      })
      .then((res) => res?.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setMessages(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return messages;
    return messages.filter((message) =>
      `${message.senderName || ""} ${message.body || ""} ${message.conversation}`
        .toLowerCase()
        .includes(needle)
    );
  }, [messages, query]);

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-zinc-950 dark:text-white">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
            <Bookmark className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Bookmarks</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Saved messages from your developer chats.
            </p>
          </div>
        </div>

        <label className="mb-5 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search bookmarks"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>

        {loading ? (
          <p className="text-sm text-gray-500">Loading bookmarks...</p>
        ) : !userId ? (
          <p className="text-sm text-gray-500">Log in to view bookmarks.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-500">No bookmarked messages found.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((message) => (
              <article
                key={message._id}
                className="rounded-lg border border-gray-200 p-4 dark:border-zinc-800"
              >
                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-gray-500">
                  <span>
                    #{message.conversation} by {message.senderName || "Unknown"}
                  </span>
                  <Link
                    href={`/community?channel=${encodeURIComponent(
                      message.conversation
                    )}&message=${encodeURIComponent(message._id)}`}
                    className="font-medium text-purple-600 hover:text-purple-500"
                  >
                    Jump to message
                  </Link>
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.body || ""}
                  </ReactMarkdown>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
