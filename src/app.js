const TOPO = window.TOPO, DATA = window.DATA, IND = window.IND;
const [Q1,Q2] = DATA.q, R = DATA.rows;
// Industry columns in IND rows: fed, st, lcl, nat, con, mfg, ttu, inf, fin, pbs, eh, lh, oth, nd, total
const SECT = [
  {k:0,  lbl:"Federal government (civilian)", g:"Government", gov:true},
  {k:1,  lbl:"State government", g:"Government", gov:true},
  {k:2,  lbl:"Local government (incl. public schools)", g:"Government", gov:true},
  {k:3,  lbl:"Agriculture, forestry & mining", g:"Private"},
  {k:4,  lbl:"Construction", g:"Private"},
  {k:5,  lbl:"Manufacturing", g:"Private"},
  {k:6,  lbl:"Trade, transportation & utilities", g:"Private"},
  {k:7,  lbl:"Information", g:"Private"},
  {k:8,  lbl:"Finance, insurance & real estate", g:"Private"},
  {k:9,  lbl:"Professional & business services", g:"Private"},
  {k:10, lbl:"Private education & health care", g:"Private"},
  {k:11, lbl:"Leisure & hospitality", g:"Private"},
  {k:12, lbl:"Other services", g:"Private"},
  {k:13, lbl:"Not disclosed by BLS", g:"Private", nd:true}
];
const TOP_GROUPS = [{lbl:"Government", ks:[0,1,2]}].concat(SECT.slice(3,13).map(s=>({lbl:s.lbl, ks:[s.k]})));
const govShare = id => { const r = IND[id]; return r && r[14] ? (r[0]+r[1]+r[2])/r[14] : null; };
function largest(id){
  const r = IND[id]; if (!r || !r[14]) return null;
  let best = null;
  TOP_GROUPS.forEach(t => { const v = d3.sum(t.ks, k=>r[k]); if (!best || v > best.v) best = {lbl:t.lbl, v}; });
  return {lbl: best.lbl, share: best.v/r[14]};
}
// Largest-industry view: 11 sector groups ranked; small groups fold into "Other" for color only.
const LCAT = [
  {key:"Government", c:"#092B5F"},
  {key:"Trade, transportation & utilities", c:"#7FA2D6"},
  {key:"Manufacturing", c:"#2E6F7E"},
  {key:"Private education & health care", c:"#FFB739"},
  {key:"Leisure & hospitality", c:"#B26A00"},
  {key:"Agriculture, forestry & mining", c:"#8C7A5B"},
  {key:"Other", c:"#A7A9AE", note:"Professional services, construction, finance, information, other services"}
];
const LCAT_IDX = new Map(LCAT.map((d,i)=>[d.key,i]));
const catOf = lbl => LCAT_IDX.has(lbl) ? lbl : "Other";
// Is the top sector certain? Jobs BLS withheld could belong to any one sector, so the
// ranking is settled only when the lead over the runner-up exceeds the withheld jobs.
function topInfo(id){
  const r = IND[id]; if (!r || !r[14]) return null;
  const v = TOP_GROUPS.map(t => ({lbl:t.lbl, v:d3.sum(t.ks, k=>r[k])})).sort((a,b)=>b.v-a.v);
  return {lbl:v[0].lbl, share:v[0].v/r[14], cat:catOf(v[0].lbl), sure:(v[0].v - v[1].v) >= r[13], second:v[1].lbl};
}
const TOPI = {}; Object.keys(IND).forEach(id => TOPI[id] = topInfo(id));
const pct = v => v==null ? "n/a" : (v*100).toFixed(1)+"%";
const num = d3.format(",");
const compact = n => n >= 1e9 ? (n/1e9).toFixed(2)+"B" : n >= 1e6 ? (n/1e6).toFixed(1)+"M" : num(n);
document.getElementById("terciles").textContent = `low < ${pct(Q1)}, mid ${pct(Q1)}–${pct(Q2)}, high ≥ ${pct(Q2)}`;

