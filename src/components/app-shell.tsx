"use client";

import { useEffect } from "react";
import { useApp, getTabRole } from "@/lib/store";
import { api } from "@/lib/api";
import { SecurityGuard } from "./security-guard";
import { IntroGate } from "./intro-gate";
import { LandingView } from "./views/landing";
import { RegisterView } from "./views/register";
import { LoginView } from "./views/login";
import { OtpView } from "./views/otp";
import { StudentDashboard } from "./views/student-dashboard";
import { StudentCourse } from "./views/student-course";
import { StudentVideo } from "./views/student-video";
import { AdminDashboard } from "./views/admin-dashboard";
import { SiteFooter } from "./site-footer";

export function AppShell() {
  const view = useApp((s) => s.view);
  const student = useApp((s) => s.student);
  const admin = useApp((s) => s.admin);
  const setStudent = useApp((s) => s.setStudent);
  const setAdmin = useApp((s) => s.setAdmin);
  const setView = useApp((s) => s.setView);
  const setTabRoleState = useApp((s) => s.setTabRole);

  // On first load: check sessionStorage for a per-tab role. If set, resume
  // ONLY that role's session. If not set (fresh tab), ALWAYS show the landing
  // page — the user must explicitly choose to sign in as student or admin.
  // This prevents admin tabs from "leaking" into student tabs via shared cookies.
  useEffect(() => {
    useApp.persist?.rehydrate?.();
    const role = getTabRole();
    setTabRoleState(role);

    (async () => {
      // If this tab is locked to admin, ONLY check the admin session.
      if (role === "admin") {
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
        // admin cookie gone → fall through to landing
        setTabRoleState(null);
        setView("landing");
        return;
      }

      // If this tab is locked to student, ONLY check the student session.
      if (role === "student") {
        try {
          const s = await api<{ user: unknown }>("/api/auth/session");
          if (s.user && (s.user as { kind: string }).kind === "student") {
            setStudent(s.user as never);
            setView("student-dashboard");
            return;
          }
        } catch {
          /* ignore */
        }
        setTabRoleState(null);
        setView("landing");
        return;
      }

      // No role set → fresh tab. ALWAYS show landing. Do NOT auto-resume
      // any session — the user must explicitly click "Sign in" (student)
      // or the logo 5 times (admin) to choose a role for this tab.
      setView("landing");
    })();
  }, [setStudent, setAdmin, setView, setTabRoleState]);

  const renderView = () => {
    if (view === "admin-dashboard" && admin) return <AdminDashboard />;
    if (view === "student-dashboard" && student) return <StudentDashboard />;
    if (view === "student-course" && student) return <StudentCourse />;
    if (view === "student-video" && student) return <StudentVideo />;
    if (view === "register") return <RegisterView />;
    if (view === "login") return <LoginView />;
    if (view === "otp") return <OtpView />;
    return <LandingView />;
  };

  const isStandaloneView = view === "admin-dashboard";

  return (
    <IntroGate>
      <div className="app-ambient flex min-h-screen flex-col">
        <SecurityGuard studentId={student?.id} studentName={student?.name}>
          <main className="flex w-full flex-1 flex-col">{renderView()}</main>
        </SecurityGuard>
        {!isStandaloneView && <SiteFooter />}
      </div>
    </IntroGate>
  );
}
