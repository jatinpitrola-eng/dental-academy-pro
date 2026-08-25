"use client";

import { useState } from "react";
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
import { ArrowLeft, Loader2, LogIn, ShieldAlert } from "lucide-react";

export function LoginView() {
  const setView = useApp((s) => s.setView);
  const setPendingRequestId = useApp((s) => s.setPendingRequestId);
  const setTabRole = useApp((s) => s.setTabRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDisabled(false);
    setLoading(true);
    try {
      const res = await api<{ requestId: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setPendingRequestId(res.requestId);
      setTabRole("student"); // lock this tab to the student role
      setView("otp");
    } catch (err) {
      const e = err as Error & { data?: { disabled?: boolean } };
      setError(e.message);
      if (e.data?.disabled) setDisabled(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <button
        onClick={() => setView("landing")}
        className="mb-6 inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to home
      </button>
      <Card className="glass border-border/60 shadow-xl">
        <CardHeader className="space-y-3">
          <Brand size="md" />
          <div>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in to access your protected courses.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div
                className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                  disabled
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {disabled && <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />}
                <span>{error}</span>
              </div>
            )}
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              Request access code
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              New here?{" "}
              <button
                type="button"
                onClick={() => setView("register")}
                className="font-medium text-primary hover:underline"
              >
                Create an account
              </button>
            </p>
            <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Tip:</span> Try the
              demo student — <code className="font-mono">demo@student.com</code>{" "}
              / <code className="font-mono">student123</code>. The academy owner
              can access the admin panel by clicking the logo 5 times.
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
