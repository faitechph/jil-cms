import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import { supabase } from "../lib/supabaseClient";

// ── Design tokens ───────────────────────────────────────────
const C = {
  ink: "#0A0F1E", ink2: "#1C2336", ink3: "#2E3A52",
  slate: "#64748B", mist: "#94A3B8", cloud: "#CBD5E1",
  fog: "#E8EDF5", white: "#FFFFFF",
  blue: "#1D4ED8", blue2: "#3B82F6", blue3: "#DBEAFE",
  green: "#15803D", green2: "#22C55E", green3: "#DCFCE7",
  amber: "#B45309", amber2: "#F59E0B", amber3: "#FEF3C7",
  rose: "#BE123C", rose2: "#F43F5E", rose3: "#FFE4E6",
  violet: "#6D28D9", violet2: "#8B5CF6", violet3: "#EDE9FE",
};
const R = { xs:"6px", sm:"10px", md:"14px", lg:"18px", xl:"24px", xxl:"32px", full:"9999px" };
const SH = { sm:"0 2px 8px rgba(0,0,0,.07)", md:"0 4px 20px rgba(0,0,0,.09)", lg:"0 8px 40px rgba(0,0,0,.13)" };

const [branches,    setBranches]    = useState([]);

// add inside the existing useEffect that calls fetchEvents():
useEffect(() => {
  fetchEvents();
  supabase.from("branches").select("*, parent:parent_id(name)").order("name")
    .then(({ data }) => { if (data) setBranches(data); });
}, [fetchEvents]);

// ── Shared components ────────────────────────────────────────
const Inp = ({ label, type="text", value, onChange, required, options }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:16 }}>
    <label style={{ fontSize:12, fontWeight:600, color:C.slate, letterSpacing:.2 }}>
      {label}{required && <span style={{ color:C.rose2 }}> *</span>}
    </label>
    {options ? (
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{ padding:"10px 14px", border:`1.5px solid ${C.cloud}`, borderRadius:R.md,
          fontSize:14, outline:"none", background:C.white, color:C.ink, appearance:"none",
          backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
          backgroundRepeat:"no-repeat", backgroundPosition:"right 12px center" }}>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e=>onChange(e.target.value)}
        style={{ padding:"10px 14px", border:`1.5px solid ${C.cloud}`, borderRadius:R.md,
          fontSize:14, outline:"none", color:C.ink, background:C.white, transition:"border-color .15s" }}
        onFocus={e=>e.target.style.borderColor=C.blue2}
        onBlur={e=>e.target.style.borderColor=C.cloud}/>
    )}
  </div>
);

const Badge = ({ label, color=C.blue }) => (
  <span style={{ background:`${color}18`, color, padding:"3px 10px", borderRadius:R.full,
    fontSize:11, fontWeight:700, letterSpacing:.3, whiteSpace:"nowrap" }}>{label}</span>
);

