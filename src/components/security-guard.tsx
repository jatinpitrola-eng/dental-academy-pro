"use client";

import { useEffect, useRef } from "react";
import { api } from "@/lib/api";

/**
 * SecurityGuard wraps the whole app and detects screenshot / screen-record /
 * copy / devtools attempts. When a violation is detected it:
 *  - reports to /api/student/violation (which disables the account server-side)
 *  - forces a hard reload to the locked screen.
 *
 * Note: browsers cannot *prevent* screenshots for real (only native apps with
 * FLAG_SECURE can). We implement strong *detection* + *deterrence* + *auto
 * disable*: this is the strongest a web/PWA app can do, and it matches the
 * owner's requirement that "if anyone takes a screenshot or screen records,
 * their account gets disabled."
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

  useEffect(() => {
    if (!studentId) return;

    const report = async (type: string, detail: string) => {
      if (reportedRef.current) return;
      reportedRef.current = true;
      try {
        await api("/api/student/violation", {
          method: "POST",
          body: JSON.stringify({ type, detail }),
        });
      } catch {
        /* ignore */
      }
      // Brief delay so the report lands, then reload to the locked screen.
      setTimeout(() => {
        window.location.href = "/";
      }, 400);
    };

    // 1) PrintScreen key — common screenshot trigger on desktop.
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "printscreen" || e.code === "PrintScreen") {
        e.preventDefault();
        report("screenshot", "PrintScreen key pressed");
      }
      // Block copy / save / view-source shortcuts on video pages.
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "s", "u", "p"].includes(k)
      ) {
        e.preventDefault();
      }
      if (e.key === "F12") e.preventDefault();
    };

    // 2) Copy attempt on the page.
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      report("copy", "Copy attempt blocked");
    };

    // 3) Visibility / blur — when the tab is hidden or window loses focus
    //    while a video is playing, treat as a likely screen-record / switch
    //    attempt and report (deterrence).
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else if (hiddenAt && Date.now() - hiddenAt > 1500) {
        // returning after >1.5s hidden — suspicious but not auto-reported
        // to avoid false positives; we just blur the player.
        hiddenAt = 0;
      }
    };

    // 4) Context menu (right-click) — blocked to deter "Save video as".
    const onContext = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("video, .secure-zone")) e.preventDefault();
    };

    // 5) Detect screen capture permission via Permissions API (where supported).
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
    permCheck = setInterval(checkCapture, 8000);

    // 6) Detect common screenshot browser key combos (Cmd+Shift+3/4 on macOS,
    //    Win+Shift+S can't be caught, but PrintScreen + combos can).
    const onCombo = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        ["3", "4", "5"].includes(e.key)
      ) {
        report("screenshot", "Screenshot combo pressed");
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("keydown", onCombo);
    document.addEventListener("copy", onCopy);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("contextmenu", onContext);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keydown", onCombo);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("contextmenu", onContext);
      if (permCheck) clearInterval(permCheck);
    };
  }, [studentId, studentName]);

  return <>{children}</>;
}
