"use client";

import { useEffect, useRef, useState } from "react";

/**
 * IntroGate — plays the academy intro video ONLY on the very first visit.
 * Subsequent visits: app renders immediately (localStorage flag).
 * Includes a "Skip Intro" button (top-right, >=44px tap target).
 */
export function IntroGate({ children }: { children: React.ReactNode }) {
  const [done, setDone] = useState(true); // Default: show app immediately
  const [showSkip, setShowSkip] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Check if intro was already seen (localStorage — persists across sessions).
    const seen = localStorage.getItem("da_intro_seen");
    if (seen === "1") {
      setDone(true);
      return;
    }

    // First visit — show intro.
    setDone(false);

    // Show skip button after 500ms.
    const skipTimer = setTimeout(() => setShowSkip(true), 500);

    // Listen for admin access event (5-click logo).
    const onAdminOpen = () => {
      setDone(true);
      localStorage.setItem("da_intro_seen", "1");
    };
    window.addEventListener("da-open-admin", onAdminOpen);

    // Autoplay.
    const v = videoRef.current;
    if (v) {
      const tryPlay = async () => {
        try {
          v.muted = true;
          await v.play();
        } catch {
          /* will retry on interaction */
        }
      };
      tryPlay();

      const onFirst = () => {
        try { v.muted = false; v.play(); } catch { /* ignore */ }
        window.removeEventListener("pointerdown", onFirst);
        window.removeEventListener("keydown", onFirst);
      };
      window.addEventListener("pointerdown", onFirst, { once: true });
      window.addEventListener("keydown", onFirst, { once: true });

      // Progress tracking.
      const onTime = () => {
        if (v.duration) setProgress((v.currentTime / v.duration) * 100);
      };
      v.addEventListener("timeupdate", onTime);

      return () => {
        clearTimeout(skipTimer);
        window.removeEventListener("da-open-admin", onAdminOpen);
        window.removeEventListener("pointerdown", onFirst);
        window.removeEventListener("keydown", onFirst);
        v.removeEventListener("timeupdate", onTime);
      };
    }

    return () => {
      clearTimeout(skipTimer);
      window.removeEventListener("da-open-admin", onAdminOpen);
    };
  }, []);

  const onEnded = () => {
    localStorage.setItem("da_intro_seen", "1");
    setDone(true);
  };

  const onSkip = () => {
    const v = videoRef.current;
    if (v) {
      try { v.pause(); v.src = ""; } catch { /* ignore */ }
    }
    localStorage.setItem("da_intro_seen", "1");
    setDone(true);
  };

  if (done) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[10000] grid place-items-center bg-black">
      {/* Skip button — top-right, >=44px tap target */}
      {showSkip && (
        <button
          onClick={onSkip}
          className="absolute right-4 top-4 z-[10001] flex h-11 items-center gap-2 rounded-full bg-white/15 px-5 text-sm font-medium text-white ring-1 ring-white/25 backdrop-blur-md transition hover:bg-white/25"
          aria-label="Skip intro"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
          Skip Intro
        </button>
      )}

      <video
        ref={videoRef}
        src="/intro.mp4"
        poster="/intro-poster.jpg"
        className="h-full w-full object-contain"
        playsInline
        autoPlay
        muted
        preload="auto"
        onEnded={onEnded}
        onContextMenu={(e) => e.preventDefault()}
        tabIndex={-1}
        style={{ pointerEvents: "none" }}
      />

      {/* Progress bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-white/10">
        <div
          className="h-full bg-emerald-500 transition-[width] duration-200 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
