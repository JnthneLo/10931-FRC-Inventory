import { NextRequest, NextResponse } from "next/server";
import { getDb, Part } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export function GET(req: NextRequest) {
  const db = getDb();
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const category = req.nextUrl.searchParams.get("category")?.trim() ?? "";

  let sql = "SELECT * FROM parts";
  const where: string[] = [];
  const args: unknown[] = [];

  if (q) {
    where.push("(name LIKE ? OR part_number LIKE ? OR serial_number LIKE ? OR location LIKE ? OR notes LIKE ?)");
    const like = `%${q}%`;
    args.push(like, like, like, like, like);
  }
  if (category) {
    where.push("category = ?");
    args.push(category);
  }
  if (where.length) sql += " WHERE " + where.join(" AND ");
  sql += " ORDER BY name COLLATE NOCASE";

  const parts = db.prepare(sql).all(...args) as Part[];
  const categories = db
    .prepare("SELECT DISTINCT category FROM parts WHERE category != '' ORDER BY category")
    .all() as { category: string }[];

  return NextResponse.json({ parts, categories: categories.map((c) => c.category) });
}

export async function POST(req: NextRequest) {
  if (!(await getSessionUser())) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const db = getDb();
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const stmt = db.prepare(
    `INSERT INTO parts (name, part_number, serial_number, vendor, url, category, quantity, location, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const result = stmt.run(
    name,
    String(body.part_number ?? "").trim(),
    String(body.serial_number ?? "").trim(),
    String(body.vendor ?? "").trim(),
    String(body.url ?? "").trim(),
    String(body.category ?? "").trim(),
    Math.max(0, Number(body.quantity) || 0),
    String(body.location ?? "").trim(),
    String(body.notes ?? "").trim()
  );
  const part = db.prepare("SELECT * FROM parts WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json({ part }, { status: 201 });
}
