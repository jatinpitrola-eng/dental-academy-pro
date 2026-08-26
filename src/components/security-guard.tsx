"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/**
 * SecurityGuard wraps the whole app and:
 *  - blocks all dev-tools / right-click / copy / save / view-source shortcuts
 *  - detects screenshot + screen-record attempts (PrintScreen, Cmd+Shift+3/4/5)
 *  - on violation: pauses the video, reports it, auto-disables the account
 *  - on tab blur / hide: shows a full-screen blackout overlay so screenshots
 *    taken while the app is backgrounded show nothing
 *  - anti-debug: traps common devtools-open heuristics
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
    const report = async (type: string, detail: string) => {
      if (reportedRef.current || !studentId) return;
      reportedRef.current = true;
      // Pause all videos immediately.
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

    // --- BLACKOUT on focus / visibility loss (active blocking) -----------
    const onBlur = () => setBlackedOut(true);
    const onFocus = () => setBlackedOut(false);
    const onVisibility = () => {
      if (document.hidden) {
        setBlackedOut(true);
        document.querySelectorAll("video").forEach((v) => {
          try {
            v.pause();
          } catch {
            /* ignore */
          }
        });
        // Also pause YouTube players
        document.querySelectorAll("iframe").forEach((f) => {
          try {
            f.contentWindow?.postMessage(
              JSON.stringify({ event: "command", func: "pauseVideo" }),
              "*",
            );
          } catch {
            /* ignore */
          }
        });
      } else {
        const reveal = () => {
          setBlackedOut(false);
          window.removeEventListener("pointerdown", reveal);
          window.removeEventListener("keydown", reveal);
        };
        window.addEventListener("pointerdown", reveal, { once: true });
        window.addEventListener("keydown", reveal, { once: true });
      }
    };

    // --- KEY blocking: F12, devtools, copy, save, view-source, prints ----
    // Use capture phase so we intercept BEFORE the OS can act on the key.
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const code = e.code;

      // F12 devtools
      if (e.key === "F12") {
        e.preventDefault();
        e.stopPropagation();
        setBlackedOut(true); // immediate blackout
        report("devtools", "F12 pressed");
        return;
      }
      // PrintScreen — intercept IMMEDIATELY in capture phase, before the OS
      // captures the screen. Blackout + report + disable.
      if (k === "printscreen" || code === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        // Pause all videos instantly so no frame is captured.
        document.querySelectorAll("video").forEach((v) => {
          try {
            v.pause();
          } catch {
            /* ignore */
          }
        });
        // Also pause YouTube iframes.
        document.querySelectorAll("iframe").forEach((f) => {
          try {
            f.contentWindow?.postMessage(
              JSON.stringify({ event: "command", func: "pauseVideo" }),
              "*",
            );
          } catch {
            /* ignore */
          }
        });
        setBlackedOut(true); // immediate blackout
        report("screenshot", "PrintScreen key pressed");
        return;
      }
      // Ctrl/Cmd + Shift + I/J/C  (devtools)
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        ["i", "j", "c"].includes(k)
      ) {
        e.preventDefault();
        e.stopPropagation();
        setBlackedOut(true);
        report("devtools", `Devtools shortcut ${k.toUpperCase()} pressed`);
        return;
      }
      // Ctrl/Cmd + U (view source)
      if ((e.ctrlKey || e.metaKey) && k === "u") {
        e.preventDefault();
        e.stopPropagation();
        report("devtools", "View source attempted");
        return;
      }
      // Ctrl/Cmd + S (save page)
      if ((e.ctrlKey || e.metaKey) && k === "s") {
        e.preventDefault();
        report("download_attempt", "Save shortcut pressed");
        return;
      }
      // Ctrl/Cmd + P (print)
      if ((e.ctrlKey || e.metaKey) && k === "p") {
        e.preventDefault();
        report("download_attempt", "Print shortcut pressed");
        return;
      }
      // Ctrl/Cmd + C (copy)
      if ((e.ctrlKey || e.metaKey) && k === "c") {
        e.preventDefault();
        report("copy", "Copy shortcut blocked");
        return;
      }
      // macOS screenshot combos
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        ["3", "4", "5"].includes(e.key)
      ) {
        e.preventDefault();
        report("screenshot", "Screenshot combo pressed");
        return;
      }
      // Block Alt+menu access
      if (e.altKey && k === "f") e.preventDefault();
    };

    // --- COPY / CUT / PASTE blocking (clipboard) -------------------------
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      report("copy", "Copy attempt blocked");
    };
    const onCut = (e: ClipboardEvent) => {
      e.preventDefault();
      report("copy", "Cut attempt blocked");
    };

    // --- CONTEXT MENU (right-click) blocking ----------------------------
    const onContext = (e: MouseEvent) => {
      e.preventDefault();
    };

    // --- DRAG / SELECT blocking ----------------------------------------
    const onDragStart = (e: DragEvent) => e.preventDefault();
    const onSelectStart = (e: Event) => e.preventDefault();

    // --- Screen-capture permission detection ----------------------------
    let permCheck: ReturnType<typeof setInterval> | null = null;
    const checkCapture = async () => {
      try {
        // @ts-expect-error - 'display-capture' is non-standard
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

    // --- Anti-debug: detect devtools open via window size delta ---------
    // The classic trick: when devtools open, the inner window shrinks
    // relative to outer. We only flag suspicious thresholds.
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
    const devtoolsInterval = setInterval(checkDevtools, 1500);

    // --- Block right-click globally ------------------------------------
    document.addEventListener("contextmenu", onContext);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("keydown", onKey, { capture: true });
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("selectstart", onSelectStart);

    return () => {
      document.removeEventListener("contextmenu", onContext);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("keydown", onKey, { capture: true } as EventListenerOptions);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("selectstart", onSelectStart);
      if (permCheck) clearInterval(permCheck);
      clearInterval(devtoolsInterval);
    };
  }, [studentId, studentName]);

  return (
    <>
      {children}
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
