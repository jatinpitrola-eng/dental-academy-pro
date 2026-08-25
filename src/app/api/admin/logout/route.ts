import { NextRequest, NextResponse } from "next/server";
import { revokeAdminSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  await revokeAdminSession(req);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("da_admin", "", { maxAge: 0, path: "/" });
  return res;
}
