import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── Design tokens (shared with rest of app) ──────────────────
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

// ── Rank system (shared with MembersPage) ────────────────────
const RANKS = [
  { name:"Seedling", min:0,   max:199,  color:"#78716C", icon:"🌱" },
  { name:"Sprout",   min:200, max:399,  color:"#65A30D", icon:"🌿" },
  { name:"Sapling",  min:400, max:599,  color:"#16A34A", icon:"🌳" },
  { name:"Tree",     min:600, max:849,  color:"#0F766E", icon:"🌲" },
  { name:"Oak",      min:850, max:9999, color:"#1D4ED8", icon:"🌳" },
];
const getRank = pts => RANKS.find(r => pts >= r.min && pts <= r.max) || RANKS[0];
const getNextRank = pts => {
  const idx = RANKS.findIndex(r => pts >= r.min && pts <= r.max);
  return RANKS[idx + 1] || null;
};

// ── Attendance streak tiers ───────────────────────────────────
const STREAK_TIERS = [
  { name:"—",            min:0,  color:C.mist },
  { name:"Bronze Tier",  min:4,  color:"#B45309" },
  { name:"Silver Tier",  min:8,  color:"#64748B" },
  { name:"Gold Tier",    min:16, color:"#D97706" },
  { name:"Platinum Tier",min:26, color:"#6D28D9" },
];
const getStreakTier = weeks => {
  let tier = STREAK_TIERS[0];
  for (const t of STREAK_TIERS) if (weeks >= t.min) tier = t;
  return tier;
};

const Card = ({ children, style={} }) => (
  <div style={{ background:C.white, borderRadius:R.xl, boxShadow:SH.sm,
    border:`1px solid ${C.fog}`, padding:"20px 22px", ...style }}>
    {children}
  </div>
);

const Spinner = () => (
  <div style={{ display:"inline-block", width:18, height:18, borderRadius:"50%",
    border:`2px solid ${C.cloud}`, borderTopColor:C.blue,
    animation:"spin .7s linear infinite" }}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

// ── Date helpers ─────────────────────────────────────────────
const pad = n => String(n).padStart(2, "0");
const toISODate = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

const formatShortDate = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month:"short", day:"numeric" }).toUpperCase();
};

