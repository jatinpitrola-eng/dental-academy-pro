"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";

// Loading spinner shown during SSR + first client paint (before AppShell mounts).
// We use a mounted-check pattern instead of next/dynamic({ ssr: false }) because
// Next.js 16's Turbopack runtime has a bug where dynamic imports in production
// builds throw "Cannot read properties of null (reading 'getAttribute')" when
// the chunk tries to register with the Turbopack runtime. The mounted pattern
// achieves the same ssr: false behavior without triggering the Turbopack bug.
function LoadingSpinner() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        {/* Logo */}
        <div className="relative grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
            <path d="M12 2c-2.7 0-4 1-5.5 1S3.5 2 2.5 2C1 2 0 3 0 5.2c0 2.4 1.1 4.1 1.7 6.6.4 1.6.7 3.5 1.5 3.5.8 0 1-1.5 1.4-3.1.4-1.6.8-2.7 1.8-2.7s1.4 1.1 1.8 2.7c.4 1.6.6 3.1 1.4 3.1s1.1-1.9 1.5-3.5C13.4 9.9 14 6 14 5.2 14 3 13 2 12 2z" transform="translate(5 3) scale(0.6)" />
          </svg>
        </div>
        {/* Spinner */}
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
        <p className="text-sm text-muted-foreground">Loading Dental Academy…</p>
      </div>
    </div>
  );
}

export default function Page() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <LoadingSpinner />;
  return <AppShell />;
}
