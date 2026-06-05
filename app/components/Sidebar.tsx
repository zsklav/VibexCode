"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layout,
  MessageSquare,
  Users,
  Terminal,
  PenTool,
  BarChart2,
  UserPlus,
  FolderDot,
  Bot,
  User,
  Settings,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

const SIDEBAR_ITEMS = [
  { label: "Workspace", icon: Layout, href: "/Dashboard" },
  { label: "Chats", icon: MessageSquare, href: "/chats" },
  { label: "Community", icon: Users, href: "/community" },
  { label: "Playground", icon: Terminal, href: "/playground" },
  { label: "Whiteboard", icon: PenTool, href: "/whiteboard" },
  { label: "Polls", icon: BarChart2, href: "/polls" },
  { label: "Friends", icon: UserPlus, href: "/friends" },
  { label: "Projects", icon: FolderDot, href: "/projects" },
  { label: "AI Tools", icon: Bot, href: "/ai-tools" },
  { divider: true, id: "div1" },
  { label: "Profile", icon: User, href: "/Profile" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export default function Sidebar() {
  const [isHovered, setIsHovered] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const pathname = usePathname();

  const expanded = isHovered || isLocked;

  return (
    <div
      className={cn(
        "fixed left-4 top-24 bottom-4 z-40 flex flex-col transition-all duration-300 ease-in-out",
        expanded ? "w-64" : "w-16"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="glass-panel h-full w-full rounded-2xl flex flex-col py-4 px-2 overflow-hidden shadow-2xl relative">
        <button 
          onClick={() => setIsLocked(!isLocked)}
          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100 hidden md:block"
        >
          {isLocked ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden mt-6">
          <div className="space-y-2 flex flex-col">
            {SIDEBAR_ITEMS.map((item) => {
              if (item.divider) {
                return <div key={item.id} className="h-px bg-white/10 my-2 mx-4" />;
              }

              const Icon = item.icon!;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href!}
                  className={cn(
                    "relative flex items-center px-3 py-3 mx-1 rounded-xl group transition-all duration-300",
                    isActive ? "bg-white/10 text-[#00f0ff]" : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-sidebar-pill"
                      className="absolute inset-0 bg-white/5 rounded-xl border border-white/10 shadow-[0_0_15px_rgba(0,240,255,0.15)]"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  
                  <div className="relative z-10 flex items-center justify-center w-6 h-6 shrink-0">
                    <Icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", isActive && "drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]")} />
                  </div>
                  
                  <AnimatePresence>
                    {expanded && (
                      <motion.span
                        initial={{ opacity: 0, x: -10, width: 0 }}
                        animate={{ opacity: 1, x: 0, width: "auto" }}
                        exit={{ opacity: 0, x: -10, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-4 font-medium whitespace-nowrap relative z-10"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
