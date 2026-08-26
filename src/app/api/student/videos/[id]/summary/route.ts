import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";
import { checkAccess } from "@/lib/access";

export const runtime = "nodejs";
// LLM calls can take a while + we fetch transcripts over the network.

// GET — returns the cached summary, or generates one on demand.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getStudentSession(req);
  if (!session || session.kind !== "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const video = await db.video.findUnique({
    where: { id },
    include: { course: true },
  });
  if (!video)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Verify access.
  const access = await checkAccess(session.id, video.courseId);

  // Return cached summary if it exists.
  const cached = await db.videoSummary.findUnique({
    where: { videoId: video.id },
  });
  if (cached) {
    return NextResponse.json({
      summary: cached.summary,
      keyPoints: cached.keyPoints
        ? JSON.parse(cached.keyPoints)
        : [],
      transcript: cached.transcript,
      cached: true,
    });
  }

  // Otherwise generate a fresh summary.
  let transcript: string | null = null;
  if (video.youtubeId) {
    const { fetchYoutubeTranscript } = await import("@/lib/transcript");
    transcript = await fetchYoutubeTranscript(video.youtubeId);
  }

  // Build the context for the LLM.
  const contextParts: string[] = [
    `Course: ${video.course.title}`,
    `Video title: ${video.title}`,
  ];
  if (video.description) contextParts.push(`Video description: ${video.description}`);
  if (transcript) {
    // Truncate very long transcripts to keep within token limits.
    const t = transcript.slice(0, 12000);
    contextParts.push(`Transcript of the video:\n${t}`);
  } else {
    contextParts.push(
      "(No transcript was available for this video. Generate a comprehensive educational summary based on the title, course context, and standard dental knowledge of this topic.)",
    );
  }

  const prompt = `You are generating a learning summary for a dental student.

${contextParts.join("\n\n")}

Produce a COMPREHENSIVE summary of this video lesson in Markdown. Include:

1. **Overview** — a 2-3 sentence intro of what the lesson covers.
2. **Key Concepts** — the main topics explained, each as a short paragraph.
3. **Clinical Points** — practical clinical takeaways, steps, materials, or techniques mentioned.
4. **Common Pitfalls / Cautions** — what to watch out for clinically.
5. **Key Takeaways** — 4-6 concise bullet points the student should remember.

Also return a JSON array of 5-7 short bullet-point key points (each <= 80 chars) for a quick-revision card.

Respond in EXACTLY this format (no preamble):

SUMMARY:
<your markdown summary>

KEY_POINTS:
["point 1", "point 2", ...]`;

  try {
    const { llmComplete, DENTAL_EXPERT_SYSTEM } = await import("@/lib/ai");
    const raw = await llmComplete(DENTAL_EXPERT_SYSTEM, prompt);

    // Parse the two sections.
    let summary = raw;
    let keyPoints: string[] = [];
    const summaryMatch = raw.match(/SUMMARY:\s*([\s\S]*?)(?:\nKEY_POINTS:|$)/i);
    const kpMatch = raw.match(/KEY_POINTS:\s*(\[[\s\S]*\])/i);
    if (summaryMatch) summary = summaryMatch[1].trim();
    if (kpMatch) {
      try {
        keyPoints = JSON.parse(kpMatch[1]);
      } catch {
        /* keep empty */
      }
    }

    // Cache in DB.
    await db.videoSummary.upsert({
      where: { videoId: video.id },
      update: {
        transcript,
        summary,
        keyPoints: JSON.stringify(keyPoints),
      },
      create: {
        videoId: video.id,
        transcript,
        summary,
        keyPoints: JSON.stringify(keyPoints),
      },
    });

    return NextResponse.json({
      summary,
      keyPoints,
      transcript,
      cached: false,
    });
  } catch (e) {
    console.error("summary error", e);
    return NextResponse.json(
      { error: "Could not generate summary. Please try again in a moment." },
      { status: 500 },
    );
  }
}
