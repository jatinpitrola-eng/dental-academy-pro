"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type View =
  | "landing"
  | "login"
  | "register"
  | "otp"
  | "student-dashboard"
  | "student-course"
  | "student-video"
  | "admin-portal-login"
  | "admin-dashboard";

export type StudentUser = {
  kind: "student";
  id: string;
  name: string;
  email: string;
  status: string;
};

export type AdminUser = {
  kind: "admin";
  id: string;
  username: string;
  name: string | null;
};

export type TabRole = "student" | "admin" | null;

interface AppState {
  view: View;
  setView: (v: View) => void;

  student: StudentUser | null;
  setStudent: (s: StudentUser | null) => void;

  admin: AdminUser | null;
  setAdmin: (a: AdminUser | null) => void;

  // context objects
  activeCourseId: string | null;
  setActiveCourseId: (id: string | null) => void;
  activeVideoId: string | null;
  setActiveVideoId: (id: string | null) => void;

  // OTP login flow
  pendingRequestId: string | null;
  setPendingRequestId: (id: string | null) => void;

  // Per-tab role (stored in sessionStorage so admin tab + student tab in the
  // same browser stay isolated even though auth cookies are shared).
  tabRole: TabRole;
  setTabRole: (r: TabRole) => void;

  // Admin access modal (triggered by 5 clicks on the logo)
  adminAccessOpen: boolean;
  setAdminAccessOpen: (b: boolean) => void;
}

// --- sessionStorage helpers (per-tab, NOT shared across tabs) -------------
const TAB_ROLE_KEY = "da_tab_role";

export function getTabRole(): TabRole {
  if (typeof window === "undefined") return null;
  return (sessionStorage.getItem(TAB_ROLE_KEY) as TabRole) || null;
}

export function setTabRoleStorage(role: TabRole) {
  if (typeof window === "undefined") return;
  if (role) sessionStorage.setItem(TAB_ROLE_KEY, role);
  else sessionStorage.removeItem(TAB_ROLE_KEY);
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      view: "landing",
      setView: (v) => set({ view: v }),

      student: null,
      setStudent: (s) => set({ student: s }),

      admin: null,
      setAdmin: (a) => set({ admin: a }),

      activeCourseId: null,
      setActiveCourseId: (id) => set({ activeCourseId: id }),
      activeVideoId: null,
      setActiveVideoId: (id) => set({ activeVideoId: id }),

      pendingRequestId: null,
      setPendingRequestId: (id) => set({ pendingRequestId: id }),

      tabRole: null,
      setTabRole: (r) => {
        setTabRoleStorage(r);
        set({ tabRole: r });
      },

      adminAccessOpen: false,
      setAdminAccessOpen: (b) => set({ adminAccessOpen: b }),
    }),
    {
      name: "dental-academy-app",
      // Rehydrate manually after mount to avoid SSR/CSR hydration mismatches.
      skipHydration: true,
      // Only persist the OTP flow + course/video context. Role is in
      // sessionStorage (per-tab), student/admin sessions are in httpOnly cookies.
      partialize: (s) => ({
        pendingRequestId: s.pendingRequestId,
        activeCourseId: s.activeCourseId,
        activeVideoId: s.activeVideoId,
      }),
    },
  ),
);
