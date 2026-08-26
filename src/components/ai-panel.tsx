"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Bot,
  Sparkles,
  Brain,
  StickyNote,
  Send,
  Loader2,
  RefreshCw,
  Trash2,
  Plus,
  CheckCircle2,
  XCircle,
  RotateCcw,
  FileText,
  Clock,
  AlertCircle,
  Mic,
  Square,
  Volume2,
  VolumeX,
  Copy,
  Check,
} from "lucide-react";

type SummaryData = {
  summary: string;
  keyPoints: string[];
  transcript: string | null;
  autoNotes?: string;
  cached: boolean;
};

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type Quiz = {
  questions: {
    q: string;
    options: string[];
    answer: number;
    explanation: string;
  }[];
};

type Note = {
  id: string;
  content: string;
  createdAt: string;
};

export function AiPanel({ videoId }: { videoId: string }) {
  return (
    <div className="mt-4">
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary" className="gap-1.5 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Summary</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-1.5 text-xs sm:text-sm">
            <Bot className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ask AI</span>
          </TabsTrigger>
          <TabsTrigger value="quiz" className="gap-1.5 text-xs sm:text-sm">
            <Brain className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Quiz</span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5 text-xs sm:text-sm">
            <StickyNote className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Notes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <SummaryTab videoId={videoId} />
        </TabsContent>
        <TabsContent value="chat" className="mt-4">
          <ChatTab videoId={videoId} />
        </TabsContent>
        <TabsContent value="quiz" className="mt-4">
          <QuizTab videoId={videoId} />
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <NotesTab videoId={videoId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Summary ---------------- */

function SummaryTab({ videoId }: { videoId: string }) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<SummaryData>(`/api/student/videos/${videoId}/summary`);
      setData(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [videoId]);

  if (loading)
    return (
      <div className="grid place-items-center py-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm text-muted-foreground">
            Dr. Sage is analyzing this lesson…
          </p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="grid place-items-center py-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button size="sm" variant="outline" onClick={load} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    );

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-medium">AI-Generated Summary</span>
          {data.cached ? (
            <Badge variant="secondary" className="text-xs">cached</Badge>
          ) : (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs">fresh</Badge>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={load} className="gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> Regenerate
        </Button>
      </div>

      {data.keyPoints.length > 0 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Quick Revision Cards
          </div>
          <ul className="space-y-1.5">
            {data.keyPoints.map((kp, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-emerald-500">•</span>
                <span>{kp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="prose prose-sm dark:prose-invert max-w-none rounded-xl border border-border/60 bg-card p-4">
        <MarkdownRenderer content={data.summary} />
      </div>

      {data.autoNotes && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <FileText className="h-4 w-4" />
              Auto-Generated Notes (copyable)
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(data.autoNotes || "").then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:bg-accent"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Copy notes
                </>
              )}
            </button>
          </div>
          <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg bg-background/50 p-3 text-xs leading-relaxed text-foreground">
            {data.autoNotes}
          </pre>
        </div>
      )}

      {data.transcript && (
        <details className="rounded-xl border border-border/60 bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium">
            View video transcript
          </summary>
          <p className="mt-2 max-h-64 overflow-y-auto text-xs leading-relaxed text-muted-foreground">
            {data.transcript}
          </p>
        </details>
      )}
    </div>
  );
}

/* ---------------- Chat ---------------- */

function ChatTab({ videoId }: { videoId: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Voice input (mic) ---
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // --- Voice output (TTS) ---
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api<{ messages: ChatMsg[] }>(
        `/api/student/videos/${videoId}/chat`,
      );
      setMessages(res.messages);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [videoId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // --- TTS: speak an AI message's text aloud ---
  const speak = async (msg: ChatMsg) => {
    // If already speaking this message, stop.
    if (speakingId === msg.id) {
      stopSpeaking();
      return;
    }
    stopSpeaking();
    setSpeakingId(msg.id);
    try {
      // Strip markdown for cleaner speech.
      const clean = msg.content
        .replace(/```[\s\S]*?```/g, " (code block) ")
        .replace(/[#*`_~>|-]/g, " ")
        .replace(/\[(.*?)\]\(.*?\)/g, "$1")
        .replace(/\s+/g, " ")
        .trim();
      const res = await fetch("/api/student/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean, voice: "jam" }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setSpeakingId(null);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setSpeakingId(null);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch (e) {
      console.error("tts error", e);
      setSpeakingId(null);
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeakingId(null);
  };

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  // --- Mic recording ---
  const startRecording = async () => {
    try {
      // Suppress security guard during mic permission (prevents false positive).
      (window as unknown as { __suppressSecurity?: (v: boolean) => void }).__suppressSecurity?.(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Re-enable security after permission granted.
      (window as unknown as { __suppressSecurity?: (v: boolean) => void }).__suppressSecurity?.(false);
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        if (blob.size === 0) {
          setTranscribing(false);
          return;
        }
        // Convert to base64 and send to ASR.
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(",")[1] || "";
          try {
            const res = await fetch("/api/student/asr", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audio: base64 }),
              credentials: "include",
            });
            const data = await res.json();
            if (data.text) {
              setInput((prev) => (prev ? prev + " " + data.text : data.text));
            }
          } catch (e) {
            console.error("asr error", e);
            setError("Could not transcribe your voice. Try again.");
          } finally {
            setTranscribing(false);
          }
        };
        reader.readAsDataURL(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (e) {
      console.error("mic error", e);
      setError("Microphone access denied. Please allow it in your browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setTranscribing(true);
    }
  };

  const send = async () => {
    const msg = input.trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);
    setError(null);
    const tempId = `temp-${Date.now()}`;
    setMessages((m) => [
      ...m,
      { id: tempId, role: "user", content: msg, createdAt: new Date().toISOString() },
    ]);
    try {
      const res = await api<{ reply: string; message: ChatMsg }>(
        `/api/student/videos/${videoId}/chat`,
        {
          method: "POST",
          body: JSON.stringify({ message: msg }),
        },
      );
      setMessages((m) => [
        ...m.filter((x) => x.id !== tempId),
        res.message,
      ]);
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== tempId));
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const clear = async () => {
    if (!confirm("Clear this conversation?")) return;
    await api(`/api/student/videos/${videoId}/chat`, { method: "DELETE" }).catch(() => {});
    setMessages([]);
  };

  return (
    <div className="flex flex-col rounded-xl border border-border/60 bg-card">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              Dr. Sage
              {speakingId && (
                <span className="inline-flex items-center gap-1 text-xs font-normal text-emerald-600">
                  <Volume2 className="h-3 w-3 animate-pulse" /> speaking
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Dental AI · voice enabled · full dental knowledge
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {speakingId && (
            <Button
              size="sm"
              variant="ghost"
              onClick={stopSpeaking}
              className="gap-1.5 text-xs text-muted-foreground"
              title="Stop voice"
            >
              <VolumeX className="h-3.5 w-3.5" /> Stop
            </Button>
          )}
          {messages.length > 0 && (
            <Button size="sm" variant="ghost" onClick={clear} className="gap-1.5 text-xs text-muted-foreground">
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="max-h-[420px] min-h-[260px]">
        <div ref={scrollRef} className="space-y-3 p-4">
          {loading ? (
            <div className="grid place-items-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                <Bot className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">Ask Dr. Sage anything</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Type, or tap the mic to speak. Dr. Sage will reply in text and
                can read answers aloud.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "group flex gap-2.5",
                  m.role === "user" && "flex-row-reverse",
                )}
              >
                <div
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-medium",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-emerald-500/15 text-emerald-600",
                  )}
                >
                  {m.role === "user" ? "You" : <Bot className="h-4 w-4" />}
                </div>
                <div
                  className={cn(
                    "max-w-[85%] overflow-hidden break-words rounded-2xl px-3.5 py-2 text-sm",
                    m.role === "user"
                      ? "rounded-tr-sm bg-primary text-primary-foreground"
                      : "rounded-tl-sm bg-muted",
                  )}
                >
                  <MarkdownRenderer content={m.content} />
                  {/* Speaker button on AI replies — speaks the answer aloud */}
                  {m.role === "assistant" && (
                    <button
                      onClick={() => speak(m)}
                      className={cn(
                        "mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition",
                        speakingId === m.id
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : "bg-background/50 text-muted-foreground hover:bg-background hover:text-foreground",
                      )}
                      title={speakingId === m.id ? "Stop voice" : "Read aloud"}
                    >
                      {speakingId === m.id ? (
                        <>
                          <VolumeX className="h-3 w-3" /> Stop
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3 w-3" /> Listen
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex gap-2.5">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          {transcribing && (
            <div className="flex justify-center py-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Transcribing your voice…
              </span>
            </div>
          )}
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border/60 p-3">
        <div className="flex items-end gap-2 overflow-hidden">
          {/* Mic button — toggle recording */}
          <Button
            onClick={recording ? stopRecording : startRecording}
            disabled={transcribing || sending}
            size="icon"
            variant={recording ? "destructive" : "outline"}
            className="shrink-0 border-border"
            title={recording ? "Stop recording" : "Speak your question"}
          >
            {recording ? (
              <Square className="h-4 w-4 animate-pulse" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={
              recording
                ? "Listening… tap stop when done"
                : "Ask Dr. Sage anything, or tap the mic to speak…"
            }
            rows={1}
            className="min-w-0 max-h-32 resize-none border-border"
          />
          <Button onClick={send} disabled={sending || !input.trim()} size="icon" className="shrink-0 border-border">
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          {recording
            ? "🔴 Recording… tap the stop button to transcribe"
            : "🎤 Mic to speak · 🔊 Listen on AI replies · Enter to send"}
        </p>
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "Explain the key concept here",
  "What are the clinical steps?",
  "Common mistakes to avoid?",
];

/* ---------------- Quiz ---------------- */

function QuizTab({ videoId }: { videoId: string }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    setAnswers({});
    setSubmitted(false);
    try {
      const res = await api<{ quiz: Quiz }>(`/api/student/videos/${videoId}/quiz`);
      setQuiz(res.quiz);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [videoId]);

  const score = quiz
    ? quiz.questions.reduce(
        (acc, q, i) => (answers[i] === q.answer ? acc + 1 : acc),
        0,
      )
    : 0;

  if (loading)
    return (
      <div className="grid place-items-center py-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm text-muted-foreground">
            Generating your quiz…
          </p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="grid place-items-center py-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button size="sm" variant="outline" onClick={load} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    );

  if (!quiz) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-medium">
            Knowledge Check · {quiz.questions.length} questions
          </span>
        </div>
        <Button size="sm" variant="ghost" onClick={load} className="gap-1.5 text-xs">
          <RotateCcw className="h-3.5 w-3.5" /> New quiz
        </Button>
      </div>

      {submitted && (
        <div
          className={cn(
            "rounded-xl border p-4 text-center",
            score === quiz.questions.length
              ? "border-emerald-500/30 bg-emerald-500/5"
              : score >= quiz.questions.length / 2
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-destructive/30 bg-destructive/5",
          )}
        >
          <div className="text-2xl font-bold">
            {score} / {quiz.questions.length}
          </div>
          <div className="text-sm text-muted-foreground">
            {score === quiz.questions.length
              ? "Perfect! You've mastered this lesson. 🎉"
              : score >= quiz.questions.length / 2
                ? "Good effort! Review the explanations below."
                : "Keep learning! Read the summary and try again."}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {quiz.questions.map((q, i) => {
          const chosen = answers[i];
          const showResult = submitted && chosen !== undefined;
          return (
            <div
              key={i}
              className="rounded-xl border border-border/60 bg-card p-4"
            >
              <div className="mb-3 flex items-start gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-600">
                  {i + 1}
                </span>
                <p className="text-sm font-medium">{q.q}</p>
              </div>
              <div className="space-y-2">
                {q.options.map((opt, j) => {
                  const isChosen = chosen === j;
                  const isCorrect = q.answer === j;
                  let cls =
                    "border-border hover:bg-accent/40";
                  if (showResult) {
                    if (isCorrect)
                      cls = "border-emerald-500 bg-emerald-500/10";
                    else if (isChosen && !isCorrect)
                      cls = "border-destructive bg-destructive/10";
                    else cls = "border-border opacity-60";
                  } else if (isChosen) {
                    cls = "border-primary bg-primary/10";
                  }
                  return (
                    <button
                      key={j}
                      disabled={submitted}
                      onClick={() => setAnswers((a) => ({ ...a, [i]: j }))}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition",
                        cls,
                      )}
                    >
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border text-xs font-medium">
                        {String.fromCharCode(65 + j)}
                      </span>
                      <span className="flex-1">{opt}</span>
                      {showResult && isCorrect && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                      {showResult && isChosen && !isCorrect && (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </button>
                  );
                })}
              </div>
              {showResult && (
                <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Explanation:{" "}
                  </span>
                  {q.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!submitted ? (
        <Button
          onClick={() => setSubmitted(true)}
          disabled={Object.keys(answers).length !== quiz.questions.length}
          className="w-full gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          Submit answers ({Object.keys(answers).length}/{quiz.questions.length})
        </Button>
      ) : (
        <Button onClick={load} variant="outline" className="w-full gap-2">
          <RotateCcw className="h-4 w-4" /> Try a new quiz
        </Button>
      )}
    </div>
  );
}

/* ---------------- Notes ---------------- */

function NotesTab({ videoId }: { videoId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api<{ notes: Note[] }>(
        `/api/student/videos/${videoId}/notes`,
      );
      setNotes(res.notes);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [videoId]);

  const add = async () => {
    const content = input.trim();
    if (!content) return;
    setSaving(true);
    try {
      const res = await api<{ note: Note }>(
        `/api/student/videos/${videoId}/notes`,
        { method: "POST", body: JSON.stringify({ content }) },
      );
      setNotes((n) => [...n, res.note]);
      setInput("");
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    await api(`/api/student/videos/${videoId}/notes?noteId=${id}`, {
      method: "DELETE",
    });
    setNotes((n) => n.filter((x) => x.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <StickyNote className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-medium">My notes for this lesson</span>
      </div>
      <div className="flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Write a note, key takeaway, or question to remember…"
          rows={2}
          className="resize-none"
        />
        <Button onClick={add} disabled={saving || !input.trim()} size="icon">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>
      {loading ? (
        <div className="grid place-items-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 py-8 text-center text-sm text-muted-foreground">
          No notes yet. Add your first note above.
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <div
              key={n.id}
              className="group flex items-start gap-2 rounded-lg border border-border/60 bg-card p-3"
            >
              <div className="flex-1">
                <p className="text-sm">{n.content}</p>
                <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                onClick={() => remove(n.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Tiny markdown renderer ---------------- */
// Lightweight: handles **bold**, *italic*, # headings, - bullets, numbered
// lists, and code blocks. Avoids pulling in a heavy dependency.
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: React.ReactNode[] = [];
  let ordered = false;
  let code: string[] = [];
  let inCode = false;

  const flushList = () => {
    if (list.length > 0) {
      blocks.push(
        ordered ? (
          <ol key={blocks.length} className="ml-4 list-decimal space-y-1">
            {list}
          </ol>
        ) : (
          <ul key={blocks.length} className="ml-4 list-disc space-y-1">
            {list}
          </ul>
        ),
      );
      list = [];
    }
  };

  lines.forEach((line, i) => {
    if (inCode) {
      if (line.trim() === "```") {
        blocks.push(
          <pre
            key={blocks.length}
            className="overflow-x-auto rounded bg-muted p-2 text-xs"
          >
            <code>{code.join("\n")}</code>
          </pre>,
        );
        code = [];
        inCode = false;
      } else {
        code.push(line);
      }
      return;
    }
    if (line.trim() === "```") {
      flushList();
      inCode = true;
      return;
    }
    // Headings
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushList();
      const level = h[1].length;
      const text = inline(h[2]);
      blocks.push(
        level === 1 ? (
          <h3 key={blocks.length} className="mt-2 text-base font-semibold">{text}</h3>
        ) : level === 2 ? (
          <h4 key={blocks.length} className="mt-2 text-sm font-semibold">{text}</h4>
        ) : (
          <p key={blocks.length} className="mt-1 text-sm font-medium">{text}</p>
        ),
      );
      return;
    }
    // Ordered list
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      ordered = true;
      list.push(<li key={i}>{inline(ol[1])}</li>);
      return;
    }
    // Unordered list
    const ul = line.match(/^[-*]\s+(.*)$/);
    if (ul) {
      if (ordered) flushList();
      ordered = false;
      list.push(<li key={i}>{inline(ul[1])}</li>);
      return;
    }
    // Blank line
    if (line.trim() === "") {
      flushList();
      return;
    }
    flushList();
    blocks.push(
      <p key={blocks.length} className="text-sm leading-relaxed">
        {inline(line)}
      </p>,
    );
  });
  flushList();
  if (inCode && code.length > 0) {
    blocks.push(
      <pre key={blocks.length} className="overflow-x-auto rounded bg-muted p-2 text-xs">
        <code>{code.join("\n")}</code>
      </pre>,
    );
  }

  function inline(s: string): React.ReactNode {
    // **bold** then *italic* then `code`
    const parts: React.ReactNode[] = [];
    let rest = s;
    let key = 0;
    while (rest.length > 0) {
      const bold = rest.match(/\*\*([^*]+)\*\*/);
      const ital = rest.match(/\*([^*]+)\*/);
      const code2 = rest.match(/`([^`]+)`/);
      const next = [bold, ital, code2]
        .filter(Boolean)
        .sort((a, b) => (a!.index! - b!.index!))[0];
      if (!next || next.index === undefined) {
        parts.push(rest);
        break;
      }
      if (next.index > 0) parts.push(rest.slice(0, next.index));
      if (next === bold) parts.push(<strong key={key++}>{next[1]}</strong>);
      else if (next === code2)
        parts.push(
          <code key={key++} className="rounded bg-muted px-1 text-xs">
            {next[1]}
          </code>,
        );
      else parts.push(<em key={key++}>{next[1]}</em>);
      rest = rest.slice(next.index + next[0].length);
    }
    return parts;
  }

  return <div className="space-y-1.5">{blocks}</div>;
}
