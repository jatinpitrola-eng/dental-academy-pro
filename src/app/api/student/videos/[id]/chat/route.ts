import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";
import { checkAccess } from "@/lib/access";

export const runtime = "nodejs";

// GET — load conversation history for this video.
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

  const messages = await db.chatMessage.findMany({
    where: { studentId: session.id, videoId: video.id },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: { id: true, role: true, content: true, createdAt: true },
  });

  return NextResponse.json({ messages });
}

// POST — send a message and get an AI reply.
export async function POST(
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

  const body = await req.json().catch(() => ({}));
  const message = String(body.message || "").trim();
  if (!message)
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  if (message.length > 2000)
    return NextResponse.json(
      { error: "Message is too long (max 2000 characters)." },
      { status: 400 },
    );

  // Build the per-video context for the AI — keep it SHORT for speed.
  const summary = video.summaries[0];
  const contextBits: string[] = [
    `Student: ${session.name}. Video: "${video.title}" in course "${video.course.title}".`,
  ];
  if (video.description)
    contextBits.push(`Description: ${video.description.slice(0, 300)}`);
  if (summary?.summary) {
    // Only send a short excerpt of the summary (not the full thing).
    const s = summary.summary.slice(0, 1500);
    contextBits.push(`Lesson summary:\n${s}`);
  }

  // Load recent history — only last 6 messages for speed.
  const historyRows = await db.chatMessage.findMany({
    where: { studentId: session.id, videoId: video.id },
    orderBy: { createdAt: "asc" },
    take: 6,
    select: { role: true, content: true },
  });
  const history = historyRows.map((h) => ({
    role: h.role as "user" | "assistant",
    content: h.content,
  }));

  // Save the user's message first.
  await db.chatMessage.create({
    data: {
      studentId: session.id,
      videoId: video.id,
      role: "user",
      content: message,
    },
  });

  try {
    // Lazy-import AI module to avoid build-time issues on Vercel.
    const { llmChat, DENTAL_EXPERT_SYSTEM } = await import("@/lib/ai");
    const system = `${DENTAL_EXPERT_SYSTEM}\n\n--- VIDEO CONTEXT ---\n${contextBits.join("\n\n")}`;
    const reply = await llmChat(system, history, message);
    // Save the AI reply.
    const saved = await db.chatMessage.create({
      data: {
        studentId: session.id,
        videoId: video.id,
        role: "assistant",
        content: reply,
      },
    });
    return NextResponse.json({
      reply,
      message: {
        id: saved.id,
        role: saved.role,
        content: saved.content,
        createdAt: saved.createdAt,
      },
    });
  } catch (e) {
    console.error("chat error", e);
    // AI not available (Vercel) — return a helpful fallback response.
    const fallbackReply = generateFallbackReply(message, video.title, video.course.title);
    const saved = await db.chatMessage.create({
      data: {
        studentId: session.id,
        videoId: video.id,
        role: "assistant",
        content: fallbackReply,
      },
    }).catch(() => null);
    return NextResponse.json({
      reply: fallbackReply,
      message: saved ? {
        id: saved.id,
        role: saved.role,
        content: saved.content,
        createdAt: saved.createdAt,
      } : {
        id: `fallback-${Date.now()}`,
        role: "assistant",
        content: fallbackReply,
        createdAt: new Date().toISOString(),
      },
    });
  }
}

/**
 * Generates a helpful fallback reply when the AI SDK is not available (Vercel).
 */
