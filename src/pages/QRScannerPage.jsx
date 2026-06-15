import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import jsQR from "jsqr";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── Design tokens ────────────────────────────────────────────
const C = {
  ink:"#0A0F1E", ink2:"#1C2336", ink3:"#2E3A52",
  slate:"#64748B", mist:"#94A3B8", cloud:"#CBD5E1",
  fog:"#E8EDF5", white:"#FFFFFF",
  blue:"#1D4ED8", blue2:"#3B82F6", blue3:"#DBEAFE",
  green:"#15803D", green2:"#22C55E", green3:"#DCFCE7",
  amber:"#B45309", amber2:"#F59E0B", amber3:"#FEF3C7",
  rose:"#BE123C", rose2:"#F43F5E", rose3:"#FFE4E6",
  violet:"#6D28D9", violet2:"#8B5CF6", violet3:"#EDE9FE",
};
const R = { xs:"6px", sm:"10px", md:"14px", lg:"18px", xl:"24px", xxl:"32px", full:"9999px" };
const SH = { sm:"0 2px 8px rgba(0,0,0,.07)", md:"0 4px 20px rgba(0,0,0,.09)", lg:"0 8px 40px rgba(0,0,0,.13)" };

const RANKS = [
  { name:"Seedling", min:0,   max:199,  color:"#78716C" },
  { name:"Sprout",   min:200, max:399,  color:"#65A30D" },
  { name:"Sapling",  min:400, max:599,  color:"#16A34A" },
  { name:"Tree",     min:600, max:849,  color:"#0F766E" },
  { name:"Oak",      min:850, max:9999, color:"#1D4ED8" },
];
const getRank = pts => RANKS.find(r => pts >= r.min && pts <= r.max) || RANKS[0];

const avatarColor = name => {
  const cols = [C.blue, C.violet2, C.rose2, C.green2, C.amber2, "#0EA5E9"];
  let h = 0; for (let c of (name || "?")) h += c.charCodeAt(0);
  return cols[h % cols.length];
};

// ── Shared components ────────────────────────────────────────
const Av = ({ name, size = 44 }) => (
  <div style={{ width:size, height:size, borderRadius:"50%", background:avatarColor(name),
    display:"flex", alignItems:"center", justifyContent:"center", color:"#fff",
    fontWeight:700, fontSize:size * 0.37, flexShrink:0, letterSpacing:-.5 }}>
    {(name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
  </div>
);

const Badge = ({ label, color = C.blue }) => (
  <span style={{ background:`${color}18`, color, padding:"3px 10px", borderRadius:R.full,
    fontSize:11, fontWeight:700, letterSpacing:.3, whiteSpace:"nowrap" }}>{label}</span>
);

const Toast = ({ msg, type = "success", onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
  const bg = type === "error" ? C.rose3 : type === "warn" ? C.amber3 : C.green3;
  const fg = type === "error" ? C.rose  : type === "warn" ? C.amber  : C.green;
  return (
    <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
      background:bg, color:fg, borderRadius:R.full, padding:"11px 22px", fontSize:13,
      fontWeight:600, boxShadow:SH.md, zIndex:2000, whiteSpace:"nowrap",
      animation:"slideUp .25s ease" }}>
      <style>{`@keyframes slideUp{from{transform:translateX(-50%) translateY(12px);opacity:0}}`}</style>
      {msg}
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

// ── Success overlay ──────────────────────────────────────────
const SuccessOverlay = ({ member, event, onDone }) => {
  const rank = getRank(member.points || 0);
  const catColor = c => c === "Official Member" ? C.blue : c === "First Timer" ? C.green : C.amber;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(10,15,30,.6)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:1500, padding:24 }}>
      <div style={{ background:C.white, borderRadius:R.xxl, padding:"36px 32px",
        boxShadow:SH.lg, maxWidth:380, width:"100%", textAlign:"center" }}>

        {/* Check */}
        <div style={{ width:72, height:72, borderRadius:"50%", background:C.green3,
          display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
          <svg width={36} height={36} viewBox="0 0 24 24" fill="none"
            stroke={C.green} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>

        <div style={{ fontWeight:800, fontSize:20, color:C.ink, marginBottom:4 }}>
          Attendance Recorded!
        </div>
        <div style={{ fontSize:13, color:C.mist, marginBottom:24 }}>
          {event?.event} · {event?.date}
        </div>

        {/* Member card */}
        <div style={{ background:C.fog, borderRadius:R.lg, padding:"18px 20px",
          display:"flex", alignItems:"center", gap:14, marginBottom:24, textAlign:"left" }}>
          <Av name={member.name} size={52}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:800, fontSize:16, color:C.ink, marginBottom:4 }}>
              {member.name}
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
              <Badge label={member.category} color={catColor(member.category)}/>
              <Badge label={member.type} color={C.slate}/>
            </div>
            <div style={{ fontSize:12, color:C.mist }}>
              {member.branchName} · <span style={{ color:rank.color, fontWeight:700 }}>{rank.name}</span>
            </div>
          </div>
        </div>

        <button onClick={onDone} style={{ width:"100%", padding:"13px 0", borderRadius:R.full,
          background:C.green, color:C.white, border:"none", fontWeight:700,
          fontSize:15, cursor:"pointer" }}>
          Scan Next Member
        </button>
      </div>
    </div>
  );
};

