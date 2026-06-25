import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";

const logAction = async (action, details, entity, entityId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
    const { error } = await supabase.from("audit_logs").insert([{
      user_id: user.id,
      user_name: profile?.name || user.email || "Unknown",
      action, details: details || null,
      entity: entity || null,
      entity_id: entityId ? String(entityId) : null,
    }]);
    return error || null;
  } catch (err) { return err; }
};

// ── Design tokens ─────────────────────────────────────────────
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
const SH = { sm:"0 2px 8px rgba(0,0,0,.07)", md:"0 4px 20px rgba(0,0,0,.09)", lg:"0 8px 40px rgba(0,0,0,.12)" };

const CATEGORIES = ["Official Member","First Timer","Guest"];

const useIsMobile = () => {
  const [mob, setMob] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMob(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mob;
};

const avatarColor = name => {
  const cols = [C.blue, C.violet2, C.rose2, C.green2, C.amber2, "#0EA5E9"];
  let h = 0; for (let c of (name || "?")) h += c.charCodeAt(0);
  return cols[h % cols.length];
};

const Av = ({ name, size = 36 }) => (
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

const Card = ({ children, style={} }) => (
  <div style={{ background:C.white, borderRadius:R.xl, boxShadow:SH.sm,
    border:`1px solid ${C.fog}`, padding:"18px 20px", ...style }}>
    {children}
  </div>
);

const Pill = ({ label, active, onClick, color=C.blue }) => (
  <button onClick={onClick} style={{ padding:"6px 16px", borderRadius:R.full,
    border:`1.5px solid ${active?color:C.cloud}`, background:active?color:C.white,
    color:active?C.white:C.slate, fontWeight:600, fontSize:13, cursor:"pointer",
    transition:"all .15s", whiteSpace:"nowrap" }}>
    {label}
  </button>
);

const Btn = ({ label, onClick, color=C.blue, outline, sm, full, disabled, icon:Icon }) => (
  <button onClick={onClick} disabled={disabled} style={{
    display:"flex", alignItems:"center", gap:6, justifyContent:"center",
    padding: sm ? "7px 14px" : "10px 20px",
    background: disabled ? C.cloud : outline ? "transparent" : color,
    color: disabled ? C.mist : outline ? color : C.white,
    border: `1.5px solid ${disabled ? C.cloud : color}`,
    borderRadius: R.full, fontWeight:600, fontSize: sm ? 12 : 14,
    cursor: disabled ? "not-allowed" : "pointer", transition:"all .15s",
    width: full ? "100%" : "auto", flexShrink:0,
  }}>
    {Icon && <Icon size={sm?13:15}/>} {label}
  </button>
);

const Spinner = () => (
  <div style={{ display:"inline-block", width:18, height:18, borderRadius:"50%",
    border:`2px solid ${C.cloud}`, borderTopColor:C.blue,
    animation:"spin .7s linear infinite" }}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const StatCard = ({ label, value, color=C.blue, sub }) => (
  <Card style={{ flex:1, minWidth:140 }}>
    <div style={{ fontSize:11, color:C.mist, marginBottom:6, fontWeight:600, textTransform:"uppercase", letterSpacing:.4 }}>
      {label}
    </div>
    <div style={{ fontSize:26, fontWeight:800, color }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:C.mist, marginTop:2 }}>{sub}</div>}
  </Card>
);

const Toast = ({ msg, type="info", onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, [onDone]);
  const cfg = {
    success:{ bg:C.green,  light:C.green3, icon:"✓" },
    error:  { bg:C.rose2,  light:C.rose3,  icon:"✕" },
    warn:   { bg:C.amber2, light:C.amber3, icon:"⚠" },
    info:   { bg:C.blue,   light:C.blue3,  icon:"ⓘ" },
  }[type] || { bg:C.blue, light:C.blue3, icon:"ⓘ" };
  return (
    <div style={{ position:"fixed", bottom:20, left:20, right:20, maxWidth:420,
      background:cfg.light, border:`1.5px solid ${cfg.bg}`, borderRadius:R.lg,
      padding:"12px 16px", display:"flex", alignItems:"center", gap:12,
      fontSize:14, color:cfg.bg, fontWeight:500, boxShadow:SH.md, zIndex:2000,
      animation:"slideUp .3s ease-out" }}>
      <style>{`@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      <span style={{ fontWeight:700, fontSize:18 }}>{cfg.icon}</span>
      <span style={{ flex:1 }}>{msg}</span>
      <button onClick={onDone} style={{ background:"transparent", border:"none",
        color:cfg.bg, cursor:"pointer", fontSize:18, padding:0, lineHeight:1 }}>✕</button>
    </div>
  );
};

// ── Modal shell ───────────────────────────────────────────────
const Modal = ({ open, onClose, title, children, width=500 }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0,
      background:"rgba(10,15,30,.5)", backdropFilter:"blur(6px)",
      zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16,
      boxSizing:"border-box" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.white, borderRadius:R.xxl,
        boxShadow:SH.lg, width:"100%", maxWidth:width, maxHeight:"92vh", overflowY:"auto",
        overflowX:"hidden", boxSizing:"border-box" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"22px 24px 0" }}>
          <h3 style={{ margin:0, fontWeight:800, fontSize:17, color:C.ink }}>{title}</h3>
          <button onClick={onClose} style={{ border:"none", background:C.fog, borderRadius:"50%",
            width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:16, color:C.slate }}>✕</button>
        </div>
        <div style={{ padding:"16px 24px 28px", boxSizing:"border-box", width:"100%" }}>{children}</div>
      </div>
    </div>
  );
};

// ── Date helpers ──────────────────────────────────────────────
const pad = n => String(n).padStart(2, "0");
const toISODate = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

const startOfWeek = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  date.setHours(0,0,0,0);
  return date;
};

const addDays = (d, n) => {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
};

const formatDateLabel = (d) =>
  d.toLocaleDateString(undefined, { month:"short", day:"numeric" });

const formatRange = (start, end) =>
  `${formatDateLabel(start)} – ${formatDateLabel(end)}, ${end.getFullYear()}`;

const formatTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const catColor = c => c==="Official Member"?C.blue:c==="First Timer"?C.green:C.amber;

// ════════════════════════════════════════════════════════════
//  WALK-IN MODAL
//  Lets admin search a member by name/code and check them in
//  for a specific date (defaults to today / active service).
// ════════════════════════════════════════════════════════════
function WalkInModal({ open, onClose, activeEvent, onSuccess }) {
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState([]);
  const [selected, setSelected] = useState(null);
  const [date,     setDate]     = useState(toISODate(new Date()));
  const [events,   setEvents]   = useState([]);
  const [eventId,  setEventId]  = useState("");
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState(null);

  useEffect(() => {
    if (activeEvent?.date) setDate(activeEvent.date);
  }, [activeEvent]);

  useEffect(() => {
    if (!date) return;
    supabase.from("service_events").select("id, event, time, branch")
      .eq("date", date).order("time")
      .then(({ data }) => {
        setEvents(data || []);
        if (activeEvent?.id && data?.find(e => e.id === activeEvent.id)) {
          setEventId(activeEvent.id);
        } else {
          setEventId(data?.[0]?.id || "");
        }
      });
  }, [date, activeEvent]);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("members")
        .select("id, name, member_code, category, branch_id, branches(name)")
        .or(`name.ilike.%${query}%,member_code.ilike.%${query}%`)
        .limit(8);
      setResults(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const reset = () => {
    setQuery(""); setResults([]); setSelected(null);
    setMsg(null); setSaving(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleCheckin = async () => {
    if (!selected) return;
    setSaving(true);
    setMsg(null);

    const { data: existing } = await supabase.from("attendance").select("id")
      .eq("member_id", selected.id).eq("service_date", date).maybeSingle();

    if (existing) {
      setMsg({ text:`${selected.name} is already checked in for ${date}.`, type:"warn" });
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("attendance").insert({
      member_id:    selected.id,
      branch_id:    selected.branch_id || null,
      event_id:     eventId || null,
      service_date: date,
      present:      true,
    });

    if (error) {
      setMsg({ text:"Check-in failed: " + error.message, type:"error" });
      setSaving(false);
      return;
    }

    const { data: mData } = await supabase.from("members")
      .select("points").eq("id", selected.id).maybeSingle();
    await supabase.from("members")
      .update({ points: (mData?.points || 0) + 10 }).eq("id", selected.id);

    setMsg({ text:`${selected.name} checked in ✓`, type:"success" });
    setSaving(false);
    onSuccess?.();
    logAction("attendance_recorded", `${selected.name} walk-in check-in`, "attendance", selected.id);

    setTimeout(() => { setSelected(null); setQuery(""); setResults([]); setMsg(null); }, 1800);
  };

  return (
    <Modal open={open} onClose={handleClose} title="Walk-in Check-in" width={480}>
      {msg && (
        <div style={{ background: msg.type==="success"?C.green3:msg.type==="warn"?C.amber3:C.rose3,
          color: msg.type==="success"?C.green:msg.type==="warn"?C.amber:C.rose2,
          borderRadius:R.md, padding:"10px 14px", fontSize:13, fontWeight:600, marginBottom:14 }}>
          {msg.text}
        </div>
      )}

      <div style={{ marginBottom:14 }}>
        <label style={{ fontSize:12, fontWeight:600, color:C.slate, display:"block", marginBottom:5 }}>
          Service Date
        </label>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)}
          style={{ width:"100%", padding:"9px 14px", borderRadius:R.md, boxSizing:"border-box",
            border:`1.5px solid ${C.cloud}`, fontSize:14, outline:"none", color:C.ink }}/>
      </div>

      <div style={{ marginBottom:16 }}>
        <label style={{ fontSize:12, fontWeight:600, color:C.slate, display:"block", marginBottom:5 }}>
          Service Event {events.length === 0 && <span style={{ color:C.mist, fontWeight:400 }}>(none found for this date)</span>}
        </label>
        <select value={eventId} onChange={e=>setEventId(e.target.value)}
          style={{ width:"100%", padding:"9px 14px", borderRadius:R.md,
            border:`1.5px solid ${C.cloud}`, fontSize:14, outline:"none",
            color:C.ink, background:C.white, boxSizing:"border-box" }}>
          <option value="">— No specific event —</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>
              {ev.event} · {ev.time?.slice(0,5)} · {ev.branch}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom:12 }}>
        <label style={{ fontSize:12, fontWeight:600, color:C.slate, display:"block", marginBottom:5 }}>
          Search Member
        </label>
        <input value={query} onChange={e=>{ setQuery(e.target.value); setSelected(null); }}
          placeholder="Type name or member code…"
          style={{ width:"100%", padding:"9px 14px", borderRadius:R.md, boxSizing:"border-box",
            border:`1.5px solid ${C.cloud}`, fontSize:14, outline:"none", color:C.ink }}/>
      </div>

      {results.length > 0 && !selected && (
        <div style={{ border:`1px solid ${C.fog}`, borderRadius:R.lg, overflow:"hidden", marginBottom:14 }}>
          {results.map((m, i) => (
            <button key={m.id} onClick={()=>{ setSelected(m); setQuery(m.name); setResults([]); }}
              style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"10px 14px",
                background:C.white, border:"none", borderTop: i>0?`1px solid ${C.fog}`:"none",
                cursor:"pointer", textAlign:"left", transition:"background .12s" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.fog}
              onMouseLeave={e=>e.currentTarget.style.background=C.white}>
              <Av name={m.name} size={32}/>
              <div>
                <div style={{ fontWeight:600, fontSize:13, color:C.ink }}>{m.name}</div>
                <div style={{ fontSize:11, color:C.mist }}>{m.member_code} · {m.branches?.name || "—"}</div>
              </div>
              <span style={{ marginLeft:"auto", background:`${catColor(m.category)}18`,
                color:catColor(m.category), fontSize:11, fontWeight:700,
                padding:"2px 8px", borderRadius:R.full }}>{m.category}</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div style={{ background:C.green3, border:`1px solid ${C.green2}`, borderRadius:R.lg,
          padding:"12px 14px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
          <Av name={selected.name} size={36}/>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:14, color:C.green }}>{selected.name}</div>
            <div style={{ fontSize:12, color:C.green }}>{selected.member_code} · {selected.branches?.name}</div>
          </div>
          <button onClick={()=>{ setSelected(null); setQuery(""); }}
            style={{ background:"transparent", border:"none", cursor:"pointer",
              color:C.green, fontSize:18, lineHeight:1 }}>✕</button>
        </div>
      )}

      <div style={{ display:"flex", gap:10, marginTop:4, flexWrap:"wrap" }}>
        <Btn label="Cancel" onClick={handleClose} outline full sm/>
        <Btn label={saving ? "Checking in…" : "Check In"} onClick={handleCheckin}
          disabled={!selected || saving} full sm/>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
//  MANUAL OVERRIDE MODAL
//  Admin corrects a missed attendance for any member, any past date.
// ════════════════════════════════════════════════════════════
function ManualOverrideModal({ open, onClose, onSuccess }) {
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState([]);
  const [selected, setSelected] = useState(null);
  const [date,     setDate]     = useState(toISODate(new Date()));
  const [events,   setEvents]   = useState([]);
  const [eventId,  setEventId]  = useState("");
  const [reason,   setReason]   = useState("");
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState(null);

  useEffect(() => {
    if (!date) return;
    supabase.from("service_events").select("id, event, time, branch")
      .eq("date", date).order("time")
      .then(({ data }) => { setEvents(data || []); setEventId(data?.[0]?.id || ""); });
  }, [date]);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("members")
        .select("id, name, member_code, category, branch_id, branches(name)")
        .or(`name.ilike.%${query}%,member_code.ilike.%${query}%`)
        .limit(8);
      setResults(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const reset = () => {
    setQuery(""); setResults([]); setSelected(null);
    setReason(""); setMsg(null); setSaving(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!selected || !date) return;
    setSaving(true);
    setMsg(null);

    const { data: existing } = await supabase.from("attendance").select("id")
      .eq("member_id", selected.id).eq("service_date", date).maybeSingle();

    if (existing) {
      setMsg({ text:`${selected.name} already has an attendance record for ${date}.`, type:"warn" });
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("attendance").insert({
      member_id:    selected.id,
      branch_id:    selected.branch_id || null,
      event_id:     eventId || null,
      service_date: date,
      present:      true,
      note:         reason || "Manual override by admin",
    });

    if (error) {
      setMsg({ text:"Failed: " + error.message, type:"error" });
      setSaving(false);
      return;
    }

    const { data: mData } = await supabase.from("members")
      .select("points").eq("id", selected.id).maybeSingle();
    await supabase.from("members")
      .update({ points: (mData?.points || 0) + 10 }).eq("id", selected.id);

    setMsg({ text:`Attendance recorded for ${selected.name} on ${date} ✓`, type:"success" });
    setSaving(false);
    onSuccess?.();
    logAction("attendance_recorded", `${selected.name} manual override for ${date}`, "attendance", selected.id);
    setTimeout(() => { reset(); }, 2000);
  };

  return (
    <Modal open={open} onClose={handleClose} title="Manual Attendance Override" width={500}>
      <div style={{ background:C.amber3, border:`1px solid ${C.amber2}`, borderRadius:R.md,
        padding:"10px 14px", fontSize:12, color:C.amber, fontWeight:600, marginBottom:16 }}>
        ⚠️ Use this to correct missed attendance after a service has expired. A note will be recorded.
      </div>

      {msg && (
        <div style={{ background: msg.type==="success"?C.green3:msg.type==="warn"?C.amber3:C.rose3,
          color: msg.type==="success"?C.green:msg.type==="warn"?C.amber:C.rose2,
          borderRadius:R.md, padding:"10px 14px", fontSize:13, fontWeight:600, marginBottom:14 }}>
          {msg.text}
        </div>
      )}

      <div style={{ marginBottom:14 }}>
        <label style={{ fontSize:12, fontWeight:600, color:C.slate, display:"block", marginBottom:5 }}>
          Service Date (past dates allowed)
        </label>
        <input type="date" value={date} max={toISODate(new Date())}
          onChange={e=>setDate(e.target.value)}
          style={{ width:"100%", padding:"9px 14px", borderRadius:R.md, boxSizing:"border-box",
            border:`1.5px solid ${C.cloud}`, fontSize:14, outline:"none", color:C.ink }}/>
      </div>

      <div style={{ marginBottom:14 }}>
        <label style={{ fontSize:12, fontWeight:600, color:C.slate, display:"block", marginBottom:5 }}>
          Service Event {events.length === 0 && <span style={{ color:C.mist, fontWeight:400 }}>(none found for this date)</span>}
        </label>
        <select value={eventId} onChange={e=>setEventId(e.target.value)}
          style={{ width:"100%", padding:"9px 14px", borderRadius:R.md,
            border:`1.5px solid ${C.cloud}`, fontSize:14, outline:"none",
            color:C.ink, background:C.white, boxSizing:"border-box" }}>
          <option value="">— No specific event —</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>
              {ev.event} · {ev.time?.slice(0,5)} · {ev.branch}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom:12 }}>
        <label style={{ fontSize:12, fontWeight:600, color:C.slate, display:"block", marginBottom:5 }}>
          Search Member
        </label>
        <input value={query} onChange={e=>{ setQuery(e.target.value); setSelected(null); }}
          placeholder="Type name or member code…"
          style={{ width:"100%", padding:"9px 14px", borderRadius:R.md, boxSizing:"border-box",
            border:`1.5px solid ${C.cloud}`, fontSize:14, outline:"none", color:C.ink }}/>
      </div>

      {results.length > 0 && !selected && (
        <div style={{ border:`1px solid ${C.fog}`, borderRadius:R.lg, overflow:"hidden", marginBottom:14 }}>
          {results.map((m, i) => (
            <button key={m.id} onClick={()=>{ setSelected(m); setQuery(m.name); setResults([]); }}
              style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"10px 14px",
                background:C.white, border:"none", borderTop: i>0?`1px solid ${C.fog}`:"none",
                cursor:"pointer", textAlign:"left", transition:"background .12s" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.fog}
              onMouseLeave={e=>e.currentTarget.style.background=C.white}>
              <Av name={m.name} size={32}/>
              <div>
                <div style={{ fontWeight:600, fontSize:13, color:C.ink }}>{m.name}</div>
                <div style={{ fontSize:11, color:C.mist }}>{m.member_code} · {m.branches?.name || "—"}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div style={{ background:C.blue3, border:`1px solid ${C.blue2}`, borderRadius:R.lg,
          padding:"12px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:12 }}>
          <Av name={selected.name} size={36}/>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:14, color:C.blue }}>{selected.name}</div>
            <div style={{ fontSize:12, color:C.blue }}>{selected.member_code} · {selected.branches?.name}</div>
          </div>
          <button onClick={()=>{ setSelected(null); setQuery(""); }}
            style={{ background:"transparent", border:"none", cursor:"pointer", color:C.blue, fontSize:18 }}>✕</button>
        </div>
      )}

      <div style={{ marginBottom:16 }}>
        <label style={{ fontSize:12, fontWeight:600, color:C.slate, display:"block", marginBottom:5 }}>
          Reason / Note <span style={{ color:C.mist, fontWeight:400 }}>(optional)</span>
        </label>
        <input value={reason} onChange={e=>setReason(e.target.value)}
          placeholder="e.g. Member was present but forgot to scan"
          style={{ width:"100%", padding:"9px 14px", borderRadius:R.md, boxSizing:"border-box",
            border:`1.5px solid ${C.cloud}`, fontSize:14, outline:"none", color:C.ink }}/>
      </div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        <Btn label="Cancel" onClick={handleClose} outline full sm/>
        <Btn label={saving ? "Saving…" : "Save Override"} onClick={handleSubmit}
          disabled={!selected || !date || saving} full sm color={C.amber2}/>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
//  SERVICE REPORT COMPONENT
// ════════════════════════════════════════════════════════════
const ServiceReport = ({ serviceReports, mob }) => (
  <div>
    <div style={{ fontSize:12, color:C.mist, marginBottom:12 }}>
      {serviceReports.length} service report{serviceReports.length!==1?"s":""}
    </div>
    <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:16 }}>
      {serviceReports.map((report, idx) => (
        <Card key={idx}>
          <div style={{ fontWeight:700, fontSize:14, color:C.ink, marginBottom:12 }}>
            {report.event} · {report.date}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}>
              <span style={{ color:C.slate }}>Total</span>
              <span style={{ color:C.ink, fontWeight:700 }}>{report.total}</span>
            </div>
            {["Kids","Youth","Young Adult","Men","Women","Senior"].map(type => (
              report[type] > 0 && (
                <div key={type} style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}>
                  <span style={{ color:C.slate }}>{type}</span>
                  <span style={{ color:C.blue, fontWeight:700 }}>{report[type]}</span>
                </div>
              )
            ))}
          </div>
        </Card>
      ))}
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════
//  MAIN PAGE
// ════════════════════════════════════════════════════════════
export default function AttendancePage() {
  const mob = useIsMobile();

  const [records, setRecords]   = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState("");
  const [search,  setSearch]    = useState("");
  const [filterBranch, setFilterBranch] = useState("All");
  const [filterCat,    setFilterCat]    = useState("All");
  const [view, setView] = useState("log");

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const [showWalkIn,   setShowWalkIn]   = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [toast,        setToast]        = useState(null);

  const [activeEvent,  setActiveEvent]  = useState(null);
  const [eventExpired, setEventExpired] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(true);

  const fetchActiveEvent = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("service_events").select("*").eq("is_active", true)
      .order("created_at", { ascending:false }).limit(1).maybeSingle();
    if (!err && data) {
      setActiveEvent({ id:data.id, event:data.event, date:data.date,
        time:data.time?.slice(0,5), branch:data.branch, expiry:data.expiry });
    } else setActiveEvent(null);
    setLoadingEvent(false);
  }, []);

  useEffect(() => {
    fetchActiveEvent();
    const id = setInterval(fetchActiveEvent, 10000);
    return () => clearInterval(id);
  }, [fetchActiveEvent]);

  useEffect(() => {
    if (!activeEvent?.expiry) { setEventExpired(false); return; }
    const check = () => setEventExpired(new Date(activeEvent.expiry).getTime() < Date.now());
    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, [activeEvent]);

  useEffect(() => {
    supabase.from("branches").select("id, name").order("name")
      .then(({ data, error:err }) => { if (!err) setBranches(data || []); });
  }, []);

  const fetchAttendance = useCallback(async () => {
    setLoading(true); setError("");
    const fromISO = toISODate(weekStart);
    const toISO   = toISODate(weekEnd);
    const { data, error:err } = await supabase.from("attendance")
      .select(`id, service_date, present, created_at, note,
        members(id, name, member_code, category, type),
        branches(id, name),
        service_events(id, event, time)`)
      .gte("service_date", fromISO).lte("service_date", toISO)
      .order("created_at", { ascending:false });

    if (err) setError("Failed to load attendance: " + err.message);
    else {
      const mapped = (data || []).map(r => ({
        id:          r.id,
        date:        r.service_date,
        present:     r.present,
        created_at:  r.created_at,
        note:        r.note || "",
        member_id:   r.members?.id,
        member_name: r.members?.name || "—",
        member_code: r.members?.member_code || "—",
        category:    r.members?.category || "—",
        type:        r.members?.type || "—",
        branch_id:   r.branches?.id,
        branch_name: r.branches?.name || "—",
        event:       r.service_events?.event || "—",
        time:        r.service_events?.time?.slice(0,5) || formatTime(r.created_at),
      }));
      setRecords(mapped);
    }
    setLoading(false);
  }, [weekStart, weekEnd]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  const isCurrentWeek = toISODate(startOfWeek(new Date())) === toISODate(weekStart);

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchSearch =
      (r.member_name||"").toLowerCase().includes(q) ||
      (r.event||"").toLowerCase().includes(q) ||
      (r.branch_name||"").toLowerCase().includes(q);
    const matchBranch = filterBranch==="All" || r.branch_name===filterBranch;
    const matchCat    = filterCat==="All"    || r.category===filterCat;
    return matchSearch && matchBranch && matchCat;
  });

  const stats = useMemo(() => {
    const total = records.length;
    const uniqueMembers = new Set(records.map(r=>r.member_id)).size;
    const byDay = {};
    for (let i=0;i<7;i++) {
      const d = addDays(weekStart, i);
      byDay[toISODate(d)] = { date:d, count:0 };
    }
    records.forEach(r => { if (byDay[r.date]) byDay[r.date].count += 1; });
    const days = Object.values(byDay);
    const maxDay = Math.max(1, ...days.map(d=>d.count));
    const byBranch = {};
    records.forEach(r => { const b=r.branch_name||"—"; byBranch[b]=(byBranch[b]||0)+1; });
    const byEvent = {};
    records.forEach(r => { const key=`${r.event||"—"} · ${r.date}`; byEvent[key]=(byEvent[key]||0)+1; });
    const topEvents = Object.entries(byEvent).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const byService = {};
    records.forEach(r => {
      const key = `${r.event||"—"}||${r.date}`;
      if (!byService[key]) byService[key] = {
        event: r.event||"—", date: r.date,
        total: 0,
        Kids:0, Youth:0, "Young Adult":0, Men:0, Women:0, Senior:0, "—":0,
      };
      byService[key].total += 1;
      const t = r.type || "—";
      if (byService[key][t] !== undefined) byService[key][t] += 1;
      else byService[key]["—"] = (byService[key]["—"]||0) + 1;
    });
    const serviceReports = Object.values(byService).sort((a,b)=>
      new Date(b.date) - new Date(a.date)
    );

    return { total, uniqueMembers, days, maxDay, byBranch, topEvents, serviceReports };
  }, [records, weekStart]);

  const handleSuccess = () => {
    fetchAttendance();
    setToast({ msg:"Attendance recorded successfully!", type:"success" });
  };

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}

      <WalkInModal open={showWalkIn} onClose={()=>setShowWalkIn(false)}
        activeEvent={activeEvent} onSuccess={handleSuccess}/>
      <ManualOverrideModal open={showOverride} onClose={()=>setShowOverride(false)}
        onSuccess={handleSuccess}/>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <h2 style={{ margin:0, fontWeight:800, fontSize:20, color:C.ink }}>Attendance</h2>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <button onClick={()=>setShowWalkIn(true)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px",
              background:C.green, color:C.white, border:"none", borderRadius:R.full,
              fontWeight:600, fontSize:13, cursor:"pointer" }}>
            <span style={{ fontSize:15 }}>➕</span> Walk-in
          </button>
          <button onClick={()=>setShowOverride(true)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px",
              background:C.amber3, color:C.amber, border:`1.5px solid ${C.amber2}`,
              borderRadius:R.full, fontWeight:600, fontSize:13, cursor:"pointer" }}>
            <span style={{ fontSize:15 }}>✏️</span> Override
          </button>
          <div style={{ display:"flex", border:`1.5px solid ${C.cloud}`, borderRadius:R.md, overflow:"hidden" }}>
            <button onClick={()=>setView("log")} style={{ padding:"7px 16px", border:"none", cursor:"pointer",
              background: view==="log"?C.blue:C.white, color:view==="log"?C.white:C.slate,
              fontWeight:600, fontSize:13, transition:"all .15s" }}>Log</button>
            <button onClick={()=>setView("stats")} style={{ padding:"7px 16px", border:"none",
              borderLeft:`1.5px solid ${C.cloud}`, cursor:"pointer",
              background: view==="stats"?C.blue:C.white, color:view==="stats"?C.white:C.slate,
              fontWeight:600, fontSize:13, transition:"all .15s" }}>Stats</button>
            <button onClick={()=>setView("report")} style={{ padding:"7px 16px", border:"none",
              borderLeft:`1.5px solid ${C.cloud}`, cursor:"pointer",
              background: view==="report"?C.blue:C.white, color:view==="report"?C.white:C.slate,
              fontWeight:600, fontSize:13, transition:"all .15s" }}>Report</button>
          </div>
        </div>
      </div>

      {!loadingEvent && (activeEvent ? (
        <div style={{ background: eventExpired?C.rose3:C.green3,
          border:`1px solid ${eventExpired?C.rose2:C.green2}`,
          borderRadius:R.lg, padding:"12px 18px", marginBottom:16,
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:eventExpired?C.rose:C.green }}>
              {eventExpired ? "⛔ Service QR Expired" : "🟢 Live Service"}
            </div>
            <div style={{ fontSize:12, color:eventExpired?C.rose:C.green, marginTop:2 }}>
              {activeEvent.event} · {activeEvent.date} · {activeEvent.time} · {activeEvent.branch}
            </div>
          </div>
          {eventExpired && (
            <button onClick={()=>setShowOverride(true)}
              style={{ padding:"6px 14px", background:C.rose2, color:C.white, border:"none",
                borderRadius:R.full, fontWeight:600, fontSize:12, cursor:"pointer", flexShrink:0 }}>
              Add Late Entry
            </button>
          )}
        </div>
      ) : (
        <div style={{ background:C.amber3, border:`1px solid ${C.amber2}`, borderRadius:R.lg,
          padding:"12px 18px", marginBottom:16, display:"flex", justifyContent:"space-between",
          alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <span style={{ fontSize:13, color:C.amber, fontWeight:600 }}>⚠️ No active service right now.</span>
          <button onClick={()=>setShowWalkIn(true)}
            style={{ padding:"6px 14px", background:C.amber2, color:C.white, border:"none",
              borderRadius:R.full, fontWeight:600, fontSize:12, cursor:"pointer", flexShrink:0 }}>
            Manual Check-in
          </button>
        </div>
      ))}

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={()=>setWeekStart(addDays(weekStart,-7))}
            style={{ width:34, height:34, borderRadius:"50%", border:`1.5px solid ${C.cloud}`,
              background:C.white, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={C.slate} strokeWidth={2} strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{ fontWeight:700, fontSize:14, color:C.ink, minWidth:170, textAlign:"center" }}>
            {formatRange(weekStart, weekEnd)}
          </div>
          <button onClick={()=>setWeekStart(addDays(weekStart,7))}
            style={{ width:34, height:34, borderRadius:"50%", border:`1.5px solid ${C.cloud}`,
              background:C.white, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={C.slate} strokeWidth={2} strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        {!isCurrentWeek && <Pill label="This Week" onClick={()=>setWeekStart(startOfWeek(new Date()))} color={C.blue}/>}
      </div>

      <div style={{ display:"flex", gap:12, marginBottom:18, flexWrap:"wrap" }}>
        <StatCard label="Total Check-ins" value={stats.total} color={C.blue}/>
        <StatCard label="Unique Members" value={stats.uniqueMembers} color={C.green}/>
        <StatCard label="Avg / Day" value={(stats.total/7).toFixed(1)} color={C.violet2}/>
      </div>

      {error && (
        <div style={{ background:C.rose3, color:C.rose, borderRadius:R.md,
          padding:"12px 14px", fontSize:13, marginBottom:16 }}>{error}</div>
      )}

      {loading ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:C.mist }}>
          <Spinner/>
          <div style={{ marginTop:12, fontSize:14 }}>Loading attendance…</div>
        </div>
      ) : view==="stats" ? (
        <>
          <Card style={{ marginBottom:16 }}>
            <div style={{ fontWeight:700, fontSize:14, color:C.ink, marginBottom:14 }}>Daily Check-ins</div>
            <div style={{ display:"flex", gap:mob?6:12, alignItems:"flex-end", height:140 }}>
              {stats.days.map(d => (
                <div key={toISODate(d.date)} style={{ flex:1, display:"flex", flexDirection:"column",
                  alignItems:"center", gap:6, height:"100%", justifyContent:"flex-end" }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.ink }}>{d.count}</div>
                  <div style={{ width:"100%", maxWidth:36, background:C.blue3, borderRadius:R.sm,
                    height:`${Math.max(4, d.count/stats.maxDay*90)}px`, transition:"height .4s" }}/>
                  <div style={{ fontSize:11, color:C.mist, fontWeight:600 }}>
                    {d.date.toLocaleDateString(undefined,{ weekday:"short" })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:16 }}>
            <Card>
              <div style={{ fontWeight:700, fontSize:14, color:C.ink, marginBottom:14 }}>By Branch</div>
              {Object.keys(stats.byBranch).length === 0 ? (
                <div style={{ fontSize:13, color:C.mist }}>No records this week.</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {Object.entries(stats.byBranch).sort((a,b)=>b[1]-a[1]).map(([branch,count]) => (
                    <div key={branch}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:12 }}>
                        <span style={{ color:C.slate, fontWeight:600 }}>{branch}</span>
                        <span style={{ color:C.ink, fontWeight:700 }}>{count}</span>
                      </div>
                      <div style={{ background:C.fog, borderRadius:R.full, height:6, overflow:"hidden" }}>
                        <div style={{ width:`${count/stats.total*100}%`, height:"100%",
                          background:C.blue, borderRadius:R.full }}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <div style={{ fontWeight:700, fontSize:14, color:C.ink, marginBottom:14 }}>Top Services</div>
              {stats.topEvents.length === 0 ? (
                <div style={{ fontSize:13, color:C.mist }}>No records this week.</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {stats.topEvents.map(([key,count]) => (
                    <div key={key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:13, color:C.ink, fontWeight:600,
                        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{key}</span>
                      <Badge label={`${count} check-ins`} color={C.green}/>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      ) : view==="report" ? (
        <ServiceReport serviceReports={stats.serviceReports} mob={mob}/>
      ) : (
        <>
          <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search name, event, branch…"
              style={{ flex:1, minWidth:180, padding:"9px 14px", borderRadius:R.full,
                border:`1.5px solid ${C.cloud}`, fontSize:13, outline:"none", color:C.ink }}/>
          </div>
          <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
            {["All",...branches.map(b=>b.name)].map(b=>(
              <Pill key={b} label={b} active={filterBranch===b} onClick={()=>setFilterBranch(b)} color={C.blue}/>
            ))}
          </div>
          <div style={{ display:"flex", gap:6, marginBottom:18, flexWrap:"wrap" }}>
            {["All",...CATEGORIES].map(c=>(
              <Pill key={c} label={c} active={filterCat===c}
                onClick={()=>setFilterCat(c)} color={c==="All"?C.slate:catColor(c)}/>
            ))}
          </div>
          <div style={{ fontSize:12, color:C.mist, marginBottom:12 }}>
            {filtered.length} record{filtered.length!==1?"s":""}
            {records.length !== filtered.length && ` (${records.length} total this week)`}
          </div>

          <Card style={{ padding:0, overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:C.fog }}>
                    {["Member","Category","Branch","Service","Date","Time","Note"].map(h=>(
                      <th key={h} style={{ textAlign:"left", padding:"10px 14px", color:C.slate,
                        fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:.4,
                        whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} style={{ borderTop:`1px solid ${C.fog}`,
                      background: r.note ? `${C.amber}06` : C.white }}>
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <Av name={r.member_name} size={32}/>
                          <div>
                            <div style={{ fontWeight:600, color:C.ink, fontSize:13 }}>{r.member_name}</div>
                            <div style={{ fontSize:11, color:C.mist }}>{r.member_code||"—"}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:"10px 14px" }}>
                        <Badge label={r.category||"—"} color={catColor(r.category)}/>
                      </td>
                      <td style={{ padding:"10px 14px", color:C.slate, fontSize:12 }}>{r.branch_name||"—"}</td>
                      <td style={{ padding:"10px 14px", color:C.slate }}>{r.event||"—"}</td>
                      <td style={{ padding:"10px 14px", color:C.slate, fontSize:12 }}>{r.date||"—"}</td>
                      <td style={{ padding:"10px 14px", color:C.slate, fontSize:12 }}>{r.time}</td>
                      <td style={{ padding:"10px 14px" }}>
                        {r.note ? (
                          <span style={{ fontSize:11, color:C.amber, fontWeight:600,
                            background:C.amber3, padding:"2px 8px", borderRadius:R.full }}>
                            ✏️ {r.note}
                          </span>
                        ) : <span style={{ color:C.cloud, fontSize:12 }}>—</span>}
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={7} style={{ textAlign:"center", padding:"40px 0", color:C.mist }}>
                        No attendance records match your filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
