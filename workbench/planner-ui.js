(function () {
  "use strict";
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useMemo = React.useMemo;
  var html = htm.bind(h);
  var STORE = "rr-margin-planner-v1";
  /* Raynor Realty badge, 160px JPEG, inlined so the page has no outside image to load. */
  var LOGO = "data:image/jpeg;base64,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";
  var UI_STORE = "rr-margin-planner-ui-v1";
  var SEED_LABEL = "Seed model (initial numbers)";
  var PAGES = [
    { id: "summary", label: "Summary" },
    { id: "portfolio", label: "Portfolio", n: 1 },
    { id: "costs", label: "Costs", n: 2 },
    { id: "services", label: "Services", n: 3 },
    { id: "fees", label: "Add-ons", n: 4 },
    { id: "prices", label: "Prices", n: 5 },
    { id: "growth", label: "Growth" },
    { id: "acq", label: "Acquisitions" },
    { id: "compare", label: "Compare" }
  ];
  var PAGE_IDS = PAGES.map(function (p) { return p.id; });

  var DEFAULT_UI = {
    page: "summary", focus: "all", sel: null, compareDoors: null,
    costFilter: { q: "", show: "all" }, scopeFilter: { q: "", show: "all" },
    groups: {}, owners: {}, cats: {},
    pfShut: {}, railShut: {}, railHidden: false, compareList: null
  };

  /* ------------------------------ helpers ------------------------------ */
  function money(n, d) {
    d = d == null ? 0 : d;
    return (n < 0 ? "-" : "") + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function pct(n, d) { return n.toFixed(d == null ? 1 : d) + "%"; }
  function fmtNum(n) { return n.toLocaleString("en-US", { maximumFractionDigits: 2 }); }
  function round(n) { return String(Math.round(n * 100) / 100); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function tierList(focus) { return focus === "all" ? TIERS : [focus]; }

  function load() {
    try {
      var raw = localStorage.getItem(STORE);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && validDoc(s.doc)) return { doc: normalizeDoc(s.doc), source: s.source || SEED_LABEL, scen: s.scen || null, dirty: !!s.dirty };
      }
    } catch (e) {}
    return { doc: normalizeDoc(SEED_DOC), source: SEED_LABEL };
  }
  function loadUi() {
    var ui = clone(DEFAULT_UI);
    try {
      var s = JSON.parse(localStorage.getItem(UI_STORE) || "null");
      if (s) {
        if (PAGE_IDS.indexOf(s.page) >= 0) ui.page = s.page;
        ui.focus = TIERS.indexOf(s.focus) >= 0 ? s.focus : "all";
        Object.assign(ui.costFilter, s.costFilter || {});
        Object.assign(ui.scopeFilter, s.scopeFilter || {});
        ui.groups = s.groups || {}; ui.owners = s.owners || {}; ui.cats = s.cats || {};
        ui.compareDoors = typeof s.compareDoors === "number" ? s.compareDoors : null;
        ui.compareList = Array.isArray(s.compareList) ? s.compareList.filter(function (n) { return typeof n === "number" && n > 0; }).slice(0, 3) : null;
        ui.pfShut = s.pfShut || {}; ui.railShut = s.railShut || {}; ui.railHidden = !!s.railHidden; ui.hideSaveHint = !!s.hideSaveHint;
      }
    } catch (e) {}
    try {
      var hash = (location.hash || "").slice(1);
      if (PAGE_IDS.indexOf(hash) >= 0) ui.page = hash;
    } catch (e) {}
    ui.sel = null;
    return ui;
  }

  /* Everything the page shows is derived from the scenario in one pass. */
  function compute(doc) {
    var allViews = {};
    VIEWS.forEach(function (v) { allViews[v] = tierCost(doc, v); });
    var cost = allViews[doc.cv], margins = {};
    TIERS.forEach(function (t) { margins[t] = tierMargin(doc, t, cost.perDoor[t]); });
    return { cost: cost, allViews: allViews, margins: margins };
  }
  function verdict(m, target) {
    if (m.marginPct < 0) return { cls: "bad", label: "Losing money" };
    if (m.marginPct < target) return { cls: "warn", label: "Below target" };
    return { cls: "good", label: "On target" };
  }
  function deltasBetween(a, b) {
    var ca = compute(a), cb = compute(b), out = {};
    TIERS.forEach(function (t) {
      out[t] = { door: cb.margins[t].margin - ca.margins[t].margin, pts: cb.margins[t].marginPct - ca.margins[t].marginPct };
    });
    return out;
  }
  function viewGroups(doc) {
    var by = { direct: [], allocated: [], loaded: [] };
    doc.CG.forEach(function (g) { by[doc.secView[g.id] || "direct"].push(g.label); });
    return by;
  }
  function rowName(doc, r) { return r.promoted ? doc.MASTER[r.id].n : r.name; }
  function findCostRow(doc, id) {
    var out = null;
    doc.CG.forEach(function (g) { groupRows(doc, g).forEach(function (r) { if (r.id === id) out = { row: r, group: g }; }); });
    return out;
  }
  /* A cost line's $/door/mo in one tier at a view: 0 when unchecked or not counted there. */
  function lineCost(doc, r, gid, t, view) {
    var f = activeTemplate(doc).ck[r.id] || {};
    if (!f[t] || !isVisible(rowView(doc, r.id, gid), view) || !doc.G.doors) return 0;
    if (r.id === "lease_brk") return leaseBreakMo(doc, t) / doc.G.doors;
    return linePerDoor(doc, cmo(r, doc), r, gid);
  }
  function viewTag(doc, rid, gid) {
    var rv = rowView(doc, rid, gid);
    return rv === "direct" ? null : VIEW_NAMES[rv].replace("Fully ", "") + " +";
  }

  /* Filter test shared by the tables. flags = tier checkboxes, counted = counts at the current view. */
  function passes(filter, focus, name, flags, counted) {
    if (filter.q && name.toLowerCase().indexOf(filter.q.toLowerCase()) < 0) return false;
    var on = tierList(focus).map(function (t) { return !!flags[t]; });
    switch (filter.show) {
      case "out": return on.some(function (x) { return !x; });
      case "in": return on.every(function (x) { return x; });
      case "differ":
        var all = TIERS.map(function (t) { return !!flags[t]; });
        return all.some(function (x) { return x !== all[0]; });
      case "counted": return counted;
      default: return true;
    }
  }

  /* ------------------------------ small controls ------------------------------ */
  /* Number input that keeps what you're typing ("1.", "") until blur, but commits every valid change live. */
  function Num(props) {
    var _s = useState(round(props.value || 0)), s = _s[0], setS = _s[1];
    var focused = useRef(false);
    useEffect(function () { if (!focused.current) setS(round(props.value || 0)); }, [props.value]);
    return html`<input type="number" id=${props.id} class=${"num " + (props.cls || "")} step=${props.step || "any"}
      min=${props.min} max=${props.max} value=${s} aria-label=${props.label}
      onFocus=${function () { focused.current = true; }}
      onBlur=${function () { focused.current = false; setS(round(props.value || 0)); }}
      onChange=${function (e) {
        setS(e.target.value);
        var n = parseFloat(e.target.value);
        if (!isNaN(n)) props.onChange(props.min != null ? Math.max(props.min, n) : n);
      }} />`;
  }
  function Affix(props) {
    return html`<span class=${"affix " + (props.cls || "")}>
      ${props.prefix ? html`<span class="pre">${props.prefix}</span>` : null}
      <${Num} id=${props.id} value=${props.value} onChange=${props.onChange} step=${props.step} min=${props.min} max=${props.max} label=${props.label} />
      ${props.suffix ? html`<span class="suf">${props.suffix}</span>` : null}
    </span>`;
  }

  /* ⓘ button that shows how a number is calculated. Rendered into <body> so tables and the rail never clip it. */
  function Info(props) {
    var _p = useState(null), pos = _p[0], setPos = _p[1];
    var ref = useRef(null);
    function show() {
      if (!ref.current) return;
      var r = ref.current.getBoundingClientRect();
      var w = Math.min(340, window.innerWidth - 24);
      var left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12);
      var below = r.bottom + 190 < window.innerHeight;
      setPos({ left: left, width: w, top: below ? r.bottom + 6 : null, bottom: below ? null : window.innerHeight - r.top + 6 });
    }
    function hide() { setPos(null); }
    useEffect(function () {
      if (!pos) return;
      window.addEventListener("scroll", hide, true);
      window.addEventListener("resize", hide);
      return function () { window.removeEventListener("scroll", hide, true); window.removeEventListener("resize", hide); };
    }, [pos]);
    var lines = Array.isArray(props.lines) ? props.lines : [props.lines];
    var style = pos ? { left: pos.left, width: pos.width } : null;
    if (pos) { if (pos.top != null) style.top = pos.top; else style.bottom = pos.bottom; }
    return html`<span class="info-wrap">
      <button type="button" ref=${ref} class="info" aria-label=${props.label || "How this is calculated"}
        onMouseEnter=${show} onMouseLeave=${hide} onFocus=${show} onBlur=${hide}
        onClick=${function (e) { e.preventDefault(); e.stopPropagation(); show(); }}>i</button>
      ${pos ? ReactDOM.createPortal(html`<div class="tip" role="tooltip" style=${style}>
        ${lines.filter(Boolean).map(function (l, i) { return html`<div key=${i} class=${i === 0 && !props.plain ? "tip-main" : "tip-note"}>${l}</div>`; })}
      </div>`, document.body) : null}
    </span>`;
  }

  function Tick(props) {
    if (props.at == null || props.at < props.min || props.at > props.max) return null;
    var left = ((props.at - props.min) / (props.max - props.min)) * 100;
    return html`<span class=${"tick " + props.kind} style=${{ left: left + "%" }} title=${props.title}></span>`;
  }
  function Range(props) {
    var fill = ((props.value - props.min) / Math.max(1e-9, props.max - props.min)) * 100;
    return html`<div class="track">
      <input type="range" id=${props.id} min=${props.min} max=${props.max} step=${props.step} value=${props.value}
        aria-label=${props.label} style=${{ "--fill": Math.max(0, Math.min(100, fill)) + "%" }}
        onChange=${function (e) { props.onChange(parseFloat(e.target.value)); }} />
      ${props.children}
    </div>`;
  }
  function PctBox(props) {
    return html`<span class="affix w-sm">
      <${Num} id=${props.id} value=${props.value} step=${props.step || 0.05} min=${0} label=${props.label}
        onChange=${function (v) { props.onChange(Math.min(props.max, Math.max(0, v))); }} />
      <span class="suf">%</span>
    </span>`;
  }
  function TierHeads(props) {
    return TIERS.map(function (t) {
      return html`<th key=${t} class=${"c tcol" + (props.focus === t ? " focus" : "")}>${TIER_SHORT[t]}</th>`;
    });
  }
  function Toolbar(props) {
    var f = props.filter, focus = props.focus;
    var set = function (k, v) { var n = Object.assign({}, f); n[k] = v; props.onChange(n); };
    var who = focus === "all" ? null : TIER_SHORT[focus];
    return html`<div class="toolbar">
      <input type="search" id=${props.id + "-q"} placeholder="Find by name" aria-label="Find by name" value=${f.q}
        onChange=${function (e) { set("q", e.target.value); }} />
      <select id=${props.id + "-show"} aria-label="Which rows to show" value=${f.show} onChange=${function (e) { set("show", e.target.value); }}>
        <option value="all">Show everything</option>
        <option value="out">${who ? "Left out of " + who : "Left out of any tier"}</option>
        <option value="in">${who ? "Included in " + who : "Included in every tier"}</option>
        <option value="differ">Differs between tiers</option>
        <option value="counted">Counted at this cost view</option>
      </select>
      <span class="muted small">${props.shown} of ${props.total} shown</span>
      <span class="spacer"></span>
      <button type="button" class="mini" onClick=${props.onCollapseAll}>Collapse all</button>
      <button type="button" class="mini" onClick=${props.onExpandAll}>Expand all</button>
    </div>`;
  }
  function PageHead(props) {
    return html`<header class="page-head">
      <div>
        ${props.kicker ? html`<div class="kicker">${props.kicker}</div>` : null}
        <h1>${props.title}</h1>
        <p class="lead">${props.lead}</p>
      </div>
      ${props.right || null}
    </header>`;
  }
  function Next(props) {
    return html`<div class="next">
      <span class="muted small">${props.text}</span>
      <button type="button" class="btn" onClick=${function () { props.go(props.to); }}>${props.label} →</button>
    </div>`;
  }

  /* ------------------------------ rail ------------------------------ */
  function Deltas(props) {
    if (TIERS.every(function (t) { return Math.abs(props.d[t].door) < 0.005; })) {
      return html`<div class="deltas"><span class="same">No margin change at ${VIEW_NAMES[props.view]}${props.view !== "loaded" ? ". It may count only at a heavier cost view." : "."}</span></div>`;
    }
    return html`<div class="deltas">${TIERS.map(function (t) {
      var d = props.d[t], cls = Math.abs(d.door) < 0.005 ? "same" : d.door > 0 ? "up" : "down";
      return html`<span key=${t} class=${cls}>${TIER_SHORT[t]} ${cls === "same" ? "no change" : (d.door > 0 ? "+" : "−") + money(Math.abs(d.door), 2) + " · " + (d.pts > 0 ? "+" : "−") + Math.abs(d.pts).toFixed(1) + " pts"}</span>`;
    })}</div>`;
  }

  /* Header of a rail box: the title toggles the box open or minimized. */
  function RailHead(props) {
    var shut = !!props.ui.railShut[props.k];
    return html`<div class="rail-h">
      <button type="button" class="rail-toggle" aria-expanded=${!shut}
        onClick=${function () { props.setUi(function (u) { u.railShut[props.k] = !shut; }); }}>
        <span class="caret-i" aria-hidden="true">${shut ? "▸" : "▾"}</span><h2>${props.title}</h2></button>
      ${props.children}
    </div>`;
  }

  function Rail(props) {
    var doc = props.doc, C = props.C, P = doc.pricing, ui = props.ui;
    var vg = viewGroups(doc);
    if (ui.railHidden) {
      return html`<aside class="rail-tab-wrap" aria-label="Live margin, hidden">
        <button type="button" class="rail-tab" title="Show the live margin and details panel"
          onClick=${function () { props.setUi(function (u) { u.railHidden = false; }); }}>
          <span class="rail-tab-arrow" aria-hidden="true">‹</span>
          <span class="rail-tab-label">Live margin</span>
          ${TIERS.map(function (t) {
            var m = C.margins[t];
            return html`<span key=${t} class=${"rail-tab-m " + verdict(m, P.targetPct).cls}>${TIER_SHORT[t].charAt(0)} ${pct(m.marginPct, 0)}</span>`;
          })}
        </button>
      </aside>`;
    }
    var marginShut = !!ui.railShut.margin;
    return html`<aside class="rail" aria-label="Live margin">
      <button type="button" class="rail-hide" onClick=${function () { props.setUi(function (u) { u.railHidden = true; }); }}
        title="Hide this panel to give the page more room">Hide panel ›</button>
      <section class="rail-box">
        <${RailHead} k="margin" title="Live margin" ui=${ui} setUi=${props.setUi}>
          <${Info} plain=${true} label="What the cost views mean" lines=${[
            "Pick how much cost to count against each tier.",
            "Direct COGS: " + (vg.direct.join(", ") || "nothing") + ".",
            "Fully Allocated adds: " + (vg.allocated.join(", ") || "nothing") + ".",
            "Fully Loaded adds: " + (vg.loaded.join(", ") || "nothing") + ".",
            "Change which view a group counts at on the Costs page."
          ]} />
        </${RailHead}>
        ${marginShut ? html`<div class="rail-mini">${TIERS.map(function (t) {
          var m = C.margins[t];
          return html`<span key=${t} class=${verdict(m, P.targetPct).cls}>${TIER_SHORT[t]} <b>${pct(m.marginPct)}</b></span>`;
        })}</div>` : html`<${React.Fragment}>
        <div class="seg" role="group" aria-label="Cost view">
          ${VIEWS.map(function (v) {
            return html`<button key=${v} type="button" aria-pressed=${v === doc.cv}
              onClick=${function () { props.update(function (d) { d.cv = v; }, "Cost view: " + VIEW_NAMES[v]); }}>${VIEW_NAMES[v].replace("Fully ", "")}</button>`;
          })}
        </div>
        ${TIERS.map(function (t) {
          var m = C.margins[t], v = verdict(m, P.targetPct), on = ui.focus === t;
          return html`<button key=${t} type="button" class=${"tcard " + v.cls + (on ? " on" : "")} aria-pressed=${on}
            title=${on ? "Stop focusing " + TIER_NAMES[t] : "Focus " + TIER_NAMES[t] + " across every page"}
            onClick=${function () { props.setUi(function (u) { u.focus = on ? "all" : t; }); }}>
            <span class="tn">${TIER_NAMES[t]}</span>
            <span class="tp">${pct(m.marginPct)}</span>
            <span class="td">${money(m.margin, 2)}/door · ${money(m.portfolioMo * 12)}/yr · ${v.label}</span>
            ${P.scopeSavings && C.cost.freed[t] > 0.004 ? html`<span class="td freed" title="Count freed PM capacity is on (Portfolio → Model settings). Without it this tier's margin would be ${money(m.margin - C.cost.freed[t], 2)}/door, ${pct(m.revenue ? (m.margin - C.cost.freed[t]) / m.revenue * 100 : 0)}.">Includes ${money(C.cost.freed[t], 2)} freed PM capacity · +${(m.revenue ? C.cost.freed[t] / m.revenue * 100 : 0).toFixed(1)} pts</span>` : null}
          </button>`;
        })}
        <p class="tiny faint" style=${{ margin: 0 }}>${VIEW_NAMES[doc.cv]} · ${fmtNum(doc.G.doors)} doors · ${P.targetPct}% target${P.scopeSavings ? " · freed PM capacity counted" : ""}. Click a tier to focus it.</p>
        </${React.Fragment}>`}
      </section>

      <${Inspector} doc=${doc} C=${C} ui=${ui} setUi=${props.setUi} update=${props.update} go=${props.go} />
    </aside>`;
  }

  /* Top-bar feed of every change this session, with how it moved each tier. Any entry can be rolled back to. */
  function ActivityMenu(props) {
    var hist = props.hist;
    return html`<div class="menu activity" role="dialog" aria-label="Activity">
      <div class="row-b"><b class="small">Activity this session</b>
        ${hist.length ? html`<button type="button" class="btn sm" onClick=${props.undo} title=${"Undo: " + hist[0].label}>Undo last</button>` : null}</div>
      ${hist.length ? html`<ul class="changes">
        ${hist.map(function (c, i) {
          return html`<li key=${c.at + "-" + i}>
            <div class="row-b"><span class=${"chg-label" + (i ? " muted" : "")}>${c.label}</span>
              <button type="button" class="link tiny" onClick=${function () { props.restore(i); }}
                title="Undo this change and everything after it">${i === 0 ? "Undo" : "Go back to before this"}</button></div>
            <${Deltas} d=${c.deltas} view=${c.view} />
          </li>`;
        })}
      </ul>` : html`<p class="small muted">Change any number or checkbox and it shows up here with its effect on each tier's margin, per door per month. You can step back to any point.</p>`}
      <p class="tiny faint">Kept until you reload or import. Margin changes are at the cost view you had picked.</p>
    </div>`;
  }

  /* ------------------------------ inspector ------------------------------ */
  function TierChecks(props) {
    return html`<div class="tiers-inline">${TIERS.map(function (t) {
      return html`<label key=${t} for=${props.idp + "-" + t}><input type="checkbox" id=${props.idp + "-" + t} checked=${!!props.flags[t]}
        onChange=${function () { props.onToggle(t); }} /> ${TIER_SHORT[t]}</label>`;
    })}</div>`;
  }
  function Impact(props) {
    return html`<table class="impact">
      <thead><tr><th>Tier</th><th>${props.head}</th><th>Margin</th></tr></thead>
      <tbody>${TIERS.map(function (t) {
        var v = props.vals[t], rev = props.C.margins[t].revenue;
        return html`<tr key=${t}><td>${TIER_SHORT[t]}</td>
          <td>${v.text != null ? html`<span class="faint">${v.text}</span>` : money(v.amt, 2)}</td>
          <td>${v.text != null || !rev ? "—" : (v.amt > 0 === !!props.costLike ? "−" : "+") + (Math.abs(v.amt) / rev * 100).toFixed(1) + " pts"}</td></tr>`;
      })}</tbody>
    </table>`;
  }

  function Inspector(props) {
    var doc = props.doc, sel = props.ui.sel, update = props.update;
    var body = null;
    if (sel && sel.kind === "cost") body = html`<${CostInspector} doc=${doc} C=${props.C} id=${sel.id} update=${update} setUi=${props.setUi} />`;
    if (sel && sel.kind === "svc") body = html`<${ServiceInspector} doc=${doc} C=${props.C} id=${sel.id} update=${update} setUi=${props.setUi} />`;
    if (sel && sel.kind === "addon") body = html`<${AddonInspector} doc=${doc} id=${sel.id} update=${update} setUi=${props.setUi} />`;
    if (sel && sel.kind === "bench") body = html`<${BenchInspector} doc=${doc} id=${sel.id} update=${update} setUi=${props.setUi} />`;
    if (sel && sel.kind === "fee") body = html`<${FeeInspector} doc=${doc} C=${props.C} id=${sel.id} update=${update} setUi=${props.setUi} />`;
    var shut = !!props.ui.railShut.details;
    return html`<section class="rail-box inspector" aria-label="Details">
      <${RailHead} k="details" title="Details" ui=${props.ui} setUi=${props.setUi}>
        ${sel && !shut ? html`<button type="button" class="link small" onClick=${function () { props.setUi(function (u) { u.sel = null; }); }} title="Deselect the row and close its details. Nothing is deleted.">Close</button>` : null}
      </${RailHead}>
      ${shut ? null : body || html`<p class="small muted" style=${{ margin: 0 }}>Click any cost line, service, fee or add-on to see its math, every setting it has, and what it's worth to each tier.</p>`}
    </section>`;
  }

  function toggleCk(update, kind, id, t, name) {
    update(function (d) {
      var tp = activeTemplate(d), map = tp[kind];
      map[id] = map[id] || { min: false, special: false, plus: false };
      map[id][t] = !map[id][t];
      syncLinked(d, tp, kind, id, t);
    }, name + ": " + TIER_SHORT[t] + " toggled");
  }

  function CostInspector(props) {
    var doc = props.doc, found = findCostRow(doc, props.id), update = props.update;
    if (!found) return html`<p class="small muted">That line was removed.</p>`;
    var r = found.row, g = found.group, name = rowName(doc, r), f = activeTemplate(doc).ck[r.id] || {};
    var calc = !!CALC_ROWS[r.id], isLb = r.id === "lease_brk", isAf = r.e === "af";
    var rv = rowView(doc, r.id, g.id), counted = isVisible(rv, doc.cv);
    var vals = {};
    TIERS.forEach(function (t) {
      vals[t] = !f[t] ? { text: isLb ? "collects fee" : "not included" } : !counted ? { text: "not at " + VIEW_NAMES[doc.cv].replace("Fully ", "") } : { amt: lineCost(doc, r, g.id, t, doc.cv) };
    });
    return html`<div class="inspector" style=${{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div><div class="tiny faint">Cost line · ${g.label}</div><h3>${name}</h3></div>
      <div class="kv">
        ${isAf ? html`<span>Amount</span><span class="small">Set under Portfolio → AppFolio</span>`
          : isLb ? html`<span>Amount</span><span class="small">Each tier's own leasing fee</span>`
          : html`<span>${r.id === "evict_g" ? "Attorney cap" : "Amount"}</span><${Affix} id=${"i-v-" + r.id} prefix="$" cls="w-lg" label=${"Amount for " + name}
            value=${doc.vl[r.id] != null ? doc.vl[r.id] : r.v} onChange=${function (val) { update(function (d) { d.vl[r.id] = val; }, name + ": amount"); }} />`}
        ${calc ? null : html`<span>Per</span><select id=${"i-b-" + r.id} aria-label="Per" value=${r.e}
          onChange=${function (e) { var val = e.target.value; update(function (d) { if (r.promoted) d.pbase[r.id] = val; else d.CG.find(function (x) { return x.id === g.id; }).rows.find(function (x) { return x.id === r.id; }).e = val; }, name + ": basis"); }}>
          ${BASES.filter(function (b) { return b !== "af" || isAf; }).map(function (b) { return html`<option key=${b} value=${b}>${BASIS_NAMES[b]}</option>`; })}
        </select>`}
        ${calc || r.e === "claim" ? html`<span>${isLb ? "Lease breaks" : r.id === "evict_g" ? "Attorney uses" : "Events"}</span><${Affix} id=${"i-ev-" + r.id} suffix="/yr" cls="w-sm" min=${0}
          label="Per year across the portfolio" value=${doc.ev[r.id] != null ? doc.ev[r.id] : (r.n_ev || 0)}
          onChange=${function (val) { update(function (d) { d.ev[r.id] = val; }, name + ": per year"); }} />` : null}
        ${r.e === "annual" && !calc ? html`<span>Burden</span><${Affix} id=${"i-bd-" + r.id} suffix="%" cls="w-sm" label="Burden %"
          value=${doc.bd[r.id] != null ? doc.bd[r.id] : (r.n_bd || 0)} onChange=${function (val) { update(function (d) { d.bd[r.id] = val; }, name + ": burden"); }} />` : null}
        ${r.e === "seat" && !calc ? html`<span>Seats</span><${Affix} id=${"i-st-" + r.id} cls="w-sm" min=${0} label=${"Seats paid for " + name}
          value=${doc.seats[r.id] != null ? doc.seats[r.id] : doc.G.seats}
          onChange=${function (val) { update(function (d) { if (val === d.G.seats) delete d.seats[r.id]; else d.seats[r.id] = val; }, name + ": seats"); }} />` : null}
        <span>Counts from</span><select id=${"i-iv-" + r.id} aria-label="Counts from" value=${doc.itemView[r.id] || ""}
          onChange=${function (e) { var val = e.target.value; update(function (d) { if (val) d.itemView[r.id] = val; else delete d.itemView[r.id]; }, name + ": counts from"); }}>
          <option value="">Same as ${g.label} (${VIEW_NAMES[doc.secView[g.id] || "direct"]})</option>
          ${VIEWS.map(function (vw) { return html`<option key=${vw} value=${vw}>${VIEW_NAMES[vw]}</option>`; })}
        </select>
        <span>${isLb ? "Waives fee" : "In tier"}</span><${TierChecks} idp=${"i-ck-" + r.id} flags=${f} onToggle=${function (t) { toggleCk(update, "ck", r.id, t, name); }} />
      </div>
      <div class="math">${formulaLines(r, doc, g.id, doc.cv).map(function (l, i) { return html`<div key=${i}>${l}</div>`; })}</div>
      <${Impact} head="Cost/door/mo" vals=${vals} C=${props.C} costLike=${true} />
      ${r.id === "evict_g" ? html`<p class="note">Linked: turning this on for a tier also turns on its Eviction service (Services). Every eviction this line doesn't cover is billed to the owner under Add-on fees.</p>` : null}
      ${isAf ? null : html`<${SellAddon} doc=${doc} update=${update} id=${r.id} name=${name} kind="ck"
        defaultPer=${calc ? "month" : "door_yr"}
        defaultCost=${r.id === "evict_g" ? Math.round(cmo(r, doc) / (doc.G.doors || 1) * 1000) / 1000 : r.id === "lease_brk" ? Math.round(leaseBreakMo(doc, "min") / (doc.G.doors || 1) * 1000) / 1000 : (doc.vl[r.id] != null ? doc.vl[r.id] : r.v)} />`}
      <button type="button" class="btn sm danger" style=${{ alignSelf: "flex-start" }} onClick=${function () {
        update(function (d) {
          if (r.promoted) { d.place[r.id] = "uc"; return; }
          var gg = d.CG.find(function (x) { return x.id === g.id; });
          gg.rows = gg.rows.filter(function (x) { return x.id !== r.id; });
          d.templates.forEach(function (tp) { delete tp.ck[r.id]; });
          d.removed[r.id] = true; d.addons = d.addons.filter(function (x) { return x.svc !== r.id; });
        }, "Removed " + name);
        props.setUi(function (u) { u.sel = null; });
      }}>${r.promoted ? "Send back to bench" : "Remove line"}</button>
    </div>`;
  }

  /* Moves a bench idea into the model: as a scope service, an optional add-on, or a cost line in a group. */
  function promoteIdea(update, doc, id, dest) {
    var svc = doc.MASTER[id], owners = bundleOwners(doc);
    update(function (d) {
      var dt = d.MASTER[id].dt || { min: true, special: true, plus: true };
      if (dest === "addon") {
        // Leaves the bench and becomes an optional add-on owners can buy; set its price and cost on the Add-ons page.
        d.place[id] = "addon";
        d.addons.push({ id: "addon_" + id, name: svc.n, price: 0, cost: 0, basis: "optional", kind: "addon", freq: 1, uptake: 0,
          tiers: { min: "charged", special: "charged", plus: "charged" } });
      } else if (dest === "scope") {
        d.place[id] = "scope";
        if (!d.scopeOwner[id] || !owners.some(function (o) { return o.id === d.scopeOwner[id]; })) d.scopeOwner[id] = owners.length ? (owners.find(function (o) { return o.id === "pm"; }) || owners[0]).id : "";
        d.templates.forEach(function (tp) { if (!tp.psk[id]) tp.psk[id] = Object.assign({}, dt); });
      } else {
        d.place[id] = "cost:" + dest;
        if (d.vl[id] == null) d.vl[id] = (d.ucv && d.ucv[id]) || 0;
        d.templates.forEach(function (tp) { if (!tp.ck[id]) tp.ck[id] = Object.assign({}, dt); });
      }
    }, (dest === "addon" ? "Made " + svc.n + " an add-on" : "Offered " + svc.n));
  }

  var ADDON_PER_SHORT = { door_yr: "/door/yr", turnover: "/turnover", month: "/door/mo", portfolio_yr: "/yr, all doors" };
  /* How often an optional add-on happens: a number and a unit (see ADDON_PER in the engine). */
  function OftenCell(props) {
    var a = props.a, name = props.name, idp = props.idp, per = a.per || "door_yr";
    return html`<span style=${{ display: "inline-flex", gap: "4px", alignItems: "center" }}>
      <${Affix} id=${idp + "-n"} cls="w-sm" min=${0} step=${0.25} label=${"How often " + name} value=${a.freq || 0} onChange=${function (v) { props.edit(function (x) { x.freq = v; }, "how often"); }} />
      <select id=${idp + "-u"} aria-label=${"How often unit for " + name} value=${per} onChange=${function (e) { var v = e.target.value; props.edit(function (x) { x.per = v; }, "how often"); }}>
        ${Object.keys(ADDON_PER).map(function (k) { return html`<option key=${k} value=${k} title=${ADDON_PER[k]}>${ADDON_PER_SHORT[k]}</option>`; })}
      </select></span>`;
  }

  /* An add-on's cost: follows its service or cost line unless someone sets their own. */
  function AddonCost(props) {
    var doc = props.doc, a = props.a, edit = props.edit, linked = addonCostLinked(doc, a), lv = a.svc ? linkedAddonCost(doc, a) : null;
    if (linked) return html`<span class="addon-cost" title="Follows its service or cost line, so it updates when that changes">
      <span class="mono">${money(lv, lv > 0 && lv < 1 ? 3 : 2)}</span>${props.compact ? null : html` <span class="tiny faint">follows the line</span>
      <button type="button" class="link tiny" onClick=${function () { edit(function (x) { x.costOwn = true; x.cost = Math.round(lv * 1000) / 1000; }, "own cost"); }}>Use my own</button>`}</span>`;
    return html`<span class="addon-cost"><${Affix} id=${props.id} prefix="$" min=${0} cls=${props.cls} label="Your cost each time" value=${a.cost || 0} onChange=${function (v) { edit(function (x) { x.cost = v; }, "your cost"); }} />
      ${lv != null && !props.compact ? html` <button type="button" class="link tiny" title=${"Follow the source again: " + money(lv, 2)} onClick=${function () { edit(function (x) { x.costOwn = false; }, "cost linked"); }}>Follow the line</button>` : null}</span>`;
  }

  /* "Also sell as an add-on" for a service (kind "psk") or a cost line (kind "ck"): sold to the tiers that leave it out. */
  function SellAddon(props) {
    var doc = props.doc, update = props.update, id = props.id, name = props.name, kind = props.kind;
    var ad = doc.addons.find(function (a) { return a.svc === id; });
    function edit(fn, label) { update(function (d) { var x = d.addons.find(function (y) { return y.svc === id; }); if (x) fn(x); }, name + " add-on: " + label); }
    if (!ad) return html`<div><button type="button" class="btn sm" title="Owners in a tier that leaves this out can still buy it as an extra" onClick=${function () {
      update(function (d) {
        var flags = activeTemplate(d)[kind][id] || {};
        var tiers = {};
        TIERS.forEach(function (t) { tiers[t] = flags[t] ? "off" : "charged"; });
        d.addons.push({ id: "addon_sell_" + id, name: name, price: 0, cost: props.defaultCost || 0, costOwn: false, basis: "optional", kind: "addon", freq: 1, per: props.defaultPer || "door_yr", uptake: 0, svc: id, tiers: tiers });
      }, "Selling " + name + " as an add-on");
    }}>Also sell as an add-on</button></div>`;
    return html`<div style=${{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid var(--rule-soft)", paddingTop: "10px" }}>
      <div class="tiny faint">Sold as an add-on to tiers that leave it out</div>
      <div class="kv">
        <span>Owner pays</span><${Affix} id=${"i-ap-" + id} prefix="$" cls="w-lg" min=${0} label="Owner price" value=${ad.price || 0} onChange=${function (v) { edit(function (x) { x.price = v; }, "owner price"); }} />
        <span>Your cost</span><${AddonCost} doc=${doc} a=${ad} id=${"i-ac-" + id} cls="w-lg" edit=${edit} />
        <span>How often</span><${OftenCell} a=${ad} name=${name} idp=${"i-af-" + id} edit=${edit} />
        <span>Owners who buy</span><${Affix} id=${"i-au-" + id} cls="w-sm" min=${0} max=${100} step=${5} suffix="%" label="Share of owners who buy" value=${ad.uptake || 0} onChange=${function (v) { edit(function (x) { x.uptake = Math.min(100, v); }, "owners who buy"); }} />
      </div>
      <p class="note">For sale in: ${TIERS.filter(function (t) { return ad.tiers[t] !== "off"; }).map(function (t) { return TIER_SHORT[t]; }).join(", ") || "no tier"}. Tiers that include it don't sell it. Fine-tune on the Add-ons page.</p>
      <button type="button" class="btn sm" style=${{ alignSelf: "flex-start" }} onClick=${function () { update(function (d) { d.addons = d.addons.filter(function (x) { return x.svc !== id; }); }, "Stopped selling " + name + " as an add-on"); }}>Stop selling as an add-on</button>
    </div>`;
  }

  function removeAddon(update, a) {
    update(function (d) {
      d.addons = d.addons.filter(function (x) { return x.id !== a.id; });
      d.addons.forEach(function (x) { if (x.items) x.items = x.items.filter(function (i) { return i !== a.id; }); });
    }, "Removed " + a.name);
  }
  /* Back to the bench: an add-on that came from the bench goes home; a new one becomes a bench idea. One sold from a service or cost line just stops being sold. */
  function benchAddon(update, a) {
    if (a.svc) { update(function (d) { d.addons = d.addons.filter(function (x) { return x.id !== a.id; }); }, "Stopped selling " + a.name + " as an add-on"); return; }
    update(function (d) {
      var mid = a.id.indexOf("addon_") === 0 ? a.id.slice(6) : null;
      if (!mid || !d.MASTER[mid]) {
        mid = "uc_" + a.id;
        d.MASTER[mid] = { id: mid, n: a.name, d: "", dp: "uc", dc: "Add-ons", dsv: 0, dt: { min: false, special: false, plus: false } };
      }
      d.place[mid] = "uc";
      d.addons = d.addons.filter(function (x) { return x.id !== a.id; });
      d.addons.forEach(function (x) { if (x.items) x.items = x.items.filter(function (i) { return i !== a.id; }); });
    }, "Moved " + a.name + " back to the bench");
  }

  function AddonInspector(props) {
    var doc = props.doc, update = props.update, a = doc.addons.find(function (x) { return x.id === props.id; });
    if (!a || a.kind !== "addon") return html`<p class="small muted">That add-on was removed.</p>`;
    var link = a.svc ? (findCostRow(doc, a.svc) ? rowName(doc, findCostRow(doc, a.svc).row) : (doc.MASTER[a.svc] && doc.MASTER[a.svc].n)) : null;
    function done() { props.setUi(function (u) { u.sel = null; }); }
    return html`<div class="inspector" style=${{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div><div class="tiny faint">Optional add-on</div><h3>${a.name}</h3></div>
      ${link ? html`<p class="note">Sold from "${link}". The tiers that include it don't sell it, and ticking or unticking a tier there changes where it's sold.</p>
      <div class="kv"><span>Your cost</span><${AddonCost} doc=${doc} a=${a} id=${"i-adc-" + a.id} cls="w-lg"
        edit=${function (fn, label) { update(function (d) { var x = d.addons.find(function (y) { return y.id === a.id; }); if (x) fn(x); }, a.name + ": " + label); }} /></div>` : null}
      <div style=${{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button type="button" class="btn sm" title=${a.svc ? "Stop selling it as an add-on. The service or cost line stays." : "Not offering it after all: move it back to the bench on the Services page"}
          onClick=${function () { benchAddon(update, a); done(); }}>${a.svc ? "Stop selling as an add-on" : "Move to bench"}</button>
        <button type="button" class="btn sm danger" onClick=${function () { removeAddon(update, a); done(); }}>Delete add-on</button>
      </div>
    </div>`;
  }

  function BenchInspector(props) {
    var doc = props.doc, id = props.id, update = props.update, svc = doc.MASTER[id];
    if (!svc || doc.place[id] !== "uc") return html`<p class="small muted">That idea isn't on the bench anymore.</p>`;
    var cats = Object.keys(doc.MASTER).reduce(function (s, k) { var c = doc.icat[k] || doc.MASTER[k].dc; if (c && s.indexOf(c) < 0) s.push(c); return s; }, []).sort();
    var cat = doc.icat[id] || svc.dc;
    return html`<div class="inspector" style=${{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div><div class="tiny faint">Bench idea · not offered yet</div><h3>${svc.n}</h3></div>
      <div class="kv">
        <span>Name</span><input type="text" class="txt" id=${"i-bn-" + id} aria-label="Idea name" value=${svc.n}
          onChange=${function (e) { var val = e.target.value.trim(); if (val) update(function (d) { d.MASTER[id].n = val; }, "Renamed a bench idea"); }} />
        <span>Category</span><select id=${"i-bc-" + id} aria-label="Category" value=${cat}
          onChange=${function (e) { var val = e.target.value; update(function (d) { d.icat[id] = val; }, svc.n + ": category"); }}>
          ${cats.concat(cats.indexOf(cat) < 0 ? [cat] : []).map(function (c) { return html`<option key=${c} value=${c}>${c}</option>`; })}
        </select>
        <span>Offer as</span><select id=${"i-bo-" + id} aria-label=${"Offer " + svc.n + " as"} value="" onChange=${function (e) {
          var dest = e.target.value; if (!dest) return;
          promoteIdea(update, doc, id, dest);
          props.setUi(function (u) { u.sel = dest === "addon" ? null : { kind: dest === "scope" ? "svc" : "cost", id: id }; });
        }}>
          <option value="">Choose…</option>
          <option value="scope">A service in scope</option>
          <option value="addon">An optional add-on</option>
          ${doc.CG.map(function (g) { return html`<option key=${g.id} value=${g.id}>A cost line in ${g.label}</option>`; })}
        </select>
      </div>
      <p class="note">Offering it as an add-on adds it to the Add-ons page. Set its price and cost there.</p>
      <button type="button" class="btn sm danger" style=${{ alignSelf: "flex-start" }} onClick=${function () {
        update(function (d) {
          delete d.MASTER[id]; delete d.place[id]; delete d.icat[id];
          d.templates.forEach(function (tp) { delete tp.psk[id]; delete tp.ck[id]; });
        }, "Removed " + svc.n + " from the bench");
        props.setUi(function (u) { u.sel = null; });
      }}>Remove from bench</button>
    </div>`;
  }

  function ServiceInspector(props) {
    var doc = props.doc, id = props.id, update = props.update, svc = doc.MASTER[id];
    if (!svc || doc.place[id] !== "scope") return html`<p class="small muted">That service isn't in scope anymore.</p>`;
    var f = activeTemplate(doc).psk[id] || {}, basis = doc.pbase[id] || "door_yr", hrs = doc.psh[id] || 0, owners = bundleOwners(doc);
    var pd = scopePerDoorMo(doc, id), ign = activeTemplate(doc).exclIgnore || {};
    var vals = {};
    TIERS.forEach(function (t) {
      vals[t] = f[t] ? { text: "included" } : ign[id] && ign[id][t] ? { text: "ignored" } : { amt: pd };
    });
    var cats = Object.keys(doc.MASTER).reduce(function (s, k) { var c = doc.icat[k] || doc.MASTER[k].dc; if (c && s.indexOf(c) < 0) s.push(c); return s; }, []).sort();
    return html`<div class="inspector" style=${{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div><div class="tiny faint">Scope service · ${doc.icat[id] || svc.dc}</div><h3>${svc.n}</h3></div>
      ${svc.d ? html`<p class="note">${svc.d}</p>` : null}
      <div class="kv">
        <span>Value</span>${hrs ? html`<span class="mono">${money(scopeValue(doc, id), 2)} <span class="faint small">from hours</span></span>`
          : html`<${Affix} id=${"i-sv-" + id} prefix="$" cls="w-lg" min=${0} label=${"Value of " + svc.n} value=${doc.psv[id] != null ? doc.psv[id] : svc.dsv}
            onChange=${function (val) { update(function (d) { d.psv[id] = val; }, svc.n + ": value"); }} />`}
        <span>Hours</span><${Affix} id=${"i-sh-" + id} cls="w-sm" min=${0} suffix="hrs" label=${"Hours for " + svc.n} value=${hrs}
          onChange=${function (val) { update(function (d) { if (val) d.psh[id] = val; else delete d.psh[id]; }, svc.n + ": hours"); }} />
        <span>Unit</span><select id=${"i-sb-" + id} aria-label="Unit" value=${basis}
          onChange=${function (e) { var val = e.target.value; update(function (d) { d.pbase[id] = val; }, svc.n + ": unit"); }}>
          <option value="door_yr">per door / yr</option><option value="event">per turnover</option><option value="claim">per event</option>
        </select>
        ${basis === "claim" ? html`<span>Events</span><${Affix} id=${"i-se-" + id} cls="w-sm" min=${0} suffix="/yr" label="Events per year" value=${doc.ev[id] || 0}
          onChange=${function (val) { update(function (d) { d.ev[id] = val; }, svc.n + ": events"); }} />` : null}
        <span>Done by</span><select id=${"i-so-" + id} aria-label="Done by" value=${doc.scopeOwner[id]}
          onChange=${function (e) { var val = e.target.value; update(function (d) { d.scopeOwner[id] = val; }, svc.n + ": done by"); }}>
          ${owners.map(function (o) { return html`<option key=${o.id} value=${o.id}>${o.name}</option>`; })}
        </select>
        <span>Category</span><select id=${"i-sc-" + id} aria-label="Category" value=${doc.icat[id] || svc.dc}
          onChange=${function (e) { var val = e.target.value; update(function (d) { d.icat[id] = val; }, svc.n + ": category"); }}>
          ${cats.map(function (c) { return html`<option key=${c} value=${c}>${c}</option>`; })}
        </select>
        <span>In tier</span><${TierChecks} idp=${"i-psk-" + id} flags=${f} onToggle=${function (t) { toggleCk(update, "psk", id, t, svc.n); }} />
      </div>
      <div class="math">${scopeFormulaLines(doc, id).map(function (l, i) { return html`<div key=${i}>${l}</div>`; })}</div>
      <${Impact} head="Freed/door/mo" vals=${vals} C=${props.C} costLike=${false} />
      <p class="note">${doc.pricing.scopeSavings ? "Freed capacity is taken off cost (Portfolio → Model settings), so leaving this out raises that tier's margin as shown." : "Freed capacity is shown but not taken off cost. Turn it on under Portfolio → Model settings to count it."}</p>
      ${id === EVICT_SVC ? html`<p class="note">Linked: turning this off for a tier also removes its Eviction guarantee (Costs), and nothing is billed for evictions there.</p>` : null}
      <${SellAddon} doc=${doc} update=${update} id=${id} name=${svc.n} kind="psk" defaultCost=${0} />
      <button type="button" class="btn sm" style=${{ alignSelf: "flex-start" }} onClick=${function () {
        update(function (d) { d.place[id] = "uc"; }, "Benched " + svc.n);
        props.setUi(function (u) { u.sel = null; });
      }}>Move to bench (not offered)</button>
    </div>`;
  }

  function feeLines(doc, a, t) {
    var n = addonEventsYr(doc, a, t), per = doc.G.doors ? n / 12 / doc.G.doors : 0, fixed = addonFixedCost(doc, a);
    var costEach = addonCostEach(doc, a, "charged"), pmEach = costEach - fixed, ev = a.basis === "evict_billed";
    var share = addonShare(doc, a, t), isRest = /_rest$/.test(a.basis);
    return [
      money(a.price || 0) + " charged × " + fmtNum(Math.round(n * 10) / 10) + "/yr ÷ 12 ÷ " + fmtNum(doc.G.doors) + " doors = " + money((a.price || 0) * per, 2) + "/door/mo of revenue in " + TIER_SHORT[t],
      "Each one: " + money(a.price || 0) + " charged − " + money(fixed) + (ev ? " court fees" : " paid out") +
        (a.split ? " − " + fmtNum(a.split) + "% of the remaining " + money(Math.max(0, (a.price || 0) - fixed)) + " to the PM (" + money(pmEach) + ")" : "") +
        " = " + money((a.price || 0) - costEach) + " kept.",
      ev ? (evictionGuaranteed(doc, t)
          ? TIER_SHORT[t] + " has the Eviction guarantee, so only the " + fmtNum(doc.G.evictNotPlacedPct || 0) + "% of evictions where Raynor didn't place the tenant are billed. The rest are the Eviction guarantee cost line."
          : evictionHandled(doc, t) ? TIER_SHORT[t] + " has no Eviction guarantee, so every eviction is billed." : "Eviction service is off for " + TIER_SHORT[t] + ", so nothing is billed.")
      : ADDON_POOL[a.basis]
        ? fmtNum(Math.round(share * 10) / 10) + "% of the " + fmtNum(doc.G.wo || 0) + " work orders a year" + (isRest ? ": whatever the other work-order fees in " + TIER_SHORT[t] + " don't claim." : ".")
        : a.basis === "door_yr" ? fmtNum(a.amount || 0) + " per door a year × " + fmtNum(doc.G.doors) + " doors." : "Counted across the whole portfolio."
    ];
  }

  function FeeInspector(props) {
    var doc = props.doc, update = props.update, a = doc.addons.find(function (x) { return x.id === props.id; });
    if (!a) return html`<p class="small muted">That fee was removed.</p>`;
    var ev = a.basis === "evict_billed";
    function edit(fn, label) { update(function (d) { var x = d.addons.find(function (y) { return y.id === a.id; }); if (x) fn(x); }, a.name + ": " + label); }
    var t0 = props.C && TIERS.find(function (t) { return addonState(a, t) !== "off"; }) || "min";
    var vals = {};
    TIERS.forEach(function (t) {
      var it = props.C.margins[t].addon.items.find(function (x) { return x.addon.id === a.id; });
      vals[t] = it ? { amt: it.rev - it.cost } : { text: ev ? "none billed" : addonState(a, t) === "off" ? "off" : "not at this view" };
    });
    return html`<div class="inspector" style=${{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div><div class="tiny faint">Add-on fee</div><h3>${a.name}</h3></div>
      <div class="kv">
        <span>You charge</span><${Affix} id=${"i-ap-" + a.id} prefix="$" min=${0} label="Price" value=${a.price || 0} onChange=${function (v) { edit(function (x) { x.price = v; }, "price"); }} />
        <span>Your cost</span>${ev ? html`<span class="small">${money(addonFixedCost(doc, a))} court fees <span class="faint">(Portfolio)</span></span>`
          : html`<${Affix} id=${"i-ac-" + a.id} prefix="$" min=${0} label="Your cost" value=${a.cost || 0} onChange=${function (v) { edit(function (x) { x.cost = v; }, "cost"); }} />`}
        <span>PM split</span><${Affix} id=${"i-as-" + a.id} suffix="%" cls="w-sm" min=${0} label="PM split" value=${a.split || 0} onChange=${function (v) { edit(function (x) { x.split = Math.min(100, v); }, "PM split"); }} />
        ${ev ? null : html`<span>Counts from</span><select id=${"i-av-" + a.id} aria-label="Counts from" value=${a.view || "direct"}
          onChange=${function (e) { var v = e.target.value; edit(function (x) { if (v === "direct") delete x.view; else x.view = v; }, "counts from"); }}>
          ${VIEWS.map(function (vw) { return html`<option key=${vw} value=${vw}>${VIEW_NAMES[vw]}</option>`; })}
        </select>`}
      </div>
      <div class="math">${feeLines(doc, a, props.C.margins[t0] ? t0 : "min").map(function (l, i) { return html`<div key=${i}>${l}</div>`; })}</div>
      <${Impact} head="Net/door/mo" vals=${vals} C=${props.C} costLike=${false} />
      <p class="note">${ev ? "Which evictions are billed follows the Eviction guarantee (Costs) and Eviction service (Services) checkboxes, so it can't disagree with them." : "Charged: you bill it and carry its cost. Included: you do it without billing. Off: not offered."}</p>
    </div>`;
  }

  /* ------------------------------ pages ------------------------------ */
  function Summary(props) {
    var doc = props.doc, C = props.C, P = doc.pricing, focus = props.ui.focus, G = doc.G;
    var fc = function (t) { return focus === t ? "focus" : ""; };
    var groupRowsOut = doc.CG.map(function (g) {
      var vals = {}, any = false;
      TIERS.forEach(function (t) {
        vals[t] = groupRows(doc, g).reduce(function (s, r) { return s + lineCost(doc, r, g.id, t, doc.cv); }, 0);
        if (vals[t] > 0.004) any = true;
      });
      return any ? { g: g, vals: vals } : null;
    }).filter(Boolean);
    var lbAny = TIERS.some(function (t) { return C.margins[t].leaseBreak.cost > 0.004; });
    function row(label, fn, cls, info) {
      return html`<tr class=${cls || ""}><td>${label}${info ? html`<${Info} plain=${true} lines=${info} />` : null}</td>
        ${TIERS.map(function (t) { return html`<td key=${t} class=${fc(t)}>${fn(t)}</td>`; })}</tr>`;
    }
    return html`<div class="page">
      <${PageHead} kicker="Raynor Realty · Internal" title="Is each package making money?"
        lead=${"Each tier's revenue, cost and margin at " + VIEW_NAMES[doc.cv] + " on " + fmtNum(G.doors) + " doors. Every change shows its effect in the rail on the right."} />
      <div>
        <section class="panel">
          <div class="panel-h"><h2>Side by side</h2><span class="small muted">per door per month unless noted</span></div>
          <div class="table-wrap"><table class="compare">
            <thead><tr><th></th>${TIERS.map(function (t) {
              var v = verdict(C.margins[t], P.targetPct);
              return html`<th key=${t} class=${fc(t)}>${TIER_NAMES[t]}<br /><span class=${"pill " + v.cls}>${v.label}</span></th>`;
            })}</tr></thead>
            <tbody>
              ${row("Standard monthly fee", function (t) { return pct(P.tiers[t].monthlyPct, 2); }, "", ["Set on the Prices page. The owner's own pick is shown there too."])}
              ${row("Services included", function (t) { return C.cost.included[t] + " of " + C.cost.possible; })}
              ${row("Revenue", function (t) { return money(C.margins[t].revenue, 2); }, "total")}
              ${row("Monthly fee", function (t) { return money(C.margins[t].rev.mgmt, 2); }, "sub", ["The owner's monthly % × " + money(G.rent) + " average rent.", P.vacancyPct ? "Less " + P.vacancyPct + "% vacancy." : "No vacancy deduction."])}
              ${row("Leasing fees", function (t) { return money(C.margins[t].rev.leasing, 2); }, "sub", ["Leasing fee × " + C.margins.min.rev.turnsYr.toFixed(2) + " placements a year (1 ÷ " + fmtNum(G.tenancy) + "-yr average tenancy) ÷ 12."])}
              ${row("Renewal fees", function (t) { return money(C.margins[t].rev.renewal, 2); }, "sub", ["Renewal fee × " + C.margins.min.rev.renewalsYr.toFixed(2) + " renewals a year ÷ 12."])}
              ${row("Per-use fees and add-ons", function (t) { return money(C.margins[t].addon.rev, 2); }, "sub", ["Per-use service fees (step 3) and optional add-ons and benefits packages (step 4)."])}
              ${row("Cost", function (t) { return money(C.margins[t].cost, 2); }, "total", ["Cost lines checked for the tier and counted at " + VIEW_NAMES[doc.cv] + ", plus add-on costs and the lease break waiver" + (P.scopeSavings ? ", less freed PM capacity." : ".")])}
              ${groupRowsOut.map(function (x) { return html`<${React.Fragment} key=${x.g.id}>${row(x.g.label, function (t) { return money(x.vals[t], 2); }, "sub")}</${React.Fragment}>`; })}
              ${lbAny ? row("Lease break waiver", function (t) { return money(C.margins[t].leaseBreak.cost, 2); }, "sub", ["The leasing fee a tier waives when it re-places a tenant who broke their lease. Guarantees group."]) : null}
              ${row("Fee and add-on costs", function (t) { return money(C.margins[t].addon.cost, 2); }, "sub", ["Court fees and the PM's split on billed evictions, what add-ons and benefits packages cost you, and any cost you set on a fee."])}
              ${P.scopeSavings ? row("Less freed PM capacity", function (t) { return "−" + money(C.cost.freed[t], 2); }, "sub", ["Services a tier leaves out, valued at the PM time they free."]) : null}
              ${row("Margin", function (t) { return html`<span class=${verdict(C.margins[t], P.targetPct).cls}>${money(C.margins[t].margin, 2)}</span>`; }, "total big")}
              ${row("Margin %", function (t) { return html`<span class=${verdict(C.margins[t], P.targetPct).cls}>${pct(C.margins[t].marginPct)}</span>`; }, "total")}
              ${row("Portfolio margin / yr", function (t) { return money(C.margins[t].portfolioMo * 12); }, "sub", ["Margin per door × " + fmtNum(G.doors) + " long-term residential doors × 12, as if every one were on this tier. STR and commercial are counted separately."])}
              ${row("Worst to best owner pick", function (t) { var r = ownerChoiceRange(doc, t, C.cost.perDoor[t]); return pct(r.lo.marginPct, 0) + " to " + pct(r.hi.marginPct, 0); }, "sub", ["Margin % across every monthly fee an owner can pick. Prices page explains it."])}
              ${VIEWS.map(function (vw) {
                return html`<${React.Fragment} key=${vw}>${row("At " + VIEW_NAMES[vw], function (t) {
                  var mm = tierMargin(doc, t, C.allViews[vw].perDoor[t], vw);
                  return html`<span class=${verdict(mm, P.targetPct).cls}>${pct(mm.marginPct)}</span>`;
                }, "sub")}</${React.Fragment}>`;
              })}
            </tbody>
          </table></div>
        </section>

      </div>
    </div>`;
  }

  var FIELD_GROUPS = [
    { title: "Residential", fields: [
      { id: "f-doors", label: "Long-term residential doors", get: function (d) { return d.G.doors; }, set: function (d, v) { d.G.doors = Math.max(1, Math.round(v)); d.af.rd = afResUnits(d); }, step: 1, min: 1,
        help: "Doors on the three packages. Package revenue and margin are per one of these doors. STR and commercial units are set below." },
      { id: "f-rent", label: "Average rent", prefix: "$", get: function (d) { return d.G.rent; }, set: function (d, v) { d.G.rent = v; }, step: 25, min: 0,
        help: "Average monthly rent across managed units. Every percentage fee (monthly and leasing) is figured on this." },
      { id: "f-tenancy", label: "Average tenancy", suffix: "yrs", get: function (d) { return d.G.tenancy; }, set: function (d, v) { d.G.tenancy = v; }, step: 0.5, min: 0.25,
        help: "How long a tenant stays. Sets how often units turn over (leasing fees and turnover costs) and how many renewals happen." },
      { id: "f-listings", label: "Active listings", get: function (d) { return d.G.listings; }, set: function (d, v) { d.G.listings = v; }, step: 1, min: 0,
        help: "Units listed for rent at a typical moment. Per-listing costs multiply by this." },
      { id: "f-term", label: "Lease term", suffix: "mo", get: function (d) { return d.pricing.term; }, set: function (d, v) { d.pricing.term = Math.max(1, v); }, step: 1, min: 1,
        help: "Length of a standard lease. Renewals and the owner's fee choice are figured per lease term." },
      { id: "f-vacancy", label: "Vacancy", suffix: "%", get: function (d) { return d.pricing.vacancyPct; }, set: function (d, v) { d.pricing.vacancyPct = Math.min(100, v); }, step: 1, min: 0, max: 100,
        help: "Keep at 0%. Raynor only collects fees once a renter is placed. Use it only to test an owner-side vacancy." }
    ] },
    { title: "STR and commercial", fields: [
      { id: "f-str", label: "Short-term rental units", get: function (d) { return d.G.str; }, set: function (d, v) { d.G.str = Math.max(0, Math.round(v)); d.af.rd = afResUnits(d); }, step: 1, min: 0,
        help: "They share the costs every unit comes with (not turnovers, listings or guarantees), which lowers the cost per package door. AppFolio bills them as residential." },
      { id: "f-comm", label: "Commercial units", get: function (d) { return d.G.comm; }, set: function (d, v) { d.G.comm = Math.max(0, Math.round(v)); d.af.cd = d.G.comm; }, step: 1, min: 0,
        help: "They share the costs every unit comes with (not turnovers, listings or guarantees), which lowers the cost per package door. AppFolio bills them at its commercial rate." },

    ] },
    { title: "Yearly activity, whole portfolio", fields: [
      { id: "f-wo", label: "Work orders", suffix: "/yr", get: function (d) { return d.G.wo; }, set: function (d, v) { d.G.wo = v; }, step: 10, min: 0,
        help: "Work orders over the last 12 months. Maintenance coordination fees are billed on these." },
      { id: "f-evictions", label: "Evictions", suffix: "/yr", get: function (d) { return d.G.evictions; }, set: function (d, v) { d.G.evictions = v; }, step: 1, min: 0,
        help: "Evictions filed over the last 12 months. Used by both the billed eviction fee and the Eviction guarantee." },
      { id: "f-court", label: "Court fees per eviction", prefix: "$", get: function (d) { return d.G.courtFee; }, set: function (d, v) { d.G.courtFee = v; }, step: 1, min: 0,
        help: "$96 filing + $30 per tenant. Comes out of the $750 when the owner is billed. Raynor pays it when the guarantee covers the eviction." },
      { id: "f-notplaced", label: "Tenant we didn't place", suffix: "%", get: function (d) { return d.G.evictNotPlacedPct; }, set: function (d, v) { d.G.evictNotPlacedPct = Math.min(100, v); }, step: 5, min: 0, max: 100,
        help: "In a tier with the Eviction guarantee, the share of evictions where Raynor didn't place the tenant. Those are billed $750 instead of covered." }
    ] },
    { title: "Staff and software", fields: [
      { id: "f-seats", label: "Software seats", get: function (d) { return d.G.seats; }, set: function (d, v) { d.G.seats = v; }, step: 1, min: 0,
        help: "Per-seat software costs multiply by this." },
      { id: "f-hours", label: "Work hours per person", suffix: "/yr", get: function (d) { return d.G.hoursYr; }, set: function (d, v) { d.G.hoursYr = v; }, step: 40, min: 1,
        help: "Paid hours a year (2,080 = 40 hours × 52 weeks). Turns a salary into an hourly rate for services priced in hours." }
    ] },
    { title: "AppFolio", fields: [
      { id: "f-afrr", label: "Residential rate", prefix: "$", suffix: "/unit", get: function (d) { return d.af.rr; }, set: function (d, v) { d.af.rr = v; }, step: 0.01, min: 0,
        help: "What AppFolio charges per residential unit each month." },
      { id: "f-afrd", label: "Residential units", readonly: function (d) { return fmtNum(d.af.rd); },
        help: "Long-term residential doors, plus STR units when Include STR is on. Updates on its own." },
      { id: "f-afcd", label: "Commercial units", readonly: function (d) { return fmtNum(d.af.cd); },
        help: "From STR and commercial above. Updates on its own." },
      { id: "f-afcr", label: "Commercial rate", prefix: "$", suffix: "/unit", get: function (d) { return d.af.cr; }, set: function (d, v) { d.af.cr = v; }, step: 0.01, min: 0,
        help: "What AppFolio charges per commercial unit each month. Only counted when commercial units are included below." },
      { id: "f-afistr", label: "Include STR", toggle: function (d) { return !!d.af.istr; }, setToggle: function (d, on) { d.af.istr = on ? 1 : 0; d.af.rd = afResUnits(d); },
        help: "Counts the STR units in AppFolio's residential units. Off leaves them out of the AppFolio cost." },
      { id: "f-afic", label: "Include commercial", toggle: function (d) { return !!d.af.ic; }, setToggle: function (d, on) { d.af.ic = on ? 1 : 0; },
        help: "Adds the commercial units to the AppFolio cost line." }
    ] },
    { title: "Model settings", fields: [
      { id: "f-target", label: "Target margin", suffix: "%", get: function (d) { return d.pricing.targetPct; }, set: function (d, v) { d.pricing.targetPct = Math.min(95, v); }, step: 1, min: 0, max: 95,
        help: "The margin each tier should clear. Sets the green mark on each price slider and the On target / Below target labels." },
      { id: "f-savings", label: "Count freed PM capacity", toggle: function (d) { return !!d.pricing.scopeSavings; }, setToggle: function (d, on) { d.pricing.scopeSavings = on; },
        help: "When a tier leaves out a service, the PM time it would take is freed. On takes that value off the tier's cost. Off only shows it." }
    ] }
  ];

  /* A field's current value as short text, for the one-line summary of a collapsed Portfolio section. */
  function fieldText(doc, f) {
    if (f.readonly) return f.readonly(doc);
    if (f.toggle) return f.toggle(doc) ? "on" : "off";
    var v = f.get(doc);
    return (f.prefix || "") + fmtNum(v || 0) + (f.suffix ? (f.suffix.charAt(0) === "/" || f.suffix === "%" ? "" : " ") + f.suffix : "");
  }

  function Portfolio(props) {
    var doc = props.doc, update = props.update, shut = props.ui.pfShut;
    var allShut = FIELD_GROUPS.every(function (g) { return shut[g.title]; });
    function setAll(v) { props.setUi(function (u) { FIELD_GROUPS.forEach(function (g) { u.pfShut[g.title] = v; }); }); }
    return html`<div class="page">
      <${PageHead} kicker="Step 1" title="Portfolio" lead="The facts about your business that every other number is built on. Each one says what it drives, so you know what to expect when you change it."
        right=${html`<div class="toolbar"><button type="button" class="mini" disabled=${allShut} onClick=${function () { setAll(true); }}>Collapse all</button>
          <button type="button" class="mini" onClick=${function () { setAll(false); }}>Expand all</button></div>`} />
      ${FIELD_GROUPS.map(function (grp) {
        var isShut = !!shut[grp.title];
        return html`<section key=${grp.title} class="panel">
          <h2 class="panel-h-btn-wrap">
            <button type="button" class="panel-h-btn" aria-expanded=${!isShut}
              onClick=${function () { props.setUi(function (u) { u.pfShut[grp.title] = !isShut; }); }}>
              <span class="caret-i" aria-hidden="true">${isShut ? "▸" : "▾"}</span>
              <span class="sec-name">${grp.title}</span>
              ${isShut ? html`<span class="sec-sum">${grp.fields.map(function (f) { return f.label + " " + fieldText(doc, f); }).join(" · ")}</span>` : null}
            </button>
          </h2>
          ${isShut ? null : html`<div class="panel-b fieldset">${grp.fields.map(function (f) {
            var ctrl = f.readonly ? html`<span class="affix ro">${f.readonly(doc)}</span>`
              : f.toggle ? html`<label class="toggle-box" for=${f.id}><input type="checkbox" id=${f.id} checked=${f.toggle(doc)} onChange=${function (e) { var on = e.target.checked; update(function (d) { f.setToggle(d, on); }, f.label + (on ? " on" : " off")); }} /><span>${f.toggle(doc) ? "On" : "Off"}</span></label>`
              : html`<${Affix} id=${f.id} prefix=${f.prefix} suffix=${f.suffix} step=${f.step} min=${f.min} max=${f.max} label=${f.label}
                  value=${f.get(doc)} onChange=${function (v) { update(function (d) { f.set(d, v); }, f.label); }} />`;
            return html`<div key=${f.id} class="frow" id=${"row-" + f.id}>
              <label for=${f.id}>${f.label}</label>
              <div class="fctrl">${ctrl}</div>
              <div class="help">${f.help}</div>
            </div>`;
          })}</div>`}
        </section>`;
      })}
      ${doc.templates.length > 1 ? html`<section class="panel"><div class="panel-h"><h2>Checkbox preset</h2></div>
        <div class="panel-b frow"><label for="f-tpl">Preset</label>
          <select id="f-tpl" value=${doc.at} onChange=${function (e) { var val = e.target.value; update(function (d) { d.at = val; }, "Checkbox preset"); }}>
            ${doc.templates.map(function (tp) { return html`<option key=${tp.id} value=${tp.id}>${tp.name}</option>`; })}
          </select>
          <div class="help">Which saved set of tier checkboxes from the cost tool to use.</div></div></section>` : null}
      <${Next} go=${props.go} to="costs" label="Step 2: Costs" text="Next, check which costs each tier carries." />
    </div>`;
  }

  function Costs(props) {
    var doc = props.doc, update = props.update, ui = props.ui, focus = ui.focus, view = doc.cv, ck = activeTemplate(doc).ck;
    var filtering = ui.costFilter.q || ui.costFilter.show !== "all";
    var shown = 0, total = 0;
    var groups = doc.CG.map(function (g) {
      var rows = groupRows(doc, g);
      var keep = rows.filter(function (r) {
        total++;
        var ok = passes(ui.costFilter, focus, rowName(doc, r), ck[r.id] || {}, isVisible(rowView(doc, r.id, g.id), view));
        if (ok) shown++;
        return ok;
      });
      return { g: g, rows: rows, keep: keep };
    });
    function setAll(ids, t, on, label) {
      update(function (d) {
        var tp = activeTemplate(d);
        ids.forEach(function (id) { tp.ck[id] = tp.ck[id] || { min: false, special: false, plus: false }; tp.ck[id][t] = on; syncLinked(d, tp, "ck", id, t); });
      }, label + ": all " + (on ? "on" : "off") + " for " + TIER_SHORT[t]);
    }
    function addRow(gid, label) {
      var id = "row_" + Date.now().toString(36);
      update(function (d) {
        d.CG.find(function (x) { return x.id === gid; }).rows.push({ id: id, name: "New line", e: "monthly", v: 0 });
        d.vl[id] = 0;
        d.templates.forEach(function (tp) { tp.ck[id] = { min: true, special: true, plus: true }; });
      }, "Added a line to " + label);
      props.setUi(function (u) { u.groups[gid] = false; u.sel = { kind: "cost", id: id }; });
    }
    function select(id) { props.setUi(function (u) { u.sel = u.sel && u.sel.kind === "cost" && u.sel.id === id ? null : { kind: "cost", id: id }; }); }
    function rowClick(e, id) { if (!e.target.closest("input,select,button,a,label")) select(id); }
    var sel = ui.sel && ui.sel.kind === "cost" ? ui.sel.id : null;

    return html`<div class="page">
      <${PageHead} kicker="Step 2" title="Costs" lead=${"Everything Raynor pays to run the packages. Check a line for a tier to charge its cost to that tier. Grey lines don't count at " + VIEW_NAMES[view] + ". Click a line to see its math and what it costs each tier."} />
      <section class="panel">
        <div class="panel-b" style=${{ paddingTop: "12px" }}>
          <${Toolbar} id="cost" filter=${ui.costFilter} focus=${focus} shown=${shown} total=${total}
            onChange=${function (f) { props.setUi(function (u) { u.costFilter = f; }); }}
            onCollapseAll=${function () { props.setUi(function (u) { doc.CG.forEach(function (g) { u.groups[g.id] = true; }); }); }}
            onExpandAll=${function () { props.setUi(function (u) { u.groups = {}; }); }} />
        </div>
        <div class="table-wrap"><table class="grid">
          <thead><tr>
            <th class="l">Line</th><th>Amount</th><th class="l">Per</th><th>Yearly count / burden</th><th>$/door/mo</th>
            <${TierHeads} focus=${focus} />
          </tr></thead>
          ${groups.map(function (G) {
            var g = G.g, rows = G.rows;
            if (filtering && !G.keep.length) return null;
            var gView = doc.secView[g.id] || "direct", gHidden = !isVisible(gView, view);
            var isCollapsed = !!ui.groups[g.id];
            var ids = rows.map(function (r) { return r.id; });
            var gDoor = rows.reduce(function (s, r) { return s + (isVisible(rowView(doc, r.id, g.id), view) && r.id !== "lease_brk" ? linePerDoor(doc, cmo(r, doc), r, g.id) : 0); }, 0);
            return html`<tbody key=${g.id}>
              <tr class="grp">
                <td class="l" colspan="3">
                  <button type="button" class="caret" aria-expanded=${!isCollapsed} aria-label=${(isCollapsed ? "Expand " : "Collapse ") + g.label}
                    onClick=${function () { props.setUi(function (u) { u.groups[g.id] = !isCollapsed; }); }}>${isCollapsed ? "▸" : "▾"}</button>
                  ${g.label} <span class="muted small" style=${{ fontWeight: 400 }}>${filtering ? G.keep.length + " of " + rows.length : rows.length} lines</span>
                  <select id=${"gv-" + g.id} aria-label=${g.label + " counts from"} style=${{ marginLeft: "10px" }} value=${gView}
                    onChange=${function (e) { var val = e.target.value; update(function (d) { d.secView[g.id] = val; }, g.label + ": counts from " + VIEW_NAMES[val]); }}>
                    ${VIEWS.map(function (vw) { return html`<option key=${vw} value=${vw}>${VIEW_NAMES[vw]}</option>`; })}
                  </select>
                  ${gHidden ? html`<span class="tag">not counted now</span>` : null}
                </td>
                <td></td>
                <td class="mono">${money(gDoor, 2)}</td>
                ${TIERS.map(function (t) {
                  var out = ids.filter(function (id) { return !(ck[id] && ck[id][t]); }).length, on = ids.length && out === 0;
                  return html`<td key=${t} class=${"c tcol" + (focus === t ? " focus" : "")}>
                    <button type="button" class="mini" title=${(on ? "Uncheck" : "Check") + " every " + g.label + " line for " + TIER_SHORT[t]}
                      onClick=${function () { setAll(ids, t, !on, g.label); }}>${on ? "none" : "all"}</button>
                    ${out && out < ids.length ? html`<div class="out-n">${out} out</div>` : null}
                  </td>`;
                })}
              </tr>
              ${isCollapsed ? null : (filtering ? G.keep : rows).map(function (r) {
                var vis = isVisible(rowView(doc, r.id, g.id), view), f = ck[r.id] || {}, name = rowName(doc, r);
                var isAf = r.e === "af", calc = !!CALC_ROWS[r.id], isLb = r.id === "lease_brk";
                var perDoor = isLb ? null : linePerDoor(doc, cmo(r, doc), r, g.id);
                var lbText = null;
                if (isLb) {
                  var vals = TIERS.filter(function (t) { return f[t]; }).map(function (t) { return leaseBreakMo(doc, t) / (doc.G.doors || 1); });
                  var lo = vals.length ? Math.min.apply(null, vals) : 0, hi = vals.length ? Math.max.apply(null, vals) : 0;
                  lbText = hi - lo > 0.005 ? money(lo, 2) + "–" + money(hi, 2) : money(hi, 2);
                }
                var vt = viewTag(doc, r.id, g.id);
                return html`<tr key=${r.id} class=${"item" + (vis ? "" : " dim") + (sel === r.id ? " sel" : "")} onClick=${function (e) { rowClick(e, r.id); }}>
                  <td class="l name-cell">
                    <input type="text" class="txt" id=${"n-" + r.id} aria-label="Line name" value=${name}
                      onChange=${function (e) { var val = e.target.value; update(function (d) { if (r.promoted) d.MASTER[r.id].n = val; else d.CG.find(function (x) { return x.id === g.id; }).rows.find(function (x) { return x.id === r.id; }).name = val; }, "Renamed a line"); }} />
                    ${r.promoted ? html`<span class="tag">service</span>` : null}${r.pmScope ? html`<span class="tag">does scope work</span>` : null}
                    ${calc ? html`<span class="tag link">linked</span>` : null}${vt ? html`<span class="tag">${vt}</span>` : null}
                  </td>
                  <td>${isAf ? html`<span class="small faint">AppFolio rates</span>` : isLb ? html`<span class="small faint">tier's leasing fee</span>`
                    : html`<${Affix} id=${"v-" + r.id} prefix="$" label=${"Amount for " + name} value=${doc.vl[r.id] != null ? doc.vl[r.id] : r.v}
                      onChange=${function (val) { update(function (d) { d.vl[r.id] = val; }, name + ": amount"); }} />`}</td>
                  <td class="l small muted">${isLb ? "per lease break" : r.id === "evict_g" ? "attorney use + court fees" : BASIS_NAMES[r.e]}</td>
                  <td>${calc || r.e === "claim" ? html`<${Affix} id=${"ev-" + r.id} cls="w-sm" min=${0} label="Per year across the portfolio"
                      value=${doc.ev[r.id] != null ? doc.ev[r.id] : (r.n_ev || 0)} onChange=${function (val) { update(function (d) { d.ev[r.id] = val; }, name + ": per year"); }} />`
                    : r.e === "annual" ? html`<span class="small faint">${fmtNum(doc.bd[r.id] != null ? doc.bd[r.id] : (r.n_bd || 0))}% burden</span>` : null}</td>
                  <td class="mono">${isLb ? lbText : money(perDoor, 2)}</td>
                  ${TIERS.map(function (t) {
                    return html`<td key=${t} class=${"c tcol" + (focus === t ? " focus" : "")}><input type="checkbox" id=${"ck-" + r.id + "-" + t} aria-label=${name + " in " + TIER_SHORT[t]}
                      checked=${!!f[t]} onChange=${function () { toggleCk(update, "ck", r.id, t, name); }} /></td>`;
                  })}
                </tr>`;
              })}
              ${isCollapsed || filtering ? null : html`<tr class="add"><td class="l" colspan=${5 + TIERS.length}><button type="button" class="link small" onClick=${function () { addRow(g.id, g.label); }}>+ Add a line to ${g.label}</button></td></tr>`}
            </tbody>`;
          })}
        </table></div>
      </section>
      <p class="note">"Linked" lines have their own math. The Eviction guarantee covers court fees on evictions of tenants Raynor placed, plus the attorney cap. The Lease break waiver is the leasing fee a tier gives up when it re-places a tenant who broke the lease; check it for tiers that waive it.</p>
      <${Next} go=${props.go} to="services" label="Step 3: Services" text="Next, set what each tier promises." />
    </div>`;
  }

  function Services(props) {
    var doc = props.doc, update = props.update, ui = props.ui, focus = ui.focus, view = doc.cv, psk = activeTemplate(doc).psk, C = props.C;
    var owners = bundleOwners(doc);
    var filtering = ui.scopeFilter.q || ui.scopeFilter.show !== "all";
    var shown = 0, total = 0;
    var blocks = owners.map(function (o) {
      var ids = scopeIds(doc).filter(function (id) { return doc.scopeOwner[id] === o.id; });
      var oVis = ownerVisible(doc, o.id, view), cats = {};
      ids.forEach(function (id) {
        total++;
        if (!passes(ui.scopeFilter, focus, doc.MASTER[id].n, psk[id] || {}, oVis)) return;
        shown++;
        var c = doc.icat[id] || doc.MASTER[id].dc;
        (cats[c] = cats[c] || []).push(id);
      });
      return { o: o, ids: ids, vis: oVis, cats: cats };
    });
    function setAll(ids, t, on, label) {
      update(function (d) {
        var tp = activeTemplate(d);
        ids.forEach(function (id) { tp.psk[id] = tp.psk[id] || { min: false, special: false, plus: false }; tp.psk[id][t] = on; syncLinked(d, tp, "psk", id, t); });
      }, label + ": all " + (on ? "on" : "off") + " for " + TIER_SHORT[t]);
    }
    var sel = ui.sel && ui.sel.kind === "svc" ? ui.sel.id : null;
    var benchIds = Object.keys(doc.MASTER).filter(function (id) { return doc.place[id] === "uc"; });
    var benchCats = Object.keys(doc.MASTER).reduce(function (a, k) { var c = doc.icat[k] || doc.MASTER[k].dc; if (c && a.indexOf(c) < 0) a.push(c); return a; }, []).sort();
    return html`<div class="page">
      <${PageHead} kicker="Step 3" title="Services" lead="What each tier promises, grouped by the staff role that does the work. A service's value is the PM time it takes. Including it costs nothing extra, since staff pay is already a cost line. Leaving it out of a tier frees that time." />
      <section class="panel">
        <div class="panel-h"><h2>PM capacity freed per door each month</h2>
          <label class="switch small" for="svc-savings"><input type="checkbox" id="svc-savings" checked=${!!doc.pricing.scopeSavings}
            onChange=${function (e) { var on = e.target.checked; update(function (d) { d.pricing.scopeSavings = on; }, "Count freed PM capacity " + (on ? "on" : "off")); }} />
            <span>Take it off each tier's cost</span></label>
        </div>
        <div class="panel-b" style=${{ display: "flex", gap: "22px", flexWrap: "wrap" }}>
          ${TIERS.map(function (t) {
            return html`<div key=${t}><div class="small muted">${TIER_NAMES[t]}</div><div class="mono strong">${money(C.cost.freed[t], 2)} <span class="small faint">from ${C.cost.freedCount[t]} left out</span></div></div>`;
          })}
        </div>
      </section>
      <section class="panel">
        <div class="panel-b" style=${{ paddingTop: "12px" }}>
          <${Toolbar} id="scope" filter=${ui.scopeFilter} focus=${focus} shown=${shown} total=${total}
            onChange=${function (f) { props.setUi(function (u) { u.scopeFilter = f; }); }}
            onCollapseAll=${function () { props.setUi(function (u) { owners.forEach(function (o) { u.owners[o.id] = true; }); }); }}
            onExpandAll=${function () { props.setUi(function (u) { u.owners = {}; u.cats = {}; }); }} />
        </div>
        <div class="table-wrap"><table class="grid">
          <thead><tr>
            <th class="l">Service</th><th>Value</th><th>Hours</th><th class="l">Unit</th><th>Events</th><th>Time $/door/mo</th>
            <${TierHeads} focus=${focus} />
          </tr></thead>
          ${blocks.map(function (B) {
            var o = B.o, catNames = Object.keys(B.cats).sort();
            if (!B.ids.length || (filtering && !catNames.length)) return null;
            var oCollapsed = !!ui.owners[o.id];
            return html`<tbody key=${o.id}>
              <tr class="grp"><td class="l" colspan=${6 + TIERS.length}>
                <button type="button" class="caret" aria-expanded=${!oCollapsed} aria-label=${(oCollapsed ? "Expand " : "Collapse ") + o.name}
                  onClick=${function () { props.setUi(function (u) { u.owners[o.id] = !oCollapsed; }); }}>${oCollapsed ? "▸" : "▾"}</button>
                ${o.name} <span class="muted small" style=${{ fontWeight: 400 }}>· ${B.ids.length} services · ${money(ownerHourlyRate(doc, o.id), 2)}/hr</span>
                ${B.vis ? null : html`<span class="tag">not counted at ${VIEW_NAMES[view]}</span>`}
              </td></tr>
              ${oCollapsed ? null : catNames.map(function (c) {
                var key = o.id + "|" + c, cCollapsed = !!ui.cats[key], cIds = B.cats[c];
                return html`<${React.Fragment} key=${c}>
                  <tr class="cat"><td class="l" colspan="6">
                    <button type="button" class="caret" aria-expanded=${!cCollapsed} aria-label=${(cCollapsed ? "Expand " : "Collapse ") + c}
                      onClick=${function () { props.setUi(function (u) { u.cats[key] = !cCollapsed; }); }}>${cCollapsed ? "▸" : "▾"}</button>${c} · ${cIds.length}</td>
                    ${TIERS.map(function (t) {
                      var on = cIds.every(function (id) { return psk[id] && psk[id][t]; });
                      return html`<td key=${t} class=${"c tcol" + (focus === t ? " focus" : "")}><button type="button" class="mini" title=${(on ? "Uncheck" : "Check") + " all " + c + " for " + TIER_SHORT[t]}
                        onClick=${function () { setAll(cIds, t, !on, c); }}>${on ? "none" : "all"}</button></td>`;
                    })}
                  </tr>
                  ${cCollapsed ? null : cIds.map(function (id) {
                    var svc = doc.MASTER[id], basis = doc.pbase[id] || "door_yr", hrs = doc.psh[id] || 0, f = psk[id] || {};
                    return html`<tr key=${id} class=${"item" + (B.vis ? "" : " dim") + (sel === id ? " sel" : "")}
                      onClick=${function (e) { if (!e.target.closest("input,select,button,label")) props.setUi(function (u) { u.sel = u.sel && u.sel.kind === "svc" && u.sel.id === id ? null : { kind: "svc", id: id }; }); }}>
                      <td class="l name-cell"><input type="text" class="txt" id=${"sn-" + id} aria-label="Service name" value=${svc.n}
                        onChange=${function (e) { var val = e.target.value; update(function (d) { d.MASTER[id].n = val; }, "Renamed a service"); }} />
                        ${basis === "door_yr" && scopeValue(doc, id) >= 200 ? html`<span class="tag warn" title=${money(scopeValue(doc, id)) + " per door per year is large. If it's a price per event, switch the unit to per event."}>check unit</span>` : null}
                        ${id === EVICT_SVC ? html`<span class="tag link">linked</span>` : null}</td>
                      <td>${hrs ? html`<span class="mono muted">${money(scopeValue(doc, id), 2)}</span>` : html`<${Affix} id=${"sv-" + id} prefix="$" min=${0} label=${"Value of " + svc.n}
                        value=${doc.psv[id] != null ? doc.psv[id] : svc.dsv} onChange=${function (val) { update(function (d) { d.psv[id] = val; }, svc.n + ": value"); }} />`}</td>
                      <td><${Affix} id=${"sh-" + id} cls="w-sm" min=${0} label=${"Hours for " + svc.n} value=${hrs}
                        onChange=${function (val) { update(function (d) { if (val) d.psh[id] = val; else delete d.psh[id]; }, svc.n + ": hours"); }} /></td>
                      <td class="l"><select id=${"sb-" + id} aria-label="Unit" value=${basis}
                        onChange=${function (e) { var val = e.target.value; update(function (d) { d.pbase[id] = val; }, svc.n + ": unit"); }}>
                        <option value="door_yr">per door / yr</option><option value="event">per turnover</option><option value="claim">per event</option>
                      </select></td>
                      <td>${basis === "claim" ? html`<${Affix} id=${"se-" + id} cls="w-sm" min=${0} label="Events per year" value=${doc.ev[id] || 0}
                        onChange=${function (val) { update(function (d) { d.ev[id] = val; }, svc.n + ": events"); }} />` : null}</td>
                      <td class="mono muted">${money(scopePerDoorMo(doc, id), 2)}</td>
                      ${TIERS.map(function (t) {
                        return html`<td key=${t} class=${"c tcol" + (focus === t ? " focus" : "")}><input type="checkbox" id=${"psk-" + id + "-" + t} aria-label=${svc.n + " in " + TIER_SHORT[t]}
                          checked=${!!f[t]} onChange=${function () { toggleCk(update, "psk", id, t, svc.n); }} /></td>`;
                      })}
                    </tr>`;
                  })}
                </${React.Fragment}>`;
              })}
            </tbody>`;
          })}
        </table></div>
      </section>
      <${FeeTable} doc=${doc} update=${update} ui=${ui} setUi=${props.setUi} />
      <section class="panel">
        <${ShutHead} k="sec:bench" ui=${ui} setUi=${props.setUi} title="Bench: not offered yet" sum=${benchIds.length + " ideas"} />
        ${ui.pfShut["sec:bench"] ? null : benchIds.length ? html`<ul class="bench">${benchIds.map(function (id) {
          var svc = doc.MASTER[id], on = ui.sel && ui.sel.kind === "bench" && ui.sel.id === id;
          function pick() { props.setUi(function (u) { u.sel = on ? null : { kind: "bench", id: id }; }); }
          return html`<li key=${id} class=${"pick" + (on ? " sel" : "")} tabIndex="0" role="button" aria-pressed=${on} onClick=${pick}
            onKeyDown=${function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } }}>
            <span>${svc.n} <span class="faint small">· ${doc.icat[id] || svc.dc}</span></span></li>`;
        })}</ul>` : html`<p class="note" style=${{ padding: "0 14px 14px" }}>Nothing on the bench.</p>`}
        ${ui.pfShut["sec:bench"] ? null : html`<div style=${{ padding: "0 14px 14px" }}><button type="button" class="btn sm" onClick=${function () {
          var id = "uc_" + Date.now().toString(36);
          update(function (d) {
            d.MASTER[id] = { id: id, n: "New idea", d: "", dp: "uc", dc: benchCats[0] || "Property Operations", dsv: 0, dt: { min: false, special: false, plus: false } };
            d.place[id] = "uc";
          }, "Added a bench idea");
          props.setUi(function (u) { u.sel = { kind: "bench", id: id }; });
        }}>+ Add an idea to the bench</button></div>`}
      </section>
      <${Next} go=${props.go} to="fees" label="Step 4: Add-ons" text="Next, set optional extras owners can buy and any benefits package." />
    </div>`;
  }

  /* Panel title that collapses its section; open state persists with the other Portfolio-style toggles. */
  function ShutHead(props) {
    var shut = !!props.ui.pfShut[props.k];
    return html`<h2 class="panel-h-btn-wrap">
      <button type="button" class="panel-h-btn" aria-expanded=${!shut} onClick=${function () { props.setUi(function (u) { u.pfShut[props.k] = !shut; }); }}>
        <span class="caret-i" aria-hidden="true">${shut ? "▸" : "▾"}</span><span class="sec-name">${props.title}</span>
        <span class="sec-sum">${props.sum}</span>
      </button></h2>`;
  }

  /* Per-use service fees (kind "fee"): billed, included or not offered in each tier. Shown on the Services page. */
  function FeeTable(props) {
    var doc = props.doc, update = props.update, focus = props.ui.focus;
    var sel = props.ui.sel && props.ui.sel.kind === "fee" ? props.ui.sel.id : null;
    function edit(id, fn, label) { update(function (d) { var a = d.addons.find(function (x) { return x.id === id; }); if (a) fn(a); }, label); }
    var unit = { wo: "% of WOs", wo_rest: "% of WOs", events: "/yr", door_yr: "/door/yr" };
    return html`<${React.Fragment}>
      <section class="panel">
        <${ShutHead} k="sec:fees" ui=${props.ui} setUi=${props.setUi} title="Services billed per use"
          sum=${props.ui.pfShut["sec:fees"] ? doc.addons.filter(function (a) { return a.kind === "fee"; }).map(function (a) { return a.name; }).join(" · ") : "Charged bills the owner each time. Included does it at no charge. Off means the tier doesn't offer it."} />
        ${props.ui.pfShut["sec:fees"] ? null : html`<${React.Fragment}>
        <div class="table-wrap"><table class="grid">
          <thead><tr>
            <th class="l">Fee</th><th>You charge</th><th>Your cost</th><th>PM split</th><th class="l">How often</th><th>Amount</th><th>Net $/door/mo</th>
            <${TierHeads} focus=${focus} />
            <th></th>
          </tr></thead>
          <tbody>
            ${doc.addons.filter(function (a) { return a.kind === "fee"; }).map(function (a) {
              var ev = a.basis === "evict_billed", st = focus !== "all" ? focus : (TIERS.find(function (t) { return addonState(a, t) !== "off"; }) || "min");
              var n = addonEventsYr(doc, a, st), per = doc.G.doors ? n / 12 / doc.G.doors : 0;
              var net = ((a.price || 0) - addonCostEach(doc, a, "charged")) * per, share = addonShare(doc, a, st), isRest = /_rest$/.test(a.basis);
              return html`<tr key=${a.id} class=${"item" + (sel === a.id ? " sel" : "")}
                onClick=${function (e) { if (!e.target.closest("input,select,button,label")) props.setUi(function (u) { u.sel = u.sel && u.sel.kind === "fee" && u.sel.id === a.id ? null : { kind: "fee", id: a.id }; }); }}>
                <td class="l name-cell"><input type="text" class="txt" id=${"an-" + a.id} aria-label="Fee name" value=${a.name}
                  onChange=${function (e) { var v = e.target.value; edit(a.id, function (x) { x.name = v; }, "Renamed a fee"); }} />${ev ? html`<span class="tag link">linked</span>` : null}</td>
                <td><${Affix} id=${"ap-" + a.id} prefix="$" min=${0} label=${"Price of " + a.name} value=${a.price || 0} onChange=${function (v) { edit(a.id, function (x) { x.price = v; }, a.name + ": price"); }} /></td>
                <td>${ev ? html`<span class="mono muted" title="Court fees, set on the Portfolio page">${money(addonFixedCost(doc, a))}</span>`
                  : html`<${Affix} id=${"ac-" + a.id} prefix="$" min=${0} label=${"Your cost for " + a.name} value=${a.cost || 0} onChange=${function (v) { edit(a.id, function (x) { x.cost = v; }, a.name + ": cost"); }} />`}</td>
                <td><${Affix} id=${"as-" + a.id} suffix="%" cls="w-sm" min=${0} label="PM split" value=${a.split || 0} onChange=${function (v) { edit(a.id, function (x) { x.split = Math.min(100, v); }, a.name + ": PM split"); }} /></td>
                <td class="l">${ev ? html`<span class="locked">Evictions not under a guarantee</span>` : html`<select id=${"ab-" + a.id} aria-label="How often" value=${a.basis}
                  onChange=${function (e) { var v = e.target.value; edit(a.id, function (x) { x.basis = v; }, a.name + ": how often"); }}>
                  ${ADDON_BASES_PICKABLE.concat(ADDON_BASES_PICKABLE.indexOf(a.basis) < 0 ? [a.basis] : []).map(function (b) { return html`<option key=${b} value=${b}>${ADDON_BASES[b]}</option>`; })}
                </select>`}</td>
                <td>${ev ? html`<span class="mono muted small">${fmtNum(Math.round(n * 10) / 10)} of ${fmtNum(doc.G.evictions || 0)}/yr</span>`
                  : isRest ? html`<span class="mono muted small" title=${"Whatever the other work-order fees don't claim, for " + TIER_SHORT[st]}>rest: ${fmtNum(Math.round(share * 10) / 10)}%</span>`
                  : html`<${Affix} id=${"aa-" + a.id} cls="w-sm" min=${0} suffix=${unit[a.basis] || ""} label=${"How often " + a.name + " happens"} value=${a.amount || 0}
                      onChange=${function (v) { edit(a.id, function (x) { x.amount = ADDON_POOL[x.basis] ? Math.min(100, v) : v; }, a.name + ": how often"); }} />`}</td>
                <td class="mono">${money(net, 2)}</td>
                ${TIERS.map(function (t) {
                  var cls = "c tcol" + (focus === t ? " focus" : "");
                  if (ev) {
                    var lbl = !evictionHandled(doc, t) ? "Off" : evictionGuaranteed(doc, t) ? "Not placed" : "All";
                    return html`<td key=${t} class=${cls}><span class="locked" title=${fmtNum(Math.round(billedEvictionsYr(doc, t) * 10) / 10) + " billed a year. Follows the Eviction guarantee (Costs) and Eviction service (Services)."}>${lbl}</span></td>`;
                  }
                  return html`<td key=${t} class=${cls}><select id=${"at-" + a.id + "-" + t} class=${"state " + a.tiers[t]} aria-label=${a.name + " for " + TIER_SHORT[t]} value=${a.tiers[t]}
                    onChange=${function (e) { var v = e.target.value; edit(a.id, function (x) { x.tiers[t] = v; }, a.name + ": " + TIER_SHORT[t] + " " + ADDON_STATE_NAMES[v].toLowerCase()); }}>
                    ${ADDON_STATES.map(function (s) { return html`<option key=${s} value=${s}>${ADDON_STATE_NAMES[s]}</option>`; })}
                  </select></td>`;
                })}
                <td class="c">${ev ? null : html`<button type="button" class="x" title="Remove fee" aria-label=${"Remove " + a.name}
                  onClick=${function () { update(function (d) { d.addons = d.addons.filter(function (x) { return x.id !== a.id; }); }, "Removed " + a.name); props.setUi(function (u) { if (u.sel && u.sel.id === a.id) u.sel = null; }); }}>×</button>`}</td>
              </tr>`;
            })}
            <tr class="add"><td class="l" colspan=${8 + TIERS.length}><button type="button" class="link small" onClick=${function () {
              var id = "addon_" + Date.now().toString(36);
              update(function (d) { d.addons.push({ id: id, name: "New fee", price: 0, cost: 0, basis: "events", amount: 0, tiers: { min: "off", special: "off", plus: "off" } }); }, "Added a fee");
              props.setUi(function (u) { u.sel = { kind: "fee", id: id }; });
            }}>+ Add a per-use fee</button></td></tr>
          </tbody>
        </table></div>
        </${React.Fragment}>`}
      </section>
      <p class="note">Net is what Raynor keeps per door each month after the fee's cost and the PM's split${focus === "all" ? ", shown for the first tier that offers it" : ", for " + TIER_NAMES[focus]}. How often comes from Portfolio (work orders, evictions). "Linked": the billed eviction covers every eviction a tier handles that its guarantee doesn't; the guarantee itself is on the Costs page.</p>
    </${React.Fragment}>`;
  }

  /* Optional extras (kind "addon") and owner benefits packages (kind "bundle"). */
  function AddOns(props) {
    var doc = props.doc, update = props.update, focus = props.ui.focus, C = props.C;
    var adds = doc.addons.filter(function (a) { return a.kind === "addon"; });
    var bundles = doc.addons.filter(function (a) { return a.kind === "bundle"; });
    var LBL = ADDON_STATE_LABELS.addon;
    function edit(id, fn, label) { update(function (d) { var a = d.addons.find(function (x) { return x.id === id; }); if (a) fn(a); }, label); }
    function remove(a) { removeAddon(update, a); }
    function netFor(a, t) {
      var it = C.margins[t].addon.items.find(function (x) { return x.addon.id === a.id; });
      return it ? it.rev - it.cost : null;
    }
    function stateCell(a, t) {
      return html`<select id=${"at-" + a.id + "-" + t} class=${"state " + a.tiers[t]} aria-label=${a.name + " for " + TIER_SHORT[t]} value=${a.tiers[t]}
        onChange=${function (e) { var v = e.target.value; edit(a.id, function (x) { x.tiers[t] = v; }, a.name + ": " + TIER_SHORT[t] + " " + LBL[v].toLowerCase()); }}>
        ${ADDON_STATES.map(function (s) { return html`<option key=${s} value=${s}>${LBL[s]}</option>`; })}
      </select>`;
    }

    return html`<div class="page">
      <${PageHead} kicker="Step 4" title="Add-ons" lead="Extras an owner can buy on top of any package, like a roof inspection or an HVAC tune-up, and owner benefits packages that bundle them for one monthly price. Per-use fees like maintenance coordination live on the Services page." />

      <section class="panel">
        <div class="panel-h"><h2>Optional add-ons</h2><span class="small muted">Sold: owners can buy it. Included: every door in the tier gets it. Off: not offered.</span></div>
        <div class="table-wrap"><table class="grid addons-grid">
          <thead>
            <tr>
              <th class="l" rowSpan="2">Add-on</th><th rowSpan="2">Price</th><th rowSpan="2">Cost</th><th rowSpan="2">How often</th><th rowSpan="2">% who buy</th>
              <th class="c grp" colSpan="3">Sold in</th><th rowSpan="2" title="What Raynor keeps per door each month, in a tier that sells it">Keeps / door / mo</th>
            </tr>
            <tr><${TierHeads} focus=${focus} /></tr>
          </thead>
          <tbody>
            ${adds.map(function (a) {
              var on = props.ui.sel && props.ui.sel.kind === "addon" && props.ui.sel.id === a.id;
              return html`<tr key=${a.id} class=${"item" + (on ? " sel" : "")}
                onClick=${function (e) { if (!e.target.closest("input,select,button,label")) props.setUi(function (u) { u.sel = on ? null : { kind: "addon", id: a.id }; }); }}>
                <td class="l name-cell"><input type="text" class="txt" id=${"an-" + a.id} aria-label="Add-on name" value=${a.name}
                  onChange=${function (e) { var v = e.target.value; edit(a.id, function (x) { x.name = v; }, "Renamed an add-on"); }} /></td>
                <td><${Affix} id=${"ap-" + a.id} prefix="$" min=${0} label=${"Owner price for " + a.name} value=${a.price || 0} onChange=${function (v) { edit(a.id, function (x) { x.price = v; }, a.name + ": owner price"); }} /></td>
                <td><${AddonCost} doc=${doc} a=${a} id=${"ac-" + a.id} compact=${true} edit=${function (fn, label) { edit(a.id, fn, a.name + ": " + label); }} /></td>
                <td><${OftenCell} a=${a} name=${a.name} idp=${"af-" + a.id} edit=${function (fn, label) { edit(a.id, fn, a.name + ": " + label); }} /></td>
                <td><${Affix} id=${"au-" + a.id} cls="w-sm" min=${0} max=${100} step=${5} suffix="%" label=${"Share of owners who buy " + a.name} value=${a.uptake || 0} onChange=${function (v) { edit(a.id, function (x) { x.uptake = Math.min(100, v); }, a.name + ": owners who buy"); }} /></td>
                ${TIERS.map(function (t) {
                  return html`<td key=${t} class=${"c tcol-wide" + (focus === t ? " focus" : "")}>${stateCell(a, t)}</td>`;
                })}
                ${(function () {
                  // The same in every tier that sells it, so show it once: the focused tier if it sells it, else the first that does.
                  var t = focus !== "all" && a.tiers[focus] !== "off" ? focus : TIERS.find(function (x) { return a.tiers[x] !== "off"; });
                  var n = t ? netFor(a, t) : null;
                  return html`<td class=${"c mono small " + (n == null ? "faint" : n < 0 ? "bad" : "")} title="What Raynor keeps per door per month in a tier that sells it">${n == null ? "—" : (n >= 0 ? "+" : "") + money(n, 2)}</td>`;
                })()}
              </tr>`;
            })}
            ${adds.length ? null : html`<tr><td class="l muted small" colspan=${6 + TIERS.length}>No add-ons yet. Add one here, or offer a bench item as an add-on from the Services page.</td></tr>`}
            <tr class="add"><td class="l" colspan=${6 + TIERS.length}><button type="button" class="link small" onClick=${function () {
              var id = "addon_" + Date.now().toString(36);
              update(function (d) { d.addons.push({ id: id, name: "New add-on", price: 0, cost: 0, basis: "optional", kind: "addon", freq: 1, uptake: 0, tiers: { min: "charged", special: "charged", plus: "charged" } }); }, "Added an add-on");
            }}>+ Add an add-on</button></td></tr>
          </tbody>
        </table></div>
        <p class="note" style=${{ padding: "8px 14px 12px" }}>Price and cost are per time it's done. "Keeps / door / mo" is what Raynor keeps per door each month across all doors in a tier that sells it: price minus cost, times how often, times the share of owners who buy (or every door when it's included).</p>
      </section>

      <section class="panel">
        <div class="panel-h"><h2>Owner benefits packages</h2><span class="small muted">Bundle add-ons for one monthly price. The cost is what its add-ons cost you.</span></div>
        <div class="panel-b bundles">
          ${bundles.map(function (b) {
            var costMo = bundleCostPerDoorYr(doc, b) / 12, valueMo = bundleValuePerDoorYr(doc, b) / 12, price = b.price || 0;
            var margin = price - costMo;
            return html`<article key=${b.id} class="bundle">
              <div class="bundle-h">
                <input type="text" class="txt bundle-name" id=${"bn-" + b.id} aria-label="Package name" value=${b.name}
                  onChange=${function (e) { var v = e.target.value; edit(b.id, function (x) { x.name = v; }, "Renamed a package"); }} />
                <button type="button" class="x" title="Remove package" aria-label=${"Remove " + b.name} onClick=${function () { remove(b); }}>×</button>
              </div>
              <div class="bundle-body">
                <div class="bundle-items">
                  <div class="sub-h">What's in it</div>
                  ${adds.length ? adds.map(function (a) {
                    var on = b.items.indexOf(a.id) >= 0;
                    return html`<label key=${a.id} class="bundle-item" for=${"bi-" + b.id + "-" + a.id}>
                      <input type="checkbox" id=${"bi-" + b.id + "-" + a.id} checked=${on}
                        onChange=${function () { edit(b.id, function (x) { x.items = on ? x.items.filter(function (i) { return i !== a.id; }) : x.items.concat([a.id]); }, b.name + ": " + (on ? "removed " : "added ") + a.name); }} />
                      <span>${a.name}</span><span class="faint small mono">${money((a.price || 0) * addonTimesPerDoorYr(doc, a) / 12, 2)}/mo value</span>
                    </label>`;
                  }) : html`<p class="note">Add some optional add-ons above first.</p>`}
                </div>
                <div class="bundle-num">
                  <div class="sub-h">Price and margin, per door</div>
                  <div class="kv">
                    <span>Owner pays</span><${Affix} id=${"bp-" + b.id} prefix="$" suffix="/mo" min=${0} label="Monthly package price" value=${price} onChange=${function (v) { edit(b.id, function (x) { x.price = v; }, b.name + ": monthly price"); }} />
                    <span>Owners who buy</span><${Affix} id=${"bu-" + b.id} suffix="%" cls="w-sm" min=${0} max=${100} step=${5} label="Share of owners who buy the package" value=${b.uptake || 0} onChange=${function (v) { edit(b.id, function (x) { x.uptake = Math.min(100, v); }, b.name + ": owners who buy"); }} />
                    <span>Bought separately</span><span class="mono">${money(valueMo, 2)}/mo</span>
                    <span>Your cost</span><span class="mono">${money(costMo, 2)}/mo</span>
                    <span>Margin per owner</span><span class=${"mono strong " + (margin < 0 ? "bad" : "good")}>${money(margin, 2)}/mo${price > 0 ? " · " + pct(margin / price * 100) : ""}</span>
                    <span>Owner saves</span><span class="mono">${valueMo > price ? money(valueMo - price, 2) + "/mo (" + pct((valueMo - price) / valueMo * 100, 0) + ")" : "nothing vs separately"}</span>
                  </div>
                  <div class="sub-h">By tier</div>
                  <div class="bundle-tiers">${TIERS.map(function (t) {
                    var n = netFor(b, t);
                    return html`<div key=${t} class=${focus === t ? "focus" : ""}><span class="small strong">${TIER_SHORT[t]}</span>${stateCell(b, t)}
                      <span class=${"mono small " + (n != null && n < 0 ? "bad" : "")}>${n == null ? "—" : (n >= 0 ? "+" : "") + money(n, 2) + "/door"}</span></div>`;
                  })}</div>
                </div>
              </div>
            </article>`;
          })}
          <button type="button" class="btn" style=${{ alignSelf: "flex-start" }} onClick=${function () {
            var id = "bundle_" + Date.now().toString(36);
            update(function (d) { d.addons.push({ id: id, name: "Owner benefits package", price: 0, basis: "bundle", kind: "bundle", items: [], uptake: 0, tiers: { min: "charged", special: "charged", plus: "charged" } }); }, "Built a new package");
          }}>+ Build a package</button>
          <p class="note">Included in a tier means every owner on it gets the package at no extra charge, so you carry its full cost. An add-on that's also sold on its own counts separately from the package.</p>
        </div>
      </section>
      <${Next} go=${props.go} to="prices" label="Step 5: Prices" text="Last, set each tier's prices and see where margin lands." />
    </div>`;
  }

  function PriceCard(props) {
    var doc = props.doc, t = props.tier, C = props.C, m = C.margins[t], P = doc.pricing, p = P.tiers[t];
    var q = m.rev.quote, f = q.frame;
    var be = monthlyPctFor(doc, t, m.baseCost, 0), tg = monthlyPctFor(doc, t, m.baseCost, P.targetPct);
    var range = ownerChoiceRange(doc, t, m.baseCost);
    var set = function (k, val, label) { props.update(function (d) { d.pricing.tiers[t][k] = val; }, TIER_SHORT[t] + ": " + label); };
    var max = Math.max(20, p.monthlyPct), zl = Math.max(0.05, Math.round(f.zeroLeasePct * 100) / 100);
    var lv = verdict(range.lo, P.targetPct), hv = verdict(range.hi, P.targetPct);
    var zoneText = [
      "Same total per lease term as the standard mix.",
      "Renewal fee is $0, so each renewal year pays Raynor more than standard.",
      "No up-front fees. Renewal years pay Raynor the most."
    ][q.zone];
    return html`<article class=${"pcard" + (props.focus === t ? " focus" : "")} aria-labelledby=${"pc-" + t}>
      <div class="row-b"><h3 id=${"pc-" + t}>${TIER_NAMES[t]}</h3><span class=${"pill " + verdict(m, P.targetPct).cls}>${pct(m.marginPct)}</span></div>
      <div class="sub-h">Your price</div>
      <div class="row-b">
        <label for=${"pm-" + t} class="small strong">Standard monthly fee</label>
        <span style=${{ display: "inline-flex", alignItems: "center", gap: "6px" }}><${PctBox} id=${"pm-" + t} value=${p.monthlyPct} max=${30} label=${TIER_NAMES[t] + " standard monthly fee"}
          onChange=${function (v) { set("monthlyPct", v, "monthly fee"); }} /><span class="mono small muted">${money(f.anchor)}</span></span>
      </div>
      <${Range} id=${"pr-" + t} label=${TIER_NAMES[t] + " standard monthly fee slider"} min=${0} max=${max} step=${0.05} value=${p.monthlyPct}
        onChange=${function (v) { set("monthlyPct", v, "monthly fee"); }}>
        <${Tick} kind="floor" at=${be} min=${0} max=${max} title="Break-even" />
        <${Tick} kind="target" at=${tg} min=${0} max=${max} title="Target margin" />
      </${Range}>
      <div class="keys">
        <span class="key floor">Break-even <b>${be == null ? "above 25%" : pct(be, 2)}</b></span>
        <span class="key target">${P.targetPct}% target <b>${tg == null ? "above 25%" : pct(tg, 2)}</b></span>
        <${Info} plain=${true} label="What the red and green marks mean" lines=${[
          "Red: the lowest standard monthly fee where revenue covers this tier's cost of " + money(m.cost, 2) + "/door/mo.",
          "Green: the lowest fee that reaches your " + P.targetPct + "% target. Both assume the owner keeps the standard mix."
        ]} />
      </div>
      <div class="pair">
        <label class="fld" for=${"pl-" + t}><span>Leasing fee, % of 1 month</span>
          <${Affix} id=${"pl-" + t} suffix="%" step=${5} min=${0} label="Leasing fee" value=${p.leasePct} onChange=${function (v) { set("leasePct", v, "leasing fee"); }} /></label>
        <label class="fld" for=${"prn-" + t}><span>Renewal fee</span>
          <${Affix} id=${"prn-" + t} prefix="$" step=${25} min=${0} label="Renewal fee" value=${p.renewal} onChange=${function (v) { set("renewal", v, "renewal fee"); }} /></label>
      </div>
      <div class="divider"></div>
      <div class="sub-h">Owner's fee choice</div>
      <div class="row-b">
        <label for=${"po-" + t} class="small strong">Owner picks monthly</label>
        <${PctBox} id=${"po-" + t} value=${Math.round(q.pct * 100) / 100} max=${f.zeroLeasePct} label=${TIER_NAMES[t] + " owner's monthly pick"}
          onChange=${function (v) { set("shift", Math.round((v - p.monthlyPct) * 100) / 100, "owner's pick"); }} />
      </div>
      <${Range} id=${"ps-" + t} label=${TIER_NAMES[t] + " owner's fee choice slider"} min=${0} max=${zl} step=${0.05} value=${q.pct}
        onChange=${function (v) { set("shift", Math.round((v - p.monthlyPct) * 100) / 100, "owner's pick"); }}>
        <${Tick} kind="anchor" at=${p.monthlyPct} min=${0} max=${zl} title="Standard mix" />
        <${Tick} kind="renewal0" at=${range.zeroRenewalPct} min=${0} max=${zl} title="Renewal fee reaches $0" />
      </${Range}>
      <div class="scale"><span>0%</span><span>${pct(f.zeroLeasePct, 2)} no up-front fees</span></div>
      <div class="keys">
        <span class="key anchor">Standard <b>${pct(p.monthlyPct, 2)}</b></span>
        <span class="key renewal0">Renewal hits $0 <b>${pct(range.zeroRenewalPct, 2)}</b></span>
      </div>
      <dl class="quote">
        <div><dt>Monthly</dt><dd>${money(q.monthly)}</dd></div>
        <div><dt>Leasing</dt><dd>${money(q.leaseUp)}</dd><span class="tiny faint mono">${doc.G.rent > 0 ? pct(q.leaseUp / doc.G.rent * 100, 0) : "—"} of 1 mo</span></div>
        <div><dt>Renewal</dt><dd>${money(q.renewal)}</dd></div>
        <div><dt>At signing</dt><dd>${money(q.dueAtSigning)}</dd></div>
      </dl>
      <p class="small muted" style=${{ margin: 0 }}>${zoneText}</p>
      <div class="range-line">Any owner pick: <b class=${"mono " + lv.cls}>${pct(range.lo.marginPct)}</b> to <b class=${"mono " + hv.cls}>${pct(range.hi.marginPct)}</b>
        <${Info} plain=${true} label="Why margin moves with the owner's pick" lines=${[
          "Wherever the owner sets it, each lease term costs them the same total, so margin holds steady up to " + pct(range.zeroRenewalPct, 2) + ".",
          "Past that, the renewal fee can't go below $0, so each renewal year pays the full monthly fee and brings in more. Worst case sits at " + pct(range.lo.pct, 2) + "."
        ]} /></div>
      ${Math.abs(p.shift || 0) > 0.001 ? html`<button type="button" class="link small" style=${{ alignSelf: "flex-start" }} onClick=${function () { set("shift", 0, "back to standard mix"); }}>Back to standard mix</button>` : null}
    </article>`;
  }

  function Prices(props) {
    return html`<div class="page">
      <${PageHead} kicker="Step 5" title="Prices" lead="Set each tier's standard monthly, leasing and renewal fees. Red marks break-even and green your target. Below that, the owner's fee choice shows what happens when an owner trades a lower monthly fee for bigger leasing and renewal fees, or the other way around." />
      <div class="price-cols">${TIERS.map(function (t) {
        return html`<${PriceCard} key=${t} tier=${t} doc=${props.doc} C=${props.C} update=${props.update} focus=${props.ui.focus} />`;
      })}</div>
      <${Next} go=${props.go} to="summary" label="See the summary" text="Compare all three tiers side by side, or try a bigger portfolio under Growth." />
    </div>`;
  }

  function Growth(props) {
    var doc = props.doc, today = doc.G.doors, C = props.C;
    var fallback = today < 250 ? 250 : Math.round((today + 100) / 10) * 10;
    // The door counts are saved with the open scenario (doc.growth), so they come back after a refresh.
    var list = (Array.isArray(doc.growth) && doc.growth.length && doc.growth) || props.ui.compareList || [props.ui.compareDoors || fallback];
    var key = list.join(",");
    var runs = useMemo(function () { return list.map(function (n) { return marginsAt(doc, n, doc.cv); }); }, [doc, key]);
    function setList(fn) { var l = list.slice(); fn(l); props.update(function (d) { d.growth = l; }, "Growth: door counts"); }
    var mc = null;
    doc.CG.forEach(function (g) { g.rows.forEach(function (r) { if (r.id === "mc") mc = r; }); });
    var biggest = Math.max.apply(null, list);
    function delta(a, b, fmt) {
      var d = b - a;
      if (Math.abs(d) < 0.005) return html`<span class="faint">no change</span>`;
      return html`<span class=${"strong " + (d > 0 ? "good" : "bad")}>${d > 0 ? "+" : "−"}${fmt(Math.abs(d))}</span>`;
    }
    return html`<div class="page">
      <${PageHead} kicker="What if" title="Margin as you grow" lead="The same packages and prices on a bigger (or smaller) portfolio. Per-door costs and yearly counts grow with doors. Salaried roles and flat software stay at today's level, which is where the gain comes from." />
      <section class="panel">
        <div class="panel-h"><h2>Compare today's ${fmtNum(today)} doors with up to three other sizes</h2>
          <${Info} plain=${true} label="What grows with doors" lines=${[
            "Grows: anything per door (PM comp, per-door software, AppFolio), turnover costs, and yearly counts of work orders, evictions, lease breaks, listings, guarantee claims and add-on sales.",
            "Stays: salaried roles, flat software and seats, and other yearly or monthly costs.",
            "Prices, fees and checkboxes stay as they are. Shown at " + VIEW_NAMES[doc.cv] + "."
          ]} />
        </div>
        <div class="panel-b growth-counts">
          ${list.map(function (n, i) {
            return html`<span key=${i} class="growth-count">
              <${Affix} id=${"compare-" + i} value=${n} step=${10} min=${1} suffix="doors" label=${"Door count " + (i + 1) + " to compare"}
                onChange=${function (v) { setList(function (l) { l[i] = Math.max(1, Math.round(v)); }); }} />
              ${list.length > 1 ? html`<button type="button" class="x" aria-label=${"Remove " + fmtNum(n) + " doors"} onClick=${function () { setList(function (l) { l.splice(i, 1); }); }}>×</button>` : null}
            </span>`;
          })}
          ${list.length < 3 ? html`<button type="button" class="btn sm" onClick=${function () { setList(function (l) { l.push(Math.round((Math.max.apply(null, l) * 2) / 10) * 10 || 500); }); }}>+ Add a door count</button>` : null}
        </div>
        <div class="table-wrap"><table class="compare growth-table">
          <thead><tr><th>Package</th><th>Today · <span class="door-n">${fmtNum(today)} doors</span></th>
            ${list.map(function (n, i) { return html`<th key=${i}><span class="door-n">${fmtNum(n)} doors</span></th>`; })}</tr></thead>
          <tbody>${TIERS.map(function (t) {
            var a = C.margins[t];
            return html`<tr key=${t}><td><b class="pkg-name">${TIER_NAMES[t]}</b></td>
              <td><div>${money(a.margin, 2)} · ${pct(a.marginPct)}</div><div class="small faint">cost ${money(a.cost, 2)} · ${money(a.portfolioMo * 12)}/yr</div></td>
              ${runs.map(function (r, i) {
                var b = r.margins[t];
                return html`<td key=${i}><div>${money(b.margin, 2)} · ${pct(b.marginPct)}</div>
                  <div class="small">${delta(a.marginPct, b.marginPct, function (x) { return x.toFixed(1) + " pts"; })} <span class="faint">· ${money(b.portfolioMo * 12)}/yr</span></div></td>`;
              })}</tr>`;
          })}</tbody>
        </table></div>
        <div class="panel-b" style=${{ paddingTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <p class="note">Each cell is margin per door per month and margin %. Under it: the change from today, and the yearly margin if every door were on that package. Staffing is held at today's level. Rough capacity: a PM handles 200–300 doors (PM pay is already per door, so it grows here), a maintenance coordinator about 500, and a process coordinator is effectively unlimited.</p>
          ${biggest > 500 && mc ? html`<p class="growth-flag">At ${fmtNum(biggest)} doors you'd likely need a second Maintenance coordinator (about ${money(cmo(mc, doc) * 12)}/yr), which isn't included above.</p>` : null}
        </div>
      </section>
    </div>`;
  }

  /* ------------------------------ acquisitions ------------------------------ */
  function Acquisitions(props) {
    var doc = props.doc, update = props.update, ui = props.ui, P = doc.pricing, G = doc.G;
    var deals = doc.acq || [];
    // Each visit to the page opens on the quick snapshot; the switch only lasts while you're on the page.
    var _av = useState("snap"), acqMode = _av[0], setAcqMode = _av[1];
    var deal = deals.find(function (x) { return x.id === ui.acqSel; }) || deals[0];
    function edit(fn, label) { update(function (d) { var x = d.acq.find(function (y) { return y.id === deal.id; }); if (x) fn(x); }, deal.name + ": " + label); }
    function add() {
      var nd = newDeal(doc);
      update(function (d) { d.acq.push(nd); }, "Added a deal");
      props.setUi(function (u) { u.acqSel = nd.id; });
    }
    if (!deal) {
      return html`<div class="page">
        <${PageHead} kicker="What if" title="Acquisitions" lead="Size up a book of business you're thinking about buying: enter what you know about it and see what it does to each package's margin, what those doors would earn, and how fast the deal pays back." />
        <section class="panel"><div class="panel-b" style=${{ paddingTop: "14px", display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-start" }}>
          <p class="note">No deals yet. Deals save with the open scenario, so a shared scenario shares its deals too.</p>
          <button type="button" class="btn primary" onClick=${add}>+ Add a deal</button>
        </div></section>
      </div>`;
    }
    var r = acquisitionImpact(doc, deal, doc.cv);
    var mixLeft = 100 - TIERS.reduce(function (s, t) { return s + (deal.mix[t] || 0); }, 0);
    function num(key, label, o) {
      o = o || {};
      var blank = o.rate && (deal[key] == null || deal[key] === "");
      var shown = blank ? dealCount(doc, deal, key) : deal[key] || 0;
      return html`<div class="frow acq-row" id=${"row-acq-" + key}>
        <label for=${"acq-" + key}>${label}</label>
        <div class="fctrl"><${Affix} id=${"acq-" + key} prefix=${o.prefix} suffix=${o.suffix} step=${o.step} min=${0} max=${o.max} label=${label}
          value=${Math.round(shown * 10) / 10} onChange=${function (v) { edit(function (x) { x[key] = o.max ? Math.min(o.max, v) : v; }, label); }} /></div>
        <div class="help">${o.help}${o.rate ? (blank ? html` <span class="faint">Using today's rate per door.</span>` : html` <button type="button" class="link tiny" onClick=${function () { edit(function (x) { x[key] = null; }, label + " back to today's rate"); }}>Use today's rate</button>`) : null}</div>
      </div>`;
    }
    var flagMC = r.doorsAfter > 500 && G.doors <= 500;
    var snap = acqMode === "snap";
    function setMode(m) { setAcqMode(m); }
    var modeSw = html`<div class="seg" role="group" aria-label="Acquisitions view">
      <button type="button" aria-pressed=${snap} onClick=${function () { setMode("snap"); }}>Quick snapshot</button>
      <button type="button" aria-pressed=${!snap} onClick=${function () { setMode("full"); }}>Full analysis</button>
    </div>`;
    /* The quick snapshot: what the book does to the margins and what it takes to run it. No price, payback or what the book earns. */
    var snapView = null;
    if (snap) {
      var A = r.afterDoc.G;
      var rough = function (n) { return fmtNum(Math.round(n)); };
      var pmLo = Math.ceil(r.doorsAfter / 300), pmHi = Math.ceil(r.doorsAfter / 200);
      snapView = html`<div class="acq-grid">
        <section class="panel">
          <div class="panel-h"><input type="text" class="txt acq-name" id="acq-name" aria-label="Deal name" value=${deal.name}
            onChange=${function (e) { var v = e.target.value; edit(function (x) { x.name = v; }, "renamed"); }} /></div>
          <div class="panel-b fieldset">
            ${num("doors", "Doors", { step: 5, help: "Units in the book." })}
            ${num("rent", "Average rent", { prefix: "$", step: 25, help: "Their average monthly rent." })}
            ${num("tenancy", "Average tenancy", { suffix: "yrs", step: 0.5, help: "How long their tenants stay." })}
            <div class="frow acq-row"><label>Package mix <span class="faint small">(share of their owners)</span></label>
              <div class="acq-mix">${TIERS.map(function (t) {
                return html`<label key=${t} class="acq-mix-t" for=${"acq-mix-" + t}><span class="small">${TIER_SHORT[t]}</span>
                  <${Affix} id=${"acq-mix-" + t} suffix="%" cls="w-sm" step=${5} min=${0} max=${100} label=${TIER_SHORT[t] + " share"} value=${deal.mix[t] || 0}
                    onChange=${function (v) { edit(function (x) { x.mix[t] = Math.min(100, v); }, TIER_SHORT[t] + " share"); }} /></label>`;
              })}</div>
              <div class=${"help" + (Math.abs(mixLeft) > 0.01 ? " warn" : "")}>${Math.abs(mixLeft) < 0.01 ? "Adds up to 100%." : "Adds up to " + (100 - mixLeft) + "%. The math scales it to 100%."}</div>
            </div>
            ${num("lost", "Churn", { suffix: "%", step: 5, max: 100, help: "Share of owners who leave in year one." })}
          </div>
          <div class="panel-b"><button type="button" class="link small danger-link" onClick=${function () {
            var id = deal.id;
            update(function (d) { d.acq = d.acq.filter(function (x) { return x.id !== id; }); }, "Deleted deal " + deal.name);
            props.setUi(function (u) { u.acqSel = null; });
          }}>Delete this deal</button></div>
        </section>
        <div class="acq-results">
          <section class="panel">
            <div class="panel-h"><h2>What it does to our margins</h2><span class="small muted">per door per month</span></div>
            <div class="table-wrap"><table class="compare">
              <thead><tr><th>Package</th><th>Cost today</th><th>Cost after</th><th>Margin today</th><th>Margin after</th><th>Change</th></tr></thead>
              <tbody>${TIERS.map(function (t) {
                var x = r.tiers[t], d = x.after.marginPct - x.today.marginPct;
                return html`<tr key=${t}><td><b>${TIER_NAMES[t]}</b></td>
                  <td>${money(x.today.cost, 2)}</td><td>${money(x.after.cost, 2)}</td>
                  <td>${pct(x.today.marginPct)}</td><td>${pct(x.after.marginPct)}</td>
                  <td class=${Math.abs(d) < 0.05 ? "faint" : d > 0 ? "good" : "bad"}>${Math.abs(d) < 0.05 ? "—" : (d > 0 ? "+" : "−") + Math.abs(d).toFixed(1) + " pts"}</td></tr>`;
              })}</tbody>
            </table></div>
            <p class="note" style=${{ padding: "0 14px 12px" }}>Your fixed costs (salaries, flat software, overhead) spread over more doors, so cost per door usually falls as the portfolio grows.</p>
          </section>
          <section class="panel">
            <div class="panel-h"><h2>What it takes</h2></div>
            <div class="panel-b acq-kpis">
              <div><span class="small muted">Doors after</span><b class="mono">${rough(r.doorsAfter)}</b><span class="tiny faint">${fmtNum(G.doors)} today + ${rough(r.kept)}</span></div>
              <div><span class="small muted">Work orders</span><b class="mono">${rough(A.wo)}/yr</b><span class="tiny faint">${rough(G.wo)} today</span></div>
              <div><span class="small muted">Evictions</span><b class="mono">${rough(A.evictions)}/yr</b><span class="tiny faint">${rough(G.evictions)} today</span></div>
              <div><span class="small muted">Active listings</span><b class="mono">${rough(A.listings)}</b><span class="tiny faint">${rough(G.listings)} today</span></div>
            </div>
            <p class="note" style=${{ padding: "0 14px 12px" }}>Rough capacity: a property manager handles 200–300 doors, so ${pmLo === pmHi ? pmLo : pmLo + " to " + pmHi} at ${rough(r.doorsAfter)} doors. A maintenance coordinator handles about 500.${flagMC ? html` <span class="warn">At this size you would likely need a second one.</span>` : ""}</p>
          </section>
        </div>
      </div>`;
    }
    return html`<div class="page">
      <${PageHead} kicker="What if" title="Acquisitions" lead=${snap ? "A quick look at what a book of business does to our margins and what it takes to run it. Shown at the headline cost view, with today's prices and package contents." : "Size up a book of business you're thinking about buying: what it does to each package's margin, what its doors would earn, and how fast the deal pays back. Shown at the headline cost view, with today's prices and package contents."}
        right=${html`<div class="toolbar">${modeSw}
          <select id="acq-pick" aria-label="Deal" value=${deal.id} onChange=${function (e) { var v = e.target.value; props.setUi(function (u) { u.acqSel = v; }); }}>
            ${deals.map(function (x) { return html`<option key=${x.id} value=${x.id}>${x.name}</option>`; })}
          </select>
          <button type="button" class="btn sm" onClick=${add}>+ Add a deal</button>
        </div>`} />

      ${snap ? snapView : html`<div class="acq-grid">
        <section class="panel">
          <div class="panel-h"><input type="text" class="txt acq-name" id="acq-name" aria-label="Deal name" value=${deal.name}
            onChange=${function (e) { var v = e.target.value; edit(function (x) { x.name = v; }, "renamed"); }} /></div>
          <div class="panel-b fieldset">
            <div class="sub-h acq-sub">The book</div>
            ${num("doors", "Doors", { step: 5, help: "Units in the book." })}
            ${num("rent", "Average rent", { prefix: "$", step: 25, help: "Their average monthly rent. Every % fee on their doors is figured on it." })}
            ${num("tenancy", "Average tenancy", { suffix: "yrs", step: 0.5, help: "How long their tenants stay. Sets leasing and renewal revenue on their doors." })}
            ${num("wo", "Work orders", { suffix: "/yr", step: 10, rate: true, help: "Their work orders a year." })}
            ${num("evictions", "Evictions", { suffix: "/yr", step: 1, rate: true, help: "Their evictions a year." })}
            ${num("listings", "Active listings", { step: 1, rate: true, help: "Their units listed for rent at a typical moment." })}
            ${num("comm", "Commercial units", { step: 1, help: "Billed at AppFolio's commercial rate." })}
            <div class="sub-h acq-sub">Where their owners land</div>
            <div class="frow acq-row"><label>Package mix <span class="faint small">(share of their owners)</span></label>
              <div class="acq-mix">${TIERS.map(function (t) {
                return html`<label key=${t} class="acq-mix-t" for=${"acq-mix-" + t}><span class="small">${TIER_SHORT[t]}</span>
                  <${Affix} id=${"acq-mix-" + t} suffix="%" cls="w-sm" step=${5} min=${0} max=${100} label=${TIER_SHORT[t] + " share"} value=${deal.mix[t] || 0}
                    onChange=${function (v) { edit(function (x) { x.mix[t] = Math.min(100, v); }, TIER_SHORT[t] + " share"); }} /></label>`;
              })}</div>
              <div class=${"help" + (Math.abs(mixLeft) > 0.01 ? " warn" : "")}>${Math.abs(mixLeft) < 0.01 ? "Adds up to 100%." : "Adds up to " + (100 - mixLeft) + "%. The math scales it to 100%."}</div>
            </div>
            ${num("lost", "Churn", { suffix: "%", step: 5, max: 100, help: "Share of owners who leave in year one. Their doors drop out of everything here." })}
            <div class="sub-h acq-sub">The deal</div>
            ${num("price", "Purchase price", { prefix: "$", step: 1000, help: "What you pay for the book." })}
            ${num("onetime", "One-time transition cost", { prefix: "$", step: 500, help: "Onboarding, data migration, signage, legal: costs you pay once." })}
            ${num("staffYr", "Added staff or overhead", { prefix: "$", suffix: "/yr", step: 1000, help: "New hires or overhead the bigger portfolio needs. Every package carries it as a direct cost." })}
          </div>
          <div class="panel-b"><button type="button" class="link small danger-link" onClick=${function () {
            var id = deal.id;
            update(function (d) { d.acq = d.acq.filter(function (x) { return x.id !== id; }); }, "Deleted deal " + deal.name);
            props.setUi(function (u) { u.acqSel = null; });
          }}>Delete this deal</button></div>
        </section>

        <div class="acq-results">
          <section class="panel">
            <div class="panel-h"><h2>The deal at a glance</h2><span class="small muted">${VIEW_NAMES[doc.cv]}</span></div>
            <div class="panel-b acq-kpis">
              <div><span class="small muted">Doors after</span><b class="mono">${fmtNum(Math.round(r.doorsAfter))}</b><span class="tiny faint">${fmtNum(G.doors)} today + ${fmtNum(Math.round(r.kept))} kept</span></div>
              <div><span class="small muted">Book earns a year</span><b class=${"mono " + (r.bookYr < 0 ? "bad" : "good")}>${money(r.bookYr)}</b><span class="tiny faint">margin on its ${fmtNum(Math.round(r.kept))} doors</span></div>
              <div><span class="small muted">Payback</span><b class="mono">${r.upfront <= 0 ? "—" : r.paybackMo == null ? "never" : fmtNum(Math.round(r.paybackMo * 10) / 10) + " mo"}</b><span class="tiny faint">${money(r.upfront)} up front</span></div>
              <div><span class="small muted">First-year net</span><b class=${"mono " + (r.firstYearNet < 0 ? "bad" : "good")}>${money(r.firstYearNet)}</b><span class="tiny faint">book margin less up-front cost</span></div>
            </div>
          </section>
          <section class="panel">
            <div class="panel-h"><h2>Each package, today vs. after</h2><${Info} plain=${true} lines=${[
              "Today and After are margin per door per month for your current doors. After spreads your fixed costs (salaries, flat software, overhead) over more doors, and adds the book's work orders, evictions and listings.",
              "Book door is margin per door on the acquired doors, at their rent and tenancy.",
              "Book per year is that margin × the doors expected on each package × 12."
            ]} /></div>
            <div class="table-wrap"><table class="compare">
              <thead><tr><th>Package</th><th>Today</th><th>After</th><th>Change</th><th>Book door</th><th>Book per year</th></tr></thead>
              <tbody>${TIERS.map(function (t) {
                var x = r.tiers[t], d = x.after.marginPct - x.today.marginPct;
                return html`<tr key=${t}><td><b>${TIER_NAMES[t]}</b></td>
                  <td>${money(x.today.margin, 2)}<div class="tiny faint">${pct(x.today.marginPct)}</div></td>
                  <td>${money(x.after.margin, 2)}<div class="tiny faint">${pct(x.after.marginPct)}</div></td>
                  <td class=${Math.abs(d) < 0.05 ? "faint" : d > 0 ? "good" : "bad"}>${Math.abs(d) < 0.05 ? "—" : (d > 0 ? "+" : "−") + Math.abs(d).toFixed(1) + " pts"}</td>
                  <td class=${verdict(x.book, P.targetPct).cls}>${money(x.book.margin, 2)}<div class="tiny faint">${pct(x.book.marginPct)}</div></td>
                  <td>${money(x.bookYr)}<div class="tiny faint">${fmtNum(Math.round(x.doors * 10) / 10)} doors</div></td></tr>`;
              })}
              <tr class="total"><td>Book total</td><td></td><td></td><td></td><td></td><td>${money(r.bookYr)}<div class="tiny faint">${fmtNum(Math.round(r.kept * 10) / 10)} doors</div></td></tr></tbody>
            </table></div>
          </section>
          <p class="note">Prices, package contents and add-ons are today's. ${flagMC ? html`<span class="warn">At ${fmtNum(Math.round(r.doorsAfter))} doors you'd likely need a second maintenance coordinator. Put that cost in "Added staff or overhead" if so.</span>` : "Staffing beyond what you enter in Added staff or overhead stays at today's level."}</p>
        </div>
      </div>`}
    </div>`;
  }

  /* ------------------------------ scenarios (saved on claude.ai) ------------------------------ */
  /*
   * Where scenarios live in the artifact's db:
   *   data/users/<id>/<scenarioId>   private: only that person sees it (the platform hides it even from the owner)
   *   shared/<scenarioId>            shared: everyone with access sees it; only its creator edits it (the page enforces this)
   *   official/default               the official numbers: everyone reads, only the artifact owner writes (a db rule)
   * Each body is { name, by, savedAt, doc }. Loaded docs always go through normalizeDoc, so tool updates migrate them.
   */
  var KIND_LABEL = { private: "Private", shared: "Shared", official: "Official", local: "Not saved", new: "Not saved" };
  function newId() { return "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function ago(t) {
    if (!t) return "";
    var s = Math.round((Date.now() - t) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.round(s / 60) + " min ago";
    if (s < 86400) return Math.round(s / 3600) + " hr ago";
    return new Date(t).toLocaleDateString();
  }
  function scenRef(cloud, s) {
    if (!cloud.db) return null;
    if (s.kind === "private" && cloud.uid) return cloud.db.collection("data/users/" + cloud.uid).doc(s.id);
    if (s.kind === "shared") return cloud.db.doc("shared/" + s.id);
    if (s.kind === "official") return cloud.db.doc("official/default");
    return null;
  }
  /* Can this viewer save over this scenario, or only save a copy? */
  function canWrite(cloud, s) {
    if (!cloud.db) return false;
    if (s.kind === "private") return !!cloud.uid;
    if (s.kind === "shared") return (s.by || null) === (cloud.uid || null);
    if (s.kind === "official") return cloud.owner;
    return false;
  }
  function byName(cloud, names, by) {
    if (by && by === cloud.uid) return "you";
    return (by && names[by]) || "someone";
  }

  function ScenarioMenu(props) {
    var cloud = props.cloud, scen = props.scen, lists = props.lists, names = props.names;
    var _m = useState(null), mode = _m[0], setMode = _m[1];
    var _n = useState(""), name = _n[0], setName = _n[1];
    var _v = useState("private"), vis = _v[0], setVis = _v[1];
    var mine = canWrite(cloud, scen) && scen.kind !== "official";
    function item(s, kind) {
      var on = scen.kind === kind && scen.id === s.id;
      return html`<li key=${kind + s.id}><button type="button" class=${"scen-item" + (on ? " on" : "")} onClick=${function () { props.open(kind, s); }}>
        <span class="scen-name">${s.name || "Untitled"}</span>
        <span class="tiny faint">${kind === "shared" ? "by " + byName(cloud, names, s.by) + " · " : ""}${ago(s.savedAt)}</span>
      </button></li>`;
    }
    if (!cloud.db) {
      return html`<div class="menu scen-menu" role="dialog" aria-label="Scenarios">
        <b class="small">Saving isn't available here</b>
        <p class="small muted">Scenarios save to claude.ai when you open the published Planner signed in to Claude. Here, edits stay in this browser only.</p>
      </div>`;
    }
    return html`<div class="menu scen-menu" role="dialog" aria-label="Scenarios">
      <div class="scen-current">
        <div class="row-b"><b>${scen.name}</b><span class=${"tag " + (scen.kind === "shared" ? "link" : "")}>${KIND_LABEL[scen.kind]}</span></div>
        <div class="tiny faint">${scen.kind === "shared" ? "By " + byName(cloud, names, scen.by) + ". " : ""}${props.dirty ? "Unsaved changes." : scen.savedAt ? "Saved " + ago(scen.savedAt) + "." : ""}</div>
        ${mode === "saveas" || mode === "rename" ? html`<form class="scen-form" onSubmit=${function (e) {
          e.preventDefault();
          if (!name.trim()) return;
          if (mode === "saveas") props.saveAs(name.trim(), vis); else props.rename(name.trim());
          setMode(null);
        }}>
          <input type="text" class="txt" id="scen-name" aria-label="Scenario name" value=${name} placeholder="Scenario name" onChange=${function (e) { setName(e.target.value); }} />
          ${mode === "saveas" ? html`<div class="scen-vis">
            <label for="vis-p"><input type="radio" id="vis-p" name="vis" checked=${vis === "private"} disabled=${!cloud.uid} onChange=${function () { setVis("private"); }} /> Private, only you</label>
            <label for="vis-s"><input type="radio" id="vis-s" name="vis" checked=${vis === "shared"} onChange=${function () { setVis("shared"); }} /> Shared with everyone</label>
          </div>` : null}
          <div class="row-b"><button type="submit" class="btn primary sm">${mode === "saveas" ? "Save" : "Rename"}</button>
            <button type="button" class="link small" onClick=${function () { setMode(null); }}>Cancel</button></div>
        </form>`
        : mode === "delete" ? html`<div class="scen-form"><p class="small">Delete "${scen.name}" for good? ${scen.kind === "shared" ? "Everyone loses it." : ""}</p>
          <div class="row-b"><button type="button" class="btn danger sm" onClick=${function () { props.remove(); setMode(null); }}>Delete</button>
            <button type="button" class="link small" onClick=${function () { setMode(null); }}>Cancel</button></div></div>`
        : html`<div class="scen-actions">
          ${canWrite(cloud, scen) ? html`<button type="button" class="btn primary sm" disabled=${!props.dirty || props.saving} onClick=${props.save}>${props.saving ? "Saving…" : "Save"}</button>` : null}
          <button type="button" class="btn sm" onClick=${function () { setName(scen.kind === "local" || scen.kind === "new" ? "" : scen.name + " (copy)"); setVis(cloud.uid ? "private" : "shared"); setMode("saveas"); }}>${canWrite(cloud, scen) || scen.kind === "local" || scen.kind === "new" ? "Save as…" : "Save a copy…"}</button>
          ${mine ? html`<button type="button" class="btn sm" onClick=${function () { setName(scen.name); setMode("rename"); }}>Rename</button>` : null}
          ${mine && scen.kind === "private" ? html`<button type="button" class="btn sm" onClick=${function () { props.move("shared"); }}>Share</button>` : null}
          ${mine && scen.kind === "shared" && cloud.uid ? html`<button type="button" class="btn sm" onClick=${function () { props.move("private"); }}>Make private</button>` : null}
          ${mine ? html`<button type="button" class="btn sm danger" onClick=${function () { setMode("delete"); }}>Delete</button>` : null}
          ${cloud.owner && scen.kind !== "official" ? html`<button type="button" class="btn sm" onClick=${props.makeOfficial} title="Everyone's new scenarios start from these numbers">Set as official numbers</button>` : null}
        </div>`}
        ${scen.kind === "shared" && !canWrite(cloud, scen) ? html`<p class="tiny faint">Only its creator can change a shared scenario. Save a copy to make it yours.</p>` : null}
        ${scen.kind === "official" && !cloud.owner ? html`<p class="tiny faint">Only the owner can change the official numbers. Save a copy to make your own.</p>` : null}
      </div>
      <button type="button" class="btn sm" onClick=${props.startNew}>+ New scenario from the official numbers</button>
      <div class="scen-group"><div class="sub-h">Official numbers</div>
        <ul>${lists.official ? item(lists.official, "official") : html`<li class="tiny faint">${cloud.owner ? "Not set yet. Open your best scenario and use Set as official numbers." : "Not set yet."}</li>`}</ul></div>
      <div class="scen-group"><div class="sub-h">My scenarios · private</div>
        <ul>${!cloud.uid ? html`<li class="tiny faint">Private scenarios aren't available for your account on this page. Use shared ones.</li>`
          : lists.mine.length ? lists.mine.map(function (s) { return item(s, "private"); }) : html`<li class="tiny faint">None yet.</li>`}</ul></div>
      <div class="scen-group"><div class="sub-h">Shared</div>
        <ul>${lists.shared.length ? lists.shared.map(function (s) { return item(s, "shared"); }) : html`<li class="tiny faint">Nothing shared yet.</li>`}</ul></div>
      <button type="button" class="link small" onClick=${props.compare}>Compare scenarios →</button>
    </div>`;
  }

  /* Up to three scenarios side by side, at one cost view, with what's different between them, grouped by area. */
  function diffGroups(a, b) {
    var groups = [], cur = null;
    function open(id, title) { cur = { id: id, title: title, items: [] }; groups.push(cur); }
    function put(s) { cur.items.push(s); }
    function num(label, x, y, fmt) { if (Math.abs((x || 0) - (y || 0)) > 1e-9) put(label + ": " + fmt(x || 0) + " → " + fmt(y || 0)); }
    // One line per item: "Quo: off for Minimum, Plus" rather than a line for each tier.
    function tiersLine(name, fa, fb) {
      var on = [], off = [];
      TIERS.forEach(function (t) { if (!!fa[t] !== !!fb[t]) (fb[t] ? on : off).push(TIER_SHORT[t]); });
      if (!on.length && !off.length) return;
      put(name + ": " + (off.length ? "off for " + off.join(", ") : "") + (on.length && off.length ? "; " : "") + (on.length ? "on for " + on.join(", ") : ""));
    }
    open("prices", "Prices");
    TIERS.forEach(function (t) {
      var pa = a.pricing.tiers[t], pb = b.pricing.tiers[t];
      num(TIER_SHORT[t] + " monthly fee", pa.monthlyPct, pb.monthlyPct, function (v) { return pct(v, 2); });
      num(TIER_SHORT[t] + " leasing fee", pa.leasePct, pb.leasePct, function (v) { return pct(v, 0); });
      num(TIER_SHORT[t] + " renewal fee", pa.renewal, pb.renewal, function (v) { return money(v); });
    });
    open("portfolio", "Portfolio and settings");
    FIELD_GROUPS.forEach(function (g) { g.fields.forEach(function (f) {
      if (f.get) num(f.label, f.get(a), f.get(b), fmtNum);
      if (f.toggle && f.toggle(a) !== f.toggle(b)) put(f.label + ": " + (f.toggle(a) ? "on" : "off") + " → " + (f.toggle(b) ? "on" : "off"));
    }); });
    var ca = activeTemplate(a), cb = activeTemplate(b);
    var rowsA = {}, rowsB = {};
    forEachCostRow(a, function (r) { rowsA[r.id] = r; });
    forEachCostRow(b, function (r) { rowsB[r.id] = r; });
    open("costs", "Cost lines");
    Object.keys(rowsB).forEach(function (id) {
      var ra = rowsA[id], rb = rowsB[id], nm = rowName(b, rb);
      if (!ra) { put("Added: " + nm); return; }
      var va = a.vl[id] != null ? a.vl[id] : ra.v, vb = b.vl[id] != null ? b.vl[id] : rb.v;
      if (va !== vb) put(nm + ": " + money(va || 0, 2) + " → " + money(vb || 0, 2));
      tiersLine(nm, ca.ck[id] || {}, cb.ck[id] || {});
    });
    Object.keys(rowsA).forEach(function (id) { if (!rowsB[id]) put("Removed: " + rowName(a, rowsA[id])); });
    open("services", "Services");
    scopeIds(b).forEach(function (id) { tiersLine(b.MASTER[id].n, ca.psk[id] || {}, cb.psk[id] || {}); });
    open("addons", "Add-ons and fees");
    var adA = {}; a.addons.forEach(function (x) { adA[x.id] = x; });
    b.addons.forEach(function (x) {
      var y = adA[x.id];
      if (!y) { put("Added " + (x.kind === "bundle" ? "package" : x.kind === "addon" ? "add-on" : "fee") + ": " + x.name); return; }
      if ((y.price || 0) !== (x.price || 0)) put(x.name + " price: " + money(y.price || 0) + " → " + money(x.price || 0));
      if ((y.cost || 0) !== (x.cost || 0)) put(x.name + " cost: " + money(y.cost || 0) + " → " + money(x.cost || 0));
      if ((y.uptake || 0) !== (x.uptake || 0)) put(x.name + " owners who buy: " + pct(y.uptake || 0, 0) + " → " + pct(x.uptake || 0, 0));
      if ((y.amount || 0) !== (x.amount || 0)) put(x.name + " how often: " + fmtNum(y.amount || 0) + " → " + fmtNum(x.amount || 0));
      if ((y.freq || 0) !== (x.freq || 0) || (y.per || "door_yr") !== (x.per || "door_yr")) put(x.name + " how often: " + fmtNum(y.freq || 0) + " " + ADDON_PER[y.per || "door_yr"] + " → " + fmtNum(x.freq || 0) + " " + ADDON_PER[x.per || "door_yr"]);
      var chg = TIERS.filter(function (t) { return y.tiers[t] !== x.tiers[t]; });
      if (chg.length) put(x.name + ": " + chg.map(function (t) { return TIER_SHORT[t] + " " + y.tiers[t] + " → " + x.tiers[t]; }).join(", "));
    });
    a.addons.forEach(function (y) { if (!b.addons.some(function (x) { return x.id === y.id; })) put("Removed: " + y.name); });
    return groups.filter(function (g) { return g.items.length; });
  }

  /* One compared scenario's differences: the whole panel collapses, and so does each area inside it. */
  function CompareDiff(props) {
    var c = props.col, first = props.first, ui = props.ui, setUi = props.setUi;
    var groups = diffGroups(first.doc, c.doc);
    var total = groups.reduce(function (s, g) { return s + g.items.length; }, 0);
    var shut = !!ui.pfShut["cmp:" + c.key];
    var openMap = ui.cmpOpen || {};
    function isOpen(g) { var v = openMap[c.key + ":" + g.id]; return v == null ? g.items.length <= 8 : v; }
    function setAll(on) { setUi(function (u) { u.cmpOpen = u.cmpOpen || {}; groups.forEach(function (g) { u.cmpOpen[c.key + ":" + g.id] = on; }); }); }
    return html`<section class="panel">
      <div class="panel-h">
        <h2 class="panel-h-btn-wrap"><button type="button" class="panel-h-btn" aria-expanded=${!shut} onClick=${function () { setUi(function (u) { u.pfShut["cmp:" + c.key] = !shut; }); }}>
          <span class="caret-i" aria-hidden="true">${shut ? "▸" : "▾"}</span><span class="sec-name">${c.label}</span></button></h2>
        <span class="small muted">vs ${first.label} · ${total ? total + " difference" + (total === 1 ? "" : "s") + " in " + groups.length + " area" + (groups.length === 1 ? "" : "s") : "same numbers"}</span>
      </div>
      ${shut ? null : total ? html`<div class="panel-b">
        ${groups.length > 1 ? html`<div class="cmp-all small"><button type="button" class="link" onClick=${function () { setAll(true); }}>Expand all</button> · <button type="button" class="link" onClick=${function () { setAll(false); }}>Collapse all</button></div>` : null}
        ${groups.map(function (g) {
          var on = isOpen(g);
          return html`<div key=${g.id} class="cmp-g">
            <button type="button" class="cmp-gh" aria-expanded=${on} onClick=${function () { setUi(function (u) { u.cmpOpen = u.cmpOpen || {}; u.cmpOpen[c.key + ":" + g.id] = !on; }); }}>
              <span class="caret-i" aria-hidden="true">${on ? "▾" : "▸"}</span><b>${g.title}</b><span class="faint small">${g.items.length}</span></button>
            ${on ? html`<ul class="diff-list">${g.items.map(function (x, i) { return html`<li key=${i}>${x}</li>`; })}</ul>` : null}
          </div>`;
        })}
      </div>` : html`<p class="note" style=${{ padding: "0 14px 14px" }}>Same numbers.</p>`}
    </section>`;
  }

  function Compare(props) {
    var doc = props.doc, cloud = props.cloud, lists = props.lists, names = props.names;
    var options = [{ key: "current", label: "Open now: " + props.scen.name + (props.dirty ? " (unsaved)" : ""), doc: doc }];
    if (lists.official) options.push({ key: "official", label: "Official numbers", raw: lists.official.doc });
    lists.mine.forEach(function (s) { options.push({ key: "p:" + s.id, label: s.name + " · private", raw: s.doc }); });
    lists.shared.forEach(function (s) { options.push({ key: "s:" + s.id, label: s.name + " · shared by " + byName(cloud, names, s.by), raw: s.doc }); });
    // The picks are saved with the open scenario (doc.cmp), so they come back after a refresh.
    var picks = ((Array.isArray(doc.cmp) && doc.cmp) || ["current", lists.official ? "official" : null]).filter(function (k) { return k && options.some(function (o) { return o.key === k; }); });
    if (!picks.length) picks = ["current"];
    var view = doc.cv;
    var cols = picks.map(function (k) {
      var o = options.find(function (x) { return x.key === k; });
      var d = o.doc || normalizeDoc(o.raw);
      var c = tierCost(d, view), m = {};
      TIERS.forEach(function (t) { m[t] = tierMargin(d, t, c.perDoor[t], view); });
      return { key: k, label: o.label, doc: d, m: m };
    });
    function setPicks(p) { props.update(function (d) { d.cmp = p; }, "Compare: picked scenarios"); }
    function setPick(i, k) { var p = picks.slice(); if (k) p[i] = k; else p.splice(i, 1); setPicks(p); }
    function sells(d, t) { var p = d.pricing.tiers[t]; return p.monthlyPct > 0 || p.leasePct > 0 || p.renewal > 0; }
    // [label, shown value, number, +1 when higher is better for Raynor / -1 when lower is better]
    var rowsDef = [
      ["Revenue / door / mo", function (m) { return money(m.revenue, 2); }, function (m) { return m.revenue; }, 1],
      ["Cost / door / mo", function (m) { return money(m.cost, 2); }, function (m) { return m.cost; }, -1],
      ["Margin / door / mo", function (m) { return money(m.margin, 2); }, function (m) { return m.margin; }, 1],
      ["Margin %", function (m) { return pct(m.marginPct); }, function (m) { return m.marginPct; }, 1],
      ["Margin / yr, all doors", function (m) { return money(m.portfolioMo * 12); }, function (m) { return m.portfolioMo * 12; }, 1]
    ];
    return html`<div class="page">
      <${PageHead} kicker="Scenarios" title="Compare scenarios" lead=${"Up to three scenarios side by side at " + VIEW_NAMES[view] + " (change it in the Live margin panel). On each package, green marks the scenario that's ahead for Raynor. Under the table, everything that differs from the first one."} />
      <section class="panel">
        <div class="panel-b compare-picks">
          ${picks.map(function (k, i) {
            return html`<span key=${i} class="growth-count"><select id=${"cmp-" + i} aria-label=${"Scenario " + (i + 1)} value=${k} onChange=${function (e) { setPick(i, e.target.value); }}>
              ${options.map(function (o) { return html`<option key=${o.key} value=${o.key}>${o.label}</option>`; })}
            </select>${picks.length > 1 ? html`<button type="button" class="x" aria-label="Remove from comparison" onClick=${function () { setPick(i, null); }}>×</button>` : null}</span>`;
          })}
          ${picks.length < 3 && options.length > picks.length ? html`<button type="button" class="btn sm" onClick=${function () {
            var next = options.find(function (o) { return picks.indexOf(o.key) < 0; });
            setPicks(picks.concat([next.key]));
          }}>+ Add a scenario</button>` : null}
          ${!cloud.db ? html`<span class="small muted">Saved scenarios show up here on the published Planner.</span>` : null}
        </div>
        <div class="table-wrap"><table class="compare">
          <thead><tr><th></th>${cols.map(function (c) { return html`<th key=${c.key} colspan="3">${c.label}</th>`; })}</tr>
            <tr><th></th>${cols.map(function (c) { return TIERS.map(function (t) { return html`<th key=${c.key + t} class="small cmp-pkg">${TIER_SHORT[t]}</th>`; }); })}</tr></thead>
          <tbody>${rowsDef.map(function (r) {
            return html`<tr key=${r[0]} class=${r[0].indexOf("Margin") === 0 ? "total" : ""}><td>${r[0]}</td>
              ${cols.map(function (c, ci) {
                return TIERS.map(function (t) {
                  var v = c.m[t], cls = "";
                  // Green marks whichever scenario is ahead for Raynor on this package (higher revenue and margin, lower cost).
                  // Packages a scenario doesn't sell are greyed out and left out of the comparison.
                  if (!sells(c.doc, t)) cls = "faint";
                  else if (cols.length > 1) {
                    var vals = cols.filter(function (x) { return sells(x.doc, t); }).map(function (x) { return Math.round(r[2](x.m[t]) * 100) * r[3]; });
                    var best = Math.max.apply(null, vals), mine = Math.round(r[2](v) * 100) * r[3];
                    if (vals.length > 1 && mine === best && vals.some(function (x) { return x !== best; })) cls = "good";
                  }
                  return html`<td key=${c.key + t} class=${cls + (t === "min" && ci ? " colstart" : "")}>${r[1](v)}</td>`;
                });
              })}</tr>`;
          })}</tbody>
        </table></div>
      </section>
      ${cols.slice(1).map(function (c) { return html`<${CompareDiff} key=${c.key} col=${c} first=${cols[0]} ui=${props.ui} setUi=${props.setUi} />`; })}
    </div>`;
  }

  /* ------------------------------ app ------------------------------ */
  function App() {
    var init = useMemo(load, []);
    var _d = useState(init.doc), doc = _d[0], setDoc = _d[1];
    var docRef = useRef(init.doc);
    var _s = useState(init.source), source = _s[0], setSource = _s[1];
    var _u = useState(loadUi), ui = _u[0], setUiState = _u[1];
    var _h = useState([]), hist = _h[0], setHist = _h[1];
    var _m = useState(null), msg = _m[0], setMsg = _m[1];
    var _j = useState(null), jsonOut = _j[0], setJsonOut = _j[1];
    var _r = useState(false), armReset = _r[0], setArmReset = _r[1];
    var _o = useState(false), menu = _o[0], setMenu = _o[1];
    var _f = useState(null), pendingField = _f[0], setPendingField = _f[1];
    var _n = useState(0), seen = _n[0], setSeen = _n[1];
    var _sc = useState(init.scen || { kind: "local", id: null, name: "My numbers", by: null, savedAt: null }), scen = _sc[0], setScen = _sc[1];
    var _dt = useState(init.scen ? !!init.dirty : true), dirty = _dt[0], setDirty = _dt[1];
    var _cl = useState({ db: null, user: null, uid: null, owner: false, ready: false }), cloud = _cl[0], setCloud = _cl[1];
    var _ls = useState({ mine: [], shared: [], official: null }), lists = _ls[0], setLists = _ls[1];
    var _nm = useState({}), names = _nm[0], setNames = _nm[1];
    var _sv = useState(false), saving = _sv[0], setSaving = _sv[1];
    var _pd = useState(null), pending = _pd[0], setPending = _pd[1];
    var _nw = useState(null), newer = _nw[0], setNewer = _nw[1];
    var scenRefState = useRef(scen); scenRefState.current = scen;
    var dirtyRef = useRef(dirty); dirtyRef.current = dirty;

    // Connect to claude.ai storage. Absent (a local copy, signed out): the page keeps working in this browser only.
    useEffect(function () {
      if (!window.claude || !window.claude.use) return;
      Promise.all([window.claude.use("db"), window.claude.use("user")]).then(function (r) {
        var db = r[0], user = r[1];
        if (!db) return;
        Promise.all([user ? user.id() : null, user ? user.isOwner() : false]).then(function (x) {
          setCloud({ db: db, user: user, uid: x[0], owner: !!x[1], ready: true });
        });
      });
    }, []);
    // Live lists of the scenarios this person can see. Subscribed once per connection.
    useEffect(function () {
      if (!cloud.db) return;
      var db = cloud.db, offs = [];
      function rows(snap) { return snap.docs.map(function (d) { var b = d.data() || {}; return { id: d.id, name: b.name, by: b.by || null, savedAt: b.savedAt || 0, doc: b.doc }; })
        .filter(function (x) { return x.doc; }).sort(function (a, b) { return (b.savedAt || 0) - (a.savedAt || 0); }); }
      function fail(e) { setMsg({ kind: "bad", text: "Couldn't load saved scenarios (" + (e && e.code) + "). Your edits still save in this browser." }); }
      if (cloud.uid) offs.push(db.collection("data/users/" + cloud.uid).onSnapshot(function (snap) { setLists(function (l) { return Object.assign({}, l, { mine: rows(snap) }); }); }, fail));
      offs.push(db.collection("shared").onSnapshot(function (snap) { setLists(function (l) { return Object.assign({}, l, { shared: rows(snap) }); }); }, fail));
      offs.push(db.doc("official/default").onSnapshot(function (d) {
        var b = d.exists ? d.data() : null;
        setLists(function (l) { return Object.assign({}, l, { official: b && b.doc ? { id: "default", name: "Official numbers", by: b.by || null, savedAt: b.savedAt || 0, doc: b.doc } : null }); });
      }, fail));
      return function () { offs.forEach(function (f) { f(); }); };
    }, [cloud.ready, cloud.uid]);
    // Names for whoever made the shared scenarios (resolved for display only, never stored).
    var sharedBy = lists.shared.map(function (x) { return x.by; }).concat(lists.official ? [lists.official.by] : []).filter(Boolean);
    useEffect(function () {
      if (!cloud.user || !sharedBy.length) return;
      cloud.user.profiles(sharedBy).then(function (ps) { var n = {}; Object.keys(ps).forEach(function (k) { n[k] = ps[k].name; }); setNames(n); });
    }, [cloud.user, sharedBy.join(",")]);
    // Someone saved a newer version of the scenario that's open: load it, or offer it if there are unsaved edits here.
    useEffect(function () {
      var cur = scenRefState.current, list = cur.kind === "private" ? lists.mine : cur.kind === "shared" ? lists.shared : cur.kind === "official" && lists.official ? [lists.official] : [];
      var hit = list.find(function (x) { return x.id === (cur.kind === "official" ? "default" : cur.id); });
      if (!hit || !(hit.savedAt > (cur.savedAt || 0) + 1)) return;
      if (dirtyRef.current) { setNewer(hit); return; }
      loadScenario(cur.kind, hit);
      setMsg({ kind: "good", text: "Loaded the latest saved version of " + (hit.name || "this scenario") + "." });
    }, [lists]);
    // Esc deselects a row; Cmd/Ctrl+S saves.
    useEffect(function () {
      function key(e) {
        if (e.key === "Escape" && !menu) setUi(function (u) { u.sel = null; });
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); if (canWrite(cloud, scen) && dirty) save(); }
      }
      document.addEventListener("keydown", key);
      return function () { document.removeEventListener("keydown", key); };
    });

    // Clicking a row should show its details even if that box or the whole panel was tucked away.
    useEffect(function () {
      if (ui.sel && (ui.railHidden || ui.railShut.details)) setUi(function (u) { u.railHidden = false; u.railShut.details = false; });
    }, [ui.sel && ui.sel.id]);
    useEffect(function () { if (menu === "activity") setSeen(hist.length); }, [menu, hist.length]);
    useEffect(function () { try { localStorage.setItem(STORE, JSON.stringify({ doc: doc, source: source, scen: scen, dirty: dirty })); } catch (e) {} }, [doc, source, scen, dirty]);
    useEffect(function () {
      try { var s = clone(ui); delete s.sel; localStorage.setItem(UI_STORE, JSON.stringify(s)); } catch (e) {}
    }, [ui]);
    useEffect(function () { try { if (location.hash.slice(1) !== ui.page) history.replaceState(null, "", "#" + ui.page); } catch (e) {} }, [ui.page]);
    useEffect(function () {
      if (!menu) return;
      function close(e) { if (!e.target.closest(".menu-wrap")) setMenu(false); }
      function esc(e) { if (e.key === "Escape") setMenu(false); }
      document.addEventListener("mousedown", close);
      document.addEventListener("keydown", esc);
      return function () { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
    }, [menu]);
    useEffect(function () {
      if (!pendingField) return;
      var el = document.getElementById(pendingField), row = document.getElementById("row-" + pendingField);
      if (el) { el.scrollIntoView({ block: "center" }); el.focus({ preventScroll: true }); }
      if (row) { row.classList.remove("flash"); void row.offsetWidth; row.classList.add("flash"); }
      setPendingField(null);
    }, [pendingField, ui.page]);

    /* Every edit goes through here: it records what changed and how each tier's margin moved, so it can be undone. */
    function update(fn, label) {
      var prev = docRef.current, next = clone(prev);
      fn(next);
      docRef.current = next;
      setDoc(next);
      setDirty(true);
      var now = Date.now();
      label = label || "Edit";
      setHist(function (hs) {
        var last = hs[0], merge = last && last.label === label && now - last.at < 2500;
        var base = merge ? last.before : prev;
        return [{ label: label, before: base, at: now, view: next.cv, deltas: deltasBetween(base, next) }].concat(merge ? hs.slice(1) : hs).slice(0, 40);
      });
    }
    function undo() { restore(0); }
    /* Roll back entry i and everything after it. */
    function restore(i) {
      if (!hist[i]) return;
      docRef.current = hist[i].before;
      setDoc(hist[i].before);
      setHist(hist.slice(i + 1));
      setDirty(true);
      setSeen(function (n) { return Math.min(n, hist.length - i - 1); });
    }
    function replaceDoc(d, src, text) {
      docRef.current = d; setDoc(d); setSource(src); setHist([]); setDirty(true);
      setMsg({ kind: "good", text: text });
    }

    /* ---------- scenario actions. Writes happen only on a click, never on load. ---------- */
    function scenBody(name, by) { return { name: name, by: by || null, savedAt: Date.now(), doc: docRef.current }; }
    function fail(what) { return function (e) { setSaving(false); setMsg({ kind: "bad", text: "Couldn't " + what + " (" + ((e && e.code) || "error") + "). Nothing was lost: your edits are still here and in this browser." }); }; }
    function save() {
      var ref = scenRef(cloud, scen);
      if (!ref || !canWrite(cloud, scen) || saving) return;
      var b = scenBody(scen.kind === "official" ? "Official numbers" : scen.name, scen.kind === "official" ? cloud.uid : scen.by);
      setSaving(true);
      ref.set(b).then(function () { setSaving(false); setDirty(false); setNewer(null); setScen(Object.assign({}, scen, { savedAt: b.savedAt })); }, fail("save"));
    }
    function saveAs(name, vis) {
      var s2 = { kind: vis === "private" && cloud.uid ? "private" : "shared", id: newId(), name: name, by: cloud.uid || null, savedAt: null };
      var b = scenBody(name, s2.by);
      setSaving(true);
      scenRef(cloud, s2).set(b).then(function () {
        setSaving(false); s2.savedAt = b.savedAt; setScen(s2); setDirty(false); setNewer(null); setSource("Scenario: " + name); setMenu(false);
        setMsg({ kind: "good", text: "Saved " + name + (s2.kind === "shared" ? ". Everyone with access can open it now." : ". Only you can see it.") });
      }, fail("save"));
    }
    function rename(name) {
      scenRef(cloud, scen).update({ name: name }).then(function () { setScen(Object.assign({}, scen, { name: name })); setSource("Scenario: " + name); }, fail("rename"));
    }
    function move(to) {
      var s2 = Object.assign({}, scen, { kind: to }), oldRef = scenRef(cloud, scen);
      var b = scenBody(scen.name, scen.by);
      scenRef(cloud, s2).set(b).then(function () { return oldRef.delete(); }).then(function () {
        s2.savedAt = b.savedAt; setScen(s2); setDirty(false);
        setMsg({ kind: "good", text: to === "shared" ? scen.name + " is shared. Everyone with access sees it in their Shared list." : scen.name + " is private again." });
      }, fail(to === "shared" ? "share" : "make it private"));
    }
    function remove() {
      var gone = scen.name;
      scenRef(cloud, scen).delete().then(function () {
        setScen({ kind: "local", id: null, name: "Copy of " + gone, by: null, savedAt: null }); setDirty(true); setMenu(false);
        setMsg({ kind: "good", text: "Deleted " + gone + ". Its numbers are still open here, unsaved, if you want to save them under another name." });
      }, fail("delete"));
    }
    function makeOfficial() {
      var b = scenBody("Official numbers", cloud.uid);
      cloud.db.doc("official/default").set(b).then(function () {
        if (scen.kind === "local" || scen.kind === "new") {
          setScen({ kind: "official", id: "default", name: "Official numbers", by: cloud.uid || null, savedAt: b.savedAt });
          setDirty(false); setSource("Scenario: Official numbers");
        }
        setMsg({ kind: "good", text: "These are now the official numbers. New scenarios start from them." }); setMenu(false);
      }, fail("set the official numbers"));
    }
    function loadScenario(kind, x) {
      var d = normalizeDoc(x.doc);
      docRef.current = d; setDoc(d); setHist([]); setDirty(false); setNewer(null);
      setScen({ kind: kind, id: kind === "official" ? "default" : x.id, name: kind === "official" ? "Official numbers" : x.name || "Untitled", by: x.by || null, savedAt: x.savedAt || 0 });
      setSource("Scenario: " + (kind === "official" ? "Official numbers" : x.name || "Untitled"));
    }
    function startFresh() {
      var d = lists.official ? normalizeDoc(lists.official.doc) : normalizeDoc(SEED_DOC);
      docRef.current = d; setDoc(d); setHist([]); setDirty(true); setNewer(null);
      setScen({ kind: "new", id: null, name: "New scenario", by: null, savedAt: null });
      setSource(lists.official ? "Official numbers (new scenario)" : SEED_LABEL);
    }
    /* Opening another scenario never drops unsaved edits without asking. */
    function guard(action) {
      setMenu(false);
      if (dirty && scen.kind !== "local") setPending(action); else action.run();
    }
    function openScen(kind, x) { guard({ label: "open " + (kind === "official" ? "the official numbers" : x.name), run: function () { loadScenario(kind, x); } }); }
    function startNew() { guard({ label: "start a new scenario", run: startFresh }); }
    function setUi(fn) { setUiState(function (u) { var n = clone(u); fn(n); return n; }); }
    function go(page) { setUi(function (u) { u.page = page; }); window.scrollTo(0, 0); }
    function jump(x) {
      if (x.page === "data") { setMenu("data"); return; }
      setUi(function (u) {
        u.page = x.page; if (x.sel) u.sel = x.sel;
        // Open the Portfolio section that holds the field being jumped to.
        if (x.field) FIELD_GROUPS.forEach(function (g) { if (g.fields.some(function (f) { return f.id === x.field; })) u.pfShut[g.title] = false; });
      });
      window.scrollTo(0, 0);
      if (x.field) setPendingField(x.field);
    }

    var C = useMemo(function () { return compute(doc); }, [doc]);

    function onImport(e) {
      var file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var parsed = JSON.parse(reader.result);
          if (!validDoc(parsed)) throw new Error("shape");
          replaceDoc(normalizeDoc(parsed), file.name, "Loaded " + file.name + ". Every number now comes from that scenario.");
          setMenu(false);
        } catch (err) {
          setMsg({ kind: "bad", text: "That file isn't a scenario export. In the cost tool, open Edit model and use Export, then import that .json file here." });
        }
      };
      reader.readAsText(file);
    }
    function onCopy() {
      var text = JSON.stringify(doc, null, 2);
      var done = function () { setMsg({ kind: "good", text: "Scenario JSON copied. Save it as a .json file, then use Edit model → Import in the cost tool." }); };
      try { navigator.clipboard.writeText(text).then(done, function () { setJsonOut(text); }); } catch (err) { setJsonOut(text); }
      setMenu(false);
    }
    function onReset() {
      if (!armReset) { setArmReset(true); setTimeout(function () { setArmReset(false); }, 4000); return; }
      setArmReset(false); setMenu(false);
      replaceDoc(normalizeDoc(SEED_DOC), SEED_LABEL, "Back to the seed model.");
    }

    var page = ui.page, props = { doc: doc, C: C, ui: ui, setUi: setUi, update: update, go: go, jump: jump, source: source, setMsg: setMsg, cloud: cloud, lists: lists, names: names, scen: scen, dirty: dirty };
    var body = page === "portfolio" ? h(Portfolio, props) : page === "costs" ? h(Costs, props) : page === "services" ? h(Services, props)
      : page === "fees" ? h(AddOns, props) : page === "prices" ? h(Prices, props) : page === "growth" ? h(Growth, props) : page === "compare" ? h(Compare, props) : page === "acq" ? h(Acquisitions, props) : h(Summary, props);

    return html`<div class="app">
      <header class="bar">
        <div class="brand"><img src=${LOGO} alt="Raynor Realty, property management since 1987" width="38" height="38" /><div class="brand-t"><span>Raynor Realty</span><b>Bottom Line</b></div></div>
        <nav class="steps" aria-label="Pages">
          ${PAGES.map(function (p, i) {
            return html`<${React.Fragment} key=${p.id}>
              ${p.id === "growth" ? html`<span class="step-sep"></span>` : null}
              <button type="button" class="step" aria-current=${page === p.id ? "page" : null} onClick=${function () { go(p.id); }}>
                ${p.n ? html`<span class="n">${p.n}</span>` : null}${p.label}
              </button>
              ${p.id === "summary" ? html`<span class="step-sep"></span>` : null}
            </${React.Fragment}>`;
          })}
        </nav>
        <div class="bar-actions">
          ${cloud.db && (dirty || saving) ? (canWrite(cloud, scen)
            ? html`<button type="button" class="btn primary" disabled=${saving} onClick=${save} title="Save (Ctrl/Cmd+S)">${saving ? "Saving…" : "Save"}</button>`
            : html`<button type="button" class="btn primary" onClick=${function () { setMenu("scen"); }} title="Save these numbers as a scenario">Save…</button>`) : null}
          <div class="menu-wrap">
            <button type="button" class="btn scen-btn" aria-expanded=${menu === "scen"} onClick=${function () { setMenu(menu === "scen" ? false : "scen"); }}
              title="Open, save, share and compare scenarios">
              <span class="scen-btn-name" title=${scen.name}>${scen.name}</span>${dirty ? html`<span class="unsaved" title="Unsaved changes">●</span>` : null} ▾</button>
            ${menu === "scen" ? html`<${ScenarioMenu} cloud=${cloud} scen=${scen} lists=${lists} names=${names} dirty=${dirty} saving=${saving}
              save=${save} saveAs=${saveAs} rename=${rename} move=${move} remove=${remove} makeOfficial=${makeOfficial} open=${openScen} startNew=${startNew}
              compare=${function () { setMenu(false); go("compare"); }} />` : null}
          </div>
          <div class="menu-wrap">
            <button type="button" class="btn" aria-expanded=${menu === "activity"} onClick=${function () { setMenu(menu === "activity" ? false : "activity"); }}
              title="Every change this session and what it did to each tier's margin">
              Activity${hist.length > seen ? html`<span class="count">${hist.length - seen}</span>` : null} ▾</button>
            ${menu === "activity" ? html`<${ActivityMenu} hist=${hist} undo=${undo} restore=${restore} />` : null}
          </div>
          <div class="menu-wrap">
            <button type="button" class="btn" aria-expanded=${menu === "data"} onClick=${function () { setMenu(menu === "data" ? false : "data"); }}>Data ▾</button>
            ${menu === "data" ? html`<div class="menu" role="dialog" aria-label="Scenario data">
              <p class="small"><b>Numbers from:</b> ${source}</p>
              <p class="small muted">Import replaces the numbers in the open scenario (save to keep them). To use your live numbers, open the cost tool, go to Edit model → Export, and import that file here.</p>
              <label class="btn primary" for="importFile">Import scenario (.json)</label>
              <input type="file" id="importFile" accept=".json,application/json" class="visually-hidden" onChange=${onImport} />
              <button type="button" class="btn" onClick=${onCopy}>Copy scenario JSON</button>
              <button type="button" class=${"btn" + (armReset ? " danger" : "")} onClick=${onReset}>${armReset ? "Click again to reset" : "Reset open scenario to seed numbers"}</button>
              <p class="tiny faint">Copy scenario JSON also moves numbers into the Package Margin Workbench: import the saved file there.</p>
            </div>` : null}
          </div>
        </div>
      </header>
      <main class=${"main" + (ui.railHidden ? " rail-off" : "")}>
        <div class="page">
          ${pending ? html`<div class="banner warn" role="alert"><span>You have unsaved changes to ${scen.name}. Save them before you ${pending.label}?</span>
            <span class="banner-actions">
              ${canWrite(cloud, scen) ? html`<button type="button" class="btn sm primary" onClick=${function () { save(); var p = pending; setPending(null); setTimeout(p.run, 400); }}>Save, then continue</button>` : null}
              <button type="button" class="btn sm" onClick=${function () { var p = pending; setPending(null); p.run(); }}>Discard changes</button>
              <button type="button" class="link" onClick=${function () { setPending(null); }}>Cancel</button></span></div>` : null}
          ${newer ? html`<div class="banner warn" role="status"><span>${byName(cloud, names, newer.by) === "you" ? "You" : byName(cloud, names, newer.by)} saved a newer version of ${newer.name || "this scenario"} ${ago(newer.savedAt)}.</span>
            <span class="banner-actions"><button type="button" class="btn sm" onClick=${function () { loadScenario(scen.kind, newer); }}>Load it (drops your edits)</button>
            <button type="button" class="link" onClick=${function () { setNewer(null); }}>Keep mine</button></span></div>` : null}
          ${cloud.db && scen.kind === "local" && !pending && !ui.hideSaveHint ? html`<div class="banner tip-b" role="status">
            <span>${lists.official ? "You're working on numbers saved only in this browser. Open the official numbers, or save these as a scenario." : "These numbers are only saved in this browser. Save them as a scenario to keep them on every device and share them."}</span>
            <span class="banner-actions">
              ${lists.official ? html`<button type="button" class="btn sm primary" onClick=${function () { openScen("official", lists.official); }}>Open the official numbers</button>` : null}
              <button type="button" class=${"btn sm" + (lists.official ? "" : " primary")} onClick=${function () { setMenu("scen"); }}>Save as a scenario…</button>
              <button type="button" class="link" onClick=${function () { setUi(function (u) { u.hideSaveHint = true; }); }}>Not now</button>
            </span></div>` : null}
          ${msg ? html`<div class=${"banner " + msg.kind} role="status"><span>${msg.text}</span>
            <button type="button" class="link" onClick=${function () { setMsg(null); }}>Dismiss</button></div>` : null}
          ${jsonOut ? html`<section class="panel json-out"><div class="panel-h"><h2>Scenario JSON</h2>
            <button type="button" class="link" onClick=${function () { setJsonOut(null); }}>Close</button></div>
            <div class="panel-b"><p class="note">Copying was blocked here. Select all of the text below and copy it.</p>
            <textarea id="jsonOut" readOnly value=${jsonOut} onFocus=${function (e) { e.target.select(); }}></textarea></div></section>` : null}
          ${body}
        </div>
        <${Rail} doc=${doc} C=${C} ui=${ui} setUi=${setUi} update=${update} hist=${hist} undo=${undo} go=${go} />
      </main>
    </div>`;
  }

  ReactDOM.createRoot(document.getElementById("root")).render(h(App));
})();
