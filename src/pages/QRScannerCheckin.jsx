import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const logAction = async (action, details, entity, entityId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
    const { error } = await supabase.from("audit_logs").insert([{
      user_id: user.id,
      user_name: profile?.name || user.email || "Unknown",
      action,
      details: details || null,
      entity: entity || null,
      entity_id: entityId ? String(entityId) : null,
    }]);
    return error || null;
  } catch (err) { return err; }
};

const C = {
  ink:"#0A0F1E", slate:"#64748B", mist:"#94A3B8", cloud:"#CBD5E1",
  fog:"#E8EDF5", white:"#FFFFFF", blue:"#1D4ED8", blue2:"#3B82F6",
  green:"#15803D", green2:"#22C55E", green3:"#DCFCE7",
  amber:"#B45309", amber2:"#F59E0B", amber3:"#FEF3C7",
  rose:"#BE123C", rose2:"#F43F5E", rose3:"#FFE4E6",
};
const R = { xs:"6px", sm:"10px", md:"14px", lg:"18px", xl:"24px", xxl:"32px", full:"9999px" };
const SH = { sm:"0 2px 8px rgba(0,0,0,.07)", md:"0 4px 20px rgba(0,0,0,.09)" };

/* ─── Toast ─────────────────────────── */
const Toast = ({ msg, type = "info", onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  const config = {
    success: { bg: C.green, bgLight: C.green3, icon: "✓" },
    error:   { bg: C.rose2, bgLight: C.rose3, icon: "✕" },
    warn:    { bg: C.amber2, bgLight: C.amber3, icon: "⚠" },
    info:    { bg: C.blue, bgLight: C.blue3, icon: "ⓘ" },
  }[type] || { bg: C.blue, bgLight: C.blue3, icon: "ⓘ" };

  return (
    <div style={{
      position: "fixed",
      bottom: 20,
      left: 20,
      right: 20,
      maxWidth: 420,
      background: config.bgLight,
      border: `1.5px solid ${config.bg}`,
      borderRadius: R.lg,
      padding: "12px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      fontSize: 14,
      color: config.bg,
      fontWeight: 500,
      boxShadow: SH.md,
      zIndex: 2000,
      animation: "slideUp .3s ease-out",
    }}>
      <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
      <span style={{ fontWeight: 700, fontSize: 18 }}>{config.icon}</span>
      <span style={{ flex: 1 }}>{msg}</span>
      <button
        onClick={onDone}
        style={{
          background: "transparent",
          border: "none",
          color: config.bg,
          cursor: "pointer",
          fontSize: 18,
          padding: 0,
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
};

const Spinner = () => (
  <div style={{ display:"inline-block", width:18, height:18, borderRadius:"50%",
    border:`2px solid ${C.cloud}`, borderTopColor:C.blue,
    animation:"spin .7s linear infinite" }}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

export default function QRScannerCheckin({ onCheckedIn }) {
  const [status,    setStatus]    = useState("idle"); // idle | scanning | success | error
  const [loading,   setLoading]   = useState(false);
  const [toast,     setToast]     = useState(null);
  const [checkedIn, setCheckedIn] = useState(null);
  const [hasDetector, setHasDetector] = useState(false);

  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const rafRef      = useRef(null);
  const detectorRef = useRef(null);
  const processedRef = useRef(null); // debounce: last processed QR string

  const notify = (msg, type = "success") => setToast({ msg, type });

  // ── Check BarcodeDetector support on mount ───────────────
  useEffect(() => {
    if ("BarcodeDetector" in window) {
      try {
        detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
        setHasDetector(true);
      } catch { setHasDetector(false); }
    }
    return () => stopScanning();
  }, []);

  // ── Start camera ─────────────────────────────────────────
  const startScanning = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });
    streamRef.current = stream;
    setStatus("scanning");
    processedRef.current = null;

    // Wait for next render so video element is visible, then attach stream
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", true);
        videoRef.current.setAttribute("autoplay", true);
        videoRef.current.muted = true;
        videoRef.current.play().then(() => {
          startScanLoop();
        }).catch(err => {
          console.error("Video play error:", err);
          startScanLoop(); // try anyway
        });
      }
    }, 100);

  } catch (err) {
    notify(err.name === "NotAllowedError"
      ? "Camera permission denied. Please allow camera access."
      : "Unable to access camera: " + err.message, "error");
  }
};

  // ── Stop camera ──────────────────────────────────────────
  const stopScanning = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (status === "scanning") setStatus("idle");
  }, [status]);

  // ── Scan loop using BarcodeDetector ──────────────────────
  const startScanLoop = () => {
    const tick = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (detectorRef.current) {
        try {
          const codes = await detectorRef.current.detect(videoRef.current);
          if (codes && codes.length > 0) {
            const raw = codes[0].rawValue;
            // Debounce — don't process the same QR twice in a row
            if (raw !== processedRef.current) {
              processedRef.current = raw;
              await processQRData(raw);
              return; // stop loop after successful scan
            }
          }
        } catch { /* ignore frame errors */ }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  // ── Process scanned QR data ──────────────────────────────
  const processQRData = async (qrString) => {
    // Stop the scan loop first
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    setLoading(true);
    try {
      // Parse QR payload
      let qrData;
      try { qrData = JSON.parse(qrString); }
      catch {
        notify("Invalid QR code — not a valid attendance QR.", "error");
        setStatus("idle");
        setLoading(false);
        return;
      }

      // Validate QR type
      if (qrData.type !== "attendance") {
        notify("This QR is not for attendance check-in.", "error");
        setStatus("idle");
        setLoading(false);
        return;
      }

      // Check expiry
      if (new Date(qrData.expiry) < new Date()) {
        notify("This QR code has expired.", "error");
        setStatus("idle");
        setLoading(false);
        return;
      }

      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        notify("You are not signed in.", "error");
        setStatus("idle");
        setLoading(false);
        return;
      }

      // Get member_id from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("member_id")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (!profile?.member_id) {
        notify("No member profile linked to your account.", "error");
        setStatus("idle");
        setLoading(false);
        return;
      }

      const serviceDate = qrData.date;

      // Get member's branch_id and current points
      const { data: memberRow } = await supabase
        .from("members")
        .select("branch_id, points")
        .eq("id", profile.member_id)
        .maybeSingle();

      // Find the service_events row this QR refers to
      const { data: eventRow } = await supabase
        .from("service_events")
        .select("id")
        .eq("event", qrData.event)
        .eq("date", qrData.date)
        .eq("branch", qrData.branch)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Check if already checked in
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("member_id", profile.member_id)
        .eq("service_date", serviceDate)
        .maybeSingle();

      if (existing) {
        notify("You're already checked in for this service ✓", "warn");
        setCheckedIn({ event: qrData.event, date: qrData.date, time: qrData.time, branch: qrData.branch });
        setStatus("success");
        setLoading(false);
        return;
      }

      // Record attendance
      const { error: attErr } = await supabase
        .from("attendance")
        .insert({
          member_id:    profile.member_id,
          branch_id:    memberRow?.branch_id || null,
          event_id:     eventRow?.id || null,
          service_date: serviceDate,
          present:      true,
        });

      if (attErr) throw attErr;

      // Award +10 points
      if (memberRow) {
        await supabase
          .from("members")
          .update({ points: (memberRow.points || 0) + 10 })
          .eq("id", profile.member_id);
      }

      const result = { event: qrData.event, date: qrData.date, time: qrData.time, branch: qrData.branch };

      // Log to audit_logs
      const { data: memberProfile } = await supabase.from("members").select("name").eq("id", profile.member_id).maybeSingle();
      await logAction("attendance_recorded", `${memberProfile?.name || "Member"} checked in for ${qrData.event}`, "attendance", profile.member_id);
      notify(`Checked in for ${qrData.event} ✓`);
      setCheckedIn(result);
      setStatus("success");
      onCheckedIn && onCheckedIn(result);

    } catch (err) {
      console.error("Check-in error:", err);
      notify("Check-in failed: " + err.message, "error");
      setStatus("idle");
    }
    setLoading(false);
  };

  const reset = () => {
    setCheckedIn(null);
    setStatus("idle");
    processedRef.current = null;
  };

  // ════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════
  return (
    <div style={{ background:C.white, borderRadius:R.xl, boxShadow:SH.sm,
      border:`1px solid ${C.fog}`, padding:"24px", marginBottom:20 }}>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <h3 style={{ margin:"0 0 4px", fontWeight:700, fontSize:16, color:C.ink }}>
        📱 Quick Check-in
      </h3>
      <p style={{ margin:"0 0 16px", fontSize:13, color:C.mist }}>
        Scan the attendance QR code to record your presence.
      </p>

      {/* ── IDLE ─────────────────────────────────────────── */}
      {status === "idle" && (
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button onClick={startScanning}
            style={{ padding:"10px 20px", borderRadius:R.full, background:C.blue,
              color:C.white, border:"none", fontWeight:600, fontSize:13,
              cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
            </svg>
            Scan QR Code
          </button>

          {!hasDetector && (
            <div style={{ background:C.amber3, color:C.amber, borderRadius:R.md,
              padding:"10px 14px", fontSize:12, marginTop:8, width:"100%" }}>
              ⚠️ Your browser doesn't support automatic QR scanning. Try Chrome on Android or desktop.
            </div>
          )}
        </div>
      )}

      {/* ── SCANNING ─────────────────────────────────────── */}
      {status === "scanning" && (
        <div>
          <div style={{ position:"relative", borderRadius:R.lg, overflow:"hidden",
            background:C.ink, aspectRatio:"4/3", marginBottom:12 }}>
            <video ref={videoRef} muted playsInline autoPlay
            style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>

            {/* Overlay frame */}
            <div style={{ position:"absolute", inset:0, display:"flex",
              alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
              <div style={{ width:"60%", aspectRatio:"1", border:`3px solid ${C.blue2}`,
                borderRadius:R.lg, boxShadow:"0 0 0 9999px rgba(0,0,0,.35)" }}/>
            </div>

            {/* Corner markers */}
            {[["0","0"],["0","auto"],["auto","0"],["auto","auto"]].map(([t,b],i) => (
              <div key={i} style={{ position:"absolute",
                top: t==="0"?"20%":undefined, bottom: b==="auto"?"20%":undefined,
                left: i<2?"20%":undefined, right: i>=2?"20%":undefined,
                width:20, height:20,
                borderTop: t==="0"?`3px solid ${C.blue2}`:undefined,
                borderBottom: b==="auto"?`3px solid ${C.blue2}`:undefined,
                borderLeft: i%2===0?`3px solid ${C.blue2}`:undefined,
                borderRight: i%2!==0?`3px solid ${C.blue2}`:undefined,
              }}/>
            ))}

            <div style={{ position:"absolute", bottom:10, left:0, right:0,
              textAlign:"center", color:"rgba(255,255,255,.8)", fontSize:12, fontWeight:600 }}>
              Point camera at the QR code
            </div>
          </div>

          {loading && (
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12,
              color:C.slate, fontSize:13 }}>
              <Spinner/> Processing…
            </div>
          )}

          <button onClick={() => { stopScanning(); setStatus("idle"); }}
            style={{ padding:"9px 18px", borderRadius:R.full, background:C.white,
              color:C.rose2, border:`1.5px solid ${C.rose3}`, fontWeight:600,
              fontSize:13, cursor:"pointer" }}>
            Cancel
          </button>
        </div>
      )}

      {/* ── SUCCESS ──────────────────────────────────────── */}
      {status === "success" && checkedIn && (
        <div style={{ textAlign:"center", padding:"8px 0" }}>
          <div style={{ width:56, height:56, borderRadius:"50%", background:C.green3,
            display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 12px" }}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none"
              stroke={C.green} strokeWidth={2.5} strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div style={{ fontWeight:800, fontSize:17, color:C.ink, marginBottom:4 }}>
            Checked In ✓
          </div>
          <div style={{ fontSize:13, color:C.slate, marginBottom:4 }}>{checkedIn.event}</div>
          <div style={{ fontSize:12, color:C.mist, marginBottom:16 }}>
            {checkedIn.date} · {checkedIn.time} · {checkedIn.branch}
          </div>
          <div style={{ background:C.green3, borderRadius:R.md, padding:"8px 14px",
            fontSize:12, color:C.green, fontWeight:600, marginBottom:16, display:"inline-block" }}>
            🎉 +10 points awarded!
          </div>
          <br/>
          <button onClick={reset}
            style={{ padding:"9px 18px", borderRadius:R.full, background:C.white,
              color:C.slate, border:`1.5px solid ${C.cloud}`, fontWeight:600,
              fontSize:13, cursor:"pointer" }}>
            Scan Another
          </button>
        </div>
      )}
    </div>
  );
}
