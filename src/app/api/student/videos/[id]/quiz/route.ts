import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";
import { checkAccess } from "@/lib/access";

export const runtime = "nodejs";

// Generate a 5-question quiz about this video. Questions are AI-generated and
// cached in memory per video for 10 minutes (so all students see the same quiz
// and we don't re-call the LLM every time).
const quizCache = new Map<string, { quiz: Quiz; at: number }>();
const QUIZ_TTL = 10 * 60 * 1000;

type Quiz = {
  questions: {
    q: string;
    options: string[];
    answer: number; // index of correct option
    explanation: string;
  }[];
};

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
    include: { course: true, summaries: true },
  });
  if (!video)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const access = await checkAccess(session.id, video.courseId);

  // Return cached quiz if still fresh.
  const cached = quizCache.get(video.id);
  if (cached && Date.now() - cached.at < QUIZ_TTL) {
    return NextResponse.json({ quiz: cached.quiz });
  }

  // Otherwise generate a fresh quiz.
  const contextParts: string[] = [
    `Course: ${video.course.title}`,
    `Video title: ${video.title}`,
  ];
  if (video.description) contextParts.push(`Description: ${video.description}`);
  if (video.summaries[0]?.summary) {
    contextParts.push(
      `Lesson summary:\n${video.summaries[0].summary.slice(0, 6000)}`,
    );
  }

  const prompt = `Create a 5-question multiple-choice quiz to test the student's understanding of this dental video lesson.

${contextParts.join("\n\n")}

Rules:
- Questions should test real understanding, not trivia.
- Each question has exactly 4 options.
- Only one option is correct.
- Include a brief explanation (1-2 sentences) for why the correct answer is right.

Respond with ONLY valid JSON in this exact format (no markdown fences):

{
  "questions": [
    {
      "q": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "explanation": "Why option A is correct."
    }
  ]
}`;

  try {
    const { llmComplete, DENTAL_EXPERT_SYSTEM } = await import("@/lib/ai");
    const raw = await llmComplete(DENTAL_EXPERT_SYSTEM, prompt);
    // Extract JSON from the response (in case the model wrapped it in fences).
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const quiz = JSON.parse(jsonMatch[0]) as Quiz;
    if (!quiz.questions || quiz.questions.length === 0)
      throw new Error("Empty quiz");

    quizCache.set(video.id, { quiz, at: Date.now() });
    return NextResponse.json({ quiz });
  } catch (e) {
    console.log("AI quiz failed, using fallback");
    // AI not available (Vercel) — return a static fallback quiz based on
    // the video title and course.
    const fallback = generateFallbackQuiz(video.title, video.course.title, video.description);
    quizCache.set(video.id, { quiz: fallback, at: Date.now() });
    return NextResponse.json({ quiz: fallback });
  }
}

/**
 * Generates a simple quiz without an LLM. Uses the video title + description
 * to create basic comprehension questions.
 */
function generateFallbackQuiz(
  videoTitle: string,
  courseTitle: string,
  description: string | null,
): Quiz {
  return {
    questions: [
      {
        q: `Which course does the lesson "${videoTitle}" belong to?`,
        options: [courseTitle, "Oral Surgery", "Orthodontics", "Periodontics"],
        answer: 0,
        explanation: `This lesson is part of the ${courseTitle} course.`,
      },
      {
        q: `What is the main topic of this lesson?`,
        options: [
          videoTitle,
          "Root canal treatment",
          "Dental implants",
          "Orthodontic brackets",
        ],
        answer: 0,
        explanation: `The lesson focuses on ${videoTitle}.`,
      },
      {
        q: `Which of the following is a key aspect of clinical dental practice?`,
        options: [
          "Proper patient diagnosis and treatment planning",
          "Ignoring sterilization protocols",
          "Skipping radiographic assessment",
          "Using non-standard materials",
        ],
        answer: 0,
        explanation: "Proper diagnosis and treatment planning are fundamental to clinical dental practice.",
      },
      {
        q: `Why is understanding dental anatomy important?`,
        options: [
          "It forms the foundation for all clinical dental procedures",
          "It is only needed for exams",
          "It has no clinical relevance",
          "It is only for specialists",
        ],
        answer: 0,
        explanation: "Dental anatomy is the foundation upon which all clinical procedures are built.",
      },
      {
        q: `What should a dental student do after watching this lesson?`,
        options: [
          "Review the key concepts and practice clinical application",
          "Skip to the next lesson without review",
          "Forget the content until exam time",
          "Only memorize without understanding",
        ],
        answer: 0,
        explanation: "Active review and clinical application are essential for mastering dental concepts.",
      },
    ],
  };
}
