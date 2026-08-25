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

  // portal visibility (the admin portal is hidden; revealed via ?portal=1)
  portalMode: boolean;
  setPortalMode: (b: boolean) => void;
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

      portalMode: false,
      setPortalMode: (b) => set({ portalMode: b }),
    }),
    {
      name: "dental-academy-app",
      // Rehydrate manually after mount to avoid SSR/CSR hydration mismatches.
      skipHydration: true,
      partialize: (s) => ({
        pendingRequestId: s.pendingRequestId,
        activeCourseId: s.activeCourseId,
        activeVideoId: s.activeVideoId,
      }),
    },
  ),
);
