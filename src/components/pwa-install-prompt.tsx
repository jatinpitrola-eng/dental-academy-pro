"use client";

import { useEffect, useState } from "react";
import { Download, X, Smartphone, Monitor, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

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
      // No native prompt — show fallback modal with instructions.
      setShowFallback(true);
    }
    setInstalling(false);
  };

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Show button after 3 seconds (not 15).
    const showTimer = setTimeout(() => setShowButton(true), 3000);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for custom trigger from landing page.
    const triggerHandler = () => handleInstall();
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
     
  }, [deferredPrompt]);

  if (isInstalled) return null;

  // Detect device type for fallback instructions.
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isInAppBrowser = /whatsapp|instagram|fbav|facebook/i.test(ua);

  return (
    <>
      {/* Floating install button — BOTTOM RIGHT (doesn't overlap forms) */}
      {showButton && (
        <button
          onClick={handleInstall}
          disabled={installing}
          className="fixed bottom-24 right-3 z-[9998] flex flex-col items-center gap-1.5 rounded-2xl border border-emerald-500/30 bg-card/90 p-3 shadow-2xl backdrop-blur-xl transition-all hover:scale-110 hover:border-emerald-500/50 active:scale-95 disabled:opacity-50"
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

      {/* Fallback modal — shown when no native install prompt */}
      {showFallback && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowFallback(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">Install App</h3>
              <button
                onClick={() => setShowFallback(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* In-app browser warning */}
            {isInAppBrowser && (
              <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                <strong>Open in Chrome first:</strong> You're inside an in-app
                browser (WhatsApp/Instagram/Facebook). Tap the menu and select
                "Open in Chrome" or "Open in browser", then come back and tap
                Install.
              </div>
            )}

            {/* iOS Safari */}
            {isIOS && !isInAppBrowser && (
              <div className="mb-4 rounded-xl border border-border/60 bg-muted/30 p-3">
                <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                  <Share className="h-4 w-4 text-emerald-500" />
                  iPhone / iPad (Safari)
                </div>
                <ol className="ml-6 list-decimal space-y-1 text-xs text-muted-foreground">
                  <li>Tap the <strong>Share button</strong> (⬆️ at bottom)</li>
                  <li>Scroll down → <strong>"Add to Home Screen"</strong></li>
                  <li>Tap <strong>"Add"</strong></li>
                </ol>
              </div>
            )}

            {/* Android */}
            {isAndroid && !isInAppBrowser && (
              <div className="mb-4 rounded-xl border border-border/60 bg-muted/30 p-3">
                <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                  <Smartphone className="h-4 w-4 text-emerald-500" />
                  Android (Chrome)
                </div>
                <ol className="ml-6 list-decimal space-y-1 text-xs text-muted-foreground">
                  <li>Tap the <strong>⋮ menu</strong> (top-right)</li>
                  <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></li>
                </ol>
              </div>
            )}

            {/* Desktop */}
            {!isIOS && !isAndroid && !isInAppBrowser && (
              <div className="mb-4 rounded-xl border border-border/60 bg-muted/30 p-3">
                <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                  <Monitor className="h-4 w-4 text-emerald-500" />
                  Desktop (Chrome / Edge)
                </div>
                <ol className="ml-6 list-decimal space-y-1 text-xs text-muted-foreground">
                  <li>Click the <strong>install icon (⊕)</strong> in the address bar</li>
                  <li>Click <strong>"Install"</strong></li>
                </ol>
              </div>
            )}

            {/* Generic fallback if none matched */}
            {!isIOS && !isAndroid && !isInAppBrowser && (
              <p className="mb-4 text-xs text-muted-foreground">
                Or use your browser menu → "Install app" / "Add to Home screen".
              </p>
            )}

            <button
              onClick={() => setShowFallback(false)}
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
