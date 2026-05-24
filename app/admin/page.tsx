"use client";

import Link from "next/link";
import { useSelector } from "react-redux";
import {
  ShieldCheck,
  FileText,
  PlusCircle,
  CalendarPlus,
  CalendarCheck,
  Users,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { isAdminEmail } from "@/lib/auth";
import type { RootState } from "../store/store";

const cards: Array<{
  href: string;
  title: string;
  desc: string;
  icon: typeof FileText;
}> = [
  {
    href: "/admin/questions",
    title: "Manage questions",
    desc: "Edit or delete existing problems.",
    icon: FileText,
  },
  {
    href: "/admin/questions/new",
    title: "Create question",
    desc: "Add a new coding problem with testcases.",
    icon: PlusCircle,
  },
  {
    href: "/admin/quizzes",
    title: "Manage quizzes",
    desc: "View, edit, or delete scheduled quizzes.",
    icon: CalendarCheck,
  },
  {
    href: "/admin/quizzes/new",
    title: "Schedule a quiz",
    desc: "Create an upcoming quiz event.",
    icon: CalendarPlus,
  },
  {
    href: "/admin/users",
    title: "Users",
    desc: "View users and set status flags.",
    icon: Users,
  },
];

const AdminHome = () => {
  const { userData } = useSelector((state: RootState) => state.auth);
  const email = userData?.email || null;
  const isAdmin = isAdminEmail(email);

  if (!isAdmin) {
    return (
      <div className="min-h-screen dark:bg-[#020612] text-gray-900 dark:text-white">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-6xl mb-4">🔒</p>
          <h1 className="text-2xl font-bold mb-2">Admins only</h1>
          <p className="text-gray-500 dark:text-gray-400">
            You don&apos;t have access to the admin area.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-[#020612] text-gray-900 dark:text-white">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck className="w-7 h-7 text-purple-600" />
          <h1 className="text-3xl font-bold">Admin</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(({ href, title, desc, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group bg-white dark:bg-zinc-800 rounded-xl shadow p-5 hover:shadow-lg hover:-translate-y-0.5 transition"
            >
              <Icon className="w-8 h-8 text-purple-600 mb-3 group-hover:scale-110 transition" />
              <h3 className="font-semibold text-lg mb-1">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminHome;
