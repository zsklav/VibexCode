import Link from "next/link";
import React from "react";

const Logo = () => {
  return (
    <div>
      <Link href="/" aria-label="VibeXCode home">
        <div className="flex items-center gap-2 text-xl font-bold tracking-tight cursor-pointer2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-950 text-sm text-white shadow-lg shadow-teal-500/20 dark:bg-white dark:text-zinc-950">
            VX
          </span>
          <span>
            <span className="text-zinc-950 dark:text-white">VibeX</span>
            <span className="text-teal-500">Code</span>
          </span>
        </div>
      </Link>
    </div>
  );
};

export default Logo;
