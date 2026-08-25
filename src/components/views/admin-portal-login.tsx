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
import { ArrowLeft, Loader2, KeyRound, ShieldCheck } from "lucide-react";

export function AdminPortalLogin() {
  const setView = useApp((s) => s.setView);
  const setAdmin = useApp((s) => s.setAdmin);
  const [secretKey, setSecretKey] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ admin: unknown }>("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ secretKey, username, password }),
      });
      setAdmin(res.admin as never);
      setView("admin-dashboard");
    } catch (err) {
      setError((err as Error).message);
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
      <Card className="glass border-border/60 shadow-2xl">
        <CardHeader className="space-y-3">
          <Brand size="md" />
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Master Admin Portal
            </CardTitle>
            <CardDescription>
              Restricted access. Enter your portal key and credentials.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="secret">Portal access key</Label>
              <Input
                id="secret"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Your secret portal key"
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="master"
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Unlock portal
            </Button>
            <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Demo access:</span>
              <br />
              Key: <code className="font-mono">dental-master-2024</code>
              <br />
              User: <code className="font-mono">master</code> · Pass:{" "}
              <code className="font-mono">Admin@Dental#2024</code>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
