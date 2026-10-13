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
  {key:"Government", c:"#1E3A65", dark:true},
  {key:"Trade, transportation & utilities", c:"#5BC0BE"},
  {key:"Manufacturing", c:"#9085E9"},
  {key:"Private education & health care", c:"#B5179E", dark:true},
  {key:"Leisure & hospitality", c:"#EDA100"},
  {key:"Agriculture, forestry & mining", c:"#008300", dark:true},
  {key:"Other", c:"#8E8D86", note:"Professional services, construction, finance, information, other services"}
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
document.getElementById("q1").textContent = pct(Q1);
document.getElementById("q2").textContent = pct(Q2);

// Bivariate palette: columns = exposure (low→high, toward gold), rows = distress (healthy→distressed, toward navy)
const BI = [
  ["#E8E6E1","#F2D59A","#F2B33D"],
  ["#AFBBD0","#B9A887","#B98935"],
  ["#5E79A6","#68667A","#4A3B2C"]
];
const DARKCELL = new Set(["2-0","2-1","2-2","1-2"]);
const EXP_LBL = ["Low","Mid","High"], DIS_LBL = ["Healthy","Marginal","Distressed"];
const CAT5 = ["Fully employed","Close to fully employed","Marginally distressed","Distressed","Severely distressed"];
const CAT5C = ["#DDE3EC","#AFBBD0","#8297BB","#4F6A98","#1E3A65"];
const NA = "#C9C9C4";
const expScale = d3.scaleSequential(t => d3.interpolateRgb("#F6EEDB","#B26A00")(t)).domain([0.27,0.36]).clamp(true);

const ex = v => v==null ? null : v < Q1 ? 0 : v < Q2 ? 1 : 2;
const ds = r => r < .765 ? 2 : r < .80 ? 1 : 0;

const counties = topojson.feature(TOPO, TOPO.objects.counties).features;
counties.forEach(f => { const r = R[f.id]; f.d = r; if (r) { f.ex = r[5]==null ? null : ex(r[2]); f.ds = r[5]==null ? null : ds(r[5]); } });
const path = d3.geoPath();
const svg = d3.select("#map"), g = svg.append("g");
const cg = g.append("g");
const paths = cg.selectAll("path").data(counties).join("path").attr("class","county").attr("d",path);
g.append("path").attr("class","states").attr("d", path(topojson.mesh(TOPO, TOPO.objects.states, (a,b)=>a!==b)));
g.append("path").attr("class","states").attr("d", path(topojson.mesh(TOPO, TOPO.objects.nation)));
const defs = svg.append("defs");
defs.append("pattern").attr("id","hatch").attr("patternUnits","userSpaceOnUse").attr("width",3).attr("height",3).attr("patternTransform","rotate(45)")
  .append("rect").attr("width",1).attr("height",3).attr("fill","#FFFFFF").attr("fill-opacity",0.75);
const hatch = g.append("path").attr("class","hatch").attr("fill","url(#hatch)").style("pointer-events","none");
g.selectAll(".states").raise();
const hover = g.append("path").attr("class","hover");

