"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader, Toasts, useToasts } from "@/components/ui";
import { AuthGate } from "@/components/AuthGate";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FloorMap } from "@/components/FloorMap";
import { zoneForLocation, LAYOUTS } from "@/lib/zones";
import { VENDORS, partLink } from "@/lib/vendors";

interface Part {
  id: number;
  name: string;
  part_number: string;
  serial_number: string;
  vendor: string;
  url: string;
  category: string;
  quantity: number;
  location: string;
  notes: string;
}

interface Txn {
  id: number;
  type: "out" | "in" | "adjust";
  delta: number;
  qty_after: number;
  person: string;
  note: string;
  created_at: string;
}

type SortKey = "name" | "part_number" | "category" | "quantity" | "location";

const emptyForm = { name: "", part_number: "", serial_number: "", vendor: "", url: "", category: "", quantity: 0, location: "", notes: "" };

export default function Home() {
  const router = useRouter();
  const { toasts, push } = useToasts();
  const [parts, setParts] = useState<Part[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Part | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [dragOver, setDragOver] = useState(false);
  const [flashQty, setFlashQty] = useState<number | null>(null);
  const [boot, setBoot] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const [zoneSel, setZoneSel] = useState<string | null>(null);
  const [layout, setLayout] = useState<keyof typeof LAYOUTS>("shop");
  const [person, setPerson] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [txnQty, setTxnQty] = useState(1);
  const [txnNote, setTxnNote] = useState("");
  const [txnType, setTxnType] = useState<"out" | "in">("out");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sessionStorage.getItem("wrangler-booted")) {
      setBoot(true);
      sessionStorage.setItem("wrangler-booted", "1");
      const t = setTimeout(() => setBoot(false), 1600);
      return () => clearTimeout(t);
    }
  }, []);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    const res = await fetch(`/api/parts?${params}`);
    const data = await res.json();
    setParts(data.parts);
    setCategories(data.categories);
  }, [q, category]);

  useEffect(() => {
    const t = setTimeout(load, 180);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    const h = () => load();
    window.addEventListener("inventory-changed", h);
    return () => window.removeEventListener("inventory-changed", h);
  }, [load]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLSelectElement)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const stats = useMemo(() => {
    const units = parts.reduce((s, p) => s + p.quantity, 0);
    const low = parts.filter((p) => p.quantity === 0).length;
    const locs = new Set(parts.map((p) => p.location).filter(Boolean)).size;
    return { units, low, locs };
  }, [parts, layout]);

  const zoneCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of parts) {
      const z = zoneForLocation(p.location, LAYOUTS[layout].zones);
      if (z) m[z.id] = (m[z.id] ?? 0) + 1;
    }
    return m;
  }, [parts, layout]);

  const zoneFiltered = useMemo(() => {
    if (!zoneSel) return parts;
    return parts.filter((p) => zoneForLocation(p.location, LAYOUTS[layout].zones)?.id === zoneSel);
  }, [parts, zoneSel, layout]);

  const sorted = useMemo(() => {
    return [...zoneFiltered].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const c = typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv));
      return c * sortDir;
    });
  }, [zoneFiltered, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(k); setSortDir(1); }
  }

  async function sync(action: string) {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const d = await res.json();
    push(res.ok ? "success" : "error", d.output ?? d.error);
    load();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.reload();
  }

  async function addPart(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/parts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      push("error", (await res.json()).error ?? "Failed to add part");
      return;
    }
    push("success", `Added "${form.name}"`);
    setForm(emptyForm);
    load();
  }

  async function setQuantity(part: Part, quantity: number) {
    const target = Math.max(0, quantity);
    setFlashQty(part.id);
    setTimeout(() => setFlashQty(null), 350);
    const res = await fetch(`/api/parts/${part.id}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "adjust", qty: target, person }),
    });
    if (res.ok) load();
  }

  async function submitTxn(part: Part) {
    const res = await fetch(`/api/parts/${part.id}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: txnType, qty: txnQty, person, note: txnNote }),
    });
    const d = await res.json();
    if (!res.ok) {
      push("error", d.error);
      return;
    }
    push("success", `${txnType === "out" ? "Checked out" : "Returned"} ${txnQty} × ${part.name}`);
    setTxnNote("");
    setTxnQty(1);
    load();
    loadTxns(part.id);
  }

  async function loadTxns(partId: number) {
    const res = await fetch(`/api/parts/${partId}/transactions`);
    const d = await res.json();
    setTxns(d.transactions);
  }

  function toggleExpand(part: Part) {
    if (expanded === part.id) {
      setExpanded(null);
      return;
    }
    setExpanded(part.id);
    setTxns([]);
    setTxnQty(1);
    setTxnNote("");
    loadTxns(part.id);
  }

  async function saveEdit() {
    if (!editForm) return;
    await fetch(`/api/parts/${editForm.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    push("success", `Saved "${editForm.name}"`);
    setEditing(null);
    setEditForm(null);
    load();
  }

  async function removePart(part: Part) {
    if (confirmDelete !== part.id) {
      setConfirmDelete(part.id);
      setTimeout(() => setConfirmDelete((c) => (c === part.id ? null : c)), 2500);
      return;
    }
    setConfirmDelete(null);
    await fetch(`/api/parts/${part.id}`, { method: "DELETE" });
    push("info", `Deleted "${part.name}"`);
    load();
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      sessionStorage.setItem("import-paste", text);
      router.push("/import");
    });
  }

  const vendorSelect = (value: string, onChange: (v: string) => void) => (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Vendor…</option>
      {Object.entries(VENDORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
    </select>
  );

  const sortArrow = (k: SortKey) => (sortKey === k ? (sortDir === 1 ? " ↑" : " ↓") : "");
  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th className="th-sort" onClick={() => toggleSort(k)} style={{ padding: "10px 14px" }}>
      {label}<span style={{ color: "var(--accent)" }}>{sortArrow(k)}</span>
    </th>
  );

  return (
    <AuthGate onUser={(u) => setPerson(u?.name ?? "")}>
    <main
      className="mx-auto max-w-7xl px-6 pb-16"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      style={{ minHeight: "100vh", position: "relative" }}
    >
      <Toasts toasts={toasts} />

      {boot && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 100, background: "var(--bg)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20,
            animation: "fadeIn .2s ease",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Legacy Ranch Robotics" width={110} height={110} style={{ borderRadius: "50%" }} />
          <div className="pixel-font" style={{ fontSize: 11, color: "var(--accent)" }}>
            LEGACY RANCH ROBOTICS
          </div>
          <div className="pixel-bar" style={{ width: 220, height: 14, border: "2px solid var(--border-strong)", borderRadius: 2, padding: 2 }}>
            <div style={{ height: "100%", background: "repeating-linear-gradient(90deg, var(--accent) 0 6px, transparent 6px 8px)", animation: "pixelLoad 1.3s steps(12) forwards" }} />
          </div>
          <div className="pixel-font" style={{ fontSize: 8, color: "var(--text-faint)" }}>
            BOOTING INVENTORY<span style={{ animation: "blinkCursor 1s steps(1) infinite" }}>▌</span>
          </div>
        </div>
      )}

      {dragOver && (
        <div
          className="anim-fade-up"
          style={{
            position: "fixed", inset: 12, zIndex: 40, pointerEvents: "none",
            border: "2px dashed var(--accent)", borderRadius: 16,
            background: "#0a1220cc",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "dropPulse 1.2s ease infinite",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>
            Drop spreadsheet to import
          </div>
        </div>
      )}

      <SiteHeader
        right={
          <>
            <span className="btn btn-ghost" style={{ cursor: "default" }}>👤 {person || "…"}</span>
            <ThemeToggle />
            <button className="btn btn-ghost" onClick={logout} title="Sign out">⏻</button>
            <button className="btn btn-ghost" onClick={() => sync("backup")} title="Commit a CSV backup locally">⟳ Backup</button>
            <button className="btn btn-ghost" onClick={() => sync("pull")} title="Pull latest from remote">⇣</button>
            <button className="btn btn-ghost" onClick={() => sync("push")} title="Backup + push to cloud remote">⇡ Push</button>
            <a href="/api/export" className="btn btn-ghost" download>↓ CSV</a>
            <Link href="/import" className="btn btn-ghost">⇪ Import</Link>
            <button className="btn btn-primary" onClick={() => setShowAdd((s) => !s)}>
              {showAdd ? "✕ Close" : "+ Add part"}
            </button>
          </>
        }
      />

      <div className="anim-fade-up" style={{ display: "flex", gap: 10, marginBottom: 18, animationDelay: "60ms", flexWrap: "wrap" }}>
        {[
          { label: "Line items", value: parts.length },
          { label: "Total units", value: stats.units },
          { label: "Locations", value: stats.locs },
          { label: "Out of stock", value: stats.low, warn: stats.low > 0 },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: "10px 18px", minWidth: 110 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.warn ? "var(--red)" : "var(--text)" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {showAdd && (
        <form onSubmit={addPart} className="card anim-pop" style={{ padding: 16, marginBottom: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
          <input required autoFocus placeholder="Name *" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Part # / SKU" className="input" value={form.part_number} onChange={(e) => setForm({ ...form, part_number: e.target.value })} />
          <input placeholder="Serial #" className="input" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
          {vendorSelect(form.vendor, (v) => setForm({ ...form, vendor: v }))}
          <input placeholder="Category" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} list="cats" />
          <input placeholder="Qty" type="number" min={0} className="input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
          <input placeholder="Location" className="input" list="zones" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <input placeholder="Product URL (optional)" className="input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <input placeholder="Notes" className="input" style={{ gridColumn: "1 / -2" }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button className="btn btn-primary" style={{ justifyContent: "center" }}>Add</button>
        </form>
      )}

      <div className="anim-fade-up" style={{ display: "flex", gap: 8, marginBottom: 12, animationDelay: "120ms" }}>
        <input
          ref={searchRef}
          placeholder="Search…  ( / )"
          className="input"
          style={{ width: 320 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {(q || category) && (
          <button className="btn btn-ghost" onClick={() => { setQ(""); setCategory(""); }}>Clear</button>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4, background: "var(--bg-raised)", border: "1px solid var(--border)", borderRadius: 9, padding: 3 }}>
          {(["list", "map"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: view === v ? "var(--accent)" : "transparent",
                color: view === v ? "#13294b" : "var(--text-dim)",
                textTransform: "capitalize",
              }}
            >
              {v === "list" ? "☰ List" : "▦ Map"}
            </button>
          ))}
        </div>
      </div>

      <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      <datalist id="zones">{LAYOUTS[layout].zones.map((z) => <option key={z.id} value={z.label} />)}</datalist>

      {view === "map" && (
        <div className="card anim-fade-up" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {(Object.keys(LAYOUTS) as (keyof typeof LAYOUTS)[]).map((k) => (
              <button key={k} className="btn btn-ghost" style={layout === k ? { borderColor: "var(--accent)", color: "var(--accent)" } : {}} onClick={() => { setLayout(k); setZoneSel(null); }}>
                {LAYOUTS[k].label}
              </button>
            ))}
          </div>
          <FloorMap counts={zoneCounts} selected={zoneSel} onSelect={setZoneSel} zones={LAYOUTS[layout].zones} viewBox={LAYOUTS[layout].viewBox} />
          <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 12, color: "var(--text-dim)", flexWrap: "wrap" }}>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#ef5f5f55", border: "1px solid #ef5f5f", borderRadius: 2, marginRight: 4 }} />Storage</span>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#c8a16555", border: "1px solid #c8a165", borderRadius: 2, marginRight: 4 }} />Boxes</span>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#b8913f55", border: "1px solid #b8913f", borderRadius: 2, marginRight: 4 }} />Tables</span>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#8a6cd955", border: "1px solid #8a6cd9", borderRadius: 2, marginRight: 4 }} />Tools</span>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#5b93f055", border: "1px solid #5b93f0", borderRadius: 2, marginRight: 4 }} />Machines</span>
            {zoneSel && <button className="link-btn" onClick={() => setZoneSel(null)}>clear zone filter</button>}
          </div>
        </div>
      )}

      <div className="card anim-fade-up" style={{ overflow: "hidden", animationDelay: "160ms" }}>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-hover)", color: "var(--text-dim)", textAlign: "left", fontSize: 12 }}>
              <Th k="name" label="Name" />
              <Th k="part_number" label="Part #" />
              <th style={{ padding: "10px 14px" }}>Serial #</th>
              <Th k="category" label="Category" />
              <Th k="quantity" label="Qty" />
              <Th k="location" label="Location" />
              <th style={{ padding: "10px 14px" }}>Notes</th>
              <th style={{ padding: "10px 14px", width: 150 }}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => {
              const link = partLink(p);
              const isExpanded = expanded === p.id;
              return (
                <PartRows
                  key={p.id}
                  p={p}
                  i={i}
                  link={link}
                  isExpanded={isExpanded}
                  editing={editing}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  saveEdit={saveEdit}
                  cancelEdit={() => { setEditing(null); setEditForm(null); }}
                  startEdit={() => { setEditing(p.id); setEditForm(p); }}
                  confirmDelete={confirmDelete}
                  removePart={removePart}
                  setQuantity={setQuantity}
                  flashQty={flashQty}
                  toggleExpand={toggleExpand}
                  txns={txns}
                  txnQty={txnQty}
                  setTxnQty={setTxnQty}
                  txnNote={txnNote}
                  setTxnNote={setTxnNote}
                  txnType={txnType}
                  setTxnType={setTxnType}
                  submitTxn={submitTxn}
                  person={person}
                  askPerson={() => {}}
                  vendorSelect={vendorSelect}
                />
              );
            })}
            {parts.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: "48px 16px", textAlign: "center", color: "var(--text-faint)" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
                  No parts yet — hit <b>+ Add part</b>, or <Link href="/import" style={{ color: "var(--blue)" }}>import your spreadsheet</Link> (or just drop the file anywhere on this page).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
    </AuthGate>
  );
}

function PartRows(props: {
  p: Part; i: number; link: string | null; isExpanded: boolean;
  editing: number | null; editForm: Part | null; setEditForm: (p: Part) => void;
  saveEdit: () => void; cancelEdit: () => void; startEdit: () => void;
  confirmDelete: number | null; removePart: (p: Part) => void;
  setQuantity: (p: Part, q: number) => void; flashQty: number | null;
  toggleExpand: (p: Part) => void;
  txns: Txn[]; txnQty: number; setTxnQty: (n: number) => void;
  txnNote: string; setTxnNote: (s: string) => void;
  txnType: "out" | "in"; setTxnType: (t: "out" | "in") => void;
  submitTxn: (p: Part) => void; person: string; askPerson: () => void;
  vendorSelect: (v: string, cb: (v: string) => void) => React.ReactNode;
}) {
  const { p, i, link, isExpanded, editing, editForm } = props;
  const td = { padding: "9px 14px" } as const;
  const isEditing = editing === p.id && editForm;

  return (
    <>
      <tr className="anim-row" style={{ borderTop: "1px solid var(--border)", animationDelay: `${Math.min(i, 20) * 25}ms`, background: isExpanded ? "#101a2e55" : undefined }}>
        {isEditing ? (
          <>
            <td style={td}><input className="input" value={editForm.name} onChange={(e) => props.setEditForm({ ...editForm, name: e.target.value })} /></td>
            <td style={td}><input className="input" value={editForm.part_number} onChange={(e) => props.setEditForm({ ...editForm, part_number: e.target.value })} /></td>
            <td style={td}><input className="input" value={editForm.serial_number} onChange={(e) => props.setEditForm({ ...editForm, serial_number: e.target.value })} /></td>
            <td style={td} colSpan={2}>
              <div style={{ display: "flex", gap: 6 }}>
                {props.vendorSelect(editForm.vendor, (v) => props.setEditForm({ ...editForm, vendor: v }))}
                <input className="input" placeholder="URL" value={editForm.url} onChange={(e) => props.setEditForm({ ...editForm, url: e.target.value })} />
              </div>
            </td>
            <td style={td}><input className="input" type="number" min={0} value={editForm.quantity} onChange={(e) => props.setEditForm({ ...editForm, quantity: Number(e.target.value) })} /></td>
            <td style={td}><input className="input" value={editForm.location} onChange={(e) => props.setEditForm({ ...editForm, location: e.target.value })} /></td>
            <td style={td}>
              <input className="input" placeholder="Category" value={editForm.category} onChange={(e) => props.setEditForm({ ...editForm, category: e.target.value })} list="cats" />
              <input className="input" style={{ marginTop: 4 }} placeholder="Notes" value={editForm.notes} onChange={(e) => props.setEditForm({ ...editForm, notes: e.target.value })} />
            </td>
            <td style={{ ...td, whiteSpace: "nowrap" }}>
              <button onClick={props.saveEdit} className="link-btn" style={{ color: "var(--green)", marginRight: 10 }}>Save</button>
              <button onClick={props.cancelEdit} className="link-btn" style={{ color: "var(--text-dim)" }}>Cancel</button>
            </td>
          </>
        ) : (
          <>
            <td style={{ ...td, fontWeight: 600 }}>{p.name}</td>
            <td style={{ ...td, fontFamily: "var(--font-geist-mono)", fontSize: 12 }}>
              {link ? (
                <a href={link} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }} title={link}>
                  {p.part_number} ↗
                </a>
              ) : (
                <span style={{ color: "var(--text-dim)" }}>{p.part_number || "—"}</span>
              )}
              {p.vendor && <div style={{ fontSize: 10, color: "var(--text-faint)" }}>{VENDORS[p.vendor]?.label ?? p.vendor}</div>}
            </td>
            <td style={{ ...td, color: "var(--text-dim)", fontFamily: "var(--font-geist-mono)", fontSize: 12 }}>{p.serial_number || "—"}</td>
            <td style={td}>{p.category ? <span className="badge badge-dim">{p.category}</span> : "—"}</td>
            <td style={td}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => props.setQuantity(p, p.quantity - 1)} className="icon-btn">−</button>
                <span
                  key={`${p.id}-${p.quantity}`}
                  className={props.flashQty === p.id ? "flash-qty" : ""}
                  style={{ width: 34, textAlign: "center", fontWeight: 700, color: p.quantity === 0 ? "var(--red)" : undefined, display: "inline-block" }}
                >
                  {p.quantity}
                </span>
                <button onClick={() => props.setQuantity(p, p.quantity + 1)} className="icon-btn">+</button>
                {p.quantity === 0 && <span className="badge badge-red">out</span>}
              </div>
            </td>
            <td style={{ ...td, color: p.location ? "var(--text)" : "var(--text-faint)" }}>{p.location || "—"}</td>
            <td style={{ ...td, color: "var(--text-dim)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.notes}>{p.notes || "—"}</td>
            <td style={{ ...td, whiteSpace: "nowrap" }}>
              <button onClick={() => props.toggleExpand(p)} className="link-btn" style={{ marginRight: 10, color: isExpanded ? "var(--accent)" : undefined }}>
                {isExpanded ? "▾ Log" : "▸ Log"}
              </button>
              <button onClick={props.startEdit} className="link-btn" style={{ marginRight: 10 }}>Edit</button>
              <button
                onClick={() => props.removePart(p)}
                className={`link-btn ${props.confirmDelete === p.id ? "danger" : ""}`}
                style={props.confirmDelete === p.id ? { fontWeight: 700 } : { color: "var(--text-faint)" }}
              >
                {props.confirmDelete === p.id ? "Sure?" : "Delete"}
              </button>
            </td>
          </>
        )}
      </tr>

      {isExpanded && (
        <tr className="anim-fade-up" style={{ background: "#0e1830" }}>
          <td colSpan={8} style={{ padding: "12px 20px 16px" }}>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {/* check out / in */}
              <div style={{ minWidth: 260 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>
                  Check out / return
                </div>
                {props.person ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <select className="input" value={props.txnType} onChange={(e) => props.setTxnType(e.target.value as "out" | "in")}>
                      <option value="out">Take out</option>
                      <option value="in">Return</option>
                    </select>
                    <input className="input" type="number" min={1} style={{ width: 70 }} value={props.txnQty} onChange={(e) => props.setTxnQty(Number(e.target.value))} />
                    <input className="input" placeholder="Note (optional)" style={{ width: 160 }} value={props.txnNote} onChange={(e) => props.setTxnNote(e.target.value)} />
                    <button className="btn btn-primary" onClick={() => props.submitTxn(p)}>Log</button>
                  </div>
                ) : (
                  <button className="btn btn-ghost" onClick={props.askPerson}>Set your name to log check-outs</button>
                )}
              </div>

              {/* history */}
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>
                  History
                </div>
                {props.txns.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--text-faint)" }}>No activity yet.</div>
                ) : (
                  <div style={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                    {props.txns.map((t) => (
                      <div key={t.id} style={{ fontSize: 12, display: "flex", gap: 8, alignItems: "baseline" }}>
                        <span className={`badge ${t.type === "out" ? "badge-red" : t.type === "in" ? "badge-green" : "badge-dim"}`}>
                          {t.type === "out" ? "out" : t.type === "in" ? "in" : "adj"}
                        </span>
                        <span style={{ fontFamily: "var(--font-geist-mono)", color: "var(--text-dim)" }}>
                          {t.delta > 0 ? "+" : ""}{t.delta} → {t.qty_after}
                        </span>
                        <span style={{ color: "var(--accent)", fontWeight: 600 }}>{t.person || "—"}</span>
                        <span style={{ color: "var(--text-faint)" }}>{t.note}</span>
                        <span style={{ marginLeft: "auto", color: "var(--text-faint)", fontSize: 11 }}>{t.created_at}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
