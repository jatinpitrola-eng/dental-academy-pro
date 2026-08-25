"use client";

import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function Brand({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "relative grid place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20",
          dim,
        )}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-1/2 w-1/2"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 2c-2.7 0-4 1-5.5 1S3.5 2 2.5 2C1 2 0 3 0 5.2c0 2.4 1.1 4.1 1.7 6.6.4 1.6.7 3.5 1.5 3.5.8 0 1-1.5 1.4-3.1.4-1.6.8-2.7 1.8-2.7s1.4 1.1 1.8 2.7c.4 1.6.6 3.1 1.4 3.1s1.1-1.9 1.5-3.5C13.4 9.9 14 6 14 5.2 14 3 13 2 12 2z" transform="translate(5 3) scale(0.6)" />
        </svg>
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white dark:ring-emerald-900" />
      </div>
      <div className="leading-tight">
        <div className="font-semibold tracking-tight text-foreground">
          Dental Academy
        </div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Pro · Secure Learning
        </div>
      </div>
    </div>
  );
}
