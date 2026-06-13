import { useState } from "react";

const C = {
  ink: "#0A0F1E",
  slate: "#64748B",
  mist: "#94A3B8",
  white: "#FFFFFF",
  blue: "#1D4ED8",
  blue2: "#3B82F6",
  rose2: "#F43F5E",
};
const R = { md: "14px", lg: "18px", xl: "24px", xxl: "32px", full: "9999px" };

export default function Login({ onLogin, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setLocalError("Please enter both email and password.");
      return;
    }
    setLocalError(null);
    setSubmitting(true);
    const result = await onLogin(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setLocalError(result.error || "Sign in failed. Please check your details.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(160deg, ${C.ink} 0%, #1a2744 60%, #0f1a35 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={{ maxWidth: 400, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: R.xxl,
              background: "linear-gradient(135deg,#1D4ED8,#7C3AED)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l1.5 5.5H19l-4.5 3 1.5 5.5L12 13l-4 3 1.5-5.5L5 7.5h5.5z" />
            </svg>
          </div>
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: "0 0 4px", letterSpacing: -0.5 }}>
            JIL Pinamalayan
          </h1>
          <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>Church Management System</p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            background: "rgba(255,255,255,.05)",
            backdropFilter: "blur(16px)",
            borderRadius: R.xxl,
            padding: 28,
            border: "1px solid rgba(255,255,255,.08)",
          }}
        >
          <p
            style={{
              color: "#64748B",
              fontSize: 12,
              marginBottom: 18,
              textAlign: "center",
              textTransform: "uppercase",
              letterSpacing: 0.8,
              fontWeight: 600,
            }}
          >
            Sign In
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", letterSpacing: 0.2 }}>Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@church.org"
              style={{
                padding: "11px 14px",
                border: "1.5px solid rgba(255,255,255,.1)",
                borderRadius: R.md,
                fontSize: 14,
                outline: "none",
                background: "rgba(255,255,255,.04)",
                color: "#E2E8F0",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 18 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", letterSpacing: 0.2 }}>Password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                padding: "11px 14px",
                border: "1.5px solid rgba(255,255,255,.1)",
                borderRadius: R.md,
                fontSize: 14,
                outline: "none",
                background: "rgba(255,255,255,.04)",
                color: "#E2E8F0",
              }}
            />
          </div>

          {(localError || error) && (
            <div
              style={{
                background: "rgba(244,63,94,.12)",
                border: "1px solid rgba(244,63,94,.3)",
                color: "#FCA5A5",
                borderRadius: R.md,
                padding: "10px 14px",
                fontSize: 12,
                marginBottom: 14,
              }}
            >
              {localError || error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "12px 20px",
              background: C.blue,
              color: "#fff",
              border: "none",
              borderRadius: R.full,
              fontWeight: 700,
              fontSize: 14,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>

          <p style={{ color: "#475569", fontSize: 11, marginTop: 16, textAlign: "center", lineHeight: 1.5 }}>
            Accounts are created by your church admin.
            <br />
            Contact your support if you need access.
          </p>
        </form>
      </div>
    </div>
  );
}