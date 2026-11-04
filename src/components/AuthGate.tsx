"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface User {
  id: number;
  name: string;
}

export function AuthGate({ children, onUser }: { children: React.ReactNode; onUser: (u: User | null) => void }) {
  const [state, setState] = useState<"loading" | "out" | "in">("loading");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState<string[]>([]);
  const [newUser, setNewUser] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) {
          onUser(d.user);
          setState("in");
        } else setState("out");
      })
      .catch(() => setState("out"));
    fetch("/api/auth/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) { setError("Pick your name or create one"); return; }
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, pin }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(d.error ?? "Login failed");
      setPin("");
      return;
    }
    onUser(d.user);
    setState("in");
  }

  if (state === "in") return <>{children}</>;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: "var(--bg)",
        padding: 24,
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 16, right: 16 }}><ThemeToggle /></div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Wrangler Robotics" width={88} height={88} />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>Wrangler Robotics</div>
        <div style={{ fontSize: 12, color: "var(--text-faint)", letterSpacing: ".1em", textTransform: "uppercase" }}>Inventory · FRC 10913</div>
      </div>

      {state === "loading" ? (
        <div className="pixel-bar" style={{ width: 180, height: 10, background: "var(--bg-raised)", border: "1px solid var(--border)", padding: 2 }}>
          <div style={{ height: "100%", borderRadius: 99, background: "var(--accent)", animation: "pixelLoad 1.2s ease infinite" }} />
        </div>
      ) : (
        <form onSubmit={submit} className="card anim-pop" style={{ padding: 22, width: 320, display: "flex", flexDirection: "column", gap: 12 }}>
          {!newUser && users.length > 0 ? (
            <>
              <div style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 600 }}>Who&apos;s on shift?</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {users.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setName(u)}
                    style={{
                      border: `1px solid ${name === u ? "var(--accent)" : "var(--border)"}`,
                      background: name === u ? "var(--accent-soft)" : "var(--bg)",
                      color: name === u ? "var(--accent)" : "var(--text)",
                      borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    {u}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setNewUser(true); setName(""); }}
                  style={{ border: "1px dashed var(--border-strong)", background: "transparent", color: "var(--text-dim)", borderRadius: 8, padding: "7px 12px", fontSize: 12, cursor: "pointer" }}
                >
                  + New
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 600 }}>Your name</div>
              <input className="input" placeholder="First name" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
              <div style={{ fontSize: 10, color: "var(--text-faint)" }}>New here? The PIN you pick becomes your account.</div>
            </>
          )}

          <input
            className="input"
            placeholder="PIN (4–8 digits)"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            inputMode="numeric"
            type="password"
            required
            style={{ fontSize: 15, letterSpacing: ".3em", textAlign: "center" }}
          />
          {error && <div style={{ fontSize: 12, color: "var(--red)", textAlign: "center" }}>{error}</div>}
          <button className="btn btn-primary" disabled={busy} style={{ justifyContent: "center", padding: "10px" }}>
            {busy ? "…" : "Enter the shop"}
          </button>
        </form>
      )}
    </div>
  );
}
