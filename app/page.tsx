"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useSelector } from "react-redux";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Code2,
  Command,
  MessageSquare,
  Play,
  Sparkles,
  TerminalSquare,
  Trophy,
  Users,
} from "lucide-react";

import Navbar from "./components/Navbar";
import authservice from "@/app/auth/firebase-auth";
import { RootState } from "./store/store";

const orbitItems = [
  { label: "< />", className: "left-[7%] top-[16%]", drift: -56 },
  { label: "API", className: "left-[19%] top-[74%]", drift: -34 },
  { label: "npm", className: "left-[45%] top-[9%]", drift: -48 },
  { label: "{ }", className: "right-[9%] top-[18%]", drift: -62 },
  { label: "git", className: "right-[18%] top-[68%]", drift: -42 },
  { label: "AI", className: "right-[43%] top-[82%]", drift: -30 },
];

const productLinks = [
  { label: "Problems", href: "/problems", icon: Code2, stat: "50+ routes" },
  { label: "Playground", href: "/playground", icon: Play, stat: "instant run" },
  { label: "Community", href: "/community", icon: Users, stat: "live sync" },
  { label: "AI Assistant", href: "/Dashboard", icon: Bot, stat: "guided flow" },
];

const codeLines = [
  "const idea = await capture(momentum);",
  "const plan = ai.refine(idea, community);",
  "ship({ tests: true, context: 'saved' });",
];

const flow = [
  { icon: TerminalSquare, title: "Open the workspace", text: "Jump into problems, playgrounds, or your dashboard from the first click." },
  { icon: MessageSquare, title: "Stay with context", text: "Ask, discuss, and compare without breaking the thread of what you were building." },
  { icon: Trophy, title: "Ship with momentum", text: "Keep progress visible so every session starts warmer than the last one." },
];

function OrbitChip({ item }: { item: (typeof orbitItems)[number] }) {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, item.drift]);

  return (
    <motion.span
      style={{ y }}
      className={`pointer-events-none absolute ${item.className} hidden rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 font-mono text-[11px] text-cyan-100/70 shadow-[0_0_28px_rgba(0,229,255,0.1)] backdrop-blur-xl md:inline-flex`}
    >
      {item.label}
    </motion.span>
  );
}