let view = "bi", sel = null; // sel = {ex,ds} or {cat5}
function fill(f){
  if (!f.d) return NA;
  if (view==="bi") return f.ex==null ? NA : BI[f.ds][f.ex];
  if (view==="ex") return f.d[2]==null ? NA : expScale(f.d[2]);
  if (view==="gv") { const t = TOPI[f.id]; return t ? LCAT[LCAT_IDX.get(t.cat)].c : NA; }
  return CAT5.includes(f.d[6]) ? CAT5C[CAT5.indexOf(f.d[6])] : NA;
}
function inSel(f){
  if (!sel || !f.d) return true;
  if (view==="bi") return f.ex===sel.ex && f.ds===sel.ds;
  if (view==="ds") return f.d[6]===sel.cat;
  if (view==="gv") return TOPI[f.id] ? TOPI[f.id].cat===sel.ind : false;
  return true;
}
function render(){
  paths.attr("fill", fill).classed("dim", f => !inSel(f));
  hatch.attr("d", view==="gv" ? path({type:"FeatureCollection", features:counties.filter(f => TOPI[f.id] && !TOPI[f.id].sure && inSel(f))}) : null);
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
function indPanel(){
  const pin = document.getElementById("pin"), sub = document.getElementById("indSub"), el = document.getElementById("ind");
  document.getElementById("wseg").style.display = pinned ? "none" : "";
  let ids, jobs;
  if (pinned){
    const d = R[pinned];
    pin.innerHTML = `<div class="pinned"><span><b>${d[0]}</b></span><button id="unpin">Show selection</button></div>`;
    document.getElementById("unpin").onclick = () => { pinned = null; hover.attr("d", null); indPanel(); };
    ids = IND[pinned] ? [pinned] : [];
    jobs = IND[pinned] ? IND[pinned][14] : 0;
    sub.textContent = ids.length ? `${num(jobs)} jobs located in the county, 2024.` : "";
  } else {
    pin.innerHTML = "";
    ids = counties.filter(f => f.d && IND[f.id] && inSel(f) && (!stateF || f.d[1]===stateF)).map(f=>f.id);
    jobs = d3.sum(ids, id => IND[id][14]);
    sub.textContent = `${document.getElementById("sumSub").textContent}: ${num(ids.length)} counties, ${num(jobs)} jobs. Click a county on the map to see it alone.`;
  }
  const us = weight === "pool" || pinned ? US_POOL : US_AVG;
  document.getElementById("usKey").textContent = us === US_POOL ? "U.S. overall" : "Average U.S. county";
  const m = pinned ? (ids.length ? ids.map(id => IND[id].slice(0,14).map(v => v/IND[id][14]))[0] : null) : mixOf(ids);
  if (!m){ el.innerHTML = `<p class="sub" style="margin:0">No BLS employment data for this area.</p>`; return; }
  const max = Math.max(d3.max(m), d3.max(us));
  let html = "", grp = "";
  SECT.forEach(s => {
    if (s.nd && m[s.k] < 0.0005) return;
    if (s.g !== grp){ grp = s.g; html += `<div class="grp">${grp === "Government" ? "Government · " + pct(m[0]+m[1]+m[2]) : "Private employers"}</div>`; }
    const w = (m[s.k]/max*100).toFixed(1), t = (us[s.k]/max*100).toFixed(1);
    html += `<div class="r ${s.nd?"nd":""}" title="${s.lbl}: ${pct(m[s.k])} here vs. ${pct(us[s.k])} U.S.">
      <span class="lbl">${s.lbl}</span><span class="val">${pct(m[s.k])} <small>U.S. ${pct(us[s.k])}</small></span>
      <div class="bar" aria-hidden="true"><i class="${s.gov?"gov":""}" style="width:${w}%"></i>${s.nd?"":`<b style="left:${t}%"></b>`}</div></div>`;
  });
  el.innerHTML = html;
}

// Legend
function legend(){
  const el = document.getElementById("legendPanel");
  if (view==="bi"){
    const cnt = d3.rollup(counties.filter(f=>f.d && f.ex!=null), v=>v.length, f=>f.ds+"-"+f.ex);
    let cells = "";
    for (let r=2;r>=0;r--) for (let c=0;c<3;c++){
      const k=r+"-"+c, on = !sel || (sel.ex===c && sel.ds===r);
      cells += `<button class="cell ${DARKCELL.has(k)?"dark":""} ${on?"":"off"}" style="background:${BI[r][c]}" data-r="${r}" data-c="${c}" aria-label="${DIS_LBL[r]} labor market, ${EXP_LBL[c]} AI exposure: ${cnt.get(k)||0} counties">${cnt.get(k)||0}</button>`;
    }
    el.innerHTML = `<h2>Legend</h2><p class="sub">Numbers are county counts. Click a square to isolate it.</p>
      <div class="legend"><div class="ylab">Labor distress →</div><div class="grid3">${cells}</div>
      <div class="ticks"><span>Low</span><span>Mid</span><span>High</span></div>
      <div class="xtitle">AI exposure share →</div></div>`;
    el.querySelectorAll(".cell").forEach(b => b.onclick = () => {
      const r=+b.dataset.r, c=+b.dataset.c;
      sel = (sel && sel.ex===c && sel.ds===r) ? null : {ex:c, ds:r}; render();
    });
  } else if (view==="ex"){
    const stops = d3.range(0,1.01,.1).map(t=>expScale(0.27+t*0.09)).join(",");
    el.innerHTML = `<h2>AI exposure share</h2><p class="sub">Share of county jobs exposed to generative AI.</p>
      <div class="ramp" style="background:linear-gradient(90deg,${stops})"></div>
      <div class="xlab" style="margin-top:4px"><span>≤27%</span><span>31.5%</span><span>≥36%</span></div>`;
  } else if (view==="gv"){
    const withD = counties.filter(f=>f.d && TOPI[f.id]);
    const cnt = d3.rollup(withD, v=>v.length, f=>TOPI[f.id].cat);
    const unsure = withD.filter(f=>!TOPI[f.id].sure).length;
    el.innerHTML = `<h2>Largest industry</h2><p class="sub">Sector with the most jobs located in the county (BLS, 2024). Government combines federal, state and local. Click to isolate.</p>
      <div class="cat">${LCAT.map(d=>`<div><button class="cell ${sel&&sel.ind!==d.key?"off":""}" style="width:16px;height:16px;aspect-ratio:auto;flex:none;background:${d.c}" data-k="${d.key}" aria-label="Isolate ${d.key}"></button><span>${d.key}${d.note?`<br><span style="color:var(--muted);font-size:11px">${d.note}</span>`:""}</span> <span style="color:var(--muted);margin-left:auto;font-variant-numeric:tabular-nums">${num(cnt.get(d.key)||0)}</span></div>`).join("")}
      <div style="margin-top:4px"><i style="background:repeating-linear-gradient(45deg,#8E8D86 0 2px,#FFFFFF 2px 3.5px)"></i><span>Striped: BLS withheld enough jobs that a different sector could be largest</span> <span style="color:var(--muted);margin-left:auto;font-variant-numeric:tabular-nums">${num(unsure)}</span></div></div>`;
    el.querySelectorAll(".cell").forEach(b => b.onclick = () => { sel = (sel && sel.ind===b.dataset.k) ? null : {ind:b.dataset.k}; render(); });
  } else {
    const cnt = d3.rollup(counties.filter(f=>f.d), v=>v.length, f=>f.d[6]);
    el.innerHTML = `<h2>Labor distress</h2><p class="sub">Prime-age employment rate ranking. Click to isolate.</p>
      <div class="cat">${CAT5.map((c,i)=>`<div><button class="cell ${sel&&sel.cat!==c?"off":""}" style="width:16px;height:16px;aspect-ratio:auto;background:${CAT5C[i]}" data-c="${c}" aria-label="Isolate ${c}"></button>${c} <span style="color:var(--muted);margin-left:auto">${num(cnt.get(c)||0)}</span></div>`).join("")}</div>
      <p class="sub" style="margin:8px 0 0">Thresholds: ≥82.8%, 80–82.8%, 76.5–80%, 72.3–76.5%, &lt;72.3%.</p>`;
    el.querySelectorAll(".cell").forEach(b => b.onclick = () => { sel = (sel && sel.cat===b.dataset.c) ? null : {cat:b.dataset.c}; render(); });
  }
}

// Stats for current selection (+ state filter)
let stateF = "";
function stats(){
  const fs = counties.filter(f => f.d && inSel(f) && (!stateF || f.d[1]===stateF));
  const ej = d3.sum(fs, f=>f.d[3]||0), tj = d3.sum(fs, f=>f.d[4]||0), pop = d3.sum(fs, f=>f.d[7]);
  const valid = fs.filter(f=>f.d[2]!=null && f.d[5]!=null);
  const r = valid.length>2 ? corr(valid.map(f=>f.d[2]), valid.map(f=>f.d[5])) : null;
  let label = "All counties";
  if (sel && view==="bi") label = `${DIS_LBL[sel.ds]} labor market · ${EXP_LBL[sel.ex]} AI exposure`;
  if (sel && view==="ds") label = sel.cat;
  if (sel && view==="gv") label = "Largest industry: " + sel.ind;
  document.getElementById("sumSub").textContent = label + (stateF ? " · " + stateF : "");
  document.getElementById("stats").innerHTML = `
    <span>Counties</span><span>${num(fs.length)}</span>
    <span>Population</span><span>${num(pop)}</span>
    <span>Total jobs</span><span>${num(tj)}</span>
    <span>AI-exposed jobs</span><span>${num(ej)}</span>
    <span>Exposure share (job-weighted)</span><span>${tj?pct(ej/tj):"n/a"}</span>
    ${sel ? "" : `<span>Correlation, exposure vs. employment rate</span><span>${r==null?"n/a":"r = "+r.toFixed(2)}</span>`}`;
}
function corr(x,y){const mx=d3.mean(x),my=d3.mean(y);let a=0,b=0,c=0;for(let i=0;i<x.length;i++){const dx=x[i]-mx,dy=y[i]-my;a+=dx*dy;b+=dx*dx;c+=dy*dy}return a/Math.sqrt(b*c)}

// Top list
function topList(){
  const fs = counties.filter(f => f.d && f.ex===2 && f.ds===2 && (!stateF || f.d[1]===stateF))
    .sort((a,b)=>b.d[3]-a.d[3]).slice(0,10);
  const ol = document.getElementById("top");
  ol.innerHTML = fs.length ? fs.map(f=>`<li data-id="${f.id}">${f.d[0]} <span class="n">${num(f.d[3])} jobs · ${pct(f.d[2])} · emp. ${pct(f.d[5])}</span></li>`).join("") : `<li style="list-style:none;margin-left:-20px;color:var(--muted)">None in this state.</li>`;
  ol.querySelectorAll("li[data-id]").forEach(li => li.onclick = () => focusCounty(li.dataset.id));
}

// Tooltip
const tip = document.getElementById("tip"), box = document.getElementById("mapbox");
function showTip(f, x, y){
  const d = f.d; if (!d) return;
  const sw = view==="bi" && f.ex!=null ? `<span class="sw" style="background:${BI[f.ds][f.ex]}"></span>${DIS_LBL[f.ds]} · ${EXP_LBL[f.ex]} exposure` : "";
  tip.innerHTML = `<b>${d[0]}</b>
    <div class="row"><span>AI exposure share</span><span>${pct(d[2])}</span></div>
    <div class="row"><span>Exposed jobs</span><span>${d[3]==null?"n/a":num(d[3])} of ${d[4]==null?"n/a":num(d[4])}</span></div>
    <div class="row"><span>Prime-age employment</span><span>${pct(d[5])}</span></div>
    <div class="row"><span>Distress ranking</span><span>${d[6]}</span></div>
    <div class="row"><span>Population</span><span>${num(d[7])}</span></div>
    ${IND[f.id] ? (() => { const L = largest(f.id); return `<div class="row"><span>Government share of jobs</span><span>${pct(govShare(f.id))}</span></div>
    <div class="row"><span>Largest sector</span><span style="text-align:right">${L.lbl} (${pct(L.share)})${TOPI[f.id] && !TOPI[f.id].sure ? "<br><span style='color:var(--muted);font-size:11px'>Uncertain: withheld jobs could change this</span>" : ""}</span></div>`; })() : ""}
    <div style="margin-top:6px;color:var(--muted);font-size:12px">${sw ? sw + "<br>" : ""}Labor market: ${d[8]}</div>`;
  tip.hidden = false;
  const bb = box.getBoundingClientRect(), w = 280, h = tip.offsetHeight;
  let lx = x - bb.left + 14, ly = y - bb.top + 14;
  if (lx + w > bb.width) lx = x - bb.left - w - 14;
  if (lx < 0) lx = 4;
  if (ly + h > bb.height) ly = Math.max(4, y - bb.top - h - 14);
  tip.style.left = lx+"px"; tip.style.top = ly+"px";
}
paths.on("pointermove", (e,f) => { hover.attr("d", path(f)); showTip(f, e.clientX, e.clientY); })
     .on("pointerleave", () => { hover.attr("d", pinned ? path(counties.find(c=>c.id===pinned)) : null); tip.hidden = true; })
     .on("click", (e,f) => { if (!f.d) return; pinned = f.id; hover.attr("d", path(f)); indPanel(); });

// Zoom
const zoom = d3.zoom().scaleExtent([1,40]).translateExtent([[0,0],[975,610]]).on("zoom", e => g.attr("transform", e.transform));
svg.call(zoom);
function zoomTo(feat){
  const [[x0,y0],[x1,y1]] = path.bounds(feat);
  const k = Math.min(40, 0.9/Math.max((x1-x0)/975,(y1-y0)/610));
  svg.transition().duration(reduce?0:650).call(zoom.transform, d3.zoomIdentity.translate(487.5,305).scale(k).translate(-(x0+x1)/2,-(y0+y1)/2));
}
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
function focusCounty(id){
  const f = counties.find(c=>c.id===id); if (!f) return;
  zoomTo(f); hover.attr("d", path(f)); pinned = id; indPanel();
  const [cx,cy] = path.centroid(f);
  setTimeout(()=>{ const p = svg.node().createSVGPoint(); p.x=cx; p.y=cy; const s = p.matrixTransform(g.node().getScreenCTM()); showTip(f, s.x, s.y); }, reduce?0:700);
}

// State filter
const states = topojson.feature(TOPO, TOPO.objects.states).features;
const stateNames = [...new Set(Object.values(R).map(r=>r[1]))].sort();
const stSel = document.getElementById("state");
stateNames.forEach(s => stSel.add(new Option(s, s)));
stSel.onchange = () => {
  stateF = stSel.value;
  const sf = states.find(s => s.properties.name === stateF);
  if (sf) zoomTo(sf); else svg.transition().duration(reduce?0:650).call(zoom.transform, d3.zoomIdentity);
  stats(); topList(); indPanel();
};

// Search
const byName = new Map(Object.entries(R).map(([id,r]) => [r[0], id]));
document.getElementById("countylist").innerHTML = [...byName.keys()].sort().map(n=>`<option value="${n}">`).join("");
document.getElementById("search").onchange = e => { const id = byName.get(e.target.value); if (id) focusCounty(id); };

document.getElementById("reset").onclick = () => {
  sel = null; stateF = ""; stSel.value = ""; document.getElementById("search").value = ""; pinned = null;
  hover.attr("d",null); tip.hidden = true;
  svg.transition().duration(reduce?0:650).call(zoom.transform, d3.zoomIdentity); render(); topList();
};

// View toggle
[["v-bi","bi"],["v-ex","ex"],["v-ds","ds"],["v-gv","gv"]].forEach(([id,v]) => document.getElementById(id).onclick = () => {
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
