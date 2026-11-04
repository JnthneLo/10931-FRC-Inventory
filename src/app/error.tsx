"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        background: "var(--bg)",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div className="pixel-font" style={{ fontSize: 13, color: "var(--red)" }}>SYSTEM FAULT</div>
      <p style={{ color: "var(--text-dim)", fontSize: 13, maxWidth: 380 }}>
        {error.message ? `(${error.message})` : "Something went wrong."}
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-primary" onClick={reset}>Retry</button>
        <button className="btn btn-ghost" onClick={() => (window.location.href = "/")}>Go home</button>
      </div>
    </div>
  );
}
