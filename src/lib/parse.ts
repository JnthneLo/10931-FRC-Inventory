export type FieldKey = "name" | "part_number" | "serial_number" | "vendor" | "url" | "category" | "quantity" | "location" | "notes" | "skip";

export interface ParsedRow {
  rowIndex: number;
  name: string;
  part_number: string;
  serial_number: string;
  vendor: string;
  url: string;
  category: string;
  quantity: number;
  location: string;
  notes: string;
  flags: { level: "error" | "warning"; message: string }[];
}

const HEADER_SYNONYMS: Record<Exclude<FieldKey, "skip">, RegExp[]> = {
  name: [/^(item|name|part|description|component|title|product|item ?name|part ?name)$/i],
  part_number: [/sku/i, /part ?(num|no|#)/i, /item ?(num|no|#)/i, /p\/?n/i, /model ?(num|no|#)/i],
  serial_number: [/serial/i, /s\/?n/i],
  vendor: [/vendor/i, /supplier/i, /manufacturer/i, /brand/i, /store/i, /source/i],
  url: [/url/i, /link/i, /website/i, /product ?page/i],
  category: [/categor/i, /type/i, /group/i, /subsystem/i, /department/i],
  quantity: [/qty/i, /quant/i, /count/i, /amount/i, /stock/i, /^#/, /number ?of/i, /on ?hand/i],
  location: [/locat/i, /bin/i, /shelf/i, /box/i, /spot/i, /where/i, /drawer/i, /cabinet/i, /storage/i],
  notes: [/note/i, /comment/i, /remark/i, /detail/i, /extra/i],
};

export function guessMapping(headers: string[]): FieldKey[] {
  const used = new Set<FieldKey>();
  return headers.map((h) => {
    const norm = h.trim();
    if (!norm) return "skip";
    for (const [field, patterns] of Object.entries(HEADER_SYNONYMS) as [Exclude<FieldKey, "skip">, RegExp[]][]) {
      if (used.has(field)) continue;
      if (patterns.some((p) => p.test(norm))) {
        used.add(field);
        return field;
      }
    }
    return "skip";
  });
}

/** Fallback mapping when the sheet has no header row: assume a common column order. */
export function defaultMapping(colCount: number): FieldKey[] {
  const order: FieldKey[] = ["name", "part_number", "serial_number", "quantity", "location", "vendor", "url", "category", "notes"];
  return Array.from({ length: colCount }, (_, i) => order[i] ?? "skip");
}

export function looksLikeHeader(row: string[]): boolean {
  return row.some((cell) =>
    Object.values(HEADER_SYNONYMS).flat().some((p) => p.test(String(cell).trim()))
  );
}

function parseQuantity(raw: string): { qty: number; flag?: string } {
  const s = String(raw).trim();
  if (!s) return { qty: 0, flag: "Quantity missing — defaulted to 0" };
  const n = Number(s);
  if (Number.isInteger(n) && n >= 0) return { qty: n };
  const m = s.match(/\d+/);
  if (m) return { qty: parseInt(m[0], 10), flag: `Quantity "${s}" was cleaned to ${m[0]}` };
  return { qty: 0, flag: `Quantity "${s}" not understood — set to 0` };
}

export function buildRows(
  data: string[][],
  mapping: FieldKey[],
  startIndex: number,
  existingPartNumbers: Set<string>
): ParsedRow[] {
  const seen = new Map<string, number>();
  return data.slice(startIndex).map((cells, i) => {
    const rowIndex = startIndex + i;
    const get = (f: FieldKey) => {
      const idx = mapping.indexOf(f);
      return idx >= 0 ? String(cells[idx] ?? "").trim() : "";
    };
    const flags: ParsedRow["flags"] = [];
    const name = get("name");
    const part_number = get("part_number");
    const { qty, flag } = parseQuantity(get("quantity"));
    if (flag) flags.push({ level: "warning", message: flag });
    if (!name) flags.push({ level: "error", message: "Missing item name" });
    if (!get("location")) flags.push({ level: "warning", message: "No location" });
    if (part_number) {
      const key = part_number.toLowerCase();
      if (existingPartNumbers.has(key)) flags.push({ level: "warning", message: "Part # already exists in inventory" });
      const prev = seen.get(key);
      if (prev !== undefined) flags.push({ level: "warning", message: `Duplicate part # (also row ${prev + 1})` });
      seen.set(key, rowIndex);
    }
    if (cells.every((c) => !String(c).trim())) flags.push({ level: "error", message: "Empty row" });
    return {
      rowIndex,
      name,
      part_number,
      serial_number: get("serial_number"),
      vendor: get("vendor"),
      url: get("url"),
      category: get("category"),
      quantity: qty,
      location: get("location"),
      notes: get("notes"),
      flags,
    };
  });
}