// Bivariate palette: columns = exposure (low→high, toward gold), rows = distress (healthy→distressed, toward navy)
const BI = [
  ["#E8E6E1","#F2D59A","#F2B33D"],
  ["#AFBBD0","#B9A887","#B98935"],
  ["#5E79A6","#68667A","#4A3B2C"]
];
const EXP_LBL = ["Low","Mid","High"], DIS_LBL = ["Healthy","Marginal","Distressed"];
const CAT5 = ["Fully employed","Close to fully employed","Marginally distressed","Distressed","Severely distressed"];
const CAT5C = ["#DDE3EC","#AFBBD0","#8297BB","#4F6A98","#1E3A65"];
const NA = "#C9C9C4";
const DIM = "#ECECE8"; // counties outside the isolated group / state: flat, lighter than the no-data gray
const expScale = d3.scaleSequential(t => d3.interpolateRgb("#F6EEDB","#B26A00")(t)).domain([0.27,0.36]).clamp(true);

const ex = v => v==null ? null : v < Q1 ? 0 : v < Q2 ? 1 : 2;
const ds = r => r < .765 ? 2 : r < .80 ? 1 : 0;

const counties = topojson.feature(TOPO, TOPO.objects.counties).features;
counties.forEach(f => { const r = R[f.id]; f.d = r; if (r) { f.ex = r[5]==null ? null : ex(r[2]); f.ds = r[5]==null ? null : ds(r[5]); } });
const byId = new Map(counties.map(f => [f.id, f]));
const path = d3.geoPath();
const svg = d3.select("#map"), g = svg.append("g");
const defs = svg.append("defs");
const pat = defs.append("pattern").attr("id","hatch").attr("patternUnits","userSpaceOnUse").attr("width",4).attr("height",4).attr("patternTransform","rotate(45)");
pat.append("rect").attr("width",1.4).attr("height",4).attr("fill","#FFFFFF");
const paths = g.append("g").selectAll("path").data(counties).join("path").attr("class","county").attr("d",path);
const hatch = g.append("path").attr("fill","url(#hatch)").style("pointer-events","none");
g.append("path").attr("class","states").attr("d", path(topojson.mesh(TOPO, TOPO.objects.states, (a,b)=>a!==b)));
g.append("path").attr("class","states").attr("d", path(topojson.mesh(TOPO, TOPO.objects.nation)));
const selLine = g.append("path").attr("class","sel-outline");
const pinLine = g.append("path").attr("class","outline");
const hoverLine = g.append("path").attr("class","outline");

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let view = "bi", sel = null; // sel = {ex,ds}, {cat} or {ind}
function fill(f){
  if (!f.d) return NA;
  if (view==="bi") return f.ex==null ? NA : BI[f.ds][f.ex];
  if (view==="ex") return f.d[2]==null ? NA : expScale(f.d[2]);
  if (view==="gv") { const t = TOPI[f.id]; return t ? LCAT[LCAT_IDX.get(t.cat)].c : NA; }
  return CAT5.includes(f.d[6]) ? CAT5C[CAT5.indexOf(f.d[6])] : NA;
}
// In the isolated group and the filtered state (if any)
function active(f){ return inSel(f) && (!stateF || (f.d && f.d[1]===stateF)); }
function inSel(f){
  if (!sel || !f.d) return true;
  if (view==="bi") return f.ex===sel.ex && f.ds===sel.ds;
  if (view==="ds") return f.d[6]===sel.cat;
  if (view==="gv") return TOPI[f.id] ? TOPI[f.id].cat===sel.ind : false;
  return true;
}
let painted = false;
function render(){
  const t = painted && !reduce ? paths.transition().duration(200) : paths;
  t.attr("fill", f => active(f) ? fill(f) : DIM);
  painted = true;
  hatch.attr("d", view==="gv" ? path({type:"FeatureCollection", features:counties.filter(f => TOPI[f.id] && !TOPI[f.id].sure && active(f))}) : null);
  // Outline the edge of the highlighted area: borders between highlighted and dimmed counties, plus coastlines
  const on = id => active(byId.get(id));
  selLine.attr("d", sel || stateF ? path(topojson.mesh(TOPO, TOPO.objects.counties, (a,b) => a===b ? on(a.id) : on(a.id)!==on(b.id))) : null);
  legend(); stats(); indPanel();
}

