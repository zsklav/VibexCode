"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";

export default function GlobalAIOrb() {
  const dragConstraintsRef = useRef(null);

  return (
    <>
      <div ref={dragConstraintsRef} className="fixed inset-0 pointer-events-none z-[100]" />
      <motion.div
        drag
        dragConstraints={dragConstraintsRef}
        dragElastic={0.2}
        className="fixed bottom-8 right-8 z-[101] cursor-grab active:cursor-grabbing"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative w-16 h-16 rounded-full flex items-center justify-center animate-levitate group">
          {/* Holographic glowing orb background */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#00f0ff] to-[#8a2be2] opacity-80 blur-md animate-pulse-glow" />
          
          {/* Glass sphere overlay */}
          <div className="absolute inset-0 rounded-full bg-white/10 backdrop-blur-md border border-white/30 shadow-[inset_0_4px_10px_rgba(255,255,255,0.5),inset_0_-4px_10px_rgba(0,0,0,0.5)]" />
          
          {/* Core Energy */}
          <div className="absolute inset-3 rounded-full bg-white/80 shadow-[0_0_20px_#00f0ff] animate-pulse" />

          {/* AI Icon */}
          <Bot className="relative z-10 w-6 h-6 text-[#030712] drop-shadow-md" />
          
          {/* Tooltip on hover */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#030712]/80 backdrop-blur text-white text-xs px-3 py-1.5 rounded-lg border border-white/10 whitespace-nowrap pointer-events-none">
            Vibe AI Assistant
          </div>
        </div>
      </motion.div>
    </>
  );
}
