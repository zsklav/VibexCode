import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 dark:bg-[#020612] text-gray-900 dark:text-white">
      <div className="text-center max-w-md">
        <p className="text-8xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
          404
        </p>
        <h1 className="text-2xl font-bold mb-2">Page not found</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          That route doesn&apos;t exist. Maybe the URL has a typo, or the page
          moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
          >
            Go home
          </Link>
          <Link
            href="/problems"
            className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
          >
            Browse problems
          </Link>
        </div>
      </div>
    </div>
  );
}
