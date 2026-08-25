import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getStudentSession(req);
  if (!session)
    return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({ user: session });
}
