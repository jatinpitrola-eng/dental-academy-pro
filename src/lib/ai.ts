import ZAI from "z-ai-web-dev-sdk";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

/**
 * Ensures the .z-ai-config file exists. On Vercel, the file isn't deployed
 * (it's in .gitignore), so we reconstruct it from the Z_AI_CONFIG env var
 * and write it to /tmp (which is writable on serverless).
 */
function ensureConfigFile() {
  const configPath = "/tmp/.z-ai-config";
  if (existsSync(configPath)) return;
  // Try to read from env var (set on Vercel).
  const configContent = process.env.Z_AI_CONFIG;
  if (configContent) {
    try {
      writeFileSync(configPath, configContent);
      return;
    } catch {
      /* ignore */
    }
  }
  // Fallback: check if the project-level config exists (local dev).
  const localConfig = join(process.cwd(), ".z-ai-config");
  if (existsSync(localConfig)) return;
}

export async function getZAI() {
  if (!zaiInstance) {
    ensureConfigFile();
    // Set HOME to /tmp so the SDK finds /tmp/.z-ai-config
    if (process.env.Z_AI_CONFIG) {
      process.env.HOME = "/tmp";
    }
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// Compact but comprehensive dental-expert system prompt. Kept short for speed
// — the model already has deep dental knowledge; we just frame its role.
export const DENTAL_EXPERT_SYSTEM = `You are Dr. Sage, an expert dental AI assistant for dental students. You know ALL areas of dentistry: anatomy, operative, endodontics, prosthodontics, surgery, periodontics, orthodontics, pedodontics, aesthetics, implants, radiology, materials, pharmacology.

Rules:
- Be accurate, concise and clinically sound. Use Markdown (headings, bold, bullets) for clarity.
- Mention clinical steps/materials/dosages/cautions when relevant.
- Keep answers focused — students need practical, exam-ready answers.
- If off-topic, redirect: "I'm a dental assistant — let's focus on dentistry."
- Add a brief disclaimer for clinical decisions.
- Tone: friendly, encouraging, like a senior professor.`;

// Helper for a single LLM call.
export async function llmComplete(
  system: string,
  user: string,
): Promise<string> {
  const zai = await getZAI();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: system },
      { role: "user", content: user },
    ],
    thinking: { type: "disabled" },
  });
  return completion.choices[0]?.message?.content || "";
}

// Helper for a multi-turn conversation. Keeps only the last 6 messages for
// speed (shorter context = faster response).
export async function llmChat(
  system: string,
  history: { role: "user" | "assistant"; content: string }[],
  userMessage: string,
): Promise<string> {
  const zai = await getZAI();
  const messages: { role: string; content: string }[] = [
    { role: "assistant", content: system },
    ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];
  const completion = await zai.chat.completions.create({
    messages,
    thinking: { type: "disabled" },
  });
  return completion.choices[0]?.message?.content || "";
}
