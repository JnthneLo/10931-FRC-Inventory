import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!(await getSessionUser())) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const { id } = await ctx.params;
  const db = getDb();
  const existing = db.prepare("SELECT * FROM parts WHERE id = ?").get(Number(id));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const fields: string[] = [];
  const args: unknown[] = [];

  for (const key of ["name", "part_number", "serial_number", "vendor", "url", "category", "location", "notes"] as const) {
    if (key in body) {
      fields.push(`${key} = ?`);
      args.push(String(body[key] ?? "").trim());
    }
  }
  if ("quantity" in body) {
    fields.push("quantity = ?");
    args.push(Math.max(0, Number(body.quantity) || 0));
  }
  if (fields.length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  fields.push("updated_at = datetime('now')");

  db.prepare(`UPDATE parts SET ${fields.join(", ")} WHERE id = ?`).run(...args, Number(id));
  const part = db.prepare("SELECT * FROM parts WHERE id = ?").get(Number(id));
  return NextResponse.json({ part });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  if (!(await getSessionUser())) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const { id } = await ctx.params;
  const db = getDb();
  const result = db.prepare("DELETE FROM parts WHERE id = ?").run(Number(id));
  if (result.changes === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
