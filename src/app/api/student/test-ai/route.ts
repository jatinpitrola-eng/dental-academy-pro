import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";
import { llmComplete } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const session = await getStudentSession(req);
  if (!session || session.kind !== "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, user: session.name });
}
