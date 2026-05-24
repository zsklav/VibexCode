"use client";

import React, { useEffect } from "react";

import SoundBoard from "../components/SoundBoard";
import Lead from "../components/Lead";
import Navbar from "../components/Navbar";
import PersonalTODO from "../components/PersonalTODO";
import CommunityConnect from "../components/CommunityConnect";

import authservice from "@/app/auth/firebase-auth";

const Dashboard = () => {
  useEffect(() => {
    // AuthGuard already handles route-level auth; this is just a no-op
    // sanity check kept from the original component, ported off Appwrite.
    authservice.checkUser().catch((error) => {
      console.error("Not authenticated", error);
    });
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen p-6 dark:bg-[#020612] text-gray-900 dark:text-white">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Leaderboard */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 ">
              <Lead />
            </div>
          </div>

          {/* Middle Column - Community Connect */}
          <div className="lg:col-span-2">
            <CommunityConnect />
          </div>

          {/* Right Column - User Den */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="h-1/2">
              <PersonalTODO />
            </div>
            <div className="h-1/2">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-4 h-full overflow-hidden flex flex-col">
                <SoundBoard />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default Dashboard;