const Spinner = ({ size=18 }) => (
  <div style={{ display:"inline-block", width:size, height:size, borderRadius:"50%",
    border:`2px solid ${C.cloud}`, borderTopColor:C.blue, animation:"spin .7s linear infinite" }}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const Toast = ({ msg, type="success", onDone }) => {
  useEffect(()=>{ const t=setTimeout(onDone,3200); return ()=>clearTimeout(t); },[onDone]);
  const bg = type==="error"?C.rose3:type==="warn"?C.amber3:type==="info"?C.blue3:C.green3;
  const fg = type==="error"?C.rose:type==="warn"?C.amber:type==="info"?C.blue:C.green;
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

// ── Reopen Modal ─────────────────────────────────────────────
// Lets admin pick a new expiry time and reactivate an ended/expired event
const ReopenModal = ({ open, row, onClose, onConfirm, loading }) => {
  const pad = n => String(n).padStart(2,"0");
  const toLocalDT = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

  // Default new expiry = 2 hours from now
  const [newExpiry, setNewExpiry] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2, 0, 0, 0);
    return toLocalDT(d);
  });

  // Reset expiry each time the modal opens for a new row
  useEffect(() => {
    if (open) {
      const d = new Date();
      d.setHours(d.getHours() + 2, 0, 0, 0);
      setNewExpiry(toLocalDT(d));
    }
  }, [open, row?.id]);

  if (!open || !row) return null;

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0,
      background:"rgba(10,15,30,.5)", backdropFilter:"blur(6px)",
      zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.white, borderRadius:R.xxl,
        boxShadow:SH.lg, width:"100%", maxWidth:420 }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"22px 24px 0" }}>
          <h3 style={{ margin:0, fontWeight:800, fontSize:17, color:C.ink }}>Reopen Service</h3>
          <button onClick={onClose} style={{ border:"none", background:C.fog, borderRadius:"50%",
            width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:16, color:C.slate }}>✕</button>
        </div>

        <div style={{ padding:"16px 24px 28px" }}>
          {/* Event summary */}
          <div style={{ background:C.fog, borderRadius:R.lg, padding:"12px 14px", marginBottom:20 }}>
            <div style={{ fontWeight:700, fontSize:14, color:C.ink }}>{row.event}</div>
            <div style={{ fontSize:12, color:C.mist, marginTop:3 }}>
              {row.date} · {row.time?.slice(0,5)} · {row.branch}
            </div>
          </div>

          {/* Warning */}
          <div style={{ background:C.amber3, border:`1px solid ${C.amber2}`, borderRadius:R.md,
            padding:"10px 14px", fontSize:12, color:C.amber, fontWeight:600, marginBottom:20 }}>
            ⚠️ Reopening will deactivate any currently live service and make this one active again.
          </div>

          {/* New expiry picker */}
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:12, fontWeight:600, color:C.slate, display:"block", marginBottom:6 }}>
              New Expiry Time
            </label>
            <input type="datetime-local" value={newExpiry}
              min={new Date().toISOString().slice(0,16)}
              onChange={e=>setNewExpiry(e.target.value)}
              style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${C.cloud}`,
                borderRadius:R.md, fontSize:14, outline:"none", color:C.ink,
                boxSizing:"border-box" }}/>
            <div style={{ fontSize:11, color:C.mist, marginTop:5 }}>
              Suggested: 1–2 hours from now to give latecomers enough time to scan.
            </div>
          </div>

          {/* Actions */}
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onClose}
              style={{ flex:1, padding:"10px 0", borderRadius:R.full, background:C.white,
                color:C.slate, border:`1.5px solid ${C.cloud}`, fontWeight:600,
                fontSize:14, cursor:"pointer" }}>
              Cancel
            </button>
            <button onClick={()=>onConfirm(row, newExpiry)} disabled={loading || !newExpiry}
              style={{ flex:1, padding:"10px 0", borderRadius:R.full,
                background: loading ? C.amber3 : C.amber2,
                color: C.white, border:"none", fontWeight:700, fontSize:14,
                cursor: loading ? "not-allowed" : "pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {loading ? <><Spinner size={15}/> Reopening…</> : "🔓 Reopen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────
const pad = n => String(n).padStart(2,"0");

const toLocalDatetimeValue = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const todayDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};

const defaultExpiry = () => {
  const d = new Date();
  d.setHours(12,0,0,0);
  return toLocalDatetimeValue(d);
};

const defaultServiceTime = () => {
  const d = new Date();
  d.setHours(9,0,0,0);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
};

// ════════════════════════════════════════════════════════════
//  GO LIVE PAGE
// ════════════════════════════════════════════════════════════
export default function QRGeneratorPage() {
  const [eventName,   setEventName]   = useState("Sunday Worship Service");
  const [date,        setDate]        = useState(todayDate());
  const [serviceTime, setServiceTime] = useState(defaultServiceTime());
  const [expiry,      setExpiry]      = useState(defaultExpiry());
  const [branch,      setBranch]      = useState(BRANCHES[0]);

  const [activeEvent, setActiveEvent] = useState(null);
  const [history,     setHistory]     = useState([]);
  const [qrData,      setQrData]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [reopenLoading, setReopenLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [toast,       setToast]       = useState(null);
  const [expired,     setExpired]     = useState(false);
  const [timeLeft,    setTimeLeft]    = useState("");

  // Reopen modal state
  const [reopenRow,  setReopenRow]  = useState(null);
  const [reopenOpen, setReopenOpen] = useState(false);

  const notify = (msg, type="success") => setToast({ msg, type });

  // ── Build QR image ─────────────────────────────────────────
  const buildQR = useCallback(async (row) => {
    const payload = JSON.stringify({
      event:  row.event,
      date:   row.date,
      time:   row.time,
      expiry: row.expiry,
      branch: row.branch,
      type:   "attendance",
      id:     String(row.id),
    });
    return QRCode.toDataURL(payload, {
      width: 320, margin: 2,
      color: { dark:"#0A0F1E", light:"#FFFFFF" },
      errorCorrectionLevel: "H",
    });
  }, []);

  // ── Fetch events ───────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    setLoadingPage(true);
    const { data, error } = await supabase
      .from("service_events").select("*")
      .order("created_at", { ascending:false }).limit(25);

    if (error) { notify("Failed to load history: " + error.message, "error"); setLoadingPage(false); return; }

    const rows = data || [];
    const active = rows.find(r => r.is_active);
    setHistory(rows);
    setActiveEvent(active || null);

    if (active) {
      const dataUrl = await buildQR(active);
      setQrData(dataUrl);
      setEventName(active.event);
      setDate(active.date);
      setServiceTime(active.time?.slice(0,5) || defaultServiceTime());
      setExpiry(toLocalDatetimeValue(new Date(active.expiry)));
      setBranch(active.branch);
    } else {
      setQrData(null);
    }
    setLoadingPage(false);
  }, [buildQR]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ── Countdown ──────────────────────────────────────────────
  useEffect(() => {
    if (!activeEvent?.expiry) { setExpired(false); setTimeLeft(""); return; }
    const tick = () => {
      const diff = new Date(activeEvent.expiry).getTime() - Date.now();
      if (diff <= 0) { setExpired(true); setTimeLeft("Expired"); return; }
      setExpired(false);
      const h = Math.floor(diff/3600000);
      const m = Math.floor((diff%3600000)/60000);
      const s = Math.floor((diff%60000)/1000);
      setTimeLeft(`${h>0?h+"h ":""}${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick,1000);
    return () => clearInterval(id);
  }, [activeEvent]);

  // ── Go Live ────────────────────────────────────────────────
  const goLive = async () => {
    if (!eventName.trim()) { notify("Event name is required","warn"); return; }
    if (!date)             { notify("Date is required","warn"); return; }
    setLoading(true);
    try {
      await supabase.from("service_events").update({ is_active:false }).eq("is_active",true);
      const { data:inserted, error:insErr } = await supabase.from("service_events")
        .insert({ event:eventName.trim(), date, time:serviceTime, branch,
          expiry:new Date(expiry).toISOString(), is_active:true })
        .select().single();
      if (insErr) throw insErr;
      const dataUrl = await buildQR(inserted);
      setQrData(dataUrl);
      setActiveEvent(inserted);
      notify("You're live ✓");
      fetchEvents();
    } catch (err) {
      notify("Failed to go live: " + err.message, "error");
    }
    setLoading(false);
  };

  // ── End Live ───────────────────────────────────────────────
  const endLive = async () => {
    if (!activeEvent) return;
    if (!window.confirm("End this live session? Members won't be able to check in via this QR anymore.")) return;
    setLoading(true);
    const { error } = await supabase.from("service_events")
      .update({ is_active:false }).eq("id", activeEvent.id);
    if (error) notify("Failed to end session: " + error.message,"error");
    else { notify("Live session ended"); setActiveEvent(null); setQrData(null); fetchEvents(); }
    setLoading(false);
  };

  // ── Reopen: set new expiry + reactivate ────────────────────
  const handleReopen = async (row, newExpiry) => {
    setReopenLoading(true);
    try {
      // Deactivate any currently active event
      await supabase.from("service_events").update({ is_active:false }).eq("is_active",true);

      // Reactivate the chosen row with a fresh expiry
      const { data:updated, error:upErr } = await supabase.from("service_events")
        .update({ is_active:true, expiry:new Date(newExpiry).toISOString() })
        .eq("id", row.id)
        .select().single();
      if (upErr) throw upErr;

      const dataUrl = await buildQR(updated);
      setQrData(dataUrl);
      setActiveEvent(updated);

      // Sync form fields so admin can edit and go live again easily
      setEventName(updated.event);
      setDate(updated.date);
      setServiceTime(updated.time?.slice(0,5) || defaultServiceTime());
      setExpiry(toLocalDatetimeValue(new Date(updated.expiry)));
      setBranch(updated.branch);

      notify(`"${updated.event}" is live again ✓`);
      setReopenOpen(false);
      setReopenRow(null);
      fetchEvents();
    } catch (err) {
      notify("Failed to reopen: " + err.message, "error");
    }
    setReopenLoading(false);
  };

  // ── Download / Print ───────────────────────────────────────
  const downloadFor = async (row, dataUrl) => {
    const url = dataUrl || await buildQR(row);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${row.event.replace(/\s+/g,"-")}-QR-${row.date}.png`;
    link.click();
    notify("QR downloaded ✓");
  };

  const printFor = async (row, dataUrl) => {
    const url = dataUrl || await buildQR(row);
    const win = window.open("","_blank");
    win.document.write(`
      <html><head><title>QR – ${row.event}</title>
      <style>
        body { font-family:sans-serif; display:flex; flex-direction:column;
          align-items:center; justify-content:center; min-height:100vh;
          margin:0; padding:24px; box-sizing:border-box; }
        img { width:280px; height:280px; }
        h2 { margin:0 0 4px; font-size:20px; color:#0A0F1E; }
        p  { margin:2px 0; font-size:13px; color:#64748B; }
        .box { border:2px solid #E8EDF5; border-radius:16px; padding:28px 32px; text-align:center; }
      </style></head>
      <body>
        <div class="box">
          <h2>${row.event}</h2>
          <p>${row.date} · ${row.time}</p>
          <p>${row.branch}</p>
          <img src="${url}" alt="QR Code" style="margin:18px 0"/>
          <p style="font-size:11px;color:#94A3B8">Scan to record attendance · Expires ${formatDateTime(row.expiry)}</p>
        </div>
      </body></html>`);
    win.document.close();
    win.print();
  };

  // ════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════
  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}

      <ReopenModal
        open={reopenOpen}
        row={reopenRow}
        loading={reopenLoading}
        onClose={()=>{ setReopenOpen(false); setReopenRow(null); }}
        onConfirm={handleReopen}
      />

      <h2 style={{ margin:"0 0 24px", fontWeight:800, fontSize:22, color:C.ink, textAlign:"center" }}>
        Go Live
      </h2>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))",
        gap:20, alignItems:"start" }}>

        {/* ── Left: Configure ───────────────────────────── */}
        <div style={{ background:C.white, borderRadius:R.xl, boxShadow:SH.sm,
          border:`1px solid ${C.fog}`, padding:"24px 24px 20px" }}>
          <h3 style={{ margin:"0 0 20px", fontWeight:700, fontSize:16, color:C.ink, textAlign:"center" }}>
            {activeEvent ? "Update & Go Live" : "Configure Service"}
          </h3>

          <Inp label="Event Name" value={eventName} onChange={setEventName} required/>
          <Inp label="Date" type="date" value={date} onChange={setDate} required/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Inp label="Service Time" type="time" value={serviceTime} onChange={setServiceTime}/>
            <Inp label="Expiry" type="datetime-local" value={expiry} onChange={setExpiry}/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:600, color:C.slate, letterSpacing:.2 }}>Branch</label>
            <select value={branch} onChange={e=>setBranch(e.target.value)}
              style={{ padding:"10px 14px", border:`1.5px solid ${C.cloud}`, borderRadius:R.md,
                fontSize:14, outline:"none", background:C.white, color:C.ink }}>
              <option value="">— Select Branch —</option>
              {branches.filter(b=>!b.parent_id).map(b=>(
                <optgroup key={b.id} label={b.name}>
                  <option value={b.name}>{b.name} (Main)</option>
                  {branches.filter(s=>s.parent_id===b.id).map(s=>(
                    <option key={s.id} value={s.name}>↳ {s.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <button onClick={goLive} disabled={loading}
            style={{ width:"100%", padding:"13px 0", borderRadius:R.full,
              background: loading?C.blue3:C.blue, color:C.white, border:"none",
              fontWeight:700, fontSize:15, cursor:loading?"not-allowed":"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              transition:"background .2s", marginTop:4 }}>
            {loading
              ? <><div style={{ width:16, height:16, border:`2px solid rgba(255,255,255,.4)`,
                  borderTopColor:"#fff", borderRadius:"50%", animation:"spin .7s linear infinite" }}/>
                  {activeEvent?"Updating…":"Going live…"}</>
              : <><span style={{ fontSize:13 }}>🟢</span>{activeEvent?"Go Live Again":"Go Live"}</>}
          </button>

          {activeEvent && (
            <button onClick={endLive} disabled={loading}
              style={{ width:"100%", padding:"11px 0", borderRadius:R.full, background:C.white,
                color:C.rose2, border:`1.5px solid ${C.rose3}`, fontWeight:600,
                fontSize:13, cursor:"pointer", marginTop:10 }}>
              End Live Session
            </button>
          )}
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>

        {/* ── Right: QR Preview ─────────────────────────── */}
        <div style={{ background:C.white, borderRadius:R.xl, boxShadow:SH.sm,
          border:`1px solid ${C.fog}`, padding:"24px", minHeight:420,
          display:"flex", flexDirection:"column", alignItems:"center",
          justifyContent:"center", gap:16 }}>

          {loadingPage ? (
            <div style={{ textAlign:"center", color:C.mist }}>
              <Spinner/>
              <div style={{ marginTop:12, fontSize:14 }}>Loading…</div>
            </div>
          ) : !activeEvent ? (
            <div style={{ textAlign:"center", color:C.mist }}>
              <div style={{ width:72, height:72, borderRadius:"50%", background:C.fog,
                display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={C.cloud}
                  strokeWidth={1.5} strokeLinecap="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                  <rect x="5" y="5" width="3" height="3"/>
                  <rect x="16" y="5" width="3" height="3"/>
                  <rect x="5" y="16" width="3" height="3"/>
                </svg>
              </div>
              <div style={{ fontSize:14, color:C.mist, maxWidth:200, lineHeight:1.5 }}>
                Configure a service and go live to generate a QR code for attendance
              </div>
            </div>
          ) : (
            <>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontWeight:800, fontSize:17, color:C.ink }}>{activeEvent.event}</div>
                <div style={{ fontSize:12, color:C.mist, marginTop:2 }}>
                  {activeEvent.date} · {activeEvent.time?.slice(0,5)} · {activeEvent.branch}
                </div>
              </div>

              <div style={{ position:"relative", padding:16, border:`1.5px solid ${C.fog}`,
                borderRadius:R.lg, background:C.white, boxShadow:SH.sm }}>
                {expired && (
                  <div style={{ position:"absolute", inset:0, background:"rgba(255,255,255,.88)",
                    borderRadius:R.lg, display:"flex", flexDirection:"column",
                    alignItems:"center", justifyContent:"center", zIndex:2, gap:6 }}>
                    <span style={{ fontSize:28 }}>⏰</span>
                    <span style={{ fontWeight:700, color:C.rose, fontSize:14 }}>QR Expired</span>
                    <button onClick={()=>{ setReopenRow(activeEvent); setReopenOpen(true); }}
                      style={{ marginTop:6, padding:"7px 18px", background:C.amber2, color:C.white,
                        border:"none", borderRadius:R.full, fontWeight:700, fontSize:12,
                        cursor:"pointer" }}>
                      🔓 Reopen
                    </button>
                  </div>
                )}
                {qrData && (
                  <img src={qrData} alt="QR Code"
                    style={{ display:"block", width:220, height:220,
                      filter:expired?"grayscale(1) opacity(.4)":"none", transition:"filter .3s" }}/>
                )}
              </div>

              <div style={{ display:"flex", alignItems:"center", gap:6,
                background:expired?C.rose3:C.green3, borderRadius:R.full, padding:"6px 14px" }}>
                <span style={{ fontSize:11 }}>{expired?"⛔":"🟢"}</span>
                <span style={{ fontSize:12, fontWeight:600, color:expired?C.rose:C.green }}>
                  {expired?"Expired":`Live · expires in ${timeLeft}`}
                </span>
              </div>

              <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
                <button onClick={()=>downloadFor(activeEvent, qrData)}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px",
                    borderRadius:R.full, background:C.blue, color:C.white, border:"none",
                    fontWeight:600, fontSize:13, cursor:"pointer" }}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="21 15 16 20 11 15"/><line x1="16" y1="4" x2="16" y2="20"/></svg>
                  Download
                </button>
                <button onClick={()=>printFor(activeEvent, qrData)}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px",
                    borderRadius:R.full, background:C.white, color:C.slate,
                    border:`1.5px solid ${C.cloud}`, fontWeight:600, fontSize:13, cursor:"pointer" }}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Print
                </button>
                {expired && (
                  <button onClick={()=>{ setReopenRow(activeEvent); setReopenOpen(true); }}
                    style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px",
                      borderRadius:R.full, background:C.amber2, color:C.white, border:"none",
                      fontWeight:600, fontSize:13, cursor:"pointer" }}>
                    🔓 Reopen
                  </button>
                )}
              </div>

              <div style={{ background:C.fog, borderRadius:R.md, padding:"10px 14px",
                fontSize:11, color:C.mist, textAlign:"center", maxWidth:300, lineHeight:1.6 }}>
                This QR encodes event, date, time, branch & expiry. Members scan it to mark attendance.
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── History ───────────────────────────────────────────── */}
      <div style={{ marginTop:28 }}>
        <h3 style={{ margin:"0 0 14px", fontWeight:800, fontSize:16, color:C.ink }}>
          Go Live History
        </h3>

        {loadingPage ? (
          <div style={{ textAlign:"center", padding:"30px 0", color:C.mist }}><Spinner/></div>
        ) : history.length === 0 ? (
          <div style={{ textAlign:"center", padding:"40px 0", color:C.mist, fontSize:13 }}>
            No services have gone live yet.
          </div>
        ) : (
          <div style={{ background:C.white, borderRadius:R.xl, boxShadow:SH.sm,
            border:`1px solid ${C.fog}`, overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:C.fog }}>
                    {["Event","Date","Time","Branch","Expiry","Status","Actions"].map(h=>(
                      <th key={h} style={{ textAlign:"left", padding:"10px 14px", color:C.slate,
                        fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:.4,
                        whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map(row => {
                    const isExpired = new Date(row.expiry).getTime() < Date.now();
                    const isLive    = row.is_active && !isExpired;
                    const isEnded   = !row.is_active;
                    const canReopen = isExpired || isEnded;

                    return (
                      <tr key={row.id} style={{ borderTop:`1px solid ${C.fog}`,
                        background: isLive ? `${C.green}05` : C.white }}>
                        <td style={{ padding:"10px 14px", fontWeight:600, color:C.ink }}>{row.event}</td>
                        <td style={{ padding:"10px 14px", color:C.slate }}>{row.date}</td>
                        <td style={{ padding:"10px 14px", color:C.slate }}>{row.time?.slice(0,5)}</td>
                        <td style={{ padding:"10px 14px", color:C.slate, fontSize:12 }}>
                          {(row.branch||"").split("–")[0].trim()}
                        </td>
                        <td style={{ padding:"10px 14px", color:C.slate, fontSize:12 }}>
                          {formatDateTime(row.expiry)}
                        </td>
                        <td style={{ padding:"10px 14px" }}>
                          {isLive
                            ? <Badge label="🟢 Live"   color={C.green}/>
                            : isExpired && row.is_active
                            ? <Badge label="⏰ Expired" color={C.rose2}/>
                            : <Badge label="Ended"     color={C.mist}/>}
                        </td>
                        <td style={{ padding:"10px 14px" }}>
                          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                            <button onClick={()=>downloadFor(row)}
                              style={{ padding:"6px 12px", borderRadius:R.full, background:C.white,
                                color:C.blue, border:`1.5px solid ${C.blue3}`, fontWeight:600,
                                fontSize:12, cursor:"pointer" }}>
                              Download
                            </button>
                            <button onClick={()=>printFor(row)}
                              style={{ padding:"6px 12px", borderRadius:R.full, background:C.white,
                                color:C.slate, border:`1.5px solid ${C.cloud}`, fontWeight:600,
                                fontSize:12, cursor:"pointer" }}>
                              Print
                            </button>
                            {canReopen && (
                              <button onClick={()=>{ setReopenRow(row); setReopenOpen(true); }}
                                style={{ padding:"6px 12px", borderRadius:R.full,
                                  background:C.amber3, color:C.amber,
                                  border:`1.5px solid ${C.amber2}`, fontWeight:700,
                                  fontSize:12, cursor:"pointer" }}>
                                🔓 Reopen
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
