import { useState, useEffect, useRef, useCallback } from "react";
import QRCode from "qrcode";
import { supabase } from "../lib/supabaseClient";

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

const CATEGORIES   = ["Official Member","First Timer","Guest"];
const MEMBER_TYPES = ["Kids","Youth","Young Adult","Men","Women","Senior"];

const SHEETJS_CDN = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
const loadScript = (src) => new Promise((resolve, reject) => {
  if (document.querySelector(`script[src="${src}"]`)) return resolve();
  const s = document.createElement("script");
  s.src = src; s.async = true;
  s.onload = resolve; s.onerror = () => reject(new Error(`Failed: ${src}`));
  document.head.appendChild(s);
});

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
    <div onClick={onClick}
      onMouseEnter={() => hoverable && setHov(true)}
      onMouseLeave={() => hoverable && setHov(false)}
      style={{ background:C.white, borderRadius:R.xl, boxShadow:hov?SH.md:SH.sm,
        border:`1px solid ${C.fog}`, padding:"18px 20px",
        transition:"box-shadow .18s, transform .18s", transform:hov?"translateY(-2px)":"none",
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

const Badge = ({ label, color=C.blue, bg }) => (
  <span style={{ background:bg||`${color}18`, color, padding:"3px 10px", borderRadius:R.full,
    fontSize:11, fontWeight:700, letterSpacing:.3, whiteSpace:"nowrap" }}>{label}</span>
);

const Bar = ({ value, max=100, color=C.blue, height=6, bg=C.fog }) => (
  <div style={{ background:bg, borderRadius:R.full, height, overflow:"hidden" }}>
    <div style={{ width:`${Math.min(100,value/max*100)}%`, height:"100%", background:color,
      borderRadius:R.full, transition:"width .7s cubic-bezier(.4,0,.2,1)" }}/>
  </div>
);

const avatarColor = name => {
  const cols=[C.blue,C.violet2,C.rose2,C.green2,C.amber2,"#0EA5E9"];
  let h=0; for (let c of (name||"?")) h+=c.charCodeAt(0);
  return cols[h%cols.length];
};

const Av = ({ name, size=36 }) => (
  <div style={{ width:size, height:size, borderRadius:"50%", background:avatarColor(name),
    display:"flex", alignItems:"center", justifyContent:"center", color:"#fff",
    fontWeight:700, fontSize:size*0.37, flexShrink:0, letterSpacing:-.5 }}>
    {(name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
  </div>
);

const Btn = ({ label, onClick, color=C.blue, outline, icon:IcoComp, sm, full, danger, disabled }) => {
  const bg = disabled?"#E2E8F0":danger?C.rose2:outline?"transparent":color;
  const fg = disabled?C.mist:outline?(danger?C.rose2:color):C.white;
  const brd = disabled?C.cloud:danger?C.rose2:color;
  return (
    <button onClick={disabled?undefined:onClick} disabled={disabled} style={{ display:"flex", alignItems:"center", gap:6,
      justifyContent:"center", padding:sm?"7px 14px":"10px 20px", background:bg, color:fg,
      border:`1.5px solid ${brd}`, borderRadius:R.full, fontWeight:600, fontSize:sm?12:14,
      cursor:disabled?"not-allowed":"pointer", transition:"all .15s", width:full?"100%":"auto",
      flexShrink:0, opacity:disabled?.6:1 }}>
      {IcoComp && <IcoComp size={sm?13:15} color={fg}/>} {label}
    </button>
  );
};

const Inp = ({ label, type="text", value, onChange, placeholder, options, required }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:14 }}>
    <label style={{ fontSize:12, fontWeight:600, color:C.slate, letterSpacing:.2 }}>
      {label}{required&&<span style={{color:C.rose2}}> *</span>}
    </label>
    {options ? (
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{ padding:"10px 14px", border:`1.5px solid ${C.fog}`, borderRadius:R.md, fontSize:14,
          outline:"none", background:C.white, color:C.ink, appearance:"none" }}>
        <option value="">— Select —</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ padding:"10px 14px", border:`1.5px solid ${C.fog}`, borderRadius:R.md, fontSize:14,
          outline:"none", color:C.ink }}/>
    )}
  </div>
);