// Industry mix panel
let pinned = null, weight = "pool";
const ALL_IDS = counties.filter(f=>f.d && IND[f.id]).map(f=>f.id);
const US_POOL = mixOf(ALL_IDS);
weight = "avg"; const US_AVG = mixOf(ALL_IDS); weight = "pool";
function mixOf(ids){
  const out = new Array(14).fill(0);
  if (!ids.length) return null;
  if (weight === "pool"){
    let tot = 0;
    ids.forEach(id => { const r = IND[id]; for (let k=0;k<14;k++) out[k] += r[k]; tot += r[14]; });
    return out.map(v => v/tot);
  }
  ids.forEach(id => { const r = IND[id]; for (let k=0;k<14;k++) out[k] += r[k]/r[14]; });
  return out.map(v => v/ids.length);
}
function setPinned(id){
  pinned = id;
  pinLine.attr("d", id ? path(byId.get(id)) : null);
  indPanel();
}
function indPanel(){
  const pin = document.getElementById("pin"), sub = document.getElementById("indSub"), el = document.getElementById("ind");
  document.getElementById("wseg").style.display = pinned ? "none" : "";
  let ids, jobs;
  if (pinned){
    const d = R[pinned];
    pin.innerHTML = `<div class="pinned"><div style="min-width:0"><div class="pk">Pinned county</div><div class="pn">${d[0]}</div>
      <div class="pm">${pct(d[2])} exposed · emp. ${pct(d[5])} · ${CAT5.includes(d[6]) ? d[6] : "n/a"}</div></div>
      <button type="button" id="unpin">Show selection</button></div>`;
    document.getElementById("unpin").onclick = () => setPinned(null);
    ids = IND[pinned] ? [pinned] : [];
    jobs = IND[pinned] ? IND[pinned][14] : 0;
    sub.textContent = ids.length ? `${num(jobs)} jobs located in the county, 2024.` : "";
  } else {
    pin.innerHTML = "";
    ids = counties.filter(f => f.d && IND[f.id] && inSel(f) && (!stateF || f.d[1]===stateF)).map(f=>f.id);
    jobs = d3.sum(ids, id => IND[id][14]);
    sub.textContent = `${document.getElementById("sumSub").textContent}: ${num(ids.length)} counties, ${num(jobs)} jobs. Click a county on the map to see it alone.`;
  }
  const avg = weight === "avg" && !pinned;
  const us = avg ? US_AVG : US_POOL;
  const m = pinned ? (ids.length ? IND[pinned].slice(0,14).map(v => v/IND[pinned][14]) : null) : mixOf(ids);
  if (!m){ el.innerHTML = `<p class="empty">No BLS employment data for this area.</p>`; return; }
  const shown = SECT.filter(s => !(s.nd && m[s.k] < 0.0005));
  const max = Math.max(0.0001, ...shown.map(s => Math.max(m[s.k], us[s.k])));
  const row = s => {
    const w = (m[s.k]/max*100).toFixed(2), t = (us[s.k]/max*100).toFixed(2);
    return `<div class="r" title="${s.lbl}: ${pct(m[s.k])} here vs. ${pct(us[s.k])} ${avg ? "avg. U.S. county" : "U.S."}">
      <div class="top"><span class="lbl">${s.lbl}</span><span class="val"><b>${pct(m[s.k])}</b> <small>${avg ? "Avg." : "U.S."} ${pct(us[s.k])}</small></span></div>
      <div class="bar" aria-hidden="true"><i class="${s.gov ? "gov" : s.nd ? "nd" : ""}" style="width:${w}%"></i>${s.nd ? "" : `<b style="left:${t}%"></b>`}</div></div>`;
  };
  el.innerHTML = `<div class="grp"><span>Government</span><span>${pct(m[0]+m[1]+m[2])}</span></div>
    <div class="rows">${shown.filter(s=>s.gov).map(row).join("")}</div>
    <div class="grp"><span>Private employers</span></div>
    <div class="rows">${shown.filter(s=>!s.gov).map(row).join("")}</div>
    <div class="ind-key"><span><i></i>This selection</span><span><b></b>${avg ? "Average U.S. county" : "U.S. overall"}</span></div>`;
}

