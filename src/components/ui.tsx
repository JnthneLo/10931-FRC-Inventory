"use client";

import { useState } from "react";
import Link from "next/link";

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <div className="logo-wrap" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="logo-img"
        src="/logo.png"
        width={size}
        height={size}
        alt="Legacy Ranch Robotics"
        style={{ width: size, height: size, objectFit: "cover", borderRadius: "50%" }}
      />
    </div>
  );
}

export function SiteHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header
      className="anim-fade-up"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 0 20px",
        borderBottom: "1px solid var(--border)",
        marginBottom: 20,
      }}
    >
      <Link href="/" className="logo-wrap" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Logo />
        <div>
          <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
            Legacy Ranch Robotics
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", letterSpacing: ".08em", textTransform: "uppercase" }}>
            FRC 10913 · Inventory
          </div>
        </div>
      </Link>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>{right}</div>
    </header>
  );
}

export interface ToastData {
  id: number;
  kind: "success" | "error" | "info";
  message: string;
}

export function Toasts({ toasts }: { toasts: ToastData[] }) {
  const colors = { success: "var(--green)", error: "var(--red)", info: "var(--blue)" };
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className="anim-toast card"
          style={{
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 8px 30px #00000088",
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 99, background: colors[t.kind] }} />
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const push = (kind: ToastData["kind"], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };
  return { toasts, push };
}
