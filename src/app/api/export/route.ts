import { NextResponse } from "next/server";
import { getDb, Part } from "@/lib/db";

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function GET() {
  const db = getDb();
  const parts = db.prepare("SELECT * FROM parts ORDER BY name").all() as Part[];
  const header = "Item,Item Number (SKU),Serial Number,Vendor,URL,Category,Qty,Location,Notes,Updated";
  const lines = parts.map((p) =>
    [p.name, p.part_number, p.serial_number, p.vendor, p.url, p.category, p.quantity, p.location, p.notes, p.updated_at]
      .map(csvEscape)
      .join(",")
  );
  const csv = [header, ...lines].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="10913-inventory-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
