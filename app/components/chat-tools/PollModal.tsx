"use client";

import { useState } from "react";
import axios from "axios";
import { Plus, Trash2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Poll } from "./types";

const EXPIRATIONS = [
  { value: "1h", label: "1 Hour" },
  { value: "24h", label: "24 Hours" },
  { value: "3d", label: "3 Days" },
  { value: "1w", label: "1 Week" },
  { value: "never", label: "Never" },
];

export default function PollModal({
  conversationId,
  selfId,
  selfName,
  onClose,
  onCreated,
}: {
  conversationId: string;
  selfId: string;
  selfName: string;
  onClose: () => void;
  onCreated: (payload: { poll: Poll; message: any }) => void;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["React", "Vue", "Angular", "Svelte"]);
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [allowVoteChanges, setAllowVoteChanges] = useState(true);
  const [expiration, setExpiration] = useState("24h");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const validOptions = options.map((option) => option.trim()).filter(Boolean);

  const createPoll = async () => {
    setError("");
    if (!question.trim() || validOptions.length < 2) {
      setError("Add a question and at least two options.");
      return;
    }

    setBusy(true);
    try {
      const res = await axios.post("/api/tools/polls", {
        conversationId,
        creatorId: selfId,
        creatorName: selfName,
        question,
        options: validOptions,
        multipleChoice,
        anonymous,
        allowVoteChanges,
        expiration,
      });
      onCreated(res.data);
      onClose();
    } catch (err) {
      setError(
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Failed to create poll."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Create Poll</h2>
            <p className="text-xs text-gray-500">Votes update live in this chat.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-zinc-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-gray-500">Question</span>
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Which framework should we use?"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>

        <div className="mb-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Options</span>
            <button
              onClick={() => setOptions((current) => [...current, ""])}
              disabled={options.length >= 10}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 disabled:opacity-40 dark:hover:bg-purple-950"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={option}
                onChange={(event) =>
                  setOptions((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? event.target.value : item
                    )
                  )
                }
                className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
              <button
                onClick={() =>
                  setOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))
                }
                disabled={options.length <= 2}
                className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          <Toggle label="Multiple Choice" value={multipleChoice} onChange={setMultipleChoice} />
          <Toggle label="Anonymous Voting" value={anonymous} onChange={setAnonymous} />
          <Toggle label="Allow Vote Changes" value={allowVoteChanges} onChange={setAllowVoteChanges} />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Expiration</span>
            <select
              value={expiration}
              onChange={(event) => setExpiration(event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-800"
            >
              {EXPIRATIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800">
            Cancel
          </button>
          <button
            onClick={createPoll}
            disabled={busy}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-950"
          >
            Create Poll
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-zinc-700"
    >
      <span>{label}</span>
      <span
        className={cn(
          "h-5 w-9 rounded-full p-0.5 transition",
          value ? "bg-purple-500" : "bg-gray-300 dark:bg-zinc-700"
        )}
      >
        <span
          className={cn(
            "block h-4 w-4 rounded-full bg-white transition",
            value && "translate-x-4"
          )}
        />
      </span>
    </button>
  );
}
