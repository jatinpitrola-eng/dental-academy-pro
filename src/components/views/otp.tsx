"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Loader2,
  KeyRound,
  Clock3,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

export function OtpView() {
  const setView = useApp((s) => s.setView);
  const requestId = useApp((s) => s.pendingRequestId);
  const setStudent = useApp((s) => s.setStudent);
  const setTabRole = useApp((s) => s.setTabRole);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);

  // Poll the request status so we can show "approved, waiting for code".
  useEffect(() => {
    if (!requestId) return;
    let active = true;
    const poll = async () => {
      try {
        const res = await api<{ status: string }>(
          `/api/auth/otp-status?id=${requestId}`,
        );
        if (!active) return;
        if (res.status === "approved") setApproved(true);
        if (res.status === "denied" || res.status === "expired") {
          setError(
            res.status === "denied"
              ? "The academy owner denied this login request."
              : "This request expired. Please start over.",
          );
        }
      } catch {
        /* ignore */
      }
    };
    const t = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [requestId]);

  if (!requestId) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <Card className="glass border-border/60">
          <CardHeader>
            <CardTitle>No active request</CardTitle>
            <CardDescription>
              Please sign in again to request a new access code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => setView("login")}>
              Back to sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ requestId, code }),
      });
      // fetch session
      const s = await api<{ user: unknown }>("/api/auth/session");
      if (s.user) {
        setStudent(s.user as never);
        setTabRole("student"); // lock this tab to student
        setView("student-dashboard");
      }
    } catch (err) {
      const e = err as Error & { data?: { pending?: boolean } };
      if (e.data?.pending)
        setError("Still waiting for the owner to approve. Please hold on.");
      else setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <button
        onClick={() => setView("login")}
        className="mb-6 inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <Card className="glass border-border/60 shadow-xl">
        <CardHeader className="space-y-3">
          <Brand size="md" />
          <div>
            <CardTitle className="text-2xl">Enter access code</CardTitle>
            <CardDescription>
              The academy owner will share a 6-digit code with you once they
              approve your login.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${
              approved
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
            }`}
          >
            {approved ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <Clock3 className="h-4 w-4 shrink-0 animate-pulse" />
            )}
            <span>
              {approved
                ? "Approved! Enter the 6-digit code the owner shared with you."
                : "Waiting for the academy owner to approve your login…"}
            </span>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">6-digit access code</Label>
              <Input
                id="code"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="••••••"
                required
                className="text-center text-2xl font-semibold tracking-[0.5em]"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Verify & sign in
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full gap-2 text-muted-foreground"
              onClick={() => setView("login")}
            >
              <RefreshCw className="h-4 w-4" />
              Start over
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
