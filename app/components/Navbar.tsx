"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Code2,
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  Rocket,
  Settings,
  Shield,
  User,
  Users,
  X,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { getAuth, signOut } from "firebase/auth";

import ThemeToggle from "./ThemeToggle";
import Logo from "./Logo";
import { AppDispatch, RootState } from "../store/store";
import { login, logout as logoutAction } from "../store/authSlice";
import authservice from "@/app/auth/firebase-auth";
import { app } from "@/lib/firebase";
import { isAdminEmail } from "@/lib/auth";
import { useHeartbeat } from "@/lib/useHeartbeat";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Problems", href: "/problems", icon: Code2 },
  { label: "Explore", href: "/Explore", icon: Compass },
  { label: "Dashboard", href: "/Dashboard", icon: LayoutDashboard },
  { label: "Community", href: "/community", icon: Users },
];

const menuVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

const Navbar = () => {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const authState = useSelector((state: RootState) => state.auth);
  const isLoggedIn = authState.status;

  useHeartbeat(isLoggedIn ? authState.userData?.email : null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const userData = await authservice.checkUser();
        dispatch(login({ status: Boolean(userData), userData: userData || null }));
      } catch (error) {
        console.error("Error checking user:", error);
        dispatch(login({ status: false, userData: null }));
      }
    };

    if (!isLoggedIn) checkUser();
  }, [dispatch, isLoggedIn]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfileMenu]);

  const navigate = (href: string) => {
    setMenuOpen(false);
    setShowProfileMenu(false);
    router.push(href);
  };

  const handleLogout = async () => {
    try {
      dispatch(logoutAction());
      await signOut(getAuth(app));
      await authservice.logout();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout Error:", error);
      dispatch(logoutAction());
      router.push("/login");
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full px-3 py-3 sm:px-5">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/50 bg-white/74 px-3 py-2 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/68 dark:shadow-black/30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="rounded-xl p-2 text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/10 md:hidden"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Logo />
        </div>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-950 hover:text-white dark:text-zinc-200 dark:hover:bg-white dark:hover:text-zinc-950"
              >
                <Icon className="h-4 w-4 opacity-70 transition group-hover:opacity-100" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isLoggedIn ? (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileMenu((value) => !value)}
                className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:border-zinc-300 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                aria-haspopup="menu"
                aria-expanded={showProfileMenu}
              >
                <User className="h-4 w-4" />
                <span className="hidden max-w-28 truncate sm:inline">
                  {authState.userData?.name || "Account"}
                </span>
              </button>
              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    variants={menuVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-zinc-950"
                  >
                    <MenuButton icon={User} label="Profile" onClick={() => navigate("/Profile")} />
                    <MenuButton icon={Code2} label="Submissions" onClick={() => navigate("/submissions")} />
                    <MenuButton icon={Settings} label="Settings" onClick={() => navigate("/settings")} />
                    {isAdminEmail(authState.userData?.email) && (
                      <MenuButton icon={Shield} label="Admin" onClick={() => navigate("/admin")} accent />
                    )}
                    <div className="my-1 h-px bg-zinc-200 dark:bg-white/10" />
                    <MenuButton icon={Rocket} label="Start Vibing" onClick={() => navigate("/problems")} strong />
                    <MenuButton icon={LogOut} label="Logout" onClick={handleLogout} danger />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/login")}
                className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/10 sm:inline-flex"
              >
                Log In
              </button>
              <button
                onClick={() => navigate("/signup")}
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition hover:-translate-y-0.5 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                <Rocket className="h-4 w-4" />
                Join
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mx-auto mt-2 max-w-7xl rounded-2xl border border-white/50 bg-white/92 p-3 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/92 md:hidden"
          >
            <div className="grid gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-white/10"
                  >
                    <Icon className="h-4 w-4 text-teal-500" />
                    {item.label}
                  </button>
                );
              })}
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-zinc-200 pt-3 dark:border-white/10">
                {isLoggedIn ? (
                  <>
                    <button onClick={() => navigate("/Profile")} className="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-semibold dark:bg-white/10">
                      Profile
                    </button>
                    <button onClick={handleLogout} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 dark:bg-red-950/30">
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => navigate("/login")} className="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-semibold dark:bg-white/10">
                      Log In
                    </button>
                    <button onClick={() => navigate("/signup")} className="rounded-xl bg-zinc-950 px-3 py-2 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950">
                      Sign Up
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

function MenuButton({
  icon: Icon,
  label,
  onClick,
  accent,
  danger,
  strong,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  accent?: boolean;
  danger?: boolean;
  strong?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-white/10",
        accent && "text-teal-600 dark:text-teal-300",
        danger && "text-red-600 dark:text-red-400",
        strong && "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export default Navbar;
