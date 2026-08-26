import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { ensureSeeded } from "@/lib/auto-seed";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  await ensureSeeded();
  const session = await getAdminSession(req);
  if (!session)
    return NextResponse.json({ admin: null }, { status: 200 });
  return NextResponse.json({ admin: session });
}
