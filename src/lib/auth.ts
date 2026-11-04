import crypto from "crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";

const SESSION_DAYS = 30;

export function hashPin(pin: string, salt: string): string {
  return crypto.scryptSync(pin, salt, 32).toString("hex");
}

export function createSession(userId: number): string {
  const db = getDb();
  const token = crypto.randomBytes(24).toString("hex");
  db.prepare(
    `INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+${SESSION_DAYS} days'))`
  ).run(token, userId);
  return token;
}

export async function getSessionUser(): Promise<{ id: number; name: string } | null> {
  const store = await cookies();
  const token = store.get("wrangler_session")?.value;
  if (!token) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.name FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`
    )
    .get(token) as { id: number; name: string } | undefined;
  return row ?? null;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get("wrangler_session")?.value;
  if (token) getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}
