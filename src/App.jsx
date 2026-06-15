import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./lib/useAuth";
import Login from "./components/Login";
import MembersPage from './pages//MembersPage'
import QRGeneratorPage from './pages/QRGeneratorPage'
import QRCode from "qrcode";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ═══════════════════════════════════════════════════════════
   DESIGN SYSTEM
═══════════════════════════════════════════════════════════ */
const C = {
  ink:     "#0A0F1E",
  ink2:    "#1C2336",
  ink3:    "#2E3A52",
  slate:   "#64748B",
  mist:    "#94A3B8",
  cloud:   "#CBD5E1",
  fog:     "#E8EDF5",
  white:   "#FFFFFF",
  blue:    "#1D4ED8",
  blue2:   "#3B82F6",
  blue3:   "#DBEAFE",
  green:   "#15803D",
  green2:  "#22C55E",
  green3:  "#DCFCE7",
  amber:   "#B45309",
  amber2:  "#F59E0B",
  amber3:  "#FEF3C7",
  rose:    "#BE123C",
  rose2:   "#F43F5E",
  rose3:   "#FFE4E6",
  violet:  "#6D28D9",
  violet2: "#8B5CF6",
  violet3: "#EDE9FE",
};

const R = { xs:"6px", sm:"10px", md:"14px", lg:"18px", xl:"24px", xxl:"32px", full:"9999px" };
const SH = {
  xs: "0 1px 2px rgba(0,0,0,.06)",
  sm: "0 2px 8px rgba(0,0,0,.07)",
  md: "0 4px 20px rgba(0,0,0,.09)",
  lg: "0 8px 40px rgba(0,0,0,.12)",
};

/* ═══════════════════════════════════════════════════════════
   SEED DATA
═══════════════════════════════════════════════════════════ */
const BRANCHES = ["Main – Pinamalayan","Sta. Rita","Buli","Inclanay","Luma"];
const FINANCE_TYPES = ["Tithes","Offering","Pledges","Mission","Support","iCare","First Fruit"];
const CATEGORIES = ["Official Member","First Timer","Guest"];
const MEMBER_TYPES = ["Kids","Youth","Young Adult","Men","Women","Senior"];

const SEED_MEMBERS = [
  { id:1,  memberCode:"JIL-000001", name:"Maria Santos",      birthdate:"1990-03-15", age:35, address:"Sto. Tomas, Pinamalayan", category:"Official Member", type:"Women",       lifegroupLeader:"Ptr. Rico Cruz",   branch:"Main – Pinamalayan", points:580, attendance:97 },
  { id:2,  memberCode:"JIL-000002", name:"Juan dela Cruz",    birthdate:"1985-07-22", age:39, address:"Sta. Rita, Pinamalayan",  category:"Official Member", type:"Men",         lifegroupLeader:"Dea. Ana Reyes",   branch:"Sta. Rita",          points:310, attendance:78 },
  { id:3,  memberCode:"JIL-000003", name:"Elena Reyes",       birthdate:"1998-11-05", age:26, address:"Buli, Pinamalayan",       category:"First Timer",     type:"Young Adult", lifegroupLeader:"Min. Beth Torres", branch:"Buli",               points:420, attendance:88 },
  { id:4,  memberCode:"JIL-000004", name:"Pedro Ramos",       birthdate:"1972-01-30", age:53, address:"Inclanay, Pinamalayan",   category:"Official Member", type:"Senior",      lifegroupLeader:"Ptr. Rico Cruz",   branch:"Inclanay",           points:110, attendance:40 },
  { id:5,  memberCode:"JIL-000005", name:"Liza Gomez",        birthdate:"2002-08-14", age:22, address:"Luma, Pinamalayan",       category:"Guest",           type:"Youth",       lifegroupLeader:"Dea. Ana Reyes",   branch:"Luma",               points:490, attendance:92 },
  { id:6,  memberCode:"JIL-000006", name:"Carlo Mendoza",     birthdate:"2012-05-20", age:13, address:"Pinamalayan Proper",      category:"Official Member", type:"Kids",        lifegroupLeader:"Ptr. Rico Cruz",   branch:"Main – Pinamalayan", points:200, attendance:85 },
];

// Generate a stable member QR payload
const memberQRData = (m) => `jil://member?code=${m.memberCode}&name=${encodeURIComponent(m.name)}&branch=${encodeURIComponent(m.branch)}`;

const FINANCE_DATA = [
  { id:1, member:"Maria Santos",   type:"Tithes",     amount:2500, date:"2026-05-25", branch:"Main – Pinamalayan" },
  { id:2, member:"Elena Reyes",    type:"Offering",   amount:500,  date:"2026-05-25", branch:"Buli" },
  { id:3, member:"Liza Gomez",     type:"Pledges",    amount:1000, date:"2026-05-18", branch:"Luma" },
  { id:4, member:"Juan dela Cruz", type:"iCare",      amount:300,  date:"2026-05-18", branch:"Sta. Rita" },
  { id:5, member:"Maria Santos",   type:"First Fruit",amount:3000, date:"2026-05-11", branch:"Main – Pinamalayan" },
  { id:6, member:"Pedro Ramos",    type:"Mission",    amount:500,  date:"2026-05-04", branch:"Inclanay" },
];

const ANNOUNCEMENTS = [
  { id:1, title:"Sunday Worship Service",   date:"June 2, 2026",   body:"Join us every Sunday at 9AM & 5PM. Dress code: Smart casual.", tag:"Worship",  color:C.blue },
  { id:2, title:"Youth Camp Registration",  date:"June 10–12",     body:"Open for ages 13–35. Register now before slots fill up!",     tag:"Events",   color:C.violet },
  { id:3, title:"iCare Home Visit Drive",   date:"Every Saturday", body:"Share God's love. Join our iCare teams this month.",           tag:"Ministry", color:C.green },
];

const EVENTS = [
  { id:1, type:"birthday", name:"Maria Santos",    date:"June 3",  branch:"Main" },
  { id:2, type:"birthday", name:"Juan dela Cruz",  date:"June 7",  branch:"Sta. Rita" },
  { id:3, type:"worship",  name:"Sunday Worship",  date:"June 8",  branch:"All Branches" },
  { id:4, type:"event",    name:"Youth Praise Night", date:"June 14", branch:"Main" },
  { id:5, type:"birthday", name:"Pedro Ramos",     date:"June 22", branch:"Inclanay" },
];

const MONTHLY_THEME = {
  title:"Walking in Faith",
  verse:'"For we walk by faith, not by sight." — 2 Cor 5:7',
  month:"June 2026",
  desc:"This month we anchor ourselves in God's promises and step boldly into His calling.",
};

const WEEKLY_ATT = {
  "Maria Santos":   [1,1,1,0,1,1,1,0,1,1,1,1],
  "Juan dela Cruz": [1,0,1,1,0,1,1,0,0,1,1,0],
  "Elena Reyes":    [1,1,0,1,1,1,1,1,0,1,1,1],
  "Pedro Ramos":    [0,0,1,0,0,1,0,0,1,0,0,0],
  "Liza Gomez":     [1,1,1,0,1,1,0,1,1,1,1,0],
  "Carlo Mendoza":  [1,1,0,1,1,1,0,1,0,1,1,1],
};
const WEEK_LABELS = ["Mar 1","Mar 8","Mar 15","Mar 22","Apr 5","Apr 12","Apr 19","Apr 26","May 3","May 17","May 25","Jun 1"];

