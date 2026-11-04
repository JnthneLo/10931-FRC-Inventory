import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/db";
import { hashPin, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const pin = String(body.pin ?? "").trim();

  if (!name || name.length > 30) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (!/^\d{4,8}$/.test(pin)) return NextResponse.json({ error: "PIN must be 4–8 digits" }, { status: 400 });

  const existing = db.prepare("SELECT * FROM users WHERE name = ?").get(name) as
    | { id: number; pin_hash: string }
    | undefined;

  let userId: number;
  let created = false;
  if (existing) {
    const [salt, hash] = existing.pin_hash.split(":");
    if (hashPin(pin, salt) !== hash) {
      return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });
    }
    userId = existing.id;
  } else {
    const salt = crypto.randomBytes(8).toString("hex");
    const res = db.prepare("INSERT INTO users (name, pin_hash) VALUES (?, ?)").run(name, `${salt}:${hashPin(pin, salt)}`);
    userId = Number(res.lastInsertRowid);
    created = true;
  }

  const token = createSession(userId);
  const res = NextResponse.json({ user: { id: userId, name }, created });
  res.cookies.set("wrangler_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