// Legend
function legend(){
  const el = document.getElementById("legendPanel");
  const head = (t, s) => `<h2>${t}</h2><div class="gold"></div><p class="sub">${s}</p>`;
  const op = on => on ? 1 : 0.2;
  // Counts follow the state filter
  const inState = f => f.d && (!stateF || f.d[1]===stateF);
  const where = stateF ? ` in ${stateF}` : "";
  if (view==="bi"){
    const cnt = d3.rollup(counties.filter(f=>inState(f) && f.ex!=null), v=>v.length, f=>f.ds+"-"+f.ex);
    const rowN = r => num((cnt.get(r+"-0")||0) + (cnt.get(r+"-1")||0) + (cnt.get(r+"-2")||0));
    let cells = "";
    for (let r=2;r>=0;r--) for (let c=0;c<3;c++){
      const k=r+"-"+c, n = num(cnt.get(k)||0), on = !sel || (sel.ex===c && sel.ds===r);
      const lbl = `${DIS_LBL[r]} labor market, ${EXP_LBL[c]} AI exposure: ${n} counties`;
      cells += `<button type="button" class="cell" style="background:${BI[r][c]};color:${r===2?"#fff":"#1F2024"};opacity:${op(on)}" data-r="${r}" data-c="${c}" aria-pressed="${!!sel && on}" aria-label="${lbl}" title="${lbl}">${n}</button>`;
    }
    el.innerHTML = head("Legend", `Numbers are county counts${where}. Click a square to isolate it.`) +
      `<div class="biv"><div class="ylab"><span class="axis">Labor distress →</span></div>
        <div class="rlab"><span>Distressed<small>${rowN(2)}</small></span><span>Marginal<small>${rowN(1)}</small></span><span>Healthy<small>${rowN(0)}</small></span></div>
        <div><div class="grid3">${cells}</div>
          <div class="ticks"><span>Low</span><span>Mid</span><span>High</span></div>
          <div class="axis xtitle">AI exposure share →</div></div></div>`;
    el.querySelectorAll(".cell").forEach(b => b.onclick = () => {
      const r=+b.dataset.r, c=+b.dataset.c;
      sel = (sel && sel.ex===c && sel.ds===r) ? null : {ex:c, ds:r}; render();
    });
  } else if (view==="ex"){
    const stops = d3.range(0,1.01,.1).map(t=>expScale(0.27+t*0.09)).join(",");
    el.innerHTML = head("AI exposure share", "Share of county jobs exposed to generative AI.") +
      `<div class="ramp" style="background:linear-gradient(90deg,${stops})"></div>
      <div class="ramp-lab"><span>≤27%</span><span>31.5%</span><span>≥36%</span></div>`;
  } else if (view==="gv"){
    const withD = counties.filter(f=>inState(f) && TOPI[f.id]);
    const cnt = d3.rollup(withD, v=>v.length, f=>TOPI[f.id].cat);
    const unsure = withD.filter(f=>!TOPI[f.id].sure).length;
    el.innerHTML = head("Largest industry", `Sector with the most jobs located in the county (BLS, 2024). Government combines federal, state and local. Counts are counties${where}. Click to isolate.`) +
      `<div class="cats">${LCAT.map(d=>{ const n = num(cnt.get(d.key)||0);
        return `<button type="button" class="cat" style="opacity:${op(!sel || sel.ind===d.key)}" data-k="${d.key}" aria-pressed="${!!sel && sel.ind===d.key}" aria-label="Largest industry ${d.key}: ${n} counties"><i style="background:${d.c}"></i><span class="lbl">${d.key}${d.note?`<small>${d.note}</small>`:""}</span><span class="n">${n}</span></button>`; }).join("")}
        <div class="hatch-row"><i></i><span class="lbl">Striped: BLS withheld enough jobs that a different sector could be largest</span><span class="n">${num(unsure)}</span></div></div>`;
    el.querySelectorAll(".cat").forEach(b => b.onclick = () => { sel = (sel && sel.ind===b.dataset.k) ? null : {ind:b.dataset.k}; render(); });
  } else {
    const cnt = d3.rollup(counties.filter(inState), v=>v.length, f=>f.d[6]);
    el.innerHTML = head("Labor distress", `Prime-age employment rate ranking. Counts are counties${where}. Click to isolate.`) +
      `<div class="cats">${CAT5.map((c,i)=>{ const n = num(cnt.get(c)||0);
        return `<button type="button" class="cat" style="opacity:${op(!sel || sel.cat===c)}" data-c="${c}" aria-pressed="${!!sel && sel.cat===c}" aria-label="${c}: ${n} counties"><i style="background:${CAT5C[i]}"></i><span class="lbl">${c}</span><span class="n">${n}</span></button>`; }).join("")}</div>
      <p class="legend-note">Thresholds: ≥82.8%, 80–82.8%, 76.5–80%, 72.3–76.5%, &lt;72.3%.</p>`;
    el.querySelectorAll(".cat").forEach(b => b.onclick = () => { sel = (sel && sel.cat===b.dataset.c) ? null : {cat:b.dataset.c}; render(); });
  }
}

