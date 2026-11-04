import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST() {
  await destroySession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set("wrangler_session", "", { path: "/", maxAge: 0 });
  return res;
}
