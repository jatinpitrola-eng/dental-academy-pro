"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";

/**
 * IntroGate — plays the academy intro video every time the PWA is opened.
 * The intro CANNOT be skipped — the user must watch it to the end. This keeps
 * the brand front-and-center and prevents casual access.
 *
 * Implementation notes:
 *  - We use sessionStorage to remember that the intro has played for the
 *    current browser session, so a refresh within the same session doesn't
 *    replay it. But every fresh app open (new session) shows it again.
 *  - The video has NO controls, no right-click, no fast-forward via keyboard.
 *  - A progress bar shows how long until the intro ends.
 */
export function IntroGate({ children }: { children: React.ReactNode }) {
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const admin = useApp((s) => s.admin);

  useEffect(() => {
    // Don't show the intro to the admin (they manage content, no need).
    if (admin) {
      setDone(true);
      return;
    }
    // Show intro once per browser session.
    const seen = sessionStorage.getItem("da_intro_seen");
    if (seen === "1") {
      setDone(true);
      return;
    }
    // Don't show intro when the admin access modal is open.
    // (We just let it play; the modal opens on top if needed.)
  }, [admin]);

  const onTime = () => {
    const v = videoRef.current;
    if (!v) return;
    setProgress(v.currentTime);
    setDuration(v.duration || 0);
  };

  const onEnded = () => {
    sessionStorage.setItem("da_intro_seen", "1");
    setDone(true);
  };

  // Force autoplay — muted first to satisfy autoplay policies, then unmute on
  // first user interaction.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || done) return;
    const tryPlay = async () => {
      try {
        v.muted = true;
        await v.play();
      } catch {
        /* will retry on first interaction */
      }
    };
    tryPlay();
    const onFirst = () => {
      try {
        v.muted = false;
        v.play();
      } catch {
        /* ignore */
      }
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
    };
    window.addEventListener("pointerdown", onFirst, { once: true });
    window.addEventListener("keydown", onFirst, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
    };
  }, [done]);

  // Block ALL keyboard while intro plays (no skipping).
  const onKey = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (done) return <>{children}</>;

  const pct = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-[10000] grid place-items-center bg-black"
      onKeyDown={onKey}
      onContextMenu={(e) => e.preventDefault()}
    >
      <video
        ref={videoRef}
        src="/intro.mp4"
        className="h-full w-full object-contain"
        playsInline
        autoPlay
        muted
        onTimeUpdate={onTime}
        onEnded={onEnded}
        onContextMenu={(e) => e.preventDefault()}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        tabIndex={-1}
        style={{ pointerEvents: "none" }}
      />
      {/* Overlay to make sure no clicks reach the video element to bring up
          native controls (some browsers do this on long-press). */}
      <div className="pointer-events-none absolute inset-0" />

      {/* Brand + skip-warning */}
      <div className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white/90 ring-1 ring-white/20 backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Dental Academy Pro — intro playing
        </div>
      </div>

      {/* Progress bar at bottom — no seek, just visual */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-white/10">
        <div
          className="h-full bg-emerald-500 transition-[width] duration-200 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-xs text-white/60">
        Please wait — intro cannot be skipped
      </div>
    </div>
  );
}