function ProductCockpit() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, rotateX: 6 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: 0.24, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
    >
      <div className="absolute -inset-8 rounded-[2rem] bg-[radial-gradient(circle_at_55%_45%,rgba(0,229,255,0.24),transparent_34%),radial-gradient(circle_at_80%_14%,rgba(124,58,237,0.26),transparent_34%)] blur-2xl" />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/12 bg-[#080d18]/88 shadow-[0_34px_120px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-2xl">
        <div className="flex h-12 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 font-mono text-[11px] text-slate-400">
            vibex/main.ts
          </div>
        </div>

        <div className="grid min-h-[430px] gap-0 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">Builder</p>
                <h3 className="mt-1 text-xl font-black text-[#f8fafc]">Production flow</h3>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
                Live
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#050912] p-4 font-mono text-sm shadow-inner">
              {codeLines.map((line, index) => (
                <motion.div
                  key={line}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.52 + index * 0.12, duration: 0.4 }}
                  className="flex min-h-9 items-center gap-4 border-b border-white/[0.05] last:border-0"
                >
                  <span className="w-5 text-right text-slate-600">{index + 1}</span>
                  <span className="text-slate-300">
                    {line.includes("ship") ? (
                      <>
                        <span className="text-cyan-300">ship</span>
                        <span className="text-slate-400">({"{"} tests: true, context: </span>
                        <span className="text-emerald-300">'saved'</span>
                        <span className="text-slate-400"> {"}"})</span>
                      </>
                    ) : (
                      line
                    )}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {["Tests", "Deploy", "Review"].map((item) => (
                <div key={item} className="rounded-xl border border-white/10 bg-white/[0.045] p-3">
                  <CheckCircle2 className="mb-2 h-4 w-4 text-cyan-300" />
                  <p className="text-xs font-bold text-[#f8fafc]">{item}</p>
                  <p className="mt-1 text-[11px] text-slate-500">ready</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300 text-slate-950">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#f8fafc]">AI Assistant</h3>
                  <p className="text-xs text-slate-400">pairing with your context</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl bg-white/[0.06] p-3 text-sm leading-6 text-slate-300">
                  Refactor the solution, preserve edge cases, and explain the tradeoff.
                </div>
                <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm leading-6 text-cyan-100">
                  I found a cleaner path. Want a tested version?
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {productLinks.slice(0, 3).map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 transition hover:border-cyan-300/35 hover:bg-white/[0.075]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] text-cyan-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-[#f8fafc]">{item.label}</span>
                      <span className="text-xs text-slate-500">{item.stat}</span>
                    </span>
                    <ArrowRight className="ml-auto h-4 w-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-300" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

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
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(145deg,#070a13_0%,#090c16_45%,#05070d_100%)]">
      {/* Ambient background, lifted out of the hero card so it fills the whole page */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(0,229,255,0.18),transparent_28%),radial-gradient(circle_at_78%_20%,rgba(139,92,246,0.2),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.11),transparent_34%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px] opacity-35" />

      <Navbar />

      <main className="relative z-10 w-full px-6 pb-16 pt-24 sm:px-8 lg:px-14">
        <section className="relative min-h-[calc(100svh-7rem)] overflow-hidden">
          {orbitItems.map((item) => (
            <OrbitChip key={`${item.label}-${item.className}`} item={item} />
          ))}

          <div className="relative z-10 grid min-h-[calc(100svh-7rem)] items-center gap-10 py-6 sm:py-8 lg:grid-cols-[0.86fr_1.14fr] lg:py-14">
            <div className="max-w-3xl">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55 }}
                className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-200/15 bg-cyan-200/[0.07] px-4 py-2 text-sm font-bold text-cyan-100 shadow-[0_0_40px_rgba(0,229,255,0.08)]"
              >
                <Sparkles className="h-4 w-4 text-cyan-300" />
                Build faster with community and AI
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.62 }}
                className="text-balance text-6xl font-black leading-[0.9] tracking-normal text-[#f8fafc] sm:text-7xl lg:text-[6.5rem]"
              >
                Code.
                <br />
                Create.
                <br />
                <span className="bg-gradient-to-r from-cyan-200 via-sky-300 to-violet-300 bg-clip-text text-transparent">
                  Ship.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16, duration: 0.62 }}
                className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl"
              >
                VibeXCode turns ideas into working software with a focused playground,
                real community context, and AI that stays close to your code.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24, duration: 0.62 }}
                className="mt-9 flex flex-col gap-3 sm:flex-row"
              >
                <Link href={primaryHref} className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-6 text-base font-black text-slate-950 shadow-[0_0_50px_rgba(0,229,255,0.24)] transition hover:-translate-y-0.5 hover:bg-white">
                  {primaryLabel}
                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
                </Link>
                <Link href="/playground" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-6 text-base font-bold text-[#f8fafc] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/[0.1]">
                  <Play className="h-5 w-5" />
                  Open Playground
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.62 }}
                className="mt-10 grid max-w-xl grid-cols-3 gap-3"
              >
                {[
                  ["50+", "routes"],
                  ["Live", "community"],
                  ["AI", "assistant"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                    <p className="text-2xl font-black text-[#f8fafc]">{value}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            <ProductCockpit />
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {productLinks.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.label}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: index * 0.06, duration: 0.45 }}
                className="group rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-white/[0.07]"
              >
                <Link href={item.href} className="block">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-300" />
                  </div>
                  <h2 className="text-xl font-black text-[#f8fafc]">{item.label}</h2>
                  <p className="mt-2 text-sm font-semibold text-slate-500">{item.stat}</p>
                </Link>
              </motion.article>
            );
          })}
        </section>

        <section className="mt-8 grid gap-6 rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl sm:p-8 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-sm font-bold text-cyan-200">
              <Command className="h-4 w-4" />
              Flow that feels built-in
            </p>
            <h2 className="text-4xl font-black leading-tight text-[#f8fafc]">
              Less jumping around. More building.
            </h2>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-300">
              The page stays lightweight, but the experience now feels like a real
              developer product instead of a generic glass panel.
            </p>
          </div>

          <div className="grid gap-3">
            {flow.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: 18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08, duration: 0.4 }}
                  className="rounded-2xl border border-white/10 bg-[#070b14] p-4"
                >
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-cyan-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-[#f8fafc]">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{item.text}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
