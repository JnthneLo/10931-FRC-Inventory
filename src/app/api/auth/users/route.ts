import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export function GET() {
  const db = getDb();
  const users = db.prepare("SELECT name FROM users ORDER BY name COLLATE NOCASE").all() as { name: string }[];
  return NextResponse.json({ users: users.map((u) => u.name) });
}
