"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSelector } from "react-redux";
import {
  ArrowRight,
  Braces,
  CheckCircle2,
  Code2,
  MessageSquare,
  Play,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

import Navbar from "./components/Navbar";
import HeroWorkspace3D from "./components/HeroWorkspace3D";
import authservice from "@/app/auth/firebase-auth";
import { RootState } from "./store/store";

const capabilities = [
  {
    icon: Code2,
    title: "Practice that feels alive",
    text: "Solve problems, run code, track progress, and keep momentum without leaving the workspace.",
  },
  {
    icon: MessageSquare,
    title: "Real-time developer chat",
    text: "Discuss approaches, share files, launch tools, and collaborate while the context is still fresh.",
  },
  {
    icon: Trophy,
    title: "Progress with signal",
    text: "Leaderboards, submissions, and activity views help you see what improved and what needs work.",
  },
];

const workflow = [
  "Choose a topic or open the playground",
  "Build, test, ask, and discuss in one flow",
  "Save progress and return with context intact",
];

const stats = [
  { label: "Core routes", value: "50+" },
  { label: "Realtime tools", value: "Live" },
  { label: "Focus mode", value: "24/7" },
];

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const authStatus = useSelector((state: RootState) => state.auth.status);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const result = await authservice.checkUser();
        setLoggedIn(Boolean(result));
      } catch (error) {
        console.error("Error checking user authentication:", error);
        setLoggedIn(false);
      }
    };
    checkUser();
  }, [authStatus]);

  const primaryHref = loggedIn ? "/problems" : "/signup";
  const primaryLabel = loggedIn ? "Continue Coding" : "Start Free";

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f3eb] text-zinc-950 dark:bg-[#080a0f] dark:text-white">
      <Navbar />

      <main>
        <section className="relative -mt-20 min-h-[calc(100svh+1rem)] overflow-hidden pt-20">
          <div className="absolute inset-0 bg-[linear-gradient(115deg,#f8fafc_0%,#f7f3eb_34%,#d7f7ee_68%,#ffd9c7_100%)] dark:bg-[linear-gradient(115deg,#080a0f_0%,#111827_42%,#052e2b_70%,#2a1116_100%)]" />
          <HeroWorkspace3D />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(247,243,235,0.94)_0%,rgba(247,243,235,0.78)_39%,rgba(247,243,235,0.16)_76%)] dark:bg-[linear-gradient(90deg,rgba(8,10,15,0.96)_0%,rgba(8,10,15,0.76)_42%,rgba(8,10,15,0.12)_78%)]" />

          <div className="relative z-10 mx-auto flex min-h-[calc(100svh-5rem)] max-w-7xl items-center px-4 pb-16 pt-10 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55 }}
                className="mb-5 inline-flex items-center gap-2 rounded-full border border-zinc-950/10 bg-white/70 px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-zinc-200"
              >
                <Sparkles className="h-4 w-4 text-teal-500" />
                Developer workspace for practice, chat, and momentum
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.65 }}
                className="max-w-4xl text-5xl font-black leading-[0.95] tracking-normal text-zinc-950 dark:text-white sm:text-6xl lg:text-7xl"
              >
                Code better with a workspace that keeps up.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.55 }}
                className="mt-6 max-w-2xl text-base leading-7 text-zinc-700 dark:text-zinc-300 sm:text-lg"
              >
                VibeXCode brings practice, real-time community chat, coding tools,
                progress tracking, and collaboration into one smooth developer-first
                environment.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.5 }}
                className="mt-8 flex flex-col gap-3 sm:flex-row"
              >
                <Link
                  href={primaryHref}
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white shadow-2xl shadow-teal-500/20 transition hover:-translate-y-0.5 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/playground"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-950/10 bg-white/72 px-5 py-3 text-sm font-bold text-zinc-900 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                >
                  <Play className="h-4 w-4" />
                  Open Playground
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38, duration: 0.5 }}
                className="mt-9 grid max-w-xl grid-cols-3 gap-3"
              >
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-zinc-950/10 bg-white/64 px-3 py-3 backdrop-blur dark:border-white/10 dark:bg-white/10">
                    <p className="text-2xl font-black">{stat.value}</p>
                    <p className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-10 h-20 bg-gradient-to-t from-[#f7f3eb] to-transparent dark:from-[#080a0f]" />
        </section>

        <section className="relative z-20 mx-auto grid max-w-7xl gap-4 px-4 pb-20 sm:px-6 lg:grid-cols-3 lg:px-8">
          {capabilities.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: index * 0.08, duration: 0.45 }}
                className="rounded-2xl border border-zinc-950/10 bg-white/80 p-5 shadow-xl shadow-zinc-900/5 backdrop-blur dark:border-white/10 dark:bg-white/8"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                  {item.text}
                </p>
              </motion.article>
            );
          })}
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-24 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-500/12 px-3 py-1.5 text-sm font-semibold text-teal-700 dark:text-teal-300">
              <Zap className="h-4 w-4" />
              Built for flow
            </p>
            <h2 className="text-3xl font-black leading-tight sm:text-4xl">
              Less switching. More building.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-600 dark:text-zinc-300 sm:text-base">
              The platform is designed around the way developers actually work:
              search, solve, chat, compare, ship, and come back tomorrow without
              losing the thread.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-950/10 bg-zinc-950 p-4 text-white shadow-2xl shadow-zinc-950/20 dark:border-white/10">
            <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-teal-400" />
              <span className="ml-2 text-xs text-zinc-400">vibexcode/workflow.ts</span>
            </div>
            <div className="space-y-3 font-mono text-sm">
              {workflow.map((line, index) => (
                <motion.div
                  key={line}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 rounded-xl bg-white/6 px-3 py-3"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
                  <span>{line}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-zinc-950/10 bg-white/60 px-4 py-16 dark:border-white/10 dark:bg-white/5 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                <Braces className="h-4 w-4 text-rose-500" />
                Ready when you are
              </div>
              <h2 className="text-3xl font-black">Make your next coding session feel effortless.</h2>
            </div>
            <Link
              href={primaryHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-teal-500/20 transition hover:-translate-y-0.5 dark:bg-white dark:text-zinc-950"
            >
              {primaryLabel}
              <Users className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
