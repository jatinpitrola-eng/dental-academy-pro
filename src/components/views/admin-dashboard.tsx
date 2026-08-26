"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  playNotificationSound,
  ensureNotificationPermission,
} from "@/lib/notify";
import {
  LayoutDashboard,
  KeyRound,
  Users,
  GraduationCap,
  Video,
  Bell,
  ScrollText,
  LogOut,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Plus,
  Trash2,
  Pencil,
  Power,
  Smartphone,
  Clock,
  Loader2,
  Lock,
  Upload,
  Link as LinkIcon,
  ShieldCheck,
} from "lucide-react";

type Tab =
  | "overview"
  | "otp"
  | "students"
  | "courses"
  | "notifications"
  | "logs";

export function AdminDashboard() {
  const admin = useApp((s) => s.admin)!;
  const setAdmin = useApp((s) => s.setAdmin);
  const setView = useApp((s) => s.setView);
  const setTabRole = useApp((s) => s.setTabRole);
  const [tab, setTab] = useState<Tab>("overview");
  const [notifPerm, setNotifPerm] = useState<boolean | null>(null);

  // Ask for notification permission on first load (the owner wants live alerts).
  useEffect(() => {
    (async () => {
      // Suppress security guard during notification permission.
      (window as unknown as { __suppressSecurity?: (v: boolean) => void }).__suppressSecurity?.(true);
      const ok = await ensureNotificationPermission();
      (window as unknown as { __suppressSecurity?: (v: boolean) => void }).__suppressSecurity?.(false);
      setNotifPerm(ok);
    })();
  }, []);

  const logout = async () => {
    await api("/api/admin/logout", { method: "POST" }).catch(() => {});
    setAdmin(null);
    setTabRole(null);
    setView("landing");
  };

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* sidebar */}
      <aside className="border-b border-border/50 bg-card/40 lg:border-b-0 lg:border-r lg:w-64 lg:shrink-0">
        <div className="flex items-center justify-between px-4 py-4 lg:block">
          <Brand size="sm" />
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="gap-1.5 lg:hidden"
          >
            <LogOut className="h-4 w-4" /> Exit
          </Button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:w-full",
                tab === n.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="hidden border-t border-border/50 p-3 lg:block">
          <div className="rounded-lg bg-muted/50 p-3 text-xs">
            <div className="font-medium text-foreground">{admin.name || admin.username}</div>
            <div className="text-muted-foreground">Master Admin</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="mt-2 w-full justify-start gap-1.5 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-semibold capitalize">
              {NAV.find((n) => n.id === tab)?.label}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {notifPerm === false && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300">
                  <Bell className="h-3 w-3" /> Notifications blocked
                </span>
              )}
              {notifPerm === true && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="h-3 w-3" /> Live alerts on
                </span>
              )}
            </div>
          </div>
        </header>
        <div className="flex-1 p-4">
          {tab === "overview" && <OverviewTab onGoTo={setTab} />}
          {tab === "otp" && <OtpTab />}
          {tab === "students" && <StudentsTab />}
          {tab === "courses" && <CoursesTab />}
          {tab === "notifications" && <NotificationsTab />}
          {tab === "logs" && <LogsTab />}
        </div>
      </div>
    </div>
  );
}

const NAV: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "otp", label: "Access Codes", icon: KeyRound },
  { id: "students", label: "Students", icon: Users },
  { id: "courses", label: "Courses", icon: GraduationCap },
  { id: "notifications", label: "Alerts", icon: Bell },
  { id: "logs", label: "Activity", icon: ScrollText },
];

/* ------------------------------------------------------------------ */

type Stats = {
  students: number;
  activeStudents: number;
  pendingStudents: number;
  disabledStudents: number;
  courses: number;
  videos: number;
  pendingOtps: number;
  violations: number;
  grants: number;
};

