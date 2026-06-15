import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── Design tokens (shared with MembersPage / QRScannerPage) ──
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
const SH = { sm:"0 2px 8px rgba(0,0,0,.07)", md:"0 4px 20px rgba(0,0,0,.09)" };

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

// ── Date helpers ─────────────────────────────────────────────
const pad = n => String(n).padStart(2, "0");
const toISODate = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

const startOfWeek = (d) => {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday
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

export default function AttendancePage() {
  const mob = useIsMobile();

  const [records, setRecords]   = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState("");
  const [search,  setSearch]    = useState("");
  const [filterBranch, setFilterBranch] = useState("All");
  const [filterCat,    setFilterCat]    = useState("All");
  const [view, setView] = useState("log"); // log | stats

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  // ── Live service status ────────────────────────────────────
  const [activeEvent,  setActiveEvent]  = useState(null);
  const [eventExpired, setEventExpired] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(true);

  const fetchActiveEvent = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("service_events")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!err && data) {
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

  // ── Fetch branches (for filter pills) ──────────────────────
  useEffect(() => {
    supabase.from("branches").select("id, name").order("name")
      .then(({ data, error: err }) => { if (!err) setBranches(data || []); });
  }, []);

  // ── Fetch attendance for the selected week, joined ─────────
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError("");

    const fromISO = toISODate(weekStart);
    const toISO   = toISODate(weekEnd);

    const { data, error: err } = await supabase
      .from("attendance")
      .select(`
        id, service_date, present, created_at,
        members ( id, name, member_code, category ),
        branches ( id, name ),
        service_events ( id, event, time )
      `)
      .gte("service_date", fromISO)
      .lte("service_date", toISO)
      .order("created_at", { ascending: false });

    if (err) setError("Failed to load attendance: " + err.message);
    else {
      const mapped = (data || []).map(r => ({
        id:          r.id,
        date:        r.service_date,
        present:     r.present,
        created_at:  r.created_at,
        member_id:   r.members?.id,
        member_name: r.members?.name || "—",
        member_code: r.members?.member_code || "—",
        category:    r.members?.category || "—",
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

  // ── Filtering ─────────────────────────────────────────────
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

  // ── Stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = records.length;
    const uniqueMembers = new Set(records.map(r=>r.member_id)).size;

    const byDay = {};
    for (let i=0;i<7;i++) {
      const d = addDays(weekStart, i);
      byDay[toISODate(d)] = { date:d, count:0 };
    }
    records.forEach(r => {
      if (byDay[r.date]) byDay[r.date].count += 1;
    });
    const days = Object.values(byDay);
    const maxDay = Math.max(1, ...days.map(d=>d.count));

    const byBranch = {};
    records.forEach(r => {
      const b = r.branch_name || "—";
      byBranch[b] = (byBranch[b]||0) + 1;
    });

    const byEvent = {};
    records.forEach(r => {
      const key = `${r.event||"—"} · ${r.date}`;
      byEvent[key] = (byEvent[key]||0) + 1;
    });
    const topEvents = Object.entries(byEvent).sort((a,b)=>b[1]-a[1]).slice(0,5);

    return { total, uniqueMembers, days, maxDay, byBranch, topEvents };
  }, [records, weekStart]);

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <h2 style={{ margin:0, fontWeight:800, fontSize:20, color:C.ink }}>Attendance</h2>
        <div style={{ display:"flex", border:`1.5px solid ${C.cloud}`, borderRadius:R.md, overflow:"hidden" }}>
          <button onClick={()=>setView("log")} style={{ padding:"7px 16px", border:"none", cursor:"pointer",
            background: view==="log" ? C.blue : C.white, color: view==="log" ? C.white : C.slate,
            fontWeight:600, fontSize:13, transition:"all .15s" }}>
            Log
          </button>
          <button onClick={()=>setView("stats")} style={{ padding:"7px 16px", border:"none", borderLeft:`1.5px solid ${C.cloud}`, cursor:"pointer",
            background: view==="stats" ? C.blue : C.white, color: view==="stats" ? C.white : C.slate,
            fontWeight:600, fontSize:13, transition:"all .15s" }}>
            Stats
          </button>
        </div>
      </div>

      {/* Live service banner */}
      {loadingEvent ? null : activeEvent ? (
        <div style={{ background: eventExpired ? C.rose3 : C.green3,
          border:`1px solid ${eventExpired ? C.rose2 : C.green2}`,
          borderRadius:R.lg, padding:"12px 18px", marginBottom:16,
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color: eventExpired ? C.rose : C.green }}>
              {eventExpired ? "⛔ Service QR Expired" : "🟢 Live Service"}
            </div>
            <div style={{ fontSize:12, color: eventExpired ? C.rose : C.green, marginTop:2 }}>
              {activeEvent.event} · {activeEvent.date} · {activeEvent.time} · {activeEvent.branch}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background:C.amber3, border:`1px solid ${C.amber2}`, borderRadius:R.lg,
          padding:"12px 18px", marginBottom:16, fontSize:13, color:C.amber, fontWeight:600 }}>
          ⚠️ No active service right now.
        </div>
      )}

      {/* Week navigator */}
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
        {!isCurrentWeek && (
          <Pill label="This Week" onClick={()=>setWeekStart(startOfWeek(new Date()))} color={C.blue}/>
        )}
      </div>

      {/* Stat summary */}
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
          {/* Daily breakdown */}
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
            {/* By branch */}
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

            {/* Top events */}
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
      ) : (
        <>
          {/* Filters */}
          <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search name, event, branch…"
              style={{ flex:1, minWidth:180, padding:"9px 14px", borderRadius:R.full,
                border:`1.5px solid ${C.cloud}`, fontSize:13, outline:"none", color:C.ink }}/>
          </div>
          <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
            {["All",...branches.map(b=>b.name)].map(b=>(
              <Pill key={b} label={b} active={filterBranch===b}
                onClick={()=>setFilterBranch(b)} color={C.blue}/>
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

          {/* Log table */}
          <Card style={{ padding:0, overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:C.fog }}>
                    {["Member","Category","Branch","Service","Date","Time"].map(h=>(
                      <th key={h} style={{ textAlign:"left", padding:"10px 14px", color:C.slate,
                        fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:.4,
                        whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} style={{ borderTop:`1px solid ${C.fog}` }}>
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
                      <td style={{ padding:"10px 14px", color:C.slate, fontSize:12 }}>
                        {r.branch_name || "—"}
                      </td>
                      <td style={{ padding:"10px 14px", color:C.slate }}>{r.event||"—"}</td>
                      <td style={{ padding:"10px 14px", color:C.slate, fontSize:12 }}>{r.date||"—"}</td>
                      <td style={{ padding:"10px 14px", color:C.slate, fontSize:12 }}>{r.time}</td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={6} style={{ textAlign:"center", padding:"40px 0", color:C.mist }}>
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