// Stats for current selection (+ state filter)
let stateF = "";
function stats(){
  const fs = counties.filter(f => f.d && inSel(f) && (!stateF || f.d[1]===stateF));
  const tj = d3.sum(fs, f=>f.d[4]||0), pop = d3.sum(fs, f=>f.d[7]);
  const withEx = fs.filter(f=>f.d[3]!=null), ej = d3.sum(withEx, f=>f.d[3]), eb = d3.sum(withEx, f=>f.d[4]||0);
  let label = "All counties";
  if (sel && view==="bi") label = `${DIS_LBL[sel.ds]} labor market · ${EXP_LBL[sel.ex]} AI exposure`;
  if (sel && view==="ds") label = sel.cat;
  if (sel && view==="gv") label = "Largest industry: " + sel.ind;
  document.getElementById("sumSub").textContent = label + (stateF ? " · " + stateF : "");
  const kpis = [
    ["Counties", num(fs.length), num(fs.length)],
    ["Population", compact(pop), num(pop)],
    ["Total jobs", compact(tj), num(tj)],
    ["AI-exposed jobs", compact(ej), num(ej), "ej"],
    ["Exposure share (job-weighted)", eb ? pct(ej/eb) : "n/a", "", "es"]
  ];
  document.getElementById("stats").innerHTML = kpis.map(([k,v,t,q]) => `<div class="kpi"${t ? ` title="${t}"` : ""}><div class="k">${k}${q ? ` <button type="button" class="qm" data-def="${q}" aria-label="What does “${k}” mean?">?</button>` : ""}</div><div class="v">${v}</div></div>`).join("");
}

