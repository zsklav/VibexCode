"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Activity, 
  MessageSquare, 
  Trophy, 
  Users, 
  Star,
  Sparkles,
  ChevronRight,
  TrendingUp,
  BrainCircuit
} from "lucide-react";

import Navbar from "../components/Navbar";
import Lead from "../components/Lead";
import PersonalTODO from "../components/PersonalTODO";
import CommunityConnect from "../components/CommunityConnect";
import FriendsSection from "../components/FriendsSection";
import authservice from "@/app/auth/firebase-auth";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";

const STATS = [
  { label: "Problems Solved", value: "342", icon: Trophy, color: "text-[#00f0ff]" },
  { label: "Active Friends", value: "12", icon: Users, color: "text-[#8a2be2]" },
  { label: "Messages", value: "89", icon: MessageSquare, color: "text-[#00ffcc]" },
  { label: "Reputation", value: "4.2k", icon: Star, color: "text-rose-400" },
  { label: "Community Rank", value: "#42", icon: TrendingUp, color: "text-amber-400" },
];

const AI_INSIGHTS = [
  "You've been solving mostly Graph problems recently. Consider reviewing Dynamic Programming to balance your skills.",
  "Your friend Alex is currently online and tackling the 'Alien Dictionary' hard problem. Maybe pair program?",
  "Based on your recent activity, you're 8% away from ranking up to 'Algorithm Master'."
];

export default function Dashboard() {
  const authStatus = useSelector((state: RootState) => state.auth);
  const userName = authStatus.userData?.name?.split(" ")[0] || "Developer";

  useEffect(() => {
    authservice.checkUser().catch((error) => {
      console.error("Not authenticated", error);
    });
  }, []);

  return (
    <div className="relative min-h-screen pt-4 pr-4 pl-0">
      <Navbar />

      <main className="mt-8 mx-auto max-w-7xl space-y-8">
        
        {/* Welcome Hero Area */}
        <section className="glass-panel rounded-[32px] p-8 lg:p-12 relative overflow-hidden flex items-center justify-between">
          <div className="absolute inset-0 bg-gradient-to-r from-[#030712] to-transparent z-0" />
          <div className="absolute right-0 top-0 w-1/2 h-full z-0 bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.15),transparent_70%)] opacity-50" />
          
          <div className="relative z-10 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4"
            >
              <Activity className="h-4 w-4 text-[#00ffcc] animate-pulse" />
              <span className="text-xs font-semibold text-slate-300">System Online</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl lg:text-5xl font-black text-white mb-4"
            >
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] to-[#8a2be2]">{userName}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-slate-400 text-lg"
            >
              Ready to crush some code today? Your AI assistant has prepared your insights.
            </motion.p>
          </div>

          {/* 3D Holographic AI Representation (Placeholder) */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="relative z-10 hidden lg:flex items-center justify-center w-48 h-48"
          >
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#8a2be2]/40 animate-[spin_10s_linear_infinite]" />
            <div className="absolute inset-4 rounded-full border border-[#00f0ff]/40 animate-[spin_7s_linear_infinite_reverse]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(0,240,255,0.2)_0%,transparent_60%)] animate-pulse-glow" />
            <BrainCircuit className="w-16 h-16 text-[#00f0ff] animate-levitate" />
          </motion.div>
        </section>

        {/* 3D Stats Cards */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-5 flex flex-col justify-between h-32 group"
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-5 h-5 ${stat.color} drop-shadow-[0_0_8px_currentColor]`} />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</span>
                </div>
                <div>
                  <span className="text-3xl font-black text-white group-hover:text-[#00f0ff] transition-colors">
                    {stat.value}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </section>

        {/* AI Insights Panel */}
        <section className="glass-panel p-6 rounded-[24px]">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-[#8a2be2]" />
            <h2 className="text-xl font-bold text-white">AI Insights</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {AI_INSIGHTS.map((insight, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/20 transition-colors">
                <p className="text-sm text-slate-300 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start pb-12">
          {/* We wrap legacy components in glass-cards to make them fit the theme */}
          <div className="glass-card p-6 overflow-hidden">
             <Lead />
          </div>
          <div className="glass-card p-6 overflow-hidden">
             <FriendsSection />
          </div>
          <div className="glass-card p-6 overflow-hidden">
             <PersonalTODO />
          </div>
          
          <div className="lg:col-span-3 glass-card p-6">
             <CommunityConnect />
          </div>
        </div>

      </main>
    </div>
  );
}