function OverviewTab({ onGoTo }: { onGoTo: (t: Tab) => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await api<{ stats: Stats }>("/api/admin/logs");
      setStats(res.stats);
    } catch {
      /* ignore */
    }
  }, []);

  const loadPending = useCallback(async () => {
    try {
      const res = await api<{ requests: unknown[] }>(
        "/api/admin/otp?filter=pending",
      );
      setPending(res.requests.length);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    loadPending();
    const t = setInterval(loadPending, 5000);
    return () => clearInterval(t);
  }, [load, loadPending]);

  const cards = [
    {
      label: "Total students",
      value: stats?.students ?? "—",
      icon: Users,
      color: "#10b981",
      tab: "students" as Tab,
    },
    {
      label: "Pending access codes",
      value: stats?.pendingOtps ?? "—",
      icon: KeyRound,
      color: "#f59e0b",
      tab: "otp" as Tab,
      highlight: pending > 0,
    },
    {
      label: "Active courses",
      value: stats?.courses ?? "—",
      icon: GraduationCap,
      color: "#0ea5e9",
      tab: "courses" as Tab,
    },
    {
      label: "Total videos",
      value: stats?.videos ?? "—",
      icon: Video,
      color: "#8b5cf6",
      tab: "courses" as Tab,
    },
    {
      label: "Active grants",
      value: stats?.grants ?? "—",
      icon: ShieldCheck,
      color: "#14b8a6",
      tab: "students" as Tab,
    },
    {
      label: "Disabled accounts",
      value: stats?.disabledStudents ?? "—",
      icon: ShieldAlert,
      color: "#ef4444",
      tab: "students" as Tab,
    },
  ];

  return (
    <div className="space-y-6">
      {pending > 0 && (
        <button
          onClick={() => onGoTo("otp")}
          className="flex w-full items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left transition hover:bg-amber-500/15"
        >
          <div className="grid h-10 w-10 place-items-center rounded-full bg-amber-500/20 text-amber-600">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-amber-900 dark:text-amber-100">
              {pending} student{pending > 1 ? "s" : ""} waiting for access
            </div>
            <div className="text-sm text-amber-700 dark:text-amber-300">
              Tap to review and generate access codes.
            </div>
          </div>
          <Bell className="h-5 w-5 animate-bounce text-amber-600" />
        </button>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <button
            key={c.label}
            onClick={() => onGoTo(c.tab)}
            className="group rounded-2xl border border-border/60 bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div
                className="grid h-10 w-10 place-items-center rounded-xl text-white"
                style={{ backgroundColor: c.color }}
              >
                <c.icon className="h-5 w-5" />
              </div>
              {c.highlight && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                </span>
              )}
            </div>
            <div className="mt-3 text-3xl font-bold tabular-nums">{c.value}</div>
            <div className="text-sm text-muted-foreground">{c.label}</div>
          </button>
        ))}
      </div>

      <Card className="border-border/60">
        <CardContent className="p-5">
          <h3 className="font-semibold">Quick actions</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onGoTo("otp")} className="gap-1.5">
              <KeyRound className="h-4 w-4" /> Approve logins
            </Button>
            <Button size="sm" variant="outline" onClick={() => onGoTo("courses")} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add course / video
            </Button>
            <Button size="sm" variant="outline" onClick={() => onGoTo("students")} className="gap-1.5">
              <Users className="h-4 w-4" /> Grant access
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */

type OtpReq = {
  id: string;
  status: string;
  code: string | null;
  createdAt: string;
  expiresAt: string;
  deviceLabel: string | null;
  ip: string | null;
  student: { id: string; name: string; email: string; status: string };
};

