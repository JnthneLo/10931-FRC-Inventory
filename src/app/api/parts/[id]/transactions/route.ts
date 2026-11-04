import { NextRequest, NextResponse } from "next/server";
import { getDb, Txn } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const db = getDb();
  const txns = db
    .prepare("SELECT * FROM transactions WHERE part_id = ? ORDER BY created_at DESC, id DESC LIMIT 100")
    .all(Number(id)) as Txn[];
  return NextResponse.json({ transactions: txns });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const db = getDb();
  const part = db.prepare("SELECT * FROM parts WHERE id = ?").get(Number(id)) as { id: number; quantity: number } | undefined;
  if (!part) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const type = body.type as "out" | "in" | "adjust";
  if (!["out", "in", "adjust"].includes(type)) {
    return NextResponse.json({ error: "type must be out|in|adjust" }, { status: 400 });
  }
  const qty = Math.max(0, Number(body.qty) || 0);
  if (qty === 0 && type !== "adjust") {
    return NextResponse.json({ error: "qty must be > 0" }, { status: 400 });
  }
  const user = await getSessionUser();
  const person = user?.name ?? String(body.person ?? "").trim();
  if (!person && type !== "adjust") {
    return NextResponse.json({ error: "Log in to check parts out" }, { status: 401 });
  }

  const delta = type === "out" ? -qty : type === "in" ? qty : Math.trunc(Number(body.qty)) - part.quantity;
  const qtyAfter = Math.max(0, part.quantity + delta);
  const actualDelta = qtyAfter - part.quantity;

  const run = db.transaction(() => {
    db.prepare("UPDATE parts SET quantity = ?, updated_at = datetime('now') WHERE id = ?").run(qtyAfter, part.id);
    return db
      .prepare("INSERT INTO transactions (part_id, type, delta, qty_after, person, note) VALUES (?,?,?,?,?,?)")
      .run(part.id, type, actualDelta, qtyAfter, person, String(body.note ?? "").trim());
  });
  run();

  const updated = db.prepare("SELECT * FROM parts WHERE id = ?").get(part.id);
  return NextResponse.json({ part: updated });
}
