import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./lib/useAuth";
import Login from "./components/Login";
import MembersPage from './pages//MembersPage'
import QRGeneratorPage from './pages/QRGeneratorPage'
import QRCode from "qrcode";
import { supabase } from "./lib/supabaseClient";
import MyAttendancePage from './pages/MyAttendancePage';
import AttendancePage from './pages/AttendancePage';
import jsQR from "jsqr";
import PrayerPage from './pages/PrayerPage';
import AnnouncementPage from './pages/AnnouncementPage';

const C = {
  ink:"#0A0F1E", ink2:"#1C2336", ink3:"#2E3A52",
  slate:"#64748B", mist:"#94A3B8", cloud:"#CBD5E1",
  fog:"#E8EDF5", white:"#FFFFFF",
  bg:"#E8EDF5", bgSecondary:"#F8FAFC",
  blue:"#1D4ED8", blue2:"#3B82F6", blue3:"#DBEAFE",
  green:"#15803D", green2:"#22C55E", green3:"#DCFCE7",
  amber:"#B45309", amber2:"#F59E0B", amber3:"#FEF3C7",
  rose:"#BE123C", rose2:"#F43F5E", rose3:"#FFE4E6",
  violet:"#6D28D9", violet2:"#8B5CF6", violet3:"#EDE9FE",
};
/* ═══════════════════════════════════════════════════════════
   DESIGN SYSTEM
═══════════════════════════════════════════════════════════ */

export default function App() {
  const { auth, loading, error, loginWithEmail, logout } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [showMob, setShowMob] = useState(false);
  const [churchColor, setChurchColor] = useState("#1D4ED8");
  const [logoUrl, setLogoUrl] = useState("");
  const mob = useIsMobile();

  const [themeUrl, setThemeUrl] = useState("");

  useEffect(() => {
    supabase.from("app_settings").select("key, value")
  .in("key", ["logo_url"])
  .then(({ data }) => {
    if (data) data.forEach(r => {
      if (r.key === "logo_url") setLogoUrl(r.value || "");
      if (r.key === "announcement_bg_url") setAnnBgUrl(r.value || "");
    });
  });
    supabase.from("monthly_theme").select("image_url").eq("id", 1).single()
      .then(({ data }) => { if (data?.image_url) setThemeUrl(data.image_url); });
  }, []);

  // Load and sync church color from monthly_theme
useEffect(() => {
  supabase.from("monthly_theme").select("color").eq("id", 1).single()
    .then(({ data }) => {
      if (data?.color) setChurchColor(data.color);
    });

  // Listen for real-time updates
  const subscription = supabase
    .channel('monthly_theme')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'monthly_theme', filter: 'id=eq.1' },
      (payload) => {
        if (payload.new.color) setChurchColor(payload.new.color);
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
}, []);

  const renderPage = () => {
    const role = auth.profile.role;
    const user = { 
      name: auth.profile.name,
      id: auth.user.id,
      email: auth.user.email,
      memberId: auth.profile.member_id, 
      branch: auth.profile.branch,     
      branchId: auth.profile.branch_id,
    };
    switch(page) {
      case "dashboard":     return <Dashboard       role={role} user={user}/>;
      case "attendance":    return role === "regular" ? <MyAttendancePage /> : <AttendancePage />;
      case "finance":       return <FinancePage role={role} user={user}/>;
      case "reports":       return role === "regular" ? <Dashboard role={role} user={user}/> : <ReportsPage role={role}/>;
      case "members":       return <MembersPage     role={role} user={user}/>;
      case "announcements": return <AnnouncementPage bg="" user={user} role={role}/>;
      case "qr":            return <QRGeneratorPage />;
      case "myqr":          return <MyQRPage        user={user}/>;
      case "scanner":       return <ScannerPage     role={role}/>;
      case "prayer":        return <PrayerPage user={user} role={role}/>;
      case "branches":      return <BranchesPage/>;
      case "settings":      return <SettingsPage role={role} C={C}/>;
      default:              return <Dashboard       role={role} user={user}/>;
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", color:"#94A3B8", background:C.ink }}>
        Loading…
      </div>
    );
  }

  if (!auth) return <Login onLogin={loginWithEmail} error={error} logo={logoUrl} bg={themeUrl}/>;

  const role = auth.profile.role;
  const user = { name: auth.profile.name };

  return (
    <div style={{
        display:"flex", height:"100vh",
        fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Helvetica,sans-serif",
        background: `${churchColor}15`,
        overflow:"hidden",
        "--church-color": churchColor,
        "--church-color-light": `${churchColor}22`,
      }}>

      <Sidebar role={role} page={page} setPage={setPage} user={user} onLogout={logout}
        collapsed={collapsed} setCollapsed={setCollapsed}
        mobile={mob} showMob={showMob} setShowMob={setShowMob} logo={logoUrl}
        churchColor={churchColor}/>

      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, overflow:"hidden" }}>
        <Topbar role={role} page={page} user={user}
          collapsed={collapsed} setCollapsed={setCollapsed}
          mobile={mob} setShowMob={setShowMob}/>

        {role==="regular" && <GamStrip user={user}/>}

          <div style={{ flex:1, overflowY:"auto", padding: mob?"16px":"24px 28px",
            background: `${churchColor}15`,
          }}>
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

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
const CATEGORIES = ["WSAM","LGAM","WSAM/LGAM","First Timer","Guest"];
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

