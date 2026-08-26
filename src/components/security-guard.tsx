"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/**
 * SecurityGuard wraps the whole app and:
 *  - blocks all dev-tools / right-click / copy / save / view-source shortcuts
 *  - detects screenshot + screen-record attempts (PrintScreen, Win+Shift+S,
 *    Cmd+Shift+3/4/5, screen capture permission, clipboard image)
 *  - on ANY focus loss while a video is playing: IMMEDIATE blackout + report
 *    + account disable
 *  - on tab blur/hide: full-screen blackout overlay
 *
 * The key insight: Win+Shift+S (Windows Snipping Tool) causes the browser
 * window to lose focus. We detect this blur event and immediately:
 * 1. Show a full-screen black overlay
 * 2. Pause all videos
 * 3. Report the violation to the server (which disables the account)
 * 4. The account stays disabled until the admin reactivates it
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
  // Track if we're in a "video watching" context (student is logged in).
  const isStudent = !!studentId;

  useEffect(() => {
    if (!studentId) return;

    const report = async (type: string, detail: string) => {
      if (reportedRef.current) return;
      reportedRef.current = true;
      // Pause all videos immediately.
      document.querySelectorAll("video").forEach((v) => {
        try { v.pause(); } catch { /* ignore */ }
      });
      // Pause YouTube iframes.
      document.querySelectorAll("iframe").forEach((f) => {
        try {
          f.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "pauseVideo" }),
            "*",
          );
        } catch { /* ignore */ }
      });
      // Report to server — this disables the account.
      try {
        await api("/api/student/violation", {
          method: "POST",
          body: JSON.stringify({ type, detail }),
        });
      } catch { /* ignore */ }
      // After reporting, reload to landing (account is now disabled).
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    };

    // --- IMMEDIATE BLACKOUT on any window blur (Win+Shift+S, Alt+Tab, etc) ---
    // When the student is watching a video and the window loses focus, we
    // immediately black out + report. This catches Win+Shift+S because the
    // Snipping Tool overlay steals focus from the browser.
    const onBlur = () => {
      if (!isStudent) return;
      // Immediately show black overlay.
      setBlackedOut(true);
      // Pause all videos.
      document.querySelectorAll("video").forEach((v) => {
        try { v.pause(); } catch { /* ignore */ }
      });
      document.querySelectorAll("iframe").forEach((f) => {
        try {
          f.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "pauseVideo" }),
            "*",
          );
        } catch { /* ignore */ }
      });
      // Report the violation + disable account. We use a short delay to
      // distinguish between a quick focus flicker and an actual screenshot
      // tool. If the window regains focus within 500ms, it was likely just
      // a UI flicker, not a screenshot.
      const violTimeout = setTimeout(() => {
        report("screenshot", "Window focus lost — possible screenshot/screen recording attempt");
      }, 500);

      // Store the timeout so onFocus can cancel it.
      (window as unknown as { __violTimeout?: ReturnType<typeof setTimeout> }).__violTimeout = violTimeout;
    };

    const onFocus = () => {
      // Cancel the pending violation report (was a quick focus flicker).
      const w = window as unknown as { __violTimeout?: ReturnType<typeof setTimeout> };
      if (w.__violTimeout) {
        clearTimeout(w.__violTimeout);
        w.__violTimeout = undefined;
      }
      // Check clipboard for image data — if present, it was a screenshot.
      checkClipboardForImage().then((hasImage) => {
        if (hasImage && !reportedRef.current) {
          report("screenshot", "Image detected in clipboard after focus return");
        } else {
          // Just a focus flicker — remove blackout.
          setBlackedOut(false);
        }
      });
    };

    const onVisibility = () => {
      if (document.hidden) {
        setBlackedOut(true);
        document.querySelectorAll("video").forEach((v) => {
          try { v.pause(); } catch { /* ignore */ }
        });
        document.querySelectorAll("iframe").forEach((f) => {
          try {
            f.contentWindow?.postMessage(
              JSON.stringify({ event: "command", func: "pauseVideo" }),
              "*",
            );
          } catch { /* ignore */ }
        });
      } else {
        // Tab is visible again — check clipboard.
        checkClipboardForImage().then((hasImage) => {
          if (hasImage && !reportedRef.current) {
            report("screenshot", "Image detected in clipboard after tab return");
          } else {
            setBlackedOut(false);
          }
        });
      }
    };

    // --- Check clipboard for image data (detects screenshots) ---
    async function checkClipboardForImage(): Promise<boolean> {
      try {
        if (!navigator.clipboard || !navigator.clipboard.read) return false;
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.some((t) => t.startsWith("image/"))) {
            return true;
          }
        }
      } catch {
        // Clipboard API not available or permission denied.
      }
      return false;
    }

    // --- KEY blocking ---
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();

      // F12 devtools
      if (e.key === "F12") {
        e.preventDefault();
        e.stopPropagation();
        setBlackedOut(true);
        report("devtools", "F12 pressed");
        return;
      }
      // PrintScreen
      if (k === "printscreen" || e.code === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        setBlackedOut(true);
        report("screenshot", "PrintScreen key pressed");
        return;
      }
      // Ctrl/Cmd + Shift + I/J/C (devtools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(k)) {
        e.preventDefault();
        e.stopPropagation();
        setBlackedOut(true);
        report("devtools", `Devtools shortcut ${k.toUpperCase()} pressed`);
        return;
      }
      // Ctrl/Cmd + Shift + 3/4/5 (macOS screenshots)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && ["3", "4", "5"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        setBlackedOut(true);
        report("screenshot", `Screenshot combo Cmd+Shift+${e.key} pressed`);
        return;
      }
      // Win+Shift+S — Windows can't be caught via keydown, but we detect
      // via the blur event above. This is a fallback for some browsers.
      if (e.shiftKey && (e.metaKey || e.ctrlKey) && k === "s") {
        e.preventDefault();
        e.stopPropagation();
        setBlackedOut(true);
        report("screenshot", "Win+Shift+S screenshot shortcut pressed");
        return;
      }
      // Ctrl/Cmd + U (view source)
      if ((e.ctrlKey || e.metaKey) && k === "u") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Ctrl/Cmd + S (save)
      if ((e.ctrlKey || e.metaKey) && k === "s") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Ctrl/Cmd + P (print)
      if ((e.ctrlKey || e.metaKey) && k === "p") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Ctrl/Cmd + C (copy)
      if ((e.ctrlKey || e.metaKey) && k === "c") {
        e.preventDefault();
        return;
      }
    };

    // --- COPY / CUT blocking ---
    const onCopy = (e: ClipboardEvent) => e.preventDefault();
    const onCut = (e: ClipboardEvent) => e.preventDefault();

    // --- CONTEXT MENU blocking ---
    const onContext = (e: MouseEvent) => e.preventDefault();

    // --- Screen capture permission detection ---
    let permCheck: ReturnType<typeof setInterval> | null = null;
    const checkCapture = async () => {
      try {
        // @ts-expect-error - 'display-capture' is non-standard
        const p = await navigator.permissions?.query?.({ name: "display-capture" });
        if (p && p.state === "granted") {
          report("screen_record", "Display capture permission granted");
        }
      } catch { /* not supported */ }
    };
    checkCapture();
    permCheck = setInterval(checkCapture, 5000);

    // --- Anti-debug ---
    let devtoolsOpen = false;
    const checkDevtools = () => {
      const threshold = 200;
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      const isOpen = widthDiff > threshold || heightDiff > threshold;
      if (isOpen && !devtoolsOpen) {
        devtoolsOpen = true;
        report("devtools", "Developer tools detected open");
      }
    };
    const devtoolsInterval = setInterval(checkDevtools, 2000);

    // Register all listeners.
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("keydown", onKey, { capture: true });
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("contextmenu", onContext);

    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("keydown", onKey, { capture: true } as EventListenerOptions);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("contextmenu", onContext);
      if (permCheck) clearInterval(permCheck);
      clearInterval(devtoolsInterval);
    };
  }, [studentId, studentName, isStudent]);

  return (
    <>
      {children}
      {/* Blackout overlay — covers everything when screenshot detected. */}
      {blackedOut && studentId && (
        <div className="fixed inset-0 z-[9999] grid place-items-center bg-black text-white">
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-red-500/20 ring-1 ring-red-500/40">
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8 text-red-500"
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
            <h2 className="text-lg font-semibold">⚠️ Screenshot Detected</h2>
            <p className="max-w-xs text-sm text-white/70">
              Your account has been <span className="font-bold text-red-400">disabled</span> due to a
              screenshot or screen recording attempt. Contact the academy owner
              to reactivate your account.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