// ── Log row ──────────────────────────────────────────────────
const LogRow = ({ r, idx }) => (
  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
    background: idx % 2 === 0 ? C.white : C.fog, borderRadius:R.md }}>
    <Av name={r.memberName} size={34}/>
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ fontWeight:700, fontSize:13, color:C.ink,
        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.memberName}</div>
      <div style={{ fontSize:11, color:C.mist }}>{r.category} · {r.branchName}</div>
    </div>
    <div style={{ fontSize:11, color:C.mist, textAlign:"right", flexShrink:0 }}>
      <div>{r.loggedAt}</div>
      <div style={{ color:C.green, fontWeight:600 }}>✓</div>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════
//  QR SCANNER PAGE
// ════════════════════════════════════════════════════════════
export default function QRScannerPage() {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const rafRef     = useRef(null);
  const lastScanRef = useRef(null); // debounce same code

  const [scanning,     setScanning]     = useState(false);
  const [camError,     setCamError]     = useState(null);
  const [looking,      setLooking]      = useState(false); // Supabase lookup in progress
  const [toast,        setToast]        = useState(null);
  const [log,          setLog]          = useState([]);
  const [successData,  setSuccessData]  = useState(null); // { member, event }

  // Active event sourced from Supabase service_events table
  const [activeEvent,   setActiveEvent]   = useState(null); // { id, event, date, time, branch, expiry }
  const [eventExpired,  setEventExpired]  = useState(false);
  const [loadingEvent,  setLoadingEvent]  = useState(true);

  // current user (for recorded_by)
  const [userId, setUserId] = useState(null);

  const notify = (msg, type = "success") => setToast({ msg, type });

  // ── Get current authenticated user ─────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data?.user?.id || null));
  }, []);

  // ── Fetch the currently active service event ──────────────
  const fetchActiveEvent = useCallback(async () => {
    const { data, error } = await supabase
      .from("service_events")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      notify("Failed to load active service: " + error.message, "error");
      setActiveEvent(null);
    } else if (data) {
      setActiveEvent({
        id:     data.id,
        event:  data.event,
        date:   data.date,
        time:   data.time?.slice(0,5),
        branch: data.branch,
        expiry: data.expiry,
      });
    } else {
      setActiveEvent(null);
    }
    setLoadingEvent(false);
  }, []);

  useEffect(() => {
    fetchActiveEvent();
    // Poll for changes (e.g. a new service goes live, or this one ends)
    const id = setInterval(fetchActiveEvent, 10000);
    return () => clearInterval(id);
  }, [fetchActiveEvent]);

  // ── Check expiry on active event ──────────────────────────
  useEffect(() => {
    if (!activeEvent?.expiry) { setEventExpired(false); return; }
    const check = () => setEventExpired(new Date(activeEvent.expiry).getTime() < Date.now());
    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, [activeEvent]);

  // ── Camera ────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (rafRef.current)    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:"environment", width:{ ideal:640 }, height:{ ideal:480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setScanning(true);
    } catch {
      setCamError("Camera access denied. Please allow camera permissions and try again.");
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Scan loop ─────────────────────────────────────────────
  useEffect(() => {
    if (!scanning) return;
    const tick = () => {
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick); return;
      }
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code    = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts:"dontInvert" });
      if (code && code.data !== lastScanRef.current) {
        lastScanRef.current = code.data;
        handleScan(code.data);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [scanning]);

  // ── Handle scan ───────────────────────────────────────────
  const handleScan = async (raw) => {
    stopCamera();
    setLooking(true);

    try {
      // Member QR format: jil://member?code=JIL-xxx&name=...&branch=...
      if (!raw.startsWith("jil://member")) {
        notify("Not a member QR code. Ask member to show their personal QR.", "warn");
        setLooking(false);
        resumeScan();
        return;
      }

      // Parse the member QR
      const url        = new URL(raw);
      const memberCode = url.searchParams.get("code");
      const memberName = decodeURIComponent(url.searchParams.get("name") || "");

      if (!memberCode) {
        notify("Invalid member QR code.", "error");
        setLooking(false);
        resumeScan();
        return;
      }

      // Re-check active event right before recording, in case it changed
      await fetchActiveEvent();

      if (!activeEvent) {
        notify("No active service. Go to Go Live to start one first.", "warn");
        setLooking(false);
        resumeScan();
        return;
      }

      if (eventExpired) {
        notify("The service QR has expired. Please go live again.", "error");
        setLooking(false);
        resumeScan();
        return;
      }

      // Look up member in Supabase, joining branch name
      const { data: members, error } = await supabase
        .from("members")
        .select("id, name, member_code, category, type, points, is_active, branch_id, branches(name)")
        .eq("member_code", memberCode)
        .limit(1);

      if (error) {
        notify("Database error: " + error.message, "error");
        setLooking(false);
        resumeScan();
        return;
      }

      const member = members?.[0];

      if (!member) {
        notify(`Member not found: ${memberName}`, "error");
        setLooking(false);
        resumeScan();
        return;
      }

      if (member.is_active === false) {
        notify(`${member.name} is inactive and cannot record attendance.`, "warn");
        setLooking(false);
        resumeScan();
        return;
      }

      // Check duplicate in today's session log
      const alreadyScanned = log.some(r => r.memberCode === memberCode);
      if (alreadyScanned) {
        notify(`${member.name} already scanned in this session.`, "warn");
        setLooking(false);
        resumeScan();
        return;
      }

      // Check if attendance already recorded for this member + service date
      const { data: existing, error: existErr } = await supabase
        .from("attendance")
        .select("id")
        .eq("member_id", member.id)
        .eq("service_date", activeEvent.date)
        .maybeSingle();

      if (existErr) {
        notify("Database error: " + existErr.message, "error");
        setLooking(false);
        resumeScan();
        return;
      }

      if (existing) {
        notify(`${member.name} already checked in for ${activeEvent.date}.`, "warn");
        setLooking(false);
        resumeScan();
        return;
      }

      // Save attendance record to Supabase
      const now = new Date();
      const pad = n => String(n).padStart(2, "0");
      const loggedAt = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

      const { error: attError } = await supabase.from("attendance").insert({
        member_id:    member.id,
        branch_id:    member.branch_id,
        event_id:     activeEvent.id,
        service_date: activeEvent.date,
        present:      true,
        recorded_by:  userId,
      });

      if (attError) {
        notify("Failed to save attendance: " + attError.message, "error");
        setLooking(false);
        resumeScan();
        return;
      }

      const branchName = member.branches?.name || "—";

      // Add to session log
      const record = {
        memberName: member.name,
        memberCode: member.member_code,
        category:   member.category,
        branchName,
        loggedAt,
        id:         Date.now(),
      };
      setLog(prev => [record, ...prev]);
      setSuccessData({
        member: { ...member, branchName },
        event: activeEvent
      });

    } catch (err) {
      notify("Unexpected error: " + err.message, "error");
      setLooking(false);
      resumeScan();
    }

    setLooking(false);
  };

  const resumeScan = () => {
    setTimeout(() => {
      lastScanRef.current = null;
      startCamera();
    }, 2000);
  };

  const handleSuccessDone = () => {
    setSuccessData(null);
    lastScanRef.current = null;
    startCamera();
  };

  // ════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════
  return (
    <div>
      {toast      && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)}/>}
      {successData && <SuccessOverlay member={successData.member} event={successData.event} onDone={handleSuccessDone}/>}

      <h2 style={{ margin:"0 0 24px", fontWeight:800, fontSize:22, color:C.ink, textAlign:"center" }}>
        Attendance Scanner
      </h2>

      {/* Active event banner */}
      {loadingEvent ? (
        <div style={{ textAlign:"center", padding:"12px 0", marginBottom:20, color:C.mist }}>
          <Spinner/>
        </div>
      ) : activeEvent ? (
        <div style={{ background: eventExpired ? C.rose3 : C.green3,
          border:`1px solid ${eventExpired ? C.rose2 : C.green2}`,
          borderRadius:R.lg, padding:"12px 18px", marginBottom:20,
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color: eventExpired ? C.rose : C.green }}>
              {eventExpired ? "⛔ Service QR Expired" : "🟢 Active Service"}
            </div>
            <div style={{ fontSize:12, color: eventExpired ? C.rose : C.green, marginTop:2 }}>
              {activeEvent.event} · {activeEvent.date} · {activeEvent.time} · {activeEvent.branch}
            </div>
          </div>
          {eventExpired && (
            <span style={{ fontSize:11, color:C.rose, fontWeight:600, textAlign:"right", flexShrink:0 }}>
              Go to Go Live to start a new one
            </span>
          )}
        </div>
      ) : (
        <div style={{ background:C.amber3, border:`1px solid ${C.amber2}`, borderRadius:R.lg,
          padding:"12px 18px", marginBottom:20, fontSize:13, color:C.amber, fontWeight:600 }}>
          ⚠️ No active service. Go to Go Live to start one first.
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))",
        gap:20, alignItems:"start" }}>

        {/* ── Left: Camera ────────────────────────────── */}
        <div style={{ background:C.white, borderRadius:R.xl, boxShadow:SH.sm,
          border:`1px solid ${C.fog}`, padding:24 }}>

          <h3 style={{ margin:"0 0 16px", fontWeight:700, fontSize:16, color:C.ink, textAlign:"center" }}>
            Scan Member QR
          </h3>

          {/* Viewfinder */}
          <div style={{ position:"relative", background:C.ink, borderRadius:R.lg,
            overflow:"hidden", aspectRatio:"4/3", marginBottom:16 }}>

            <video ref={videoRef} muted playsInline
              style={{ width:"100%", height:"100%", objectFit:"cover",
                display: scanning ? "block" : "none" }}/>

            {/* Scan frame */}
            {scanning && (
              <div style={{ position:"absolute", inset:0, display:"flex",
                alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
                <div style={{ width:180, height:180, position:"relative" }}>
                  {[
                    { top:0,    left:0,  borderTop:`3px solid ${C.blue2}`,    borderLeft:`3px solid ${C.blue2}` },
                    { top:0,    right:0, borderTop:`3px solid ${C.blue2}`,    borderRight:`3px solid ${C.blue2}` },
                    { bottom:0, left:0,  borderBottom:`3px solid ${C.blue2}`, borderLeft:`3px solid ${C.blue2}` },
                    { bottom:0, right:0, borderBottom:`3px solid ${C.blue2}`, borderRight:`3px solid ${C.blue2}` },
                  ].map((s, i) => (
                    <div key={i} style={{ position:"absolute", width:24, height:24, borderRadius:3, ...s }}/>
                  ))}
                  <style>{`@keyframes scanLine{0%{top:8px;opacity:1}48%{top:164px;opacity:1}50%{opacity:0}52%{top:8px;opacity:0}54%{opacity:1}100%{top:164px;opacity:1}}`}</style>
                  <div style={{ position:"absolute", left:8, right:8, height:2,
                    background:C.blue2, borderRadius:1,
                    animation:"scanLine 2s linear infinite" }}/>
                </div>
              </div>
            )}

            {/* Looking up overlay */}
            {looking && (
              <div style={{ position:"absolute", inset:0, background:"rgba(10,15,30,.7)",
                display:"flex", flexDirection:"column", alignItems:"center",
                justifyContent:"center", gap:12 }}>
                <Spinner/>
                <span style={{ fontSize:13, color:C.white, fontWeight:600 }}>Looking up member…</span>
              </div>
            )}

            {/* Idle state */}
            {!scanning && !camError && !looking && (
              <div style={{ position:"absolute", inset:0, display:"flex",
                flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
                <div style={{ width:60, height:60, borderRadius:"50%",
                  background:"rgba(255,255,255,.08)",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <svg width={28} height={28} viewBox="0 0 24 24" fill="none"
                    stroke="rgba(255,255,255,.35)" strokeWidth={1.5} strokeLinecap="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                <span style={{ fontSize:13, color:"rgba(255,255,255,.35)" }}>Camera is off</span>
              </div>
            )}

            {/* Camera error */}
            {camError && (
              <div style={{ position:"absolute", inset:0, display:"flex",
                flexDirection:"column", alignItems:"center", justifyContent:"center",
                gap:10, padding:24, textAlign:"center" }}>
                <span style={{ fontSize:28 }}>📷</span>
                <span style={{ fontSize:12, color:"rgba(255,255,255,.6)", lineHeight:1.5 }}>{camError}</span>
              </div>
            )}

            <canvas ref={canvasRef} style={{ display:"none" }}/>
          </div>

          {/* Start / Stop */}
          <button
            onClick={() => scanning ? stopCamera() : startCamera()}
            disabled={!activeEvent || eventExpired}
            style={{ width:"100%", padding:"13px 0", borderRadius:R.full,
              background: !activeEvent || eventExpired ? C.cloud : scanning ? C.rose2 : C.blue,
              color:C.white, border:"none", fontWeight:700, fontSize:15,
              cursor: !activeEvent || eventExpired ? "not-allowed" : "pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              transition:"background .2s" }}>
            {scanning ? (
              <>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>
                </svg>
                Stop Scanning
              </>
            ) : (
              <>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                Start Scanning
              </>
            )}
          </button>

          {scanning && (
            <p style={{ textAlign:"center", fontSize:12, color:C.mist, marginTop:12, marginBottom:0 }}>
              Ask member to open their QR from the Members page
            </p>
          )}

          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:20 }}>
            {[
              { label:"Scanned this session", value:log.length, color:C.blue },
              { label:"Active service", value: activeEvent && !eventExpired ? "Live" : "—", color:C.green },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background:C.fog, borderRadius:R.lg, padding:"12px 14px" }}>
                <div style={{ fontSize:11, color:C.mist, marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:22, fontWeight:800, color }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Session log ───────────────────────── */}
        <div style={{ background:C.white, borderRadius:R.xl, boxShadow:SH.sm,
          border:`1px solid ${C.fog}`, padding:24 }}>

          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <h3 style={{ margin:0, fontWeight:700, fontSize:16, color:C.ink }}>
              Session Log
            </h3>
            <div style={{ background:C.blue3, color:C.blue, borderRadius:R.full,
              padding:"4px 12px", fontSize:12, fontWeight:700 }}>
              {log.length} recorded
            </div>
          </div>

          {log.length === 0 ? (
            <div style={{ textAlign:"center", padding:"48px 0", color:C.mist }}>
              <div style={{ width:56, height:56, borderRadius:"50%", background:C.fog,
                display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none"
                  stroke={C.cloud} strokeWidth={1.5} strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div style={{ fontSize:14, color:C.mist, maxWidth:200, margin:"0 auto", lineHeight:1.5 }}>
                No scans yet. Start the camera and scan a member's QR code.
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {log.map((r, i) => <LogRow key={r.id} r={r} idx={i}/>)}
            </div>
          )}

          {log.length > 0 && (
            <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${C.fog}`,
              display:"flex", gap:8 }}>
              <button
                onClick={() => {
                  const csv = ["Name,Category,Branch,Time",
                    ...log.map(r => `"${r.memberName}","${r.category}","${r.branchName}","${r.loggedAt}"`)
                  ].join("\n");
                  const blob = new Blob([csv], { type:"text/csv" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `attendance-${activeEvent?.date ?? "session"}.csv`;
                  a.click();
                }}
                style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
                  gap:6, padding:"9px 0", borderRadius:R.full, background:C.blue,
                  color:C.white, border:"none", fontWeight:600, fontSize:13, cursor:"pointer" }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <polyline points="21 15 16 20 11 15"/>
                  <line x1="16" y1="4" x2="16" y2="20"/>
                </svg>
                Export CSV
              </button>
              <button
                onClick={() => { if (window.confirm("Clear session log?")) setLog([]); }}
                style={{ padding:"9px 16px", borderRadius:R.full, background:C.white,
                  color:C.rose2, border:`1.5px solid ${C.rose3}`,
                  fontWeight:600, fontSize:13, cursor:"pointer" }}>
                Clear
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
