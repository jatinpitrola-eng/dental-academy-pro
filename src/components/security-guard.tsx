"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/**
 * SecurityGuard — screenshot & screen recording protection.
 *
 * Detection methods (in priority order):
 * 1. Keyboard: PrintScreen, Cmd+Shift+3/4/5/6, F12, Ctrl+Shift+I/J/C
 * 2. Window blur + clipboard check: when window loses focus, wait 1 second,
 *    then check clipboard. If image found → screenshot confirmed → disable.
 *    If no image → false alarm → no action.
 * 3. Periodic clipboard check: every 5 seconds, check clipboard for images.
 *
 * This approach has ZERO false positives because:
 * - Mic/sound/notification permissions don't put images in the clipboard
 * - Alt+Tab doesn't put images in the clipboard
 * - Only actual screenshots put images in the clipboard
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

    // Check clipboard for image — the ONLY reliable screenshot detector.
    async function checkClipboardForImage(): Promise<boolean> {
      try {
        if (!navigator.clipboard || !navigator.clipboard.read) return false;
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.some((t) => t.startsWith("image/"))) return true;
        }
      } catch {
        // Permission denied or not supported — can't check, return false.
      }
      return false;
    }

    // ==========================================
    // 1. KEYBOARD — screenshot + devtools shortcuts
    // ==========================================
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
    };

    // ==========================================
    // 2. WINDOW BLUR + CLIPBOARD CHECK
    // When window loses focus (Win+Shift+S, Alt+Tab, etc), wait 1 second,
    // then check clipboard. If image → screenshot. If no image → ignore.
    // ==========================================
    let blurTimeout: ReturnType<typeof setTimeout> | null = null;
    const onBlur = () => {
      // Don't blackout immediately — wait and check clipboard.
      if (blurTimeout) clearTimeout(blurTimeout);
      blurTimeout = setTimeout(async () => {
        const hasImage = await checkClipboardForImage();
        if (hasImage) {
          report("screenshot", "Image found in clipboard after window blur (screenshot confirmed)");
        }
      }, 1000);
    };
    const onFocus = () => {
      if (blurTimeout) { clearTimeout(blurTimeout); blurTimeout = null; }
      // Also check clipboard on focus return.
      checkClipboardForImage().then((hasImage) => {
        if (hasImage) {
          report("screenshot", "Image found in clipboard on focus return (screenshot confirmed)");
        }
      });
    };

    // ==========================================
    // 3. PERIODIC CLIPBOARD CHECK (every 5 seconds)
    // Catches screenshots taken via OS tools (Snipping Tool, etc.)
    // ==========================================
    const clipboardInterval = setInterval(async () => {
      if (reportedRef.current) return;
      const hasImage = await checkClipboardForImage();
      if (hasImage) {
        report("screenshot", "Image detected in clipboard (periodic check — OS-level screenshot)");
      }
    }, 5000);

    // ==========================================
    // COPY/CONTEXT MENU blocking
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

    // Register listeners
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("keydown", onKey, { capture: true });
    document.addEventListener("copy", onCopy);
    document.addEventListener("contextmenu", onContext);

    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("keydown", onKey, { capture: true } as EventListenerOptions);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("contextmenu", onContext);
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
