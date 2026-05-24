"use client";

import { useEffect, useState, useRef } from "react";
import { useSocket } from "@/lib/useSocket";
import axios from "axios";
import { cn } from "@/lib/utils";
import { MoreVertical, Pencil, Trash2, Send, Check, X } from "lucide-react";

interface Props {
  conversationId: string;
  selfId: string;
  selfName: string;
  // Optional — shown in the channel-start banner at the top of the scroll area.
  channelName?: string;
  channelDescription?: string;
}

interface Message {
  _id: string;
  // DB-saved messages use `sender`; locally-emitted socket payloads use
  // `senderId`. Read both, normalize at render time.
  sender?: string;
  senderId?: string;
  senderName?: string;
  body: string;
  image?: string;
  createdAt: string;
  isEditing?: boolean;
  deleted?: boolean;
  edited?: boolean;
}

function initials(name: string): string {
  return (
    name
      .split(/\s+|@/)
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

// Deterministic gradient per sender — same person always gets the same color.
function colorFor(sender: string | undefined): string {
  const palette = [
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-emerald-500 to-teal-600",
    "from-sky-500 to-indigo-600",
    "from-fuchsia-500 to-purple-600",
    "from-lime-500 to-green-600",
  ];
  const key = sender || "";
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

// Read the sender id from whichever field the source provided.
function senderIdOf(m: { sender?: string; senderId?: string }): string {
  return m.sender || m.senderId || "";
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function ChatWindow({
  conversationId,
  selfId,
  selfName,
  channelName,
  channelDescription,
}: Props) {
  const socket = useSocket();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [editedBodies, setEditedBodies] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/messages/${conversationId}`);
        setMessages(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching messages:", err);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [conversationId]);

  useEffect(() => {
    if (!socket) return;
    socket.emit("join", { conversationId });
    socket.on("message", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => {
      socket.emit("leave", { conversationId });
      socket.off("message");
    };
  }, [socket, conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close the message-actions popover when clicking anywhere else.
  useEffect(() => {
    if (!openMenuFor) return;
    const close = () => setOpenMenuFor(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenuFor]);

  const handleSend = async () => {
    const body = input.trim();
    if (!body) return;
    const messageData = {
      conversationId,
      senderId: selfId,
      senderName: selfName,
      body,
    };
    socket?.emit("message", messageData);
    try {
      await axios.post(`/api/messages/${conversationId}`, messageData);
    } catch (err) {
      console.error("Failed to save message:", err);
    }
    setInput("");
  };

  const handleEditClick = (id: string, body: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg._id === id ? { ...msg, isEditing: true } : msg))
    );
    setEditedBodies((prev) => ({ ...prev, [id]: body }));
    setOpenMenuFor(null);
  };

  const handleEditSubmit = async (id: string) => {
    const newBody = editedBodies[id]?.trim();
    if (!newBody) return;
    try {
      await axios.put(`/api/message/${id}`, { senderId: selfId, body: newBody });
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === id
            ? { ...msg, body: newBody, isEditing: false, edited: true }
            : msg
        )
      );
      setEditedBodies((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } catch (err) {
      console.error("Failed to edit message:", err);
    }
  };

  const handleEditCancel = (id: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg._id === id ? { ...msg, isEditing: false } : msg))
    );
    setEditedBodies((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/message/${id}?senderId=${selfId}`);
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === id
            ? { ...msg, deleted: true, body: "this message was deleted" }
            : msg
        )
      );
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
    setOpenMenuFor(null);
  };

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">
      {/* Messages — outer scrolls, inner uses min-h-full + justify-end so
          a sparse conversation hugs the bottom near the composer instead of
          floating at the top. */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col px-4 py-6 space-y-2 max-w-4xl mx-auto w-full min-h-full">
        {/* Channel-start banner — Discord-style "this is the beginning of #channel" */}
        {!loading && (
          <div className="text-center py-8 mb-4 border-b border-gray-200 dark:border-zinc-800">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-bold mb-3 shadow-lg">
              #
            </div>
            <h2 className="text-2xl font-bold mb-1">
              Welcome to #{channelName || conversationId}!
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              {channelDescription ||
                "This is the beginning of the conversation."}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              This is the start of the channel.
            </p>
          </div>
        )}

        {loading ? (
          <p className="text-center text-sm text-gray-400 mt-12">
            Loading messages...
          </p>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              No messages yet — be the first to say hi 👋
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const mSender = senderIdOf(m);
            const isSelf = mSender === selfId;
            const editingValue = editedBodies[m._id] ?? "";
            const prev = messages[i - 1];
            const prevSender = prev ? senderIdOf(prev) : "";
            // Group consecutive messages from the same sender — only show
            // avatar + name on the first one in a run.
            const startsRun =
              !prev ||
              prevSender !== mSender ||
              new Date(m.createdAt).getTime() -
                new Date(prev.createdAt).getTime() >
                5 * 60 * 1000;
            const senderName = m.senderName ?? mSender ?? "Unknown";
            const avatarColor = colorFor(mSender);

            return (
              <div
                key={m._id}
                className={cn(
                  "flex items-end gap-2",
                  isSelf ? "flex-row-reverse" : "flex-row",
                  startsRun ? "mt-3" : "mt-0.5"
                )}
              >
                {/* Avatar (only for others, only at start of a run) */}
                {!isSelf &&
                  (startsRun ? (
                    <div
                      className={cn(
                        "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br",
                        avatarColor
                      )}
                    >
                      {initials(senderName)}
                    </div>
                  ) : (
                    <div className="shrink-0 w-8" />
                  ))}

                <div
                  className={cn(
                    "max-w-[min(75%,32rem)] min-w-0",
                    isSelf ? "items-end" : "items-start",
                    "flex flex-col"
                  )}
                >
                  {/* Sender name (only on others, only first in run) */}
                  {!isSelf && startsRun && (
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 px-1">
                      {senderName}
                    </span>
                  )}

                  <div className="relative group">
                    <div
                      className={cn(
                        "px-3.5 py-2 rounded-2xl text-sm leading-snug whitespace-pre-wrap break-words",
                        isSelf
                          ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-br-sm"
                          : "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 rounded-bl-sm",
                        m.deleted && "italic opacity-60"
                      )}
                    >
                      {m.isEditing && !m.deleted ? (
                        <div className="flex items-center gap-2 min-w-[200px]">
                          <input
                            value={editingValue}
                            autoFocus
                            onChange={(e) =>
                              setEditedBodies((prev) => ({
                                ...prev,
                                [m._id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleEditSubmit(m._id);
                              if (e.key === "Escape") handleEditCancel(m._id);
                            }}
                            className="flex-1 bg-white/20 text-white placeholder-white/60 rounded px-2 py-1 outline-none focus:bg-white/30 text-sm"
                          />
                          <button
                            onClick={() => handleEditSubmit(m._id)}
                            className="p-1 hover:bg-white/20 rounded"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEditCancel(m._id)}
                            className="p-1 hover:bg-white/20 rounded"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        m.body
                      )}
                    </div>

                    {/* Edit/delete menu — only on hover, only for own messages */}
                    {isSelf && !m.isEditing && !m.deleted && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuFor(
                            openMenuFor === m._id ? null : m._id
                          );
                        }}
                        className={cn(
                          "absolute -left-7 top-1/2 -translate-y-1/2 p-1 rounded-full",
                          "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
                          "hover:bg-gray-100 dark:hover:bg-zinc-800",
                          "opacity-0 group-hover:opacity-100 transition-opacity",
                          openMenuFor === m._id && "opacity-100"
                        )}
                        title="Message actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    )}

                    {openMenuFor === m._id && (
                      <div className="absolute right-full top-0 mr-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg z-10 overflow-hidden">
                        <button
                          onClick={() => handleEditClick(m._id, m.body)}
                          className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(m._id)}
                          className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Timestamp + edited indicator */}
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 px-1">
                    {formatTime(m.createdAt)}
                    {m.edited && !m.deleted && (
                      <span className="ml-1 italic">(edited)</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-gray-200 dark:border-zinc-800 px-4 py-3 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <input
            placeholder={`Message #${conversationId}`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 rounded-full px-4 py-2.5 text-sm bg-gray-100 dark:bg-zinc-800 border border-transparent focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none transition"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="rounded-full p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 hover:opacity-90 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
