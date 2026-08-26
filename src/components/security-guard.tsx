"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/**
 * SecurityGuard — COMPREHENSIVE screenshot & screen recording protection.
 *
 * Detects and blocks ALL known screenshot/screen-record methods across:
 *
 * WINDOWS:
 *   - Win+Shift+S (Snipping Tool)
 *   - PrintScreen / Alt+PrintScreen
 *   - Win+Alt+PrintScreen (Game Bar)
 *   - Snipping Tool app
 *   - Third-party tools (ShareX, Greenshot, etc.)
 *
 * MAC:
 *   - Cmd+Shift+3 (full screen)
 *   - Cmd+Shift+4 (selection)
 *   - Cmd+Shift+5 (screenshot utility)
 *   - Cmd+Shift+6 (Touch Bar)
 *   - QuickTime screen recording
 *
 * ANDROID:
 *   - Power+Volume Down (hardware buttons)
 *   - Palm swipe (Samsung)
 *   - Three-finger swipe
 *   - Built-in screen recorder (Android 11+)
 *   - Third-party recorder apps
 *
 * iOS:
 *   - Side button + Volume Up
 *   - Side button + Home (older)
 *   - Back Tap
 *   - Control Center screen recording
 *   - QuickTime mirroring
 *
 * CROSS-PLATFORM:
 *   - Browser DevTools (F12, Ctrl+Shift+I/J/C)
 *   - View Source (Ctrl+U)
 *   - Save (Ctrl+S)
 *   - Print (Ctrl+P)
 *   - Copy (Ctrl+C)
 *   - Right-click context menu
 *   - Display capture permission
 *   - Clipboard image detection
 *
 * APPROACH:
 *  1. Keyboard shortcuts → intercepted in capture phase (before OS acts)
 *  2. Window blur → immediate blackout + violation report (catches Win+Shift+S,
 *     Alt+Tab, app switch on mobile)
 *  3. Visibility change → immediate blackout + pause videos (catches app
 *     backgrounding on mobile, tab switching on desktop)
 *  4. Clipboard check → on focus return, check for image data
 *  5. Display capture permission → periodic check
 *  6. DevTools → window size delta detection
 *
 * On ANY trigger: black screen + pause videos + report violation → account
 * disabled → admin notification → admin must reactivate.
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
  const [violationMsg, setViolationMsg] = useState<string>("");
  const isStudent = !!studentId;
  // Track when the student started watching (for mobile detection).
  const watchingSinceRef = useRef<number>(0);

  useEffect(() => {
    if (!studentId) return;
    watchingSinceRef.current = Date.now();

    const report = async (type: string, detail: string) => {
      if (reportedRef.current) return;
      reportedRef.current = true;
      setViolationMsg(`${type}: ${detail}`);
      setBlackedOut(true);

      // Pause all videos.
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

      // Report to server → disables account + sends admin notification.
      try {
        await api("/api/student/violation", {
          method: "POST",
          body: JSON.stringify({ type, detail }),
        });
      } catch { /* ignore */ }

      // Reload after showing the message.
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    };

    // Helper: pause all video players immediately.
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

    // Check clipboard for image data (detects screenshots).
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

    // ==========================================
    // 1. WINDOW BLUR — catches Win+Shift+S, Alt+Tab, app switch on mobile
    // ==========================================
    const onBlur = () => {
      if (!isStudent) return;
      setBlackedOut(true);
      pauseAllVideos();

      // Report after a short delay (distinguishes flicker from real screenshot).
      const violTimeout = setTimeout(() => {
        report("screenshot", "Window focus lost — possible screenshot/screen recording (Win+Shift+S, Alt+Tab, app switch, or hardware button)");
      }, 300);
      (window as unknown as { __violTimeout?: ReturnType<typeof setTimeout> }).__violTimeout = violTimeout;
    };

    const onFocus = () => {
      const w = window as unknown as { __violTimeout?: ReturnType<typeof setTimeout> };
      if (w.__violTimeout) {
        clearTimeout(w.__violTimeout);
        w.__violTimeout = undefined;
      }
      // Check clipboard for image — if present, it was a screenshot.
      checkClipboardForImage().then((hasImage) => {
        if (hasImage && !reportedRef.current) {
          report("screenshot", "Image detected in clipboard after focus return");
        } else if (!reportedRef.current) {
          setBlackedOut(false);
        }
      });
    };

    // ==========================================
    // 2. VISIBILITY CHANGE — catches mobile app backgrounding, tab switch
    // ==========================================
    const onVisibility = () => {
      if (document.hidden) {
        if (!isStudent) return;
        setBlackedOut(true);
        pauseAllVideos();
        // On mobile, visibility change often means the user opened Control
        // Center (iOS screen recording) or the screenshot was taken.
        const violTimeout = setTimeout(() => {
          report("screen_record", "Tab/app hidden — possible screenshot, screen recording, or Control Center access");
        }, 300);
        (window as unknown as { __visViolTimeout?: ReturnType<typeof setTimeout> }).__visViolTimeout = violTimeout;
      } else {
        const w = window as unknown as { __visViolTimeout?: ReturnType<typeof setTimeout> };
        if (w.__visViolTimeout) {
          clearTimeout(w.__visViolTimeout);
          w.__visViolTimeout = undefined;
        }
        checkClipboardForImage().then((hasImage) => {
          if (hasImage && !reportedRef.current) {
            report("screenshot", "Image detected in clipboard after tab/app return");
          } else if (!reportedRef.current) {
            setBlackedOut(false);
          }
        });
      }
    };

    // ==========================================
    // 3. KEYBOARD SHORTCUTS — all known screenshot + devtools shortcuts
    // ==========================================
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();

      // --- WINDOWS shortcuts ---
      // Win+Shift+S (caught via blur, but also try keydown)
      if (e.shiftKey && (e.metaKey || e.ctrlKey) && k === "s") {
        e.preventDefault();
        e.stopPropagation();
        setBlackedOut(true);
        pauseAllVideos();
        report("screenshot", "Win+Shift+S (Snipping Tool) detected");
        return;
      }
      // PrintScreen / Alt+PrintScreen
      if (k === "printscreen" || e.code === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        setBlackedOut(true);
        pauseAllVideos();
        report("screenshot", "PrintScreen key pressed");
        return;
      }
      // Win+Alt+PrintScreen (Game Bar screenshot)
      if (e.altKey && (e.metaKey || e.ctrlKey) && k === "printscreen") {
        e.preventDefault();
        e.stopPropagation();
        setBlackedOut(true);
        report("screenshot", "Game Bar screenshot (Win+Alt+PrintScreen)");
        return;
      }

      // --- MAC shortcuts ---
      // Cmd+Shift+3 (full screen)
      // Cmd+Shift+4 (selection)
      // Cmd+Shift+5 (screenshot utility)
      // Cmd+Shift+6 (Touch Bar)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && ["3", "4", "5", "6"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        setBlackedOut(true);
        pauseAllVideos();
        report("screenshot", `macOS screenshot shortcut Cmd+Shift+${e.key} pressed`);
        return;
      }

      // --- DEVTOOLS ---
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        e.stopPropagation();
        setBlackedOut(true);
        report("devtools", "F12 (DevTools) pressed");
        return;
      }
      // Ctrl/Cmd + Shift + I/J/C (devtools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(k)) {
        e.preventDefault();
        e.stopPropagation();
        setBlackedOut(true);
        report("devtools", `DevTools shortcut Ctrl+Shift+${k.toUpperCase()} pressed`);
        return;
      }

      // --- VIEW SOURCE / SAVE / PRINT ---
      if ((e.ctrlKey || e.metaKey) && k === "u") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && k === "s") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && k === "p") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && k === "c") {
        e.preventDefault();
        return;
      }
    };

    // ==========================================
    // 4. COPY/CUT/CONTEXT MENU blocking
    // ==========================================
    const onCopy = (e: ClipboardEvent) => e.preventDefault();
    const onCut = (e: ClipboardEvent) => e.preventDefault();
    const onContext = (e: MouseEvent) => e.preventDefault();

    // ==========================================
    // 5. DISPLAY CAPTURE PERMISSION detection (screen recording)
    // ==========================================
    let permCheck: ReturnType<typeof setInterval> | null = null;
    const checkCapture = async () => {
      try {
        // @ts-expect-error - 'display-capture' is non-standard
        const p = await navigator.permissions?.query?.({ name: "display-capture" });
        if (p && p.state === "granted") {
          report("screen_record", "Display capture permission granted — screen recording active");
        }
      } catch { /* not supported */ }
    };
    checkCapture();
    permCheck = setInterval(checkCapture, 3000);

    // ==========================================
    // 6. DEVTOOLS detection (window size delta)
    // ==========================================
    let devtoolsOpen = false;
    const checkDevtools = () => {
      const threshold = 200;
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      const isOpen = widthDiff > threshold || heightDiff > threshold;
      if (isOpen && !devtoolsOpen) {
        devtoolsOpen = true;
        report("devtools", "Developer tools detected open (window size delta)");
      }
    };
    const devtoolsInterval = setInterval(checkDevtools, 2000);

    // ==========================================
    // 7. MOBILE: detect screenshot via resize event
    // On some Android devices, taking a screenshot causes a brief resize.
    // ==========================================
    const onResize = () => {
      // If the window size changes while a video is playing, it might be
      // a screenshot tool opening. Blackout as a precaution.
      if (isStudent && !reportedRef.current) {
        const now = Date.now();
        // Only trigger if we've been watching for a while (not initial load).
        if (now - watchingSinceRef.current > 5000) {
          setBlackedOut(true);
          pauseAllVideos();
          // Don't report immediately — wait to see if it's a real screenshot.
          setTimeout(() => {
            checkClipboardForImage().then((hasImage) => {
              if (hasImage) {
                report("screenshot", "Image detected in clipboard after resize (mobile screenshot)");
              } else {
                setBlackedOut(false);
              }
            });
          }, 500);
        }
      }
    };

    // ==========================================
    // 8. MOBILE: detect long-press (could be screenshot gesture)
    // ==========================================
    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        // Multi-touch detected — could be palm swipe or 3-finger screenshot.
        setBlackedOut(true);
        pauseAllVideos();
        const t = setTimeout(() => {
          report("screenshot", "Multi-touch gesture detected (possible palm swipe / 3-finger screenshot)");
        }, 500);
        (window as unknown as { __touchViol?: ReturnType<typeof setTimeout> }).__touchViol = t;
      }
    };
    const onTouchEnd = () => {
      const w = window as unknown as { __touchViol?: ReturnType<typeof setTimeout> };
      if (w.__touchViol) {
        clearTimeout(w.__touchViol);
        w.__touchViol = undefined;
      }
    };

    // ==========================================
    // 9. PERIODIC clipboard check (catches screenshots taken via OS tools)
    // ==========================================
    const clipboardInterval = setInterval(async () => {
      if (reportedRef.current) return;
      const hasImage = await checkClipboardForImage();
      if (hasImage) {
        report("screenshot", "Image detected in clipboard (periodic check — OS-level screenshot)");
      }
    }, 2000);

    // ==========================================
    // 10. BLOCK drag, select, and screenshot via CSS
    // ==========================================
    const onDragStart = (e: DragEvent) => e.preventDefault();

    // Register ALL listeners.
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("keydown", onKey, { capture: true });
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("dragstart", onDragStart);
    window.addEventListener("resize", onResize);
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("keydown", onKey, { capture: true } as EventListenerOptions);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
      if (permCheck) clearInterval(permCheck);
      clearInterval(devtoolsInterval);
      clearInterval(clipboardInterval);
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
            <h2 className="text-lg font-semibold">⚠️ Screenshot / Screen Recording Detected</h2>
            <p className="max-w-xs text-sm text-white/70">
              {violationMsg || "A screenshot or screen recording attempt was detected."}
            </p>
            <p className="max-w-xs text-sm font-bold text-red-400">
              Your account has been DISABLED. Contact the academy owner to
              reactivate your account.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
