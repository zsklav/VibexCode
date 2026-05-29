"use client";

import { Check, Palette } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import type { ChatThemeId } from "./types";

export const CHAT_THEMES: Array<{
  id: ChatThemeId;
  name: string;
  className: string;
  preview: string;
}> = [
  {
    id: "default",
    name: "Default",
    className: "bg-white dark:bg-zinc-900",
    preview: "bg-gradient-to-br from-zinc-100 to-white dark:from-zinc-900 dark:to-zinc-800",
  },
  {
    id: "ocean",
    name: "Ocean Blue",
    className: "bg-gradient-to-br from-blue-950 via-sky-950 to-slate-950",
    preview: "bg-gradient-to-br from-blue-700 to-slate-950",
  },
  {
    id: "aurora",
    name: "Aurora",
    className: "bg-gradient-to-br from-purple-900 via-blue-900 to-cyan-800",
    preview: "bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-400",
  },
  {
    id: "purple-night",
    name: "Purple Night",
    className: "bg-gradient-to-br from-purple-950 via-zinc-950 to-black",
    preview: "bg-gradient-to-br from-purple-900 to-black",
  },
  {
    id: "sunset",
    name: "Sunset Glow",
    className: "bg-gradient-to-br from-orange-500 via-pink-600 to-purple-900",
    preview: "bg-gradient-to-br from-orange-400 via-pink-500 to-purple-700",
  },
  {
    id: "cyber",
    name: "Cyber Neon",
    className:
      "bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.24),transparent_30%),linear-gradient(135deg,#020617,#111827_55%,#020617)]",
    preview:
      "bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.55),transparent_35%),linear-gradient(135deg,#020617,#172554)]",
  },
  {
    id: "emerald",
    name: "Emerald Mist",
    className: "bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-950",
    preview: "bg-gradient-to-br from-emerald-500 via-teal-500 to-slate-800",
  },
];

export function themeClass(theme: ChatThemeId) {
  return CHAT_THEMES.find((item) => item.id === theme)?.className || CHAT_THEMES[0].className;
}

export default function ThemeSelector({
  value,
  onChange,
}: {
  value: ChatThemeId;
  onChange: (theme: ChatThemeId) => void;
}) {
  return (
    <div className="w-[min(92vw,34rem)] rounded-xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3 flex items-center gap-2">
        <Palette className="h-4 w-4 text-purple-500" />
        <div>
          <h3 className="text-sm font-semibold">Chat Appearance</h3>
          <p className="text-xs text-gray-500">Themes apply instantly to this chat area.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CHAT_THEMES.map((theme) => (
          <motion.button
            key={theme.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => onChange(theme.id)}
            className={cn(
              "rounded-lg border p-2 text-left transition",
              value === theme.id
                ? "border-purple-500 ring-2 ring-purple-500/20"
                : "border-gray-200 hover:border-gray-300 dark:border-zinc-700"
            )}
          >
            <div className={cn("mb-2 h-16 rounded-md", theme.preview)} />
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium">{theme.name}</span>
              {value === theme.id && <Check className="h-3.5 w-3.5 text-purple-500" />}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
