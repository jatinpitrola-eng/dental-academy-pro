"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/**
 * SecurityGuard — SIMPLE + RELIABLE screenshot protection.
 *
 * Only triggers on ACTUAL screenshot key presses:
 * - Win+Shift+S (Snipping Tool)
 * - PrintScreen / Alt+PrintScreen
 * - Cmd+Shift+3/4/5/6 (macOS)
 *
 * Does NOT trigger on:
 * - Mic permission dialog
 * - Notification permission dialog
 * - Sound/TTS playback
 * - Alt+Tab (regular app switching)
 * - Tab switching
 * - Window resize
 * - Periodic clipboard checks (removed — caused false positives)
 *
 * On trigger: black screen + pause videos + report → account disabled.
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
  const [violationMsg, setViolationMsg] = useState("");

  useEffect(() => {
    if (!studentId) return;

    const report = async (type: string, detail: string) => {
      if (reportedRef.current) return;
      reportedRef.current = true;
      setViolationMsg(`${type}: ${detail}`);
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
      try {
        await api("/api/student/violation", {
          method: "POST",
          body: JSON.stringify({ type, detail }),
        });
      } catch { /* ignore */ }
      setTimeout(() => { window.location.href = "/"; }, 2000);
    };

    // ==========================================
    // KEYBOARD — only screenshot + devtools shortcuts
    // This is the ONLY detection method. No blur, no clipboard,
    // no visibility change — those cause false positives.
    // ==========================================
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();

      // --- WINDOWS screenshots ---
      // Win+Shift+S (Snipping Tool)
      if (e.shiftKey && (e.metaKey || e.ctrlKey) && k === "s") {
        e.preventDefault(); e.stopPropagation();
        report("screenshot", "Win+Shift+S (Snipping Tool) detected");
        return;
      }
      // PrintScreen / Alt+PrintScreen
      if (k === "printscreen" || e.code === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault(); e.stopPropagation();
        report("screenshot", "PrintScreen key pressed");
        return;
      }

      // --- MAC screenshots ---
      // Cmd+Shift+3/4/5/6
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && ["3", "4", "5", "6"].includes(e.key)) {
        e.preventDefault(); e.stopPropagation();
        report("screenshot", `macOS Cmd+Shift+${e.key} screenshot detected`);
        return;
      }

      // --- DEVTOOLS ---
      if (e.key === "F12") {
        e.preventDefault(); e.stopPropagation();
        report("devtools", "F12 (DevTools) pressed");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(k)) {
        e.preventDefault(); e.stopPropagation();
        report("devtools", `DevTools shortcut Ctrl+Shift+${k.toUpperCase()}`);
        return;
      }

      // --- BLOCK copy/save/print/source (no report, just block) ---
      if ((e.ctrlKey || e.metaKey) && ["u", "s", "p"].includes(k)) {
        e.preventDefault(); e.stopPropagation();
        return;
      }
      // Block copy only on video pages (not in chat/notes inputs)
      if ((e.ctrlKey || e.metaKey) && k === "c") {
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
        }
        return;
      }
    };

    // ==========================================
    // COPY/CUT/CONTEXT MENU blocking (no report, just block)
    // ==========================================
    const onCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
        e.preventDefault();
      }
    };
    const onContext = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("video, .secure-zone, iframe")) {
        e.preventDefault();
      }
    };

    // ==========================================
    // DISPLAY CAPTURE PERMISSION detection
    // Only checks 'display-capture' (NOT mic, NOT notification)
    // ==========================================
    let permCheck: ReturnType<typeof setInterval> | null = null;
    const checkCapture = async () => {
      try {
        // @ts-expect-error - 'display-capture' is non-standard
        const p = await navigator.permissions?.query?.({ name: "display-capture" });
        if (p && p.state === "granted") {
          report("screen_record", "Display capture permission granted");
        }
      } catch { /* not supported — ignore */ }
    };
    // Only check once on mount, not periodically.
    checkCapture();

    // Register listeners.
    document.addEventListener("keydown", onKey, { capture: true });
    document.addEventListener("copy", onCopy);
    document.addEventListener("contextmenu", onContext);

    return () => {
      document.removeEventListener("keydown", onKey, { capture: true } as EventListenerOptions);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("contextmenu", onContext);
      if (permCheck) clearInterval(permCheck);
    };
  }, [studentId, studentName]);

  return (
    <>
      {children}
      {blackedOut && studentId && (
        <div className="fixed inset-0 z-[9999] grid place-items-center bg-black text-white">
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-red-500/20 ring-1 ring-red-500/40">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold">⚠️ Screenshot Detected</h2>
            <p className="max-w-xs text-sm text-white/70">{violationMsg}</p>
            <p className="max-w-xs text-sm font-bold text-red-400">
              Your account has been DISABLED. Contact the academy owner to reactivate.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
