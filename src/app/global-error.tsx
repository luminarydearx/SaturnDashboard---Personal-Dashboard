'use client';
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html><body style={{ background: "#04040d", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center", color: "#fff", padding: "2rem" }}>
        <h1 style={{ fontSize: "3rem", fontWeight: 900, color: "#f87171", margin: "0 0 0.5rem" }}>500</h1>
        <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>Critical error. The system encountered an unexpected failure.</p>
        <button onClick={reset} style={{ background: "linear-gradient(135deg, #7c3aed, #0891b2)", color: "#fff", padding: "0.75rem 1.5rem", border: "none", borderRadius: "0.75rem", cursor: "pointer", fontWeight: 600 }}>
          Restart
        </button>
      </div>
    </body></html>
  );
}