const Card = ({ children, style={}, onClick, hoverable, C }) => {
  const [hov, setHov] = useState(false);
  
  // Default colors if C is not provided
  const defaultTheme = {
    white: "#FFFFFF",
    bgSecondary: "#F8FAFC",
    fog: "#E8EDF5",
  };
  
  const theme = C || defaultTheme;
  
  return (
    <div
      onClick={onClick}
      onMouseEnter={()=>hoverable&&setHov(true)}
      onMouseLeave={()=>hoverable&&setHov(false)}
      style={{
        background: theme.bgSecondary || theme.white,
        borderRadius: R.xl,
        boxShadow: hov ? SH.md : SH.sm,
        border: `1px solid ${theme.fog || "#E8EDF5"}`,
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

/* ─── Input ─────────────────────────── */
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

/* ─── Button ─────────────────────────── */
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

/* ─── Modal ─────────────────────────── */
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
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef    = useRef(null);
  const lastRef   = useRef(null);

  const [status,   setStatus]   = useState("idle"); // idle | live | error
  const [scanning, setScanning] = useState(false);
  const timeoutRef = useRef(null);

  const stop = useCallback(() => {
    if (rafRef.current)    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStatus("idle");
    setScanning(false);
  }, []);

  const start = useCallback(async () => {
    setStatus("idle");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStatus("live");
      setScanning(true);
      // Auto-close after 10 seconds if nothing scanned
      timeoutRef.current = setTimeout(() => stop(), 10000);
    } catch {
      setStatus("error");
    }
  }, []);

  // Scan loop using jsQR
  useEffect(() => {
  if (!scanning) return;

  const tick = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    const img  = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
    if (code && code.data !== lastRef.current) {
      lastRef.current = code.data;
      onResult(code.data);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => stop(), 10000);
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  tick(); // ← start the loop

  return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
}, [scanning, onResult]);

  useEffect(() => () => {
  stop();
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, [stop]);

  return (
    <div>
      {/* Viewfinder */}
      <div style={{
        position: "relative", background: C.ink, borderRadius: R.lg,
        overflow: "hidden", aspectRatio: "4/3", marginBottom: 12,
      }}>
        <video ref={videoRef} muted playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover",
            display: status === "live" ? "block" : "none" }}/>

        {/* Scan frame overlay */}
        {status === "live" && (
          <div style={{ position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <div style={{ width: 160, height: 160, position: "relative" }}>
              {[
                { top: 0,    left: 0,  borderTop:    `3px solid ${C.blue2}`, borderLeft:   `3px solid ${C.blue2}` },
                { top: 0,    right: 0, borderTop:    `3px solid ${C.blue2}`, borderRight:  `3px solid ${C.blue2}` },
                { bottom: 0, left: 0,  borderBottom: `3px solid ${C.blue2}`, borderLeft:   `3px solid ${C.blue2}` },
                { bottom: 0, right: 0, borderBottom: `3px solid ${C.blue2}`, borderRight:  `3px solid ${C.blue2}` },
              ].map((s, i) => (
                <div key={i} style={{ position: "absolute", width: 20, height: 20, borderRadius: 2, ...s }}/>
              ))}
              <style>{`@keyframes scanLine{0%{top:6px;opacity:1}48%{top:148px;opacity:1}50%{opacity:0}52%{top:6px;opacity:0}54%{opacity:1}100%{top:148px;opacity:1}}`}</style>
              <div style={{ position: "absolute", left: 6, right: 6, height: 2,
                background: C.blue2, borderRadius: 1,
                animation: "scanLine 2s linear infinite" }}/>
            </div>
          </div>
        )}

        {/* Idle */}
        {status === "idle" && (
          <div style={{ position: "absolute", inset: 0, display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <Ico.camera size={32} color="rgba(255,255,255,.25)"/>
            <span style={{ color: "rgba(255,255,255,.3)", fontSize: 13 }}>Camera off</span>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div style={{ position: "absolute", inset: 0, display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 10, padding: 20, textAlign: "center" }}>
            <span style={{ fontSize: 28 }}>📷</span>
            <span style={{ color: "rgba(255,255,255,.5)", fontSize: 12, lineHeight: 1.5 }}>
              Camera access denied. Allow permissions and try again.
            </span>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }}/>
      </div>

      {/* Start / Stop button */}
      <button
        onClick={() => status === "live" ? stop() : start()}
        style={{
          width: "100%", padding: "11px 0", borderRadius: R.full,
          background: status === "live" ? C.rose2 : C.blue,
          color: C.white, border: "none", fontWeight: 700, fontSize: 14,
          cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 8,
        }}>
        {status === "live" ? (
          <><Ico.close size={15} color={C.white}/> Stop Camera</>
        ) : (
          <><Ico.camera size={15} color={C.white}/> Start Camera</>
        )}
      </button>

      {status === "live" && (
        <p style={{ textAlign: "center", fontSize: 12, color: C.mist, marginTop: 10, marginBottom: 0 }}>
          Point camera at a member's personal QR code
        </p>
      )}
    </div>
  );
};

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

const MENUS = {
  regular: [
    {id:"dashboard", label:"Dashboard",   I:Ico.home},
    {id:"attendance",label:"Attendance",  I:Ico.attendance},
    {id:"finance",   label:"My Finance",  I:Ico.finance},
    {id:"myqr",      label:"My QR Code",  I:Ico.idcard},
    {id:"prayer",    label:"Prayer",      I:Ico.prayer},
  ],
  admin: [
  {id:"dashboard",      label:"Dashboard",    I:Ico.home},
  {id:"members",        label:"Members",      I:Ico.users},
  {id:"attendance",     label:"Attendance",   I:Ico.attendance},
  {id:"finance",        label:"Finance",      I:Ico.finance},
  {id:"reports",        label:"Reports",      I:Ico.report},
  {id:"announcements",  label:"Announcements",I:Ico.bell},   
  {id:"qr",             label:"QR Generator", I:Ico.qr},
  {id:"scanner",        label:"QR Scanner",   I:Ico.scan},
  {id:"prayer",         label:"Prayer Requests", I:Ico.prayer},
 ],
superadmin: [
  {id:"dashboard",      label:"Dashboard",    I:Ico.home},
  {id:"members",        label:"Members",      I:Ico.users},
  {id:"attendance",     label:"Attendance",   I:Ico.attendance},
  {id:"finance",        label:"Finance",      I:Ico.finance},
  {id:"reports",        label:"Reports",      I:Ico.report},
  {id:"announcements",  label:"Announcements",I:Ico.bell},   
  {id:"qr",             label:"QR Generator", I:Ico.qr},
  {id:"scanner",        label:"QR Scanner",   I:Ico.scan},
  {id:"prayer",         label:"Prayer Requests", I:Ico.prayer},
  {id:"branches",       label:"Branches",     I:Ico.branch},
  {id:"settings",       label:"Settings",     I:Ico.settings},
  ],
};

const ROLE_TAG = {
  regular:    {tag:"Member",   color:C.blue},
  admin:      {tag:"Admin",    color:C.violet2},
  superadmin: {tag:"Dev",      color:C.rose2},
};

const Sidebar = ({ role, page, setPage, user, onLogout, collapsed, setCollapsed, mobile, showMob, setShowMob, logo, churchColor }) => {
  const menu = MENUS[role]||MENUS.regular;
  const rt = ROLE_TAG[role];

  const inner = (
    <div style={{ width: mobile ? 260 : collapsed ? 64 : 224, background:C.ink, display:"flex", flexDirection:"column", height:"100%", transition:"width .22s", overflow:"hidden" }}>
      {/* Logo */}
      <div style={{ padding: collapsed&&!mobile ? "16px 0" : "20px 16px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid rgba(255,255,255,.06)", justifyContent: collapsed&&!mobile?"center":"flex-start" }}>
        <div style={{ width:36, height:36, borderRadius:R.md, background:`linear-gradient(135deg,${churchColor},${churchColor}cc)`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, overflow:"hidden" }}>
          {logo
            ? <img src={logo} alt="Logo" style={{ width:"100%", height:"100%", objectFit:"contain" }}/>
            : <Ico.sparkle size={18} color="#fff"/>
          }
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
              {active && <div style={{ position:"absolute", left:0, top:"15%", bottom:"15%", width:3, background:"var(--church-color)", borderRadius:"0 3px 3px 0" }}/>}
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
  const [m, setM] = useState({ points: 0, attendance: 0 });

  useEffect(() => {
    if (!user.memberId) return;
    supabase
      .from("members")
      .select("points")
      .eq("id", user.memberId)
      .maybeSingle()
      .then(({ data }) => { if (data) setM(data); });
  }, [user.memberId]);

  const rank = getRank(m.points || 0);
  const nextRank = RANKS[RANKS.indexOf(rank)+1];
  const pct = nextRank
    ? ((m.points-rank.min)/(nextRank.min-rank.min))*100
    : 100;

  return (
    <div style={{ background:C.ink2, padding:"10px 20px", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
      <TreeGrowth points={m.points || 0} size={44}/>
      <div style={{ flex:1, minWidth:120 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <span style={{ color:"#CBD5E1", fontSize:12, fontWeight:600 }}>{rank.name} · {m.points || 0} pts</span>
          {nextRank && <span style={{ color:"#475569", fontSize:11 }}>→ {nextRank.name} at {nextRank.min}</span>}
        </div>
        <Bar value={(m.points||0)-rank.min} max={nextRank?nextRank.min-rank.min:200} color={rank.color} height={5} bg="rgba(255,255,255,.08)"/>
      </div>
      <div style={{ display:"flex", gap:20 }}>
        <div style={{ textAlign:"center" }}><div style={{ color:"#fff", fontWeight:700, fontSize:15 }}>{m.attendance||0}%</div><div style={{ color:"#475569", fontSize:10 }}>Attend.</div></div>
        <div style={{ textAlign:"center" }}><div style={{ color:C.amber2, fontWeight:700, fontSize:15 }}>{m.points||0}</div><div style={{ color:"#475569", fontSize:10 }}>Points</div></div>
      </div>
    </div>
  );
};

/* ── AUDIT LOGGER ──────────────────────────── */
const logAction = async (action, details, entity, entityId) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const user = session.user;
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
  } catch (err) {
    return err;
  }
};

const REACTION_EMOJIS = ["🙏","❤️","🔥","👏","😊","🎉"];

const AnnouncementDetailModal = ({ open, item, onClose, user }) => {
  const [reactions,    setReactions]    = useState({});
  const [myReactions,  setMyReactions]  = useState(new Set());
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

const EventDetailModal = ({ open, item, onClose, user }) => {
  const [reactions,    setReactions]    = useState({});
  const [myReactions,  setMyReactions]  = useState(new Set());
  const [greetings,    setGreetings]    = useState([]);
  const [newGreeting,  setNewGreeting]  = useState("");
  const [sending,      setSending]      = useState(false);
  const [loadingReact, setLoadingReact] = useState(false);
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
    if (!newGreeting.trim() || !user?.memberId || alreadyGreeted) return;
    setSending(true);

    const { error } = await supabase.from("birthday_greetings").insert({
      event_id: item.id, member_id: user.memberId, message: newGreeting.trim(),
    });

    if (error) {
      if (error.code === "23505") {
        setAlreadyGreeted(true); // unique constraint hit
      }
    } else {
      setNewGreeting("");
      await loadGreetings();
    }
    setSending(false);
  };

  if (!open || !item) return null;

  const cfg = isBirthday
    ? { color:C.rose2,   emoji:"🎂", label:"Birthday", reactionEmojis:["🎂","🎉","❤️","🙏","🥳","😊"] }
    : item.type==="worship"
    ? { color:C.blue,    emoji:"✨", label:"Worship",  reactionEmojis:REACTION_EMOJIS }
    : { color:C.violet2, emoji:"📅", label:"Event",    reactionEmojis:REACTION_EMOJIS };

  return (
    <Modal open={open} onClose={onClose} width={520}>
      <div style={{ textAlign:"center", marginBottom:20 }}>
        <div style={{ fontSize:48, marginBottom:8 }}>{cfg.emoji}</div>
        <Badge label={cfg.label} color={cfg.color}/>
        <h2 style={{ margin:"10px 0 4px", fontWeight:800, fontSize:20, color:C.ink }}>{item.name}</h2>
        <div style={{ fontSize:13, color:C.mist }}>
          {item.date}{item.branch?` · ${item.branch}`:""}
        </div>
      </div>

      <div style={{ paddingTop:16, borderTop:`1px solid ${C.fog}`,
        marginBottom:isBirthday?20:0 }}>
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
    </Modal>
  );
};
/* ═══════════════════════════════════════════════════════════
   PAGES
═══════════════════════════════════════════════════════════ */

const InlineReactions = ({ table, idField, rowId, user, emojis }) => {
  const [reactions,   setReactions]   = useState({});
  const [myReactions, setMyReactions] = useState(new Set());
  const EMOJIS = emojis || ["🙏","❤️","🔥","👏","😊","🎉"];

  const load = async () => {
    const { data } = await supabase.from(table)
      .select("emoji, member_id").eq(idField, rowId);
    const counts = {}, mine = new Set();
    (data||[]).forEach(r => {
      counts[r.emoji] = (counts[r.emoji]||0) + 1;
      if (r.member_id === user?.memberId) mine.add(r.emoji);
    });
    setReactions(counts);
    setMyReactions(mine);
  };

  useEffect(() => { if (rowId) load(); }, [rowId]);

  const toggle = async (emoji) => {
    if (!user?.memberId) return;
    const { data: existing } = await supabase.from(table).select("id")
      .eq(idField, rowId).eq("member_id", user.memberId).eq("emoji", emoji).maybeSingle();
    if (existing) {
      await supabase.from(table).delete().eq("id", existing.id);
    } else {
      await supabase.from(table).insert({ [idField]: rowId, member_id: user.memberId, emoji });
    }
    load();
  };

  const hasAny = EMOJIS.some(e => reactions[e] > 0);

  return (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
      {EMOJIS.map(emoji => {
        const count = reactions[emoji] || 0;
        const reacted = myReactions.has(emoji);
        if (!hasAny && !reacted) return null; // hide empty emojis until someone reacts
        if (count === 0 && !reacted) return null;
        return (
          <button key={emoji} onClick={() => toggle(emoji)}
            style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 10px",
              borderRadius:R.full, border:`1.5px solid ${reacted ? C.blue : C.cloud}`,
              background: reacted ? C.blue3 : C.fog,
              cursor:"pointer", fontSize:13, fontWeight:600,
              color: reacted ? C.blue : C.ink, transition:"all .15s" }}>
            {emoji}
            <span style={{ fontSize:11, color: reacted ? C.blue : C.mist }}>{count}</span>
          </button>
        );
      })}
      {/* Always show the + picker */}
      <EmojiPicker emojis={EMOJIS} onPick={toggle} myReactions={myReactions}/>
    </div>
  );
};

const EmojiPicker = ({ emojis, onPick, myReactions }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position:"relative" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width:26, height:26, borderRadius:R.full, border:`1.5px solid ${C.cloud}`,
          background: open ? C.fog : C.white, cursor:"pointer", fontSize:14,
          display:"flex", alignItems:"center", justifyContent:"center", color:C.slate }}>
        {open ? "×" : "+"}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)}
            style={{ position:"fixed", inset:0, zIndex:50 }}/>
          <div style={{ position:"absolute", bottom:"calc(100% + 6px)", left:"50%",
            transform:"translateX(-50%)", background:C.white, borderRadius:14,
            border:`1px solid ${C.fog}`, boxShadow:SH.md,
            padding:"8px 10px", display:"flex", gap:4, zIndex:100 }}>
            {emojis.map(emoji => (
              <button key={emoji} onClick={() => { onPick(emoji); setOpen(false); }}
                style={{ width:34, height:34, borderRadius:8, fontSize:17,
                  border: myReactions.has(emoji) ? `1.5px solid ${C.blue}` : "1.5px solid transparent",
                  background: myReactions.has(emoji) ? C.blue3 : "transparent",
                  cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* ── DASHBOARD ──────────────────────────── */
const TAG_COLORS = {
  Worship: C.blue, Events: C.violet, Ministry: C.green,
  Default: C.slate,
};

const Dashboard = ({ role, user }) => {
  const isAdmin = role !== "regular";
  const total = FINANCE_DATA.reduce((a, f) => a + f.amount, 0);
  const mob = useIsMobile();

  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [themeUrl, setThemeUrl] = useState(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    supabase.from("announcements").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setAnnouncements(data); });
    supabase.from("events").select("*").order("date", { ascending: true })
      .then(({ data }) => { if (data) setEvents(data); });
    supabase.from("monthly_theme").select("image_url").eq("id", 1).single()
      .then(({ data }) => { if (data?.image_url) setThemeUrl(data.image_url); });
  }, []);

  return (
    <div>
      {themeUrl && (
        <div style={{ marginBottom:20, borderRadius:R.xl, overflow:"hidden" }}>
          <img src={themeUrl} alt="Monthly Theme" style={{ width:"100%", display:"block", maxHeight:320, objectFit:"cover" }}/>
        </div>
      )}

      {isAdmin && (
        <div style={{ display:"grid", gridTemplateColumns:`repeat(auto-fit,minmax(${mob?140:160}px,1fr))`, gap:12, marginBottom:20 }}>
          <StatTile icon={Ico.users}      label="Members"         value={SEED_MEMBERS.length} sub={`Active: ${SEED_MEMBERS.filter(m=>m.category==="Official Member").length}`} color={C.blue}    accent="+2 this month"/>
          <StatTile icon={Ico.attendance} label="Avg Attendance"  value="84%"                 sub="Last Sunday: 127"                                                           color={C.violet2} accent="↑ 5% vs last month"/>
          <StatTile icon={Ico.finance}    label="Total Offerings" value={`₱${total.toLocaleString()}`} sub="This month"                                                        color={C.green}/>
          <StatTile icon={Ico.branch}     label="Branches"        value={BRANCHES.length}     sub="All active"                                                                  color={C.amber}/>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns: mob?"1fr":"1fr 300px", gap:16 }}>

        {/* Announcements */}
        <div>
          <h3 style={{ margin:"0 0 12px", fontWeight:700, fontSize:15, color:C.ink }}>Announcements</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {announcements.length === 0
              ? <p style={{ color:C.mist, fontSize:13 }}>No announcements yet.</p>
              : announcements.map(a => {
                  const color = TAG_COLORS[a.tag] || TAG_COLORS.Default;
                  return (
                    <Card key={a.id} hoverable
                    onClick={() => setSelectedAnnouncement(a)}
                    style={{ borderLeft:`3px solid ${color}`, padding:"14px 16px", cursor:"pointer" }}>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"flex-start", marginBottom:5, gap:8 }}>
                      <strong style={{ fontSize:14, color:C.ink }}>{a.title}</strong>
                      {a.tag && <Badge label={a.tag} color={color}/>}
                    </div>
                    <p style={{ margin:"0 0 5px", fontSize:13, color:C.slate, lineHeight:1.5 }}>
                      {a.body?.length > 80 ? a.body.slice(0, 80) + "…" : a.body}
                    </p>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", marginTop:8 }}>
                      <span style={{ fontSize:11, color:C.mist }}>{a.date}</span>
                      <span style={{ fontSize:11, color, fontWeight:600 }}>Tap to read more →</span>
                    </div>
                    <div onClick={e => e.stopPropagation()} style={{ marginTop:10, paddingTop:10,
                      borderTop:`1px solid ${C.fog}` }}>
                      <InlineReactions
                        table="announcement_reactions"
                        idField="announcement_id"
                        rowId={a.id}
                        user={user}
                      />
                    </div>
                  </Card>
                  );
                })
            }
          </div>
        </div>

        {/* Upcoming */}
        {!mob && (
          <div>
            <h3 style={{ margin:"0 0 12px", fontWeight:700, fontSize:15, color:C.ink }}>Upcoming</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {events.length === 0
                ? <p style={{ color:C.mist, fontSize:13 }}>No upcoming events.</p>
                : events.map(e => {
                    const cfg = e.type==="birthday"
                      ? { color:C.rose2,   I:Ico.cake }
                      : e.type==="worship"
                      ? { color:C.blue,    I:Ico.sparkle }
                      : { color:C.violet2, I:Ico.calendar };
                    return (
                      <Card key={e.id} hoverable onClick={() => setSelectedEvent(e)} style={{ padding:"12px 14px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
                          <div style={{ width:36, height:36, borderRadius:R.sm, background:cfg.color+"22", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            <cfg.I size={16} color={cfg.color}/>
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:C.ink }}>{e.name}</div>
                            <div style={{ fontSize:11, color:C.mist }}>{e.date}{e.branch ? ` · ${e.branch}` : ""}</div>
                          </div>
                        </div>
                        <div onClick={ev => ev.stopPropagation()} style={{ paddingTop:8, borderTop:`1px solid ${C.fog}` }}>
                          <InlineReactions
                            table="event_reactions"
                            idField="event_id"
                            rowId={e.id}
                            user={user}
                            emojis={e.type === "birthday" 
                              ? ["🎂","🎉","❤️","🙏","🥳","😊"] 
                              : ["🙏","❤️","🔥","👏","😊","🎉"]}
                          />
                        </div>
                      </Card>
                    );
                  })
              }
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnnouncementDetailModal
        open={!!selectedAnnouncement}
        item={selectedAnnouncement}
        onClose={() => setSelectedAnnouncement(null)}
        user={user}
      />
      <EventDetailModal
        open={!!selectedEvent}
        item={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        user={user}
      />
    </div>
  );
};

/* ── ANNOUNCEMENT REACTIONS ──────────────────────────── */
  const AnnouncementReactions = ({ announcementId, user }) => {
  const [reactions, setReactions]     = useState([]);
  const [myReactions, setMyReactions] = useState(new Set());
  const [pickerOpen, setPickerOpen]   = useState(false);
  const EMOJIS = ["👍", "❤️", "😂", "🙏", "🔥"];

  const load = async () => {
    const { data } = await supabase
      .from("announcement_reactions")
      .select("emoji, member_id")
      .eq("announcement_id", announcementId);
    if (!data) return;
    const counts = {};
    const mine   = new Set();
    data.forEach(r => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
      if (r.member_id === user?.memberId) mine.add(r.emoji);
    });
    setReactions(Object.entries(counts).map(([emoji, count]) => ({ emoji, count })));
    setMyReactions(mine);
  };

  useEffect(() => { if (announcementId) load(); }, [announcementId]);

  const toggle = async (emoji) => {
    if (!user?.memberId) return alert("Log in to react");
    setPickerOpen(false);
    const { data: existing } = await supabase
      .from("announcement_reactions").select("id")
      .eq("announcement_id", announcementId)
      .eq("member_id", user.memberId)
      .eq("emoji", emoji)
      .maybeSingle();
    if (existing) {
      await supabase.from("announcement_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("announcement_reactions").insert({
        announcement_id: announcementId,
        member_id: user.memberId,
        emoji,
      });
    }
    load();
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", position: "relative" }}>
      {reactions.map(r => {
        const mine = myReactions.has(r.emoji);
        return (
          <button key={r.emoji} onClick={() => toggle(r.emoji)}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "4px 10px", borderRadius: 999,
              border: `1.5px solid ${mine ? C.blue : C.cloud}`,
              background: mine ? C.blue3 : C.fog,
              cursor: "pointer", fontSize: 13, fontWeight: 600,
              color: mine ? C.blue : C.ink, transition: "all .15s",
            }}>
            <span>{r.emoji}</span>
            <span style={{ fontSize: 11, color: mine ? C.blue : C.mist }}>{r.count}</span>
          </button>
        );
      })}

      {/* + button */}
      <div style={{ position: "relative" }}>
        <button onClick={() => setPickerOpen(v => !v)}
          style={{
            width: 28, height: 28, borderRadius: 999,
            border: `1.5px solid ${C.cloud}`,
            background: pickerOpen ? C.fog : C.white,
            cursor: "pointer", fontSize: 15,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.slate,
          }}>
          {pickerOpen ? "×" : "+"}
        </button>

        {pickerOpen && (
          <>
            <div onClick={() => setPickerOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 50 }}/>
            <div style={{
              position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
              transform: "translateX(-50%)",
              background: C.white, borderRadius: 14,
              border: `1px solid ${C.fog}`,
              boxShadow: SH.md,
              padding: "8px 10px", display: "flex", gap: 4,
              zIndex: 100,
            }}>
              {EMOJIS.map(emoji => {
                const already = myReactions.has(emoji);
                return (
                  <button key={emoji} onClick={() => toggle(emoji)}
                    style={{
                      width: 36, height: 36, borderRadius: 8,
                      border: already ? `1.5px solid ${C.blue}` : "1.5px solid transparent",
                      background: already ? C.blue3 : "transparent",
                      cursor: "pointer", fontSize: 18,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all .12s",
                    }}>
                    {emoji}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const BirthdayGreetings = ({ eventId, user }) => {
  const [greetings, setGreetings] = useState([]);
  const [newGreeting, setNewGreeting] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    loadGreetings();
  }, [eventId]);

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
    setMsg?.({ text:"You've already sent a greeting for this birthday! 🎂", type:"warn" });
    // For EventDetailModal in App.jsx, show inline message instead:
    setSending(false);
    return;
  }

  const { error } = await supabase.from("birthday_greetings").insert({
    event_id: item.id, member_id: user.memberId, message: newGreeting.trim(),
  });
  if (!error) { setNewGreeting(""); await loadGreetings(); }
  setSending(false);
};

  return (
    <div>
      <div style={{ fontSize:12, fontWeight:600, color:C.mist, marginBottom:12,
        textTransform:"uppercase", letterSpacing:.4 }}>
        Birthday Greetings ({greetings.length})
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <input value={newGreeting} onChange={e=>setNewGreeting(e.target.value)}
          placeholder="Write a birthday greeting… 🎂"
          onKeyDown={e=>e.key==="Enter"&&sendGreeting()}
          style={{ flex:1, padding:"9px 14px", borderRadius:R.full, boxSizing:"border-box",
            border:`1.5px solid ${C.cloud}`, fontSize:13, outline:"none", color:C.ink }}/>
        <button onClick={sendGreeting} disabled={!newGreeting.trim()||sending}
          style={{ padding:"9px 18px", borderRadius:R.full, background:C.rose2,
            color:C.white, border:"none", fontWeight:700, fontSize:13,
            cursor: !newGreeting.trim()||sending ? "not-allowed" : "pointer",
            opacity: !newGreeting.trim()||sending ? 0.6 : 1, flexShrink:0 }}>
          {sending ? "…" : "Send 🎉"}
        </button>
      </div>
      {greetings.length === 0 ? (
        <div style={{ background:C.fog, borderRadius:R.lg, padding:"20px",
          textAlign:"center", color:C.mist, fontSize:13 }}>
          No greetings yet — be the first! 🎂
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:280, overflowY:"auto" }}>
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
  );
};

/* ── EVENT REACTIONS ──────────────────────────── */
const EventReactions = ({ eventId, user }) => {
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!eventId) return;
    supabase.from("event_reactions")
      .select("emoji")
      .eq("event_id", eventId)
      .then(({ data }) => {
        if (data) {
          const grouped = {};
          data.forEach(r => {
            grouped[r.emoji] = (grouped[r.emoji] || 0) + 1;
          });
          setReactions(Object.entries(grouped).map(([emoji, count]) => ({ emoji, count })));
        }
        setLoading(false);
      });
  }, [eventId]);

  const toggleReaction = async (emoji) => {
    if (!user?.memberId) return alert("You must be logged in to react");
    
    const { data: existing } = await supabase.from("event_reactions")
      .select("id").eq("event_id", eventId)
      .eq("member_id", user.memberId).eq("emoji", emoji).maybeSingle();

    if (existing) {
      // Remove reaction
      await supabase.from("event_reactions").delete()
        .eq("id", existing.id);
    } else {
      // Add reaction
      await supabase.from("event_reactions").insert({
        event_id: eventId,
        member_id: user.memberId,
        emoji,
      });
    }

    // Refresh reactions
    const { data } = await supabase.from("event_reactions")
      .select("emoji").eq("event_id", eventId);
    if (data) {
      const grouped = {};
      data.forEach(r => {
        grouped[r.emoji] = (grouped[r.emoji] || 0) + 1;
      });
      setReactions(Object.entries(grouped).map(([emoji, count]) => ({ emoji, count })));
    }
  };


  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
      {reactions.map(r => (
        <button key={r.emoji} onClick={() => toggleReaction(r.emoji)}
          style={{ display:"flex", alignItems:"center", gap:3, padding:"3px 8px",
            borderRadius:R.full, border:`1px solid ${C.cloud}`, background:C.fog,
            cursor:"pointer", fontSize:12, fontWeight:600, color:C.ink, transition:"all .15s" }}>
          <span style={{ fontSize:13 }}>{r.emoji}</span>
          <span style={{ color:C.mist, fontSize:11 }}>{r.count}</span>
        </button>
      ))}
      <div style={{ position:"relative", display:"inline-block" }}>
        <button style={{ padding:"3px 8px", borderRadius:R.full, border:`1px solid ${C.cloud}`,
          background:C.fog, cursor:"pointer", color:C.mist, fontSize:12 }}>
          +
        </button>
        <div style={{ position:"absolute", bottom:"100%", right:0, background:C.white,
          borderRadius:R.lg, padding:"8px", boxShadow:SH.md, display:"flex", gap:4, marginBottom:8,
          zIndex:100, opacity:0, pointerEvents:"none", transition:"opacity .15s" }} className="reaction-picker">
          {REACTION_EMOJIS.map(emoji => (
            <button key={emoji} onClick={() => toggleReaction(emoji)}
              style={{ padding:"6px 8px", cursor:"pointer", fontSize:16, border:"none",
                background:"transparent", borderRadius:R.sm, transition:"all .15s" }}
              onMouseEnter={e => e.target.style.background = C.fog}
              onMouseLeave={e => e.target.style.background = "transparent"}>
              {emoji}
            </button>
          ))}
        </div>
        <style>{`
          button:hover + .reaction-picker, .reaction-picker:hover {
            opacity: 1;
            pointer-events: auto;
          }
        `}</style>
      </div>
    </div>
  );
};

/* ── ANNOUNCEMENTS MANAGER ──────────────────────────── */
const AnnouncementsPage = ({ bg }) => {
  const [tab, setTab] = useState("announcements");
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [aForm, setAForm] = useState({ title:"", body:"", tag:"Worship", date:"" });
  const [eForm, setEForm] = useState({ name:"", type:"event", date:"", branch:"" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); 
  const mob = useIsMobile();

  const TAG_OPTIONS = ["Worship","Events","Ministry","Announcement","Other"];
  const TYPE_OPTIONS = ["event","worship","birthday"];

  useEffect(() => {
    supabase.from("announcements").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setAnnouncements(data); });
    supabase.from("events").select("*").order("date", { ascending: true })
      .then(({ data }) => { if (data) setEvents(data); });

  }, []);

  const addAnnouncement = async () => {
  if (!aForm.title.trim()) return;
  setSaving(true);
  const { data, error } = await supabase.from("announcements").insert([aForm]).select().single();
  if (error) {
    setToast({ msg: "Failed to post: " + error.message, type: "error" });
  } else {
    setAnnouncements(prev => [data, ...prev]);
    setAForm({ title:"", body:"", tag:"Worship", date:"" });
    setToast({ msg: "Announcement posted!", type: "success" });
    logAction("announcement_posted", `"${aForm.title}"`, "announcement", data.id);
  }
  setSaving(false);
  };

  const deleteAnnouncement = async (id) => {
    await supabase.from("announcements").delete().eq("id", id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  const addEvent = async () => {
  if (!eForm.name.trim()) return;
  setSaving(true);
  const { data, error } = await supabase.from("events").insert([eForm]).select().single();
  if (error) {
    setToast({ msg: "Failed to add event: " + error.message, type: "error" });
  } else {
    setEvents(prev => [...prev, data]);
    setEForm({ name:"", type:"event", date:"", branch:"" });
    setToast({ msg: "Event added!", type: "success" });
    logAction("event_added", `"${eForm.name}"`, "event", data.id);
  }
  setSaving(false);
  };

  const deleteEvent = async (id) => {
    await supabase.from("events").delete().eq("id", id);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div style={ bg ? {
      backgroundImage: `linear-gradient(rgba(232,237,245,.93), rgba(232,237,245,.93)), url(${bg})`,
      backgroundSize:"cover", backgroundPosition:"center",
      backgroundAttachment:"fixed", minHeight:"100%", margin:-28, padding:28,
    } : {}}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)}/>}
      <h2 style={{ margin:"0 0 16px", fontWeight:800, fontSize:20, color:C.ink }}>Announcements & Events</h2>
      <div style={{ display:"flex", gap:8, marginBottom:18 }}>
        <Pill label="Announcements" active={tab==="announcements"} onClick={()=>setTab("announcements")}/>
        <Pill label="Upcoming Events" active={tab==="events"} onClick={()=>setTab("events")} color={C.violet2}/>
      </div>

      {tab === "announcements" && (
        <div style={{ display:"grid", gridTemplateColumns: mob?"1fr":"1fr 1fr", gap:20 }}>
          {/* Form */}
          <Card>
            <h3 style={{ margin:"0 0 16px", fontWeight:700, fontSize:14, color:C.ink }}>New Announcement</h3>
            <Inp label="Title" value={aForm.title} onChange={v=>setAForm({...aForm,title:v})} placeholder="e.g. Sunday Worship Service" required/>
            <Inp label="Body" value={aForm.body} onChange={v=>setAForm({...aForm,body:v})} placeholder="Details…"/>
            <Inp label="Tag" value={aForm.tag} onChange={v=>setAForm({...aForm,tag:v})} options={TAG_OPTIONS}/>
            <Inp label="Date / Schedule" value={aForm.date} onChange={v=>setAForm({...aForm,date:v})} placeholder="e.g. June 2, 2026 or Every Saturday"/>
            <Btn label={saving?"Saving…":"Post Announcement"} icon={Ico.send} onClick={addAnnouncement} full/>
          </Card>

          {/* List */}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {announcements.length === 0
              ? <p style={{ color:C.mist, fontSize:13 }}>No announcements yet.</p>
             : announcements.map(a => {
                const color = TAG_COLORS[a.tag] || TAG_COLORS.Default;
                return (
                  <Card key={a.id} hoverable
                    onClick={() => setSelectedAnnouncement(a)}
                    style={{ borderLeft:`3px solid ${color}`, padding:"14px 16px", cursor:"pointer" }}>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"flex-start", marginBottom:5, gap:8 }}>
                      <strong style={{ fontSize:14, color:C.ink }}>{a.title}</strong>
                      {a.tag && <Badge label={a.tag} color={color}/>}
                    </div>
                    <p style={{ margin:"0 0 5px", fontSize:13, color:C.slate, lineHeight:1.5 }}>
                      {a.body?.length > 80 ? a.body.slice(0, 80) + "…" : a.body}
                    </p>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", marginTop:8 }}>
                      <span style={{ fontSize:11, color:C.mist }}>{a.date}</span>
                      <span style={{ fontSize:11, color, fontWeight:600 }}>Tap to read more →</span>
                    </div>
                    {/* Reactions row — stop propagation so clicking emoji doesn't open modal */}
                    <div onClick={e => e.stopPropagation()} style={{ marginTop:10, paddingTop:10,
                      borderTop:`1px solid ${C.fog}` }}>
                      <InlineReactions
                        table="announcement_reactions"
                        idField="announcement_id"
                        rowId={a.id}
                        user={user}
                      />
                    </div>
                  </Card>
                );
              })
            }
          </div>
        </div>
      )}

      {tab === "events" && (
        <div style={{ display:"grid", gridTemplateColumns: mob?"1fr":"1fr 1fr", gap:20 }}>
          {/* Form */}
          <Card>
            <h3 style={{ margin:"0 0 16px", fontWeight:700, fontSize:14, color:C.ink }}>New Upcoming Event</h3>
            <Inp label="Name" value={eForm.name} onChange={v=>setEForm({...eForm,name:v})} placeholder="e.g. Youth Praise Night" required/>
            <Inp label="Type" value={eForm.type} onChange={v=>setEForm({...eForm,type:v})} options={TYPE_OPTIONS}/>
            <Inp label="Date" value={eForm.date} onChange={v=>setEForm({...eForm,date:v})} placeholder="e.g. June 14"/>
            <Inp label="Branch" value={eForm.branch} onChange={v=>setEForm({...eForm,branch:v})} options={["", ...BRANCHES]}/>
            <Btn label={saving?"Saving…":"Add Event"} icon={Ico.plus} onClick={addEvent} full color={C.violet2}/>
          </Card>

          {/* List */}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {events.length === 0
              ? <p style={{ color:C.mist, fontSize:13 }}>No upcoming events yet.</p>
              : events.map(e => {
                  const cfg = e.type==="birthday"
                    ? { color:C.rose2,   I:Ico.cake }
                    : e.type==="worship"
                    ? { color:C.blue,    I:Ico.sparkle }
                    : { color:C.violet2, I:Ico.calendar };
                  return (
                    <Card key={e.id} style={{ padding:"12px 14px", display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:36, height:36, borderRadius:R.sm, background:cfg.color+"22", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <cfg.I size={16} color={cfg.color}/>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:C.ink }}>{e.name}</div>
                        <div style={{ fontSize:11, color:C.mist }}>{e.date}{e.branch ? ` · ${e.branch}` : ""}</div>
                      </div>
                      <button onClick={()=>deleteEvent(e.id)}
                        style={{ border:"none", background:C.rose3, borderRadius:R.sm, padding:"6px 8px", cursor:"pointer" }}>
                        <Ico.trash size={13} color={C.rose2}/>
                      </button>
                    </Card>
                  );
                })
            }
          </div>
        </div>
      )}

    </div>
  );
};

