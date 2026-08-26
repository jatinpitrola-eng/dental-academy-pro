"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (running in standalone mode).
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user previously dismissed the banner.
    const dismissed = sessionStorage.getItem("pwa_install_dismissed");
    if (dismissed === "1") return;

    // Listen for the beforeinstallprompt event.
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show banner after 3 seconds (let the page load first).
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install.
    const installedHandler = () => {
      setIsInstalled(true);
      setShowBanner(false);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Fallback: show instructions for manual install.
      alert(
        "To install the app:\n\n" +
        "📱 Android (Chrome):\n" +
        "1. Tap the ⋮ menu (top-right)\n" +
        "2. Tap 'Install app' or 'Add to Home screen'\n\n" +
        "🍎 iPhone (Safari):\n" +
        "1. Tap the Share button (⬆️)\n" +
        "2. Tap 'Add to Home Screen'\n\n" +
        "💻 Desktop (Chrome/Edge):\n" +
        "1. Click the install icon (⊕) in the address bar\n" +
        "2. Click 'Install'"
      );
      return;
    }

    // Trigger the native install prompt.
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
    sessionStorage.setItem("pwa_install_dismissed", "1");
  };

  if (isInstalled || !showBanner) return null;

  return (
    <>
      {/* Mobile bottom sheet style */}
      <div className="fixed inset-x-0 bottom-0 z-[9998] animate-in slide-in-from-bottom sm:hidden">
        <div className="m-3 rounded-2xl border border-emerald-500/30 bg-card p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <Smartphone className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">Install Dental Academy</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Add to your home screen for a native app experience. Works
                offline, full screen, no browser bars.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Button
            onClick={handleInstall}
            className="mt-3 w-full gap-2"
            size="sm"
          >
            <Download className="h-4 w-4" />
            Install App
          </Button>
        </div>
      </div>

      {/* Desktop banner */}
      <div className="fixed right-4 top-20 z-[9998] hidden max-w-sm animate-in slide-in-from-right sm:block">
        <div className="rounded-2xl border border-emerald-500/30 bg-card p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <Download className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">Install Dental Academy Pro</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Install as a desktop app for quick access, offline support,
                and a distraction-free learning experience.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Button
            onClick={handleInstall}
            className="mt-3 w-full gap-2"
            size="sm"
          >
            <Download className="h-4 w-4" />
            Install Now
          </Button>
        </div>
      </div>
    </>
  );
}
