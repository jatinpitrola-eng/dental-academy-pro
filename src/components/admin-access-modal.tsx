"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck,
  Loader2,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Mail,
  Lock,
} from "lucide-react";

export function AdminAccessModal() {
  const open = useApp((s) => s.adminAccessOpen);
  const setOpen = useApp((s) => s.setAdminAccessOpen);
  const setAdmin = useApp((s) => s.setAdmin);
  const setView = useApp((s) => s.setView);
  const setTabRole = useApp((s) => s.setTabRole);

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep(1);
    setEmail("");
    setPassword("");
    setAccessCode("");
    setError(null);
    setLoading(false);
  };

  const close = () => {
    setOpen(false);
    setTimeout(reset, 200);
  };

  // Step 1: validate email + password. We don't call the login API yet — we
  // just gate the move to step 2 (access code). The actual login call happens
  // in step 2 with all three values together.
  const continueStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setStep(2);
  };

  // Step 2: submit email + password + access code to the admin login API.
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ admin: unknown }>("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          secretKey: accessCode,
        }),
      });
      setAdmin(res.admin as never);
      setTabRole("admin");
      setOpen(false);
      setTimeout(reset, 200);
      setView("admin-dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-2">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl">
            Master Admin Portal
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === 1
              ? "Step 1 of 2 — enter your admin credentials."
              : "Step 2 of 2 — enter your access code."}
          </DialogDescription>
        </DialogHeader>

        {/* progress dots */}
        <div className="flex items-center justify-center gap-2 pb-1">
          <span
            className={`h-1.5 rounded-full transition-all ${
              step === 1 ? "w-8 bg-emerald-500" : "w-4 bg-muted"
            }`}
          />
          <span
            className={`h-1.5 rounded-full transition-all ${
              step === 2 ? "w-8 bg-emerald-500" : "w-4 bg-muted"
            }`}
          />
        </div>

        {step === 1 ? (
          <form onSubmit={continueStep} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adm-email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="adm-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@dentalacademy.com"
                  required
                  autoComplete="email"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adm-password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="adm-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="pl-9"
                />
              </div>
            </div>
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full gap-2">
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adm-code">Access code</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="adm-code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Your secret access code"
                  required
                  autoComplete="off"
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This is the secret code shared by the academy owner. Without it,
                portal access is impossible.
              </p>
            </div>
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setError(null);
                }}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                type="submit"
                disabled={loading || !accessCode}
                className="flex-1 gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Unlock portal
              </Button>
            </div>
          </form>
        )}

        <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Demo access:</span>
          <br />
          Email: <code className="font-mono">owner@dentalacademy.com</code>
          <br />
          Password: <code className="font-mono">Admin@Dental#2024</code>
          <br />
          Access code: <code className="font-mono">dental-master-2024</code>
        </div>
      </DialogContent>
    </Dialog>
  );
}
