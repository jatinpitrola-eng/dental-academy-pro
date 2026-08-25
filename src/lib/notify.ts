"use client";

// Plays a short notification chime using the WebAudio API (no asset needed).
let ctx: AudioContext | null = null;

export function playNotificationSound() {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;

    const notes = [
      { f: 880, t: 0 },
      { f: 1174.66, t: 0.12 },
      { f: 1567.98, t: 0.24 },
    ];
    notes.forEach(({ f, t }) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.18, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.32);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.34);
    });
  } catch {
    /* ignore */
  }
}

// Ask for browser notification permission (called on first user interaction).
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const res = await Notification.requestPermission();
    return res === "granted";
  } catch {
    return false;
  }
}

export function showBrowserNotification(title: string, body: string) {
  try {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    new Notification(title, {
      body,
      icon: "/icon-192.png",
      tag: "dental-academy",
    });
  } catch {
    /* ignore */
  }
}
