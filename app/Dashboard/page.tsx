"use client";

import React, { useEffect } from "react";

import Lead from "../components/Lead";
import Navbar from "../components/Navbar";
import PersonalTODO from "../components/PersonalTODO";
import CommunityConnect from "../components/CommunityConnect";
import FriendsSection from "../components/FriendsSection";

import authservice from "@/app/auth/firebase-auth";

const Dashboard = () => {
  useEffect(() => {
    // AuthGuard already handles route-level auth; this is just a sanity
    // check kept from the original Appwrite-era component.
    authservice.checkUser().catch((error) => {
      console.error("Not authenticated", error);
    });
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen p-4 md:p-6 dark:bg-[#020612] text-gray-900 dark:text-white">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top: three equal widgets — social + personal at a glance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 shadow-[0_4px_20px_rgba(128,0,255,0.08)]">
              <Lead />
            </div>
            <FriendsSection />
            <PersonalTODO />
          </div>

          {/* Bottom: clans take the full width */}
          <CommunityConnect />
        </div>
      </main>
    </>
  );
};

export default Dashboard;
