"use client";

import { useEffect, useState } from "react";
import { Download, X, Smartphone, Monitor } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Already installed? Don't show.
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Show button after 15s (after intro finishes).
    const showTimer = setTimeout(() => setShowButton(true), 15000);

    // Capture the native install prompt — we'll trigger it on button click.
    const handler = (e: Event) => {
      e.preventDefault(); // Prevent default browser prompt.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install.
    const installedHandler = () => {
      setIsInstalled(true);
      setShowButton(false);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      clearTimeout(showTimer);
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  // ONE-CLICK INSTALL: click button → immediately trigger native install.
  // No popup, no instructions, no extra step. Just install.
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Native prompt available — trigger it directly.
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setShowButton(false);
      }
      setDeferredPrompt(null);
    } else {
      // No native prompt (iOS Safari, etc.) — show instructions.
      setShowInstructions(true);
    }
  };

  if (isInstalled || !showButton) return null;

  return (
    <>
      {/* Floating install button — RIGHT SIDE, always visible */}
      <button
        onClick={handleInstallClick}
        className="fixed right-3 top-1/2 z-[9998] -translate-y-1/2 flex flex-col items-center gap-1.5 rounded-2xl border border-emerald-500/30 bg-card/90 p-3 shadow-2xl backdrop-blur-xl transition-all hover:scale-110 hover:border-emerald-500/50 active:scale-95"
        title="Install App"
      >
        {/* Pulsing indicator */}
        <span className="absolute -right-1 -top-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
        </span>

        {/* Download icon */}
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
          <Download className="h-6 w-6" />
        </div>

        {/* Label */}
        <span className="text-[10px] font-semibold text-emerald-600">
          Install
        </span>
      </button>

      {/* Instructions modal — ONLY for iOS Safari (no native prompt) */}
      {showInstructions && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowInstructions(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">Install App</h3>
              <button
                onClick={() => setShowInstructions(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Android */}
            <div className="mb-3 rounded-xl border border-border/60 bg-muted/30 p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <Smartphone className="h-4 w-4 text-emerald-500" />
                Android (Chrome)
              </div>
              <ol className="ml-6 list-decimal space-y-1 text-xs text-muted-foreground">
                <li>Tap <strong>⋮ menu</strong> (top-right)</li>
                <li>Tap <strong>"Install app"</strong></li>
              </ol>
            </div>

            {/* iPhone */}
            <div className="mb-3 rounded-xl border border-border/60 bg-muted/30 p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <Smartphone className="h-4 w-4 text-emerald-500" />
                iPhone (Safari)
              </div>
              <ol className="ml-6 list-decimal space-y-1 text-xs text-muted-foreground">
                <li>Tap <strong>Share button</strong> (⬆️)</li>
                <li>Tap <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>"Add"</strong></li>
              </ol>
            </div>

            {/* Desktop */}
            <div className="mb-4 rounded-xl border border-border/60 bg-muted/30 p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <Monitor className="h-4 w-4 text-emerald-500" />
                Desktop (Chrome/Edge)
              </div>
              <ol className="ml-6 list-decimal space-y-1 text-xs text-muted-foreground">
                <li>Click <strong>install icon (⊕)</strong> in address bar</li>
                <li>Click <strong>"Install"</strong></li>
              </ol>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
