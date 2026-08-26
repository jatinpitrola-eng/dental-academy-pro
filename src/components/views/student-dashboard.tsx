"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { api, timeLeft, formatDuration } from "@/lib/api";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  LogOut,
  PlayCircle,
  Clock,
  Video,
  CalendarClock,
  Loader2,
  ShieldCheck,
  Lock,
} from "lucide-react";

type CourseItem = {
  id: string;
  title: string;
  description: string | null;
  color: string | null;
  videoCount: number;
  videos: { id: string; title: string; duration: number }[];
  grantedAt: string;
  expiresAt: string;
};

export function StudentDashboard() {
  const student = useApp((s) => s.student)!;
  const setView = useApp((s) => s.setView);
  const setStudent = useApp((s) => s.setStudent);
  const setTabRole = useApp((s) => s.setTabRole);
  const setActiveCourseId = useApp((s) => s.setActiveCourseId);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  const load = async () => {
    try {
      const res = await api<{ courses: CourseItem[] }>("/api/student/courses");
      // IMPORTANT: On Vercel, different serverless function instances may have
      // different DB states. If we already have courses loaded and the new
      // fetch returns a DIFFERENT set (e.g., 1 course vs 3 courses), DON'T
      // overwrite — this prevents the "blinking" effect where courses appear
      // and disappear. Only update if:
      // 1. We have no courses yet (initial load), OR
      // 2. The new data has MORE courses than before (admin granted a new one), OR
      // 3. The new data has the SAME courses (no change)
      if (!hasLoadedRef.current || res.courses.length >= courses.length) {
        setCourses(res.courses);
        hasLoadedRef.current = true;
      }
      // If the new data has FEWER courses than what we already show, keep the
      // existing courses (don't remove what the student can already see).
    } catch {
      /* ignore — keep existing courses */
    } finally {
      setLoading(false);
    }
  };

  // Load once on mount, then poll less frequently (10s instead of 4s) to
  // reduce the chance of hitting inconsistent DB states on Vercel.
  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    setStudent(null);
    setTabRole(null);
    setView("landing");
  };

  return (
    <div className="flex w-full flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <Brand />
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Hi, <span className="font-medium text-foreground">{student.name}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={logout} className="gap-1.5">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">My Courses</h1>
          <p className="text-sm text-muted-foreground">
            Your access is device-bound. Each course auto-locks when its timer
            expires.
          </p>
        </div>

        {loading ? (
          <div className="grid place-items-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <Card className="glass border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
                <Lock className="h-7 w-7" />
              </div>
              <h3 className="font-semibold">No active courses yet</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                You don't have any unlocked courses right now. Please contact
                your academy owner to grant access to a course.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => {
              const tl = timeLeft(c.expiresAt);
              const total = Math.max(
                1,
                Math.round(
                  (Date.now() - new Date(c.grantedAt).getTime()) /
                    (new Date(c.expiresAt).getTime() -
                      new Date(c.grantedAt).getTime()) || 1,
                ),
              );
              return (
                <Card
                  key={c.id}
                  className="group relative overflow-hidden border-border/60 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/5"
                >
                  <div
                    className="h-1.5 w-full"
                    style={{
                      background: `linear-gradient(90deg, ${c.color || "#10b981"}, ${
                        c.color ? c.color + "aa" : "#0d9488"
                      })`,
                    }}
                  />
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"
                        style={{ backgroundColor: c.color || "#10b981" }}
                      >
                        <Video className="h-5 w-5" />
                      </div>
                      <Badge
                        variant={tl.expired ? "destructive" : "secondary"}
                        className="gap-1"
                      >
                        <Clock className="h-3 w-3" />
                        {tl.label}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg leading-snug">
                      {c.title}
                    </CardTitle>
                    {c.description && (
                      <CardDescription className="line-clamp-2">
                        {c.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Video className="h-3.5 w-3.5" />
                        {c.videoCount} lessons
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Expires {new Date(c.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                    {!tl.expired && (
                      <Progress
                        value={Math.min(100, Math.max(2, 100 - tl.days * (100 / 30)))}
                        className="h-1.5"
                      />
                    )}
                    <Button
                      className="w-full gap-2"
                      disabled={tl.expired}
                      onClick={() => {
                        setActiveCourseId(c.id);
                        setView("student-course");
                      }}
                    >
                      <PlayCircle className="h-4 w-4" />
                      {tl.expired ? "Access expired" : "Open course"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* security reminder */}
        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Protected playback:</span>{" "}
            Screenshots, screen recording and downloads are disabled. Any
            attempt will automatically disable your account until the owner
            reactivates it.
          </p>
        </div>
      </section>
    </div>
  );
}
