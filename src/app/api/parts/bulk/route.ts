import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!(await getSessionUser())) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const db = getDb();
  const body = await req.json();
  const rows = Array.isArray(body.parts) ? body.parts : [];
  if (rows.length === 0) return NextResponse.json({ error: "No parts provided" }, { status: 400 });
  if (rows.length > 5000) return NextResponse.json({ error: "Too many rows (max 5000)" }, { status: 400 });

  const stmt = db.prepare(
    `INSERT INTO parts (name, part_number, serial_number, vendor, url, category, quantity, location, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertMany = db.transaction((items: Record<string, unknown>[]) => {
    for (const p of items) {
      stmt.run(
        String(p.name ?? "").trim() || "(unnamed)",
        String(p.part_number ?? "").trim(),
        String(p.serial_number ?? "").trim(),
        String(p.vendor ?? "").trim(),
        String(p.url ?? "").trim(),
        String(p.category ?? "").trim(),
        Math.max(0, Number(p.quantity) || 0),
        String(p.location ?? "").trim(),
        String(p.notes ?? "").trim()
      );
    }
  });
  insertMany(rows);
  return NextResponse.json({ inserted: rows.length }, { status: 201 });
}
