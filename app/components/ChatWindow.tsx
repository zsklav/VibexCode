"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  Check,
  Clipboard,
  Copy,
  Download,
  FileArchive,
  FileCode2,
  FileText,
  Ghost,
  HelpCircle,
  Image as ImageIcon,
  Link as LinkIcon,
  Megaphone,
  MoreVertical,
  Paperclip,
  Pencil,
  Palette,
  Reply,
  Send,
  SmilePlus,
  Trash2,
  Wrench,
  X,
} from "lucide-react";

import { useSocket } from "@/lib/useSocket";
import { cn } from "@/lib/utils";
import PollCard from "./chat-tools/PollCard";
import PollModal from "./chat-tools/PollModal";
import ThemeSelector, { themeClass } from "./chat-tools/ThemeSelector";
import WhiteboardModal from "./chat-tools/WhiteboardModal";
import type { ChatThemeId, Poll } from "./chat-tools/types";

interface Props {
  conversationId: string;
  selfId: string;
  selfName: string;
  selfEmail?: string;
  channelName?: string;
  channelDescription?: string;
}

type Attachment = {
  url: string;
  secureUrl?: string;
  name: string;
  type: string;
  size: number;
  format?: string;
  resourceType?: string;
  progress?: number;
  uploading?: boolean;
  error?: string;
};

interface Message {
  _id: string;
  conversation?: string;
  sender?: string;
  senderId?: string;
  senderName?: string;
  body: string;
  image?: string;
  messageType?: "poll" | "text";
  pollId?: string;
  attachments?: Attachment[];
  createdAt: string;
  ghost?: boolean;
  ghostExpiresAt?: string;
  reactions?: Record<string, string[]>;
  bookmarks?: string[];
  isEditing?: boolean;
  deleted?: boolean;
  edited?: boolean;
}

type Tab = "chat" | "files" | "media" | "links";

const QUICK_REACTIONS = ["❤️", "👍", "🔥", "🚀", "👀", "😂"];
const DRAFT_PREFIX = "vibexcode.chat.draft.";
const GHOST_MS = 24 * 60 * 60 * 1000;

const COMMANDS = [
  {
    name: "/poll",
    label: "Poll",
    hint: "Create a lightweight markdown poll",
    icon: Clipboard,
    apply: () => "**Poll:** What should we build next?\n- [ ] Option A\n- [ ] Option B",
  },
  {
    name: "/status",
    label: "Status",
    hint: "Set your visible custom status",
    icon: SmilePlus,
    apply: () => "/status ",
  },
  {
    name: "/shrug",
    label: "Shrug",
    hint: "Insert the classic developer shrug",
    icon: HelpCircle,
    apply: () => "¯\\_(ツ)_/¯",
  },
  {
    name: "/announce",
    label: "Announce",
    hint: "Format an announcement",
    icon: Megaphone,
    apply: () => "### Announcement\n",
  },
  {
    name: "/help",
    label: "Help",
    hint: "Show command help",
    icon: HelpCircle,
    apply: () =>
      "**Commands**\n\n`/poll`, `/status`, `/shrug`, `/announce`, `/help`",
  },
];

