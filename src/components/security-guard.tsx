"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/**
 * SecurityGuard — screenshot & screen recording protection.
 *
 * IMPORTANT: Does NOT trigger on mic/sound/notification permission dialogs.
 * Only triggers on actual screenshot/screen-record attempts.
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
  const isStudent = !!studentId;
  // Flag to suppress false positives during permission requests.
  const suppressRef = useRef(false);

  useEffect(() => {
    if (!studentId) return;

    const report = async (type: string, detail: string) => {
      if (reportedRef.current || suppressRef.current) return;
      reportedRef.current = true;
      setViolationMsg(`${type}: ${detail}`);
      setBlackedOut(true);
      pauseAllVideos();
      try {
        await api("/api/student/violation", {
          method: "POST",
          body: JSON.stringify({ type, detail }),
        });
      } catch { /* ignore */ }
      setTimeout(() => { window.location.href = "/"; }, 2000);
    };

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

    async function checkClipboardForImage(): Promise<boolean> {
      try {
        if (!navigator.clipboard || !navigator.clipboard.read) return false;
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.some((t) => t.startsWith("image/"))) return true;
        }
      } catch { /* ignore */ }
      return false;
    }

    // ==========================================
    // WINDOW BLUR — catches Win+Shift+S, app switch on mobile
    // BUT: suppress when permission dialog is open (mic, notification, etc.)
    // ==========================================
    const onBlur = () => {
      if (!isStudent || suppressRef.current) return;
      setBlackedOut(true);
      pauseAllVideos();
      const violTimeout = setTimeout(() => {
        if (!suppressRef.current) {
          report("screenshot", "Window focus lost — possible screenshot/screen recording");
        }
      }, 500);
      (window as unknown as { __violTimeout?: ReturnType<typeof setTimeout> }).__violTimeout = violTimeout;
    };

    const onFocus = () => {
      const w = window as unknown as { __violTimeout?: ReturnType<typeof setTimeout> };
      if (w.__violTimeout) { clearTimeout(w.__violTimeout); w.__violTimeout = undefined; }
      if (suppressRef.current) { setBlackedOut(false); return; }
      checkClipboardForImage().then((hasImage) => {
        if (hasImage && !reportedRef.current) {
          report("screenshot", "Image detected in clipboard after focus return");
        } else if (!reportedRef.current) {
          setBlackedOut(false);
        }
      });
    };

    // ==========================================
    // VISIBILITY CHANGE — catches mobile app backgrounding
    // ==========================================
    const onVisibility = () => {
      if (document.hidden) {
        if (!isStudent || suppressRef.current) return;
        setBlackedOut(true);
        pauseAllVideos();
        const violTimeout = setTimeout(() => {
          if (!suppressRef.current) {
            report("screen_record", "Tab/app hidden — possible screenshot or screen recording");
          }
        }, 500);
        (window as unknown as { __visViolTimeout?: ReturnType<typeof setTimeout> }).__visViolTimeout = violTimeout;
      } else {
        const w = window as unknown as { __visViolTimeout?: ReturnType<typeof setTimeout> };
        if (w.__visViolTimeout) { clearTimeout(w.__visViolTimeout); w.__visViolTimeout = undefined; }
        if (suppressRef.current) { setBlackedOut(false); return; }
        checkClipboardForImage().then((hasImage) => {
          if (hasImage && !reportedRef.current) {
            report("screenshot", "Image detected in clipboard after tab return");
          } else if (!reportedRef.current) {
            setBlackedOut(false);
          }
        });
      }
    };

    // ==========================================
    // KEYBOARD SHORTCUTS — screenshot + devtools
    // ==========================================
    const onKey = (e: KeyboardEvent) => {
      if (suppressRef.current) return;
      const k = e.key.toLowerCase();

      // Win+Shift+S (Snipping Tool)
      if (e.shiftKey && (e.metaKey || e.ctrlKey) && k === "s") {
        e.preventDefault(); e.stopPropagation();
        setBlackedOut(true); pauseAllVideos();
        report("screenshot", "Win+Shift+S (Snipping Tool) detected");
        return;
      }
      // PrintScreen
      if (k === "printscreen" || e.code === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault(); e.stopPropagation();
        setBlackedOut(true); pauseAllVideos();
        report("screenshot", "PrintScreen key pressed");
        return;
      }
      // macOS Cmd+Shift+3/4/5/6
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && ["3", "4", "5", "6"].includes(e.key)) {
        e.preventDefault(); e.stopPropagation();
        setBlackedOut(true); pauseAllVideos();
        report("screenshot", `macOS screenshot shortcut Cmd+Shift+${e.key}`);
        return;
      }
      // DevTools
      if (e.key === "F12") {
        e.preventDefault(); e.stopPropagation();
        setBlackedOut(true);
        report("devtools", "F12 (DevTools) pressed");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(k)) {
        e.preventDefault(); e.stopPropagation();
        setBlackedOut(true);
        report("devtools", `DevTools shortcut Ctrl+Shift+${k.toUpperCase()}`);
        return;
      }
      // Block copy/save/print/source
      if ((e.ctrlKey || e.metaKey) && ["u", "s", "p", "c"].includes(k)) {
        e.preventDefault(); e.stopPropagation();
        return;
      }
    };

    // ==========================================
    // COPY/CUT/CONTEXT MENU blocking
    // ==========================================
    const onCopy = (e: ClipboardEvent) => e.preventDefault();
    const onCut = (e: ClipboardEvent) => e.preventDefault();
    const onContext = (e: MouseEvent) => e.preventDefault();
    const onDragStart = (e: DragEvent) => e.preventDefault();

    // ==========================================
    // DISPLAY CAPTURE PERMISSION detection (screen recording)
    // NOTE: mic/notification permissions are NOT checked here.
    // ==========================================
    let permCheck: ReturnType<typeof setInterval> | null = null;
    const checkCapture = async () => {
      if (suppressRef.current) return;
      try {
        // @ts-expect-error - 'display-capture' is non-standard
        const p = await navigator.permissions?.query?.({ name: "display-capture" });
        if (p && p.state === "granted") {
          report("screen_record", "Display capture permission granted — screen recording active");
        }
      } catch { /* not supported */ }
    };
    checkCapture();
    permCheck = setInterval(checkCapture, 5000);

    // ==========================================
    // DEVTOOLS detection (window size delta)
    // ==========================================
    let devtoolsOpen = false;
    const checkDevtools = () => {
      if (suppressRef.current) return;
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

    // ==========================================
    // PERIODIC clipboard check
    // ==========================================
    const clipboardInterval = setInterval(async () => {
      if (reportedRef.current || suppressRef.current) return;
      const hasImage = await checkClipboardForImage();
      if (hasImage) {
        report("screenshot", "Image detected in clipboard (periodic check)");
      }
    }, 3000);

    // ==========================================
    // GLOBAL: expose suppress function for AI panel (mic permission)
    // ==========================================
    (window as unknown as { __suppressSecurity?: (v: boolean) => void }).__suppressSecurity = (v: boolean) => {
      suppressRef.current = v;
      if (!v) { setBlackedOut(false); }
    };

    // Register all listeners.
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("keydown", onKey, { capture: true });
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("dragstart", onDragStart);

    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("keydown", onKey, { capture: true } as EventListenerOptions);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("dragstart", onDragStart);
      if (permCheck) clearInterval(permCheck);
      clearInterval(devtoolsInterval);
      clearInterval(clipboardInterval);
    };
  }, [studentId, studentName, isStudent]);

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
            <p className="max-w-xs text-sm text-white/70">{violationMsg || "A screenshot or screen recording attempt was detected."}</p>
            <p className="max-w-xs text-sm font-bold text-red-400">
              Your account has been DISABLED. Contact the academy owner to reactivate.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
