export interface Zone {
  id: string;
  label: string;
  keywords: string[]; // matched against part.location (lowercase substring)
  rects: { x: number; y: number; w: number; h: number; r?: number }[];
  kind: "storage" | "boxes" | "tables" | "tools" | "machine" | "misc";
}

// Based on the lab floor plan: storage units, CNCs, tables, racks, bins.
export const ZONES: Zone[] = [
  { id: "storage-1", label: "Storage unit #1", keywords: ["storage unit 1", "storage 1", "unit 1"], kind: "storage",
    rects: [{ x: 20, y: 30, w: 70, h: 55 }] },
  { id: "storage-2", label: "Storage unit #2", keywords: ["storage unit 2", "storage 2", "unit 2"], kind: "storage",
    rects: [{ x: 20, y: 95, w: 70, h: 55 }] },
  { id: "boxes-nw", label: "Boxes (north)", keywords: ["boxes north", "box n", "boxes"], kind: "boxes",
    rects: [{ x: 105, y: 60, w: 85, h: 75 }, { x: 20, y: 160, w: 55, h: 55, r: 8 }] },
  { id: "cnc-top", label: "CNC (top)", keywords: ["cnc top", "cnc 1", "cnc"], kind: "machine",
    rects: [{ x: 235, y: 45, w: 110, h: 90 }] },
  { id: "boxes-cnc", label: "Boxes (by CNC)", keywords: ["boxes cnc"], kind: "boxes",
    rects: [{ x: 295, y: 140, w: 55, h: 48, r: 6 }] },
  { id: "tables-west", label: "Tables (west)", keywords: ["table w", "tables west", "table"], kind: "tables",
    rects: [
      { x: 140, y: 160, w: 95, h: 120 },
      { x: 245, y: 200, w: 70, h: 120 },
      { x: 245, y: 330, w: 70, h: 110 },
      { x: 145, y: 450, w: 120, h: 65 },
    ] },
  { id: "printers", label: "3D printers", keywords: ["3d", "printer"], kind: "machine",
    rects: [{ x: 0, y: 260, w: 80, h: 150 }] },
  { id: "boxes-mid", label: "Boxes (mid)", keywords: ["boxes mid"], kind: "boxes",
    rects: [{ x: 545, y: 215, w: 115, h: 75 }] },
  { id: "tables-east", label: "Tables (east)", keywords: ["table e", "tables east"], kind: "tables",
    rects: [
      { x: 570, y: 300, w: 75, h: 120 },
      { x: 570, y: 430, w: 75, h: 115 },
    ] },
  { id: "shaping-top", label: "Shaping/cutting (top)", keywords: ["shaping top"], kind: "tools",
    rects: [{ x: 640, y: 75, w: 330, h: 55 }] },
  { id: "shaping-right", label: "Shaping/cutting (right)", keywords: ["shaping", "cutting tools"], kind: "tools",
    rects: [{ x: 880, y: 140, w: 90, h: 320 }] },
  { id: "screw-rack", label: "Nail/screw rack", keywords: ["rack", "nail", "screw"], kind: "tools",
    rects: [{ x: 770, y: 390, w: 40, h: 65 }] },
  { id: "utility", label: "Utility storage", keywords: ["utility"], kind: "storage",
    rects: [{ x: 745, y: 505, w: 60, h: 55 }] },
  { id: "cutting-tool", label: "Cutting tool", keywords: ["cutting tool"], kind: "machine",
    rects: [{ x: 855, y: 525, w: 70, h: 55 }] },
  { id: "big-box", label: "Big Box", keywords: ["big box"], kind: "boxes",
    rects: [{ x: 700, y: 595, w: 85, h: 60 }] },
  { id: "tool-bin", label: "Tool bin", keywords: ["tool bin", "tool"], kind: "misc",
    rects: [{ x: 800, y: 590, w: 95, h: 85 }] },
  { id: "bin", label: "BIN", keywords: ["bin"], kind: "misc",
    rects: [{ x: 115, y: 640, w: 110, h: 55 }] },
  { id: "cnc-bottom", label: "CNC (bottom)", keywords: ["cnc bottom", "cnc 2"], kind: "machine",
    rects: [{ x: 335, y: 615, w: 110, h: 85 }] },
];

export function zoneForLocation(location: string, zones: Zone[] = ZONES): Zone | null {
  const loc = location.toLowerCase().trim();
  if (!loc) return null;
  // prefer longer/more-specific keyword matches first
  const scored = zones.map((z) => ({
    z,
    score: Math.max(0, ...z.keywords.filter((k) => loc.includes(k)).map((k) => k.length)),
  })).filter((s) => s.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.z ?? null;
}

export const KIND_COLORS: Record<Zone["kind"], string> = {
  storage: "#ef5f5f",
  boxes: "#c8a165",
  tables: "#b8913f",
  tools: "#8a6cd9",
  machine: "#5b93f0",
  misc: "#7a8494",
};

// Alternate layout for events/competitions — the pit.
export const EVENT_ZONES: Zone[] = [
  { id: "pit-table", label: "Pit table", keywords: ["pit table", "pit"], kind: "tables",
    rects: [{ x: 60, y: 60, w: 220, h: 90 }] },
  { id: "tool-cart", label: "Tool cart", keywords: ["tool cart", "cart"], kind: "tools",
    rects: [{ x: 60, y: 190, w: 120, h: 150 }] },
  { id: "spares", label: "Spare parts bin", keywords: ["spares", "spare"], kind: "boxes",
    rects: [{ x: 220, y: 190, w: 120, h: 150 }] },
  { id: "charging", label: "Charging station", keywords: ["charging", "battery", "charger"], kind: "machine",
    rects: [{ x: 60, y: 380, w: 140, h: 120 }] },
  { id: "trailer", label: "Trailer / van", keywords: ["trailer", "van", "truck"], kind: "misc",
    rects: [{ x: 240, y: 380, w: 140, h: 120 }] },
  { id: "crate", label: "Travel crate", keywords: ["crate", "road case"], kind: "boxes",
    rects: [{ x: 60, y: 540, w: 160, h: 100 }] },
];

export const LAYOUTS: Record<string, { label: string; zones: Zone[]; viewBox: string }> = {
  shop: { label: "Shop", zones: ZONES, viewBox: "0 -10 1010 730" },
  event: { label: "Event pit", zones: EVENT_ZONES, viewBox: "0 -10 460 660" },
};
