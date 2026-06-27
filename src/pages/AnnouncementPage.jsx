import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

// ── Design tokens ─────────────────────────────────────────────
const C = {
  ink:"#0A0F1E", ink2:"#1C2336",
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

const BRANCHES = ["Main – Pinamalayan","Sta. Rita","Buli","Inclanay","Luma"];
const TAG_OPTIONS  = ["Worship","Events","Ministry","Announcement","Other"];
const TYPE_OPTIONS = ["event","worship","birthday"];
const REACTION_EMOJIS = ["🙏","❤️","🔥","👏","😊","🎉"];

const TAG_COLORS = {
  Worship:"#1D4ED8", Events:"#6D28D9", Ministry:"#15803D",
  Announcement:"#B45309", Other:"#64748B", Default:"#64748B",
};

const useIsMobile = () => {
  const [mob, setMob] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMob(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mob;
};

// ── Mini components ───────────────────────────────────────────
const Card = ({ children, style={}, onClick, hoverable }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={()=>hoverable&&setHov(true)}
      onMouseLeave={()=>hoverable&&setHov(false)}
      style={{ background:C.white, borderRadius:R.xl, boxShadow:hov?SH.md:SH.sm,
        border:`1px solid ${C.fog}`, padding:"18px 20px",
        transition:"box-shadow .18s, transform .18s",
        transform:hov?"translateY(-2px)":"none",
        cursor:onClick?"pointer":"default", ...style }}>
      {children}
    </div>
  );
};

const Pill = ({ label, active, onClick, color=C.blue }) => (
  <button onClick={onClick} style={{ padding:"6px 16px", borderRadius:R.full,
    border:`1.5px solid ${active?color:C.cloud}`, background:active?color:C.white,
    color:active?C.white:C.slate, fontWeight:600, fontSize:13, cursor:"pointer",
    transition:"all .15s", whiteSpace:"nowrap" }}>
    {label}
  </button>
);

const Badge = ({ label, color=C.blue }) => (
  <span style={{ background:`${color}18`, color, padding:"3px 10px", borderRadius:R.full,
    fontSize:11, fontWeight:700, letterSpacing:.3, whiteSpace:"nowrap" }}>{label}</span>
);

const Inp = ({ label, value, onChange, placeholder, options, required, type="text" }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:14 }}>
    <label style={{ fontSize:12, fontWeight:600, color:C.slate, letterSpacing:.2 }}>
      {label}{required&&<span style={{color:C.rose2}}> *</span>}
    </label>
    {options ? (
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{ padding:"10px 14px", border:`1.5px solid ${C.fog}`, borderRadius:R.md,
          fontSize:14, outline:"none", background:C.white, color:C.ink, appearance:"none" }}>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder}
        style={{ padding:"10px 14px", border:`1.5px solid ${C.fog}`, borderRadius:R.md,
          fontSize:14, outline:"none", color:C.ink }}/>
    )}
  </div>
);

const Btn = ({ label, onClick, color=C.blue, outline, full, sm }) => (
  <button onClick={onClick} style={{
    display:"flex", alignItems:"center", justifyContent:"center", gap:6,
    padding: sm?"7px 14px":"10px 20px",
    background: outline?"transparent":color,
    color: outline?color:C.white,
    border:`1.5px solid ${color}`, borderRadius:R.full,
    fontWeight:600, fontSize:sm?12:14, cursor:"pointer",
    transition:"all .15s", width:full?"100%":"auto", flexShrink:0,
  }}>
    {label}
  </button>
);

const Toast = ({ msg, type="success", onDone }) => {
  useEffect(()=>{ const t=setTimeout(onDone,3200); return()=>clearTimeout(t); },[onDone]);
  const bg = type==="error"?C.rose3:type==="warn"?C.amber3:C.green3;
  const fg = type==="error"?C.rose:type==="warn"?C.amber:C.green;
  return (
    <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
      background:bg, color:fg, borderRadius:R.full, padding:"11px 22px", fontSize:13,
      fontWeight:600, boxShadow:SH.md, zIndex:2000, whiteSpace:"nowrap" }}>
      {msg}
    </div>
  );
};

