"use client";

import { KIND_COLORS, Zone } from "@/lib/zones";

export function FloorMap({
  counts,
  selected,
  onSelect,
  zones,
  viewBox = "0 -10 1010 730",
}: {
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (id: string | null) => void;
  zones: Zone[];
  viewBox?: string;
}) {
  const W = parseFloat(viewBox.split(" ")[2]) - 10;
  const H = parseFloat(viewBox.split(" ")[3]) - 30;
  return (
    <svg
      viewBox={viewBox}
      style={{ width: "100%", height: "auto", display: "block" }}
      role="img"
      aria-label="Lab floor plan"
    >
      {/* room boundary + doors */}
      <rect x={0} y={0} width={W} height={H} fill="var(--bg)" stroke="var(--border)" rx={10} />
      {zones.length > 10 && (<>

      <rect x={330} y={-9} width={140} height={10} fill="var(--bg-raised)" stroke="var(--border-strong)" />
      <text x={400} y={-2} textAnchor="middle" fontSize={9} fill="var(--text-faint)">SLIDING DOOR</text>
      <rect x={640} y={-9} width={70} height={10} fill="var(--bg-raised)" stroke="var(--border-strong)" />
      <text x={675} y={-2} textAnchor="middle" fontSize={9} fill="var(--text-faint)">EXIT</text>
      <rect x={10} y={690} width={90} height={10} fill="var(--bg-raised)" stroke="var(--border-strong)" />
      <text x={55} y={698} textAnchor="middle" fontSize={9} fill="var(--text-faint)">HALLWAY</text>
      <rect x={300} y={690} width={180} height={10} fill="var(--bg-raised)" stroke="var(--border-strong)" />
      <text x={390} y={698} textAnchor="middle" fontSize={9} fill="var(--text-faint)">TV</text>
      <rect x={620} y={690} width={100} height={10} fill="var(--bg-raised)" stroke="var(--border-strong)" />
      <text x={670} y={698} textAnchor="middle" fontSize={9} fill="var(--text-faint)">CLASS DOOR</text>
      </>)}

      {zones.map((z: Zone) => {
        const c = KIND_COLORS[z.kind];
        const n = counts[z.id] ?? 0;
        const sel = selected === z.id;
        return (
          <g
            key={z.id}
            onClick={() => onSelect(sel ? null : z.id)}
            style={{ cursor: "pointer" }}
          >
            {z.rects.map((r, i) => (
              <rect
                key={i}
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                rx={r.r ?? 4}
                fill={sel ? c : `${c}26`}
                fillOpacity={sel ? 0.9 : 1}
                stroke={c}
                strokeWidth={sel ? 3 : 1.5}
                style={{ transition: "fill .15s, stroke-width .1s" }}
              />
            ))}
            {z.rects[0] && (
              <text
                x={z.rects[0].x + z.rects[0].w / 2}
                y={z.rects[0].y + z.rects[0].h / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={z.rects[0].w > 90 ? 13 : 9}
                fill={sel ? "#0b1526" : "var(--text)"}
                fontWeight={600}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {z.label}
              </text>
            )}
            {n > 0 && (
              <g style={{ pointerEvents: "none" }}>
                <circle
                  cx={z.rects[0].x + z.rects[0].w - 8}
                  cy={z.rects[0].y + 8}
                  r={10}
                  fill={sel ? "#0b1526" : "var(--accent)"}
                />
                <text
                  x={z.rects[0].x + z.rects[0].w - 8}
                  y={z.rects[0].y + 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill={sel ? "var(--accent)" : "#0b1526"}
                >
                  {n}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
