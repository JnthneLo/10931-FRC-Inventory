import Link from "next/link";

export default function NotFound() {
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
      <div className="pixel-font" style={{ fontSize: 22, color: "var(--accent)" }}>404</div>
      <p style={{ color: "var(--text-dim)", fontSize: 13 }}>That page doesn&apos;t exist.</p>
      <Link href="/" className="btn btn-primary">Back to inventory</Link>
    </div>
  );
}