/* ═══════════════════════════════════════════════════════════
   MONOTONE VECTOR ICONS — clean 1.5px stroke, no fill
═══════════════════════════════════════════════════════════ */
const SVG = ({ children, size=20, color="currentColor", sw=1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const Ico = {
  home:       (p)=><SVG {...p}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-5H9v5H4a1 1 0 01-1-1z"/></SVG>,
  users:      (p)=><SVG {...p}><circle cx="9" cy="8" r="3.5"/><path d="M2 21v-1.5A5.5 5.5 0 0116 19.5V21"/><path d="M17 5.13a3.5 3.5 0 010 6.74"/><path d="M22 21v-1.5a5.5 5.5 0 00-3.5-5.15"/></SVG>,
  calendar:   (p)=><SVG {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></SVG>,
  finance:    (p)=><SVG {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v1m0 8v1"/><path d="M9.5 10.5A2.5 2.5 0 0112 8h.5a2.5 2.5 0 010 5h-1a2.5 2.5 0 000 5H12a2.5 2.5 0 002.5-2"/></SVG>,
  chart:      (p)=><SVG {...p}><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 4-5"/></SVG>,
  bell:       (p)=><SVG {...p}><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></SVG>,
  qr:         (p)=><SVG {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="5" y="5" width="3" height="3"/><rect x="16" y="5" width="3" height="3"/><rect x="5" y="16" width="3" height="3"/><path d="M14 14h3v3h-3zm3 3h3v3h-3zm-3 3h3"/></SVG>,
  settings:   (p)=><SVG {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></SVG>,
  logout:     (p)=><SVG {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></SVG>,
  plus:       (p)=><SVG {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></SVG>,
  upload:     (p)=><SVG {...p}><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></SVG>,
  check:      (p)=><SVG {...p}><polyline points="20 6 9 17 4 12"/></SVG>,
  edit:       (p)=><SVG {...p}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></SVG>,
  trash:      (p)=><SVG {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></SVG>,
  eye:        (p)=><SVG {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></SVG>,
  send:       (p)=><SVG {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></SVG>,
  map:        (p)=><SVG {...p}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></SVG>,
  report:     (p)=><SVG {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></SVG>,
  prayer:     (p)=><SVG {...p}><path d="M18 2H9L6 8h12zm0 0v5"/><path d="M12 8v13M8 21h8"/><path d="M9 13c0 1.66 1.34 3 3 3s3-1.34 3-3"/></SVG>,
  shield:     (p)=><SVG {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></SVG>,
  menu:       (p)=><SVG {...p}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></SVG>,
  close:      (p)=><SVG {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></SVG>,
  download:   (p)=><SVG {...p}><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29"/></SVG>,
  tree:       (p)=><SVG {...p}><path d="M12 22V12"/><path d="M12 12L8 8M12 12l4-4"/><path d="M12 8L9 5M12 8l3-3"/><circle cx="12" cy="4" r="1.5"/><path d="M7 22h10"/></SVG>,
  star:       (p)=><SVG {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></SVG>,
  attendance: (p)=><SVG {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M9 16l2 2 4-4"/></SVG>,
  cake:       (p)=><SVG {...p}><path d="M20 21v-7a2 2 0 00-2-2H6a2 2 0 00-2 2v7"/><path d="M2 21h20"/><path d="M7 12V9a1 1 0 011-1h8a1 1 0 011 1v3"/><path d="M12 6V3"/><path d="M10 3c0 1.1.9 2 2 2s2-.9 2-2"/></SVG>,
  branch:     (p)=><SVG {...p}><circle cx="12" cy="4" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="12" cy="20" r="2"/><path d="M12 6v4m0 0l-4.5 2M12 10l4.5 2M12 14v4"/></SVG>,
  info:       (p)=><SVG {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></SVG>,
  sparkle:    (p)=><SVG {...p}><path d="M12 2l1.5 5.5H19l-4.5 3 1.5 5.5L12 13l-4 3 1.5-5.5L5 7.5h5.5z"/></SVG>,
  chevronR:   (p)=><SVG {...p}><polyline points="9 18 15 12 9 6"/></SVG>,
  chevronD:   (p)=><SVG {...p}><polyline points="6 9 12 15 18 9"/></SVG>,
  file:       (p)=><SVG {...p}><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></SVG>,
  camera:     (p)=><SVG {...p}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h3l2-3h8l2 3h3a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></SVG>,
  scan:       (p)=><SVG {...p}><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/><line x1="3" y1="12" x2="21" y2="12"/></SVG>,
  idcard:     (p)=><SVG {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M5 17c0-1.5 1.5-2.5 3-2.5s3 1 3 2.5"/><line x1="13" y1="9" x2="19" y2="9"/><line x1="13" y1="13" x2="19" y2="13"/></SVG>,
};

/* ═══════════════════════════════════════════════════════════
   TREE GROWTH RANK VISUAL
═══════════════════════════════════════════════════════════ */
const RANKS = [
  { name:"Seedling",  min:0,   max:199,  desc:"Just beginning your journey",       color:"#78716C" },
  { name:"Sprout",    min:200, max:399,  desc:"Growing in faith daily",            color:"#65A30D" },
  { name:"Sapling",   min:400, max:599,  desc:"Rooted and bearing fruit",          color:"#16A34A" },
  { name:"Tree",      min:600, max:849,  desc:"Standing firm, growing tall",       color:"#0F766E" },
  { name:"Oak",       min:850, max:9999, desc:"A pillar of the community",         color:"#1D4ED8" },
];

const getRank = (pts) => RANKS.find(r=>pts>=r.min&&pts<=r.max)||RANKS[0];

const TreeGrowth = ({ points, size=80 }) => {
  const rank = getRank(points);
  const idx = RANKS.indexOf(rank);
  const pct = (points - rank.min) / (rank.max === 9999 ? 200 : rank.max - rank.min + 1);

  // Layered SVG tree that grows with rank
  const trunks = [
    null,
    <><rect x="20" y="52" width="5" height="16" fill={rank.color} opacity=".7"/></>,
    <><rect x="19" y="46" width="7" height="22" fill={rank.color} opacity=".7"/>
      <polygon points="22,20 10,50 34,50" fill={rank.color} opacity=".85"/></>,
    <><rect x="18" y="44" width="9" height="24" fill={rank.color} opacity=".7"/>
      <polygon points="22,14 6,50 38,50" fill={rank.color} opacity=".85"/>
      <polygon points="22,26 10,48 34,48" fill={rank.color}/></>,
    <><rect x="17" y="42" width="11" height="26" fill={rank.color} opacity=".7"/>
      <polygon points="22,10 4,52 40,52" fill={rank.color} opacity=".8"/>
      <polygon points="22,22 8,50 36,50" fill={rank.color} opacity=".9"/>
      <polygon points="22,34 12,50 32,50" fill={rank.color}/></>,
  ];

  return (
    <div style={{ textAlign:"center" }}>
      <svg width={size} height={size} viewBox="0 0 44 68">
        <rect x="0" y="62" width="44" height="4" rx="2" fill={rank.color} opacity=".2"/>
        {trunks[idx] || trunks[1]}
        {/* Glow dot at top */}
        {idx>0 && <circle cx="22" cy={Math.max(6,22-idx*4)} r="3" fill={rank.color} opacity={0.4+pct*0.6}/>}
      </svg>
      <div style={{ fontSize:11, fontWeight:700, color:rank.color, letterSpacing:.5, textTransform:"uppercase" }}>{rank.name}</div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   REUSABLE COMPONENTS
═══════════════════════════════════════════════════════════ */
const useIsMobile = () => {
  const [mob, setMob] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMob(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mob;
};

const Card = ({ children, style={}, onClick, hoverable }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={()=>hoverable&&setHov(true)}
      onMouseLeave={()=>hoverable&&setHov(false)}
      style={{
        background: C.white,
        borderRadius: R.xl,
        boxShadow: hov ? SH.md : SH.sm,
        border: `1px solid ${C.fog}`,
        padding: "18px 20px",
        transition: "box-shadow .18s, transform .18s",
        transform: hov ? "translateY(-2px)" : "none",
        cursor: onClick ? "pointer" : "default",
        ...style
      }}
    >
      {children}
    </div>
  );
};

const Pill = ({ label, active, onClick, color=C.blue }) => (
  <button
    onClick={onClick}
    style={{
      padding: "6px 16px",
      borderRadius: R.full,
      border: `1.5px solid ${active ? color : C.cloud}`,
      background: active ? color : C.white,
      color: active ? C.white : C.slate,
      fontWeight: 600, fontSize: 13,
      cursor: "pointer",
      transition: "all .15s",
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </button>
);

const Bar = ({ value, max=100, color=C.blue, height=6, bg=C.fog }) => (
  <div style={{ background:bg, borderRadius:R.full, height, overflow:"hidden" }}>
    <div style={{
      width:`${Math.min(100, value/max*100)}%`,
      height:"100%", background:color,
      borderRadius:R.full, transition:"width .7s cubic-bezier(.4,0,.2,1)"
    }}/>
  </div>
);

const Badge = ({ label, color=C.blue, bg }) => (
  <span style={{
    background: bg || `${color}18`,
    color,
    padding: "3px 10px",
    borderRadius: R.full,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: .3,
    whiteSpace: "nowrap",
  }}>{label}</span>
);

const avatarColor = name => {
  const colors = [C.blue, C.violet2, C.rose2, C.green2, C.amber2, "#0EA5E9"];
  let h = 0; for (let c of (name||"?")) h += c.charCodeAt(0);
  return colors[h % colors.length];
};

const Av = ({ name, size=36 }) => (
  <div style={{
    width:size, height:size, borderRadius:"50%",
    background: avatarColor(name),
    display:"flex", alignItems:"center", justifyContent:"center",
    color:"#fff", fontWeight:700,
    fontSize: size*0.37, flexShrink:0,
    fontFamily:"system-ui,sans-serif",
    letterSpacing:-.5,
  }}>
    {(name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
  </div>
);

const StatTile = ({ icon:IcoComp, label, value, accent, color=C.blue, sub }) => (
  <Card style={{ display:"flex", flexDirection:"column", gap:10 }}>
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <div style={{
        width:38, height:38, borderRadius:R.md,
        background:`${color}12`,
        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
      }}>
        <IcoComp size={18} color={color}/>
      </div>
      <span style={{ fontSize:12, color:C.slate, fontWeight:500 }}>{label}</span>
    </div>
    <div style={{ fontSize:28, fontWeight:800, color:C.ink, letterSpacing:-1 }}>{value}</div>
    {sub   && <div style={{ fontSize:12, color:C.mist }}>{sub}</div>}
    {accent && <div style={{ fontSize:12, color, fontWeight:600 }}>{accent}</div>}
  </Card>
);

/* ─── Input ─────────────────────────────── */
const Inp = ({ label, type="text", value, onChange, placeholder, options, required }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:14 }}>
    <label style={{ fontSize:12, fontWeight:600, color:C.slate, letterSpacing:.2 }}>
      {label}{required&&<span style={{color:C.rose2}}> *</span>}
    </label>
    {options ? (
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{ padding:"10px 14px", border:`1.5px solid ${C.fog}`, borderRadius:R.md, fontSize:14, outline:"none", background:C.white, color:C.ink, appearance:"none" }}>
        <option value="">— Select —</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ padding:"10px 14px", border:`1.5px solid ${C.fog}`, borderRadius:R.md, fontSize:14, outline:"none", color:C.ink }}/>
    )}
  </div>
);

/* ─── Button ─────────────────────────────── */
const Btn = ({ label, onClick, color=C.blue, outline, icon:IcoComp, sm, full, danger }) => {
  const bg = danger ? C.rose2 : outline ? "transparent" : color;
  const fg = outline ? (danger ? C.rose2 : color) : C.white;
  const brd = danger ? C.rose2 : color;
  return (
    <button onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:6, justifyContent:"center",
      padding: sm ? "7px 14px" : "10px 20px",
      background: bg, color: fg,
      border: `1.5px solid ${brd}`,
      borderRadius: R.full,
      fontWeight: 600, fontSize: sm ? 12 : 14,
      cursor:"pointer", transition:"all .15s",
      width: full ? "100%" : "auto",
      flexShrink: 0,
    }}>
      {IcoComp && <IcoComp size={sm?13:15} color={fg}/>} {label}
    </button>
  );
};

/* ─── Modal ─────────────────────────────── */
const Modal = ({ open, onClose, title, children, width=520 }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0,
      background:"rgba(10,15,30,.5)", backdropFilter:"blur(6px)",
      zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16,
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:C.white, borderRadius:R.xxl, boxShadow:SH.lg,
        width:"100%", maxWidth:width, maxHeight:"92vh", overflowY:"auto",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"22px 24px 0" }}>
          <h3 style={{ margin:0, fontWeight:800, fontSize:17, color:C.ink }}>{title}</h3>
          <button onClick={onClose} style={{ border:"none", background:C.fog, borderRadius:"50%", width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Ico.close size={16} color={C.slate}/>
          </button>
        </div>
        <div style={{ padding:"16px 24px 28px" }}>{children}</div>
      </div>
    </div>
  );
};

/* ─── QR Display ─────────────────────────── */
const QRDisp = ({ data, size=160 }) => {
  const cells = 17;
  const hash = data.split("").reduce((a,c,i)=>a^(c.charCodeAt(0)*(i+1)),0);
  const pat = Array.from({length:cells*cells},(_,i)=>{
    const r=Math.floor(i/cells), c=i%cells;
    if(r<7&&c<7) return (r===0||r===6||c===0||c===6)?1:(r>1&&r<5&&c>1&&c<5)?1:0;
    if(r<7&&c>cells-8) return (r===0||r===6||c===cells-8||c===cells-1)?1:(r>1&&r<5&&c>cells-6&&c<cells-2)?1:0;
    if(r>cells-8&&c<7) return (r===cells-8||r===cells-1||c===0||c===6)?1:(r>cells-6&&r<cells-2&&c>1&&c<5)?1:0;
    return ((hash*(i+7)*137)%101)<50?1:0;
  });
  const cell = size/cells;
  return (
    <div style={{
      display:"grid", gridTemplateColumns:`repeat(${cells},${cell}px)`,
      width:size, height:size, background:C.white, padding:8,
      borderRadius:R.lg, border:`1px solid ${C.fog}`,
    }}>
      {pat.map((v,i)=><div key={i} style={{width:cell,height:cell,background:v?C.ink:C.white}}/>)}
    </div>
  );
};

/* ─── QR Scanner (webcam-based) ──────────── */
const QRScanner = ({ onResult }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | starting | live | error | denied
  const [lastScan, setLastScan] = useState(null);
  const [scanning, setScanning] = useState(false);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t=>t.stop());
      streamRef.current = null;
    }
    setStatus("idle");
    setScanning(false);
  }, []);

  const start = useCallback(async () => {
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:"environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("live");
      setScanning(true);
    } catch (err) {
      setStatus(err && err.name === "NotAllowedError" ? "denied" : "error");
    }
  }, []);

  // Scan loop using BarcodeDetector if available
  useEffect(() => {
    if (!scanning) return;
    let raf;
    let detector = null;
    if ("BarcodeDetector" in window) {
      try { detector = new window.BarcodeDetector({ formats:["qr_code"] }); } catch { detector = null; }
    }
    const tick = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (detector) {
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes && codes.length > 0) {
            const val = codes[0].rawValue;
            setLastScan(val);
            onResult && onResult(val);
          }
        } catch { /* ignore frame errors */ }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => raf && cancelAnimationFrame(raf);
  }, [scanning, onResult]);

  useEffect(() => () => stop(), [stop]);

  const supported = typeof navigator !== "undefined" && !!navigator.mediaDevices;
  const hasDetector = typeof window !== "undefined" && "BarcodeDetector" in window;

  return (
    <div>
      <div style={{ position:"relative", borderRadius:R.lg, overflow:"hidden", background:C.ink, aspectRatio:"4/3", display:"flex", alignItems:"center", justifyContent:"center" }}>
        {status==="live" ? (
          <video ref={videoRef} muted playsInline style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
        ) : (
          <div style={{ textAlign:"center", padding:24, color:"#64748B" }}>
            <Ico.camera size={36} color="#475569"/>
            <div style={{ marginTop:10, fontSize:13 }}>
              {status==="starting" && "Starting camera…"}
              {status==="idle" && "Camera preview will appear here"}
              {status==="denied" && "Camera permission denied"}
              {status==="error" && "Unable to access camera"}
            </div>
          </div>
        )}
        {status==="live" && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ width:"60%", height:"60%", border:`2px solid ${C.blue2}`, borderRadius:R.lg, boxShadow:"0 0 0 9999px rgba(0,0,0,.25)" }}/>
          </div>
        )}
      </div>

      {!hasDetector && status==="live" && (
        <div style={{ background:C.amber3, color:C.amber, borderRadius:R.md, padding:"10px 14px", fontSize:12, marginTop:12 }}>
          Live camera preview is active, but this browser doesn't support automatic QR detection (BarcodeDetector API). Try Chrome on Android, or use manual code entry below.
        </div>
      )}

      {lastScan && (
        <div style={{ background:C.green3, color:C.green, borderRadius:R.md, padding:"10px 14px", fontSize:12, marginTop:12, wordBreak:"break-all" }}>
          ✅ Scanned: {lastScan}
        </div>
      )}

      <div style={{ display:"flex", gap:8, marginTop:14 }}>
        {status!=="live" ? (
          <Btn label="Start Camera" icon={Ico.camera} onClick={start} full disabled={!supported}/>
        ) : (
          <Btn label="Stop Camera" icon={Ico.close} onClick={stop} outline danger full/>
        )}
      </div>
      {!supported && (
        <div style={{ fontSize:12, color:C.rose2, marginTop:8 }}>Camera access isn't available in this browser/context.</div>
      )}
    </div>
  );
};


const MENUS = {
  regular: [
    {id:"dashboard", label:"Dashboard",   I:Ico.home},
    {id:"attendance",label:"Attendance",  I:Ico.attendance},
    {id:"finance",   label:"My Finance",  I:Ico.finance},
    {id:"reports",   label:"Reports",     I:Ico.report},
    {id:"myqr",      label:"My QR Code",  I:Ico.idcard},
    {id:"prayer",    label:"Prayer",      I:Ico.prayer},
    {id:"events",    label:"Events",      I:Ico.calendar},
  ],
  admin: [
    {id:"dashboard", label:"Dashboard",   I:Ico.home},
    {id:"members",   label:"Members",     I:Ico.users},
    {id:"attendance",label:"Attendance",  I:Ico.attendance},
    {id:"finance",   label:"Finance",     I:Ico.finance},
    {id:"reports",   label:"Reports",     I:Ico.report},
    {id:"qr",        label:"QR Generator",I:Ico.qr},
    {id:"events",    label:"Events",      I:Ico.calendar},
  ],
  superadmin: [
    {id:"dashboard", label:"Dashboard",   I:Ico.home},
    {id:"members",   label:"Members",     I:Ico.users},
    {id:"attendance",label:"Attendance",  I:Ico.attendance},
    {id:"finance",   label:"Finance",     I:Ico.finance},
    {id:"reports",   label:"Reports",     I:Ico.report},
    {id:"qr",        label:"QR Generator",I:Ico.qr},
    {id:"scanner",   label:"QR Scanner",  I:Ico.scan},
    {id:"events",    label:"Events",      I:Ico.calendar},
    {id:"branches",  label:"Branches",    I:Ico.branch},
    {id:"settings",  label:"Settings",    I:Ico.settings},
  ],
};

const ROLE_TAG = {
  regular:    {tag:"Member",   color:C.blue},
  admin:      {tag:"Admin",    color:C.violet2},
  superadmin: {tag:"Dev",      color:C.rose2},
};

const Sidebar = ({ role, page, setPage, user, onLogout, collapsed, setCollapsed, mobile, showMob, setShowMob }) => {
  const menu = MENUS[role]||MENUS.regular;
  const rt = ROLE_TAG[role];

  const inner = (
    <div style={{ width: mobile ? 260 : collapsed ? 64 : 224, background:C.ink, display:"flex", flexDirection:"column", height:"100%", transition:"width .22s", overflow:"hidden" }}>
      {/* Logo */}
      <div style={{ padding: collapsed&&!mobile ? "16px 0" : "20px 16px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid rgba(255,255,255,.06)", justifyContent: collapsed&&!mobile?"center":"flex-start" }}>
        <div style={{ width:36, height:36, borderRadius:R.md, background:"linear-gradient(135deg,#1D4ED8,#7C3AED)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Ico.sparkle size={18} color="#fff"/>
        </div>
        {(!collapsed||mobile) && (
          <div>
            <div style={{ color:"#fff", fontWeight:800, fontSize:14, letterSpacing:-.3 }}>JIL Pinamalayan</div>
            <div style={{ color:"#475569", fontSize:10, fontWeight:500 }}>Church CMS</div>
          </div>
        )}
      </div>
      {/* User */}
      {(!collapsed||mobile) && (
        <div style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid rgba(255,255,255,.06)" }}>
          <Av name={user.name} size={34}/>
          <div>
            <div style={{ color:"#E2E8F0", fontWeight:600, fontSize:13 }}>{user.name}</div>
            <Badge label={rt.tag} color={rt.color}/>
          </div>
        </div>
      )}
      {/* Nav */}
      <nav style={{ flex:1, overflowY:"auto", padding:"8px 0" }}>
        {menu.map(m=>{
          const active = page===m.id;
          return (
            <button key={m.id} onClick={()=>{ setPage(m.id); if(mobile)setShowMob(false); }}
              style={{
                display:"flex", alignItems:"center", gap:10,
                padding: collapsed&&!mobile ? "12px 0" : "10px 16px",
                width:"100%", background: active?"rgba(29,78,216,.2)":"transparent",
                border:"none", cursor:"pointer",
                justifyContent: collapsed&&!mobile ? "center" : "flex-start",
                position:"relative", transition:"background .15s",
              }}>
              {active && <div style={{ position:"absolute", left:0, top:"15%", bottom:"15%", width:3, background:C.blue2, borderRadius:"0 3px 3px 0" }}/>}
              <m.I size={17} color={active?"#93C5FD":"#64748B"}/>
              {(!collapsed||mobile) && <span style={{ color:active?"#E2E8F0":"#64748B", fontWeight:active?600:400, fontSize:13 }}>{m.label}</span>}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: collapsed&&!mobile ? "12px 0" : "12px 16px", borderTop:"1px solid rgba(255,255,255,.06)" }}>
        {!collapsed&&!mobile && <div style={{ fontSize:10, color:"#334155", fontWeight:600, textTransform:"uppercase", letterSpacing:.5, marginBottom:8 }}>v2.0 · {BRANCHES.length} Branches</div>}
        <button onClick={onLogout} style={{ display:"flex", alignItems:"center", gap:8, background:"transparent", border:"none", cursor:"pointer", padding:"6px 0", width:"100%", justifyContent: collapsed&&!mobile?"center":"flex-start" }}>
          <Ico.logout size={16} color="#475569"/>
          {(!collapsed||mobile) && <span style={{ color:"#475569", fontSize:12 }}>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  if (mobile) {
    return (
      <>
        {showMob && (
          <div onClick={()=>setShowMob(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:200 }}>
            <div onClick={e=>e.stopPropagation()} style={{ width:260, height:"100%", position:"relative" }}>
              {inner}
            </div>
          </div>
        )}
      </>
    );
  }

  return <div style={{ flexShrink:0, height:"100vh" }}>{inner}</div>;
};

/* ═══════════════════════════════════════════════════════════
   TOPBAR
═══════════════════════════════════════════════════════════ */
const Topbar = ({ role, page, user, collapsed, setCollapsed, mobile, setShowMob }) => {
  const menu = MENUS[role]||[];
  const label = menu.find(m=>m.id===page)?.label||"Dashboard";
  return (
    <div style={{ background:C.white, borderBottom:`1px solid ${C.fog}`, padding:"0 20px", height:54, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, gap:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={()=>mobile?setShowMob(v=>!v):setCollapsed(v=>!v)}
          style={{ border:"none", background:"transparent", cursor:"pointer", padding:6, borderRadius:R.sm, display:"flex" }}>
          <Ico.menu size={18} color={C.slate}/>
        </button>
        <span style={{ fontSize:15, fontWeight:700, color:C.ink }}>{label}</span>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        {(role==="admin"||role==="superadmin") && (
          <button style={{ display:"flex",alignItems:"center",gap:5, padding:"5px 12px", borderRadius:R.full, background:C.violet3, border:"none", cursor:"pointer", color:C.violet, fontWeight:600, fontSize:12 }}>
            <Ico.eye size={13} color={C.violet}/> Impersonate
          </button>
        )}
        <button style={{ border:"none", background:"transparent", cursor:"pointer", display:"flex" }}>
          <Ico.bell size={18} color={C.slate}/>
        </button>
        <Av name={user.name} size={32}/>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   GAMIFICATION STRIP (regular users)
═══════════════════════════════════════════════════════════ */
const GamStrip = ({ user }) => {
  const m = SEED_MEMBERS.find(x=>x.name===user.name)||SEED_MEMBERS[0];
  const rank = getRank(m.points);
  const nextRank = RANKS[RANKS.indexOf(rank)+1];
  const pct = nextRank
    ? ((m.points-rank.min)/(nextRank.min-rank.min))*100
    : 100;

  return (
    <div style={{ background:C.ink2, padding:"10px 20px", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
      <TreeGrowth points={m.points} size={44}/>
      <div style={{ flex:1, minWidth:120 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <span style={{ color:"#CBD5E1", fontSize:12, fontWeight:600 }}>{rank.name} · {m.points} pts</span>
          {nextRank && <span style={{ color:"#475569", fontSize:11 }}>→ {nextRank.name} at {nextRank.min}</span>}
        </div>
        <Bar value={m.points-rank.min} max={nextRank?nextRank.min-rank.min:200} color={rank.color} height={5} bg="rgba(255,255,255,.08)"/>
      </div>
      <div style={{ display:"flex", gap:20 }}>
        <div style={{ textAlign:"center" }}><div style={{ color:"#fff", fontWeight:700, fontSize:15 }}>{m.attendance}%</div><div style={{ color:"#475569", fontSize:10 }}>Attend.</div></div>
        <div style={{ textAlign:"center" }}><div style={{ color:C.amber2, fontWeight:700, fontSize:15 }}>{m.points}</div><div style={{ color:"#475569", fontSize:10 }}>Points</div></div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   PAGES
═══════════════════════════════════════════════════════════ */

/* ── DASHBOARD ──────────────────────────── */
const Dashboard = ({ role, user }) => {
  const isAdmin = role!=="regular";
  const total = FINANCE_DATA.reduce((a,f)=>a+f.amount,0);
  const mob = useIsMobile();

  return (
    <div>
      {/* Theme Banner */}
      <div style={{ borderRadius:R.xxl, background:`linear-gradient(130deg,${C.ink} 0%,#1e3a72 60%,#3730a3 100%)`, padding: mob?"22px 20px":"28px 32px", marginBottom:20, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", right:-40, top:-40, width:200, height:200, borderRadius:"50%", background:"rgba(255,255,255,.04)" }}/>
        <div style={{ position:"absolute", right:60, bottom:-60, width:260, height:260, borderRadius:"50%", background:"rgba(255,255,255,.03)" }}/>
        <div style={{ position:"relative" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
            <Ico.sparkle size={12} color="rgba(255,255,255,.5)"/>
            <span style={{ color:"rgba(255,255,255,.5)", fontSize:11, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase" }}>{MONTHLY_THEME.month} · Monthly Theme</span>
          </div>
          <h2 style={{ color:"#fff", fontSize: mob?20:26, fontWeight:800, margin:"0 0 8px", letterSpacing:-.5 }}>{MONTHLY_THEME.title}</h2>
          <p style={{ color:"rgba(255,255,255,.7)", fontSize:13, margin:"0 0 8px", fontStyle:"italic" }}>{MONTHLY_THEME.verse}</p>
          <p style={{ color:"rgba(255,255,255,.5)", fontSize:12, margin:0, maxWidth:480 }}>{MONTHLY_THEME.desc}</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:`repeat(auto-fit,minmax(${mob?140:160}px,1fr))`, gap:12, marginBottom:20 }}>
        <StatTile icon={Ico.users}     label="Members"       value={SEED_MEMBERS.length} sub={`Active: ${SEED_MEMBERS.filter(m=>m.category==="Official Member").length}`} color={C.blue}   accent="+2 this month"/>
        <StatTile icon={Ico.attendance}label="Avg Attendance" value="84%"                 sub="Last Sunday: 127"                                                           color={C.violet2} accent="↑ 5% vs last month"/>
        {isAdmin && <StatTile icon={Ico.finance} label="Total Offerings" value={`₱${total.toLocaleString()}`} sub="This month" color={C.green}/>}
        {isAdmin && <StatTile icon={Ico.branch}  label="Branches"        value={BRANCHES.length}              sub="All active" color={C.amber}/>}
      </div>

      <div style={{ display:"grid", gridTemplateColumns: mob?"1fr":"1fr 300px", gap:16 }}>
        {/* Announcements */}
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <h3 style={{ margin:0, fontWeight:700, fontSize:15, color:C.ink }}>Announcements</h3>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {ANNOUNCEMENTS.map(a=>(
              <Card key={a.id} style={{ borderLeft:`3px solid ${a.color}`, padding:"14px 16px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5, gap:8 }}>
                  <strong style={{ fontSize:14, color:C.ink }}>{a.title}</strong>
                  <Badge label={a.tag} color={a.color}/>
                </div>
                <p style={{ margin:"0 0 5px", fontSize:13, color:C.slate, lineHeight:1.5 }}>{a.body}</p>
                <span style={{ fontSize:11, color:C.mist }}>{a.date}</span>
              </Card>
            ))}
          </div>
        </div>

        {/* Events */}
        {!mob && (
          <div>
            <h3 style={{ margin:"0 0 12px", fontWeight:700, fontSize:15, color:C.ink }}>Upcoming</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {EVENTS.map(e=>{
                const cfg = e.type==="birthday"?{color:C.rose2,I:Ico.cake}:e.type==="worship"?{color:C.blue,I:Ico.sparkle}:{color:C.violet2,I:Ico.calendar};
                return (
                  <Card key={e.id} style={{ padding:"12px 14px", display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:34,height:34,borderRadius:R.md,background:`${cfg.color}12`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      <cfg.I size={15} color={cfg.color}/>
                    </div>
                    <div>
                      <div style={{ fontWeight:600, fontSize:13, color:C.ink }}>{e.name}</div>
                      <div style={{ fontSize:11, color:C.mist }}>{e.date} · {e.branch}</div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── ATTENDANCE ──────────────────────────── */
const AttendancePage = ({ role, user }) => {
  const isAdmin = role!=="regular";
  const mob = useIsMobile();
  const [liveModal, setLiveModal] = useState(false);
  const [liveForm, setLiveForm] = useState({ event:"Sunday Worship", date:"2026-06-08", timeStart:"09:00", timeEnd:"12:00", branch:"Main – Pinamalayan" });
  const [activeLive, setActiveLive] = useState(null);

  const myRec = WEEKLY_ATT[user.name]||[1,1,0,1,1,1,1,0,1,1,1,0];
  const myPct = Math.round(myRec.filter(Boolean).length/myRec.length*100);

  const allEntries = isAdmin ? Object.entries(WEEKLY_ATT) : [[user.name, myRec]];
  const recent = WEEK_LABELS.slice(-6);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, flexWrap:"wrap", gap:10 }}>
        <h2 style={{ margin:0, fontWeight:800, fontSize:20, color:C.ink }}>Attendance</h2>
        {isAdmin && (
          <Btn label="Go Live" icon={Ico.qr} onClick={()=>setLiveModal(true)} sm/>
        )}
      </div>

      {/* My Stats (regular only) */}
      {!isAdmin && (
        <div style={{ display:"grid", gridTemplateColumns: mob?"1fr":"1fr 1fr", gap:14, marginBottom:20 }}>
          <Card style={{ background:`linear-gradient(135deg,${C.blue},#2563EB)`, border:"none" }}>
            <div style={{ color:"rgba(255,255,255,.6)", fontSize:12 }}>My Attendance Rate</div>
            <div style={{ color:"#fff", fontSize:36, fontWeight:800, margin:"4px 0" }}>{myPct}%</div>
            <Bar value={myPct} color="rgba(255,255,255,.4)" bg="rgba(255,255,255,.15)" height={5}/>
            <div style={{ color:"rgba(255,255,255,.6)", fontSize:12, marginTop:8 }}>{myRec.filter(Boolean).length} of {myRec.length} Sundays attended</div>
          </Card>
          <Card>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <TreeGrowth points={SEED_MEMBERS.find(x=>x.name===user.name)?.points||0} size={64}/>
              <div>
                <div style={{ color:C.slate, fontSize:12, marginBottom:4 }}>Attendance Streak</div>
                <div style={{ fontSize:28, fontWeight:800, color:C.ink }}>{myRec.filter(Boolean).length} wks</div>
                <div style={{ fontSize:12, color:myPct>=90?C.green:C.slate }}>{myPct>=90?"🏆 Gold Tier":myPct>=75?"🥈 Silver Tier":"Keep it up!"}</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Admin classification */}
      {isAdmin && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:20 }}>
          {[{l:"Official Members",v:89,c:C.blue},{l:"First Timers",v:12,c:C.green},{l:"Guests",v:26,c:C.amber}].map(x=>(
            <Card key={x.l}>
              <div style={{ fontSize:12, color:C.slate, marginBottom:6 }}>{x.l}</div>
              <div style={{ fontSize:26, fontWeight:800, color:x.c, marginBottom:6 }}>{x.v}</div>
              <Bar value={x.v} max={130} color={x.c}/>
            </Card>
          ))}
        </div>
      )}

      {/* Weekly Table */}
      <Card style={{ padding:0, overflow:"hidden" }}>
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.fog}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h3 style={{ margin:0, fontWeight:700, fontSize:14, color:C.ink }}>Weekly Log (Recent 6 Sundays)</h3>
          {isAdmin && <Badge label={`${allEntries.length} members`} color={C.blue}/>}
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:C.fog }}>
                <th style={{ textAlign:"left", padding:"10px 16px", color:C.slate, fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:.5 }}>Member</th>
                {recent.map(w=><th key={w} style={{ padding:"10px 10px", color:C.slate, fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:.3, textAlign:"center" }}>{w}</th>)}
                <th style={{ padding:"10px 14px", color:C.slate, fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:.5 }}>Rate</th>
              </tr>
            </thead>
            <tbody>
              {allEntries.map(([name,rec])=>{
                const recent6 = rec.slice(-6);
                const pct = Math.round(recent6.filter(Boolean).length/recent6.length*100);
                return (
                  <tr key={name} style={{ borderTop:`1px solid ${C.fog}` }}>
                    <td style={{ padding:"10px 16px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <Av name={name} size={26}/>
                        <span style={{ fontWeight:500, color:C.ink, whiteSpace:"nowrap" }}>{name}</span>
                      </div>
                    </td>
                    {recent6.map((v,i)=>(
                      <td key={i} style={{ textAlign:"center", padding:"10px 10px" }}>
                        <div style={{ width:22,height:22,borderRadius:"50%",background:v?`${C.green}18`:`${C.rose2}10`,display:"inline-flex",alignItems:"center",justifyContent:"center" }}>
                          <Ico.check size={12} color={v?C.green:C.cloud} sw={2.5}/>
                        </div>
                      </td>
                    ))}
                    <td style={{ padding:"10px 14px" }}>
                      <Badge label={`${pct}%`} color={pct>=90?C.green:pct>=75?C.blue:C.slate}/>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Live Attendance Modal */}
      <Modal open={liveModal} onClose={()=>setLiveModal(false)} title="Generate Live Attendance">
        <Inp label="Event Name" value={liveForm.event} onChange={v=>setLiveForm({...liveForm,event:v})} placeholder="Sunday Worship" required/>
        <Inp label="Date" type="date" value={liveForm.date} onChange={v=>setLiveForm({...liveForm,date:v})} required/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Inp label="Start Time" type="time" value={liveForm.timeStart} onChange={v=>setLiveForm({...liveForm,timeStart:v})}/>
          <Inp label="End Time" type="time" value={liveForm.timeEnd} onChange={v=>setLiveForm({...liveForm,timeEnd:v})}/>
        </div>
        <Inp label="Branch" value={liveForm.branch} onChange={v=>setLiveForm({...liveForm,branch:v})} options={BRANCHES}/>
        {activeLive ? (
          <div style={{ textAlign:"center", marginTop:8 }}>
            <div style={{ fontSize:12, color:C.slate, marginBottom:12 }}>Scan to mark attendance · Expires {liveForm.timeEnd}</div>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}>
              <QRDisp data={`jil://attend?e=${liveForm.event}&d=${liveForm.date}&b=${liveForm.branch}`} size={160}/>
            </div>
            <div style={{ background:C.amber3, borderRadius:R.md, padding:"10px 14px", fontSize:12, color:C.amber, marginBottom:14 }}>
              ⏰ Live until {liveForm.date} {liveForm.timeEnd}
            </div>
            <Btn label="Close Live Session" onClick={()=>{ setActiveLive(null); setLiveModal(false); }} outline danger sm/>
          </div>
        ) : (
          <Btn label="Start Live Attendance" icon={Ico.qr} onClick={()=>setActiveLive(true)} full/>
        )}
      </Modal>
    </div>
  );
};

/* ── FINANCE ──────────────────────────── */
const FinancePage = ({ role, user }) => {
  const isAdmin = role!=="regular";
  const [tab, setTab] = useState("overview");
  const [form, setForm] = useState({ type:"Tithes", amount:"", note:"" });
  const [done, setDone] = useState(false);
  const mob = useIsMobile();

  const myData = FINANCE_DATA.filter(f=>f.member===user.name);
  const myTotal = myData.reduce((a,f)=>a+f.amount,0);
  const pts = Math.floor(myTotal/100)*5;
  const totals = FINANCE_TYPES.map(t=>({ type:t, total:FINANCE_DATA.filter(f=>f.type===t).reduce((a,f)=>a+f.amount,0) }));
  const grandTotal = FINANCE_DATA.reduce((a,f)=>a+f.amount,0);

  return (
    <div>
      <h2 style={{ margin:"0 0 16px", fontWeight:800, fontSize:20, color:C.ink }}>Finance</h2>
      <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
        {["overview","give",...(isAdmin?["records"]:[])]
          .map(t=><Pill key={t} label={t==="give"?"Submit Giving":t.charAt(0).toUpperCase()+t.slice(1)} active={tab===t} onClick={()=>setTab(t)}/>)}
      </div>

      {tab==="overview" && (
        <>
          {!isAdmin && (
            <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:14, marginBottom:18 }}>
              <Card style={{ background:`linear-gradient(135deg,#15803D,#16A34A)`, border:"none" }}>
                <div style={{ color:"rgba(255,255,255,.6)", fontSize:12 }}>My Total Giving</div>
                <div style={{ color:"#fff", fontSize:30, fontWeight:800, margin:"4px 0" }}>₱{myTotal.toLocaleString()}</div>
                <div style={{ color:"rgba(255,255,255,.6)", fontSize:12 }}>{myData.length} transactions this month</div>
              </Card>
              <Card>
                <div style={{ color:C.slate, fontSize:12, marginBottom:6 }}>Faithfulness Points</div>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <TreeGrowth points={pts+200} size={52}/>
                  <div>
                    <div style={{ fontSize:26, fontWeight:800, color:C.amber2 }}>{pts} pts</div>
                    <div style={{ fontSize:12, color:C.green }}>Every ₱100 = 5 points</div>
                  </div>
                </div>
              </Card>
            </div>
          )}
          {isAdmin && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:18 }}>
              <StatTile icon={Ico.finance} label="Total Collected" value={`₱${grandTotal.toLocaleString()}`} color={C.green}/>
              <StatTile icon={Ico.users}   label="Contributors"    value={new Set(FINANCE_DATA.map(f=>f.member)).size} color={C.blue}/>
              <StatTile icon={Ico.report}  label="Transactions"    value={FINANCE_DATA.length} color={C.violet2}/>
            </div>
          )}
          <Card>
            <h3 style={{ margin:"0 0 14px", fontWeight:700, fontSize:14, color:C.ink }}>Giving Breakdown</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {totals.map((t,i)=>{
                const colors=[C.blue,C.violet2,C.green,C.amber,C.rose2,"#0891B2","#D97706"];
                const c = colors[i%colors.length];
                return (
                  <div key={t.type}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:13, fontWeight:500, color:C.ink }}>{t.type}</span>
                      <span style={{ fontWeight:700, color:c, fontSize:13 }}>₱{t.total.toLocaleString()}</span>
                    </div>
                    <Bar value={t.total} max={Math.max(...totals.map(x=>x.total))} color={c}/>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {tab==="give" && (
        <Card style={{ maxWidth:460 }}>
          <h3 style={{ margin:"0 0 16px", fontWeight:700, fontSize:14, color:C.ink }}>Submit Giving</h3>
          {done ? (
            <div style={{ textAlign:"center", padding:"28px 0" }}>
              <div style={{ width:54,height:54,borderRadius:"50%",background:C.green3,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px" }}>
                <Ico.check size={26} color={C.green} sw={2.5}/>
              </div>
              <div style={{ fontWeight:700, fontSize:17, marginBottom:6, color:C.ink }}>Thank you!</div>
              <div style={{ color:C.slate, fontSize:13 }}>Your giving has been recorded.</div>
              <div style={{ marginTop:16 }}><Btn label="Submit Another" onClick={()=>setDone(false)} sm outline/></div>
            </div>
          ) : (
            <>
              <Inp label="Type" value={form.type} onChange={v=>setForm({...form,type:v})} options={FINANCE_TYPES}/>
              <Inp label="Amount (₱)" type="number" value={form.amount} onChange={v=>setForm({...form,amount:v})} placeholder="0.00"/>
              <Inp label="Note (optional)" value={form.note} onChange={v=>setForm({...form,note:v})} placeholder="e.g. Sunday June 8"/>
              <Btn label="Submit Giving" icon={Ico.send} onClick={()=>setDone(true)} full/>
            </>
          )}
        </Card>
      )}

      {tab==="records" && isAdmin && (
        <Card style={{ padding:0, overflow:"hidden" }}>
          <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.fog}` }}>
            <h3 style={{ margin:0, fontWeight:700, fontSize:14, color:C.ink }}>All Finance Records</h3>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:C.fog }}>
                  {["Member","Type","Amount","Date","Branch"].map(h=>(
                    <th key={h} style={{ textAlign:"left", padding:"10px 16px", color:C.slate, fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:.4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FINANCE_DATA.map(f=>(
                  <tr key={f.id} style={{ borderTop:`1px solid ${C.fog}` }}>
                    <td style={{ padding:"11px 16px" }}><div style={{ display:"flex",alignItems:"center",gap:8 }}><Av name={f.member} size={26}/><span style={{fontWeight:500,color:C.ink}}>{f.member}</span></div></td>
                    <td style={{ padding:"11px 16px" }}><Badge label={f.type} color={C.blue}/></td>
                    <td style={{ padding:"11px 16px", fontWeight:700, color:C.green }}>₱{f.amount.toLocaleString()}</td>
                    <td style={{ padding:"11px 16px", color:C.mist }}>{f.date}</td>
                    <td style={{ padding:"11px 16px", color:C.mist, fontSize:12 }}>{f.branch}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

/* ── REPORTS ──────────────────────────── */
const ReportsPage = ({ role }) => {
  const [period, setPeriod] = useState("Monthly");
  const [month, setMonth] = useState("June 2026");
  const mob = useIsMobile();
  const MONTHS = ["January 2026","February 2026","March 2026","April 2026","May 2026","June 2026"];
  const grandTotal = FINANCE_DATA.reduce((a,f)=>a+f.amount,0);
  const totals = FINANCE_TYPES.map(t=>({ type:t, total:FINANCE_DATA.filter(f=>f.type===t).reduce((a,f)=>a+f.amount,0) }));

  const branchAtt = BRANCHES.map((b,i)=>({ b, v:[127,34,28,19,22][i] }));
  const branchColors = [C.blue,C.violet2,C.green,C.amber,C.rose2];

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <h2 style={{ margin:0, fontWeight:800, fontSize:20, color:C.ink }}>Reports</h2>
        <div style={{ display:"flex", gap:8 }}>
          <Btn label="PDF" icon={Ico.download} outline sm onClick={()=>alert("Exporting PDF…")}/>
          <Btn label="Excel" icon={Ico.file} outline sm onClick={()=>alert("Exporting Excel…")}/>
        </div>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        {["Weekly","Monthly","Quarterly","Annually"].map(p=>(
          <Pill key={p} label={p} active={period===p} onClick={()=>setPeriod(p)}/>
        ))}
        {period==="Monthly" && (
          <select value={month} onChange={e=>setMonth(e.target.value)}
            style={{ padding:"6px 14px", borderRadius:R.full, border:`1.5px solid ${C.cloud}`, fontSize:12, outline:"none", background:C.white, color:C.ink }}>
            {MONTHS.map(m=><option key={m}>{m}</option>)}
          </select>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:`repeat(auto-fit,minmax(${mob?140:160}px,1fr))`, gap:12, marginBottom:18 }}>
        <StatTile icon={Ico.users}      label="Members"       value={SEED_MEMBERS.length}          color={C.blue}   sub="All branches"/>
        <StatTile icon={Ico.attendance} label="Avg Attendance" value="84%"                          color={C.violet2} sub="All Sundays"/>
        <StatTile icon={Ico.finance}    label="Total Offerings" value={`₱${grandTotal.toLocaleString()}`} color={C.green}  sub={period}/>
        <StatTile icon={Ico.branch}     label="Branches"       value={BRANCHES.length}               color={C.amber}  sub="Active"/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns: mob?"1fr":"1fr 1fr", gap:16, marginBottom:16 }}>
        <Card>
          <h3 style={{ margin:"0 0 14px", fontWeight:700, fontSize:14, color:C.ink }}>Finance by Type</h3>
          {totals.map((t,i)=>{
            const colors=[C.blue,C.violet2,C.green,C.amber,C.rose2,"#0891B2","#D97706"];
            const c=colors[i%colors.length];
            return (
              <div key={t.type} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:13, color:C.ink }}>{t.type}</span>
                  <span style={{ fontWeight:700, fontSize:13, color:c }}>₱{t.total.toLocaleString()}</span>
                </div>
                <Bar value={t.total} max={Math.max(...totals.map(x=>x.total))||1} color={c}/>
              </div>
            );
          })}
        </Card>

        <Card>
          <h3 style={{ margin:"0 0 14px", fontWeight:700, fontSize:14, color:C.ink }}>Attendance by Branch</h3>
          {branchAtt.map((x,i)=>(
            <div key={x.b} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={{ fontSize:13, color:C.ink }}>{x.b.replace("Main – ","")}</span>
                <span style={{ fontWeight:700, fontSize:13, color:branchColors[i] }}>{x.v}</span>
              </div>
              <Bar value={x.v} max={130} color={branchColors[i]}/>
            </div>
          ))}
        </Card>
      </div>

      {/* Member Rank Board */}
      <Card>
        <h3 style={{ margin:"0 0 14px", fontWeight:700, fontSize:14, color:C.ink }}>Member Faithfulness Board</h3>
        <div style={{ display:"grid", gridTemplateColumns:`repeat(auto-fill,minmax(${mob?140:180}px,1fr))`, gap:12 }}>
          {[...SEED_MEMBERS].sort((a,b)=>b.points-a.points).map((m,i)=>{
            const rank=getRank(m.points);
            return (
              <div key={m.id} style={{ background:C.fog, borderRadius:R.lg, padding:"14px 12px", textAlign:"center" }}>
                <div style={{ fontSize:11, color:C.mist, marginBottom:4 }}>#{i+1}</div>
                <Av name={m.name} size={36}/>
                <div style={{ marginTop:8 }}>
                  <TreeGrowth points={m.points} size={48}/>
                </div>
                <div style={{ fontWeight:600, fontSize:13, color:C.ink, marginTop:4 }}>{m.name.split(" ")[0]}</div>
                <div style={{ fontSize:11, color:rank.color, fontWeight:700 }}>{m.points} pts</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

/* ── MEMBERS ──────────────────────────── */
const QRPage = ({ role }) => {
  const [form, setForm] = useState({ event:"Sunday Worship Service", date:"2026-06-08", time:"09:00", expiry:"2026-06-08T12:00", branch:"Main – Pinamalayan" });
  const [gen, setGen] = useState(null);
  const mob = useIsMobile();

  return (
    <div>
      <h2 style={{ margin:"0 0 18px", fontWeight:800, fontSize:20, color:C.ink }}>QR Code Generator</h2>
      <div style={{ display:"grid", gridTemplateColumns: mob?"1fr":"1fr 1fr", gap:20 }}>
        <Card>
          <h3 style={{ margin:"0 0 16px", fontWeight:700, fontSize:14, color:C.ink }}>Configure QR</h3>
          <Inp label="Event Name" value={form.event} onChange={v=>setForm({...form,event:v})} placeholder="Sunday Worship" required/>
          <Inp label="Date" type="date" value={form.date} onChange={v=>setForm({...form,date:v})} required/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Inp label="Service Time" type="time" value={form.time} onChange={v=>setForm({...form,time:v})}/>
            <Inp label="Expiry" type="datetime-local" value={form.expiry} onChange={v=>setForm({...form,expiry:v})}/>
          </div>
          <Inp label="Branch" value={form.branch} onChange={v=>setForm({...form,branch:v})} options={BRANCHES}/>
          <Btn label="Generate QR Code" icon={Ico.qr} onClick={()=>setGen({ ...form, id:`QR-${Date.now()}`, data:`jil://attend?e=${encodeURIComponent(form.event)}&d=${form.date}&b=${encodeURIComponent(form.branch)}&exp=${form.expiry}` })} full/>
        </Card>

        {gen ? (
          <Card style={{ textAlign:"center" }}>
            <h3 style={{ margin:"0 0 4px", fontWeight:700, fontSize:15, color:C.ink }}>{gen.event}</h3>
            <p style={{ color:C.mist, fontSize:12, margin:"0 0 18px" }}>{gen.date} · {gen.time} · {gen.branch}</p>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}>
              <QRDisp data={gen.data} size={172}/>
            </div>
            <div style={{ background:C.amber3, borderRadius:R.md, padding:"10px 14px", fontSize:12, color:C.amber, marginBottom:12 }}>
              ⏰ Expires: {gen.expiry.replace("T"," ")}
            </div>
            <div style={{ fontSize:10, color:C.mist, marginBottom:16, wordBreak:"break-all" }}>{gen.id}</div>
            <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
              <Btn label="Download" icon={Ico.download} outline sm onClick={()=>alert("Downloading QR PNG")}/>
              <Btn label="New QR" sm onClick={()=>setGen(null)} outline/>
            </div>
          </Card>
        ) : (
          <Card style={{ display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:14, minHeight:300 }}>
            <div style={{ width:72,height:72,borderRadius:R.xl,background:C.fog,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <Ico.qr size={34} color={C.cloud}/>
            </div>
            <div style={{ color:C.mist, fontSize:14, textAlign:"center" }}>Configure and generate a QR code<br/>for live attendance tracking</div>
          </Card>
        )}
      </div>
    </div>
  );
};

/* ── PRAYER ──────────────────────────── */
const PrayerPage = () => {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <div>
      <h2 style={{ margin:"0 0 18px", fontWeight:800, fontSize:20, color:C.ink }}>Prayer Requests</h2>
      <Card style={{ maxWidth:520 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
          <div style={{ width:42,height:42,borderRadius:R.md,background:C.violet3,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <Ico.prayer size={20} color={C.violet2}/>
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:C.ink }}>Submit a Prayer Request</div>
            <div style={{ fontSize:12, color:C.mist }}>Our pastors and prayer team will intercede for you.</div>
          </div>
        </div>
        {sent ? (
          <div style={{ textAlign:"center", padding:"28px 0" }}>
            <div style={{ fontSize:40, marginBottom:10 }}>🙏</div>
            <div style={{ fontWeight:700, fontSize:17, marginBottom:6, color:C.ink }}>Prayer Submitted</div>
            <div style={{ color:C.slate, fontSize:13 }}>We are standing in prayer with you.</div>
            <div style={{ marginTop:16 }}><Btn label="Submit Another" sm outline onClick={()=>{ setSent(false); setText(""); }}/></div>
          </div>
        ) : (
          <>
            <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Share your prayer request here…" rows={5}
              style={{ width:"100%", padding:"11px 13px", borderRadius:R.md, border:`1.5px solid ${C.fog}`, fontSize:13, resize:"vertical", outline:"none", boxSizing:"border-box", marginBottom:14, color:C.ink, lineHeight:1.6 }}/>
            <Btn label="Send Prayer Request" icon={Ico.send} onClick={()=>setSent(true)} full/>
          </>
        )}
      </Card>
    </div>
  );
};

/* ── MY QR (regular member) ──────────────────────────── */
const MyQRPage = ({ user }) => {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);

  // Fetch the logged-in user's member record from Supabase
  useEffect(() => {
  const fetchMember = async () => {
    if (!user.memberId) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("members")
      .select("*")
      .eq("id", user.memberId)
      .maybeSingle();

    if (data) setMember(data);
    setLoading(false);
  };
  fetchMember();
}, [user.memberId]);
  // Generate QR once member data is loaded
  useEffect(() => {
    if (!member || !canvasRef.current) return;
    const qrValue = `jil://member?code=${member.member_code}&name=${encodeURIComponent(member.name)}&branch=${encodeURIComponent(member.branch || "")}`;
    QRCode.toCanvas(canvasRef.current, qrValue, {
      width: 200,
      margin: 2,
      color: { dark: "#0A0F1E", light: "#FFFFFF" },
      errorCorrectionLevel: "H",
    }).catch(err => console.error("QR error:", err));
  }, [member]);

  const download = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.href = canvasRef.current.toDataURL("image/png");
    link.download = `${member.name.replace(/\s+/g, "-")}-QR.png`;
    link.click();
  };

  const rank = getRank(member?.points || 0);

  if (loading) return (
    <div style={{ textAlign: "center", padding: "60px 0", color: C.mist }}>
      Loading your QR…
    </div>
  );

  if (!member) return (
    <div style={{ textAlign: "center", padding: "60px 0", color: C.mist }}>
      <div style={{ fontSize: 14 }}>No member record found for <strong>{user.name}</strong>.</div>
      <div style={{ fontSize: 12, marginTop: 8 }}>Ask your admin to add you to the members list.</div>
    </div>
  );

  return (
    <div>
      <h2 style={{ margin: "0 0 18px", fontWeight: 800, fontSize: 20, color: C.ink }}>My QR Code</h2>
      <Card style={{ maxWidth: 380, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
          <Av name={member.name} size={56} />
        </div>
        <div style={{ fontWeight: 800, fontSize: 17, color: C.ink, marginTop: 8 }}>{member.name}</div>
        <div style={{ fontSize: 12, color: C.mist, marginBottom: 4 }}>{member.member_code}</div>
        <Badge label={rank.name} color={rank.color} />

        <div style={{ display: "flex", justifyContent: "center", margin: "20px 0",
          padding: 16, border: `1px solid ${C.fog}`, borderRadius: R.lg, background: C.white }}>
          <canvas ref={canvasRef} style={{ maxWidth: "100%" }} />
        </div>

        {/* Member details */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
          marginBottom: 14, textAlign: "left" }}>
          <div style={{ background: C.fog, borderRadius: R.md, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: C.mist, fontWeight: 600, textTransform: "uppercase" }}>Branch</div>
            <div style={{ fontSize: 13, color: C.ink, fontWeight: 600, marginTop: 2 }}>{member.branch?.split("–")[0].trim()}</div>
          </div>
          <div style={{ background: C.fog, borderRadius: R.md, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: C.mist, fontWeight: 600, textTransform: "uppercase" }}>Category</div>
            <div style={{ fontSize: 13, color: C.ink, fontWeight: 600, marginTop: 2 }}>{member.category}</div>
          </div>
          <div style={{ background: C.fog, borderRadius: R.md, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: C.mist, fontWeight: 600, textTransform: "uppercase" }}>Type</div>
            <div style={{ fontSize: 13, color: C.ink, fontWeight: 600, marginTop: 2 }}>{member.type}</div>
          </div>
          <div style={{ background: C.fog, borderRadius: R.md, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: C.mist, fontWeight: 600, textTransform: "uppercase" }}>Points</div>
            <div style={{ fontSize: 13, color: rank.color, fontWeight: 700, marginTop: 2 }}>{member.points || 0} pts</div>
          </div>
        </div>

        <div style={{ background: C.fog, borderRadius: R.md, padding: "12px 14px", fontSize: 12,
          color: C.slate, textAlign: "left", lineHeight: 1.6 }}>
          Present this QR code to the attendance scanner at the entrance for instant check-in.
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "center" }}>
          <Btn label="Download" icon={Ico.download} outline sm onClick={download} />
        </div>
      </Card>
    </div>
  );
};

/* ── QR SCANNER (superadmin) ──────────────────────────── */
const ScannerPage = ({ role }) => {
  const [log, setLog] = useState([]);
  const [manual, setManual] = useState("");

  const handleScan = useCallback((raw) => {
    setLog(prev => {
      if (prev.length && prev[0].raw === raw && Date.now() - prev[0].ts < 3000) return prev; // debounce dupes
      let parsed = { raw };
      try {
        const url = new URL(raw.replace("jil://", "https://jil.local/"));
        parsed = { raw, code: url.searchParams.get("code"), name: decodeURIComponent(url.searchParams.get("name")||""), branch: decodeURIComponent(url.searchParams.get("branch")||"") };
      } catch { /* not a structured URL */ }
      return [{ ...parsed, ts: Date.now() }, ...prev].slice(0,12);
    });
  }, []);

  const submitManual = () => {
    if (!manual.trim()) return;
    handleScan(manual.trim());
    setManual("");
  };

  const mob = useIsMobile();

  return (
    <div>
      <h2 style={{ margin:"0 0 18px", fontWeight:800, fontSize:20, color:C.ink }}>QR Attendance Scanner</h2>
      <div style={{ display:"grid", gridTemplateColumns: mob?"1fr":"1fr 1fr", gap:20 }}>
        <Card>
          <h3 style={{ margin:"0 0 14px", fontWeight:700, fontSize:14, color:C.ink }}>Camera Scanner</h3>
          <QRScanner onResult={handleScan}/>
          <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${C.fog}` }}>
            <div style={{ fontSize:12, fontWeight:600, color:C.slate, marginBottom:8 }}>Manual Entry (fallback)</div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={manual} onChange={e=>setManual(e.target.value)} placeholder="Paste member code or QR data…"
                style={{ flex:1, padding:"9px 14px", borderRadius:R.full, border:`1.5px solid ${C.cloud}`, fontSize:13, outline:"none", color:C.ink }}/>
              <Btn label="Add" sm onClick={submitManual}/>
            </div>
          </div>
        </Card>

        <Card style={{ padding:0, overflow:"hidden" }}>
          <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.fog}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <h3 style={{ margin:0, fontWeight:700, fontSize:14, color:C.ink }}>Scan Log</h3>
            {log.length>0 && <Badge label={`${log.length} scanned`} color={C.green}/>}
          </div>
          {log.length===0 ? (
            <div style={{ padding:"40px 20px", textAlign:"center", color:C.mist }}>
              <Ico.scan size={36} color={C.cloud}/>
              <div style={{ marginTop:10, fontSize:13 }}>No scans yet. Point the camera at a member's QR code.</div>
            </div>
          ) : (
            <div style={{ maxHeight:380, overflowY:"auto" }}>
              {log.map((s,i)=>(
                <div key={s.ts} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 20px", borderTop: i>0?`1px solid ${C.fog}`:"none" }}>
                  {s.name ? <Av name={s.name} size={34}/> : (
                    <div style={{ width:34,height:34,borderRadius:"50%",background:C.fog,display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <Ico.qr size={15} color={C.mist}/>
                    </div>
                  )}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13, color:C.ink, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.name || "Unrecognized code"}</div>
                    <div style={{ fontSize:11, color:C.mist, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.code ? `${s.code} · ${s.branch}` : s.raw}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                    <Ico.check size={14} color={C.green} sw={2.5}/>
                    <span style={{ fontSize:11, color:C.mist }}>{new Date(s.ts).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};


const EventsPage = () => {
  const mob = useIsMobile();
  return (
    <div>
      <h2 style={{ margin:"0 0 18px", fontWeight:800, fontSize:20, color:C.ink }}>Events & Calendar</h2>
      <div style={{ display:"grid", gridTemplateColumns:`repeat(auto-fill,minmax(${mob?240:260}px,1fr))`, gap:14 }}>
        {EVENTS.map(e=>{
          const cfg = e.type==="birthday"?{color:C.rose2,I:Ico.cake,tag:"Birthday"}:e.type==="worship"?{color:C.blue,I:Ico.sparkle,tag:"Worship"}:{color:C.violet2,I:Ico.calendar,tag:"Event"};
          return (
            <Card key={e.id} hoverable>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                <div style={{ width:40,height:40,borderRadius:R.md,background:`${cfg.color}12`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <cfg.I size={18} color={cfg.color}/>
                </div>
                <Badge label={cfg.tag} color={cfg.color}/>
              </div>
              <div style={{ fontWeight:700, fontSize:14, color:C.ink, marginBottom:4 }}>{e.name}</div>
              <div style={{ fontSize:12, color:C.mist }}>{e.date}</div>
              <div style={{ fontSize:12, color:C.mist }}>{e.branch}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

/* ── BRANCHES ──────────────────────────── */
const BranchesPage = () => {
  const mob = useIsMobile();
  const colors=[C.blue,C.violet2,C.green,C.amber,C.rose2];
  return (
    <div>
      <h2 style={{ margin:"0 0 18px", fontWeight:800, fontSize:20, color:C.ink }}>Church Branches</h2>
      <div style={{ display:"grid", gridTemplateColumns:`repeat(auto-fill,minmax(${mob?220:240}px,1fr))`, gap:14 }}>
        {BRANCHES.map((b,i)=>{
          const m=SEED_MEMBERS.filter(x=>x.branch===b).length;
          const att=[127,34,28,19,22][i];
          return (
            <Card key={b} hoverable>
              <div style={{ width:40,height:40,borderRadius:R.md,background:`${colors[i]}12`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12 }}>
                <Ico.map size={18} color={colors[i]}/>
              </div>
              <div style={{ fontWeight:700, fontSize:14, color:C.ink, marginBottom:2 }}>{b}</div>
              <div style={{ fontSize:12, color:C.mist, marginBottom:12 }}>Pinamalayan, Oriental Mindoro</div>
              <div style={{ display:"flex", gap:16 }}>
                <div><div style={{ fontSize:22, fontWeight:800, color:colors[i] }}>{m}</div><div style={{ fontSize:11, color:C.mist }}>Members</div></div>
                <div><div style={{ fontSize:22, fontWeight:800, color:colors[i] }}>{att}</div><div style={{ fontSize:11, color:C.mist }}>Last Att.</div></div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

/* ── SETTINGS ──────────────────────────── */
const SettingsPage = ({ role }) => {
  const items = [
    { I:Ico.users,    label:"User Management",    desc:"Add, edit, deactivate CMS accounts",           color:C.blue },
    { I:Ico.branch,   label:"Branch Management",  desc:"Configure branch details and leaders",         color:C.violet2 },
    { I:Ico.finance,  label:"Finance Categories", desc:"Edit giving types and fund labels",             color:C.green },
    { I:Ico.shield,   label:"Roles & Permissions",desc:"Control access by role level",                 color:C.amber },
    ...(role==="superadmin"?[{ I:Ico.upload, label:"Bulk Data Upload", desc:"Upload CSV/Excel for members, finance, attendance", color:C.rose2 }]:[]),
  ];
  return (
    <div>
      <h2 style={{ margin:"0 0 18px", fontWeight:800, fontSize:20, color:C.ink }}>Settings</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:10, maxWidth:520 }}>
        {items.map(s=>(
          <Card key={s.label} onClick={()=>alert(`Opening: ${s.label}`)} hoverable style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px" }}>
            <div style={{ width:40,height:40,borderRadius:R.md,background:`${s.color}12`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <s.I size={18} color={s.color}/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:14, color:C.ink }}>{s.label}</div>
              <div style={{ fontSize:12, color:C.mist }}>{s.desc}</div>
            </div>
            <Ico.chevronR size={15} color={C.cloud}/>
          </Card>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   APP ROOT
═══════════════════════════════════════════════════════════ */
export default function App() {
  const { auth, loading, error, loginWithEmail, logout } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [showMob, setShowMob] = useState(false);
  const mob = useIsMobile();

  const renderPage = () => {
    const role = auth.profile.role;
    // Change this in renderPage():
    const user = { 
    name: auth.profile.name,
    id: auth.user.id,
    email: auth.user.email,
    memberId: auth.profile.member_id, 
    };
    switch(page) {
      case "dashboard":  return <Dashboard    role={role} user={user}/>;
      case "attendance": return <AttendancePage role={role} user={user}/>;
      case "finance":    return <FinancePage  role={role} user={user}/>;
      case "reports":    return <ReportsPage  role={role}/>;
      case "members":    return <MembersPage  role={role}/>;
      case "qr":         return <QRGeneratorPage />;
      case "myqr":       return <MyQRPage     user={user}/>;
      case "scanner":    return <ScannerPage  role={role}/>;
      case "events":     return <EventsPage/>;
      case "prayer":     return <PrayerPage/>;
      case "branches":   return <BranchesPage/>;
      case "settings":   return <SettingsPage role={role}/>;
      default:           return <Dashboard    role={role} user={user}/>;
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", color:"#94A3B8", background:C.ink }}>
        Loading…
      </div>
    );
  }

  if (!auth) return <Login onLogin={loginWithEmail} error={error}/>;

  const role = auth.profile.role;
  const user = { name: auth.profile.name };

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Helvetica,sans-serif", background:C.fog, overflow:"hidden" }}>
      {/* Sidebar */}
      <Sidebar role={role} page={page} setPage={setPage} user={user} onLogout={logout}
        collapsed={collapsed} setCollapsed={setCollapsed}
        mobile={mob} showMob={showMob} setShowMob={setShowMob}/>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, overflow:"hidden" }}>
        <Topbar role={role} page={page} user={user}
          collapsed={collapsed} setCollapsed={setCollapsed}
          mobile={mob} setShowMob={setShowMob}/>

        {/* Gamification bar for regular users */}
        {role==="regular" && <GamStrip user={user}/>}

        {/* Scrollable content */}
        <div style={{ flex:1, overflowY:"auto", padding: mob?"16px":"24px 28px" }}>
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
