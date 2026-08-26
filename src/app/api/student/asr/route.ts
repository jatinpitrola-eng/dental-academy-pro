import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";

export const runtime = "nodejs";

// POST /api/student/asr
// Body: { audio: "<base64-encoded audio>" }
// Returns: { text }
export async function POST(req: NextRequest) {
  const session = await getStudentSession(req);
  if (!session || session.kind !== "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const base64 = String(body.audio || "").trim();
  if (!base64)
    return NextResponse.json({ error: "audio required" }, { status: 400 });

  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    const response = await zai.audio.asr.create({ file_base64: base64 });
    const text = (response.text || "").trim();
    return NextResponse.json({ text });
  } catch (e) {
    console.error("asr error", e);
    return NextResponse.json(
      { error: "Could not transcribe audio. Please try again." },
      { status: 500 },
    );
  }
}
