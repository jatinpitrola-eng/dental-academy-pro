import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";
import { ensureSeeded } from "@/lib/auto-seed";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  await ensureSeeded();
  const session = await getStudentSession(req);
  if (!session)
    return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({ user: session });
}