export default function MyAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [member,  setMember]  = useState(null); // members row
  const [sundays, setSundays] = useState([]);   // all unique service_events dates (Sundays), ascending
  const [presentDates, setPresentDates] = useState(new Set()); // dates the member attended

  // ── Load member profile + all service Sundays + this member's attendance ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    // 1. Get current authenticated user
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      setError("Not signed in.");
      setLoading(false);
      return;
    }

    // 2. Get profile -> member_id
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("member_id")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profErr || !profile?.member_id) {
      setError("No member profile linked to this account.");
      setLoading(false);
      return;
    }

    // 3. Get member record
    const { data: memberRow, error: memberErr } = await supabase
      .from("members")
      .select("id, name, category, type, points, branch_id, branches(name)")
      .eq("id", profile.member_id)
      .maybeSingle();

    if (memberErr || !memberRow) {
      setError("Member record not found.");
      setLoading(false);
      return;
    }
    setMember(memberRow);

    // 4. Get all distinct service event Sundays (date-ordered)
    const { data: events, error: eventsErr } = await supabase
      .from("service_events")
      .select("date")
      .order("date", { ascending: true });

    if (eventsErr) {
      setError("Failed to load service schedule: " + eventsErr.message);
      setLoading(false);
      return;
    }
    const uniqueDates = [...new Set((events || []).map(e => e.date))];
    setSundays(uniqueDates);

    // 5. Get this member's attendance records
    const { data: attRows, error: attErr } = await supabase
      .from("attendance")
      .select("service_date, present")
      .eq("member_id", profile.member_id);

    if (attErr) {
      setError("Failed to load attendance: " + attErr.message);
      setLoading(false);
      return;
    }
    const presentSet = new Set(
      (attRows || []).filter(r => r.present !== false).map(r => r.service_date)
    );
    setPresentDates(presentSet);

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Computed stats ──────────────────────────────────────────
  const stats = useMemo(() => {
    const totalSundays = sundays.length;
    const attendedCount = sundays.filter(d => presentDates.has(d)).length;
    const rate = totalSundays > 0 ? Math.round((attendedCount / totalSundays) * 100) : 0;

    // Streak: count consecutive most-recent Sundays attended (walking backwards)
    let streak = 0;
    for (let i = sundays.length - 1; i >= 0; i--) {
      if (presentDates.has(sundays[i])) streak++;
      else break;
    }

    // Recent 6 Sundays (most recent last, to match screenshot left-to-right chronological)
    const recent6 = sundays.slice(-6);
    const recentAttended = recent6.filter(d => presentDates.has(d)).length;
    const recentRate = recent6.length > 0 ? Math.round((recentAttended / recent6.length) * 100) : 0;

    return { totalSundays, attendedCount, rate, streak, recent6, recentRate };
  }, [sundays, presentDates]);

  if (loading) {
    return (
      <div style={{ textAlign:"center", padding:"60px 0", color:C.mist }}>
        <Spinner/>
        <div style={{ marginTop:12, fontSize:14 }}>Loading your attendance…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background:C.rose3, color:C.rose, borderRadius:R.md,
        padding:"14px 16px", fontSize:13 }}>{error}</div>
    );
  }

  const rank = getRank(member.points || 0);
  const nextRank = getNextRank(member.points || 0);
  const streakTier = getStreakTier(stats.streak);
  const branchName = member.branches?.name || "—";

  return (
    <div>
      {/* ── Rank header banner ─────────────────────────────── */}
      <div style={{ background:C.ink, borderRadius:R.xl, padding:"20px 24px", marginBottom:20,
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, minWidth:200 }}>
          <div style={{ fontSize:28 }}>{rank.icon}</div>
          <div style={{ flex:1, minWidth:180 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <span style={{ color:rank.color, fontWeight:800, fontSize:14, letterSpacing:.5,
                textTransform:"uppercase" }}>{rank.name}</span>
              <span style={{ color:"rgba(255,255,255,.5)", fontSize:13 }}>· {member.points||0} pts</span>
            </div>
            <div style={{ background:"rgba(255,255,255,.12)", borderRadius:R.full, height:6, overflow:"hidden", minWidth:200 }}>
              <div style={{
                width: nextRank
                  ? `${Math.min(100, ((member.points||0) - rank.min) / (nextRank.min - rank.min) * 100)}%`
                  : "100%",
                height:"100%", background:rank.color, borderRadius:R.full,
                transition:"width .7s cubic-bezier(.4,0,.2,1)" }}/>
            </div>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:24 }}>
          {nextRank && (
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>→ {nextRank.name} at {nextRank.min}</div>
            </div>
          )}
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:20, fontWeight:800, color:"#fff" }}>{stats.rate}%</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>Attend.</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:20, fontWeight:800, color:C.amber2 }}>{member.points||0}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>Points</div>
          </div>
        </div>
      </div>

      <h2 style={{ margin:"0 0 16px", fontWeight:800, fontSize:20, color:C.ink }}>Attendance</h2>

      {/* ── Top cards ───────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))",
        gap:16, marginBottom:20 }}>

        {/* My Attendance Rate */}
        <div style={{ background:C.blue, borderRadius:R.xl, padding:"24px",
          color:C.white, textAlign:"center", boxShadow:SH.sm }}>
          <div style={{ fontSize:12, opacity:.8, marginBottom:6, fontWeight:600 }}>My Attendance Rate</div>
          <div style={{ fontSize:40, fontWeight:800, marginBottom:10 }}>{stats.rate}%</div>
          <div style={{ background:"rgba(255,255,255,.25)", borderRadius:R.full, height:6, overflow:"hidden", marginBottom:10 }}>
            <div style={{ width:`${stats.rate}%`, height:"100%", background:"#fff",
              borderRadius:R.full, transition:"width .7s cubic-bezier(.4,0,.2,1)" }}/>
          </div>
          <div style={{ fontSize:12, opacity:.85 }}>
            {stats.attendedCount} of {stats.totalSundays} Sundays attended
          </div>
        </div>

        {/* Attendance Streak */}
        <Card style={{ textAlign:"center", display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center" }}>
          <div style={{ fontSize:12, color:C.mist, marginBottom:6, fontWeight:600 }}>Attendance Streak</div>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ fontSize:28 }}>{getRank(0).icon}</div>
            <div>
              <div style={{ fontSize:28, fontWeight:800, color:C.ink }}>
                {stats.streak} <span style={{ fontSize:16, fontWeight:700 }}>wks</span>
              </div>
              <div style={{ fontSize:12, color:streakTier.color, fontWeight:700, marginTop:2 }}>
                {stats.streak >= STREAK_TIERS[1].min ? "🥈 " : ""}{streakTier.name}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Weekly log ──────────────────────────────────────── */}
      <Card style={{ padding:0, overflow:"hidden" }}>
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.fog}` }}>
          <div style={{ fontWeight:800, fontSize:15, color:C.ink }}>
            Weekly Log (Recent {stats.recent6.length} Sunday{stats.recent6.length!==1?"s":""})
          </div>
        </div>

        {stats.recent6.length === 0 ? (
          <div style={{ textAlign:"center", padding:"40px 0", color:C.mist, fontSize:13 }}>
            No services have been scheduled yet.
          </div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:C.fog }}>
                  <th style={{ textAlign:"left", padding:"10px 20px", color:C.slate,
                    fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:.4 }}>Member</th>
                  {stats.recent6.map(d => (
                    <th key={d} style={{ textAlign:"center", padding:"10px 8px", color:C.slate,
                      fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:.4,
                      whiteSpace:"nowrap" }}>{formatShortDate(d)}</th>
                  ))}
                  <th style={{ textAlign:"center", padding:"10px 20px", color:C.slate,
                    fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:.4 }}>Rate</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderTop:`1px solid ${C.fog}` }}>
                  <td style={{ padding:"12px 20px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:"50%", background:C.violet2,
                        display:"flex", alignItems:"center", justifyContent:"center", color:"#fff",
                        fontWeight:700, fontSize:12, flexShrink:0 }}>
                        {(member.name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, color:C.ink, fontSize:13 }}>{member.name}</div>
                        <div style={{ fontSize:11, color:C.mist }}>{branchName}</div>
                      </div>
                    </div>
                  </td>
                  {stats.recent6.map(d => {
                    const present = presentDates.has(d);
                    return (
                      <td key={d} style={{ textAlign:"center", padding:"12px 8px" }}>
                        <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
                          width:24, height:24, borderRadius:"50%",
                          background: present ? C.green3 : C.rose3,
                          color: present ? C.green : C.rose2, fontSize:13, fontWeight:700 }}>
                          {present ? "✓" : "✕"}
                        </span>
                      </td>
                    );
                  })}
                  <td style={{ textAlign:"center", padding:"12px 20px" }}>
                    <span style={{ background:C.fog, color:C.ink, borderRadius:R.full,
                      padding:"4px 12px", fontSize:12, fontWeight:700 }}>
                      {stats.recentRate}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
