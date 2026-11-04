export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        background: "var(--bg)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Legacy Ranch Robotics" width={96} height={96} style={{ borderRadius: "50%" }} />
      <div className="pixel-font" style={{ fontSize: 11, color: "var(--accent)" }}>
        LOADING<span style={{ animation: "blinkCursor 1s steps(1) infinite" }}>▌</span>
      </div>
      <div className="pixel-bar" style={{ width: 220, height: 14, border: "2px solid var(--border-strong)", padding: 2 }}>
        <div style={{ height: "100%", background: "repeating-linear-gradient(90deg, var(--accent) 0 6px, transparent 6px 8px)", animation: "pixelLoad 1.4s steps(12) forwards" }} />
      </div>
    </div>
  );
}
