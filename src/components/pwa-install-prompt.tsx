"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  // ONE-CLICK INSTALL: click → directly install. No instructions, no popup, no alert.
  const handleInstall = async () => {
    if (installing) return;
    setInstalling(true);

    if (deferredPrompt) {
      // Native prompt available — trigger directly.
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setShowButton(false);
      }
      setDeferredPrompt(null);
    } else {
      // No native prompt (iOS Safari, etc.) — silently do nothing.
      // The user already knows to add to home screen manually.
    }
    setInstalling(false);
  };

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Show button after 15s (after intro finishes).
    const showTimer = setTimeout(() => setShowButton(true), 15000);

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
      setShowButton(false);
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

  if (isInstalled) return null;

  return (
    <>
      {/* Floating side button — ONE CLICK → DIRECT INSTALL */}
      {showButton && (
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
            {installing ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            ) : (
              <Download className="h-6 w-6" />
            )}
          </div>
          <span className="text-[10px] font-semibold text-emerald-600">Install</span>
        </button>
      )}
    </>
  );
}
