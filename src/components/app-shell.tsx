"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { SecurityGuard } from "./security-guard";
import { LandingView } from "./views/landing";
import { RegisterView } from "./views/register";
import { LoginView } from "./views/login";
import { OtpView } from "./views/otp";
import { StudentDashboard } from "./views/student-dashboard";
import { StudentCourse } from "./views/student-course";
import { StudentVideo } from "./views/student-video";
import { AdminPortalLogin } from "./views/admin-portal-login";
import { AdminDashboard } from "./views/admin-dashboard";
import { SiteFooter } from "./site-footer";

export function AppShell() {
  const view = useApp((s) => s.view);
  const student = useApp((s) => s.student);
  const admin = useApp((s) => s.admin);
  const setStudent = useApp((s) => s.setStudent);
  const setAdmin = useApp((s) => s.setAdmin);
  const setView = useApp((s) => s.setView);
  const portalMode = useApp((s) => s.portalMode);
  const setPortalMode = useApp((s) => s.setPortalMode);

  // Reveal the secret admin portal via ?portal=1 in the URL.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("portal") === "1") {
      setPortalMode(true);
    }
  }, [setPortalMode]);

  // Restore sessions on first load.
  useEffect(() => {
    // Manually rehydrate the persisted store (skipped during SSR).
    useApp.persist?.rehydrate?.();
    (async () => {
      try {
        const a = await api<{ admin: unknown }>("/api/admin/session");
        if (a.admin) {
          setAdmin(a.admin as never);
          setView("admin-dashboard");
          return;
        }
      } catch {
        /* ignore */
      }
      try {
        const s = await api<{ user: unknown }>("/api/auth/session");
        if (s.user && (s.user as { kind: string }).kind === "student") {
          setStudent(s.user as never);
          setView("student-dashboard");
        }
      } catch {
        /* ignore */
      }
    })();
  }, [setStudent, setAdmin, setView]);

  // If portalMode is active and there's no admin session, force the portal
  // login view (unless the user is already an admin).
  useEffect(() => {
    if (portalMode && !admin && view !== "admin-portal-login") {
      setView("admin-portal-login");
    }
  }, [portalMode, admin, view, setView]);

  // Decide what to render. Student/admin areas require a session; otherwise we
  // bounce back to a sensible public view.
  const renderView = () => {
    if (view === "admin-portal-login") return <AdminPortalLogin />;
    if (view === "admin-dashboard" && admin) return <AdminDashboard />;
    if (view === "student-dashboard" && student) return <StudentDashboard />;
    if (view === "student-course" && student) return <StudentCourse />;
    if (view === "student-video" && student) return <StudentVideo />;
    if (view === "register") return <RegisterView />;
    if (view === "login") return <LoginView />;
    if (view === "otp") return <OtpView />;
    return <LandingView />;
  };

  const isStandaloneView =
    view === "admin-dashboard" || view === "admin-portal-login";

  return (
    <div className="app-ambient flex min-h-screen flex-col">
      <SecurityGuard studentId={student?.id} studentName={student?.name}>
        <main className="flex w-full flex-1 flex-col">{renderView()}</main>
      </SecurityGuard>
      {!isStandaloneView && <SiteFooter />}
    </div>
  );
}