/* ── FINANCE ──────────────────────────── */
const FinancePage = ({ role, user, bg }) => {
  const isAdmin = role!=="regular";
  const [tab, setTab] = useState("overview");
  const [form, setForm] = useState({ type:"Tithes", amount:"", note:"" });
  const [done, setDone] = useState(false);
  const [records, setRecords] = useState([]);
  const mob = useIsMobile();

  useEffect(() => {
  let q;
  if (role === "superadmin") {
    // all branches
    q = supabase.from("giving")
      .select("*, members(name, branch)")
      .order("created_at", { ascending: false });
  } else if (role === "admin") {
    // their branch only
    q = supabase.from("giving")
      .select("*, members(name, branch)")
      .eq("branch_id", user.branchId)
      .order("created_at", { ascending: false });
  } else {
    // their own records only
    q = supabase.from("giving")
      .select("*")
      .eq("member_id", user.memberId)
      .order("created_at", { ascending: false });
  }
  q.then(({ data }) => { if (data) setRecords(data); });
  }, []);

  const myData = records;
  const myTotal = myData.reduce((a,f)=>a+f.amount,0);
  const pts = Math.floor(myTotal/100)*5;
  const totals = FINANCE_TYPES.map(t=>({ type:t, total:records.filter(f=>f.type===t).reduce((a,f)=>a+f.amount,0) }));
  const grandTotal = records.reduce((a,f)=>a+f.amount,0);

  return (
    <div style={ bg ? {
      backgroundImage: `linear-gradient(rgba(232,237,245,.93), rgba(232,237,245,.93)), url(${bg})`,
      backgroundSize:"cover", backgroundPosition:"center",
      backgroundAttachment:"fixed", minHeight:"100%", margin:-28, padding:28,
    } : {}}>
      <h2 style={{ margin:"0 0 16px", fontWeight:800, fontSize:20, color:C.ink }}>Finance</h2>
      <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
        {["overview","give",...(isAdmin?["records"]:[])]
          .map(t=><Pill key={t} label={t==="give"?"Submit Giving":t.charAt(0).toUpperCase()+t.slice(1)} active={tab===t} onClick={()=>setTab(t)}/>)}
      </div>

      {tab==="overview" && (
  <>
    {/* ── Hero Total ── */}
    <Card style={{ background:"linear-gradient(135deg,${churchColor},${churchColor}99)", border:"none", marginBottom:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ color:"rgba(255,255,255,.6)", fontSize:12, marginBottom:4 }}>
            {isAdmin ? "Total Collected" : "My Total Giving"} — {new Date().toLocaleString("default",{month:"long",year:"numeric"})}
          </div>
          <div style={{ color:"#fff", fontSize:38, fontWeight:800, letterSpacing:-1, lineHeight:1 }}>
            ₱{grandTotal.toLocaleString()}
          </div>
          <div style={{ color:"rgba(255,255,255,.5)", fontSize:12, marginTop:6 }}>
            {records.length} transaction{records.length!==1?"s":""} recorded
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <TreeGrowth points={pts+200} size={64}/>
          {!isAdmin && <div style={{ color:"rgba(255,255,255,.6)", fontSize:11, marginTop:4 }}>{pts} faithfulness pts</div>}
        </div>
      </div>
    </Card>

    {/* ── Stat Tiles ── */}
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:12, marginBottom:16 }}>
      {isAdmin ? (
        <>
          <StatTile icon={Ico.finance} label="Total Collected"  value={`₱${grandTotal.toLocaleString()}`}             color={C.green}/>
          <StatTile icon={Ico.users}   label="Contributors"     value={new Set(records.map(f=>f.member_id)).size}      color={C.blue}/>
          <StatTile icon={Ico.report}  label="Transactions"     value={records.length}                                 color={C.violet2}/>
          <StatTile icon={Ico.finance} label="Avg per Giver"
            value={`₱${new Set(records.map(f=>f.member_id)).size
              ? Math.round(grandTotal/new Set(records.map(f=>f.member_id)).size).toLocaleString()
              : 0}`}
            color={C.amber}/>
        </>
      ) : (
        <>
          <StatTile icon={Ico.finance}    label="Total Given"       value={`₱${myTotal.toLocaleString()}`} color={C.green}/>
          <StatTile icon={Ico.report}     label="Transactions"      value={records.length}                  color={C.blue}/>
          <StatTile icon={Ico.star}       label="Faith Points"      value={`${pts} pts`}                    color={C.amber2}/>
          <StatTile icon={Ico.attendance} label="Giving Streak"
            value={`${Math.min(records.length,4)} wks`}
            color={C.violet2}/>
        </>
      )}
    </div>

    {/* ── Giving Breakdown ── */}
    <Card>
      <h3 style={{ margin:"0 0 16px", fontWeight:700, fontSize:14, color:C.ink }}>Giving Breakdown</h3>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {totals.filter(t=>t.total>0).length === 0
          ? <div style={{ textAlign:"center", padding:"24px 0", color:C.mist, fontSize:13 }}>No giving records yet.</div>
          : totals.map((t,i)=>{
            const colors=[C.blue,C.violet2,C.green,C.amber,C.rose2,"#0891B2","#D97706"];
            const c = colors[i%colors.length];
            const pct = grandTotal ? Math.round(t.total/grandTotal*100) : 0;
            return (
              <div key={t.type}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:c, flexShrink:0 }}/>
                    <span style={{ fontSize:13, fontWeight:500, color:C.ink }}>{t.type}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:11, color:C.mist }}>{pct}%</span>
                    <span style={{ fontWeight:700, color:c, fontSize:13, minWidth:80, textAlign:"right" }}>
                      ₱{t.total.toLocaleString()}
                    </span>
                  </div>
                </div>
                <Bar value={t.total} max={Math.max(...totals.map(x=>x.total))||1} color={c} height={8}/>
              </div>
            );
          })
        }
      </div>

      {/* Totals footer */}
      {grandTotal > 0 && (
        <div style={{ marginTop:18, paddingTop:14, borderTop:`1px solid ${C.fog}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:12, color:C.slate, fontWeight:600 }}>Grand Total</span>
          <span style={{ fontSize:18, fontWeight:800, color:C.ink }}>₱{grandTotal.toLocaleString()}</span>
        </div>
      )}
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
              <Btn label="Submit Giving" icon={Ico.send} onClick={async () => {
                  if (!form.amount || !form.type) return;
                  
                  // Check memberId before insert
                  if (!user.memberId) {
                    alert("Your account isn't linked to a member record. Ask an admin to link your profile.");
                    return;
                  }

                  const { data, error } = await supabase
                    .from("giving")
                    .insert([{
                      type: form.type,
                      amount: parseFloat(form.amount),
                      note: form.note,
                      date: new Date().toISOString().split("T")[0],
                      member_id: user.memberId,
                    }])
                    .select("*, members(name, branch)")
                    .single();

                  console.log("giving insert →", { data, error });
                  if (error) alert("Failed: " + error.message);
                  else {
                    setDone(true);
                    setForm({ type:"Tithes", amount:"", note:"" });
                    setRecords(prev => [data, ...prev]);  // ← data now has members populated
                    logAction("finance_submitted", `₱${form.amount} ${form.type}`, "giving", data.id);
                  }
                }} full/>
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
                {records.length === 0
                  ? <tr><td colSpan={5} style={{ padding:"24px 16px", color:C.mist, textAlign:"center" }}>No records yet.</td></tr>
                  : records.map((f,i)=>(
                    <tr key={f.id||i} style={{ borderTop:`1px solid ${C.fog}` }}>
                      <td style={{ padding:"11px 16px" }}><div style={{ display:"flex",alignItems:"center",gap:8 }}><Av name={f.members?.name||"—"} size={26}/><span style={{fontWeight:500,color:C.ink}}>{f.members?.name||"—"}</span></div></td>
                      <td style={{ padding:"11px 16px" }}><Badge label={f.type} color={C.blue}/></td>
                      <td style={{ padding:"11px 16px", fontWeight:700, color:C.green }}>₱{(f.amount||0).toLocaleString()}</td>
                      <td style={{ padding:"11px 16px", color:C.mist }}>{f.date}</td>
                      <td style={{ padding:"11px 16px", color:C.mist, fontSize:12 }}>{f.members?.branch||"—"}</td>
                    </tr>
                  ))
                }
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

/* ── MY QR (regular member) ──────────────────────────── */
const MyQRPage = ({ user }) => {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);

  useEffect(() => {
    const fetchMember = async () => {
      if (!user.memberId) { setLoading(false); return; }
      const { data } = await supabase
        .from("members").select("*").eq("id", user.memberId).maybeSingle();
      if (data) setMember(data);
      setLoading(false);
    };
    fetchMember();
  }, [user.memberId]);

  useEffect(() => {
    if (!member || !canvasRef.current) return;
    const qrValue = `jil://member?code=${member.member_code}&name=${encodeURIComponent(member.name)}&branch=${encodeURIComponent(member.branch || "")}`;
    QRCode.toCanvas(canvasRef.current, qrValue, {
      width: 260,
      margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
      errorCorrectionLevel: "H",
    }).catch(err => console.error("QR error:", err));
  }, [member]);

  const download = () => {
  if (!canvasRef.current) return;
  const qrCanvas = canvasRef.current;
  const qrSize = 200;
  const padding = 24;
  const footerHeight = 52;
  const cardW = qrSize + padding * 2;
  const cardH = qrSize + padding * 2 + footerHeight;

  const out = document.createElement("canvas");
  out.width = cardW;
  out.height = cardH;
  const ctx = out.getContext("2d");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, cardW, cardH);

  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(1, 1, cardW - 2, cardH - 2);

  ctx.drawImage(qrCanvas, padding, padding, qrSize, qrSize);

  ctx.strokeStyle = "#E8EDF5";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding + qrSize + 12);
  ctx.lineTo(cardW - padding, padding + qrSize + 12);
  ctx.stroke();

  ctx.fillStyle = "#0A0F1E";
  ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(member.name.toUpperCase(), cardW / 2, padding + qrSize + 30);

  ctx.fillStyle = "#94A3B8";
  ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText(member.member_code, cardW / 2, padding + qrSize + 46);

  const link = document.createElement("a");
  link.href = out.toDataURL("image/png");
  link.download = `${member.name.replace(/\s+/g, "-")}-QR.png`;
  link.click();
};

  const rank = getRank(member?.points || 0);

  if (loading) return (
    <div style={{ textAlign:"center", padding:"60px 0", color:C.mist }}>
      Loading your QR…
    </div>
  );

  if (!member) return (
    <div style={{ textAlign:"center", padding:"60px 0", color:C.mist }}>
      <div style={{ fontSize:14 }}>No member record found for <strong>{user.name}</strong>.</div>
      <div style={{ fontSize:12, marginTop:8 }}>Ask your admin to add you to the members list.</div>
    </div>
  );

  return (
    <div>
      <h2 style={{ margin:"0 0 20px", fontWeight:800, fontSize:20, color:C.ink }}>My QR Code</h2>

      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20 }}>

        {/* ── QR Card — printed card style ── */}
        <div style={{
          background: "#ffffff",
          border: "5px solid #000000",
          borderRadius: 4,
          padding: "28px 28px 0 28px",
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          boxShadow: SH.lg,
        }}>
          <canvas ref={canvasRef} style={{ display:"block" }}/>
          <div style={{
            padding: "16px 8px 20px",
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: 1.5,
            color: "#000000",
            textTransform: "uppercase",
            textAlign: "center",
            fontFamily: "Arial, Helvetica, sans-serif",
            maxWidth: 260,
            lineHeight: 1.3,
          }}>
            {member.name}
          </div>
        </div>

        {/* Member detail tiles */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8,
          width:"100%", maxWidth:320 }}>
          {[
            { label:"Member Code", value: member.member_code },
            { label:"Branch",      value: member.branch?.split("–")[0].trim() },
            { label:"Category",    value: member.category },
            { label:"Rank",        value: `${rank.name} · ${member.points || 0} pts`, color: rank.color },
          ].map(item => (
            <div key={item.label} style={{ background:C.fog, borderRadius:R.md, padding:"10px 12px" }}>
              <div style={{ fontSize:10, color:C.mist, fontWeight:600,
                textTransform:"uppercase", letterSpacing:.4 }}>
                {item.label}
              </div>
              <div style={{ fontSize:13, color: item.color || C.ink, fontWeight:600, marginTop:3 }}>
                {item.value || "—"}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background:C.fog, borderRadius:R.md, padding:"12px 14px", fontSize:12,
          color:C.slate, textAlign:"center", lineHeight:1.6, maxWidth:320 }}>
          Present this QR code at the entrance for instant check-in.
        </div>

        <button onClick={download}
          style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 28px",
            borderRadius:R.full, background:C.ink, color:C.white, border:"none",
            fontWeight:700, fontSize:14, cursor:"pointer", boxShadow:SH.sm }}>
          ⬇ Download QR Card
        </button>

      </div>
    </div>
  );
};