// Term definitions for the "?" buttons in the summary strip
const DEFS = {
  ej: "Brookings Institution estimate: employment in each occupation multiplied by that occupation's generative AI exposure rating (the share of its work AI could do or speed up substantially), summed across the counties shown. It is a weighted count, not a headcount, and exposed does not mean the job will be lost. See Methodology below.",
  es: "AI-exposed jobs divided by total jobs across the counties shown. It is weighted by jobs, so larger counties count more; it is not the average of county percentages."
};
const qpop = document.getElementById("qpop"), statsEl = document.getElementById("stats");
function showDef(b){
  qpop.textContent = DEFS[b.dataset.def];
  qpop.hidden = false;
  const r = b.getBoundingClientRect(), w = qpop.offsetWidth, h = qpop.offsetHeight;
  const x = Math.max(8, Math.min(r.left + r.width/2 - w/2, document.documentElement.clientWidth - w - 8));
  const y = r.bottom + 8 + h > window.innerHeight ? r.top - h - 8 : r.bottom + 8;
  qpop.style.transform = `translate(${x}px,${y}px)`;
  b.setAttribute("aria-describedby", "qpop");
}
function hideDef(){ qpop.hidden = true; statsEl.querySelectorAll(".qm[aria-describedby]").forEach(b => b.removeAttribute("aria-describedby")); }
statsEl.addEventListener("pointerover", e => { const b = e.target.closest(".qm"); if (b) showDef(b); });
statsEl.addEventListener("pointerout", e => { if (e.target.closest(".qm")) hideDef(); });
statsEl.addEventListener("focusin", e => { const b = e.target.closest(".qm"); if (b) showDef(b); });
statsEl.addEventListener("focusout", hideDef);
statsEl.addEventListener("click", e => { const b = e.target.closest(".qm"); if (b) showDef(b); });
document.addEventListener("keydown", e => { if (e.key === "Escape") hideDef(); });
window.addEventListener("scroll", hideDef, {passive:true});

// Top list
function topList(){
  const fs = counties.filter(f => f.d && f.ex===2 && f.ds===2 && (!stateF || f.d[1]===stateF))
    .sort((a,b)=>b.d[3]-a.d[3]).slice(0,10);
  const ol = document.getElementById("top");
  ol.innerHTML = fs.length ? fs.map((f,i)=>`<li><button type="button" data-id="${f.id}"><span class="rk">${String(i+1).padStart(2,"0")}</span>
    <span class="tx"><span class="nm">${f.d[0]}</span><span class="mt">${num(f.d[3])} jobs · ${pct(f.d[2])} · emp. ${pct(f.d[5])}</span></span></button></li>`).join("")
    : `<li class="none">None in this state.</li>`;
  document.getElementById("topMeta").textContent = fs.length ? `Top ${fs.length}${stateF ? " in " + stateF : ""}` : "None in this state";
  ol.querySelectorAll("button[data-id]").forEach(b => b.onclick = () => focusCounty(b.dataset.id));
}

// Tooltip
const tip = document.getElementById("tip"), wrap = document.getElementById("mapwrap");
function showTip(f){
  const d = f.d; if (!d) return;
  const rows = [
    ["AI exposure share", pct(d[2])],
    ["Exposed jobs", d[3]==null ? "n/a" : `${num(d[3])} of ${d[4]==null ? "n/a" : num(d[4])}`],
    ["Prime-age employment", pct(d[5])],
    ["Distress ranking", CAT5.includes(d[6]) ? d[6] : "n/a"],
    ["Population", num(d[7])]
  ];
  if (IND[f.id] && IND[f.id][14]){
    const L = largest(f.id);
    rows.push(["Government share of jobs", pct(govShare(f.id))], ["Largest sector", `${L.lbl} (${pct(L.share)})`]);
  }
  const unsure = TOPI[f.id] && !TOPI[f.id].sure;
  const sw = view==="bi" && f.ex!=null ? `<div class="sw"><i style="background:${BI[f.ds][f.ex]}"></i><span>${DIS_LBL[f.ds]} · ${EXP_LBL[f.ex]} exposure</span></div>` : "";
  tip.innerHTML = `<div class="name">${d[0]}</div>${rows.map(([k,v]) => `<div class="row"><span>${k}</span><span>${v}</span></div>`).join("")}
    ${unsure ? `<div class="unsure">Uncertain: withheld jobs could change this</div>` : ""}
    <div class="tfoot">${sw}<div>Labor market: ${d[8]}</div></div>`;
  tip.hidden = false;
}
function placeTip(mx, my){
  const W = wrap.clientWidth, H = wrap.clientHeight, w = tip.offsetWidth || 280, h = tip.offsetHeight || 220;
  let x = mx + 14 + w > W ? mx - 14 - w : mx + 14;
  let y = my + 14 + h > H ? my - 14 - h : my + 14;
  x = Math.max(4, Math.min(x, W - w - 4)); y = Math.max(4, y);
  tip.style.transform = `translate(${x}px,${y}px)`;
}
function moveTip(e){ const r = wrap.getBoundingClientRect(); placeTip(e.clientX - r.left, e.clientY - r.top); }
function hideTip(){ hoverLine.attr("d", null); tip.hidden = true; }
paths.on("pointerenter", (e,f) => { hoverLine.attr("d", path(f)); if (f.d) { showTip(f); moveTip(e); } else tip.hidden = true; })
     .on("pointermove", e => moveTip(e))
     .on("click", (e,f) => { if (f.d) setPinned(f.id); });
