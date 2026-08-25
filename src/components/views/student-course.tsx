"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { api, formatDuration, timeLeft } from "@/lib/api";
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
  ArrowLeft,
  PlayCircle,
  Lock,
  Clock,
  Loader2,
  ListVideo,
  CheckCircle2,
} from "lucide-react";

type CourseDetail = {
  id: string;
  title: string;
  description: string | null;
  color: string | null;
  videoCount: number;
  videos: {
    id: string;
    title: string;
    description: string | null;
    duration: number;
    sortOrder: number;
  }[];
  grantedAt: string;
  expiresAt: string;
};

export function StudentCourse() {
  const courseId = useApp((s) => s.activeCourseId);
  const setView = useApp((s) => s.setView);
  const setActiveVideoId = useApp((s) => s.setActiveVideoId);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [coursesRes, progRes] = await Promise.all([
          api<{ courses: CourseDetail[] }>("/api/student/courses"),
          api<{ watched: string[] }>("/api/student/progress"),
        ]);
        const c = coursesRes.courses.find((x) => x.id === courseId);
        setCourse(c || null);
        setWatched(new Set(progRes.watched));
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId]);

  // Refresh watched state when returning from a video.
  useEffect(() => {
    const onFocus = async () => {
      try {
        const res = await api<{ watched: string[] }>("/api/student/progress");
        setWatched(new Set(res.watched));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  if (loading)
    return (
      <div className="grid flex-1 place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  if (!course)
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Course unavailable</CardTitle>
            <CardDescription>
              This course may have expired or been revoked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setView("student-dashboard")}>
              Back to courses
            </Button>
          </CardContent>
        </Card>
      </div>
    );

  const tl = timeLeft(course.expiresAt);

  return (
    <div className="flex w-full flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("student-dashboard")}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Courses
          </Button>
          <div className="ml-auto hidden sm:block">
            <Brand size="sm" />
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-4 py-6">
        <div
          className="mb-6 overflow-hidden rounded-2xl border border-border/60 p-6"
          style={{
            background: `linear-gradient(135deg, ${course.color || "#10b981"}22, transparent)`,
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
              {course.description && (
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  {course.description}
                </p>
              )}
            </div>
            <Badge variant={tl.expired ? "destructive" : "secondary"} className="gap-1">
              <Clock className="h-3 w-3" />
              {tl.label}
            </Badge>
          </div>
          {!tl.expired && (
            <div className="mt-4">
              <Progress
                value={Math.min(100, Math.max(2, 100 - tl.days * (100 / 30)))}
                className="h-1.5"
              />
            </div>
          )}
        </div>

        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ListVideo className="h-4 w-4" />
            {course.videos.length} lessons
          </div>
          {course.videos.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {course.videos.filter((v) => watched.has(v.id)).length}/
                {course.videos.length} watched
              </span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${
                      (course.videos.filter((v) => watched.has(v.id)).length /
                        course.videos.length) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {course.videos.map((v, i) => {
            const expired = tl.expired;
            const isWatched = watched.has(v.id);
            return (
              <Card
                key={v.id}
                className="group flex items-center gap-4 border-border/60 p-4 transition-all hover:border-emerald-500/30 hover:bg-accent/30"
              >
                <div
                  className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl text-sm font-semibold text-white"
                  style={{ backgroundColor: course.color || "#10b981" }}
                >
                  {isWatched ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium">{v.title}</h3>
                  {v.description && (
                    <p className="truncate text-sm text-muted-foreground">
                      {v.description}
                    </p>
                  )}
                  {isWatched && (
                    <Badge variant="secondary" className="mt-1 gap-1 text-[10px]">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Watched
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
                    {formatDuration(v.duration)}
                  </span>
                  <Button
                    size="sm"
                    disabled={expired}
                    onClick={() => {
                      setActiveVideoId(v.id);
                      setView("student-video");
                    }}
                    className="gap-1.5"
                  >
                    {expired ? (
                      <>
                        <Lock className="h-4 w-4" /> Locked
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-4 w-4" /> Play
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
