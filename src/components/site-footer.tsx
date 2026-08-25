"use client";

import { Brand } from "./brand";
import { ShieldCheck, Lock } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-card/40 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-sm sm:flex-row">
        <Brand size="sm" />
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Device-bound playback
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-4 w-4 text-emerald-500" />
            Screenshot protected
          </span>
        </div>
        <div className="text-muted-foreground">
          © {new Date().getFullYear()} Dental Academy Pro
        </div>
      </div>
    </footer>
  );
}