function initials(name: string): string {
  return (
    name
      .split(/\s+|@/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

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
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

function senderIdOf(message: { sender?: string; senderId?: string }): string {
  return message.sender || message.senderId || "";
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function dateLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function formatSize(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function timeRemaining(iso?: string): string {
  if (!iso) return "Expires soon";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `Expires in ${hours}h ${minutes}m`;
}

function extractLinks(messages: Message[]) {
  const linkPattern = /https?:\/\/[^\s<>()]+/g;
  return messages.flatMap((message) =>
    [...(message.body || "").matchAll(linkPattern)].map((match) => ({
      url: match[0],
      messageId: message._id,
      senderName: message.senderName || "Unknown",
      createdAt: message.createdAt,
    }))
  );
}

function attachmentKind(file: Attachment) {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (/zip|compressed|archive/i.test(file.type) || /\.zip$/i.test(file.name))
    return "archive";
  if (/javascript|typescript|json|python|java|code|text/i.test(file.type))
    return "code";
  return "document";
}

function FileIcon({ file }: { file: Attachment }) {
  const kind = attachmentKind(file);
  if (kind === "image") return <ImageIcon className="h-4 w-4" />;
  if (kind === "archive") return <FileArchive className="h-4 w-4" />;
  if (kind === "code") return <FileCode2 className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function MarkdownMessage({ body }: { body: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-2"
          >
            {children}
          </a>
        ),
        code: ({ inline, className, children, ...props }: any) => {
          const match = /language-(\w+)/.exec(className || "");
          const text = String(children).replace(/\n$/, "");

          if (inline) {
            return (
              <code
                className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.9em] dark:bg-white/10"
                {...props}
              >
                {children}
              </code>
            );
          }

          return (
            <div className="my-2 overflow-hidden rounded-lg border border-black/10 bg-zinc-950 text-white dark:border-white/10">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-xs text-zinc-300">
                <span>{match?.[1] || "code"}</span>
                <button
                  onClick={() => navigator.clipboard?.writeText(text)}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </button>
              </div>
              <SyntaxHighlighter
                style={oneDark}
                language={match?.[1] || "text"}
                PreTag="div"
                customStyle={{ margin: 0, borderRadius: 0, fontSize: "0.8rem" }}
              >
                {text}
              </SyntaxHighlighter>
            </div>
          );
        },
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-black/10 px-2 py-1 text-left dark:border-white/10">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-black/10 px-2 py-1 dark:border-white/10">
            {children}
          </td>
        ),
      }}
    >
      {body}
    </ReactMarkdown>
  );
}

export default function ChatWindow({
  conversationId,
  selfId,
  selfName,
  selfEmail,
  channelName,
  channelDescription,
}: Props) {
  const socket = useSocket();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const draftKey = `${DRAFT_PREFIX}${conversationId}`;

  const [tab, setTab] = useState<Tab>("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [polls, setPolls] = useState<Record<string, Poll>>({});
  const [ghostMode, setGhostMode] = useState(false);
  const [editedBodies, setEditedBodies] = useState<Record<string, string>>({});
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [quickBarFor, setQuickBarFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [commandIndex, setCommandIndex] = useState(0);
  const [lightbox, setLightbox] = useState<Attachment | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [themeSelectorOpen, setThemeSelectorOpen] = useState(false);
  const [chatTheme, setChatTheme] = useState<ChatThemeId>("default");
  const [, forceClock] = useState(0);

  const visibleMessages = useMemo(
    () =>
      messages.filter(
        (message) =>
          !message.ghostExpiresAt ||
          new Date(message.ghostExpiresAt).getTime() > Date.now()
      ),
    [messages]
  );

  const allAttachments = useMemo(
    () =>
      visibleMessages.flatMap((message) =>
        (message.attachments || []).map((file) => ({ ...file, message }))
      ),
    [visibleMessages]
  );
  const media = allAttachments.filter(
    (file) => file.type.startsWith("image/") || file.type.startsWith("video/")
  );
  const files = allAttachments.filter(
    (file) => !file.type.startsWith("image/") && !file.type.startsWith("video/")
  );
  const links = useMemo(() => extractLinks(visibleMessages), [visibleMessages]);

  const slashQuery = input.startsWith("/") ? input.slice(1).toLowerCase() : "";
  const commandMenuOpen = input.startsWith("/") && !input.includes("\n");
  const filteredCommands = COMMANDS.filter(
    (command) =>
      command.name.slice(1).includes(slashQuery) ||
      command.label.toLowerCase().includes(slashQuery)
  );

  useEffect(() => {
    setInput(localStorage.getItem(draftKey) || "");
  }, [draftKey]);

  useEffect(() => {
    localStorage.setItem(draftKey, input);
  }, [draftKey, input]);

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`/api/user/theme?userId=${encodeURIComponent(selfId)}`)
      .then((res) => {
        if (!cancelled) setChatTheme((res.data?.theme || "default") as ChatThemeId);
      })
      .catch(() => {
        if (!cancelled) setChatTheme("default");
      });
    return () => {
      cancelled = true;
    };
  }, [selfId]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(id);
  }, [notice]);

  useEffect(() => {
    const id = setInterval(() => forceClock((value) => value + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

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
      setMessages((prev) =>
        prev.some((message) => message._id === msg._id) ? prev : [...prev, msg]
      );
    });
    socket.on("poll:update", ({ poll }: { poll: Poll }) => {
      if (!poll?._id) return;
      setPolls((prev) => ({ ...prev, [poll._id]: poll }));
    });
    socket.on("poll:expire", ({ pollId }: { pollId: string }) => {
      setPolls((prev) => {
        const poll = prev[pollId];
        if (!poll) return prev;
        return {
          ...prev,
          [pollId]: { ...poll, expiresAt: new Date().toISOString() },
        };
      });
    });
    socket.on("theme:update", ({ userId, theme }: { userId: string; theme: ChatThemeId }) => {
      if (userId === selfId) setChatTheme(theme);
    });
    return () => {
      socket.emit("leave", { conversationId });
      socket.off("message");
      socket.off("poll:update");
      socket.off("poll:expire");
      socket.off("theme:update");
    };
  }, [socket, conversationId, selfId]);

  useEffect(() => {
    if (tab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [visibleMessages, tab]);

  useEffect(() => {
    if (!openMenuFor) return;
    const close = () => setOpenMenuFor(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenuFor]);

  const applyCommand = (index: number) => {
    const command = filteredCommands[index];
    if (!command) return;
    setInput(command.apply());
    setCommandIndex(0);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const sendStatus = async (status: string) => {
    if (!selfEmail) return;
    await fetch("/api/user/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: selfEmail,
        customStatus: status,
        activity: "typing",
        device: /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
          ? "Mobile"
          : "Desktop",
      }),
    });
  };

  const handleSend = async () => {
    const body = input.trim();
    const readyAttachments = attachments.filter((file) => !file.uploading && !file.error);
    if (!body && readyAttachments.length === 0) return;

    if (body.startsWith("/status")) {
      const status = body.replace(/^\/status\s*/i, "").trim();
      if (!status) {
        setNotice("Type a status after /status.");
        return;
      }
      await sendStatus(status);
      setInput("");
      localStorage.removeItem(draftKey);
      setNotice("Status updated.");
      return;
    }

    setNotice(null);
    const messageData = {
      conversationId,
      senderId: selfId,
      senderName: selfName,
      senderEmail: selfEmail,
      body,
      ghost: ghostMode,
      attachments: readyAttachments,
    };

    try {
      const res = await axios.post(`/api/messages/${conversationId}`, messageData);
      const saved = res.data as Message;
      setMessages((prev) =>
        prev.some((message) => message._id === saved._id) ? prev : [...prev, saved]
      );
      socket?.emit("message", { ...saved, conversationId });
      setInput("");
      setAttachments([]);
      localStorage.removeItem(draftKey);
    } catch (err) {
      const errorMsg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Failed to send message.";
      setNotice(errorMsg);
      console.error("Failed to save message:", err);
    }
  };

  const handleUpload = (selectedFiles: FileList | File[]) => {
    [...selectedFiles].slice(0, 6).forEach((file) => {
      const localId = `${file.name}-${file.size}-${Date.now()}`;
      const preview: Attachment = {
        url: URL.createObjectURL(file),
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        progress: 0,
        uploading: true,
      };
      setAttachments((prev) => [...prev, preview]);

      const form = new FormData();
      form.append("file", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/chat/upload");
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const progress = Math.round((event.loaded / event.total) * 100);
        setAttachments((prev) =>
          prev.map((item) =>
            item.name === file.name && item.size === file.size && item.url === preview.url
              ? { ...item, progress }
              : item
          )
        );
      };
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 400) throw new Error(data.error || "Upload failed");
          setAttachments((prev) =>
            prev.map((item) =>
              item.name === file.name && item.size === file.size && item.url === preview.url
                ? { ...data, progress: 100, uploading: false }
                : item
            )
          );
        } catch (error) {
          setAttachments((prev) =>
            prev.map((item) =>
              item.name === file.name && item.size === file.size && item.url === preview.url
                ? {
                    ...item,
                    uploading: false,
                    error: error instanceof Error ? error.message : "Upload failed",
                  }
                : item
            )
          );
        }
      };
      xhr.onerror = () => {
        setAttachments((prev) =>
          prev.map((item) =>
            item.name === file.name && item.size === file.size && item.url === preview.url
              ? { ...item, uploading: false, error: "Upload failed" }
              : item
          )
        );
      };
      xhr.setRequestHeader("X-Upload-Id", localId);
      xhr.send(form);
    });
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

  const toggleReaction = async (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((message) => {
        if (message._id !== messageId) return message;
        const reactions = { ...(message.reactions || {}) };
        const current = reactions[emoji] || [];
        reactions[emoji] = current.includes(selfId)
          ? current.filter((id) => id !== selfId)
          : [...current, selfId];
        if (reactions[emoji].length === 0) delete reactions[emoji];
        return { ...message, reactions };
      })
    );
    await axios.patch(`/api/message/${messageId}`, {
      senderId: selfId,
      action: "reaction",
      emoji,
    });
  };

  const toggleBookmark = async (messageId: string) => {
    setMessages((prev) =>
      prev.map((message) => {
        if (message._id !== messageId) return message;
        const bookmarks = message.bookmarks || [];
        return {
          ...message,
          bookmarks: bookmarks.includes(selfId)
            ? bookmarks.filter((id) => id !== selfId)
            : [...bookmarks, selfId],
        };
      })
    );
    await axios.patch(`/api/message/${messageId}`, {
      senderId: selfId,
      action: "bookmark",
    });
  };

  const handlePollCreated = ({ poll, message }: { poll: Poll; message: Message }) => {
    setPolls((prev) => ({ ...prev, [poll._id]: poll }));
    setMessages((prev) =>
      prev.some((item) => item._id === message._id) ? prev : [...prev, message]
    );
    socket?.emit("poll:create", { conversationId, poll, message });
  };

  const handlePollVote = (poll: Poll) => {
    setPolls((prev) => ({ ...prev, [poll._id]: poll }));
    socket?.emit("poll:vote", { conversationId, poll });
  };

  const updateTheme = async (theme: ChatThemeId) => {
    setChatTheme(theme);
    await axios.post("/api/user/theme", { userId: selfId, theme });
    socket?.emit("theme:update", { userId: selfId, theme });
  };

  const renderAttachments = (messageAttachments: Attachment[] = []) => {
    if (messageAttachments.length === 0) return null;
    return (
      <div className="mt-2 grid gap-2">
        {messageAttachments.map((file) => {
          const url = file.secureUrl || file.url;
          if (file.type.startsWith("image/")) {
            return (
              <button key={url} onClick={() => setLightbox(file)} className="text-left">
                <img
                  src={url}
                  alt={file.name}
                  className="max-h-72 rounded-lg border border-black/10 object-cover dark:border-white/10"
                />
              </button>
            );
          }
          if (file.type.startsWith("video/")) {
            return (
              <video
                key={url}
                src={url}
                controls
                className="max-h-72 rounded-lg border border-black/10 dark:border-white/10"
              />
            );
          }
          return (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg border border-black/10 bg-white/70 p-3 text-sm hover:bg-white dark:border-white/10 dark:bg-zinc-900/70"
            >
              <FileIcon file={file} />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="text-xs opacity-70">{formatSize(file.size)}</span>
              <Download className="h-4 w-4" />
            </a>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col text-gray-900 dark:text-white",
        themeClass(chatTheme)
      )}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        if (event.dataTransfer.files.length) handleUpload(event.dataTransfer.files);
      }}
    >
      <div className="border-b border-gray-200 px-4 py-2 dark:border-zinc-800">
        <div className="mx-auto flex max-w-4xl items-center gap-1">
          {(["chat", "files", "media", "links"] as Tab[]).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition",
                tab === item
                  ? "bg-gray-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 py-5">
          {notice && (
            <div className="fixed left-1/2 top-20 z-50 w-[min(92vw,36rem)] -translate-x-1/2">
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-200">
                {notice}
              </div>
            </div>
          )}

          {tab === "chat" && (
            <>
              {!loading && (
                <div className="mb-5 border-b border-gray-200 py-8 text-center dark:border-zinc-800">
                  <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gray-900 text-2xl font-bold text-white dark:bg-white dark:text-zinc-950">
                    #
                  </div>
                  <h2 className="mb-1 text-2xl font-bold">
                    Welcome to #{channelName || conversationId}
                  </h2>
                  <p className="mx-auto max-w-md text-sm text-gray-500 dark:text-gray-400">
                    {channelDescription || "This is the beginning of the conversation."}
                  </p>
                </div>
              )}

              {loading ? (
                <p className="mt-12 text-center text-sm text-gray-400">
                  Loading messages...
                </p>
              ) : visibleMessages.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                  <p className="font-medium text-gray-500 dark:text-gray-400">
                    No messages yet. Start the thread.
                  </p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {visibleMessages.map((message, index) => {
                    const mSender = senderIdOf(message);
                    const isSelf = mSender === selfId;
                    const previous = visibleMessages[index - 1];
                    const startsRun =
                      !previous ||
                      senderIdOf(previous) !== mSender ||
                      new Date(message.createdAt).getTime() -
                        new Date(previous.createdAt).getTime() >
                        5 * 60 * 1000;
                    const showDate =
                      !previous ||
                      new Date(previous.createdAt).toDateString() !==
                        new Date(message.createdAt).toDateString();
                    const senderName = message.senderName || mSender || "Unknown";
                    const editingValue = editedBodies[message._id] ?? "";
                    const bookmarked = (message.bookmarks || []).includes(selfId);

                    return (
                      <div key={message._id}>
                        {showDate && (
                          <div className="sticky top-2 z-10 my-4 flex items-center gap-3 text-xs font-semibold text-gray-400">
                            <span className="h-px flex-1 bg-gray-200 dark:bg-zinc-800" />
                            <span className="rounded-full bg-white px-3 py-1 dark:bg-zinc-900">
                              {dateLabel(message.createdAt)}
                            </span>
                            <span className="h-px flex-1 bg-gray-200 dark:bg-zinc-800" />
                          </div>
                        )}

                        <motion.div
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.16 }}
                          className={cn(
                            "flex items-end gap-2",
                            isSelf ? "flex-row-reverse" : "flex-row",
                            startsRun ? "mt-3" : "mt-0.5"
                          )}
                          onDoubleClick={() => toggleReaction(message._id, "❤️")}
                        >
                          {!isSelf &&
                            (startsRun ? (
                              <div
                                className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white",
                                  colorFor(mSender)
                                )}
                              >
                                {initials(senderName)}
                              </div>
                            ) : (
                              <div className="w-8 shrink-0" />
                            ))}

                          <div
                            className={cn(
                              "flex max-w-[min(78%,42rem)] min-w-0 flex-col",
                              isSelf ? "items-end" : "items-start"
                            )}
                          >
                            {!isSelf && startsRun && (
                              <span className="mb-1 px-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                {senderName}
                              </span>
                            )}

                            <div
                              className="group relative"
                              onMouseEnter={() => setQuickBarFor(message._id)}
                              onMouseLeave={() => setQuickBarFor(null)}
                            >
                              {quickBarFor === message._id && !message.deleted && (
                                <motion.div
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className={cn(
                                    "absolute -top-9 z-20 flex gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800",
                                    isSelf ? "right-2" : "left-2"
                                  )}
                                >
                                  {QUICK_REACTIONS.map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => toggleReaction(message._id, emoji)}
                                      className="rounded px-1.5 py-1 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </motion.div>
                              )}

                              <div
                                className={cn(
                                  "rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                                  isSelf
                                    ? "rounded-br-md bg-gray-900 text-white dark:bg-white dark:text-zinc-950"
                                    : "rounded-bl-md bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-gray-100",
                                  message.ghost &&
                                    "border border-purple-400/40 bg-purple-50 text-purple-950 dark:bg-purple-950/30 dark:text-purple-50",
                                  message.deleted && "italic opacity-60"
                                )}
                              >
                                {message.isEditing && !message.deleted ? (
                                  <div className="flex min-w-[220px] items-center gap-2">
                                    <input
                                      value={editingValue}
                                      autoFocus
                                      onChange={(event) =>
                                        setEditedBodies((prev) => ({
                                          ...prev,
                                          [message._id]: event.target.value,
                                        }))
                                      }
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter")
                                          handleEditSubmit(message._id);
                                      }}
                                      className="flex-1 rounded bg-white/20 px-2 py-1 text-sm outline-none"
                                    />
                                    <button onClick={() => handleEditSubmit(message._id)}>
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        setMessages((prev) =>
                                          prev.map((msg) =>
                                            msg._id === message._id
                                              ? { ...msg, isEditing: false }
                                              : msg
                                          )
                                        )
                                      }
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    {message.ghost && (
                                      <div className="mb-1 flex items-center gap-1 text-xs font-semibold opacity-80">
                                        <Ghost className="h-3.5 w-3.5" />
                                        Ghost Message
                                      </div>
                                    )}
                                    {message.messageType === "poll" && message.pollId ? (
                                      <PollCard
                                        pollId={message.pollId}
                                        poll={polls[message.pollId]}
                                        selfId={selfId}
                                        conversationId={conversationId}
                                        onVote={handlePollVote}
                                      />
                                    ) : (
                                      <>
                                        <div className="min-w-0 break-words">
                                          <MarkdownMessage body={message.body || ""} />
                                        </div>
                                        {renderAttachments(message.attachments)}
                                      </>
                                    )}
                                  </>
                                )}
                              </div>

                              {!message.isEditing && !message.deleted && (
                                <div
                                  className={cn(
                                    "absolute top-1/2 hidden -translate-y-1/2 items-center gap-1 group-hover:flex",
                                    isSelf ? "-left-32" : "-right-40"
                                  )}
                                >
                                  <button title="Reply" className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-zinc-800">
                                    <Reply className="h-4 w-4" />
                                  </button>
                                  <button title="React" onClick={() => setQuickBarFor(message._id)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-zinc-800">
                                    <SmilePlus className="h-4 w-4" />
                                  </button>
                                  <button title="Copy" onClick={() => navigator.clipboard?.writeText(message.body || "")} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-zinc-800">
                                    <Copy className="h-4 w-4" />
                                  </button>
                                  <button title="Bookmark" onClick={() => toggleBookmark(message._id)} className={cn("rounded p-1 hover:bg-gray-100 dark:hover:bg-zinc-800", bookmarked ? "text-amber-500" : "text-gray-400 hover:text-gray-700")}>
                                    <Bookmark className="h-4 w-4" />
                                  </button>
                                  {isSelf && (
                                    <button
                                      title="More"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setOpenMenuFor(
                                          openMenuFor === message._id
                                            ? null
                                            : message._id
                                        );
                                      }}
                                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-zinc-800"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              )}

                              {openMenuFor === message._id && (
                                <div className="absolute right-full top-0 z-30 mr-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                                  <button
                                    onClick={() => {
                                      setMessages((prev) =>
                                        prev.map((msg) =>
                                          msg._id === message._id
                                            ? { ...msg, isEditing: true }
                                            : msg
                                        )
                                      );
                                      setEditedBodies((prev) => ({
                                        ...prev,
                                        [message._id]: message.body,
                                      }));
                                      setOpenMenuFor(null);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-zinc-700"
                                  >
                                    <Pencil className="h-3.5 w-3.5" /> Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(message._id)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                  </button>
                                </div>
                              )}
                            </div>

                            {message.reactions && Object.keys(message.reactions).length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1 px-1">
                                {Object.entries(message.reactions).map(([emoji, users]) => (
                                  <button
                                    key={emoji}
                                    onClick={() => toggleReaction(message._id, emoji)}
                                    className={cn(
                                      "rounded-full border px-2 py-0.5 text-xs transition",
                                      users.includes(selfId)
                                        ? "border-purple-300 bg-purple-100 text-purple-700 dark:border-purple-700 dark:bg-purple-950 dark:text-purple-200"
                                        : "border-gray-200 bg-gray-50 text-gray-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-300"
                                    )}
                                  >
                                    {emoji} {users.length}
                                  </button>
                                ))}
                              </div>
                            )}

                            <span className="mt-0.5 px-1 text-[10px] text-gray-400 dark:text-gray-500">
                              {message.ghost && (
                                <span className="mr-1">
                                  {timeRemaining(message.ghostExpiresAt)}
                                </span>
                              )}
                              {formatTime(message.createdAt)}
                              {message.edited && !message.deleted && (
                                <span className="ml-1 italic">(edited)</span>
                              )}
                            </span>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </AnimatePresence>
              )}
              <div ref={messagesEndRef} />
            </>
          )}

          {tab === "files" && (
            <HubEmptyAware count={files.length} empty="No shared files yet.">
              <div className="grid gap-3">
                {files.map((file) => (
                  <a
                    key={`${file.message._id}-${file.url}`}
                    href={file.secureUrl || file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
                  >
                    <FileIcon file={file} />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-gray-500">{formatSize(file.size)}</span>
                    <Download className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </HubEmptyAware>
          )}

          {tab === "media" && (
            <HubEmptyAware count={media.length} empty="No shared media yet.">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {media.map((file) =>
                  file.type.startsWith("image/") ? (
                    <button
                      key={`${file.message._id}-${file.url}`}
                      onClick={() => setLightbox(file)}
                    >
                      <img
                        src={file.secureUrl || file.url}
                        alt={file.name}
                        className="aspect-square w-full rounded-lg object-cover"
                      />
                    </button>
                  ) : (
                    <video
                      key={`${file.message._id}-${file.url}`}
                      src={file.secureUrl || file.url}
                      controls
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                  )
                )}
              </div>
            </HubEmptyAware>
          )}

          {tab === "links" && (
            <HubEmptyAware count={links.length} empty="No shared links yet.">
              <div className="grid gap-3">
                {links.map((link) => (
                  <a
                    key={`${link.messageId}-${link.url}`}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
                  >
                    <LinkIcon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{link.url}</span>
                    <span className="text-xs text-gray-500">{link.senderName}</span>
                  </a>
                ))}
              </div>
            </HubEmptyAware>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 bg-white/92 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/92">
        <div className="relative mx-auto max-w-4xl">
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((file) => (
                <div
                  key={`${file.name}-${file.url}`}
                  className="flex max-w-xs items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-800"
                >
                  <FileIcon file={file} />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  {file.uploading ? (
                    <span>{file.progress || 0}%</span>
                  ) : file.error ? (
                    <span className="text-red-500">{file.error}</span>
                  ) : (
                    <span>{formatSize(file.size)}</span>
                  )}
                  <button
                    onClick={() =>
                      setAttachments((prev) => prev.filter((item) => item !== file))
                    }
                    title="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {commandMenuOpen && filteredCommands.length > 0 && (
            <div className="absolute bottom-full left-12 z-40 mb-2 w-80 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
              {filteredCommands.map((command, index) => {
                const Icon = command.icon;
                return (
                  <button
                    key={command.name}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      applyCommand(index);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left text-sm",
                      commandIndex === index
                        ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-200"
                        : "hover:bg-gray-50 dark:hover:bg-zinc-700"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">
                      <span className="font-semibold">{command.name}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        {command.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {toolsOpen && (
            <div className="absolute bottom-full left-14 z-40 mb-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
              <button
                onClick={() => {
                  setWhiteboardOpen(true);
                  setToolsOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <Pencil className="h-4 w-4 text-purple-500" />
                <span>
                  <span className="block font-medium">Whiteboard</span>
                  <span className="text-xs text-gray-500">Draw, shape, and brainstorm live</span>
                </span>
              </button>
              <button
                onClick={() => {
                  setPollModalOpen(true);
                  setToolsOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <Clipboard className="h-4 w-4 text-blue-500" />
                <span>
                  <span className="block font-medium">Polls</span>
                  <span className="text-xs text-gray-500">Create a real-time vote</span>
                </span>
              </button>
            </div>
          )}

          {themeSelectorOpen && (
            <div className="absolute bottom-full right-0 z-40 mb-2">
              <ThemeSelector value={chatTheme} onChange={updateTheme} />
            </div>
          )}

          {emojiOpen && (
            <div className="absolute bottom-full right-14 z-40 mb-2 flex gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setInput((current) => `${current}${emoji}`);
                    setEmojiOpen(false);
                    textareaRef.current?.focus();
                  }}
                  className="rounded-lg px-2 py-1.5 text-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files) handleUpload(event.target.files);
                event.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg p-2.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-zinc-800 dark:hover:text-white"
              title="Attachments"
            >
              <Paperclip className="h-4 w-4" />
              <span className="hidden text-xs font-medium lg:inline">Attachments</span>
            </button>
            <button
              onClick={() => setToolsOpen((value) => !value)}
              className="inline-flex items-center gap-2 rounded-lg p-2.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-zinc-800 dark:hover:text-white"
              title="Tools"
            >
              <Wrench className="h-4 w-4" />
              <span className="hidden text-xs font-medium lg:inline">Tools</span>
            </button>
            <button
              onClick={() => setEmojiOpen((value) => !value)}
              className="inline-flex items-center gap-2 rounded-lg p-2.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-zinc-800 dark:hover:text-white"
              title="Emoji"
            >
              <SmilePlus className="h-4 w-4" />
              <span className="hidden text-xs font-medium lg:inline">Emoji</span>
            </button>
            <button
              onClick={() => setThemeSelectorOpen((value) => !value)}
              className="rounded-lg p-2.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-zinc-800 dark:hover:text-white"
              title="Chat Appearance"
            >
              <Palette className="h-4 w-4" />
            </button>
            <button
              onClick={() => setGhostMode((value) => !value)}
              className={cn(
                "rounded-lg p-2.5 transition",
                ghostMode
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-200"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-zinc-800 dark:hover:text-white"
              )}
              title="Ghost Mode"
            >
              <Ghost className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 dark:border-zinc-800 dark:bg-zinc-800">
              <textarea
                ref={textareaRef}
                placeholder={`Message #${conversationId}`}
                value={input}
                rows={1}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (commandMenuOpen && filteredCommands.length > 0) {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setCommandIndex((value) =>
                        Math.min(value + 1, filteredCommands.length - 1)
                      );
                      return;
                    }
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setCommandIndex((value) => Math.max(value - 1, 0));
                      return;
                    }
                    if (event.key === "Tab") {
                      event.preventDefault();
                      applyCommand(commandIndex);
                      return;
                    }
                  }
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.altKey
                  ) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                className="max-h-40 w-full resize-none bg-transparent text-sm outline-none"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
                <span>Enter to send • Alt+Enter for new line</span>
                {ghostMode && (
                  <span className="inline-flex items-center gap-1 text-purple-500">
                    <Ghost className="h-3 w-3" />
                    24h
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleSend}
              disabled={
                (!input.trim() && attachments.filter((file) => !file.uploading).length === 0) ||
                attachments.some((file) => file.uploading)
              }
              className="rounded-lg bg-gray-900 p-2.5 text-white shadow transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              title="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {whiteboardOpen && (
        <WhiteboardModal
          roomId={conversationId}
          selfId={selfId}
          selfName={selfName}
          socket={socket}
          onClose={() => setWhiteboardOpen(false)}
        />
      )}

      {pollModalOpen && (
        <PollModal
          conversationId={conversationId}
          selfId={selfId}
          selfName={selfName}
          onClose={() => setPollModalOpen(false)}
          onCreated={handlePollCreated}
        />
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox.secureUrl || lightbox.url}
            alt={lightbox.name}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}

function HubEmptyAware({
  count,
  empty,
  children,
}: {
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  if (count === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 text-sm text-gray-500">
        {empty}
      </div>
    );
  }
  return <>{children}</>;
}
