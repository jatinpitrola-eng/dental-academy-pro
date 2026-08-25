"use client";

import { useApp } from "@/lib/store";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Lock,
  Smartphone,
  Clock,
  Video,
  Bell,
  Fingerprint,
  GraduationCap,
  PlayCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export function LandingView() {
  const setView = useApp((s) => s.setView);

  return (
    <div className="relative overflow-hidden">
      {/* top nav */}
      <header className="sticky top-0 z-30 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <Brand />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("login")}
              className="text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Button>
            <Button size="sm" onClick={() => setView("register")} className="gap-1.5">
              Get access
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Secure · Device-bound · Time-limited
            </div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Master dentistry with{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                protected
              </span>{" "}
              video courses.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              A premium learning platform built for dental academies. Every
              lecture is encrypted, watermarked, and locked to a single device —
              so your content stays yours. Pay offline, get access online,
              learn on your schedule.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={() => setView("register")} className="gap-2">
                <GraduationCap className="h-5 w-5" />
                Create student account
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setView("login")}
                className="gap-2"
              >
                <PlayCircle className="h-5 w-5" />
                I already have access
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-emerald-500" /> No downloads
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-emerald-500" /> One device login
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-emerald-500" /> Auto-locking access
              </span>
            </div>
          </div>

          {/* visual card */}
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-transparent blur-2xl" />
            <div className="glass overflow-hidden rounded-3xl border border-border/60 shadow-2xl shadow-emerald-900/5">
              <div className="flex items-center gap-2 border-b border-border/50 bg-card/60 px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="ml-2 text-xs text-muted-foreground">
                  secure-player · live
                </span>
              </div>
              <div className="relative aspect-video bg-gradient-to-br from-emerald-950 to-slate-900">
                <div className="absolute inset-0 grid place-items-center">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur">
                    <PlayCircle className="h-9 w-9 text-white" />
                  </div>
                </div>
                {/* floating watermark grid */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <span
                    key={i}
                    className="wm-float absolute -rotate-12 select-none text-[10px] font-medium text-white/30"
                    style={{
                      top: `${(i % 4) * 25 + 8}%`,
                      left: `${Math.floor(i / 4) * 33 + 5}%`,
                    }}
                  >
                    Dr. Mehta · 9876 · 2:14PM
                  </span>
                ))}
                {/* fake controls */}
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
                  <PlayCircle className="h-6 w-6 text-white" />
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                    <div className="h-full w-1/3 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-xs font-medium tabular-nums text-white/80">
                    +10s
                  </span>
                </div>
              </div>
              <div className="space-y-2 px-4 py-4">
                <div className="text-sm font-semibold">
                  Rotary Instrumentation Technique
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Modern Endodontics</span>
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <ShieldCheck className="h-3.5 w-3.5" /> Protected
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* feature grid */}
        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border/60 bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5"
            >
              <div className="mb-3 inline-grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* how it works */}
        <div className="mt-20">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              How access works
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              Simple, secure and fully controlled by your academy owner.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="relative rounded-2xl border border-border/60 bg-card p-5"
              >
                <div className="mb-3 text-3xl font-bold text-emerald-500/30">
                  {i + 1}
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* cta */}
        <div className="mt-20 overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to start learning?
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
            Register your account. Once the academy owner grants you access,
            you can start watching instantly.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={() => setView("register")} className="gap-2">
              <GraduationCap className="h-5 w-5" />
              Register now
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setView("login")}
            >
              Sign in
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

const FEATURES = [
  {
    icon: Video,
    title: "Protected video player",
    desc: "Play/pause and 10-second skip only. No seeking, no downloads, no screen capture.",
  },
  {
    icon: Fingerprint,
    title: "Single device login",
    desc: "Your account is bound to one device. Logging in elsewhere is blocked automatically.",
  },
  {
    icon: Clock,
    title: "Time-limited access",
    desc: "Each course unlocks for a set number of days, then auto-locks — fully controlled by the owner.",
  },
  {
    icon: Lock,
    title: "Screenshot detection",
    desc: "Capture attempts are detected and the account is disabled instantly until the owner reactivates it.",
  },
  {
    icon: Bell,
    title: "Live admin alerts",
    desc: "The academy owner is notified with sound the moment you register or request access.",
  },
  {
    icon: ShieldCheck,
    title: "OTP-gated login",
    desc: "Every login needs a one-time code that only the owner can generate and share with you.",
  },
];

const STEPS = [
  {
    title: "Pay offline",
    desc: "Complete payment directly with your academy — outside the app.",
  },
  {
    title: "Register",
    desc: "Create your student account with email and password.",
  },
  {
    title: "Owner approves",
    desc: "The owner receives a live alert and shares a 6-digit access code with you.",
  },
  {
    title: "Start watching",
    desc: "Enter the code, get device-bound access, and learn securely.",
  },
];
