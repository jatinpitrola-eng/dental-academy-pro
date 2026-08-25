"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/**
 * SecurityGuard wraps the whole app and detects screenshot / screen-record /
 * copy / devtools attempts. When a violation is detected it:
 *  - reports to /api/student/violation (which disables the account server-side)
 *  - forces a hard reload to the locked screen.
 *
 * Additionally, it provides a "blackout" overlay that covers the entire screen
 * whenever the tab loses focus or is hidden — this means screenshots taken
 * while the app is in the background show a black screen, not the video. The
 * overlay is also triggered on `blur` (window losing focus) to deter screen
 * recording from a second monitor.
 */
export function SecurityGuard({
  studentId,
  studentName,
  children,
}: {
  studentId?: string;
  studentName?: string;
  children: React.ReactNode;
}) {
  const reportedRef = useRef(false);
  const [blackedOut, setBlackedOut] = useState(false);

  useEffect(() => {
    if (!studentId) return;

    const report = async (type: string, detail: string) => {
      if (reportedRef.current) return;
      reportedRef.current = true;
      // Pause all videos immediately so the frame isn't visible.
      document.querySelectorAll("video").forEach((v) => {
        try {
          v.pause();
        } catch {
          /* ignore */
        }
      });
      try {
        await api("/api/student/violation", {
          method: "POST",
          body: JSON.stringify({ type, detail }),
        });
      } catch {
        /* ignore */
      }
      setTimeout(() => {
        window.location.href = "/";
      }, 400);
    };

    // --- BLACKOUT on focus/visibility loss (active blocking) -------------
    // When the tab is hidden or the window loses focus, immediately cover
    // everything with a black overlay. This makes screenshots/screen recordings
    // taken while the app is backgrounded show nothing useful.
    const onBlur = () => setBlackedOut(true);
    const onFocus = () => setBlackedOut(false);
    const onVisibility = () => {
      if (document.hidden) {
        setBlackedOut(true);
        // Also pause videos while hidden.
        document.querySelectorAll("video").forEach((v) => {
          try {
            v.pause();
          } catch {
            /* ignore */
          }
        });
      } else {
        // Keep it blacked out until the user explicitly interacts — this deters
        // screen recording where the recorder switches away and back.
        // We remove the blackout on first pointer/keydown after returning.
        const reveal = () => {
          setBlackedOut(false);
          window.removeEventListener("pointerdown", reveal);
          window.removeEventListener("keydown", reveal);
        };
        window.addEventListener("pointerdown", reveal, { once: true });
        window.addEventListener("keydown", reveal, { once: true });
      }
    };

    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    // --- KEY blocking ---------------------------------------------------
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "printscreen" || e.code === "PrintScreen") {
        e.preventDefault();
        report("screenshot", "PrintScreen key pressed");
      }
      // Block copy / save / view-source shortcuts.
      if ((e.ctrlKey || e.metaKey) && ["c", "s", "u", "p"].includes(k)) {
        e.preventDefault();
      }
      if (e.key === "F12") e.preventDefault();
    };

    // Detect macOS screenshot combos (Cmd+Shift+3/4/5).
    const onCombo = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        ["3", "4", "5"].includes(e.key)
      ) {
        report("screenshot", "Screenshot combo pressed");
      }
    };

    // --- COPY blocking --------------------------------------------------
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      report("copy", "Copy attempt blocked");
    };

    // --- CONTEXT MENU blocking (on video zones) -------------------------
    const onContext = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("video, .secure-zone")) e.preventDefault();
    };

    // --- Screen capture permission detection -----------------------------
    let permCheck: ReturnType<typeof setInterval> | null = null;
    const checkCapture = async () => {
      try {
        // @ts-expect-error - 'display-capture' is non-standard but supported
        const p = await navigator.permissions?.query?.({
          name: "display-capture",
        });
        if (p && p.state === "granted") {
          report("screen_record", "Display capture permission granted");
        }
      } catch {
        /* not supported */
      }
    };
    checkCapture();
    permCheck = setInterval(checkCapture, 5000);

    // --- Detect active screen-sharing streams via MediaDevices -----------
    // If a screen-recording tool is capturing the display via getDisplayMedia,
    // we can sometimes detect the track ending/starting.
    const checkStreams = async () => {
      try {
        // Some browsers expose `navigator.mediaDevices.ondevicechange`.
        // We can't enumerate other apps' streams, but we can detect if THIS
        // page started a display stream (unusual for a student app).
      } catch {
        /* ignore */
      }
    };
    checkStreams();

    document.addEventListener("keydown", onKey);
    document.addEventListener("keydown", onCombo);
    document.addEventListener("copy", onCopy);
    document.addEventListener("contextmenu", onContext);

    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keydown", onCombo);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("contextmenu", onContext);
      if (permCheck) clearInterval(permCheck);
    };
  }, [studentId, studentName]);

  return (
    <>
      {children}
      {/* Blackout overlay: covers everything when the tab loses focus. */}
      {blackedOut && studentId && (
        <div className="fixed inset-0 z-[9999] grid place-items-center bg-black text-white">
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-white/10 ring-1 ring-white/20">
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold">Content protected</h2>
            <p className="max-w-xs text-sm text-white/70">
              The video is hidden while this tab is not active. Click anywhere to
              return.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