svg.on("pointerleave", hideTip);

// Zoom
const zoom = d3.zoom().scaleExtent([1,40]).translateExtent([[0,0],[975,610]]).on("zoom", e => {
  g.attr("transform", e.transform);
  pat.attr("patternTransform", `scale(${1/e.transform.k}) rotate(45)`);
});
svg.call(zoom);
function zoomTo(feat){
  const [[x0,y0],[x1,y1]] = path.bounds(feat);
  const k = Math.min(40, 0.9/Math.max((x1-x0)/975,(y1-y0)/610));
  return svg.transition().duration(reduce?0:650).call(zoom.transform, d3.zoomIdentity.translate(487.5,305).scale(k).translate(-(x0+x1)/2,-(y0+y1)/2));
}
function zoomOut(){ svg.transition().duration(reduce?0:650).call(zoom.transform, d3.zoomIdentity); }
function focusCounty(id){
  const f = byId.get(id); if (!f) return;
  hideTip(); setPinned(id);
  const mb = document.getElementById("mapbox").getBoundingClientRect();
  if (mb.top < 0 || mb.bottom > window.innerHeight) document.getElementById("mapbox").scrollIntoView({behavior: reduce ? "auto" : "smooth", block: "start"});
  zoomTo(f).on("end", () => {
    const [cx,cy] = d3.zoomTransform(svg.node()).apply(path.centroid(f));
    const s = wrap.clientWidth / 975;
    hoverLine.attr("d", path(f)); showTip(f); placeTip(cx*s, cy*s);
  });
}

// State filter
const states = topojson.feature(TOPO, TOPO.objects.states).features;
const stateNames = [...new Set(Object.values(R).map(r=>r[1]))].sort();
const stSel = document.getElementById("state");
stateNames.forEach(s => stSel.add(new Option(s, s)));
stSel.onchange = () => {
  stateF = stSel.value;
  const sf = states.find(s => s.properties.name === stateF);
  if (sf) zoomTo(sf); else zoomOut();
  render(); topList();
};

// Search
const byName = new Map(Object.entries(R).map(([id,r]) => [r[0], id]));
document.getElementById("countylist").innerHTML = [...byName.keys()].sort().map(n=>`<option value="${n}">`).join("");
document.getElementById("search").onchange = e => { const id = byName.get(e.target.value); if (id) focusCounty(id); };

document.getElementById("reset").onclick = () => {
  sel = null; stateF = ""; stSel.value = ""; document.getElementById("search").value = "";
  hideTip(); setPinned(null); zoomOut(); render(); topList();
};

// View toggle
[["v-bi","bi"],["v-ex","ex"],["v-ds","ds"],["v-gv","gv"]].forEach(([id,v]) => document.getElementById(id).onclick = () => {
  if (view === v) return;
  view = v; sel = null;
  document.querySelectorAll("#mapbox .seg button").forEach(b => b.setAttribute("aria-pressed", b.id===id));
  render();
});
[["w-pool","pool"],["w-avg","avg"]].forEach(([id,v]) => document.getElementById(id).onclick = () => {
  weight = v;
  document.querySelectorAll("#wseg button").forEach(b => b.setAttribute("aria-pressed", b.id===id));
  indPanel();
});

render(); topList();