/* ── QR SCANNER (superadmin) ──────────────────────────── */
const ScannerPage = ({ role }) => {
  const [log,    setLog]    = useState([]);
  const [toast, setToast] = useState(null);
  const [manual, setManual] = useState("");
  const [today,  setToday]  = useState(() => {
    const d = new Date();
    const pad = n => String(n).padStart(2,"0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  });
  const mob = useIsMobile();

  const recordAttendance = async (parsed) => {
  if (!parsed.code) return { status: "unknown" };

  const { data: member } = await supabase
    .from("members")
    .select("id, name, points, branch_id")
    .eq("member_code", parsed.code)
    .maybeSingle();
  if (!member) return { status: "not_found" };

  const { data: existing } = await supabase
    .from("attendance").select("id")
    .eq("member_id", member.id).eq("service_date", today).maybeSingle();
  if (existing) return { status: "already" };

  // Find the active service event for today
  const { data: eventRow } = await supabase
    .from("service_events")
    .select("id")
    .eq("date", today)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("attendance").insert({
    member_id:    member.id,
    branch_id:    member.branch_id || null,
    event_id:     eventRow?.id || null,
    service_date: today,
    present:      true,
  });

  if (error) return { status: "error", msg: error.message };

  await supabase.from("members")
    .update({ points: (member.points || 0) + 10 })
    .eq("id", member.id);

    const logErr = await logAction(
    "attendance_recorded",
    `${member.name || parsed.name} checked in`,
    "attendance",
    member.id
  );
  if (logErr) setToast({ msg: "LOG ERR: " + logErr.message, type: "error" });
  else setToast({ msg: "Log OK ✓", type: "success" });
  return { status: "ok", logErr };
};

  const handleScan = useCallback(async (raw) => {
    let parsed = { raw };
    try {
      const url = new URL(raw.replace("jil://", "https://jil.local/"));
      parsed = {
        raw,
        code:   url.searchParams.get("code"),
        name:   decodeURIComponent(url.searchParams.get("name")   || ""),
        branch: decodeURIComponent(url.searchParams.get("branch") || ""),
      };
    } catch { /* not a structured URL */ }
    const result = await recordAttendance(parsed);
    const status = result?.status || "unknown";
    setLog(prev => {
      if (prev.length && prev[0].raw === raw && Date.now() - prev[0].ts < 3000) return prev;
      return [{ ...parsed, ts: Date.now(), status }, ...prev].slice(0, 20);
    });
    if (status === "ok") {
  const logMsg = result.logErr ? ` | LOG ERR: ${result.logErr.message}` : " | Log OK ✓";
  setToast({ msg:`${parsed.name || "Member"} checked in ✓${logMsg}`, type: result.logErr ? "error" : "success" });
}
    if (status === "already")   setToast({ msg:`${parsed.name || "Member"} already checked in`, type:"warn" });
    if (status === "not_found") setToast({ msg:"Member not found", type:"error" });
    if (status === "error")     setToast({ msg:"Check-in failed", type:"error" });
  }, [today]);

  const submitManual = () => {
    if (!manual.trim()) return;
    handleScan(manual.trim());
    setManual("");
  };

  const statusLabel = (s) => {
    if (s === "ok")        return { label:"Checked In ✓", color:C.green };
    if (s === "already")   return { label:"Already In",    color:C.amber };
    if (s === "not_found") return { label:"Not Found",     color:C.rose2 };
    if (s === "error")     return { label:"Error",         color:C.rose2 };
    return                        { label:"Logged",         color:C.slate };
  };

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)}/>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:18, flexWrap:"wrap", gap:10 }}>
        <h2 style={{ margin:0, fontWeight:800, fontSize:20, color:C.ink }}>QR Attendance Scanner</h2>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:12, color:C.slate }}>Service Date:</span>
          <input type="date" value={today} onChange={e=>setToday(e.target.value)}
            style={{ padding:"7px 12px", borderRadius:R.full, border:`1.5px solid ${C.cloud}`,
              fontSize:13, outline:"none", color:C.ink }}/>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns: mob?"1fr":"1fr 1fr", gap:20 }}>
        <Card>
          <h3 style={{ margin:"0 0 14px", fontWeight:700, fontSize:14, color:C.ink }}>Camera Scanner</h3>
          <QRScanner onResult={handleScan}/>
          <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${C.fog}` }}>
            <div style={{ fontSize:12, fontWeight:600, color:C.slate, marginBottom:8 }}>Manual Entry (fallback)</div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={manual} onChange={e=>setManual(e.target.value)}
                placeholder="Paste member code or QR data…"
                style={{ flex:1, padding:"9px 14px", borderRadius:R.full,
                  border:`1.5px solid ${C.cloud}`, fontSize:13, outline:"none", color:C.ink }}/>
              <Btn label="Add" sm onClick={submitManual}/>
            </div>
          </div>
        </Card>

        <Card style={{ padding:0, overflow:"hidden" }}>
          <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.fog}`,
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <h3 style={{ margin:0, fontWeight:700, fontSize:14, color:C.ink }}>Scan Log</h3>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {log.length > 0 && <Badge label={`${log.length} scanned`} color={C.green}/>}
              {log.length > 0 && <Btn label="Clear" outline sm onClick={()=>setLog([])}/>}
            </div>
          </div>
          {log.length === 0 ? (
            <div style={{ padding:"40px 20px", textAlign:"center", color:C.mist }}>
              <Ico.scan size={36} color={C.cloud}/>
              <div style={{ marginTop:10, fontSize:13 }}>No scans yet. Point the camera at a member's QR code.</div>
            </div>
          ) : (
            <div style={{ maxHeight:420, overflowY:"auto" }}>
              {log.map((s,i) => {
                const st = statusLabel(s.status);
                return (
                  <div key={s.ts} style={{ display:"flex", alignItems:"center", gap:12,
                    padding:"12px 20px", borderTop: i>0?`1px solid ${C.fog}`:"none",
                    background: s.status==="ok"?`${C.green}06`:s.status==="already"?`${C.amber}06`:C.white }}>
                    {s.name ? <Av name={s.name} size={34}/> : (
                      <div style={{ width:34, height:34, borderRadius:"50%", background:C.fog,
                        display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Ico.qr size={15} color={C.mist}/>
                      </div>
                    )}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:13, color:C.ink,
                        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {s.name || "Unrecognized code"}
                      </div>
                      <div style={{ fontSize:11, color:C.mist, whiteSpace:"nowrap",
                        overflow:"hidden", textOverflow:"ellipsis" }}>
                        {s.code ? `${s.code} · ${s.branch}` : s.raw}
                      </div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3, flexShrink:0 }}>
                      <Badge label={st.label} color={st.color}/>
                      <span style={{ fontSize:11, color:C.mist }}>
                        {new Date(s.ts).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {log.length > 0 && (
            <div style={{ padding:"12px 20px", borderTop:`1px solid ${C.fog}`,
              display:"flex", gap:16, background:C.fog }}>
              {[
                { label:"Checked In", color:C.green, count:log.filter(s=>s.status==="ok").length },
                { label:"Already In", color:C.amber, count:log.filter(s=>s.status==="already").length },
                { label:"Not Found",  color:C.rose2, count:log.filter(s=>s.status==="not_found").length },
              ].map(x => (
                <div key={x.label} style={{ textAlign:"center" }}>
                  <div style={{ fontWeight:700, fontSize:16, color:x.color }}>{x.count}</div>
                  <div style={{ fontSize:10, color:C.mist }}>{x.label}</div>
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
  const [branches, setBranches] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name:"", address:"", parent_id:"" });
  const [saving, setSaving] = useState(false);
  const colors=[C.blue,C.violet2,C.green,C.amber,C.rose2];
  const [toast, setToast] = useState(null);

  useEffect(() => {
    supabase.from("branches").select("*").order("name")
      .then(({ data }) => { if (data) setBranches(data); });
  }, []);

  const mainBranches = branches.filter(b => !b.parent_id);
  const subOf = (parentId) => branches.filter(b => b.parent_id === parentId);

  const [editModal, setEditModal] = useState(false);
const [editTarget, setEditTarget] = useState(null);
const [editForm, setEditForm] = useState({ name:"", address:"", parent_id:"" });

const openEdit = (b) => {
  setEditTarget(b);
  setEditForm({ name:b.name, address:b.address||"", parent_id:b.parent_id||"" });
  setEditModal(true);
};

const saveBranch = async () => {
  setSaving(true);
  const { error } = await supabase.from("branches").update({
    name: editForm.name,
    address: editForm.address,
    parent_id: editForm.parent_id || null,
  }).eq("id", editTarget.id);
  if (error) setToast({ msg:"Failed: " + error.message, type:"error" });
  else {
    setBranches(prev => prev.map(b => b.id===editTarget.id ? {...b,...editForm} : b));
    setEditModal(false);
    setToast({ msg:`"${editForm.name}" updated!`, type:"success" });
    logAction("branch_updated", `Updated "${editForm.name}"`, "branch", editTarget.id);
  }
  setSaving(false);
};

const deleteBranch = async (b) => {
  if (!confirm(`Delete "${b.name}"? Sub-branches will become root branches.`)) return;
  const { error } = await supabase.from("branches").delete().eq("id", b.id);
  if (error) {
    setToast({ msg:"Failed: " + error.message, type:"error" });
  } else {
    setBranches(prev => prev.filter(x => x.id !== b.id));
    setToast({ msg:`"${b.name}" deleted`, type:"warn" });
    logAction("branch_deleted", `Deleted "${b.name}"`, "branch", b.id);
  }
};
  
  const addBranch = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("branches")
      .insert([{ name: form.name, address: form.address, parent_id: form.parent_id || null }])
      .select().single();
     if (error) setToast({ msg:"Failed: " + error.message, type:"error" });
    else {
      setBranches(prev => [...prev, data]);
      setForm({ name:"", address:"", parent_id:"" });
      setModal(false);
      setToast({ msg:`"${data.name}" branch added!`, type:"success" });
      logAction("branch_added", `Added "${data.name}"`, "branch", data.id);
    }
    setSaving(false);
  };

  return (
    <div>

    {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <h2 style={{ margin:0, fontWeight:800, fontSize:20, color:C.ink }}>Church Branches</h2>
        <Btn label="Add Branch" icon={Ico.plus} onClick={()=>setModal(true)} sm/>
      </div>

      {mainBranches.map((b, i) => {
        const subs = subOf(b.id);
        return (
          <div key={b.id} style={{ marginBottom:16 }}>
            {/* Main branch card */}
            <Card style={{ borderLeft:`4px solid ${colors[i%colors.length]}`, marginBottom: subs.length ? 0 : 0, borderBottomLeftRadius: subs.length ? 0 : R.xl, borderBottomRightRadius: subs.length ? 0 : R.xl }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:42, height:42, borderRadius:R.md, background:`${colors[i%colors.length]}12`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Ico.map size={20} color={colors[i%colors.length]}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:15, color:C.ink }}>{b.name}</div>
                  {b.address && <div style={{ fontSize:12, color:C.mist }}>{b.address}</div>}
                </div>
                  <Badge label={`${subs.length} sub-branch${subs.length!==1?"es":""}`} color={colors[i%colors.length]}/>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={()=>openEdit(b)} style={{ border:"none", background:C.blue3, borderRadius:R.sm, padding:"5px 10px", cursor:"pointer", fontSize:11, color:C.blue, fontWeight:600 }}>Edit</button>
                  <button onClick={()=>deleteBranch(b)} style={{ border:"none", background:C.rose3, borderRadius:R.sm, padding:"5px 10px", cursor:"pointer", fontSize:11, color:C.rose2, fontWeight:600 }}>Delete</button>
                </div>
              </div>
            </Card>

            {/* Sub-branches */}
            {subs.map((s, si) => (
              <div key={s.id} style={{ display:"flex", marginLeft:24 }}>
                {/* Connector line */}
                <div style={{ width:24, display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
                  <div style={{ width:2, flex:1, background:C.fog }}/>
                  <div style={{ width:16, height:2, background:C.fog }}/>
                  {si < subs.length-1 && <div style={{ width:2, flex:1, background:C.fog }}/>}
                </div>
                <Card style={{ flex:1, marginBottom: si < subs.length-1 ? 6 : 0, padding:"12px 16px", background:C.fog, border:"none", boxShadow:"none", borderRadius:R.md }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <Ico.branch size={15} color={C.slate}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:13, color:C.ink }}>{s.name}</div>
                      {s.address && <div style={{ fontSize:11, color:C.mist }}>{s.address}</div>}
                    </div>
                    <Badge label="Sub-branch" color={C.slate}/>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>openEdit(s)} style={{ border:"none", background:C.blue3, borderRadius:R.sm, padding:"5px 10px", cursor:"pointer", fontSize:11, color:C.blue, fontWeight:600 }}>Edit</button>
                      <button onClick={()=>deleteBranch(s)} style={{ border:"none", background:C.rose3, borderRadius:R.sm, padding:"5px 10px", cursor:"pointer", fontSize:11, color:C.rose2, fontWeight:600 }}>Delete</button>
                    </div>
                    </div>
                </Card>
              </div>
            ))}
          </div>
        );
      })}

      {/* Add Branch Modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title="Add Branch / Sub-branch">
              <Inp label="Branch Name" value={form.name} onChange={v=>setForm({...form,name:v})} placeholder="e.g. Barangay Sto. Tomas" required/>
              <Inp label="Address (optional)" value={form.address} onChange={v=>setForm({...form,address:v})} placeholder="e.g. Sto. Tomas, Pinamalayan"/>
              <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:14 }}>
        <label style={{ fontSize:12, fontWeight:600, color:C.slate }}>Parent Branch (leave blank for main branch)</label>
        <select value={form.parent_id} onChange={e=>setForm({...form,parent_id:e.target.value})}
          style={{ padding:"10px 14px", border:`1.5px solid ${C.fog}`, borderRadius:R.md, fontSize:14, outline:"none", background:C.white, color:C.ink }}>
          <option value="">— Main Branch (no parent) —</option>
          {mainBranches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
        {/* Show branch names instead of IDs */}
        {form.parent_id && (
          <div style={{ marginTop:-10, marginBottom:14, fontSize:12, color:C.green }}>
            ✓ Sub-branch of: {mainBranches.find(b=>b.id===form.parent_id)?.name}
          </div>
        )}
        <Btn label={saving?"Saving…":"Add Branch"} icon={Ico.plus} onClick={addBranch} full/>
      </Modal>
        <Modal open={editModal} onClose={()=>setEditModal(false)} title="Edit Branch">
  <Inp label="Branch Name" value={editForm.name} onChange={v=>setEditForm({...editForm,name:v})} required/>
  <Inp label="Address (optional)" value={editForm.address} onChange={v=>setEditForm({...editForm,address:v})}/>
  <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:14 }}>
    <label style={{ fontSize:12, fontWeight:600, color:C.slate }}>Parent Branch</label>
    <select value={editForm.parent_id} onChange={e=>setEditForm({...editForm,parent_id:e.target.value})}
      style={{ padding:"10px 14px", border:`1.5px solid ${C.fog}`, borderRadius:R.md, fontSize:14, outline:"none", background:C.white, color:C.ink }}>
      <option value="">— Main Branch (no parent) —</option>
      {mainBranches.filter(b=>b.id!==editTarget?.id).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
    </select>
  </div>
  <Btn label={saving?"Saving…":"Save Changes"} icon={Ico.check} onClick={saveBranch} full/>
</Modal>
    </div>
  );
};

const UserManagementPage = ({ role }) => {
  const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name:"", email:"", password:"", role:"regular", branch_id:"", member_id:"" });
  const [branches, setBranches] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [memberSearch, setMemberSearch] = useState("");
  const mob = useIsMobile();

  useEffect(() => {
    const fetchAllMembers = async () => {
      let all = [];
      let from = 0;
      const CHUNK = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("members")
          .select("id, name, member_code")
          .order("name", { ascending: true })
          .range(from, from + CHUNK - 1);
        if (error || !data || data.length === 0) break;
        all = [...all, ...data];
        if (data.length < CHUNK) break;
        from += CHUNK;
      }
      return all;
    };

    Promise.all([
      supabase.from("profiles").select("id, name, username, role, branch_id, member_id, branches(name)").order("name"),
      fetchAllMembers(),
      supabase.from("branches").select("id, name").order("name"),
    ]).then(([u, m, b]) => {
      if (u.data) setUsers(u.data);
      setMembers(m);
      if (b.data) setBranches(b.data);
      setLoading(false);
    });
  }, []);

  const openEdit = (u) => {
    setSelected(u);
    setForm({ name:u.name||"", email:u.email||"", password:"", role:u.role||"regular", branch_id:u.branch_id||"", member_id:u.member_id||"" });
    setModal("edit");
  };

  const openInvite = () => {
    setSelected(null);
    setForm({ name:"", email:"", password:"", role:"regular", branch_id:"", member_id:"" });
    setModal("invite");
  };

  const saveUser = async () => {
    setSaving(true);
    if (modal === "edit") {
      const { error } = await supabase.from("profiles").update({
        name: form.name,
        role: form.role,
        branch_id: form.branch_id || null,
        member_id: form.member_id || null,
      }).eq("id", selected.id);
      if (error) {
        setToast({ msg:"Update failed: " + error.message, type:"error" });
      } else {
        setUsers(prev => prev.map(u => u.id === selected.id
          ? { ...u, ...form, branches: branches.find(b=>b.id===form.branch_id) }
          : u
        ));
        setToast({ msg:`${form.name} updated`, type:"success" });
        logAction("user_updated", `Updated ${form.name}`, "user", selected.id);
        setModal(null);
      }
    } else {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        setToast({ msg:"Your session has expired. Please log out and back in.", type:"error" });
        setSaving(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-user", {
        headers: { Authorization: `Bearer ${accessToken}` },
        body: {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          branch_id: form.branch_id || null,
          member_id: form.member_id || null,
        },
      });
      if (error || data?.error) {
        setToast({ msg:"Create failed: " + (data?.error || error.message), type:"error" });
      } else {
        setUsers(prev => [...prev, {
          id: data.userId, name: form.name, email: form.email, role: form.role,
          branch_id: form.branch_id, member_id: form.member_id,
          branches: branches.find(b=>b.id===form.branch_id),
        }]);
        setToast({ msg:`${form.name} created successfully`, type:"success" });
        setModal(null);
        logAction("user_created", `Created ${form.name} (${form.email})`, "user", data.userId);
      }
    }
    setSaving(false);
  };

  const deactivateUser = async (u) => {
    if (!confirm(`Deactivate ${u.name}? They won't be able to log in.`)) return;
    const { error } = await supabase.from("profiles").update({ role:"deactivated" }).eq("id", u.id);
    if (error) { setToast({ msg:"Failed: " + error.message, type:"error" }); return; }
    setUsers(prev => prev.map(x => x.id===u.id ? {...x, role:"deactivated"} : x));
    setToast({ msg:`${u.name} deactivated`, type:"warn" });
    logAction("user_deactivated", `Deactivated ${u.name}`, "user", u.id);
  };

  const reactivateUser = async (u) => {
    const { error } = await supabase.from("profiles").update({ role:"regular" }).eq("id", u.id);
    if (error) { setToast({ msg:"Failed: " + error.message, type:"error" }); return; }
    setUsers(prev => prev.map(x => x.id===u.id ? {...x, role:"regular"} : x));
    setToast({ msg:`${u.name} re-activated`, type:"success" });
    logAction("user_activated", `Activated ${u.name}`, "user", u.id);
  };

  const deleteUser = async (u) => {
    if (!confirm(`Permanently delete ${u.name}? This cannot be undone.`)) return;
    const { error } = await supabase.from("profiles").delete().eq("id", u.id);
    if (error) { setToast({ msg:"Failed: " + error.message, type:"error" }); return; }
    setUsers(prev => prev.filter(x => x.id !== u.id));
    setToast({ msg:`${u.name} deleted`, type:"error" });
    logAction("user_deleted", `Deleted ${u.name}`, "user", u.id);
  };

  const updateRoleInline = async (u, newRole) => {
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", u.id);
    if (error) { setToast({ msg:"Failed: " + error.message, type:"error" }); return; }
    setUsers(prev => prev.map(x => x.id===u.id ? {...x, role:newRole} : x));
    setToast({ msg:`${u.name} → ${newRole}`, type:"success" });
    logAction("user_role_changed", `${u.name} → ${newRole}`, "user", u.id);
  };

  const resetPassword = async (u) => {
    const email = u.name;
    if (!email) {
      setToast({ msg:"No email found for this user", type:"error" });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) setToast({ msg:"Reset failed: " + error.message, type:"error" });
    else setToast({ msg:`Password reset sent to ${email}`, type:"success" });
  };

  const ROLE_COLORS = {
    superadmin: C.rose2, admin: C.violet2, regular: C.blue, deactivated: C.mist,
  };

  const filtered = users.filter(u => {
    const matchSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const filteredMembers = members.filter(m => {
    const q = memberSearch.toLowerCase();
    return m.name?.toLowerCase().includes(q) || m.member_code?.toLowerCase().includes(q);
  });

  const canResetPassword = role === "superadmin" || role === "admin";

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ margin:"0 0 2px", fontWeight:800, fontSize:20, color:C.ink }}>User Management</h2>
          <div style={{ fontSize:12, color:C.mist }}>{users.length} total accounts</div>
        </div>
        <Btn label="Invite User" icon={Ico.plus} onClick={openInvite} sm/>
      </div>

      {/* Search */}
      <div style={{ marginBottom:12 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search by name or email…"
          style={{ width:"100%", padding:"10px 14px", borderRadius:R.full, border:`1.5px solid ${C.cloud}`, fontSize:13, outline:"none", color:C.ink, boxSizing:"border-box" }}/>
      </div>

      {/* Role filter pills */}
      <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
        {[
          { key:"all",        label:`All (${users.length})` },
          { key:"superadmin", label:`Dev (${users.filter(u=>u.role==="superadmin").length})`, color:C.rose2 },
          { key:"admin",      label:`Admin (${users.filter(u=>u.role==="admin").length})`,     color:C.violet2 },
          { key:"regular",    label:`Member (${users.filter(u=>u.role==="regular").length})`,  color:C.blue },
          { key:"deactivated",label:`Disabled (${users.filter(u=>u.role==="deactivated").length})`, color:C.mist },
        ].map(f=>(
          <Pill key={f.key} label={f.label} active={filterRole===f.key}
            onClick={()=>setFilterRole(f.key)} color={f.color||C.blue}/>
        ))}
      </div>

      {/* ── MOBILE: Card list ── */}
      {mob ? (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:"28px 0", color:C.mist }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:"28px 0", color:C.mist }}>No users found.</div>
          ) : filtered.map(u => {
            const linkedMember = members.find(m=>m.id===u.member_id);
            return (
              <Card key={u.id} style={{ opacity: u.role==="deactivated"?.5:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                  <Av name={u.name||u.email} size={40}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, color:C.ink, fontSize:14 }}>{u.name||"—"}</div>
                    <div style={{ fontSize:11, color:C.mist, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email}</div>
                    {u.username && <div style={{ fontSize:11, color:C.blue, fontWeight:600 }}>@{u.username}</div>}
                  </div>
                  <Badge label={u.role==="superadmin"?"Dev":u.role} color={ROLE_COLORS[u.role]||C.slate}/>
                </div>

                <div style={{ fontSize:12, color:C.slate, marginBottom:10 }}>
                  <span>🏢 {u.branches?.name||"No branch"}</span>
                  {linkedMember && <span style={{ marginLeft:12, color:C.green }}>✓ {linkedMember.name}</span>}
                </div>

                {/* Inline role select */}
                <div style={{ marginBottom:10 }}>
                  <label style={{ fontSize:11, color:C.mist, fontWeight:600, textTransform:"uppercase", letterSpacing:.3 }}>Role</label>
                  <select value={u.role} onChange={e=>updateRoleInline(u, e.target.value)}
                    style={{ display:"block", marginTop:4, padding:"7px 12px", borderRadius:R.md, border:`1.5px solid ${C.fog}`, fontSize:13, outline:"none", background:C.white, color:C.ink, width:"100%" }}>
                    <option value="regular">Regular Member</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin / Dev</option>
                    <option value="deactivated">Deactivated</option>
                  </select>
                </div>

                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  <button onClick={()=>openEdit(u)} style={{ border:"none", background:C.blue3, borderRadius:R.sm, padding:"6px 12px", cursor:"pointer", fontSize:12, color:C.blue, fontWeight:600 }}>Edit</button>
                  {canResetPassword && <button onClick={()=>resetPassword(u)} style={{ border:"none", background:C.violet3, borderRadius:R.sm, padding:"6px 12px", cursor:"pointer", fontSize:12, color:C.violet, fontWeight:600 }}>Reset PW</button>}
                  {u.role==="deactivated"
                    ? <button onClick={()=>reactivateUser(u)} style={{ border:"none", background:C.green3, borderRadius:R.sm, padding:"6px 12px", cursor:"pointer", fontSize:12, color:C.green, fontWeight:600 }}>Activate</button>
                    : <button onClick={()=>deactivateUser(u)} style={{ border:"none", background:C.amber3, borderRadius:R.sm, padding:"6px 12px", cursor:"pointer", fontSize:12, color:C.amber, fontWeight:600 }}>Disable</button>
                  }
                  <button onClick={()=>deleteUser(u)} style={{ border:"none", background:C.rose3, borderRadius:R.sm, padding:"6px 12px", cursor:"pointer", fontSize:12, color:C.rose2, fontWeight:600 }}>Delete</button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ── DESKTOP: Table ── */
        <Card style={{ padding:0, overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:C.fog }}>
                  {["User","Username","Role","Branch","Linked Member","Actions"].map(h=>(
                    <th key={h} style={{ textAlign:"left", padding:"10px 16px", color:C.slate, fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:.4, whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding:"28px 16px", textAlign:"center", color:C.mist }}>Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding:"28px 16px", textAlign:"center", color:C.mist }}>No users found.</td></tr>
                ) : filtered.map(u => {
                  const linkedMember = members.find(m=>m.id===u.member_id);
                  return (
                    <tr key={u.id} style={{ borderTop:`1px solid ${C.fog}`, opacity:u.role==="deactivated"?.5:1 }}>
                      <td style={{ padding:"12px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <Av name={u.name||u.email} size={34}/>
                          <div>
                            <div style={{ fontWeight:600, color:C.ink }}>{u.name||"—"}</div>
                            <div style={{ fontSize:11, color:C.mist }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:"12px 16px", color:C.slate, fontSize:12 }}>
                        {u.username ? `${u.username}` : "—"}
                      </td>
                      {/* Inline role select */}
                      <td style={{ padding:"12px 16px" }}>
                        <select value={u.role} onChange={e=>updateRoleInline(u, e.target.value)}
                          style={{ padding:"5px 10px", borderRadius:R.md, border:`1.5px solid ${ROLE_COLORS[u.role]||C.cloud}`, fontSize:12, outline:"none", background:`${ROLE_COLORS[u.role]||C.slate}12`, color:ROLE_COLORS[u.role]||C.slate, fontWeight:600, cursor:"pointer" }}>
                          <option value="regular">Member</option>
                          <option value="admin">Admin</option>
                          <option value="superadmin">Dev / Super</option>
                          <option value="deactivated">Deactivated</option>
                        </select>
                      </td>
                      <td style={{ padding:"12px 16px", color:C.slate, fontSize:12 }}>{u.branches?.name||"—"}</td>
                      <td style={{ padding:"12px 16px" }}>
                        {linkedMember ? (
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <Ico.check size={12} color={C.green}/>
                            <span style={{ fontSize:12, color:C.green, fontWeight:600 }}>{linkedMember.name}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize:12, color:C.mist }}>Not linked</span>
                        )}
                      </td>
                      <td style={{ padding:"12px 16px" }}>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          <button onClick={()=>openEdit(u)} style={{ border:"none", background:C.blue3, borderRadius:R.sm, padding:"6px 10px", cursor:"pointer", fontSize:11, color:C.blue, fontWeight:600 }}>Edit</button>
                          {canResetPassword && (
                            <button onClick={()=>resetPassword(u)} style={{ border:"none", background:C.violet3, borderRadius:R.sm, padding:"6px 10px", cursor:"pointer", fontSize:11, color:C.violet, fontWeight:600 }}>Reset PW</button>
                          )}
                          {u.role==="deactivated"
                            ? <button onClick={()=>reactivateUser(u)} style={{ border:"none", background:C.green3, borderRadius:R.sm, padding:"6px 10px", cursor:"pointer", fontSize:11, color:C.green, fontWeight:600 }}>Activate</button>
                            : <button onClick={()=>deactivateUser(u)} style={{ border:"none", background:C.amber3, borderRadius:R.sm, padding:"6px 10px", cursor:"pointer", fontSize:11, color:C.amber, fontWeight:600 }}>Disable</button>
                          }
                          <button onClick={()=>deleteUser(u)} style={{ border:"none", background:C.rose3, borderRadius:R.sm, padding:"6px 10px", cursor:"pointer", fontSize:11, color:C.rose2, fontWeight:600 }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Edit / Invite Modal */}
      <Modal open={!!modal} onClose={()=>setModal(null)} title={modal==="invite"?"Invite New User":"Edit User"}>
        <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:14 }}>
          <label style={{ fontSize:12, fontWeight:600, color:C.slate }}>Link to Member Record</label>
          <input value={memberSearch} onChange={e=>setMemberSearch(e.target.value)}
            placeholder="Search members by name or code…"
            style={{ padding:"9px 14px", border:`1.5px solid ${C.cloud}`, borderRadius:R.md,
              fontSize:13, outline:"none", color:C.ink, marginBottom:6, boxSizing:"border-box" }}/>
          <select value={form.member_id} onChange={e=>{
              const memberId = e.target.value;
              const picked = members.find(m=>m.id===memberId);
              setForm({...form, member_id: memberId, ...(picked ? { name: picked.name } : {}) });
            }}
            style={{ padding:"10px 14px", border:`1.5px solid ${C.fog}`, borderRadius:R.md, fontSize:14, outline:"none", background:C.white, color:C.ink }}>
            <option value="">— Not linked —</option>
            {filteredMembers.map(m=><option key={m.id} value={m.id}>{m.name} ({m.member_code})</option>)}
          </select>
          {memberSearch && (
            <div style={{ fontSize:11, color:C.mist, marginTop:4 }}>
              {filteredMembers.length} match{filteredMembers.length!==1?"es":""}
            </div>
          )}
        </div>
        {form.member_id && (
          <div style={{ background:C.green3, borderRadius:R.md, padding:"10px 14px", fontSize:12, color:C.green, marginBottom:14 }}>
            ✓ Name auto-filled from member record. Giving, attendance, and QR will be linked to this member record.
          </div>
        )}
        {!form.member_id && (
          <Inp label="Full Name" value={form.name} onChange={v=>setForm({...form,name:v})} placeholder="Juan dela Cruz" required/>
        )}
        {modal==="invite" && (
          <>
            <Inp label="Email Address" value={form.email} onChange={v=>setForm({...form,email:v})} placeholder="juan@example.com" required/>
            <Inp label="Password" type="password" value={form.password} onChange={v=>setForm({...form,password:v})} placeholder="At least 6 characters" required/>
          </>
        )}
        <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:14 }}>
          <label style={{ fontSize:12, fontWeight:600, color:C.slate }}>Role</label>
          <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}
            style={{ padding:"10px 14px", border:`1.5px solid ${C.fog}`, borderRadius:R.md, fontSize:14, outline:"none", background:C.white, color:C.ink }}>
            <option value="regular">Regular Member</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Super Admin / Dev</option>
          </select>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:14 }}>
          <label style={{ fontSize:12, fontWeight:600, color:C.slate }}>Branch</label>
          <select value={form.branch_id} onChange={e=>setForm({...form,branch_id:e.target.value})}
            style={{ padding:"10px 14px", border:`1.5px solid ${C.fog}`, borderRadius:R.md, fontSize:14, outline:"none", background:C.white, color:C.ink }}>
            <option value="">— No branch assigned —</option>
            {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn label={saving?"Saving…":modal==="invite"?"Send Invite":"Save Changes"} icon={Ico.send} onClick={saveUser} full/>
          {modal==="edit" && canResetPassword && (
            <Btn label="Reset PW" outline color={C.violet} onClick={()=>{ resetPassword(selected); setModal(null); }}/>
          )}
        </div>
      </Modal>
    </div>
  );
};

/* ── FINANCE CATEGORIES ──────────────────────────── */
const FinanceCategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ name:"", description:"" });
  const [editForm, setEditForm] = useState({ name:"", description:"" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    supabase.from("finance_categories").select("*").order("name")
      .then(({ data }) => { if (data) setCategories(data); });
  }, []);

  const addCategory = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("finance_categories")
      .insert([{ name: form.name, description: form.description }])
      .select().single();
    if (error) setToast({ msg:"Failed: " + error.message, type:"error" });
    else {
      setCategories(prev => [...prev, data]);
      setForm({ name:"", description:"" });
      setModal(false);
      setToast({ msg:`"${data.name}" added!`, type:"success" });
      logAction("category_added", `Added "${data.name}"`, "finance_category", data.id);
    }
    setSaving(false);
  };

  const openEdit = (c) => {
    setEditTarget(c);
    setEditForm({ name:c.name, description:c.description||"" });
    setEditModal(true);
  };

  const saveCategory = async () => {
    setSaving(true);
    const { error } = await supabase.from("finance_categories").update({
      name: editForm.name,
      description: editForm.description,
    }).eq("id", editTarget.id);
    if (error) setToast({ msg:"Failed: " + error.message, type:"error" });
    else {
      setCategories(prev => prev.map(c => c.id === editTarget.id ? { ...c, ...editForm } : c));
      setEditModal(false);
      setToast({ msg:`"${editForm.name}" updated!`, type:"success" });
      logAction("category_updated", `Updated "${editForm.name}"`, "finance_category", editTarget.id);
    }
    setSaving(false);
  };

  const deleteCategory = async (c) => {
    if (!confirm(`Delete "${c.name}"?`)) return;
    const { error } = await supabase.from("finance_categories").delete().eq("id", c.id);
    if (error) setToast({ msg:"Failed: " + error.message, type:"error" });
    else {
      setCategories(prev => prev.filter(x => x.id !== c.id));
      setToast({ msg:`"${c.name}" deleted`, type:"warn" });
      logAction("category_deleted", `Deleted "${c.name}"`, "finance_category", c.id);
    }
  };

  const colors = [C.blue, C.violet2, C.green, C.amber, C.rose2, "#0891B2", "#D97706"];

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)}/>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <h2 style={{ margin:0, fontWeight:800, fontSize:20, color:C.ink }}>Finance Categories</h2>
        <Btn label="Add Category" icon={Ico.plus} onClick={() => setModal(true)} sm/>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10, maxWidth:560 }}>
        {categories.length === 0
          ? <p style={{ color:C.mist, fontSize:13 }}>No categories yet. Add one to get started.</p>
          : categories.map((c, i) => {
              const color = colors[i % colors.length];
              return (
                <Card key={c.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderLeft:`4px solid ${color}` }}>
                  <div style={{ width:38, height:38, borderRadius:R.md, background:`${color}12`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Ico.finance size={17} color={color}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:C.ink }}>{c.name}</div>
                    {c.description && <div style={{ fontSize:12, color:C.mist }}>{c.description}</div>}
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={() => openEdit(c)} style={{ border:"none", background:C.blue3, borderRadius:R.sm, padding:"5px 10px", cursor:"pointer", fontSize:11, color:C.blue, fontWeight:600 }}>Edit</button>
                    <button onClick={() => deleteCategory(c)} style={{ border:"none", background:C.rose3, borderRadius:R.sm, padding:"5px 10px", cursor:"pointer", fontSize:11, color:C.rose2, fontWeight:600 }}>Delete</button>
                  </div>
                </Card>
              );
            })
        }
      </div>

      {/* Add Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add Finance Category">
        <Inp label="Category Name" value={form.name} onChange={v => setForm({...form,name:v})} placeholder="e.g. Tithes" required/>
        <Inp label="Description (optional)" value={form.description} onChange={v => setForm({...form,description:v})} placeholder="e.g. Regular tithe giving"/>
        <Btn label={saving?"Saving…":"Add Category"} icon={Ico.plus} onClick={addCategory} full/>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Category">
        <Inp label="Category Name" value={editForm.name} onChange={v => setEditForm({...editForm,name:v})} required/>
        <Inp label="Description (optional)" value={editForm.description} onChange={v => setEditForm({...editForm,description:v})}/>
        <Btn label={saving?"Saving…":"Save Changes"} icon={Ico.check} onClick={saveCategory} full/>
      </Modal>
    </div>
  );
};

/* ── AUDIT LOG ──────────────────────────── */
const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => { if (data) setLogs(data); setLoading(false); });
  }, []);

  const ACTION_FILTERS = ["all","login","member_created","member_updated","finance_submitted","attendance_recorded","category_added","category_deleted","branch_added","branch_deleted","user_updated","user_role_changed","user_deactivated","user_activated","user_deleted"];

  const actionColor = (a) => {
    if (!a) return C.slate;
    if (a.includes("delete")) return C.rose2;
    if (a.includes("create") || a.includes("added")) return C.green;
    if (a.includes("update") || a.includes("edit")) return C.blue;
    if (a.includes("login")) return C.violet2;
    if (a.includes("submit") || a.includes("record")) return C.amber;
    return C.slate;
  };

  const filtered = filter === "all" ? logs : logs.filter(l => l.action === filter);

  return (
    <div>
      <h2 style={{ margin:"0 0 16px", fontWeight:800, fontSize:20, color:C.ink }}>Audit Log</h2>
      <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
        {ACTION_FILTERS.map(a => (
          <Pill key={a} label={a === "all" ? `All (${logs.length})` : a.replace(/_/g," ")}
            active={filter===a} onClick={()=>setFilter(a)} color={actionColor(a)}/>
        ))}
      </div>
      <Card style={{ padding:0, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:C.fog }}>
                {["User","Action","Details","Entity","When"].map(h=>(
                  <th key={h} style={{ textAlign:"left", padding:"10px 16px", color:C.slate, fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:.4, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                  <tr><td colSpan={6} style={{ padding:"28px 16px", textAlign:"center", color:C.mist }}>Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding:"28px 16px", textAlign:"center", color:C.mist }}>No users found.</td></tr>
              ) : filtered.map(l => (
                <tr key={l.id} style={{ borderTop:`1px solid ${C.fog}` }}>
                  <td style={{ padding:"11px 16px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <Av name={l.user_name||"?"} size={28}/>
                      <span style={{ fontWeight:500, color:C.ink, fontSize:12 }}>{l.user_name||"—"}</span>
                    </div>
                  </td>
                  <td style={{ padding:"11px 16px" }}>
                    <Badge label={(l.action||"—").replace(/_/g," ")} color={actionColor(l.action)}/>
                  </td>
                  <td style={{ padding:"11px 16px", color:C.slate, fontSize:12, maxWidth:220 }}>{l.details||"—"}</td>
                  <td style={{ padding:"11px 16px", color:C.mist, fontSize:12 }}>{l.entity||"—"}</td>
                  <td style={{ padding:"11px 16px", color:C.mist, fontSize:11, whiteSpace:"nowrap" }}>
                    {new Date(l.created_at).toLocaleString("en-PH",{ month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

/* ── MONTHLY THEME ──────────────────────────── */
const MonthlyThemePage = () => {
  const [toast, setToast] = useState(null);
  const [themeFile, setThemeFile] = useState(null);
  const [themeUploading, setThemeUploading] = useState(false);
  const [themeUrl, setThemeUrl] = useState(null);
  const [themeColor, setThemeColor] = useState("#1D4ED8");
  const [finUrl, setFinUrl] = useState(null);
  const [annUrl, setAnnUrl] = useState(null);

  useEffect(() => {
    supabase.from("monthly_theme").select("image_url, color").eq("id", 1).single()
      .then(({ data }) => { 
        if (data?.image_url) setThemeUrl(data.image_url);
        if (data?.color) setThemeColor(data.color);
      });
    supabase.from("app_settings").select("key, value")
      .in("key", ["finance_bg_url", "announcement_bg_url"])
      .then(({ data }) => {
        if (data) data.forEach(r => {
        if (r.key === "finance_bg_url")      setFinUrl(r.value);
        if (r.key === "announcement_bg_url") setAnnUrl(r.value);
    });
  });

  }, []);

  const uploadImage = async (file, folder, onSuccess) => {
    const ext = file.name.split(".").pop().toLowerCase();
    const path = `${folder}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("theme").upload(path, file, { upsert: true });
    if (error) { setToast({ msg:"Upload failed: " + error.message, type:"error" }); return null; }
    const { data: { publicUrl } } = supabase.storage.from("theme").getPublicUrl(path);
    onSuccess(publicUrl);
    return publicUrl;
  };

  const saveThemeColor = async () => {
    const { error } = await supabase.from("monthly_theme").update({
      color: themeColor,
      updated_at: new Date().toISOString()
    }).eq("id", 1);
    
    if (error) {
      setToast({ msg: "Failed to save color: " + error.message, type: "error" });
    } else {
      setToast({ msg: "Theme color saved! App will update.", type: "success" });
    }
  };

  const UploadCard = ({ title, desc, currentUrl, file, setFile, uploading, setUploading, onUpload }) => (
    <Card style={{ maxWidth:560, marginBottom:16 }}>
      <h3 style={{ margin:"0 0 6px", fontWeight:700, fontSize:14, color:"#0A0F1E" }}>{title}</h3>
      <p style={{ fontSize:12, color:"#94A3B8", marginTop:0, marginBottom:14 }}>{desc}</p>
      {currentUrl && (
        <div style={{ marginBottom:14, borderRadius:"24px", overflow:"hidden" }}>
          <img src={currentUrl} alt="Current" style={{ width:"100%", display:"block", maxHeight:200, objectFit:"cover" }}/>
        </div>
      )}
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files[0])}/>
      {file && (
        <div style={{ marginTop:12 }}>
          <Btn label={uploading ? "Uploading…" : "Upload"} onClick={async () => {
            setUploading(true);
            await onUpload(file);
            setFile(null);
            setUploading(false);
          }}/>
        </div>
      )}
    </Card>
  );

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)}/>}
      <h2 style={{ margin:"0 0 18px", fontWeight:800, fontSize:20, color:"#0A0F1E" }}>Monthly Theme & Backgrounds</h2>
      
      {/* THEME COLOR PICKER */}
      <Card style={{ maxWidth:560, marginBottom:16 }}>
        <h3 style={{ margin:"0 0 12px", fontWeight:700, fontSize:14, color:"#0A0F1E" }}>
          🎨 Primary Theme Color
        </h3>
        <p style={{ fontSize:12, color:"#94A3B8", margin:"0 0 16px" }}>
          This color will be used throughout the entire app. Pick the color for this month's theme!
        </p>
        
        {/* Color Preview & Picker */}
        <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:16 }}>
          <div style={{
            width:80,
            height:80,
            borderRadius:"24px",
            background:themeColor,
            border:"3px solid #E8EDF5",
            boxShadow:"0 4px 12px rgba(0,0,0,0.1)",
            flexShrink:0
          }}/>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#64748B", display:"block", marginBottom:8 }}>
              Pick Color
            </label>
            <input 
              type="color" 
              value={themeColor} 
              onChange={e => setThemeColor(e.target.value)}
              style={{ 
                width:"100%",
                height:50,
                borderRadius:"12px",
                border:"2px solid #E8EDF5",
                cursor:"pointer"
              }}
            />
          </div>
        </div>

        {/* Hex Code Input */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, fontWeight:600, color:"#64748B", display:"block", marginBottom:8 }}>
            Hex Code
          </label>
          <input 
            type="text" 
            value={themeColor}
            onChange={e => {
              const val = e.target.value;
              if (val.match(/^#[0-9A-F]{6}$/i)) setThemeColor(val);
            }}
            placeholder="#1D4ED8"
            style={{ 
              width:"100%",
              padding:"10px 14px",
              borderRadius:"12px",
              border:"1.5px solid #CBD5E1",
              fontSize:13,
              boxSizing:"border-box",
              fontWeight:600,
              fontFamily:"monospace"
            }}
          />
        </div>

        <Btn label="Save Theme Color" onClick={saveThemeColor} full/>
      </Card>

      {/* THEME IMAGE */}
      <UploadCard
        title="Monthly Theme Banner"
        desc="Shown on the Dashboard and as Login page background."
        currentUrl={themeUrl} file={themeFile} setFile={setThemeFile}
        uploading={themeUploading} setUploading={setThemeUploading}
        onUpload={async (file) => {
          const url = await uploadImage(file, "theme", setThemeUrl);
          if (url) {
            await supabase.from("monthly_theme").update({ image_url: url, updated_at: new Date().toISOString() }).eq("id", 1);
            setToast({ msg:"Monthly theme updated!", type:"success" });
          }
        }}
      />
    </div>
  );
};


/* ── APP SETTINGS ──────────────────────────── */
const AppSettingsPage = () => {
const [settings, setSettings] = useState({ church_name:"", address:"", contact_email:"", contact_phone:"", logo_url:"" });
const [saving, setSaving] = useState(false);
const [toast, setToast] = useState(null);
const [loading, setLoading] = useState(true);
const [logoFile, setLogoFile] = useState(null);
const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    supabase.from("app_settings").select("key, value")
      .then(({ data }) => {
        if (data) {
          const map = {};
          data.forEach(r => { map[r.key] = r.value || ""; });
          setSettings(prev => ({ ...prev, ...map }));
        }
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const results = await Promise.all(
      Object.entries(settings).map(([key, value]) =>
        supabase.from("app_settings").upsert({ key, value }, { onConflict:"key" })
      )
    );
    const failed = results.find(r => r.error);
    if (failed) setToast({ msg:"Failed: " + failed.error.message, type:"error" });
    else setToast({ msg:"Settings saved!", type:"success" });
    setSaving(false);
  };

  if (loading) return <div style={{ color:C.mist, padding:"28px 0" }}>Loading settings…</div>;

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
      <h2 style={{ margin:"0 0 18px", fontWeight:800, fontSize:20, color:C.ink }}>App Settings</h2>
      <Card style={{ maxWidth:560 }}>
        <h3 style={{ margin:"0 0 16px", fontWeight:700, fontSize:14, color:C.ink }}>Church Information</h3>
        <Inp label="Church Name" value={settings.church_name} onChange={v=>setSettings({...settings,church_name:v})} placeholder="e.g. JIL Pinamalayan"/>
        <Inp label="Address" value={settings.address} onChange={v=>setSettings({...settings,address:v})} placeholder="e.g. Pinamalayan, Oriental Mindoro"/>
        <Inp label="Contact Email" value={settings.contact_email} onChange={v=>setSettings({...settings,contact_email:v})} placeholder="e.g. jilpinamalayan@gmail.com"/>
        <Inp label="Contact Phone" value={settings.contact_phone} onChange={v=>setSettings({...settings,contact_phone:v})} placeholder="e.g. 09XX-XXX-XXXX"/>
        <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:14 }}>
          <label style={{ fontSize:12, fontWeight:600, color:C.slate, letterSpacing:.2 }}>Church Logo</label>
          <input type="file" accept="image/jpeg,image/png,image/svg+xml,image/webp"
            onChange={e => setLogoFile(e.target.files[0])}/>
          {logoFile && (
            <div style={{ marginTop:8 }}>
              <Btn sm label={logoUploading ? "Uploading…" : "Upload Logo"} onClick={async () => {
                setLogoUploading(true);
                const ext = logoFile.name.split(".").pop().toLowerCase();
                const path = `logo-${Date.now()}.${ext}`;
                const { error: upErr } = await supabase.storage.from("theme").upload(path, logoFile, { upsert: true });
                if (upErr) {
                  setToast({ msg:"Upload failed: " + upErr.message, type:"error" });
                } else {
                  const { data: { publicUrl } } = supabase.storage.from("theme").getPublicUrl(path);
                  setSettings(prev => ({ ...prev, logo_url: publicUrl }));
                  setLogoFile(null);
                  setToast({ msg:"Logo uploaded!", type:"success" });
                }
                setLogoUploading(false);
              }}/>
            </div>
          )}
          {settings.logo_url && (
            <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:10 }}>
              <img src={settings.logo_url} alt="Logo"
                style={{ width:56, height:56, objectFit:"contain", borderRadius:R.md, border:`1px solid ${C.fog}`, background:C.fog, padding:4 }}/>
              <span style={{ fontSize:12, color:C.mist }}>Current logo</span>
            </div>
          )}
        </div>
        <Btn label={saving?"Saving…":"Save Changes"} icon={Ico.check} onClick={save} full/>
      </Card>
    </div>
  );
};

/* ── SETTINGS ──────────────────────────── */
const SettingsPage = ({ role, C, themeName, setThemeName }) => {
  const [subPage, setSubPage] = useState(null);

  if (subPage === "users") return (
    <div>
      <button onClick={()=>setSubPage(null)}
        style={{ display:"flex", alignItems:"center", gap:6, border:"none",
          background:"transparent", cursor:"pointer", color:C.blue,
          fontWeight:600, fontSize:13, marginBottom:16, padding:0 }}>
        ← Back to Settings
      </button>
      <UserManagementPage role={role}/>
    </div>
  );

  if (subPage === "branches") return (
    <div>
      <button onClick={()=>setSubPage(null)}
        style={{ display:"flex", alignItems:"center", gap:6, border:"none",
          background:"transparent", cursor:"pointer", color:C.blue,
          fontWeight:600, fontSize:13, marginBottom:16, padding:0 }}>
        ← Back to Settings
      </button>
      <BranchesPage/>
    </div>
  );

  if (subPage === "finance-categories") return (
  <div>
    <button onClick={() => setSubPage(null)}
      style={{ display:"flex", alignItems:"center", gap:6, border:"none",
        background:"transparent", cursor:"pointer", color:C.blue,
        fontWeight:600, fontSize:13, marginBottom:16, padding:0 }}>
      ← Back to Settings
    </button>
    <FinanceCategoriesPage/>
  </div>
);

if (subPage === "audit-log") return (
  <div>
    <button onClick={() => setSubPage(null)}
      style={{ display:"flex", alignItems:"center", gap:6, border:"none",
        background:"transparent", cursor:"pointer", color:C.blue,
        fontWeight:600, fontSize:13, marginBottom:16, padding:0 }}>
      ← Back to Settings
    </button>
    <AuditLogPage/>
  </div>
);

if (subPage === "monthly-theme") return (
    <div>
      <button onClick={() => setSubPage(null)}
        style={{ display:"flex", alignItems:"center", gap:6, border:"none",
          background:"transparent", cursor:"pointer", color:C.blue,
          fontWeight:600, fontSize:13, marginBottom:16, padding:0 }}>
        ← Back to Settings
      </button>
      <MonthlyThemePage/>
    </div>
  );

  if (subPage === "app-settings") return (
    <div>
      <button onClick={() => setSubPage(null)}
        style={{ display:"flex", alignItems:"center", gap:6, border:"none",
          background:"transparent", cursor:"pointer", color:C.blue,
          fontWeight:600, fontSize:13, marginBottom:16, padding:0 }}>
        ← Back to Settings
      </button>
      <AppSettingsPage/>
    </div>
  );

if (subPage === "app-settings") return (
  <div>
    <button onClick={() => setSubPage(null)}
      style={{ display:"flex", alignItems:"center", gap:6, border:"none",
        background:"transparent", cursor:"pointer", color:C.blue,
        fontWeight:600, fontSize:13, marginBottom:16, padding:0 }}>
      ← Back to Settings
    </button>
    <AppSettingsPage/>
  </div>
);

if (subPage === "theme") return (
  <div>
    <button onClick={()=>setSubPage(null)}
      style={{ display:"flex", alignItems:"center", gap:6, border:"none",
        background:"transparent", cursor:"pointer", color:C.blue,
        fontWeight:600, fontSize:13, marginBottom:16, padding:0 }}>
      ← Back to Settings
    </button>
    <ThemeSwitcherPage currentTheme={themeName} onThemeChange={setThemeName}/>
  </div>
);

  const items = [
    { key:"users", I:Ico.users,   label:"User Management",    desc:"Add, edit, deactivate CMS accounts",           color:C.blue },
    { key:"branches",    I:Ico.branch,  label:"Branch Management",  desc:"Configure branch details and leaders",         color:C.violet2 },
    { key:"finance-categories", I:Ico.finance, label:"Finance Categories", desc:"Edit giving types and fund labels", color:C.green },
    { key:"audit-log",      I:Ico.report,    label:"Audit Log",      desc:"Track who did what and when",              color:C.violet2 },
    { key:"monthly-theme",  I:Ico.calendar,  label:"Monthly Theme",  desc:"Upload the banner shown on dashboard and login", color:C.green },
    { key:"app-settings",   I:Ico.settings,  label:"App Settings",   desc:"Church name, address, contact info",       color:C.slate },
    ...(role==="superadmin"?[{ key:null, I:Ico.upload, label:"Bulk Data Upload", desc:"Upload CSV/Excel for members, finance, attendance", color:C.rose2 }]:[]),
  ];

  return (
    <div>
      <h2 style={{ margin:"0 0 18px", fontWeight:800, fontSize:20, color:C.ink }}>Settings</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:10, maxWidth:520 }}>
        {items.map(s=>(
          <Card key={s.label}
            onClick={()=>s.key ? setSubPage(s.key) : alert(`Opening: ${s.label}`)}
            hoverable style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px" }}>
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