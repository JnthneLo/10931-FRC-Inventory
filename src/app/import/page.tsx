"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { SiteHeader, Toasts, useToasts } from "@/components/ui";
import { AuthGate } from "@/components/AuthGate";
import {
  buildRows,
  defaultMapping,
  guessMapping,
  looksLikeHeader,
  FieldKey,
  ParsedRow,
} from "@/lib/parse";

const FIELD_LABELS: { value: FieldKey; label: string }[] = [
  { value: "skip", label: "— ignore —" },
  { value: "name", label: "Item name" },
  { value: "part_number", label: "Part # / SKU" },
  { value: "serial_number", label: "Serial #" },
  { value: "vendor", label: "Vendor" },
  { value: "url", label: "Product URL" },
  { value: "category", label: "Category" },
  { value: "quantity", label: "Quantity" },
  { value: "location", label: "Location" },
  { value: "notes", label: "Notes" },
];

export default function ImportPage() {
  const { toasts, push } = useToasts();
  const [raw, setRaw] = useState("");
  const [data, setData] = useState<string[][]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<FieldKey[]>([]);
  const [existingPNs, setExistingPNs] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState("");
  const [dragOver, setDragOver] = useState(false);

  function ingest(text: string) {
    setRaw(text);
    setDone("");
    const parsed = Papa.parse<string[]>(text.trim(), { skipEmptyLines: "greedy" });
    const rows = parsed.data.filter((r) => r.length > 0);
    if (rows.length === 0) {
      setData([]);
      return;
    }
    const header = looksLikeHeader(rows[0]);
    setHasHeader(header);
    setData(rows);
    setMapping(header ? guessMapping(rows[0]) : defaultMapping(rows[0].length));
    fetch("/api/parts")
      .then((r) => r.json())
      .then((d) =>
        setExistingPNs(new Set(d.parts.map((p: { part_number: string }) => p.part_number.toLowerCase()).filter(Boolean)))
      );
  }

  // pick up a file dropped on the main page
  useEffect(() => {
    const stashed = sessionStorage.getItem("import-paste");
    if (stashed) {
      sessionStorage.removeItem("import-paste");
      ingest(stashed);
      push("info", "File loaded from drag & drop");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) file.text().then(ingest);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) file.text().then(ingest);
    else if (e.dataTransfer.getData("text")) ingest(e.dataTransfer.getData("text"));
  }

  const rows: ParsedRow[] = useMemo(
    () => (data.length ? buildRows(data, mapping, hasHeader ? 1 : 0, existingPNs) : []),
    [data, mapping, hasHeader, existingPNs]
  );

  const errors = rows.filter((r) => r.flags.some((f) => f.level === "error"));
  const warnings = rows.filter((r) => r.flags.some((f) => f.level === "warning"));
  const clean = rows.filter((r) => r.flags.length === 0);
  const importable = rows.filter((r) => !r.flags.some((f) => f.level === "error"));

  const headers = hasHeader ? data[0] : data[0]?.map((_, i) => `Column ${i + 1}`) ?? [];

  async function doImport() {
    setImporting(true);
    const res = await fetch("/api/parts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parts: importable }),
    });
    const d = await res.json();
    setImporting(false);
    if (res.ok) {
      setDone(`Imported ${d.inserted} parts — ${errors.length} row(s) skipped.`);
      push("success", `Imported ${d.inserted} parts`);
    } else {
      push("error", `Import failed: ${d.error}`);
    }
  }

  return (
    <AuthGate onUser={() => {}}>
    <main
      className="mx-auto max-w-6xl px-6 pb-16"
      style={{ minHeight: "100vh" }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <Toasts toasts={toasts} />
      <SiteHeader
        right={<Link href="/" className="btn btn-ghost">← Inventory</Link>}
      />

      <h1 className="anim-fade-up" style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Import from spreadsheet</h1>
      <p className="anim-fade-up" style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 16, animationDelay: "40ms" }}>
        Paste rows from Google Sheets / Excel, or drag &amp; drop a <code>.csv</code> file. Columns auto-detect — fix the mapping and flags before importing.
      </p>

      {/* dropzone / paste area */}
      <div
        className="card anim-fade-up"
        style={{
          padding: 0,
          marginBottom: 20,
          animationDelay: "80ms",
          border: dragOver ? "2px dashed var(--accent)" : "2px dashed var(--border)",
          background: dragOver ? "var(--accent-soft)" : "var(--bg-raised)",
          transition: "border-color .15s, background .15s",
        }}
      >
        <textarea
          className="input"
          style={{
            border: "none", background: "transparent", height: 130, resize: "vertical",
            fontFamily: "var(--font-geist-mono)", fontSize: 12, boxShadow: "none",
          }}
          placeholder={"Paste rows here…  or drop a .csv file anywhere on this page\n\nItem\tItem Number (SKU)\tSerial Number\tQty\tLocation\nGlue gun\tA-1\t\t1\tmisc. box 1"}
          value={raw}
          onChange={(e) => ingest(e.target.value)}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", borderTop: "1px solid var(--border)" }}>
          <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{dragOver ? "Drop it!" : "Supports paste, drag & drop, or file picker"}</span>
          <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
            Choose file
            <input type="file" accept=".csv,.tsv,.txt" onChange={onFile} style={{ display: "none" }} />
          </label>
        </div>
      </div>

      {data.length > 0 && (
        <div className="anim-fade-up">
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
            <h2 style={{ fontWeight: 700, fontSize: 15 }}>Column mapping</h2>
            <label style={{ fontSize: 12, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
              First row is a header
            </label>
          </div>

          <div className="card" style={{ padding: 14, display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            {headers.map((h, i) => (
              <label key={i} style={{ fontSize: 11, color: "var(--text-faint)" }}>
                <span style={{ display: "block", marginBottom: 4, fontFamily: "var(--font-geist-mono)", color: "var(--text-dim)" }}>
                  {h || `(col ${i + 1})`}
                </span>
                <select
                  className="input"
                  value={mapping[i] ?? "skip"}
                  onChange={(e) => {
                    const next = [...mapping];
                    next[i] = e.target.value as FieldKey;
                    setMapping(next);
                  }}
                >
                  {FIELD_LABELS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </label>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <span className="badge badge-green">{clean.length} clean</span>
            <span className="badge badge-warn">{warnings.length} warning{warnings.length === 1 ? "" : "s"}</span>
            <span className="badge badge-red">{errors.length} error{errors.length === 1 ? "" : "s"} · skipped</span>
          </div>

          <div className="card" style={{ overflow: "auto", maxHeight: 420 }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-hover)", color: "var(--text-dim)", textAlign: "left", fontSize: 12, position: "sticky", top: 0 }}>
                  {["#", "Name", "Part #", "Serial #", "Category", "Qty", "Location", "Flags"].map((h) => (
                    <th key={h} style={{ padding: "9px 14px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const hasErr = r.flags.some((f) => f.level === "error");
                  return (
                    <tr
                      key={r.rowIndex}
                      className="anim-row"
                      style={{
                        borderTop: "1px solid var(--border)",
                        background: hasErr ? "#f0564f11" : r.flags.length ? "#f5c5240d" : undefined,
                        animationDelay: `${Math.min(i, 20) * 20}ms`,
                      }}
                    >
                      <td style={{ padding: "7px 14px", color: "var(--text-faint)" }}>{r.rowIndex + 1}</td>
                      <td style={{ padding: "7px 14px", fontWeight: 600 }}>{r.name || "—"}</td>
                      <td style={{ padding: "7px 14px", color: "var(--text-dim)", fontFamily: "var(--font-geist-mono)", fontSize: 12 }}>{r.part_number || "—"}</td>
                      <td style={{ padding: "7px 14px", color: "var(--text-dim)", fontFamily: "var(--font-geist-mono)", fontSize: 12 }}>{r.serial_number || "—"}</td>
                      <td style={{ padding: "7px 14px" }}>{r.category || "—"}</td>
                      <td style={{ padding: "7px 14px" }}>{r.quantity}</td>
                      <td style={{ padding: "7px 14px" }}>{r.location || "—"}</td>
                      <td style={{ padding: "7px 14px", fontSize: 12 }}>
                        {r.flags.map((f, j) => (
                          <div key={j} style={{ color: f.level === "error" ? "var(--red)" : "var(--yellow)" }}>{f.message}</div>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 16 }}>
            <button onClick={doImport} disabled={importing || importable.length === 0} className="btn btn-primary">
              {importing ? "Importing…" : `Import ${importable.length} part${importable.length === 1 ? "" : "s"}`}
            </button>
            {errors.length > 0 && (
              <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
                {errors.length} row(s) with errors will be skipped — fix them in your sheet and re-import.
              </span>
            )}
          </div>
          {done && <p style={{ marginTop: 12, fontSize: 13, color: "var(--green)" }}>{done}</p>}
        </div>
      )}
    </main>
    </AuthGate>
  );
}
