import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session)
    return NextResponse.json({ admin: null }, { status: 200 });
  return NextResponse.json({ admin: session });
}