function OtpTab() {
  const [requests, setRequests] = useState<OtpReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const [courses, setCourses] = useState<{ id: string; title: string; color: string | null }[]>([]);
  const [approving, setApproving] = useState<OtpReq | null>(null);

  const load = useCallback(async () => {
    try {
      const [otpRes, courseRes] = await Promise.all([
        api<{ requests: OtpReq[] }>("/api/admin/otp?filter=all"),
        api<{ courses: { id: string; title: string; color: string | null }[] }>(
          "/api/admin/courses",
        ),
      ]);
      setRequests(otpRes.requests);
      setCourses(courseRes.courses);
      // Play a chime when new pending requests appear.
      const pendingCount = otpRes.requests.filter(
        (r) => r.status === "pending",
      ).length;
      if (pendingCount > lastSeenCount && lastSeenCount !== -1) {
        playNotificationSound();
      }
      setLastSeenCount(pendingCount);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [lastSeenCount]);

  useEffect(() => {
    setLastSeenCount(-1); // avoid chime on first load
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  const deny = async (id: string) => {
    try {
      await api(`/api/admin/otp`, {
        method: "POST",
        body: JSON.stringify({ requestId: id, action: "deny" }),
      });
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const pending = requests.filter((r) => r.status === "pending");
  const recent = requests.filter((r) => r.status !== "pending").slice(0, 12);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold">Pending access requests</h2>
        <p className="text-sm text-muted-foreground">
          Approve a request to generate a 6-digit code, then share it with the
          student out-of-band.
        </p>
      </div>

      {loading ? (
        <div className="grid place-items-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : pending.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <p className="text-sm">No pending requests. You're all caught up.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {pending.map((r) => (
            <Card key={r.id} className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{r.student.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.student.email}
                    </div>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {timeAgo(r.createdAt)}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                    <Smartphone className="h-3 w-3" /> {r.deviceLabel || "Unknown device"}
                  </span>
                  {r.ip && r.ip !== "unknown" && (
                    <span className="rounded-full bg-muted px-2 py-0.5">
                      {r.ip}
                    </span>
                  )}
                </div>

                {revealed[r.id] ? (
                  <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-center">
                    <div className="text-xs text-muted-foreground">
                      Share this code with the student:
                    </div>
                    <div className="mt-1 font-mono text-3xl font-bold tracking-[0.4em] text-emerald-700 dark:text-emerald-300">
                      {revealed[r.id]}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 gap-1.5"
                      onClick={() => copy(revealed[r.id])}
                    >
                      {copied === revealed[r.id] ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copied === revealed[r.id] ? "Copied" : "Copy code"}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => setApproving(r)}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => deny(r.id)}
                    >
                      <XCircle className="h-4 w-4" /> Deny
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {approving && (
        <ApproveWithCourseDialog
          req={approving}
          courses={courses}
          onClose={() => setApproving(null)}
          onDone={(code) => {
            if (code) {
              setRevealed((r) => ({ ...r, [approving.id]: code }));
              playNotificationSound();
            }
            setApproving(null);
            load();
          }}
        />
      )}

      {recent.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Recent activity
          </h3>
          <div className="space-y-2">
            {recent.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-medium">{r.student.name}</span>
                  <span className="ml-2 text-muted-foreground">
                    {r.deviceLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {r.code && r.status === "approved" && (
                    <span className="font-mono text-xs tracking-widest text-emerald-600">
                      {r.code}
                    </span>
                  )}
                  <Badge
                    variant={
                      r.status === "denied"
                        ? "destructive"
                        : r.status === "approved"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {r.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(r.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

type StudentRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  disableReason: string | null;
  deviceLabel: string | null;
  createdAt: string;
  grants: {
    id: string;
    expiresAt: string;
    revoked: boolean;
    course: { title: string; color: string | null };
  }[];
  _count?: { violations: number };
};

function StudentsTab() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [grantFor, setGrantFor] = useState<StudentRow | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([
        api<{ students: StudentRow[] }>("/api/admin/students"),
        api<{ courses: { id: string; title: string }[] }>(
          "/api/admin/courses",
        ),
      ]);
      setStudents(s.students);
      setCourses(c.courses);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (id: string, action: string, reason?: string) => {
    try {
      await api("/api/admin/students", {
        method: "PATCH",
        body: JSON.stringify({ id, action, reason }),
      });
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  if (loading)
    return (
      <div className="grid place-items-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Students</h2>
          <p className="text-sm text-muted-foreground">
            Manage accounts, grant time-limited access, and revoke devices.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load} className="gap-1.5">
          <Loader2 className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {students.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No students registered yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {students.map((s) => (
            <Card key={s.id} className="border-border/60">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{s.name}</span>
                      <StatusBadge status={s.status} />
                      {(s._count?.violations ?? 0) > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          {s._count?.violations ?? 0} violation
                          {(s._count?.violations ?? 0) > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.email}</div>
                    {s.phone && (
                      <div className="text-xs text-muted-foreground">
                        {s.phone}
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Smartphone className="h-3 w-3" />
                      {s.deviceLabel || "No device bound"}
                      <span>·</span>
                      <Clock className="h-3 w-3" />
                      joined {timeAgo(s.createdAt)}
                    </div>
                    {s.disableReason && (
                      <div className="mt-1 text-xs text-destructive">
                        Disabled: {s.disableReason}
                      </div>
                    )}
                    {s.grants.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {s.grants.map((g) => (
                          <span
                            key={g.id}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                              g.revoked || new Date(g.expiresAt) < new Date()
                                ? "bg-muted text-muted-foreground line-through"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                            )}
                            style={
                              !g.revoked && g.course.color
                                ? { backgroundColor: g.course.color + "22" }
                                : undefined
                            }
                          >
                            {g.course.title}
                            {!g.revoked && (
                              <span className="opacity-70">
                                · {timeAgo(g.expiresAt) === "expired" ? "expired" : new Date(g.expiresAt).toLocaleDateString()}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setGrantFor(s)}
                    >
                      <Plus className="h-3.5 w-3.5" /> Grant access
                    </Button>
                    {s.status === "disabled" ? (
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => act(s.id, "activate")}
                      >
                        <Power className="h-3.5 w-3.5" /> Activate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-destructive hover:bg-destructive/10"
                        onClick={() =>
                          act(s.id, "disable", "Manually disabled by owner")
                        }
                      >
                        <Lock className="h-3.5 w-3.5" /> Disable
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-muted-foreground"
                      onClick={() => act(s.id, "revokeDevice")}
                      title="Force logout from all devices"
                    >
                      <Smartphone className="h-3.5 w-3.5" /> Revoke device
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {grantFor && (
        <GrantDialog
          student={grantFor}
          courses={courses}
          onClose={() => setGrantFor(null)}
          onGranted={() => {
            setGrantFor(null);
            load();
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
// Approve-with-course dialog: the admin picks course(s) + duration when
// approving a login. Grants are created server-side so the student sees them
// the moment they verify the code.

function ApproveWithCourseDialog({
  req,
  courses,
  onClose,
  onDone,
}: {
  req: OtpReq;
  courses: { id: string; title: string; color: string | null }[];
  onClose: () => void;
  onDone: (code: string | null) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [days, setDays] = useState("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ code: string }>("/api/admin/otp", {
        method: "POST",
        body: JSON.stringify({
          requestId: req.id,
          action: "approve",
          courseIds: Array.from(selected),
          days: Number(days),
        }),
      });
      onDone(res.code);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const approveOnly = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ code: string }>("/api/admin/otp", {
        method: "POST",
        body: JSON.stringify({ requestId: req.id, action: "approve" }),
      });
      onDone(res.code);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Approve login & grant access</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{req.student.name}</span>{" "}
            — select course(s) and duration. When the student enters the code,
            these courses unlock instantly. You can also approve without
            granting.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-2 block">Select course(s) to grant</Label>
            {courses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No courses available. Create one first.
              </p>
            ) : (
              <div className="grid gap-2">
                {courses.map((c) => {
                  const on = selected.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggle(c.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                        on
                          ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30"
                          : "border-border hover:bg-accent/40",
                      )}
                    >
                      <div
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white"
                        style={{ backgroundColor: c.color || "#10b981" }}
                      >
                        {on ? <Check className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                      </div>
                      <span className="flex-1 text-sm font-medium">{c.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {selected.size > 0 && (
            <div className="space-y-2">
              <Label>Duration (days)</Label>
              <div className="flex flex-wrap gap-2">
                {[7, 15, 30, 60, 90, 180, 365].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(String(d))}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm transition",
                      days === String(d)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-accent",
                    )}
                  >
                    {d}d
                  </button>
                ))}
                <Input
                  type="number"
                  min={1}
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="w-24"
                />
              </div>
            </div>
          )}
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={approveOnly} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Approve only
          </Button>
          <Button
            onClick={submit}
            disabled={loading || selected.size === 0}
            className="gap-1.5"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Approve & grant {selected.size > 0 ? `(${selected.size} course${selected.size > 1 ? "s" : ""}, ${days}d)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active")
    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
        Active
      </Badge>
    );
  if (status === "disabled")
    return <Badge variant="destructive">Disabled</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

function GrantDialog({
  student,
  courses,
  onClose,
  onGranted,
}: {
  student: StudentRow;
  courses: { id: string; title: string }[];
  onClose: () => void;
  onGranted: () => void;
}) {
  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const [days, setDays] = useState("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await api("/api/admin/grants", {
        method: "POST",
        body: JSON.stringify({
          studentId: student.id,
          courseId,
          days: Number(days),
        }),
      });
      onGranted();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grant course access</DialogTitle>
          <DialogDescription>
            Give <span className="font-medium">{student.name}</span> access to a
            course for a set number of days. Access auto-locks when the timer
            expires.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Duration (days)</Label>
            <div className="flex flex-wrap gap-2">
              {[7, 15, 30, 60, 90, 180, 365].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(String(d))}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm transition",
                    days === String(d)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent",
                  )}
                >
                  {d}d
                </button>
              ))}
              <Input
                type="number"
                min={1}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-24"
              />
            </div>
          </div>
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading || !courseId} className="gap-1.5">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Grant {days}-day access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  color: string | null;
  published: boolean;
  sortOrder: number;
  _count?: { videos: number; grants: number };
};
type VideoRow = {
  id: string;
  title: string;
  sourceType: string;
  sourceUrl: string;
  duration: number;
  course?: { title: string; color: string | null };
};

function CoursesTab() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Load courses and videos separately so if one fails, the other still
    // loads. This prevents the whole tab from being empty if the videos API
    // has an error.
    try {
      const c = await api<{ courses: CourseRow[] }>("/api/admin/courses");
      setCourses(c.courses || []);
    } catch {
      /* ignore */
    }
    try {
      const v = await api<{ videos: VideoRow[] }>("/api/admin/videos");
      setVideos(v.videos || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const delCourse = async (id: string) => {
    if (!confirm("Delete this course and all its videos?")) return;
    await api(`/api/admin/courses?id=${id}`, { method: "DELETE" });
    load();
  };
  const delVideo = async (id: string) => {
    if (!confirm("Delete this video?")) return;
    await api(`/api/admin/videos?id=${id}`, { method: "DELETE" });
    load();
  };
  const editCourse = async (c: CourseRow) => {
    const title = prompt("Course title:", c.title);
    if (title === null) return;
    const description = prompt("Description:", c.description || "");
    if (description === null) return;
    await api("/api/admin/courses", {
      method: "PATCH",
      body: JSON.stringify({ id: c.id, title: title.trim(), description: description.trim() }),
    });
    load();
  };
  const editVideo = async (v: VideoRow) => {
    const title = prompt("Video title:", v.title);
    if (title === null) return;
    await api("/api/admin/videos", {
      method: "PATCH",
      body: JSON.stringify({ id: v.id, title: title.trim() }),
    });
    load();
  };

  if (loading)
    return (
      <div className="grid place-items-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Courses & Videos</h2>
          <p className="text-sm text-muted-foreground">
            Create courses, add videos via link or upload, and organize
            lessons.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowAddVideo(true)} className="gap-1.5">
            <Video className="h-4 w-4" /> Add video
          </Button>
          <Button size="sm" onClick={() => setShowAddCourse(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> New course
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {courses.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No courses yet. Click "New course" to create one.
            </CardContent>
          </Card>
        )}
        {courses.map((c) => {
          const open = expandedCourse === c.id;
          const vids = videos.filter(
            (v) => v.course?.title === c.title,
          );
          const videoCount = c._count?.videos ?? vids.length;
          const grantCount = c._count?.grants ?? 0;
          return (
            <Card key={c.id} className="border-border/60">
              <CardContent className="p-4">
                <button
                  onClick={() => setExpandedCourse(open ? null : c.id)}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"
                    style={{ backgroundColor: c.color || "#10b981" }}
                  >
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{c.title}</div>
                    {c.description && (
                      <div className="truncate text-sm text-muted-foreground">
                        {c.description}
                      </div>
                    )}
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Video className="h-3 w-3" />
                    {videoCount} videos
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Users className="h-3 w-3" />
                    {grantCount} students
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hover:bg-accent"
                    onClick={(e) => {
                      e.stopPropagation();
                      editCourse(c);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      delCourse(c.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </button>
                {open && (
                  <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
                    {vids.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No videos in this course yet.
                      </p>
                    ) : (
                      vids.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2"
                        >
                          {v.sourceType === "upload" ? (
                            <Upload className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <LinkIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {v.title}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {v.sourceUrl}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="hover:bg-accent"
                            onClick={() => editVideo(v)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => delVideo(v.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showAddCourse && (
        <AddCourseDialog
          onClose={() => setShowAddCourse(false)}
          onAdded={() => {
            setShowAddCourse(false);
            load();
          }}
        />
      )}
      {showAddVideo && (
        <AddVideoDialog
          courses={courses}
          onClose={() => setShowAddVideo(false)}
          onAdded={() => {
            setShowAddVideo(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function AddCourseDialog({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#10b981");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await api("/api/admin/courses", {
        method: "POST",
        body: JSON.stringify({ title, description, color }),
      });
      onAdded();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New course</DialogTitle>
          <DialogDescription>
            Create a new course to group related video lessons.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Advanced Implantology"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will students learn?"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {["#10b981", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6"].map(
                (c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition",
                      color === c ? "ring-foreground" : "ring-transparent",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ),
              )}
            </div>
          </div>
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading || !title} className="gap-1.5">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddVideoDialog({
  courses,
  onClose,
  onAdded,
}: {
  courses: CourseRow[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!courseId || !title) {
      setError("Course and title are required.");
      return;
    }
    if (!url && !file) {
      setError("Provide a video URL or upload a file.");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("courseId", courseId);
      fd.append("title", title);
      fd.append("description", description);
      if (url) fd.append("url", url);
      if (file) fd.append("file", file);
      await api("/api/admin/videos", { method: "POST", body: fd });
      onAdded();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add video</DialogTitle>
          <DialogDescription>
            Add a lesson via a direct video URL or upload a file from your
            device.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Lesson title"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Video source</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste YouTube link (youtu.be/… or watch?v=…) OR direct .mp4 URL"
            />
            <p className="text-xs text-muted-foreground">
              Tip: YouTube links are stored for free and the student will see
              them in our own branded, secure player — no YouTube branding
              visible.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex-1 border-t border-dashed border-border" />
              or upload
              <span className="flex-1 border-t border-dashed border-border" />
            </div>
            <Input
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && (
              <p className="text-xs text-emerald-600">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
              </p>
            )}
          </div>
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add video
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

type Notif = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  student: { name: string; email: string } | null;
};

function NotificationsTab() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastSeen, setLastSeen] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await api<{
        notifications: Notif[];
        unreadCount: number;
      }>("/api/admin/notifications");
      setNotifs(res.notifications);
      setUnread(res.unreadCount);
      if (res.unreadCount > lastSeen && lastSeen !== -1) {
        playNotificationSound();
      }
      setLastSeen(res.unreadCount);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [lastSeen]);

  useEffect(() => {
    setLastSeen(-1);
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  const markAll = async () => {
    await api("/api/admin/notifications", {
      method: "PATCH",
      body: JSON.stringify({ markAllRead: true }),
    });
    load();
  };

  const icon = (type: string) => {
    if (type === "violation") return ShieldAlert;
    if (type === "registered") return Users;
    if (type === "login_attempt") return KeyRound;
    if (type === "access_granted") return ShieldCheck;
    return Bell;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Live alerts</h2>
          <p className="text-sm text-muted-foreground">
            Real-time notifications with sound when students act.
          </p>
        </div>
        {unread > 0 && (
          <Button size="sm" variant="outline" onClick={markAll}>
            Mark all read
          </Button>
        )}
      </div>
      {loading ? (
        <div className="grid place-items-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : notifs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No alerts yet.
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[70vh] pr-3">
          <div className="space-y-2">
            {notifs.map((n) => {
              const Icon = icon(n.type);
              return (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 transition",
                    n.read
                      ? "border-border/40 bg-card/40"
                      : "border-emerald-500/30 bg-emerald-500/5",
                  )}
                >
                  <div
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                      n.type === "violation"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-emerald-500/10 text-emerald-600",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{n.title}</span>
                      {!n.read && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    {n.student && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {n.student.name} · {n.student.email}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(n.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function LogsTab() {
  const [data, setData] = useState<{
    logs: {
      id: string;
      action: string;
      detail: string | null;
      ip: string | null;
      createdAt: string;
      student: { name: string; email: string } | null;
    }[];
    violations: {
      id: string;
      type: string;
      detail: string | null;
      createdAt: string;
      student: { name: string; email: string } | null;
    }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api("/api/admin/logs");
        setData(res as never);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <div className="grid place-items-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="mb-2 font-semibold">Activity log</h3>
        <ScrollArea className="max-h-[70vh] pr-3">
          <div className="space-y-2">
            {data?.logs.map((l) => (
              <div
                key={l.id}
                className="rounded-lg border border-border/40 bg-card px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{l.student?.name || "—"}</span>
                  <Badge variant="outline" className="text-xs">
                    {l.action}
                  </Badge>
                </div>
                {l.detail && (
                  <p className="text-xs text-muted-foreground">{l.detail}</p>
                )}
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{timeAgo(l.createdAt)}</span>
                  {l.ip && l.ip !== "unknown" && (
                    <span>· {l.ip}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
      <div>
        <h3 className="mb-2 flex items-center gap-2 font-semibold">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          Security violations
        </h3>
        <ScrollArea className="max-h-[70vh] pr-3">
          {data?.violations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No violations recorded. 🎉
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {data?.violations.map((v) => (
                <div
                  key={v.id}
                  className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{v.student?.name || "—"}</span>
                    <Badge variant="destructive" className="text-xs">
                      {v.type}
                    </Badge>
                  </div>
                  {v.detail && (
                    <p className="text-xs text-muted-foreground">{v.detail}</p>
                  )}
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {timeAgo(v.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) {
    // future
    const f = -diff;
    if (f < 60000) return "soon";
    if (f < 3600000) return `${Math.floor(f / 60000)}m`;
    return `${Math.floor(f / 3600000)}h`;
  }
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(iso).toLocaleDateString();
}
