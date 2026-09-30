"use client";

import { useApp } from "@/lib/store";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
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
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt: () => Promise<void> } | null>(null);
  const [content, setContent] = useState<Record<string, string>>({});

  // Fetch editable content from DB.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/content");
        const data = await res.json();
        if (data.content) setContent(data.content);
      } catch { /* use defaults */ }
    })();
  }, []);

  // Capture the native install prompt as soon as it's available.
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as unknown as { prompt: () => Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      setDeferredPrompt(null);
    }
  };

  // Helper: get content value or default.
  const c = (key: string, fallback: string) => content[key] || fallback;

  // Extract YouTube channel ID from URL.
  const ytUrl = c("landingVideoUrl", "https://youtube.com/@wethedentist");
  const ytChannelId = ytUrl.match(/UC[a-zA-Z0-9_-]{22}/)?.[0] || "UCEh0pmdPkVXylmDsCo6EXyA";

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
              c("heroBadge", "Secure · Device-bound · Time-limited")
            </div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              c("heroTitle", "Master dentistry with protected video courses.")
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

          {/* visual card — YouTube channel embed */}
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
                  {c("landingVideoTitle", "We The Dentist")} · YouTube
                </span>
              </div>
              {/* YouTube channel embed — no branding visible to user */}
              <div className="relative aspect-video overflow-hidden bg-black">
                <iframe
                  src={`https://www.youtube.com/embed?listType=user_uploads&list=${ytChannelId}&autoplay=0&controls=1&modestbranding=1&rel=0&showinfo=0`}
                  className="absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2"
                  style={{ pointerEvents: "none" }}
                  allow="autoplay; encrypted-media"
                  title={c("landingVideoTitle", "We The Dentist")}
                />
              </div>
              <div className="space-y-2 px-4 py-4">
                <div className="text-sm font-semibold">
                  {c("landingVideoTitle", "We The Dentist Channel")}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>c("landingVideoSub", "Latest dental tutorials")</span>
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <ShieldCheck className="h-3.5 w-3.5" /> YouTube
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

        {/* DOWNLOAD APP SECTION */}
        <div className="mt-20 overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-6 sm:p-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <Download className="h-8 w-8" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl font-bold">{c("downloadTitle", "Download the App")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Install Dental Academy Pro on your phone or computer for quick
                access, full screen experience, and offline support.
              </p>
            </div>
            <button
              onClick={handleInstall}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <Download className="h-4 w-4" />
              {c("downloadBtn", "Download Now")}
            </button>
          </div>
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
            c("ctaTitle", "Ready to start learning?")
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
    title: c("feature1Title", "Protected video player"),
    desc: c("feature1Desc", "Play/pause and 10-second skip only. No seeking, no downloads, no screen capture."),
  },
  {
    icon: Fingerprint,
    title: c("feature2Title", "Single device login"),
    desc: c("feature2Desc", "Your account is bound to one device. Logging in elsewhere is blocked automatically."),
  },
  {
    icon: Clock,
    title: c("feature3Title", "Time-limited access"),
    desc: c("feature3Desc", "Each course unlocks for a set number of days, then auto-locks — fully controlled by the owner."),
  },
  {
    icon: Lock,
    title: c("feature4Title", "Screenshot detection"),
    desc: c("feature4Desc", "Capture attempts are detected and the account is disabled instantly until the owner reactivates it."),
  },
  {
    icon: Bell,
    title: c("feature5Title", "Live admin alerts"),
    desc: c("feature5Desc", "The academy owner is notified with sound the moment you register or request access."),
  },
  {
    icon: ShieldCheck,
    title: c("feature6Title", "OTP-gated login"),
    desc: c("feature6Desc", "Every login needs a one-time code that only the owner can generate and share with you."),
  },
];

const STEPS = [
  {
    title: c("step1Title", "Pay offline"),
    desc: c("step1Desc", "Complete payment directly with your academy — outside the app."),
  },
  {
    title: c("step2Title", "Register"),
    desc: c("step2Desc", "Create your student account with email and password."),
  },
  {
    title: c("step3Title", "Owner approves"),
    desc: c("step3Desc", "The owner receives a live alert and shares a 6-digit access code with you."),
  },
  {
    title: c("step4Title", "Start watching"),
    desc: c("step4Desc", "Enter the code, get device-bound access, and learn securely."),
  },
];
