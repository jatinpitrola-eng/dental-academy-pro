import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";
import { checkAccess } from "@/lib/access";

export const runtime = "nodejs";

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

  const access = await checkAccess(session.id, video.courseId);

  // Return cached summary if it exists.
  const cached = await db.videoSummary.findUnique({
    where: { videoId: video.id },
  }).catch(() => null);
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

  // Otherwise generate a summary.
  let transcript: string | null = null;
  if (video.youtubeId) {
    try {
      const { fetchYoutubeTranscript } = await import("@/lib/transcript");
      transcript = await fetchYoutubeTranscript(video.youtubeId);
    } catch {
      /* ignore */
    }
  }

  // Try AI-generated summary first (works in Z.ai sandbox).
  let summary = "";
  let keyPoints: string[] = [];
  let usedAI = false;

  try {
    const { llmComplete, DENTAL_EXPERT_SYSTEM } = await import("@/lib/ai");
    const contextParts: string[] = [
      `Course: ${video.course.title}`,
      `Video title: ${video.title}`,
    ];
    if (video.description) contextParts.push(`Video description: ${video.description}`);
    if (transcript) {
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

    const raw = await llmComplete(DENTAL_EXPERT_SYSTEM, prompt);
    summary = raw;
    const summaryMatch = raw.match(/SUMMARY:\s*([\s\S]*?)(?:\nKEY_POINTS:|$)/i);
    const kpMatch = raw.match(/KEY_POINTS:\s*(\[[\s\S]*\])/i);
    if (summaryMatch) summary = summaryMatch[1].trim();
    if (kpMatch) {
      try { keyPoints = JSON.parse(kpMatch[1]); } catch { /* keep empty */ }
    }
    usedAI = true;
  } catch (e) {
    // AI not available (Vercel) — fall back to extractive summary from transcript.
    console.log("AI summary failed, using extractive fallback");
    const fallback = generateExtractiveSummary(
      video.title,
      video.description,
      video.course.title,
      transcript,
    );
    summary = fallback.summary;
    keyPoints = fallback.keyPoints;
  }

  // Cache in DB (only if DB is available).
  try {
    await db.videoSummary.upsert({
      where: { videoId: video.id },
      update: { transcript, summary, keyPoints: JSON.stringify(keyPoints) },
      create: { videoId: video.id, transcript, summary, keyPoints: JSON.stringify(keyPoints) },
    });
  } catch {
    /* DB not available on Vercel cold start — ignore */
  }

  // Generate auto-notes from transcript (copyable by student).
  const autoNotes = generateAutoNotes(video.title, video.course.title, transcript, video.description);

  return NextResponse.json({
    summary,
    keyPoints,
    transcript,
    autoNotes,
    cached: false,
    aiGenerated: usedAI,
  });
}

/**
 * Generates copyable study notes from the video transcript.
 * These notes are structured, easy to read, and can be copied by the student.
 */
function generateAutoNotes(
  videoTitle: string,
  courseTitle: string,
  transcript: string | null,
  description: string | null,
): string {
  const lines: string[] = [];

  lines.push(`# ${videoTitle}`);
  lines.push(`**Course:** ${courseTitle}`);
  lines.push(`**Date:** ${new Date().toLocaleDateString()}`);
  lines.push("");

  if (description) {
    lines.push(`## Overview`);
    lines.push(description);
    lines.push("");
  }

  if (transcript && transcript.length > 100) {
    // Split transcript into sentences.
    const sentences = transcript.match(/[^.!?]+[.!?]+/g) || [transcript];
    const cleanSentences = sentences.map(s => s.trim()).filter(s => s.length > 20);

    // Group sentences into "topics" (every 3-4 sentences = 1 topic).
    lines.push(`## Key Points from the Lesson`);
    lines.push("");

    const topicSize = 3;
    const maxTopics = Math.min(8, Math.ceil(cleanSentences.length / topicSize));

    for (let i = 0; i < maxTopics; i++) {
      const start = i * topicSize;
      const end = Math.min(start + topicSize, cleanSentences.length);
      const topicSentences = cleanSentences.slice(start, end);
      if (topicSentences.length === 0) continue;

      // Use first sentence as the heading (truncated).
      const heading = topicSentences[0].slice(0, 60).trim();
      lines.push(`### ${i + 1}. ${heading}${heading.length >= 60 ? "..." : ""}`);
      lines.push(topicSentences.join(" "));
      lines.push("");
    }

    // Important terms (extract dental keywords).
    lines.push(`## Important Terms`);
    lines.push("");
    const dentalTerms = [
      "enamel", "dentin", "pulp", "cementum", "periodontal", "gingiva",
      "cavity", "caries", "restoration", "composite", "amalgam", "endodontic",
      "root canal", "extraction", "implant", "crown", "bridge", "denture",
      "occlusion", "malocclusion", "orthodontic", "bracket", "aligner",
      "veneer", "bleaching", "scaling", "polishing", "anesthesia",
      "calcium hydroxide", "gutta-percha", "apex", "foramen", "chamber",
      "canal", "odontoblast", "ameloblast", "hydroxyapatite", "fluoride",
    ];
    const lowerTranscript = transcript.toLowerCase();
    const foundTerms = dentalTerms.filter(t => lowerTranscript.includes(t));
    if (foundTerms.length > 0) {
      foundTerms.forEach(term => {
        lines.push(`- **${term.charAt(0).toUpperCase() + term.slice(1)}**`);
      });
    } else {
      lines.push("- Review the video for key dental terms");
    }
    lines.push("");

    // Summary takeaway.
    lines.push(`## Summary`);
    lines.push("");
    const topSentences = cleanSentences.slice(0, 3);
    lines.push(topSentences.join(" "));
    lines.push("");

  } else {
    lines.push(`## Study Notes`);
    lines.push("");
    lines.push(`This lesson covers **${videoTitle}** from the *${courseTitle}* course.`);
    lines.push("");
    lines.push(`### Key Points to Remember:`);
    lines.push(`- Watch the full video for detailed explanations`);
    lines.push(`- Take additional notes while watching`);
    lines.push(`- Review the summary tab for key concepts`);
    lines.push(`- Try the quiz to test your understanding`);
    lines.push("");
  }

  lines.push(`---`);
  lines.push(`*Auto-generated from video transcript. You can copy these notes for your study.*`);

  return lines.join("\n");
}

