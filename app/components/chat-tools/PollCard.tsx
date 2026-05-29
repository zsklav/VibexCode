"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { BarChart3, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Poll } from "./types";

function isClosed(poll: Poll) {
  return Boolean(poll.expiresAt && new Date(poll.expiresAt).getTime() <= Date.now());
}

function pollStats(poll: Poll) {
  const counts = Object.fromEntries(poll.options.map((option) => [option.id, 0]));
  poll.votes.forEach((vote) => {
    vote.optionIds.forEach((id) => {
      counts[id] = (counts[id] || 0) + 1;
    });
  });
  const totalSelections = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return { counts, totalSelections, totalVotes: poll.votes.length };
}

export default function PollCard({
  pollId,
  poll,
  selfId,
  conversationId,
  onVote,
}: {
  pollId: string;
  poll?: Poll;
  selfId: string;
  conversationId: string;
  onVote: (poll: Poll) => void;
}) {
  const [data, setData] = useState<Poll | null>(poll || null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (poll) setData(poll);
  }, [poll]);

  useEffect(() => {
    if (data) return;
    axios
      .get(`/api/tools/polls/${pollId}`)
      .then((res) => setData(res.data))
      .catch(() => setData(null));
  }, [data, pollId]);

  useEffect(() => {
    const vote = data?.votes.find((item) => item.userId === selfId);
    setSelected(vote?.optionIds || []);
  }, [data, selfId]);

  const stats = useMemo(() => (data ? pollStats(data) : null), [data]);
  const closed = data ? isClosed(data) : false;

  const toggle = (optionId: string) => {
    if (!data || closed || busy) return;
    setSelected((current) => {
      if (data.multipleChoice) {
        return current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
      }
      return [optionId];
    });
  };

  const submit = async () => {
    if (!data || selected.length === 0 || busy) return;
    setBusy(true);
    try {
      const res = await axios.patch(`/api/tools/polls/${data._id}`, {
        userId: selfId,
        optionIds: selected,
      });
      setData(res.data);
      onVote(res.data);
    } finally {
      setBusy(false);
    }
  };

  if (!data || !stats) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white/90 p-4 text-sm text-gray-500 dark:border-zinc-700 dark:bg-zinc-900/90">
        Loading poll...
      </div>
    );
  }

  const myVote = data.votes.find((vote) => vote.userId === selfId);
  const canVote = !closed && (!myVote || data.allowVoteChanges);
  const peak = (data.timeline || []).reduce(
    (best, entry, index, list) => {
      const previous = index > 0 ? list[index - 1].totalVotes : 0;
      const delta = entry.totalVotes - previous;
      return delta > best.delta ? { delta, at: entry.at } : best;
    },
    { delta: 0, at: "" }
  );

  return (
    <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white/95 p-4 text-gray-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-white">
      <div className="mb-3 flex items-start gap-2">
        <div className="rounded-lg bg-purple-100 p-2 text-purple-600 dark:bg-purple-950 dark:text-purple-200">
          <BarChart3 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{data.question}</p>
          <p className="mt-1 text-xs text-gray-500">
            Votes: {stats.totalVotes}
            {closed && <span className="ml-2 font-medium text-red-500">Poll Closed</span>}
          </p>
        </div>
        {data.anonymous && <Lock className="h-4 w-4 text-gray-400" />}
      </div>

      <div className="space-y-2">
        {data.options.map((option) => {
          const count = stats.counts[option.id] || 0;
          const percent = stats.totalSelections
            ? Math.round((count / stats.totalSelections) * 100)
            : 0;
          const checked = selected.includes(option.id);
          return (
            <button
              key={option.id}
              disabled={!canVote}
              onClick={() => toggle(option.id)}
              className={cn(
                "relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition",
                checked
                  ? "border-purple-400 bg-purple-50 dark:bg-purple-950/40"
                  : "border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-zinc-700 dark:bg-zinc-800"
              )}
            >
              <motion.span
                initial={false}
                animate={{ width: `${percent}%` }}
                className="absolute inset-y-0 left-0 bg-purple-500/15"
              />
              <span className="relative flex items-center gap-2">
                <span>{checked ? "●" : "○"}</span>
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                <span className="font-medium">{percent}%</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-500">
        <span>
          {peak.delta > 0 ? `Most active burst: +${peak.delta} votes` : "Waiting for votes"}
        </span>
        <button
          onClick={submit}
          disabled={!canVote || selected.length === 0 || busy}
          className="rounded-md bg-gray-900 px-3 py-1.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-950"
        >
          {myVote ? "Update Vote" : "Vote"}
        </button>
      </div>
      <span className="sr-only">{conversationId}</span>
    </div>
  );
}