function generateFallbackReply(
  userMessage: string,
  videoTitle: string,
  courseTitle: string,
): string {
  const msg = userMessage.toLowerCase();

  // Check for common question types and provide relevant responses.
  if (msg.includes("enamel")) {
    return `## Enamel

**Enamel** is the hardest and most mineralized tissue in the human body, even harder than bone.

### Key Facts:
- **Composition**: ~96% hydroxyapatite crystals (a crystalline calcium phosphate), ~3% water, ~1% organic matrix
- **Structure**: Composed of enamel rods (prisms) that run from the enamel-dentin junction to the tooth surface
- **Function**: Protects the underlying dentin and pulp from physical, chemical, and thermal damage
- **Clinical significance**: 
  - Cannot regenerate once lost (no cells in mature enamel)
  - Susceptible to acid erosion from bacteria (caries) and dietary acids
  - Fluoride strengthens enamel by converting hydroxyapatite to fluorapatite

### Clinical Applications:
- Cavity preparation must preserve as much enamel as possible
- Acid etching creates micro-retention for composite bonding
- Enamel erosion is irreversible — prevention is key

> *Note: This is a knowledge-based response. For AI-powered interactive answers, use the app in the sandbox environment.*`;
  }

  if (msg.includes("dentin")) {
    return `## Dentin

**Dentin** is the calcified connective tissue that forms the bulk of the tooth, located beneath the enamel and cementum.

### Key Facts:
- **Composition**: ~70% inorganic (hydroxyapatite), ~20% organic (collagen), ~10% water
- **Structure**: Composed of dentinal tubules that extend from the pulp to the enamel-dentin junction
- **Types**: 
  - Primary dentin (formed before tooth eruption)
  - Secondary dentin (formed after eruption, throughout life)
  - Tertiary dentin (formed in response to stimuli like caries)
- **Function**: Supports the enamel and protects the pulp
- **Clinical significance**:
  - Sensitive due to odontoblastic processes in tubules
  - Can regenerate (unlike enamel)
  - Exposed dentin can cause hypersensitivity

### Clinical Applications:
- Dentin bonding agents are essential for adhesive restorations
- Desensitizing agents can block tubules to reduce sensitivity
- Deep caries approaching pulp requires careful management

> *Note: This is a knowledge-based response. For AI-powered interactive answers, use the app in the sandbox environment.*`;
  }

  if (msg.includes("pulp")) {
    return `## Dental Pulp

**Dental pulp** is the soft connective tissue in the center of the tooth, contained within the pulp chamber and root canals.

### Key Facts:
- **Composition**: Connective tissue, blood vessels, nerves, lymphatics
- **Cells**: Odontoblasts, fibroblasts, undifferentiated mesenchymal cells
- **Functions**: 
  - Formation (dentinogenesis)
  - Nutrition (blood supply to dentin)
  - Protection (sensory — pain response)
  - Defense (immune response)
- **Clinical significance**:
  - Inflammation (pulpitis) causes severe pain
  - Irreversible pulpitis requires root canal treatment
  - Pulp vitality testing is essential for diagnosis

### Clinical Applications:
- Deep caries can cause pulp necrosis
- Root canal treatment removes infected pulp
- Pulp capping can preserve vitality in young teeth

> *Note: This is a knowledge-based response. For AI-powered interactive answers, use the app in the sandbox environment.*`;
  }

  // Default fallback
  return `Thank you for your question about "${userMessage}".

This lesson covers **${videoTitle}** from the *${courseTitle}* course.

## Key Study Points:

1. **Review the video** carefully and take notes on the main concepts
2. **Check the Summary tab** above for a detailed breakdown of this lesson
3. **Try the Quiz** to test your understanding
4. **Practice clinical application** — think about how the concepts apply to real patients

## Study Tips:

- Focus on understanding the **"why"** behind each concept, not just memorization
- Connect new information to what you already know about dental anatomy
- Consider the **clinical relevance** of each topic
- Review regularly to reinforce learning

> *Note: AI-powered interactive answers are available when using the app in the sandbox environment. This response provides general study guidance based on your question and the lesson content.*`;
}

// DELETE — clear conversation history for this video.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getStudentSession(req);
  if (!session || session.kind !== "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.chatMessage.deleteMany({
    where: { studentId: session.id, videoId: id },
  });
  return NextResponse.json({ ok: true });
}
// force rebuild
// rebuild 1787723048
