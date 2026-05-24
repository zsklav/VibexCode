"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
interface Player {
  name: string;
  questionsDone: number;
  points: number;
}

const COLLECTION_NAME = "leaderboard"; // Firestore collection name

const Lead = () => {
  const [leaderboardData, setLeaderboardData] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));

        const players: Player[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          const solvedIds = Array.isArray(data.solvedQuestionIds)
            ? data.solvedQuestionIds
            : [];
          return {
            name: data.name || "Anonymous",
            questionsDone: solvedIds.length || data.questionsDone || 0,
            points: typeof data.points === "number" ? data.points : 0,
          };
        });

        // Rank by points first, then by problems solved as the tiebreaker.
        players.sort(
          (a, b) => b.points - a.points || b.questionsDone - a.questionsDone
        );

        setLeaderboardData(players);
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const medals = ["🥇", "🥈", "🥉"];

  if (loading)
    return <p className="text-center py-10">Loading leaderboard...</p>;

  return (
    <div className="space-y-4 w-full">
      <h3 className="text-xl font-semibold">Leaderboard</h3>
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 space-y-3 overflow-y-auto max-h-[600px] shadow-[0_4px_20px_rgba(128,0,255,0.4)]">
        {leaderboardData.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No data available.</p>
        ) : (
          leaderboardData.map((player, index) => (
            <div
              key={index}
              className="flex items-center gap-3 border-b border-gray-200 dark:border-zinc-600 pb-3 last:border-none last:pb-0"
            >
              <div
                className={`shrink-0 rounded-full h-10 w-10 flex items-center justify-center text-white font-bold ${
                  ["bg-yellow-500", "bg-gray-400", "bg-yellow-800"][index] ||
                  "bg-green-500"
                }`}
              >
                {player.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold truncate">{player.name}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {player.points} pts · {player.questionsDone} solved
                </p>
              </div>
              <div className="shrink-0 text-xl">
                {medals[index] || "🎖️"}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Lead;
