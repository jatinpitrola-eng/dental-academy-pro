"use client";

import { useEffect, useState } from "react";
import { Download, ShieldCheck } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showSection, setShowSection] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  // ONE-CLICK INSTALL: click → directly install. No instructions, no popup.
  const handleInstall = async () => {
    if (installing) return;
    setInstalling(true);

    if (deferredPrompt) {
      // Native prompt available — trigger directly.
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setShowSection(false);
      }
      setDeferredPrompt(null);
    } else {
      // iOS Safari — no native prompt.
      alert("To install:\n\nTap the Share button (⬆️) at the bottom of Safari\n→ 'Add to Home Screen' → 'Add'");
    }
    setInstalling(false);
  };

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Show section after 15s (after intro finishes).
    const showTimer = setTimeout(() => setShowSection(true), 15000);

    // Capture native install prompt.
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for custom trigger from landing page "Download Now" button.
    const triggerHandler = () => {
      handleInstall();
    };
    window.addEventListener("trigger-pwa-install", triggerHandler);

    const installedHandler = () => {
      setIsInstalled(true);
      setShowSection(false);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      clearTimeout(showTimer);
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("trigger-pwa-install", triggerHandler);
      window.removeEventListener("appinstalled", installedHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredPrompt]);

  if (isInstalled || !showSection) return null;

  return (
    <>
      {/* Floating side button */}
      <button
        onClick={handleInstall}
        disabled={installing}
        className="fixed right-3 top-1/2 z-[9998] -translate-y-1/2 flex flex-col items-center gap-1.5 rounded-2xl border border-emerald-500/30 bg-card/90 p-3 shadow-2xl backdrop-blur-xl transition-all hover:scale-110 hover:border-emerald-500/50 active:scale-95 disabled:opacity-50"
        title="Install App"
      >
        <span className="absolute -right-1 -top-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
        </span>
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
          <Download className="h-6 w-6" />
        </div>
        <span className="text-[10px] font-semibold text-emerald-600">Install</span>
      </button>

      {/* Download section on the page — below security notice */}
      <div className="mx-auto mt-6 w-full max-w-2xl px-4">
        <div className="overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-6">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            {/* Icon */}
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <Download className="h-7 w-7" />
            </div>

            {/* Text */}
            <div className="flex-1">
              <h3 className="text-lg font-bold">Download App</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Install Dental Academy Pro on your device for quick access, full
                screen experience, and offline support.
              </p>
            </div>

            {/* Button */}
            <button
              onClick={handleInstall}
              disabled={installing}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {installing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Installing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