const Modal = ({ open, onClose, title, children, width=520 }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(10,15,30,.5)",
      backdropFilter:"blur(6px)", zIndex:1000, display:"flex", alignItems:"center",
      justifyContent:"center", padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.white, borderRadius:R.xxl,
        boxShadow:"0 8px 40px rgba(0,0,0,.12)", width:"100%", maxWidth:width,
        maxHeight:"92vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"22px 24px 0" }}>
          <h3 style={{ margin:0, fontWeight:800, fontSize:17, color:C.ink }}>{title}</h3>
          <button onClick={onClose} style={{ border:"none", background:C.fog, borderRadius:"50%",
            width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            ✕
          </button>
        </div>
        <div style={{ padding:"16px 24px 28px" }}>{children}</div>
      </div>
    </div>
  );
};

const RANKS = [
  { name:"Seedling", min:0,   max:199,  color:"#78716C" },
  { name:"Sprout",   min:200, max:399,  color:"#65A30D" },
  { name:"Sapling",  min:400, max:599,  color:"#16A34A" },
  { name:"Tree",     min:600, max:849,  color:"#0F766E" },
  { name:"Oak",      min:850, max:9999, color:"#1D4ED8" },
];
const getRank = pts => RANKS.find(r=>pts>=r.min&&pts<=r.max)||RANKS[0];

const Spinner = () => (
  <div style={{ display:"inline-block", width:18, height:18, borderRadius:"50%",
    border:`2px solid ${C.cloud}`, borderTopColor:C.blue,
    animation:"spin .7s linear infinite" }}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const Toast = ({ msg, type="success", onDone }) => {
  useEffect(() => { const t=setTimeout(onDone,3200); return ()=>clearTimeout(t); }, [onDone]);
  const bg = type==="error"?C.rose3:type==="warn"?C.amber3:C.green3;
  const fg = type==="error"?C.rose:type==="warn"?C.amber:C.green;
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

// ── View toggle icon buttons ─────────────────────────────────
const ViewToggle = ({ view, setView }) => (
  <div style={{ display:"flex", border:`1.5px solid ${C.cloud}`, borderRadius:R.md, overflow:"hidden" }}>
    {/* Card view */}
    <button onClick={()=>setView("card")} title="Card View"
      style={{ padding:"7px 10px", border:"none", cursor:"pointer",
        background: view==="card" ? C.blue : C.white,
        color: view==="card" ? C.white : C.slate, transition:"all .15s" }}>
      <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    </button>
    {/* List view */}
    <button onClick={()=>setView("list")} title="List View"
      style={{ padding:"7px 10px", border:"none", borderLeft:`1.5px solid ${C.cloud}`, cursor:"pointer",
        background: view==="list" ? C.blue : C.white,
        color: view==="list" ? C.white : C.slate, transition:"all .15s" }}>
      <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    </button>
  </div>
);

export default function MembersPage({ role }) {
  const [members,    setMembers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState(null);
  const [search,     setSearch]     = useState("");
  const [filterCat,  setFilterCat]  = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("Active"); // Active | Inactive | All
  const [view,       setView]       = useState("card"); // card | list
  const [showModal,  setShowModal]  = useState(false);
  const [tab,        setTab]        = useState("manual");
  const [editId,     setEditId]     = useState(null);
  const [qrMember,   setQrMember]   = useState(null);
  const qrCanvasRef = useRef(null);
  const [form, setForm] = useState({
    name:"", birthdate:"", address:"",
    category:"Official Member", type:"Young Adult",
    branch:"", lifegroup_leader:""
  });
  const [uploadState, setUploadState] = useState({ status:"idle", rows:[], error:"" });
  const [branches, setBranches] = useState([]);
  const fileInputRef = useRef(null);
  const mob = useIsMobile();

  const notify = (msg, type="success") => setToast({ msg, type });

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("name", { ascending: true });
    if (error) notify("Failed to load members: " + error.message, "error");
    else setMembers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
  fetchMembers();
  // ADD these 3 lines:
  supabase
    .from("branches")
    .select("*, parent:parent_id(name)")
    .order("name")
    .then(({ data }) => {
      if (data) setBranches(data);
    });
    }, [fetchMembers]);

  useEffect(() => {
    if (qrMember && qrCanvasRef.current) {
      const qrValue = `jil://member?code=${qrMember.member_code}&name=${encodeURIComponent(qrMember.name)}&branch=${encodeURIComponent(qrMember.branch || "")}`;
      QRCode.toCanvas(qrCanvasRef.current, qrValue, { width: 200, margin: 2 })
        .catch(err => console.error("QR generation error:", err));
    }
  }, [qrMember]);

  const calcAge = bd => {
    if (!bd) return null;
    const d = new Date(bd), now = new Date();
    return now.getFullYear() - d.getFullYear() -
      (now < new Date(now.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
  };

  const genCode = () => "JIL-" + String(Date.now()) + Math.floor(Math.random()*1000);
  const catColor = c => c==="Official Member"?C.blue:c==="First Timer"?C.green:C.amber;

  const downloadQR = () => {
    if (!qrCanvasRef.current) return;
    const link = document.createElement("a");
    link.href = qrCanvasRef.current.toDataURL("image/png");
    link.download = `${qrMember.name.replace(/\s+/g, "-")}-QR.png`;
    link.click();
    notify("QR downloaded ✓");
  };

  // ── Toggle active/inactive ─────────────────────────────────
  const toggleActive = async (m) => {
    const { error } = await supabase
      .from("members")
      .update({ is_active: !m.is_active })
      .eq("id", m.id);
    if (error) notify("Update failed: " + error.message, "error");
    else {
      notify(`${m.name} marked as ${!m.is_active ? "Active" : "Inactive"}`);
      fetchMembers();
    }
  };

  const save = async () => {
    if (!form.name.trim()) { notify("Name is required", "warn"); return; }
    setSaving(true);
    const payload = {
      name:             form.name.trim(),
      birthdate:        form.birthdate || null,
      address:          form.address.trim(),
      category:         form.category,
      type:             form.type,
      branch:           form.branch,
      lifegroup_leader: form.lifegroup_leader.trim(),
    };

    if (editId) {
      const { error } = await supabase.from("members").update(payload).eq("id", editId);
      if (error) notify("Save failed: " + error.message, "error");
      else notify("Member updated ✓");
    } else {
      const { error } = await supabase.from("members")
        .insert({ ...payload, member_code: genCode(), is_active: true });
      if (error) notify("Add failed: " + error.message, "error");
      else notify("Member added ✓");
    }

    setSaving(false);
    setShowModal(false);
    setEditId(null);
    setForm({ name:"", birthdate:"", address:"", category:"Official Member",
              type:"Young Adult", branch:"", lifegroup_leader:"" });
    fetchMembers();
  };

  const deleteMember = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) notify("Delete failed: " + error.message, "error");
    else { notify("Member deleted"); fetchMembers(); }
  };

  const startEdit = m => {
    setForm({
      name:             m.name,
      birthdate:        m.birthdate || "",
      address:          m.address || "",
      category:         m.category || "Official Member",
      type:             m.type || "Young Adult",
      branch:           m.branch || "",
      lifegroup_leader: m.lifegroup_leader || "",
    });
    setEditId(m.id);
    setTab("manual");
    setShowModal(true);
  };

  const matchOption = (val, options) => {
    if (!val) return options[0];
    const lower = String(val).toLowerCase();
    return options.find(o=>o.toLowerCase()===lower)
      || options.find(o=>o.toLowerCase().includes(lower)||lower.includes(o.toLowerCase()))
      || options[0];
  };

  const normalizeRow = (row) => {
    const get = (...keys) => {
      for (const k of keys) {
        const found = Object.keys(row).find(rk =>
          rk.toLowerCase().replace(/[^a-z]/g, "") === k.toLowerCase().replace(/[^a-z]/g, "")
        );
        if (found && row[found] !== undefined && String(row[found]).trim() !== "")
          return String(row[found]).trim();
      }
      return "";
    };
    return {
      member_code:      genCode(),
      name:             get("Full Name", "Name", "fullname") || "(Unnamed)",
      birthdate:        get("Birthdate", "dob", "dateofbirth") || null,
      address:          get("Address") || "",
      category:         matchOption(get("Category"), CATEGORIES),
      type:             matchOption(get("Type", "membertype"), MEMBER_TYPES),
      branch:           branch: branches.find(b => b.name.toLowerCase().includes((get("Branch")||"").toLowerCase()))?.name || (branches[0]?.name || ""),
      lifegroup_leader: get("Lifegroup Leader", "lifegroupleader", "leader", "cellleader") || "",
      is_active:        true,
    };
  };

  const handleFile = async (file) => {
    if (!file) return;
    setUploadState({ status:"loading", rows:[], error:"" });
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      let rows = [];
      if (ext === "csv") {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(l=>l.trim());
        const headers = lines[0].split(",").map(h=>h.trim());
        rows = lines.slice(1).map(line => {
          const cells = line.split(",").map(c=>c.trim());
          const obj = {};
          headers.forEach((h,i)=>obj[h]=cells[i]);
          return obj;
        });
      } else if (ext==="xlsx"||ext==="xls") {
        await loadScript(SHEETJS_CDN);
        const buf = await file.arrayBuffer();
        const wb = window.XLSX.read(buf, { type:"array" });
        for (const sheetName of wb.SheetNames) {
          const sheet = wb.Sheets[sheetName];
          const allRows = window.XLSX.utils.sheet_to_json(sheet, { defval:"", raw:false });
          const hasName = allRows.some(r =>
            Object.keys(r).some(k =>
              k.toLowerCase().replace(/[^a-z]/g,"").includes("name") ||
              k.toLowerCase().replace(/[^a-z]/g,"").includes("fullname")
            )
          );
          if (hasName && allRows.length > 0) { rows = allRows; break; }
        }
      } else {
        setUploadState({ status:"error", rows:[], error:"Unsupported file. Use .csv, .xlsx, or .xls" });
        return;
      }
      if (!rows.length) {
        setUploadState({ status:"error", rows:[], error:"No data rows found in this file." });
        return;
      }
      const normalized = rows.map(normalizeRow).filter(r=>r.name && r.name !== "(Unnamed)");
      if (!normalized.length) {
        setUploadState({ status:"error", rows:[], error:"Couldn't find a Name column." });
        return;
      }
      setUploadState({ status:"preview", rows:normalized, error:"" });
    } catch (err) {
      setUploadState({ status:"error", rows:[], error:"Failed to read file: " + (err.message||"unknown") });
    }
  };

  const confirmImport = async () => {
    setSaving(true);
    setUploadState(s=>({ ...s, status:"saving" }));
    const existingNames = new Set(members.map(m=>m.name.toLowerCase()));
    const newOnes = uploadState.rows.filter(r=>!existingNames.has(r.name.toLowerCase()));
    const cleaned = newOnes.map((r, i) => ({
      member_code: `JIL-${Date.now()}-${i}`,
      name: r.name, birthdate: r.birthdate, address: r.address,
      category: r.category, type: r.type, branch: r.branch,
      lifegroup_leader: r.lifegroup_leader, is_active: true,
    }));
    if (!newOnes.length) {
      setUploadState({ status:"error", rows:[], error:"All names already exist in the database." });
      setSaving(false);
      return;
    }
    const CHUNK = 500;
    let errorMsg = null;
    for (let i=0; i<cleaned.length; i+=CHUNK) {
      const { error } = await supabase.from("members").insert(cleaned.slice(i, i+CHUNK));
      if (error) { errorMsg = error.message; break; }
    }
    setSaving(false);
    if (errorMsg) {
      setUploadState({ status:"error", rows:[], error:"Import failed: " + errorMsg });
    } else {
      setUploadState({ status:"done", rows:newOnes, error:"" });
      notify(`${newOnes.length} member${newOnes.length!==1?"s":""} imported ✓`);
      fetchMembers();
    }
  };

  const resetUpload = () => {
    setUploadState({ status:"idle", rows:[], error:"" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Filter ────────────────────────────────────────────────
  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    const matchSearch =
      (m.name||"").toLowerCase().includes(q) ||
      (m.address||"").toLowerCase().includes(q) ||
      (m.branch||"").toLowerCase().includes(q);
    const matchCat    = filterCat==="All"    || m.category===filterCat;
    const matchType   = filterType==="All"   || m.type===filterType;
    const matchStatus = filterStatus==="All"
      ? true
      : filterStatus==="Active"
        ? m.is_active !== false
        : m.is_active === false;
    return matchSearch && matchCat && matchType && matchStatus;
  });

  // ════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════
  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <h2 style={{ margin:0, fontWeight:800, fontSize:20, color:C.ink }}>Members</h2>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <ViewToggle view={view} setView={setView}/>
          <Btn label="Add Member" onClick={()=>{ setEditId(null); setTab("manual"); setShowModal(true); }} sm
            icon={({size,color})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}/>
          {role==="superadmin" && (
            <Btn label="Upload Sheet" outline sm
              onClick={()=>{ setEditId(null); setTab("upload"); resetUpload(); setShowModal(true); }}
              icon={({size,color})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>}/>
          )}
        </div>
      </div>

      {/* Search */}
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search name, address, branch…"
          style={{ flex:1, minWidth:180, padding:"9px 14px", borderRadius:R.full,
            border:`1.5px solid ${C.cloud}`, fontSize:13, outline:"none", color:C.ink }}/>
      </div>

      {/* Active / Inactive filter */}
      <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
        {["Active","Inactive","All"].map(s => (
          <Pill key={s} label={s} active={filterStatus===s} onClick={()=>setFilterStatus(s)}
            color={s==="Active"?C.green:s==="Inactive"?C.rose2:C.slate}/>
        ))}
      </div>

      {/* Category filter */}
      <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
        {["All",...CATEGORIES].map(t=>(
          <Pill key={t} label={t} active={filterCat===t} onClick={()=>setFilterCat(t)}
            color={t==="All"?C.blue:catColor(t)}/>
        ))}
      </div>

      {/* Type filter */}
      <div style={{ display:"flex", gap:6, marginBottom:18, flexWrap:"wrap" }}>
        {["All",...MEMBER_TYPES].map(t=>(
          <Pill key={t} label={t} active={filterType===t} onClick={()=>setFilterType(t)} color={C.slate}/>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:C.mist }}>
          <Spinner/>
          <div style={{ marginTop:12, fontSize:14 }}>Loading members…</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize:12, color:C.mist, marginBottom:12 }}>
            {filtered.length} member{filtered.length!==1?"s":""} · {filterStatus} · sorted alphabetically
            {members.length !== filtered.length && ` (${members.length} total)`}
          </div>

          {/* ── CARD VIEW ───────────────────────────────────── */}
          {view==="card" && (
            <div style={{ display:"grid", gridTemplateColumns:`repeat(auto-fill,minmax(${mob?280:300}px,1fr))`, gap:14 }}>
              {filtered.map(m => {
                const rank = getRank(m.points||0);
                const isActive = m.is_active !== false;
                return (
                  <Card key={m.id} hoverable style={{ opacity: isActive ? 1 : 0.65 }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:12 }}>
                      <Av name={m.name} size={42}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:14, color:C.ink,
                          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {m.name}
                        </div>
                        <div style={{ fontSize:11, color:C.mist }}>
                          {m.type} · {(m.branch||"").split("–")[0].trim()}
                        </div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                        <Badge label={m.category} color={catColor(m.category)}/>
                        <Badge label={isActive?"Active":"Inactive"}
                          color={isActive?C.green:C.rose2}/>
                      </div>
                    </div>

                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6,
                      fontSize:12, color:C.slate, marginBottom:12 }}>
                      <div>🎂 {m.birthdate||"—"}</div>
                      <div>Age {m.age||"—"}</div>
                      <div style={{ gridColumn:"1/-1", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        📍 {m.address||"—"}
                      </div>
                      <div style={{ gridColumn:"1/-1", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        👤 {m.lifegroup_leader||"—"}
                      </div>
                    </div>

                    <div style={{ marginBottom:14 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:11, color:rank.color, fontWeight:700 }}>{rank.name}</span>
                        <span style={{ fontSize:11, color:C.mist }}>{m.attendance||0}% att.</span>
                      </div>
                      <Bar value={m.points||0} max={900} color={rank.color}/>
                      <div style={{ fontSize:11, color:C.mist, marginTop:3 }}>{m.points||0} pts</div>
                    </div>

                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      <Btn label="Edit" outline sm onClick={()=>startEdit(m)}
                        icon={({size,color})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg>}/>
                      <Btn label="QR" outline sm onClick={()=>setQrMember(m)}
                        icon={({size,color})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="5" y="5" width="3" height="3"/><rect x="16" y="5" width="3" height="3"/><rect x="5" y="16" width="3" height="3"/></svg>}/>
                      <Btn label={isActive?"Deactivate":"Activate"} outline sm
                        color={isActive?C.rose2:C.green}
                        onClick={()=>toggleActive(m)}/>
                      {role==="superadmin" && (
                        <Btn label="Delete" outline sm danger onClick={()=>deleteMember(m.id,m.name)}
                          icon={({size,color})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>}/>
                      )}
                    </div>
                  </Card>
                );
              })}

              {!filtered.length && (
                <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"50px 0", color:C.mist }}>
                  <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={C.cloud} strokeWidth={1.5}><circle cx="9" cy="8" r="3.5"/><path d="M2 21v-1.5A5.5 5.5 0 0116 19.5V21"/></svg>
                  <div style={{ marginTop:10, fontSize:14 }}>
                    {search||filterCat!=="All"||filterType!=="All"||filterStatus!=="All"
                      ? "No members match your filters"
                      : "No members yet — add your first one!"}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── LIST VIEW ───────────────────────────────────── */}
          {view==="list" && (
            <Card style={{ padding:0, overflow:"hidden" }}>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead>
                    <tr style={{ background:C.fog }}>
                      {["Member","Category","Type","Branch","Lifegroup Leader","Points","Status","Actions"].map(h=>(
                        <th key={h} style={{ textAlign:"left", padding:"10px 14px", color:C.slate,
                          fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:.4,
                          whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(m => {
                      const rank = getRank(m.points||0);
                      const isActive = m.is_active !== false;
                      return (
                        <tr key={m.id} style={{ borderTop:`1px solid ${C.fog}`,
                          opacity: isActive ? 1 : 0.6,
                          background: isActive ? C.white : `${C.fog}88` }}>
                          <td style={{ padding:"10px 14px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <Av name={m.name} size={32}/>
                              <div>
                                <div style={{ fontWeight:600, color:C.ink, fontSize:13 }}>{m.name}</div>
                                <div style={{ fontSize:11, color:C.mist }}>{m.member_code||"—"}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding:"10px 14px" }}>
                            <Badge label={m.category} color={catColor(m.category)}/>
                          </td>
                          <td style={{ padding:"10px 14px", color:C.slate }}>{m.type}</td>
                          <td style={{ padding:"10px 14px", color:C.slate, fontSize:12 }}>
                            {(m.branch||"").split("–")[0].trim()}
                          </td>
                          <td style={{ padding:"10px 14px", color:C.slate, fontSize:12 }}>
                            {m.lifegroup_leader||"—"}
                          </td>
                          <td style={{ padding:"10px 14px" }}>
                            <span style={{ fontWeight:700, color:rank.color, fontSize:12 }}>
                              {m.points||0} pts
                            </span>
                          </td>
                          <td style={{ padding:"10px 14px" }}>
                            <Badge label={isActive?"Active":"Inactive"}
                              color={isActive?C.green:C.rose2}/>
                          </td>
                          <td style={{ padding:"10px 14px" }}>
                            <div style={{ display:"flex", gap:6 }}>
                              <Btn label="Edit" outline sm onClick={()=>startEdit(m)}/>
                              <Btn label="QR" outline sm onClick={()=>setQrMember(m)}/>
                              <Btn label={isActive?"Deactivate":"Activate"} outline sm
                                color={isActive?C.rose2:C.green}
                                onClick={()=>toggleActive(m)}/>
                              {role==="superadmin" && (
                                <Btn label="Delete" outline sm danger onClick={()=>deleteMember(m.id,m.name)}/>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!filtered.length && (
                      <tr>
                        <td colSpan={8} style={{ textAlign:"center", padding:"40px 0", color:C.mist }}>
                          No members match your filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────── */}
      <Modal open={showModal} onClose={()=>{ setShowModal(false); setEditId(null); resetUpload(); }}
        title={editId?"Edit Member":"Add Member"} width={480}>

        {!editId && (
          <div style={{ display:"flex", gap:8, marginBottom:18 }}>
            <Pill label="Manual Entry" active={tab==="manual"} onClick={()=>{ setTab("manual"); resetUpload(); }}/>
            <Pill label="Upload Sheet" active={tab==="upload"} onClick={()=>{ setTab("upload"); resetUpload(); }} color={C.green}/>
          </div>
        )}

        {tab==="upload" && !editId ? (
          <div>
            {uploadState.status==="idle" && (
              <>
                <div onDragOver={e=>e.preventDefault()}
                  onDrop={e=>{ e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
                  style={{ border:`2px dashed ${C.cloud}`, borderRadius:R.xl, padding:"36px 20px",
                    textAlign:"center", marginBottom:16, cursor:"pointer" }}
                  onClick={()=>fileInputRef.current?.click()}>
                  <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke={C.mist} strokeWidth={1.5} strokeLinecap="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>
                  <div style={{ fontWeight:600, fontSize:14, color:C.ink, marginTop:12 }}>
                    Drop CSV / Excel here, or click to browse
                  </div>
                  <div style={{ fontSize:12, color:C.mist, marginTop:4 }}>
                    Columns: Name, Birthdate, Address, Category, Type, Branch, LifegroupLeader
                  </div>
                  <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display:"none" }}
                    onChange={e=>handleFile(e.target.files?.[0])}/>
                </div>
                <div style={{ background:C.fog, borderRadius:R.lg, padding:"12px 14px", fontSize:12, color:C.slate }}>
                  <strong style={{ color:C.ink }}>Auto-sort on import.</strong> Category and Type are fuzzy-matched.
                  Duplicate names are skipped.
                </div>
              </>
            )}
            {(uploadState.status==="loading"||uploadState.status==="saving") && (
              <div style={{ textAlign:"center", padding:"40px 0", color:C.mist }}>
                <Spinner/>
                <div style={{ marginTop:10, fontSize:13 }}>
                  {uploadState.status==="saving" ? "Saving to Supabase…" : "Reading file…"}
                </div>
              </div>
            )}
            {uploadState.status==="error" && (
              <div>
                <div style={{ background:C.rose3, color:C.rose, borderRadius:R.md,
                  padding:"12px 14px", fontSize:13, marginBottom:14 }}>{uploadState.error}</div>
                <Btn label="Try Again" outline sm onClick={resetUpload}/>
              </div>
            )}
            {uploadState.status==="preview" && (
              <div>
                <div style={{ fontSize:13, color:C.ink, marginBottom:10 }}>
                  Found <strong>{uploadState.rows.length}</strong> member{uploadState.rows.length!==1?"s":""}.
                  Review, then confirm import.
                </div>
                <div style={{ maxHeight:240, overflowY:"auto", border:`1px solid ${C.fog}`,
                  borderRadius:R.lg, marginBottom:14 }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                    <thead>
                      <tr style={{ background:C.fog, position:"sticky", top:0 }}>
                        {["Name","Category","Type","Branch"].map(h=>(
                          <th key={h} style={{ textAlign:"left", padding:"8px 10px", color:C.slate,
                            fontWeight:600, fontSize:10, textTransform:"uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {uploadState.rows.slice(0,100).map((r,i)=>(
                        <tr key={i} style={{ borderTop:`1px solid ${C.fog}` }}>
                          <td style={{ padding:"7px 10px", color:C.ink, fontWeight:500 }}>{r.name}</td>
                          <td style={{ padding:"7px 10px", color:C.slate }}>{r.category}</td>
                          <td style={{ padding:"7px 10px", color:C.slate }}>{r.type}</td>
                          <td style={{ padding:"7px 10px", color:C.slate, fontSize:11 }}>{r.branch}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {uploadState.rows.length>100 && (
                    <div style={{ padding:"8px 10px", fontSize:11, color:C.mist }}>
                      +{uploadState.rows.length-100} more not shown
                    </div>
                  )}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <Btn label={`Import ${uploadState.rows.length} to Supabase`} onClick={confirmImport}
                    disabled={saving} full
                    icon={({size,color})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}/>
                  <Btn label="Cancel" outline onClick={resetUpload}/>
                </div>
              </div>
            )}
            {uploadState.status==="done" && (
              <div style={{ textAlign:"center", padding:"24px 0" }}>
                <div style={{ width:54, height:54, borderRadius:"50%", background:C.green3,
                  display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
                  <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth={2.5} strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div style={{ fontWeight:700, fontSize:16, color:C.ink, marginBottom:6 }}>Import Complete</div>
                <div style={{ color:C.slate, fontSize:13, marginBottom:16 }}>
                  {uploadState.rows.length} member{uploadState.rows.length!==1?"s":""} saved to Supabase.
                </div>
                <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
                  <Btn label="Upload Another" outline sm onClick={resetUpload}/>
                  <Btn label="Done" sm onClick={()=>{ setShowModal(false); resetUpload(); }}/>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <Inp label="Full Name" value={form.name} onChange={v=>setForm({...form,name:v})}
              placeholder="e.g. Maria Santos" required/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Inp label="Birthdate" type="date" value={form.birthdate}
                onChange={v=>setForm({...form,birthdate:v})}/>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                <label style={{ fontSize:12, fontWeight:600, color:C.slate }}>Age</label>
                <div style={{ padding:"10px 14px", border:`1.5px solid ${C.fog}`, borderRadius:R.md,
                  fontSize:14, color:C.mist, background:C.fog }}>
                  {form.birthdate ? calcAge(form.birthdate) : "—"}
                </div>
              </div>
            </div>
            <Inp label="Address" value={form.address} onChange={v=>setForm({...form,address:v})}
              placeholder="e.g. Sto. Tomas, Pinamalayan"/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Inp label="Category" value={form.category} onChange={v=>setForm({...form,category:v})}
                options={CATEGORIES} required/>
              <Inp label="Type" value={form.type} onChange={v=>setForm({...form,type:v})}
                options={MEMBER_TYPES} required/>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:600, color:C.slate, letterSpacing:.2 }}>Branch</label>
              <select value={form.branch} onChange={e=>setForm({...form,branch:e.target.value})}
                style={{ padding:"10px 14px", border:`1.5px solid ${C.fog}`, borderRadius:R.md,
                  fontSize:14, outline:"none", background:C.white, color:C.ink, appearance:"none" }}>
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
            <Inp label="Lifegroup Leader" value={form.lifegroup_leader}
              onChange={v=>setForm({...form,lifegroup_leader:v})} placeholder="e.g. Ptr. Rico Cruz"/>
            <div style={{ display:"flex", gap:8, marginTop:4 }}>
              <Btn label={saving?"Saving…":(editId?"Save Changes":"Add Member")}
                onClick={save} disabled={saving} full
                icon={({size,color})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}/>
              <Btn label="Cancel" onClick={()=>{ setShowModal(false); setEditId(null); }} outline/>
            </div>
          </>
        )}
      </Modal>

      {/* ── Member QR Modal ─────────────────────────────────── */}
      <Modal open={!!qrMember} onClose={()=>setQrMember(null)} title="Member QR Code" width={380}>
        {qrMember && (
          <div style={{ textAlign:"center" }}>
            <Av name={qrMember.name} size={48}/>
            <div style={{ fontWeight:800, fontSize:16, color:C.ink, marginTop:8 }}>{qrMember.name}</div>
            <div style={{ fontSize:12, color:C.mist, marginBottom:14 }}>
              {qrMember.member_code||`JIL-${String(qrMember.id).padStart(6,"0")}`}
            </div>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:14, padding:"16px",
              background:C.white, border:`1px solid ${C.fog}`, borderRadius:R.lg }}>
              <canvas ref={qrCanvasRef} style={{ maxWidth:"100%" }}/>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <Btn label="Download" onClick={downloadQR} full
                icon={({size,color})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round"><polyline points="21 15 16 20 11 15"/><line x1="16" y1="4" x2="16" y2="20"/></svg>}/>
              <Btn label="Close" outline onClick={()=>setQrMember(null)}/>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