const Modal = ({ open, onClose, title, children, width=520 }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0,
      background:"rgba(10,15,30,.5)", backdropFilter:"blur(6px)",
      zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center",
      padding:16, boxSizing:"border-box" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.white, borderRadius:R.xxl,
        boxShadow:SH.lg, width:"100%", maxWidth:width, maxHeight:"92vh",
        overflowY:"auto", overflowX:"hidden", boxSizing:"border-box" }}>
        {title && (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"22px 24px 0", position:"sticky", top:0, background:C.white, zIndex:1 }}>
            <h3 style={{ margin:0, fontWeight:800, fontSize:17, color:C.ink }}>{title}</h3>
            <button onClick={onClose} style={{ border:"none", background:C.fog, borderRadius:"50%",
              width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:16, color:C.slate, lineHeight:1, flexShrink:0 }}>
              ✕
            </button>
          </div>
        )}
        {!title && (
          <div style={{ display:"flex", justifyContent:"flex-end", padding:"16px 20px 0" }}>
            <button onClick={onClose} style={{ border:"none", background:C.fog, borderRadius:"50%",
              width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:16, color:C.slate, lineHeight:1, flexShrink:0 }}>
              ✕
            </button>
          </div>
        )}
        <div style={{ padding:"16px 24px 28px", boxSizing:"border-box", width:"100%" }}>
          {children}
        </div>
      </div>
    </div>
  );
};

