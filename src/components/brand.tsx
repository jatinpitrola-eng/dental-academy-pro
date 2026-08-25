"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AdminAccessModal } from "./admin-access-modal";

export function Brand({
  size = "md",
  className,
  clickable = true,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  clickable?: boolean;
}) {
  const dim =
    size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  const setAdminAccessOpen = useApp((s) => s.setAdminAccessOpen);

  const clicksRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pulse, setPulse] = useState(false);

  const onLogoClick = () => {
    if (!clickable) return;
    clicksRef.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      clicksRef.current = 0;
    }, 1500);

    // On the 5th click within 1.5s, open the secret admin access modal.
    if (clicksRef.current >= 5) {
      clicksRef.current = 0;
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
      setAdminAccessOpen(true);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <>
      <div className={cn("flex items-center gap-2.5", className)}>
        <button
          type="button"
          onClick={onLogoClick}
          className={cn(
            "relative grid place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 transition-transform",
            dim,
            clickable && "cursor-pointer",
            pulse && "scale-110 ring-4 ring-emerald-400/50",
          )}
          aria-label="Dental Academy"
        >
          {/* Use the uploaded logo PNG, fall back to nothing if it fails */}
          <img
            src="/logo.png"
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white dark:ring-emerald-900" />
        </button>
        <div className="leading-tight">
          <div className="font-semibold tracking-tight text-foreground">
            Dental Academy
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Pro · Secure Learning
          </div>
        </div>
      </div>
      <AdminAccessModal />
    </>
  );
}
