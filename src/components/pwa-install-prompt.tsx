"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone, Monitor } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Check if already installed.
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed it permanently.
    const dismissed = localStorage.getItem("pwa_install_dismissed");
    if (dismissed === "1") return;

    // Show banner after 2 seconds (let page load).
    const showTimer = setTimeout(() => setShowBanner(true), 2000);

    // Listen for beforeinstallprompt.
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install.
    const installedHandler = () => {
      setIsInstalled(true);
      setShowBanner(false);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      clearTimeout(showTimer);
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // No native prompt available — show instructions.
      setShowInstructions(true);
      return;
    }
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa_install_dismissed", "1");
  };

  if (isInstalled) return null;
  if (!showBanner) return null;

  return (
    <>
      {/* Floating side button — always visible on the right side */}
      <div className="fixed right-3 top-1/2 z-[9998] -translate-y-1/2">
        <div className="relative">
          {/* Pulsing dot indicator */}
          <span className="absolute -right-1 -top-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
          </span>

          {/* Main install button */}
          <button
            onClick={() => setShowBanner(true)}
            className="group flex flex-col items-center gap-1 rounded-2xl border border-emerald-500/30 bg-card/90 p-3 shadow-2xl backdrop-blur-xl transition-all hover:scale-105 hover:border-emerald-500/50"
            title="Install App"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
              <Download className="h-5 w-5" />
            </div>
            <span className="text-[9px] font-medium text-muted-foreground">
              Install
            </span>
          </button>
        </div>
      </div>

      {/* Expanded popup when clicked */}
      {showBanner && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 sm:bg-transparent sm:p-0"
          onClick={() => setShowBanner(false)}
        >
          <div
            className="w-full max-w-xs rounded-3xl border border-emerald-500/30 bg-card p-5 shadow-2xl sm:absolute sm:right-20 sm:top-1/2 sm:-translate-y-1/2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setShowBanner(false)}
              className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Icon */}
            <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
              <Download className="h-7 w-7" />
            </div>

            {/* Title */}
            <h3 className="text-base font-bold">Install Dental Academy Pro</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Download the app on your device for:
            </p>

            {/* Benefits */}
            <ul className="mt-3 space-y-1.5">
              <li className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-emerald-500">✓</span> Quick access from home screen
              </li>
              <li className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-emerald-500">✓</span> Full screen, no browser bars
              </li>
              <li className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-emerald-500">✓</span> Works like a native app
              </li>
              <li className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-emerald-500">✓</span> Faster loading
              </li>
            </ul>

            {/* Install button */}
            <Button
              onClick={handleInstall}
              className="mt-4 w-full gap-2"
            >
              <Download className="h-4 w-4" />
              Install Now
            </Button>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              Don't show again
            </button>
          </div>
        </div>
      )}

      {/* Instructions modal (fallback) */}
      {showInstructions && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowInstructions(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">Install Instructions</h3>
              <button
                onClick={() => setShowInstructions(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Android instructions */}
            <div className="mb-4 rounded-xl border border-border/60 bg-muted/30 p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <Smartphone className="h-4 w-4 text-emerald-500" />
                Android (Chrome)
              </div>
              <ol className="ml-6 list-decimal space-y-1 text-xs text-muted-foreground">
                <li>Tap the <strong>⋮ menu</strong> (top-right)</li>
                <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></li>
                <li>Tap <strong>"Install"</strong></li>
              </ol>
            </div>

            {/* iPhone instructions */}
            <div className="mb-4 rounded-xl border border-border/60 bg-muted/30 p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <Smartphone className="h-4 w-4 text-emerald-500" />
                iPhone (Safari)
              </div>
              <ol className="ml-6 list-decimal space-y-1 text-xs text-muted-foreground">
                <li>Tap the <strong>Share button</strong> (⬆️ at bottom)</li>
                <li>Scroll down → tap <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>"Add"</strong></li>
              </ol>
            </div>

            {/* Desktop instructions */}
            <div className="mb-4 rounded-xl border border-border/60 bg-muted/30 p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <Monitor className="h-4 w-4 text-emerald-500" />
                Desktop (Chrome/Edge)
              </div>
              <ol className="ml-6 list-decimal space-y-1 text-xs text-muted-foreground">
                <li>Click the <strong>install icon (⊕)</strong> in the address bar</li>
                <li>Click <strong>"Install"</strong></li>
              </ol>
            </div>

            <Button
              onClick={() => setShowInstructions(false)}
              className="w-full"
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
