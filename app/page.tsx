"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSelector } from "react-redux";
import gsap from "gsap";
import {
  ArrowRight,
  Bot,
  Braces,
  Code2,
  Command,
  GitBranch,
  MessagesSquare,
  Play,
  Sparkles,
  Users,
} from "lucide-react";

import Navbar from "./components/Navbar";
import HeroWorkspace3D from "./components/HeroWorkspace3D";
import authservice from "@/app/auth/firebase-auth";
import { RootState } from "./store/store";

const heroLinks = [
  { label: "Problems", href: "/problems", icon: Code2, glow: "from-cyan-400/35 to-blue-500/10" },
  { label: "Playground", href: "/playground", icon: Play, glow: "from-violet-400/35 to-cyan-500/10" },
  { label: "Community", href: "/community", icon: Users, glow: "from-blue-400/35 to-fuchsia-500/10" },
  { label: "AI Assistant", href: "/Dashboard", icon: Bot, glow: "from-fuchsia-400/35 to-cyan-500/10" },
];

const signals = [
  { label: "Live rooms", value: "Community", icon: MessagesSquare },
  { label: "Ship loop", value: "Build", icon: GitBranch },
  { label: "Focus stack", value: "2AM", icon: Command },
];

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const authStatus = useSelector((state: RootState) => state.auth.status);
  const heroRef = useRef<HTMLElement | null>(null);

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

  useEffect(() => {
    if (!heroRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hero-reveal",
        { opacity: 0, y: 24, filter: "blur(10px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 1.15,
          ease: "power3.out",
          stagger: 0.12,
        }
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const primaryHref = loggedIn ? "/problems" : "/signup";
  const primaryLabel = loggedIn ? "Continue Coding" : "Start Building";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8fbff] text-slate-950 dark:bg-[#050505] dark:text-white">
      <Navbar />

      <main>
        <section
          ref={heroRef}
          className="relative min-h-[100svh] overflow-hidden bg-[#050505] px-4 pb-12 pt-28 text-white sm:px-6 lg:px-8"
        >
          <HeroWorkspace3D />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(124,58,237,0.22),transparent_32%),radial-gradient(circle_at_76%_28%,rgba(0,229,255,0.18),transparent_30%),linear-gradient(180deg,rgba(5,5,5,0.16),#050505_92%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050505] to-transparent" />

          <div className="relative z-10 mx-auto grid min-h-[calc(100svh-10rem)] max-w-[1380px] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="max-w-4xl">
              <div className="hero-reveal mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-medium text-cyan-100 shadow-[0_0_40px_rgba(0,229,255,0.12)] backdrop-blur-2xl">
                <Sparkles className="h-4 w-4 text-cyan-300" />
                Developer flow, community, and AI in one premium workspace
              </div>

              <h1 className="hero-reveal max-w-5xl text-balance text-6xl font-black leading-[0.92] tracking-normal sm:text-7xl lg:text-8xl xl:text-[7.6rem]">
                <span className="hero-gradient-text">Code. Create. Ship.</span>
              </h1>

              <p className="hero-reveal mt-8 max-w-2xl text-pretty text-lg leading-8 text-slate-300 sm:text-xl">
                VibeXCode transforms ideas into production-ready software with the power of
                community, collaboration, and AI.
              </p>

              <div className="hero-reveal mt-10 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={primaryHref}
                  className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-cyan-200/30 bg-cyan-100 px-6 text-base font-bold text-slate-950 shadow-[0_0_42px_rgba(0,229,255,0.28)] transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_0_64px_rgba(0,229,255,0.42)]"
                >
                  {primaryLabel}
                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/playground"
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.07] px-6 text-base font-semibold text-white backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:border-cyan-200/40 hover:bg-white/[0.11]"
                >
                  <Play className="h-5 w-5" />
                  Open Playground
                </Link>
              </div>
            </div>

            <motion.aside
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.45, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="hero-reveal relative mx-auto w-full max-w-[420px] rounded-3xl border border-white/12 bg-white/[0.075] p-3 shadow-[0_24px_100px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-3xl"
            >
              <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-cyan-300/24 via-transparent to-violet-400/24 opacity-80" />
              <div className="relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#071018]/72">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  </div>
                  <div className="font-mono text-xs text-slate-400">vibex.flow</div>
                </div>

                <div className="space-y-3 p-4">
                  {heroLinks.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="group relative flex min-h-[74px] items-center gap-4 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.045] px-4 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-200/35 hover:bg-white/[0.09] hover:shadow-[0_0_40px_rgba(0,229,255,0.14)]"
                      >
                        <span className={`absolute inset-0 bg-gradient-to-r ${item.glow} opacity-0 blur-xl transition duration-300 group-hover:opacity-100`} />
                        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.08] text-cyan-200">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="relative min-w-0">
                          <span className="block text-base font-bold text-white">{item.label}</span>
                          <span className="mt-1 block truncate font-mono text-xs text-slate-400">
                            {index === 0 ? "solve()" : index === 1 ? "run.preview()" : index === 2 ? "sync.team()" : "ask.ai()"}
                          </span>
                        </span>
                        <ArrowRight className="relative ml-auto h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-cyan-200" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </motion.aside>
          </div>

          <div className="relative z-10 mx-auto mt-3 grid max-w-[1380px] gap-3 sm:grid-cols-3">
            {signals.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-4 backdrop-blur-2xl"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-cyan-200" />
                    <div>
                      <p className="text-sm font-semibold text-white">{item.value}</p>
                      <p className="text-xs text-slate-400">{item.label}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section className="relative bg-[#050505] px-4 pb-24 text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1380px] rounded-3xl border border-white/10 bg-white/[0.045] p-6 backdrop-blur-2xl sm:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200">
                  <Braces className="h-4 w-4" />
                  Built for the midnight build session
                </div>
                <h2 className="max-w-2xl text-3xl font-black tracking-normal sm:text-4xl">
                  Problems, playgrounds, people, and AI stay in the same creative orbit.
                </h2>
              </div>
              <Link
                href="/community"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.08] px-5 font-semibold transition hover:border-cyan-200/40 hover:bg-white/[0.12]"
              >
                Explore Community
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
