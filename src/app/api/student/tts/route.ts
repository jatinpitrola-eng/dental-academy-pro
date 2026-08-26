import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";

export const runtime = "nodejs";

// POST /api/student/tts
// Body: { text, voice?, speed? }
// Returns: audio/wav binary (truncated to ~1000 chars for single API call)
export async function POST(req: NextRequest) {
  const session = await getStudentSession(req);
  if (!session || session.kind !== "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  let text = String(body.text || "").trim();
  const voice = String(body.voice || "jam"); // 'jam' = British gentleman male
  const speed = Number(body.speed || 1.0);

  if (!text)
    return NextResponse.json({ error: "text required" }, { status: 400 });
  if (speed < 0.5 || speed > 2.0)
    return NextResponse.json(
      { error: "speed must be 0.5–2.0" },
      { status: 400 },
    );

  // Truncate to ~1000 chars at a sentence boundary so we only make one TTS
  // API call. This avoids the need to merge multiple WAV files (which
  // produces corrupted audio). For very long AI replies, we speak the first
  // ~1000 chars.
  if (text.length > 1000) {
    const cut = text.slice(0, 1000);
    const lastSentence = cut.lastIndexOf(".");
    text = lastSentence > 500 ? cut.slice(0, lastSentence + 1) : cut;
  }

  try {
    // Ensure the z-ai config file exists (Vercel cold-start fix).
    const { getZAI } = await import("@/lib/ai");
    const zai = await getZAI();
    const response = await zai.audio.tts.create({
      input: text,
      voice,
      speed,
      response_format: "wav",
      stream: false,
    });
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error("tts error", e);
    return NextResponse.json(
      { error: "Could not generate speech. Please try again." },
      { status: 500 },
    );
  }
}
