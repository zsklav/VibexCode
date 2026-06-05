"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  Sparkles
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

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";
  // Full-height pages (chat/editor) pad themselves; others get a spacer to clear the fixed navbar.
  const selfManagedTop = isHome || pathname === "/community" || pathname === "/playground";
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
      dispatch(logoutAction());
      router.push("/login");
    }
  };

  return (
    <>
    <nav className={isHome ? "fixed top-0 inset-x-0 z-50 pointer-events-none" : "fixed top-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none"}>
      <div className={isHome
        ? "pointer-events-auto flex w-full items-center justify-between px-6 py-4 sm:px-8 lg:px-14"
        : "pointer-events-auto flex w-full max-w-5xl items-center justify-between rounded-full bg-white/70 dark:bg-[#030712]/60 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] px-4 py-2.5 transition-all"}>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="md:hidden text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white transition-colors p-1"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="mr-4">
            <Logo />
          </div>
        </div>

        <div className={isHome ? "hidden md:flex items-center gap-1 rounded-full p-1" : "hidden md:flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded-full p-1 border border-black/5 dark:border-white/5"}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative px-4 py-1.5 text-sm font-medium rounded-full transition-colors duration-200 z-10",
                  isActive ? "text-black dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="navbar-active-pill"
                    className="absolute inset-0 rounded-full bg-white/10 border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          
          {isLoggedIn ? (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileMenu((value) => !value)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/5 dark:border-white/10 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#00f0ff] to-[#8a2be2] flex items-center justify-center shadow-[0_0_10px_rgba(0,240,255,0.4)]">
                  <User className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="hidden sm:inline text-sm font-medium text-slate-800 dark:text-slate-200">
                  {authState.userData?.name?.split(" ")[0] || "Profile"}
                </span>
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-4 w-56 rounded-2xl bg-white/95 dark:bg-[#0a0f1c]/90 backdrop-blur-2xl border border-black/10 dark:border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.1)] p-2"
                  >
                    <MenuButton icon={User} label="Profile" onClick={() => navigate("/Profile")} />
                    <MenuButton icon={Code2} label="Submissions" onClick={() => navigate("/submissions")} />
                    <MenuButton icon={Settings} label="Settings" onClick={() => navigate("/settings")} />
                    {isAdminEmail(authState.userData?.email) && (
                      <MenuButton icon={Shield} label="Admin" onClick={() => navigate("/admin")} accent />
                    )}
                    <div className="h-px bg-white/10 my-2 mx-2" />
                    <MenuButton icon={LogOut} label="Logout" onClick={handleLogout} danger />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/login")}
                className="hidden sm:block px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white transition-colors"
              >
                Log in
              </button>
              <button
                onClick={() => navigate("/signup")}
                className="relative flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white dark:text-[#030712] rounded-full overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#00f0ff] to-[#00ffcc] transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Sparkles className="relative z-10 h-4 w-4" />
                <span className="relative z-10">Join Free</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 inset-x-4 max-w-sm mx-auto bg-white/95 dark:bg-[#0a0f1c]/95 backdrop-blur-2xl rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl p-4 pointer-events-auto"
          >
            <div className="flex flex-col gap-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-800 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    <Icon className="w-5 h-5 text-[#00f0ff]" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
    {!selfManagedTop && <div aria-hidden className="h-20 shrink-0" />}
    </>
  );
};

function MenuButton({
  icon: Icon,
  label,
  onClick,
  accent,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5",
        accent ? "text-[#0ea5e9] dark:text-[#00f0ff]" : danger ? "text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10" : "text-slate-800 dark:text-slate-200"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export default Navbar;
