"use client";

import { useEffect, useRef, useState } from "react";

/**
 * IntroGate — plays the academy intro video every time the PWA is opened.
 * The intro CANNOT be skipped.
 *
 * This component is intentionally independent of the Zustand store to avoid
 * hydration mismatches. It uses only local React state.
 *
 * To open the admin portal while the intro is playing, the user clicks the
 * logo 5 times — but the logo is inside the children which is hidden during
 * the intro. So we also listen for a custom window event "da-open-admin"
 * that the Brand component can dispatch to dismiss the intro.
 */
export function IntroGate({ children }: { children: React.ReactNode }) {
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Listen for the admin-portal-open event to dismiss the intro.
  useEffect(() => {
    const onAdminOpen = () => setDone(true);
    window.addEventListener("da-open-admin", onAdminOpen);
    return () => window.removeEventListener("da-open-admin", onAdminOpen);
  }, []);

  const onTime = () => {
    const v = videoRef.current;
    if (!v) return;
    setProgress(v.currentTime);
    setDuration(v.duration || 0);
  };

  const onEnded = () => {
    setDone(true);
  };

  // Force autoplay — muted first to satisfy autoplay policies, then try to
  // unmute on first user interaction.
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
      {/* Overlay to prevent clicks reaching the video element. */}
      <div className="pointer-events-none absolute inset-0" />

      {/* Brand + skip-warning */}
      <div className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white/90 ring-1 ring-white/20 backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Dental Academy Pro — intro playing
        </div>
      </div>

      {/* Progress bar at bottom */}
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
