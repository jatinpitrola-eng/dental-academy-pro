"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/**
 * SecurityGuard — AGGRESSIVE screenshot & screen recording protection.
 *
 * Detection methods:
 * 1. Keyboard: PrintScreen, Cmd+Shift+3/4/5/6, Win+Shift+S, F12, Ctrl+Shift+I/J/C
 * 2. Window blur: when window loses focus, IMMEDIATELY blackout + report.
 *    This catches Win+Shift+S, Snipping Tool, and any screen recording tool
 *    that steals focus. We do NOT wait for clipboard — we report immediately.
 *    False positives (Alt+Tab, notification popups) are acceptable — the
 *    student can ask the admin to reactivate.
 * 3. Periodic clipboard check: every 3 seconds.
 *
 * The key insight: we prioritize BLOCKING over avoiding false positives.
 * The owner specifically wants screenshots to be blocked at all costs.
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
      // Pause all videos immediately.
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
      // Report to server → disables account.
      try {
        await api("/api/student/violation", {
          method: "POST",
          body: JSON.stringify({ type, detail }),
        });
      } catch { /* ignore */ }
      // Reload after showing message.
      setTimeout(() => { window.location.href = "/"; }, 2000);
    };

    // Pause all videos immediately.
    const pauseAllVideos = () => {
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
    };

    // ==========================================
    // 1. KEYBOARD — all screenshot + devtools shortcuts
    // ==========================================
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();

      // PrintScreen
      if (k === "printscreen" || e.code === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault(); e.stopPropagation();
        report("screenshot", "PrintScreen key pressed");
        return;
      }
      // Win+Shift+S (Snipping Tool) — caught via keydown if browser allows
      if (e.shiftKey && (e.metaKey || e.ctrlKey) && k === "s") {
        e.preventDefault(); e.stopPropagation();
        report("screenshot", "Win+Shift+S (Snipping Tool) detected");
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
    };

    // ==========================================
    // 2. WINDOW BLUR — IMMEDIATE blackout + report
    // This is the MOST IMPORTANT detector. Win+Shift+S, Snipping Tool,
    // and screen recording apps ALL cause the browser window to lose focus.
    // We blackout immediately + report after a short delay.
    // ==========================================
    let blurTimeout: ReturnType<typeof setTimeout> | null = null;
    const onBlur = () => {
      // Immediately blackout + pause videos.
      setBlackedOut(true);
      pauseAllVideos();
      // Report after 500ms — if focus returns quickly (notification popup),
      // we cancel the report. If focus stays away for >500ms, it's likely
      // a real screenshot tool.
      if (blurTimeout) clearTimeout(blurTimeout);
      blurTimeout = setTimeout(() => {
        report("screenshot", "Window focus lost — screenshot or screen recording detected (Win+Shift+S, Snipping Tool, or screen recorder)");
      }, 500);
    };

    const onFocus = () => {
      // Cancel pending report if focus returned quickly.
      if (blurTimeout) {
        clearTimeout(blurTimeout);
        blurTimeout = null;
      }
      // Don't remove blackout — let the report complete if it was triggered.
      // Only remove if no report was made.
      if (!reportedRef.current) {
        setBlackedOut(false);
      }
    };

    // ==========================================
    // 3. VISIBILITY CHANGE — catches mobile backgrounding
    // ==========================================
    const onVisibility = () => {
      if (document.hidden) {
        setBlackedOut(true);
        pauseAllVideos();
      }
    };

    // ==========================================
    // 4. PERIODIC CLIPBOARD CHECK (every 3 seconds)
    // ==========================================
    async function checkClipboardForImage(): Promise<boolean> {
      try {
        if (!navigator.clipboard || !navigator.clipboard.read) return false;
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.some((t) => t.startsWith("image/"))) return true;
        }
      } catch {
        // Permission denied or not supported.
      }
      return false;
    }

    const clipboardInterval = setInterval(async () => {
      if (reportedRef.current) return;
      const hasImage = await checkClipboardForImage();
      if (hasImage) {
        report("screenshot", "Image detected in clipboard (screenshot confirmed)");
      }
    }, 3000);

    // ==========================================
    // 5. RIGHT-CLICK + COPY blocking (everywhere, not just video)
    // ==========================================
    const onContext = (e: MouseEvent) => {
      e.preventDefault();
    };
    const onCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
        e.preventDefault();
      }
    };

    // Register ALL listeners.
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("keydown", onKey, { capture: true });
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("copy", onCopy);

    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("keydown", onKey, { capture: true } as EventListenerOptions);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("copy", onCopy);
      clearInterval(clipboardInterval);
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
            <h2 className="text-lg font-semibold">⚠️ Screenshot / Screen Recording Detected</h2>
            <p className="max-w-xs text-sm text-white/70">{violationMsg || "Window focus was lost — possible screenshot or screen recording."}</p>
            <p className="max-w-xs text-sm font-bold text-red-400">
              Your account has been DISABLED. Contact the academy owner to reactivate.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