const logAction = async (action, details, entity, entityId) => {
  try {
    const { data:{ user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data:profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
    await supabase.from("audit_logs").insert([{
      user_id: user.id,
      user_name: profile?.name || user.email || "Unknown",
      action, details: details||null, entity: entity||null,
      entity_id: entityId ? String(entityId) : null,
    }]);
  } catch { /* silent */ }
};

// ── Announcement Detail Modal ─────────────────────────────────
const AnnouncementDetailModal = ({ open, item, onClose, user }) => {
  const [reactions, setReactions] = useState({});
  const [myReactions, setMyReactions] = useState(new Set());
  const [loadingReact, setLoadingReact] = useState(false);

  useEffect(() => {
    if (!open || !item?.id) return;
    loadReactions();
  }, [open, item?.id]);

  const loadReactions = async () => {
    const { data } = await supabase.from("announcement_reactions")
      .select("emoji, member_id").eq("announcement_id", item.id);
    const counts = {}, mine = new Set();
    (data||[]).forEach(r => {
      counts[r.emoji] = (counts[r.emoji]||0) + 1;
      if (r.member_id === user?.memberId) mine.add(r.emoji);
    });
    setReactions(counts);
    setMyReactions(mine);
  };

  const handleReact = async (emoji) => {
    if (!user?.memberId || loadingReact) return;
    setLoadingReact(true);
    if (myReactions.has(emoji)) {
      await supabase.from("announcement_reactions")
        .delete().eq("announcement_id", item.id)
        .eq("member_id", user.memberId).eq("emoji", emoji);
    } else {
      await supabase.from("announcement_reactions").insert({
        announcement_id: item.id, member_id: user.memberId, emoji,
      });
    }
    await loadReactions();
    setLoadingReact(false);
  };

  if (!open || !item) return null;
  const color = TAG_COLORS[item.tag] || TAG_COLORS.Default;

  return (
    <Modal open={open} onClose={onClose} width={520}>
      <div style={{ borderLeft:`4px solid ${color}`, paddingLeft:14, marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
          <Badge label={item.tag||"Announcement"} color={color}/>
          <span style={{ fontSize:11, color:C.mist }}>{item.date}</span>
        </div>
        <h2 style={{ margin:"0 0 10px", fontWeight:800, fontSize:20, color:C.ink }}>{item.title}</h2>
        <p style={{ margin:0, fontSize:14, color:C.slate, lineHeight:1.7 }}>{item.body}</p>
      </div>

      <div style={{ paddingTop:16, borderTop:`1px solid ${C.fog}` }}>
        <div style={{ fontSize:12, fontWeight:600, color:C.mist, marginBottom:10,
          textTransform:"uppercase", letterSpacing:.4 }}>Reactions</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {REACTION_EMOJIS.map(emoji => {
            const count = reactions[emoji]||0;
            const reacted = myReactions.has(emoji);
            return (
              <button key={emoji} onClick={()=>handleReact(emoji)}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px",
                  borderRadius:R.full, border:`1.5px solid ${reacted?color:C.cloud}`,
                  background:reacted?`${color}18`:C.white,
                  cursor:"pointer", fontSize:16, fontWeight:600, transition:"all .15s" }}>
                {emoji}
                {count > 0 && <span style={{ fontSize:12, color:reacted?color:C.slate }}>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

// ── Event Detail Modal ────────────────────────────────────────
const EventDetailModal = ({ open, item, onClose, user }) => {
  const [reactions,   setReactions]   = useState({});
  const [myReactions, setMyReactions] = useState(new Set());
  const [greetings,   setGreetings]   = useState([]);
  const [newGreeting, setNewGreeting] = useState("");
  const [sending,     setSending]     = useState(false);
  const [loadingReact,setLoadingReact]= useState(false);
  const isBirthday = item?.type === "birthday";

  useEffect(() => {
    if (!open || !item?.id) return;
    loadReactions();
    if (isBirthday) loadGreetings();
  }, [open, item?.id]);

  const loadReactions = async () => {
    const { data } = await supabase.from("event_reactions")
      .select("emoji, member_id").eq("event_id", item.id);
    const counts = {}, mine = new Set();
    (data||[]).forEach(r => {
      counts[r.emoji] = (counts[r.emoji]||0) + 1;
      if (r.member_id === user?.memberId) mine.add(r.emoji);
    });
    setReactions(counts);
    setMyReactions(mine);
  };

  const [alreadyGreeted, setAlreadyGreeted] = useState(false);

// In loadGreetings, check after loading:
const loadGreetings = async () => {
  const { data } = await supabase.from("birthday_greetings")
    .select("*, members(name)").eq("event_id", item.id)
    .order("created_at", { ascending: false });
  setGreetings(data || []);

  // Check if current user already greeted
  if (user?.memberId) {
    const mine = (data || []).find(g => g.member_id === user.memberId);
    setAlreadyGreeted(!!mine);
  }
};

  const handleReact = async (emoji) => {
    if (!user?.memberId || loadingReact) return;
    setLoadingReact(true);
    if (myReactions.has(emoji)) {
      await supabase.from("event_reactions")
        .delete().eq("event_id", item.id)
        .eq("member_id", user.memberId).eq("emoji", emoji);
    } else {
      await supabase.from("event_reactions").insert({
        event_id: item.id, member_id: user.memberId, emoji,
      });
    }
    await loadReactions();
    setLoadingReact(false);
  };

  const sendGreeting = async () => {
  if (!newGreeting.trim() || !user?.memberId) return;
  setSending(true);

  // Check if already greeted
  const { data: existing } = await supabase.from("birthday_greetings")
    .select("id")
    .eq("event_id", item.id)
    .eq("member_id", user.memberId)
    .maybeSingle();

  if (existing) {
    setSending(false);
    return;
  }

  const { error } = await supabase.from("birthday_greetings").insert({
    event_id: item.id, member_id: user.memberId, message: newGreeting.trim(),
  });
  if (!error) { setNewGreeting(""); await loadGreetings(); }
  setSending(false);
};

  if (!open || !item) return null;

  const cfg = isBirthday
    ? { color:C.rose2,   emoji:"🎂", label:"Birthday",  reactionEmojis:["🎂","🎉","❤️","🙏","🥳","😊"] }
    : item.type==="worship"
    ? { color:C.blue,    emoji:"✨", label:"Worship",    reactionEmojis:REACTION_EMOJIS }
    : { color:C.violet2, emoji:"📅", label:"Event",      reactionEmojis:REACTION_EMOJIS };

  return (
    <Modal open={open} onClose={onClose} width={520}>
      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:20 }}>
        <div style={{ fontSize:48, marginBottom:8 }}>{cfg.emoji}</div>
        <Badge label={cfg.label} color={cfg.color}/>
        <h2 style={{ margin:"10px 0 4px", fontWeight:800, fontSize:20, color:C.ink }}>{item.name}</h2>
        <div style={{ fontSize:13, color:C.mist }}>
          {item.date}{item.branch?` · ${item.branch}`:""}
        </div>
      </div>

      {/* Reactions */}
      <div style={{ paddingTop:16, borderTop:`1px solid ${C.fog}`,
        marginBottom: isBirthday ? 20 : 0 }}>
        <div style={{ fontSize:12, fontWeight:600, color:C.mist, marginBottom:10,
          textTransform:"uppercase", letterSpacing:.4 }}>
          {isBirthday ? "Send a reaction 🎉" : "Reactions"}
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {cfg.reactionEmojis.map(emoji => {
            const count = reactions[emoji]||0;
            const reacted = myReactions.has(emoji);
            return (
              <button key={emoji} onClick={()=>handleReact(emoji)}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px",
                  borderRadius:R.full, border:`1.5px solid ${reacted?cfg.color:C.cloud}`,
                  background:reacted?`${cfg.color}18`:C.white,
                  cursor:"pointer", fontSize:16, fontWeight:600, transition:"all .15s" }}>
                {emoji}
                {count > 0 && <span style={{ fontSize:12, color:reacted?cfg.color:C.slate }}>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Birthday greetings wall */}
      {isBirthday && (
        <div style={{ marginTop:4 }}>
          {alreadyGreeted ? (
            <div style={{ background:C.green3, border:`1px solid ${C.green2}`,
              borderRadius:R.lg, padding:"12px 14px", fontSize:13,
              color:C.green, fontWeight:600, marginBottom:16, textAlign:"center" }}>
              🎂 You already sent a birthday greeting!
            </div>
          ) : (
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              <input value={newGreeting} onChange={e=>setNewGreeting(e.target.value)}
                placeholder="Write a birthday greeting… 🎂"
                onKeyDown={e=>e.key==="Enter"&&sendGreeting()}
                style={{ flex:1, padding:"9px 14px", borderRadius:R.full, boxSizing:"border-box",
                  border:`1.5px solid ${C.cloud}`, fontSize:13, outline:"none", color:C.ink }}/>
              <button onClick={sendGreeting} disabled={!newGreeting.trim()||sending}
                style={{ padding:"9px 18px", borderRadius:R.full, background:C.rose2,
                  color:C.white, border:"none", fontWeight:700, fontSize:13,
                  cursor:!newGreeting.trim()||sending?"not-allowed":"pointer",
                  opacity:!newGreeting.trim()||sending?0.6:1, flexShrink:0 }}>
                {sending ? "…" : "Send 🎉"}
              </button>
            </div>
          )}

          {/* Greetings list — always visible */}
          <div style={{ fontSize:12, fontWeight:600, color:C.mist, marginBottom:10,
            textTransform:"uppercase", letterSpacing:.4 }}>
            Birthday Greetings ({greetings.length})
          </div>
          {greetings.length === 0 ? (
            <div style={{ background:C.fog, borderRadius:R.lg, padding:"20px",
              textAlign:"center", color:C.mist, fontSize:13 }}>
              No greetings yet — be the first! 🎂
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10,
              maxHeight:280, overflowY:"auto" }}>
              {greetings.map(g => (
                <div key={g.id} style={{ background:C.fog, borderRadius:R.lg,
                  padding:"12px 14px", borderLeft:`3px solid ${C.rose2}` }}>
                  <div style={{ fontWeight:700, fontSize:12, color:C.rose2, marginBottom:4 }}>
                    {g.members?.name||"Someone"} 🎉
                  </div>
                  <div style={{ fontSize:13, color:C.ink, lineHeight:1.5 }}>{g.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════
//  MAIN PAGE
// ════════════════════════════════════════════════════════════
export default function AnnouncementPage({ bg, user, role }) {
  const mob = useIsMobile();
  const [tab,           setTab]           = useState("announcements");
  const [announcements, setAnnouncements] = useState([]);
  const [events,        setEvents]        = useState([]);
  const [aForm,         setAForm]         = useState({ title:"", body:"", tag:"Worship", date:"" });
  const [eForm,         setEForm]         = useState({ name:"", type:"event", date:"", branch:"" });
  const [saving,        setSaving]        = useState(false);
  const [toast,         setToast]         = useState(null);
  const [selectedAnn,   setSelectedAnn]   = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const isAdmin = role === "admin" || role === "superadmin";
  const [bdaySuggestions, setBdaySuggestions] = useState([]);

useEffect(() => {
  const month = new Date().getMonth() + 1; // current month
  supabase.from("members")
    .select("id, name, birthdate")
    .not("birthdate", "is", null)
    .then(({ data }) => {
      if (!data) return;
      const thisMonth = data.filter(m => {
        const d = new Date(m.birthdate);
        return d.getMonth() + 1 === month;
      });
      setBdaySuggestions(thisMonth);
    });
}, []);

  useEffect(() => {
    supabase.from("announcements").select("*").order("created_at", { ascending:false })
      .then(({ data }) => { if (data) setAnnouncements(data); });
    supabase.from("events").select("*").order("date", { ascending:true })
      .then(({ data }) => { if (data) setEvents(data); });
  }, []);

  const addAnnouncement = async () => {
    if (!aForm.title.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("announcements").insert([aForm]).select().single();
    if (error) setToast({ msg:"Failed: "+error.message, type:"error" });
    else {
      setAnnouncements(prev=>[data,...prev]);
      setAForm({ title:"", body:"", tag:"Worship", date:"" });
      setToast({ msg:"Announcement posted!", type:"success" });
      logAction("announcement_posted", `"${data.title}"`, "announcement", data.id);
    }
    setSaving(false);
  };

  const deleteAnnouncement = async (id) => {
    await supabase.from("announcements").delete().eq("id", id);
    setAnnouncements(prev=>prev.filter(a=>a.id!==id));
  };

  const addEvent = async () => {
    if (!eForm.name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("events").insert([eForm]).select().single();
    if (error) setToast({ msg:"Failed: "+error.message, type:"error" });
    else {
      setEvents(prev=>[...prev, data]);
      setEForm({ name:"", type:"event", date:"", branch:"" });
      setToast({ msg:"Event added!", type:"success" });
      logAction("event_added", `"${data.name}"`, "event", data.id);
    }
    setSaving(false);
  };

  const deleteEvent = async (id) => {
    await supabase.from("events").delete().eq("id", id);
    setEvents(prev=>prev.filter(e=>e.id!==id));
  };

  const tabs = ["announcements", "events", ...(isAdmin ? ["manage"] : [])];

  return (
    <div style={ bg ? {
      backgroundImage:`linear-gradient(rgba(232,237,245,.93),rgba(232,237,245,.93)),url(${bg})`,
      backgroundSize:"cover", backgroundPosition:"center",
      backgroundAttachment:"fixed", minHeight:"100%", margin:-28, padding:28,
    } : {}}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}

      <AnnouncementDetailModal open={!!selectedAnn} item={selectedAnn}
        onClose={()=>setSelectedAnn(null)} user={user}/>
      <EventDetailModal open={!!selectedEvent} item={selectedEvent}
        onClose={()=>setSelectedEvent(null)} user={user}/>

      <h2 style={{ margin:"0 0 16px", fontWeight:800, fontSize:20, color:C.ink }}>
        Announcements & Events
      </h2>

      <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
        <Pill label="Announcements" active={tab==="announcements"}
          onClick={()=>setTab("announcements")}/>
        <Pill label="Upcoming Events" active={tab==="events"}
          onClick={()=>setTab("events")} color={C.violet2}/>
        {isAdmin && (
          <Pill label="Manage" active={tab==="manage"}
            onClick={()=>setTab("manage")} color={C.slate}/>
        )}
      </div>

      {/* ── Announcements ── */}
      {tab==="announcements" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {announcements.length === 0
            ? <p style={{ color:C.mist, fontSize:13 }}>No announcements yet.</p>
            : announcements.map(a => {
                const color = TAG_COLORS[a.tag]||TAG_COLORS.Default;
                return (
                  <Card key={a.id} onClick={()=>setSelectedAnn(a)} hoverable
                    style={{ borderLeft:`3px solid ${color}`, padding:"14px 16px", cursor:"pointer" }}>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"flex-start", marginBottom:5, gap:8 }}>
                      <strong style={{ fontSize:14, color:C.ink }}>{a.title}</strong>
                      {a.tag && <Badge label={a.tag} color={color}/>}
                    </div>
                    <p style={{ margin:"0 0 5px", fontSize:13, color:C.slate, lineHeight:1.5 }}>
                      {a.body}
                    </p>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:11, color:C.mist }}>{a.date}</span>
                      <span style={{ fontSize:11, color, fontWeight:600 }}>Tap to read more →</span>
                    </div>
                  </Card>
                );
              })
          }
        </div>
      )}

      {/* ── Events ── */}
      {tab==="events" && (
        <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:12 }}>
          {events.length === 0
            ? <p style={{ color:C.mist, fontSize:13 }}>No upcoming events.</p>
            : events.map(e => {
                const cfg = e.type==="birthday"
                  ? { color:C.rose2,   emoji:"🎂", label:"Birthday" }
                  : e.type==="worship"
                  ? { color:C.blue,    emoji:"✨", label:"Worship"  }
                  : { color:C.violet2, emoji:"📅", label:"Event"    };
                return (
                  <Card key={e.id} onClick={()=>setSelectedEvent(e)} hoverable
                    style={{ cursor:"pointer", display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{ width:44, height:44, borderRadius:R.lg,
                      background:`${cfg.color}15`, display:"flex", alignItems:"center",
                      justifyContent:"center", fontSize:22, flexShrink:0 }}>
                      {cfg.emoji}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:C.ink }}>{e.name}</div>
                      <div style={{ fontSize:12, color:C.mist }}>
                        {e.date}{e.branch?` · ${e.branch}`:""}
                      </div>
                    </div>
                    <Badge label={cfg.label} color={cfg.color}/>
                  </Card>
                );
              })
          }
        </div>
      )}

      {/* ── Manage (admin only) ── */}
      {tab==="manage" && isAdmin && (
        <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:20 }}>
          <div>
            <Card style={{ marginBottom:16 }}>
              <h3 style={{ margin:"0 0 16px", fontWeight:700, fontSize:14, color:C.ink }}>
                New Announcement
              </h3>
              <Inp label="Title" value={aForm.title} onChange={v=>setAForm({...aForm,title:v})}
                placeholder="e.g. Sunday Worship Service" required/>
              <Inp label="Body" value={aForm.body} onChange={v=>setAForm({...aForm,body:v})}
                placeholder="Details…"/>
              <Inp label="Tag" value={aForm.tag} onChange={v=>setAForm({...aForm,tag:v})}
                options={TAG_OPTIONS}/>
              <Inp label="Date / Schedule" value={aForm.date} onChange={v=>setAForm({...aForm,date:v})}
                placeholder="e.g. June 2, 2026"/>
              <Btn label={saving?"Saving…":"Post Announcement"} onClick={addAnnouncement} full/>
            </Card>

            {bdaySuggestions.length > 0 && (
  <Card style={{ marginBottom:16, background:C.rose3, border:`1px solid ${C.rose2}` }}>
    <h3 style={{ margin:"0 0 12px", fontWeight:700, fontSize:13, color:C.rose }}>
      🎂 Birthdays this month ({bdaySuggestions.length})
    </h3>
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {bdaySuggestions.map(m => {
        const bday = new Date(m.birthdate);
        const day = bday.getDate();
        const monthName = bday.toLocaleString("default", { month:"long" });
        const alreadyAdded = events.some(e =>
          e.type === "birthday" && e.name.toLowerCase().includes(m.name.toLowerCase())
        );
        return (
          <div key={m.id} style={{ display:"flex", alignItems:"center",
            justifyContent:"space-between", gap:10 }}>
            <div>
              <div style={{ fontWeight:600, fontSize:13, color:C.ink }}>{m.name}</div>
              <div style={{ fontSize:11, color:C.rose }}>{monthName} {day}</div>
            </div>
            {alreadyAdded ? (
              <span style={{ fontSize:11, color:C.green, fontWeight:600 }}>✓ Added</span>
            ) : (
              <button
                onClick={() => {
                  const bday = new Date(m.birthdate);
                  const label = bday.toLocaleString("default", { month:"long" }) + " " + bday.getDate();
                  setEForm({ name:m.name, type:"birthday", date:label, branch:"" });
                }}
                style={{ border:"none", background:C.rose2, color:C.white,
                  borderRadius:R.full, padding:"5px 12px", cursor:"pointer",
                  fontSize:12, fontWeight:600, flexShrink:0 }}>
                + Add
              </button>
            )}
          </div>
        );
      })}
    </div>
  </Card>
)}

            <Card>
              <h3 style={{ margin:"0 0 14px", fontWeight:700, fontSize:14, color:C.ink }}>
                New Event
              </h3>
              <Inp label="Name" value={eForm.name} onChange={v=>setEForm({...eForm,name:v})}
                placeholder="e.g. Youth Praise Night" required/>
              <Inp label="Type" value={eForm.type} onChange={v=>setEForm({...eForm,type:v})}
                options={TYPE_OPTIONS}/>
              <Inp label="Date" value={eForm.date} onChange={v=>setEForm({...eForm,date:v})}
                placeholder="e.g. June 14"/>
              <Inp label="Branch" value={eForm.branch} onChange={v=>setEForm({...eForm,branch:v})}
                options={["", ...BRANCHES]}/>
              <Btn label={saving?"Saving…":"Add Event"} onClick={addEvent} full
                color={C.violet2}/>
            </Card>
          </div>

          <div>
            <div style={{ fontWeight:700, fontSize:13, color:C.ink, marginBottom:10 }}>
              Announcements
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
              {announcements.map(a => {
                const color = TAG_COLORS[a.tag]||TAG_COLORS.Default;
                return (
                  <Card key={a.id} style={{ borderLeft:`3px solid ${color}`, padding:"12px 14px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", gap:8 }}>
                      <strong style={{ fontSize:13, color:C.ink }}>{a.title}</strong>
                      <button onClick={()=>deleteAnnouncement(a.id)}
                        style={{ border:"none", background:C.rose3, borderRadius:R.sm,
                          padding:"4px 10px", cursor:"pointer", color:C.rose2,
                          fontWeight:700, fontSize:12 }}>
                        ✕
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div style={{ fontWeight:700, fontSize:13, color:C.ink, marginBottom:10 }}>Events</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {events.map(e => (
                <Card key={e.id} style={{ padding:"10px 14px", display:"flex",
                  justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:C.ink }}>{e.name}</div>
                    <div style={{ fontSize:11, color:C.mist }}>{e.date}</div>
                  </div>
                  <button onClick={()=>deleteEvent(e.id)}
                    style={{ border:"none", background:C.rose3, borderRadius:R.sm,
                      padding:"4px 10px", cursor:"pointer", color:C.rose2,
                      fontWeight:700, fontSize:12 }}>
                    ✕
                  </button>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}