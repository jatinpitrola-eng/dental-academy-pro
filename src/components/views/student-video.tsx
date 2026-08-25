"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { api, formatDuration, timeLeft } from "@/lib/api";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AiPanel } from "@/components/ai-panel";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Forward,
  Rewind,
  Loader2,
  Lock,
  ShieldAlert,
  Clock,
  CheckCircle2,
} from "lucide-react";

type VideoDetail = {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  sourceType: string;
  sourceUrl: string;
  youtubeId: string | null;
  course: { id: string; title: string; color: string | null };
  expiresAt: string;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: Record<string, unknown>,
      ) => YTPlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
        BUFFERING: number;
        CUED: number;
        UNSTARTED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (sec: number, allow: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  setVolume: (v: number) => void;
  mute: () => void;
  unMute: () => void;
  destroy: () => void;
}

export function StudentVideo() {
  const videoId = useApp((s) => s.activeVideoId)!;
  const student = useApp((s) => s.student)!;
  const setView = useApp((s) => s.setView);
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const htmlVideoRef = useRef<HTMLVideoElement>(null);
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ready, setReady] = useState(false);
  const [reporting, setReporting] = useState(false);

  // Load YouTube IFrame API once if needed.
  useEffect(() => {
    if (video?.youtubeId && !window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  }, [video?.youtubeId]);

  // Initialize YouTube player.
  useEffect(() => {
    if (!video?.youtubeId) return;
    let cancelled = false;

    const init = () => {
      if (!window.YT || cancelled) return;
      // Replace the placeholder div with a real YT player.
      const host = document.getElementById("yt-player-host");
      if (!host || ytPlayerRef.current) return;
      ytPlayerRef.current = new window.YT.Player("yt-player-host", {
        videoId: video.youtubeId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 0,
          controls: 0, // hide YT native controls
          disablekb: 1, // disable keyboard shortcuts
          fs: 0, // hide fullscreen button
          iv_load_policy: 3, // hide annotations
          modestbranding: 1, // minimal branding
          rel: 0, // no related videos at end
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            setReady(true);
            setDuration(ytPlayerRef.current?.getDuration() || 0);
          },
          onStateChange: (e: { data: number }) => {
            const S = window.YT!.PlayerState;
            setPlaying(e.data === S.PLAYING);
            if (e.data === S.PLAYING) {
              setDuration(ytPlayerRef.current?.getDuration() || 0);
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      init();
    } else {
      window.onYouTubeIframeAPIReady = init;
    }

    return () => {
      cancelled = true;
      try {
        ytPlayerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      ytPlayerRef.current = null;
    };
  }, [video?.youtubeId]);

  // Poll current time for the active player (YouTube or HTML5).
  useEffect(() => {
    const t = setInterval(() => {
      if (ytPlayerRef.current) {
        setCurrent(ytPlayerRef.current.getCurrentTime() || 0);
      } else if (htmlVideoRef.current) {
        setCurrent(htmlVideoRef.current.currentTime || 0);
      }
    }, 500);
    return () => clearInterval(t);
  }, []);

  // Fetch video meta.
  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ video: VideoDetail }>(
          `/api/student/videos/${videoId}`,
        );
        setVideo(res.video);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [videoId]);

  // Watermark timestamp ticker.
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const toggle = () => {
    if (ytPlayerRef.current) {
      if (playing) ytPlayerRef.current.pauseVideo();
      else {
        ytPlayerRef.current.playVideo();
        markWatched();
      }
    } else {
      const v = htmlVideoRef.current;
      if (!v) return;
      if (v.paused) {
        v.play().catch(() => {});
        markWatched();
      } else v.pause();
    }
  };

  const skip = (sec: number) => {
    if (ytPlayerRef.current) {
      const t = ytPlayerRef.current.getCurrentTime() + sec;
      ytPlayerRef.current.seekTo(Math.max(0, t), true);
    } else {
      const v = htmlVideoRef.current;
      if (!v) return;
      v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + sec));
    }
  };

  const restart = () => {
    if (ytPlayerRef.current) ytPlayerRef.current.seekTo(0, true);
    else if (htmlVideoRef.current) htmlVideoRef.current.currentTime = 0;
  };

  const reportViolation = async (type: string, detail: string) => {
    if (reporting) return;
    setReporting(true);
    try {
      await api("/api/student/violation", {
        method: "POST",
        body: JSON.stringify({ type, detail }),
      });
    } catch {
      /* ignore */
    }
    setTimeout(() => {
      window.location.href = "/";
    }, 500);
  };

  // Mark this video as watched (fire-and-forget) when playback starts.
  const markWatched = () => {
    api("/api/student/progress", {
      method: "POST",
      body: JSON.stringify({ videoId, watched: true }),
    }).catch(() => {});
  };

  if (loading)
    return (
      <div className="grid flex-1 place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  if (error || !video)
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ShieldAlert className="h-10 w-10 text-destructive" />
            <h3 className="font-semibold">Cannot play this video</h3>
            <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => setView("student-course")}>
              Back to course
            </Button>
          </CardContent>
        </Card>
      </div>
    );

  const tl = timeLeft(video.expiresAt);
  const isYouTube = !!video.youtubeId;
  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="flex w-full flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("student-course")}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold">{video.title}</h2>
            <p className="truncate text-xs text-muted-foreground">
              {video.course.title}
            </p>
          </div>
          <Badge variant={tl.expired ? "destructive" : "secondary"} className="gap-1">
            <Clock className="h-3 w-3" />
            {tl.label}
          </Badge>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="secure-zone relative aspect-video w-full overflow-hidden rounded-2xl border border-border/60 bg-black shadow-2xl">
          {/* Player host.
              - For YouTube: the YT.Player replaces #yt-player-host with an
                iframe. We overlay a transparent click-blocker + our own
                controls so the student NEVER sees YouTube's UI.
              - For direct mp4: a native <video> with no controls. */}
          {isYouTube ? (
            <div className="absolute inset-0">
              <div id="yt-player-host" className="h-full w-full" />
            </div>
          ) : (
            <video
              ref={htmlVideoRef}
              src={video.sourceUrl}
              className="secure-player absolute inset-0 h-full w-full bg-black"
              playsInline
              preload="metadata"
              controlsList="nodownload nofullscreen noremoteplayback"
              disablePictureInPicture
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onLoadedMetadata={(e) => {
                setReady(true);
                setDuration(e.currentTarget.duration);
              }}
              onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
              onContextMenu={(e) => e.preventDefault()}
            />
          )}

          {/* Watermark overlay — student identity + timestamp */}
          <div className="pointer-events-none absolute inset-0 z-10">
            {Array.from({ length: 9 }).map((_, i) => {
              const col = i % 3;
              const row = Math.floor(i / 3);
              return (
                <span
                  key={i}
                  className="wm-float absolute -rotate-[18deg] select-none whitespace-nowrap text-[11px] font-semibold text-white/30"
                  style={{
                    top: `${row * 33 + 6}%`,
                    left: `${col * 33 + 3}%`,
                  }}
                >
                  {student.name} · {student.email} ·{" "}
                  {now.toLocaleTimeString()}
                </span>
              );
            })}
          </div>

          {/* Click-blocker: prevents clicks reaching the YouTube iframe
              (which would show their UI), and shows our play overlay when paused. */}
          <div
            className="absolute inset-0 z-20"
            onContextMenu={(e) => e.preventDefault()}
            onClick={(e) => {
              // Single click toggles play/pause — but only if the click wasn't on
              // our own control bar.
              if ((e.target as HTMLElement).closest(".player-controls")) return;
              toggle();
            }}
          />

          {/* Center play overlay when paused */}
          {!playing && ready && (
            <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-black/40">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur transition-transform hover:scale-105">
                <Play className="h-8 w-8 text-white" />
              </span>
            </div>
          )}

          {/* Loading spinner */}
          {!ready && (
            <div className="absolute inset-0 z-30 grid place-items-center bg-black/60">
              <Loader2 className="h-8 w-8 animate-spin text-white/80" />
            </div>
          )}

          {/* Custom controls — play/pause + ±10s + restart only */}
          <div className="player-controls absolute inset-x-0 bottom-0 z-30 flex items-center gap-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 py-3">
            <button
              onClick={toggle}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={() => skip(-10)}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-white/20"
              aria-label="Back 10 seconds"
            >
              <Rewind className="h-5 w-5" />
            </button>
            <button
              onClick={() => skip(10)}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-white/20"
              aria-label="Forward 10 seconds"
            >
              <Forward className="h-5 w-5" />
            </button>
            <div className="flex-1" />
            <span className="text-xs font-medium tabular-nums text-white/90">
              {formatDuration(current)} / {formatDuration(duration)}
            </span>
            <button
              onClick={restart}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-white/20"
              aria-label="Restart"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* video info + security notice */}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Card className="sm:col-span-2 border-border/60">
            <CardContent className="p-5">
              <h1 className="text-lg font-semibold">{video.title}</h1>
              {video.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {video.description}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                  <Lock className="h-3 w-3" /> No download
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                  <Forward className="h-3 w-3" /> 10s skip only
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                  <Clock className="h-3 w-3" /> {tl.label}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-5">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">
                    Protected content
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Screenshots, screen recording, downloads, forwarding and
                    dev-tools are all blocked. Any attempt disables your
                    account instantly.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI panel — Summary, Ask AI, Quiz, Notes */}
        <AiPanel videoId={video.id} />
      </section>
    </div>
  );
}
