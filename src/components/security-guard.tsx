"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/**
 * SecurityGuard — SIMPLE, NO FALSE POSITIVES.
 *
 * ONLY triggers on actual screenshot key presses:
 * - PrintScreen / Alt+PrintScreen
 * - Cmd+Shift+3/4/5/6 (macOS)
 * - F12 / Ctrl+Shift+I/J/C (DevTools)
 *
 * Does NOT trigger on:
 * - Mic/sound/notification permission dialogs
 * - Alt+Tab, tab switching, window blur
 * - TTS playback, AI chat
 * - Any normal browser activity
 *
 * Why no blur detection: Win+Shift+S causes blur, but so do 100 other
 * things (Alt+Tab, clicking another window, notification popup, etc).
 * Blur detection causes too many false account disables.
 * Instead: we only block the actual keyboard shortcuts that browsers
 * can intercept.
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

    // KEYBOARD ONLY — screenshot + devtools shortcuts
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();

      // PrintScreen
      if (k === "printscreen" || e.code === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault(); e.stopPropagation();
        report("screenshot", "PrintScreen key pressed");
        return;
      }
      // macOS Cmd+Shift+3/4/5/6
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && ["3", "4", "5", "6"].includes(e.key)) {
        e.preventDefault(); e.stopPropagation();
        report("screenshot", `macOS Cmd+Shift+${e.key} screenshot detected`);
        return;
      }
      // DevTools
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
      // Block save/print/source
      if ((e.ctrlKey || e.metaKey) && ["u", "s", "p"].includes(k)) {
        e.preventDefault(); e.stopPropagation();
      }
      // Block copy outside inputs
      if ((e.ctrlKey || e.metaKey) && k === "c") {
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
        }
      }
    };

    // COPY/CONTEXT MENU blocking
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

    // Register listeners
    document.addEventListener("keydown", onKey, { capture: true });
    document.addEventListener("copy", onCopy);
    document.addEventListener("contextmenu", onContext);

    return () => {
      document.removeEventListener("keydown", onKey, { capture: true } as EventListenerOptions);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("contextmenu", onContext);
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
