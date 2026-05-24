"use client";

import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Circle,
} from "lucide-react";
import { useState } from "react";

interface HistoryItem {
  title: string;
  // ISO timestamp string — formatted relatively below.
  time: string;
  passed?: boolean;
}

interface Props {
  historyData: HistoryItem[];
}

// Compact relative formatter. Falls back to a short date for anything older
// than a week so rows stay scannable even with hundreds of submissions.
function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return iso;
  const diff = Date.now() - ts;
  if (diff < 0) return "just now";

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;

  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      new Date(ts).getFullYear() === new Date().getFullYear()
        ? undefined
        : "numeric",
  });
}

const HistorySection = ({ historyData }: Props) => {
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(historyData.length / perPage));
  const startIndex = (currentPage - 1) * perPage;
  const currentItems = historyData.slice(startIndex, startIndex + perPage);

  return (
    <section className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-4 lg:p-6 flex-1 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg lg:text-xl font-semibold">Recent Activity</h3>
        {historyData.length > perPage && (
          <div className="flex items-center gap-2 lg:gap-3">
            <span className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-700 disabled:opacity-50"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-700 disabled:opacity-50"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="divide-y divide-gray-200 dark:divide-zinc-700 flex-1 overflow-auto">
        {currentItems.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-300 text-sm text-center mt-4">
            No submissions yet.
          </p>
        ) : (
          currentItems.map((item, index) => (
            <div
              key={index}
              className="flex justify-between items-center gap-3 px-2 py-3 hover:bg-gray-100 dark:hover:bg-zinc-700 transition rounded-md"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {item.passed === true ? (
                  <CheckCircle2
                    className="w-4 h-4 text-green-600 shrink-0"
                    aria-label="Passed"
                  />
                ) : item.passed === false ? (
                  <XCircle
                    className="w-4 h-4 text-red-500 shrink-0"
                    aria-label="Failed"
                  />
                ) : (
                  <Circle
                    className="w-4 h-4 text-gray-300 shrink-0"
                    aria-label="Unknown"
                  />
                )}
                <p className="truncate text-sm">{item.title}</p>
              </div>
              <span
                className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0"
                title={new Date(item.time).toLocaleString()}
              >
                {formatRelative(item.time)}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default HistorySection;