/**
 * Generates a summary from the transcript text WITHOUT an LLM. Uses
 * extractive summarization: splits the transcript into sentences, scores
 * them by keyword frequency, and picks the top sentences.
 */
function generateExtractiveSummary(
  videoTitle: string,
  videoDescription: string | null,
  courseTitle: string,
  transcript: string | null,
): { summary: string; keyPoints: string[] } {
  const keyPoints: string[] = [];

  // If we have a transcript, generate extractive summary.
  if (transcript && transcript.length > 100) {
    // Split into sentences.
    const sentences = transcript.match(/[^.!?]+[.!?]+/g) || [transcript];
    const cleanSentences = sentences.map(s => s.trim()).filter(s => s.length > 20);

    // Calculate word frequencies (excluding stop words).
    const stopWords = new Set([
      "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
      "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
      "being", "have", "has", "had", "do", "does", "did", "will", "would",
      "could", "should", "may", "might", "shall", "can", "need", "dare",
      "ought", "used", "this", "that", "these", "those", "i", "you", "he",
      "she", "it", "we", "they", "me", "him", "her", "us", "them", "my",
      "your", "his", "its", "our", "their", "what", "which", "who", "whom",
      "where", "when", "why", "how", "all", "any", "both", "each", "few",
      "more", "most", "other", "some", "such", "no", "nor", "not", "only",
      "own", "same", "so", "than", "too", "very", "just", "as", "if", "now",
    ]);

    const wordFreq: Record<string, number> = {};
    const words = transcript.toLowerCase().match(/\b[a-z]+\b/g) || [];
    for (const w of words) {
      if (!stopWords.has(w) && w.length > 3) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    }

    // Score sentences by sum of word frequencies.
    const scored = cleanSentences.map((sentence, idx) => {
      const sentWords = sentence.toLowerCase().match(/\b[a-z]+\b/g) || [];
      let score = 0;
      for (const w of sentWords) {
        score += wordFreq[w] || 0;
      }
      // Normalize by sentence length to avoid bias toward long sentences.
      return { sentence, score: score / Math.max(sentWords.length, 1), idx };
    });

    // Pick top 5-8 sentences (but not more than available), maintaining
    // original order.
    const topCount = Math.min(8, Math.floor(scored.length / 3) + 3);
    const top = [...scored]
      .sort((a, b) => b.score - a.score)
      .slice(0, topCount)
      .sort((a, b) => a.idx - b.idx);

    const summarySentences = top.map(t => t.sentence);

    // Build the markdown summary.
    const summary = `## Overview

This lesson covers **${videoTitle}** from the course *${courseTitle}*.${
      videoDescription ? `\n\n${videoDescription}` : ""
    }

## Key Points from the Lesson

${summarySentences.map((s, i) => `${i + 1}. ${s}`).join("\n\n")}

## Video Transcript

The full transcript is available below for reference.

---
*Summary generated from video transcript. For a more detailed AI analysis, use the app in the sandbox environment.*`;

    // Generate key points from top sentences.
    const extractedKeyPoints = top.slice(0, 5).map(t => {
      const s = t.sentence;
      return s.length > 80 ? s.slice(0, 77) + "..." : s;
    });

    return { summary, keyPoints: extractedKeyPoints };
  }

  // Fallback: no transcript — use video title + description.
  const summary = `## Overview

This lesson covers **${videoTitle}** from the course *${courseTitle}*.${
    videoDescription ? `\n\n${videoDescription}` : ""
  }

## Key Information

- **Topic**: ${videoTitle}
- **Course**: ${courseTitle}
- **Type**: Educational video lesson

## Note

A detailed transcript-based summary will be available once the video is played. The summary is generated from the video's transcript content.

---
*Transcript not available for this video. For AI-powered analysis, use the app in the sandbox environment.*`;

  const fallbackKeyPoints = [
    `Topic: ${videoTitle}`,
    `Course: ${courseTitle}`,
    videoDescription
      ? videoDescription.slice(0, 77) + "..."
      : "Watch the video for full content",
  ];

  return { summary, keyPoints: fallbackKeyPoints };
}
