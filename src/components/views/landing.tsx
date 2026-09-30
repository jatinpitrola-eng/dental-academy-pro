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

const DEFAULTS: Record<string, string> = {
  heroBadge: "Secure · Device-bound · Time-limited",
  heroTitle: "Master dentistry with protected video courses.",
  heroSubtitle:
    "A premium learning platform built for dental academies. Every lecture is encrypted, watermarked, and locked to a single device — so your content stays yours. Pay offline, get access online, learn on your schedule.",
  heroBtn1: "Create student account",
  heroBtn2: "I already have access",
  heroChip1: "No downloads",
  heroChip2: "One device login",
  heroChip3: "Auto-locking access",
  landingVideoUrl: "https://youtube.com/@wethedentist",
  landingVideoTitle: "We The Dentist",
  landingVideoSub: "Latest dental tutorials",
  downloadTitle: "Download the App",
  downloadDesc:
    "Install Dental Academy Pro on your phone or computer for quick access, full screen experience, and offline support.",
  downloadBtn: "Download Now",
  ctaTitle: "Ready to start learning?",
  ctaDesc:
    "Register your account. Once the academy owner grants you access, you can start watching instantly.",
  ctaBtn1: "Register now",
  ctaBtn2: "Sign in",
  howTitle: "How access works",
  howDesc: "Simple, secure and fully controlled by your academy owner.",
  feature1Title: "Protected video player",
  feature1Desc:
    "Play/pause and 10-second skip only. No seeking, no downloads, no screen capture.",
  feature2Title: "Single device login",
  feature2Desc:
    "Your account is bound to one device. Logging in elsewhere is blocked automatically.",
  feature3Title: "Time-limited access",
  feature3Desc:
    "Each course unlocks for a set number of days, then auto-locks — fully controlled by the owner.",
  feature4Title: "Screenshot detection",
  feature4Desc:
    "Capture attempts are detected and the account is disabled instantly until the owner reactivates it.",
  feature5Title: "Live admin alerts",
  feature5Desc:
    "The academy owner is notified with sound the moment you register or request access.",
  feature6Title: "OTP-gated login",
  feature6Desc:
    "Every login needs a one-time code that only the owner can generate and share with you.",
  step1Title: "Pay offline",
  step1Desc: "Complete payment directly with your academy — outside the app.",
  step2Title: "Register",
  step2Desc: "Create your student account with email and password.",
  step3Title: "Owner approves",
  step3Desc:
    "The owner receives a live alert and shares a 6-digit access code with you.",
  step4Title: "Start watching",
  step4Desc: "Enter the code, get device-bound access, and learn securely.",
};

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
      } catch {
        /* use defaults */
      }
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
  const c = (key: string): string => content[key] || DEFAULTS[key] || "";

  // Build feature + step lists inside the component so `c` is in scope.
  const features = [
    { icon: Video, title: c("feature1Title"), desc: c("feature1Desc") },
    { icon: Fingerprint, title: c("feature2Title"), desc: c("feature2Desc") },
    { icon: Clock, title: c("feature3Title"), desc: c("feature3Desc") },
    { icon: Lock, title: c("feature4Title"), desc: c("feature4Desc") },
    { icon: Bell, title: c("feature5Title"), desc: c("feature5Desc") },
    { icon: ShieldCheck, title: c("feature6Title"), desc: c("feature6Desc") },
  ];

  const steps = [
    { title: c("step1Title"), desc: c("step1Desc") },
    { title: c("step2Title"), desc: c("step2Desc") },
    { title: c("step3Title"), desc: c("step3Desc") },
    { title: c("step4Title"), desc: c("step4Desc") },
  ];

  // Extract YouTube channel ID from URL.
  const ytUrl = c("landingVideoUrl");
  const ytChannelId =
    ytUrl.match(/UC[a-zA-Z0-9_-]{22}/)?.[0] || "UCEh0pmdPkVXylmDsCo6EXyA";
  const videoTitle = c("landingVideoTitle");

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
              {c("heroBadge")}
            </div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              {c("heroTitle")}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {c("heroSubtitle")}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={() => setView("register")} className="gap-2">
                <GraduationCap className="h-5 w-5" />
                {c("heroBtn1")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setView("login")}
                className="gap-2"
              >
                <PlayCircle className="h-5 w-5" />
                {c("heroBtn2")}
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-emerald-500" /> {c("heroChip1")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-emerald-500" /> {c("heroChip2")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-emerald-500" /> {c("heroChip3")}
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
                  {videoTitle} · YouTube
                </span>
              </div>
              {/* YouTube channel embed — no branding visible to user */}
              <div className="relative aspect-video overflow-hidden bg-black">
                <iframe
                  src={`https://www.youtube.com/embed?listType=user_uploads&list=${ytChannelId}&autoplay=0&controls=1&modestbranding=1&rel=0&showinfo=0`}
                  className="absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2"
                  style={{ pointerEvents: "none" }}
                  allow="autoplay; encrypted-media"
                  title={videoTitle}
                />
              </div>
              <div className="space-y-2 px-4 py-4">
                <div className="text-sm font-semibold">
                  {videoTitle}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{c("landingVideoSub")}</span>
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
          {features.map((f) => (
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
              <h3 className="text-xl font-bold">{c("downloadTitle")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {c("downloadDesc")}
              </p>
            </div>
            <button
              onClick={handleInstall}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <Download className="h-4 w-4" />
              {c("downloadBtn")}
            </button>
          </div>
        </div>

        {/* how it works */}
        <div className="mt-20">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {c("howTitle")}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              {c("howDesc")}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {steps.map((s, i) => (
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
            {c("ctaTitle")}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
            {c("ctaDesc")}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={() => setView("register")} className="gap-2">
              <GraduationCap className="h-5 w-5" />
              {c("ctaBtn1")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setView("login")}
            >
              {c("ctaBtn2")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
