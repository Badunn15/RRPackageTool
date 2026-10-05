(function () {
  "use strict";
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useMemo = React.useMemo;
  var html = htm.bind(h);
  var STORE = "rr-margin-workbench-v1";
  var UI_STORE = "rr-margin-workbench-ui-v1";
  var SEED_LABEL = "Seed model (initial numbers)";

  var DEFAULT_UI = {
    focus: "all",
    open: { growth: true, assumptions: false, cost: true, scope: true, addons: true, bench: false, price: true, choice: true, ledger: true },
    compareDoors: null,
    costFilter: { q: "", show: "all" },
    scopeFilter: { q: "", show: "all" },
    groups: {}, owners: {}, cats: {}
  };

  function money(n, d) {
    d = d == null ? 0 : d;
    return (n < 0 ? "-" : "") + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function pct(n, d) { return n.toFixed(d == null ? 1 : d) + "%"; }
  function fmtNum(n) { return n.toLocaleString("en-US", { maximumFractionDigits: 2 }); }
  function round(n) { return String(Math.round(n * 100) / 100); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    try {
      var raw = localStorage.getItem(STORE);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && validDoc(s.doc)) return { doc: normalizeDoc(s.doc), source: s.source || SEED_LABEL };
      }
    } catch (e) {}
    return { doc: normalizeDoc(SEED_DOC), source: SEED_LABEL };
  }
  function loadUi() {
    var ui = clone(DEFAULT_UI);
    try {
      var s = JSON.parse(localStorage.getItem(UI_STORE) || "null");
      if (s) {
        ui.focus = TIERS.indexOf(s.focus) >= 0 ? s.focus : "all";
        Object.assign(ui.open, s.open || {});
        Object.assign(ui.costFilter, s.costFilter || {});
        Object.assign(ui.scopeFilter, s.scopeFilter || {});
        ui.groups = s.groups || {}; ui.owners = s.owners || {}; ui.cats = s.cats || {};
        ui.compareDoors = typeof s.compareDoors === "number" ? s.compareDoors : null;
      }
    } catch (e) {}
    return ui;
  }

  function verdict(m, target) {
    if (m.marginPct < 0) return { cls: "bad", label: "Losing money" };
    if (m.marginPct < target) return { cls: "warn", label: "Below target" };
    return { cls: "good", label: "On target" };
  }

  /* Filter test shared by both tables. flags = tier checkboxes, counted = counts at the current view. */
  function passes(filter, focus, name, flags, counted) {
    if (filter.q && name.toLowerCase().indexOf(filter.q.toLowerCase()) < 0) return false;
    var tiers = focus === "all" ? TIERS : [focus];
    var on = tiers.map(function (t) { return !!flags[t]; });
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

  /* Number input that keeps what you're typing ("1.", "") until blur, but commits every valid change live. */
  function Num(props) {
    var _s = useState(round(props.value || 0)), s = _s[0], setS = _s[1];
    var focused = useRef(false);
    useEffect(function () { if (!focused.current) setS(round(props.value || 0)); }, [props.value]);
    return html`<input type="number" id=${props.id} class=${"num " + (props.cls || "")} step=${props.step || "any"}
      min=${props.min} max=${props.max} disabled=${props.disabled} value=${s} aria-label=${props.label}
      onFocus=${function () { focused.current = true; }}
      onBlur=${function () { focused.current = false; setS(round(props.value || 0)); }}
      onChange=${function (e) {
        setS(e.target.value);
        var n = parseFloat(e.target.value);
        if (!isNaN(n)) props.onChange(props.min != null ? Math.max(props.min, n) : n);
      }} />`;
  }

  function Field(props) {
    return html`<label class="field" for=${props.id}>
      <span class="field-label">${props.label}${props.hint ? html` <span class="hint">${props.hint}</span>` : null}</span>
      <span class="affix">
        ${props.prefix ? html`<span class="pre">${props.prefix}</span>` : null}
        <${Num} id=${props.id} value=${props.value} onChange=${props.onChange} step=${props.step} min=${props.min} max=${props.max} label=${props.label} />
        ${props.suffix ? html`<span class="suf">${props.suffix}</span>` : null}
      </span>
    </label>`;
  }

  function Tick(props) {
    if (props.at == null || props.at < props.min || props.at > props.max) return null;
    var left = ((props.at - props.min) / (props.max - props.min)) * 100;
    return html`<span class=${"tick " + props.kind} style=${{ left: left + "%" }} title=${props.title}></span>`;
  }

  /* ⓘ button that shows how a number is calculated. Rendered into <body> with fixed positioning so tables and cards never clip it. */
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
        ${lines.map(function (l, i) { return html`<div key=${i} class=${i === 0 ? "tip-main" : "tip-note"}>${l}</div>`; })}
      </div>`, document.body) : null}
    </span>`;
  }

  /* Typed % input that sits beside a slider for exact values. */
  function PctBox(props) {
    return html`<span class="affix sm pct-box">
      <${Num} id=${props.id} cls="pct-in" value=${props.value} step=${props.step || 0.05} min=${0} label=${props.label}
        onChange=${function (v) { props.onChange(Math.min(props.max, Math.max(0, v))); }} />
      <span class="suf">%</span>
    </span>`;
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

  /* Collapsible block inside a tier card. Open state is shared by all three cards so they stay aligned. */
  function Disc(props) {
    return html`<section class="block">
      <button type="button" class="disc" aria-expanded=${props.open} onClick=${props.onToggle}>
        <span class="caret-i" aria-hidden="true">${props.open ? "▾" : "▸"}</span>
        <span class="block-label">${props.title}</span>
        <span class="disc-right mono">${props.open ? null : props.right}</span>
      </button>
      ${props.open ? html`<div class="disc-body">${props.children}</div>` : null}
    </section>`;
  }

  /* Collapsible page section with a one-line summary while closed. */
  function Section(props) {
    return html`<section class="card section" aria-labelledby=${"sec-" + props.id}>
      <h2 class="section-h" id=${"sec-" + props.id}>
        <button type="button" class="section-toggle" aria-expanded=${props.open} onClick=${props.onToggle}>
          <span class="caret-i" aria-hidden="true">${props.open ? "▾" : "▸"}</span>
          <span class="sec-title">${props.title}</span>
          <span class="muted small section-summary">${props.summary}</span>
        </button>
      </h2>
      ${props.open ? html`<div class="section-body">
        ${props.intro ? html`<p class="muted small intro">${props.intro}</p>` : null}
        ${props.children}
      </div>` : null}
    </section>`;
  }

  function Toolbar(props) {
    var f = props.filter, focus = props.focus;
    var set = function (k, v) { var n = Object.assign({}, f); n[k] = v; props.onChange(n); };
    var who = focus === "all" ? null : TIER_SHORT[focus];
    return html`<div class="toolbar">
      <input type="search" id=${props.id + "-q"} class="search" placeholder="Filter by name" aria-label="Filter by name" value=${f.q}
        onChange=${function (e) { set("q", e.target.value); }} />
      <select id=${props.id + "-show"} aria-label="Which lines to show" value=${f.show} onChange=${function (e) { set("show", e.target.value); }}>
        <option value="all">Show everything</option>
        <option value="out">${who ? "Left out of " + who : "Left out of any tier"}</option>
        <option value="in">${who ? "Included in " + who : "Included in every tier"}</option>
        <option value="differ">Differs between tiers</option>
        <option value="counted">Counted at this view</option>
      </select>
      <span class="muted small">${props.shown} of ${props.total} shown</span>
      <span class="spacer"></span>
      <button type="button" class="mini" onClick=${props.onCollapseAll}>Collapse all</button>
      <button type="button" class="mini" onClick=${props.onExpandAll}>Expand all</button>
    </div>`;
  }

  /* ------------------------------ tier card ------------------------------ */
  function TierCard(props) {
    var doc = props.doc, t = props.tier, m = props.margin, P = doc.pricing, p = P.tiers[t], ui = props.ui, cost = props.cost;
    var v = verdict(m, P.targetPct);
    var q = m.rev.quote, f = q.frame;
    var be = monthlyPctFor(doc, t, m.baseCost, 0);
    var tg = monthlyPctFor(doc, t, m.baseCost, P.targetPct);
    var range = ownerChoiceRange(doc, t, m.baseCost);
    var set = function (k, val) { props.update(function (d) { d.pricing.tiers[t][k] = val; }); };
    var shifted = Math.abs(p.shift || 0) > 0.001;
    var zoneText = [
      "Same total per lease term as the standard mix.",
      "Renewal fee is $0, so each renewal year pays Raynor more than standard.",
      "No up-front fees. Renewal years pay Raynor the most."
    ][q.zone];
    var lv = verdict(range.lo, P.targetPct), hv = verdict(range.hi, P.targetPct);

    return html`<article class=${"card tier" + (props.wide ? " wide" : "")} aria-labelledby=${"tn-" + t}>
      <header class="tier-head">
        <div>
          <h3 id=${"tn-" + t}>${TIER_NAMES[t]}</h3>
          <p class="muted small">${cost.included[t]} of ${cost.possible} services included</p>
        </div>
        <span class=${"pill " + v.cls}>${v.label}</span>
      </header>

      <div class="tier-body">
        <${Disc} title="Price" open=${ui.open.price} onToggle=${function () { props.toggleOpen("price"); }}
          right=${pct(p.monthlyPct, 2) + " · " + money(f.anchor) + "/door"}>
          <div class="row-between">
            <label for=${"anchorN-" + t} class="field-label">Standard monthly fee</label>
            <span class="inline-num">
              <${PctBox} id=${"anchorN-" + t} value=${p.monthlyPct} max=${30} label=${TIER_NAMES[t] + " standard monthly fee, typed"}
                onChange=${function (val) { set("monthlyPct", val); }} />
              <span class="muted small mono">${money(f.anchor)}/door</span>
              <${Info} label="How the monthly fee is figured" lines=${[
                pct(p.monthlyPct, 2) + " × " + money(doc.G.rent) + " average rent = " + money(f.anchor, 2) + "/door/mo",
                "Average rent is set under Assumptions."
              ]} />
            </span>
          </div>
          <${Range} id=${"anchor-" + t} label=${TIER_NAMES[t] + " standard monthly fee"} min=${0} max=${Math.max(20, p.monthlyPct)} step=${0.05} value=${p.monthlyPct}
            onChange=${function (val) { set("monthlyPct", val); }}>
            <${Tick} kind="floor" at=${be} min=${0} max=${Math.max(20, p.monthlyPct)} title="Break-even" />
            <${Tick} kind="target" at=${tg} min=${0} max=${Math.max(20, p.monthlyPct)} title="Target margin" />
          </${Range}>
          <div class="scale"><span>0%</span><span>${Math.max(20, p.monthlyPct)}%</span></div>
          <div class="keys">
            <span class="key floor">Break-even <b>${be == null ? "above 25%" : pct(be, 2)}</b></span>
            <span class="key target">${P.targetPct}% target <b>${tg == null ? "above 25%" : pct(tg, 2)}</b></span>
            <${Info} label="What the red and green marks mean" lines=${[
              "Red: the lowest standard monthly fee where revenue covers this tier's cost of " + money(m.cost, 2) + "/door/mo.",
              "Green: the lowest fee that reaches your " + P.targetPct + "% target margin.",
              "Both assume the owner stays on the standard mix and keep the leasing and renewal fees below as they are."
            ]} />
          </div>
          <div class="pair">
            <${Field} id=${"lease-" + t} label="Leasing fee" hint="% of 1 mo rent" suffix="%" step=${5} min=${0} value=${p.leasePct} onChange=${function (val) { set("leasePct", val); }} />
            <${Field} id=${"renew-" + t} label="Renewal fee" hint="flat" prefix="$" step=${25} min=${0} value=${p.renewal} onChange=${function (val) { set("renewal", val); }} />
          </div>
        </${Disc}>

        <${Disc} title="Owner's fee choice" open=${ui.open.choice} onToggle=${function () { props.toggleOpen("choice"); }}
          right=${pct(range.lo.marginPct, 0) + " to " + pct(range.hi.marginPct, 0)}>
          <p class="explain">How an owner can split their fees: a lower monthly fee with bigger leasing and renewal fees, or a higher monthly fee with smaller ones. The grey mark is your standard mix.</p>
          <div class="row-between">
            <label for=${"splitN-" + t} class="field-label">Owner picks</label>
            <span class="inline-num">
              <${PctBox} id=${"splitN-" + t} value=${Math.round(q.pct * 100) / 100} max=${f.zeroLeasePct} label=${TIER_NAMES[t] + " owner monthly fee, typed"}
                onChange=${function (val) { set("shift", Math.round((val - p.monthlyPct) * 100) / 100); }} />
              <span class="muted small">monthly</span>
            </span>
          </div>
          <${Range} id=${"split-" + t} label=${TIER_NAMES[t] + " owner fee choice"} min=${0} max=${Math.max(0.05, Math.round(f.zeroLeasePct * 100) / 100)} step=${0.05} value=${q.pct}
            onChange=${function (val) { set("shift", Math.round((val - p.monthlyPct) * 100) / 100); }}>
            <${Tick} kind="anchor" at=${p.monthlyPct} min=${0} max=${Math.max(0.05, f.zeroLeasePct)} title="Standard mix" />
            <${Tick} kind="renewal0" at=${range.zeroRenewalPct} min=${0} max=${Math.max(0.05, f.zeroLeasePct)} title="Renewal fee reaches $0" />
          </${Range}>
          <div class="scale"><span>0% monthly</span><span>${pct(f.zeroLeasePct, 2)} = no up-front fees</span></div>
          <div class="keys">
            <span class="key anchor">Standard mix <b>${pct(p.monthlyPct, 2)}</b></span>
            <span class="key renewal0">Renewal fee hits $0 <b>${pct(range.zeroRenewalPct, 2)}</b></span>
          </div>
          <dl class="quote">
            <div><dt>Monthly</dt><dd>${money(q.monthly)}</dd></div>
            <div><dt>Leasing fee</dt><dd>${money(q.leaseUp)}</dd></div>
            <div><dt>Renewal fee</dt><dd>${money(q.renewal)}</dd></div>
            <div><dt>Due at signing</dt><dd>${money(q.dueAtSigning)}</dd></div>
          </dl>
          <p class="small muted zone">${zoneText}</p>
          <div class="range-line">
            <span>Across every owner choice:</span>
            <span class=${"mono strong " + lv.cls} title=${"Lowest revenue at " + pct(range.lo.pct, 2) + " monthly, where the renewal fee reaches $0"}>${pct(range.lo.marginPct)}</span>
            <span>to</span>
            <span class=${"mono strong " + hv.cls} title=${"Highest revenue at " + pct(range.hi.pct, 2) + " monthly"}>${pct(range.hi.marginPct)}</span>
            <${Info} label="Why margin changes with the owner's choice" lines=${[
              "Wherever the owner sets it, each 12-month lease term costs them the same total. That holds per lease term, not per year.",
              "Up to " + pct(range.zeroRenewalPct, 2) + ", both a placement term and a renewal term total the same however the owner splits them, so margin holds steady." + (P.vacancyPct ? " (It drifts slightly here because the " + P.vacancyPct + "% vacancy setting only reduces the monthly fee.)" : ""),
              "Past " + pct(range.zeroRenewalPct, 2) + ", the renewal fee can't go below $0, so each renewal year pays the full monthly fee and brings in more than a standard renewal year. With " + fmtNum(doc.G.tenancy) + "-yr stays, " + m.rev.renewalsYr.toFixed(2) + " of each year's leases are renewals, so margin climbs toward " + pct(range.hi.marginPct) + "."
            ]} />
          </div>
          <p class="small muted">Worst case sits at ${pct(range.lo.pct, 2)}, where the renewal fee just reaches $0. Price the tier so that still clears your target.</p>
          ${shifted ? html`<button type="button" class="link" onClick=${function () { set("shift", 0); }}>Back to standard mix</button>` : null}
        </${Disc}>

        <${Disc} title="Revenue and cost" open=${ui.open.ledger} onToggle=${function () { props.toggleOpen("ledger"); }}
          right=${money(m.margin, 2) + " margin/door"}>
          <dl class="ledger">
            <div class="line"><dt>Revenue / door / mo <${Info} label="How revenue is figured" lines=${[
              money(m.rev.mgmt, 2) + " monthly fee + " + money(m.rev.leasing, 2) + " leasing + " + money(m.rev.renewal, 2) + " renewal + " + money(m.addon.rev, 2) + " add-on fees = " + money(m.revenue, 2) + "/door/mo",
              "One-time fees are averaged into a monthly figure using how often they happen."
            ]} /></dt><dd>${money(m.revenue, 2)}</dd></div>
            <div class="line sub"><dt>${P.vacancyPct ? "Monthly fee, less " + P.vacancyPct + "% vacancy" : "Monthly fee"} <${Info} label="How the monthly fee revenue is figured" lines=${P.vacancyPct ? [
              money(q.monthly, 2) + " × 12 months × (1 − " + P.vacancyPct + "% vacancy) ÷ 12 = " + money(m.rev.mgmt, 2) + "/door/mo",
              P.vacancyPct + "% vacancy is about " + Math.round(365 * P.vacancyPct / 100) + " days a year per door with no rent and no fee. Set it to 0 under Assumptions to ignore it."
            ] : [
              pct(q.pct, 2) + " × " + money(doc.G.rent) + " rent = " + money(m.rev.mgmt, 2) + "/door/mo",
              "No vacancy deduction (Assumptions → Vacancy is 0%)."
            ]} /></dt><dd>${money(m.rev.mgmt, 2)}</dd></div>
            <div class="line sub"><dt>Leasing fees, ${m.rev.turnsYr.toFixed(2)} turnovers/yr <${Info} label="How leasing fee revenue is figured" lines=${[
              money(q.leaseUp, 2) + " per placement × " + m.rev.turnsYr.toFixed(2) + " placements/yr ÷ 12 = " + money(m.rev.leasing, 2) + "/door/mo",
              m.rev.turnsYr.toFixed(2) + " placements a year = 1 ÷ " + fmtNum(doc.G.tenancy) + "-yr average tenancy (Assumptions).",
              "Standard leasing fee is " + fmtNum(p.leasePct) + "% of one month's rent. It shrinks as the owner moves money into the monthly fee."
            ]} /></dt><dd>${money(m.rev.leasing, 2)}</dd></div>
            <div class="line sub"><dt>Renewal fees, ${m.rev.renewalsYr.toFixed(2)} renewals/yr <${Info} label="How renewal fee revenue is figured" lines=${[
              money(q.renewal, 2) + " per renewal × " + m.rev.renewalsYr.toFixed(2) + " renewals/yr ÷ 12 = " + money(m.rev.renewal, 2) + "/door/mo",
              "With " + fmtNum(P.term) + "-month leases and " + fmtNum(doc.G.tenancy) + "-yr stays, each stay has " + fmtNum(Math.max(0, doc.G.tenancy * 12 / P.term - 1)) + " renewals: " + m.rev.renewalsYr.toFixed(2) + " a year."
            ]} /></dt><dd>${money(m.rev.renewal, 2)}</dd></div>
            ${m.addon.items.length ? html`<div class="line sub"><dt>Add-on fees <${Info} label="How add-on fee revenue is figured" lines=${
              m.addon.items.map(function (it) {
                return it.addon.name + ": " + (it.state === "charged"
                  ? money(it.addon.price || 0) + " × " + fmtNum(it.eventsYr) + "/yr ÷ 12 ÷ " + fmtNum(doc.G.doors) + " doors = " + money(it.rev, 2) + "/door/mo"
                  : "included, not billed");
              }).concat(["Set these up in the Add-on fees section."])
            } /></dt><dd>${money(m.addon.rev, 2)}</dd></div>` : null}
            <div class="line"><dt>Cost / door / mo <span class="hint">${VIEW_NAMES[doc.cv]}</span> <${Info} label="How cost per door is figured" lines=${[
              "Lines checked for " + TIER_SHORT[t] + " and counted at " + VIEW_NAMES[doc.cv] + ": " + money(cost.totalMo[t], 2) + "/mo ÷ " + fmtNum(doc.G.doors) + " doors = " + money(cost.base[t], 2) + "/door/mo",
              P.scopeSavings ? "Less " + money(cost.freed[t], 2) + " of PM capacity freed by services this tier strips = " + money(m.baseCost, 2) + "." : "Freed PM capacity from stripped services isn't taken off. Turn that on under Assumptions.",
              m.addon.cost > 0.005 ? "Plus " + money(m.addon.cost, 2) + " of add-on fee costs." : "No add-on fee costs.",
              m.leaseBreak.cost > 0.005 ? "Plus " + money(m.leaseBreak.cost, 2) + " lease break waiver (the " + money(q.leaseUp) + " leasing fee waived × " + fmtNum(m.leaseBreak.perYear) + " breaks/yr ÷ 12 ÷ " + fmtNum(doc.G.doors) + " doors)." : m.leaseBreak.waived ? "Lease break waiver doesn't count at " + VIEW_NAMES[doc.cv] + "." : "No lease break waiver in this tier.",
              "Total " + money(m.cost, 2) + "/door/mo.",
              "Hover the i next to any line's $/mo in Cost lines to see its own math."
            ]} /></dt><dd>${money(m.cost, 2)}</dd></div>
            ${P.scopeSavings
              ? html`<div class="line sub"><dt>Lines checked for this tier</dt><dd>${money(cost.base[t], 2)}</dd></div>
                <div class="line sub"><dt>Less PM capacity freed, ${cost.freedCount[t]} stripped services</dt><dd>-${money(cost.freed[t], 2)}</dd></div>`
              : cost.freed[t] > 0.005
                ? html`<div class="line sub"><dt>PM capacity freed, ${cost.freedCount[t]} stripped services (not counted)</dt><dd>${money(cost.freed[t], 2)}</dd></div>`
                : null}
            ${m.addon.cost > 0.005 ? html`<div class="line sub"><dt>Add-on fee costs</dt><dd>${money(m.addon.cost, 2)}</dd></div>` : null}
            ${m.leaseBreak.cost > 0.005 ? html`<div class="line sub"><dt>Lease break waiver</dt><dd>${money(m.leaseBreak.cost, 2)}</dd></div>` : null}
            <div class="line total"><dt>Margin / door / mo <${Info} label="How margin is figured" lines=${[
              money(m.revenue, 2) + " revenue − " + money(m.cost, 2) + " cost = " + money(m.margin, 2) + "/door/mo",
              "Margin % = margin ÷ revenue = " + pct(m.marginPct) + ". Across " + fmtNum(doc.G.doors) + " doors that's " + money(m.portfolioMo) + "/mo."
            ]} /></dt><dd>${money(m.margin, 2)}</dd></div>
          </dl>
        </${Disc}>

        <div class="tier-foot">
          <div class=${"strip " + v.cls}>
            <strong class="mono">${pct(m.marginPct)} margin</strong>
            <span>${money(m.portfolioMo)}/mo · ${money(m.portfolioMo * 12)}/yr on ${doc.G.doors} doors</span>
          </div>
          <div class="views">
            ${VIEWS.map(function (vw) {
              var mm = tierMargin(doc, t, props.allViews[vw].perDoor[t], vw);
              var vv = verdict(mm, P.targetPct);
              return html`<button type="button" key=${vw} class=${"vchip " + vv.cls + (vw === doc.cv ? " on" : "")}
                title=${"Switch to " + VIEW_NAMES[vw] + " (cost " + money(mm.cost, 2) + "/door/mo)"}
                onClick=${function () { props.update(function (d) { d.cv = vw; }); }}>
                ${VIEW_NAMES[vw].replace("Fully ", "")} <b>${pct(mm.marginPct, 0)}</b></button>`;
            })}
          </div>
        </div>
      </div>
    </article>`;
  }

  /* ------------------------------ cost table ------------------------------ */
  function CostTable(props) {
    var doc = props.doc, update = props.update, view = doc.cv, ck = activeTemplate(doc).ck, ui = props.ui;
    var vt = props.visTiers, cols = 8 + vt.length;

    function setRowField(row, gid, field, val) {
      update(function (d) {
        if (row.promoted) {
          if (field === "name") d.MASTER[row.id].n = val;
          if (field === "e") d.pbase[row.id] = val;
          return;
        }
        var g = d.CG.find(function (x) { return x.id === gid; });
        var r = g && g.rows.find(function (x) { return x.id === row.id; });
        if (r) r[field] = val;
      });
    }
    function toggle(id, t) {
      update(function (d) {
        var tp = activeTemplate(d);
        tp.ck[id] = tp.ck[id] || { min: false, special: false, plus: false };
        tp.ck[id][t] = !tp.ck[id][t];
        syncLinked(d, tp, "ck", id, t);
      });
    }
    function setAll(ids, t, on) {
      update(function (d) {
        var tp = activeTemplate(d);
        ids.forEach(function (id) { tp.ck[id] = tp.ck[id] || { min: false, special: false, plus: false }; tp.ck[id][t] = on; syncLinked(d, tp, "ck", id, t); });
      });
    }
    function removeRow(row, gid) {
      update(function (d) {
        if (row.promoted) { d.place[row.id] = "uc"; return; }
        var g = d.CG.find(function (x) { return x.id === gid; });
        g.rows = g.rows.filter(function (x) { return x.id !== row.id; });
        d.templates.forEach(function (tp) { delete tp.ck[row.id]; });
        d.removed[row.id] = true;
      });
    }
    function addRow(gid) {
      update(function (d) {
        var id = "row_" + Date.now().toString(36);
        d.CG.find(function (x) { return x.id === gid; }).rows.push({ id: id, name: "New line", e: "monthly", v: 0 });
        d.vl[id] = 0;
        d.templates.forEach(function (tp) { tp.ck[id] = { min: true, special: true, plus: true }; });
      });
      if (ui.groups[gid]) props.setUi(function (u) { u.groups[gid] = false; });
    }

    var filtering = ui.costFilter.q || ui.costFilter.show !== "all";
    var shown = 0, total = 0;
    var groups = doc.CG.map(function (g) {
      var rows = groupRows(doc, g);
      var keep = rows.filter(function (r) {
        total++;
        var name = r.promoted ? doc.MASTER[r.id].n : r.name;
        var ok = passes(ui.costFilter, props.focus, name, ck[r.id] || {}, isVisible(rowView(doc, r.id, g.id), view));
        if (ok) shown++;
        return ok;
      });
      return { g: g, rows: rows, keep: keep };
    });

    return html`<div>
      <${Toolbar} id="cost" filter=${ui.costFilter} focus=${props.focus} shown=${shown} total=${total}
        onChange=${function (f) { props.setUi(function (u) { u.costFilter = f; }); }}
        onCollapseAll=${function () { props.setUi(function (u) { doc.CG.forEach(function (g) { u.groups[g.id] = true; }); }); }}
        onExpandAll=${function () { props.setUi(function (u) { u.groups = {}; }); }} />
      <div class="table-wrap"><table class="grid">
        <thead><tr>
          <th class="l">Line</th><th>Rate</th><th class="l">Basis</th><th>Burden / events</th><th class="l">View</th>
          <th>$/mo</th><th>$/door</th>
          ${vt.map(function (t) { return html`<th key=${t} class="c tiercol">${TIER_SHORT[t]}</th>`; })}
          <th></th>
        </tr></thead>
        ${groups.map(function (G) {
          var g = G.g, rows = G.rows;
          if (filtering && !G.keep.length) return null;
          var gView = doc.secView[g.id] || "direct";
          var gHidden = !isVisible(gView, view);
          var gTotal = rows.reduce(function (s, r) { return s + (isVisible(rowView(doc, r.id, g.id), view) ? cmo(r, doc) : 0); }, 0);
          var isCollapsed = !!ui.groups[g.id];
          var ids = rows.map(function (r) { return r.id; });
          var outCounts = vt.map(function (t) { return ids.filter(function (id) { return !(ck[id] && ck[id][t]); }).length; });
          return html`<tbody key=${g.id} class=${gHidden ? "hidden-group" : ""}>
            <tr class="group-row">
              <td class="l" colspan="4">
                <button type="button" class="caret" aria-expanded=${!isCollapsed} aria-label=${(isCollapsed ? "Expand " : "Collapse ") + g.label}
                  onClick=${function () { props.setUi(function (u) { u.groups[g.id] = !isCollapsed; }); }}>${isCollapsed ? "▸" : "▾"}</button>
                <input type="text" class="group-name" id=${"g-" + g.id} value=${g.label} aria-label="Group name"
                  onChange=${function (e) { var val = e.target.value; update(function (d) { d.CG.find(function (x) { return x.id === g.id; }).label = val; }); }} />
                <span class="muted small">${filtering ? G.keep.length + " of " + rows.length : rows.length} lines</span>
                ${gHidden ? html`<span class="tag">hidden at ${VIEW_NAMES[view]}</span>` : null}
              </td>
              <td class="l">
                <select id=${"gv-" + g.id} aria-label=${g.label + " view"} value=${gView}
                  onChange=${function (e) { var val = e.target.value; update(function (d) { d.secView[g.id] = val; }); }}>
                  ${VIEWS.map(function (vw) { return html`<option key=${vw} value=${vw}>${VIEW_NAMES[vw]}</option>`; })}
                </select>
              </td>
              <td class="mono">${money(gTotal)}</td><td class="mono muted">${doc.G.doors ? money(gTotal / doc.G.doors, 2) : "—"}</td>
              ${vt.map(function (t, i) {
                var on = ids.length && outCounts[i] === 0;
                return html`<td key=${t} class="c">
                  <button type="button" class="mini" title=${(on ? "Uncheck" : "Check") + " every " + g.label + " line for " + TIER_SHORT[t]}
                    onClick=${function () { setAll(ids, t, !on); }}>${on ? "none" : "all"}</button>
                  ${outCounts[i] && outCounts[i] < ids.length ? html`<div class="out-count">${outCounts[i]} out</div>` : null}
                </td>`;
              })}
              <td></td>
            </tr>
            ${isCollapsed ? null : (filtering ? G.keep : rows).map(function (r) {
              var rv = rowView(doc, r.id, g.id), vis = isVisible(rv, view), mo = cmo(r, doc), f = ck[r.id] || {};
              var isAf = r.e === "af", calc = !!CALC_ROWS[r.id], isLb = r.id === "lease_brk";
              // The lease-break waiver depends on each tier's leasing fee: show the tier in focus, or the range across waiving tiers.
              var lbVals = isLb ? vt.filter(function (t) { return f[t]; }).map(function (t) { return leaseBreakMo(doc, t); }) : null;
              if (isLb) mo = lbVals.length ? Math.max.apply(null, lbVals) : 0;
              var moText = isLb && lbVals.length > 1 && Math.min.apply(null, lbVals) < mo - 0.005 ? money(Math.min.apply(null, lbVals), 2) + "–" + money(mo, 2) : money(mo, 2);
              return html`<tr key=${r.id} class=${vis ? "" : "dim"}>
                <td class="l"><input type="text" class="name" id=${"n-" + r.id} aria-label="Line name" value=${r.promoted ? doc.MASTER[r.id].n : r.name}
                  onChange=${function (e) { setRowField(r, g.id, "name", e.target.value); }} />
                  ${r.promoted ? html`<span class="tag">service</span>` : null}${r.pmScope ? html`<span class="tag">bundles scope</span>` : null}</td>
                <td>${isAf ? html`<span class="muted">see AppFolio</span>`
                  : isLb ? html`<span class="muted small">tier's leasing fee</span>`
                  : html`<${Num} id=${"v-" + r.id} cls="rate" label=${"Rate for " + r.name} value=${doc.vl[r.id] != null ? doc.vl[r.id] : r.v}
                  onChange=${function (val) { update(function (d) { d.vl[r.id] = val; }); }} />${r.id === "evict_g" ? html`<span class="unit">attorney cap</span>` : null}`}</td>
                <td class="l">${calc ? html`<span class="muted small">${isLb ? "per break" : "court fees + attorney"}</span>` : html`<select id=${"b-" + r.id} aria-label="Basis" value=${r.e}
                  onChange=${function (e) { setRowField(r, g.id, "e", e.target.value); }}>
                  ${BASES.filter(function (b) { return b !== "af" || isAf || r.id === "af"; }).map(function (b) { return html`<option key=${b} value=${b}>${BASIS_NAMES[b]}</option>`; })}
                </select>`}</td>
                <td>${calc ? html`<${Num} id=${"ev-" + r.id} cls="small-num" label=${isLb ? "Lease breaks per year across the portfolio" : "Attorney uses per year"} min=${0} value=${doc.ev[r.id] != null ? doc.ev[r.id] : (r.n_ev || 0)}
                    onChange=${function (val) { update(function (d) { d.ev[r.id] = val; }); }} /><span class="unit">${isLb ? "breaks/yr" : "attorney uses/yr"}</span>`
                  : r.e === "annual" ? html`<${Num} id=${"bd-" + r.id} cls="small-num" label="Burden %" value=${doc.bd[r.id] != null ? doc.bd[r.id] : (r.n_bd || 0)}
                    onChange=${function (val) { update(function (d) { d.bd[r.id] = val; }); }} /><span class="unit">% burden</span>`
                  : r.e === "claim" ? html`<${Num} id=${"ev-" + r.id} cls="small-num" label="Events per year across the portfolio" value=${doc.ev[r.id] != null ? doc.ev[r.id] : (r.n_ev || 0)}
                    onChange=${function (val) { update(function (d) { d.ev[r.id] = val; }); }} /><span class="unit">/yr, portfolio</span>` : null}</td>
                <td class="l"><select id=${"iv-" + r.id} aria-label="View override" value=${doc.itemView[r.id] || ""}
                  onChange=${function (e) { var val = e.target.value; update(function (d) { if (val) d.itemView[r.id] = val; else delete d.itemView[r.id]; }); }}>
                  <option value="">inherit</option>
                  ${VIEWS.map(function (vw) { return html`<option key=${vw} value=${vw}>${VIEW_NAMES[vw]}</option>`; })}
                </select></td>
                <td class="mono">${moText}<${Info} label=${"How " + (r.promoted ? doc.MASTER[r.id].n : r.name) + " is calculated"} lines=${formulaLines(r, doc, g.id, view)} /></td>
                <td class="mono muted">${doc.G.doors ? money(mo / doc.G.doors, 2) : "—"}</td>
                ${vt.map(function (t) {
                  return html`<td key=${t} class="c"><input type="checkbox" id=${"ck-" + r.id + "-" + t} aria-label=${r.name + " in " + TIER_SHORT[t]}
                    checked=${!!f[t]} onChange=${function () { toggle(r.id, t); }} /></td>`;
                })}
                <td class="c"><button type="button" class="x" title=${r.promoted ? "Send back to bench" : "Remove line"} aria-label=${"Remove " + r.name}
                  onClick=${function () { removeRow(r, g.id); }}>×</button></td>
              </tr>`;
            })}
            ${isCollapsed || filtering ? null : html`<tr class="add-row"><td class="l" colspan=${cols}><button type="button" class="link" onClick=${function () { addRow(g.id); }}>+ Add line to ${g.label}</button></td></tr>`}
          </tbody>`;
        })}
      </table></div>
    </div>`;
  }

  /* ------------------------------ scope services ------------------------------ */
  function ScopeTable(props) {
    var doc = props.doc, update = props.update, view = doc.cv, psk = activeTemplate(doc).psk, ui = props.ui;
    var owners = bundleOwners(doc), vt = props.visTiers, cols = 9 + vt.length;

    function toggle(id, t) {
      update(function (d) {
        var tp = activeTemplate(d);
        tp.psk[id] = tp.psk[id] || { min: false, special: false, plus: false };
        tp.psk[id][t] = !tp.psk[id][t];
        syncLinked(d, tp, "psk", id, t);
      });
    }
    function setAll(ids, t, on) {
      update(function (d) {
        var tp = activeTemplate(d);
        ids.forEach(function (id) { tp.psk[id] = tp.psk[id] || { min: false, special: false, plus: false }; tp.psk[id][t] = on; syncLinked(d, tp, "psk", id, t); });
      });
    }

    var filtering = ui.scopeFilter.q || ui.scopeFilter.show !== "all";
    var shown = 0, total = 0;
    var ownerBlocks = owners.map(function (o) {
      var ids = scopeIds(doc).filter(function (id) { return doc.scopeOwner[id] === o.id; });
      var oVis = ownerVisible(doc, o.id, view);
      var cats = {};
      ids.forEach(function (id) {
        total++;
        if (!passes(ui.scopeFilter, props.focus, doc.MASTER[id].n, psk[id] || {}, oVis)) return;
        shown++;
        var c = doc.icat[id] || doc.MASTER[id].dc;
        (cats[c] = cats[c] || []).push(id);
      });
      return { o: o, ids: ids, vis: oVis, cats: cats };
    });

    return html`<div>
      <${Toolbar} id="scope" filter=${ui.scopeFilter} focus=${props.focus} shown=${shown} total=${total}
        onChange=${function (f) { props.setUi(function (u) { u.scopeFilter = f; }); }}
        onCollapseAll=${function () { props.setUi(function (u) { owners.forEach(function (o) { u.owners[o.id] = true; }); }); }}
        onExpandAll=${function () { props.setUi(function (u) { u.owners = {}; u.cats = {}; }); }} />
      <div class="table-wrap"><table class="grid">
        <thead><tr>
          <th class="l">Service</th><th>Value</th><th>Hours</th><th class="l">Unit</th><th>Events</th><th>Labor $/door/mo</th>
          ${vt.map(function (t) { return html`<th key=${t} class="c tiercol">${TIER_SHORT[t]}</th>`; })}
          <th class="l">Bundled under</th><th></th>
        </tr></thead>
        ${ownerBlocks.map(function (B) {
          var o = B.o, catNames = Object.keys(B.cats).sort();
          if (!B.ids.length || (filtering && !catNames.length)) return null;
          var oCollapsed = !!ui.owners[o.id];
          var rate = ownerHourlyRate(doc, o.id);
          return html`<tbody key=${o.id} class=${B.vis ? "" : "hidden-group"}>
            <tr class="group-row"><td class="l" colspan=${cols}>
              <button type="button" class="caret" aria-expanded=${!oCollapsed} aria-label=${(oCollapsed ? "Expand " : "Collapse ") + o.name}
                onClick=${function () { props.setUi(function (u) { u.owners[o.id] = !oCollapsed; }); }}>${oCollapsed ? "▸" : "▾"}</button>
              <strong>${o.name}</strong> <span class="muted small">· ${B.ids.length} services · ${money(rate, 2)}/hr</span>
              ${B.vis ? null : html` <span class="tag">hidden at ${VIEW_NAMES[view]}</span>`}
            </td></tr>
            ${oCollapsed ? null : catNames.map(function (c) {
              var ck = o.id + "|" + c, cCollapsed = !!ui.cats[ck], cIds = B.cats[c];
              return html`<${React.Fragment} key=${c}>
                <tr class="cat-row">
                  <td class="l" colspan="6">
                    <button type="button" class="caret small-caret" aria-expanded=${!cCollapsed} aria-label=${(cCollapsed ? "Expand " : "Collapse ") + c}
                      onClick=${function () { props.setUi(function (u) { u.cats[ck] = !cCollapsed; }); }}>${cCollapsed ? "▸" : "▾"}</button>
                    ${c} <span class="cat-count">${cIds.length}</span>
                  </td>
                  ${vt.map(function (t) {
                    var on = cIds.every(function (id) { return psk[id] && psk[id][t]; });
                    return html`<td key=${t} class="c"><button type="button" class="mini" title=${(on ? "Uncheck" : "Check") + " all " + c + " for " + TIER_SHORT[t]}
                      onClick=${function () { setAll(cIds, t, !on); }}>${on ? "none" : "all"}</button></td>`;
                  })}
                  <td colspan="2"></td>
                </tr>
                ${cCollapsed ? null : cIds.map(function (id) {
                  var svc = doc.MASTER[id], basis = doc.pbase[id] || "door_yr", hrs = doc.psh[id] || 0, f = psk[id] || {};
                  return html`<tr key=${id}>
                    <td class="l"><input type="text" class="name" id=${"sn-" + id} aria-label="Service name" value=${svc.n}
                      onChange=${function (e) { var val = e.target.value; update(function (d) { d.MASTER[id].n = val; }); }} />
                      ${basis === "door_yr" && scopeValue(doc, id) >= 200 ? html`<span class="tag warn-tag"
                        title=${money(scopeValue(doc, id)) + " per door per year is large. If this is a price per event, switch the unit to per event and set events per year."}>check unit</span>` : null}</td>
                    <td>${hrs ? html`<span class="mono muted">${money(scopeValue(doc, id), 2)}</span>` : html`<${Num} id=${"sv-" + id} cls="rate" label=${"Value of " + svc.n}
                      value=${doc.psv[id] != null ? doc.psv[id] : svc.dsv} min=${0} onChange=${function (val) { update(function (d) { d.psv[id] = val; }); }} />`}</td>
                    <td><${Num} id=${"sh-" + id} cls="small-num" label=${"Hours for " + svc.n} value=${hrs} min=${0}
                      onChange=${function (val) { update(function (d) { if (val) d.psh[id] = val; else delete d.psh[id]; }); }} /></td>
                    <td class="l"><select id=${"sb-" + id} aria-label="Unit" value=${basis}
                      onChange=${function (e) { var val = e.target.value; update(function (d) { d.pbase[id] = val; }); }}>
                      <option value="door_yr">per door / yr</option><option value="event">per turnover</option><option value="claim">per event</option>
                    </select></td>
                    <td>${basis === "claim" ? html`<${Num} id=${"se-" + id} cls="small-num" label="Events per year across the portfolio" value=${doc.ev[id] || 0} min=${0}
                      onChange=${function (val) { update(function (d) { d.ev[id] = val; }); }} /><span class="unit">/yr</span>` : null}</td>
                    <td class="mono muted">${money(scopePerDoorMo(doc, id), 2)}<${Info} label=${"How " + svc.n + " labor is calculated"} lines=${scopeFormulaLines(doc, id)} /></td>
                    ${vt.map(function (t) {
                      return html`<td key=${t} class="c"><input type="checkbox" id=${"psk-" + id + "-" + t} aria-label=${svc.n + " in " + TIER_SHORT[t]}
                        checked=${!!f[t]} onChange=${function () { toggle(id, t); }} /></td>`;
                    })}
                    <td class="l"><select id=${"so-" + id} aria-label="Bundled under" value=${doc.scopeOwner[id]}
                      onChange=${function (e) { var val = e.target.value; update(function (d) { d.scopeOwner[id] = val; }); }}>
                      ${owners.map(function (oo) { return html`<option key=${oo.id} value=${oo.id}>${oo.name}</option>`; })}
                    </select></td>
                    <td class="c"><button type="button" class="x" title="Send to bench" aria-label=${"Bench " + svc.n}
                      onClick=${function () { update(function (d) { d.place[id] = "uc"; }); }}>×</button></td>
                  </tr>`;
                })}
              </${React.Fragment}>`;
            })}
          </tbody>`;
        })}
      </table></div>
    </div>`;
  }

  /* ------------------------------ margin as you grow ------------------------------ */
  function GrowthTable(props) {
    var doc = props.doc, vt = props.visTiers, today = doc.G.doors;
    var n = props.ui.compareDoors || (today < 250 ? 250 : Math.round((today + 100) / 10) * 10);
    var now = props.today;
    var at = useMemo(function () { return marginsAt(doc, n, doc.cv); }, [doc, n]);
    function delta(a, b, fmt, cls) {
      var d = b - a;
      if (Math.abs(d) < 0.005) return html`<span class="muted">—</span>`;
      return html`<span class=${"mono " + (d > 0 === (cls !== "cost") ? "up" : "down")}>${d > 0 ? "+" : "−"}${fmt(Math.abs(d))}</span>`;
    }
    var mc = null;
    doc.CG.forEach(function (g) { g.rows.forEach(function (r) { if (r.id === "mc") mc = r; }); });

    return html`<div class="growth">
      <div class="growth-controls">
        <span>Compare today's <b class="mono">${fmtNum(today)}</b> doors with</span>
        <span class="affix sm"><${Num} id="compareDoors" value=${n} step=${10} min=${1} label="Door count to compare"
          onChange=${function (v) { props.setUi(function (u) { u.compareDoors = Math.max(1, Math.round(v)); }); }} /><span class="suf">doors</span></span>
        <${Info} label="What grows with doors" lines=${[
          "Grows with doors: anything charged per door (PM comp, per-door software, AppFolio), turnover costs, and your yearly counts of work orders, evictions, lease breaks, listings and guarantee claims.",
          "Stays at today's level: salaried roles (Maintenance coordinator, Process coordinator, Accounting), flat software and seats, and other yearly or monthly costs. Spreading those over more doors is where the margin gain comes from.",
          "Prices, add-on fees and checkboxes are the same as today. Shown at " + VIEW_NAMES[doc.cv] + "."
        ]} />
      </div>
      <div class="table-wrap"><table class="grid growth-grid">
        <thead>
          <tr>
            <th class="l" rowspan="2">Tier</th>
            <th colspan="3" class="c grp">Today · ${fmtNum(today)} doors</th>
            <th colspan="3" class="c grp">At ${fmtNum(n)} doors</th>
            <th colspan="2" class="c grp">Change</th>
          </tr>
          <tr>
            <th>Cost/door</th><th>Margin/door</th><th>Margin %</th>
            <th>Cost/door</th><th>Margin/door</th><th>Margin %</th>
            <th>Margin %</th><th>Margin / yr</th>
          </tr>
        </thead>
        <tbody>
          ${vt.map(function (t) {
            var a = now[t], b = at.margins[t];
            return html`<tr key=${t}>
              <td class="l"><strong>${TIER_SHORT[t]}</strong></td>
              <td class="mono">${money(a.cost, 2)}</td><td class="mono">${money(a.margin, 2)}</td><td class="mono">${pct(a.marginPct)}</td>
              <td class="mono">${money(b.cost, 2)}</td><td class="mono">${money(b.margin, 2)}</td><td class="mono">${pct(b.marginPct)}</td>
              <td>${delta(a.marginPct, b.marginPct, function (x) { return x.toFixed(1) + " pts"; })}</td>
              <td>${delta(a.portfolioMo * 12, b.portfolioMo * 12, function (x) { return money(x); })}</td>
            </tr>`;
          })}
        </tbody>
      </table></div>
      <p class="muted small growth-note">Staffing is held at today's level for now. Your rough capacity: a PM handles 200–300 doors (PM comp is already charged per door, so it grows here), an MC about 500, and a PC is effectively unlimited.</p>
      ${n > 500 && mc ? html`<p class="growth-flag">At ${fmtNum(n)} doors you'd likely need a second Maintenance coordinator (about ${money(cmo(mc, doc) * 12)}/yr), which isn't included above.</p>` : null}
    </div>`;
  }

  /* ------------------------------ add-on fees ------------------------------ */
  function AddonTable(props) {
    var doc = props.doc, update = props.update, vt = props.visTiers, cols = 10 + vt.length;
    function edit(id, fn) { update(function (d) { var a = d.addons.find(function (x) { return x.id === id; }); if (a) fn(a); }); }
    function add() {
      update(function (d) {
        d.addons.push({ id: "addon_" + Date.now().toString(36), name: "New fee", price: 0, cost: 0, basis: "events", amount: 0,
          tiers: { min: "off", special: "off", plus: "off" } });
      });
    }
    var unit = {
      wo: "% of " + fmtNum(doc.G.wo || 0) + " WOs", wo_rest: "% of WOs",
      evict: "% of " + fmtNum(doc.G.evictions || 0) + " evictions", evict_rest: "% of evictions",
      events: "/yr", door_yr: "/door/yr"
    };
    /* "Rest of" rows can differ by tier, so show them for the first tier on screen where the fee is offered. */
    function shownTier(a) {
      return vt.find(function (t) { return addonState(a, t) !== "off"; }) || TIERS.find(function (t) { return addonState(a, t) !== "off"; }) || vt[0];
    }

    return html`<div class="table-wrap"><table class="grid">
      <thead><tr>
        <th class="l">Fee</th><th>You charge</th><th>Your cost</th><th>PM split</th><th class="l">How often</th><th>Amount</th><th>Per yr</th><th class="l">Counts at</th><th>Net $/door/mo</th>
        ${vt.map(function (t) { return html`<th key=${t} class="c tiercol-wide">${TIER_SHORT[t]}</th>`; })}
        <th></th>
      </tr></thead>
      <tbody>
        ${doc.addons.map(function (a) {
          var ev = a.basis === "evict_billed";
          var st = shownTier(a), isRest = /_rest$/.test(a.basis), share = addonShare(doc, a, st);
          if (ev) st = vt[0];
          var n = addonEventsYr(doc, a, st), per = doc.G.doors ? n / 12 / doc.G.doors : 0;
          var fixed = addonFixedCost(doc, a);
          var costEach = addonCostEach(doc, a, "charged");
          var pmEach = costEach - fixed;
          var net = ((a.price || 0) - costEach) * per;
          return html`<tr key=${a.id}>
            <td class="l"><input type="text" class="name" id=${"an-" + a.id} aria-label="Fee name" value=${a.name}
              onChange=${function (e) { var v = e.target.value; edit(a.id, function (x) { x.name = v; }); }} /></td>
            <td><span class="dollar">$</span><${Num} id=${"ap-" + a.id} cls="rate" label=${"Price of " + a.name} value=${a.price || 0} min=${0}
              onChange=${function (v) { edit(a.id, function (x) { x.price = v; }); }} /></td>
            <td>${ev ? html`<span class="mono muted" title="Court fees, set under Assumptions → Evictions">${money(fixed)}</span>` : html`<span class="dollar">$</span><${Num} id=${"ac-" + a.id} cls="rate" label=${"Raynor's cost for " + a.name} value=${a.cost || 0} min=${0}
              onChange=${function (v) { edit(a.id, function (x) { x.cost = v; }); }} />`}</td>
            <td><${Num} id=${"as-" + a.id} cls="small-num" label=${"PM split of what " + a.name + " leaves after costs"} value=${a.split || 0} min=${0}
              onChange=${function (v) { edit(a.id, function (x) { x.split = Math.min(100, v); }); }} /><span class="unit">%</span></td>
            <td class="l">${ev ? html`<span class="muted small">Evictions not under a guarantee</span>` : html`<select id=${"ab-" + a.id} aria-label="How often" value=${a.basis}
              onChange=${function (e) { var v = e.target.value; edit(a.id, function (x) { x.basis = v; }); }}>
              ${ADDON_BASES_PICKABLE.concat(ADDON_BASES_PICKABLE.indexOf(a.basis) < 0 ? [a.basis] : []).map(function (b) { return html`<option key=${b} value=${b}>${ADDON_BASES[b]}</option>`; })}
            </select>`}</td>
            <td>${ev
              ? html`<span class="mono muted" title=${"For " + TIER_SHORT[st] + ". Tiers with the Eviction guarantee only bill the tenants Raynor didn't place."}>${fmtNum(Math.round(n * 10) / 10)} of ${fmtNum(doc.G.evictions || 0)}</span>`
              : isRest
              ? html`<span class="mono muted" title=${"Whatever the other rows in this pool don't claim, for " + TIER_SHORT[st]}>rest: ${fmtNum(Math.round(share * 10) / 10)}</span><span class="unit">${unit[a.basis]}</span>`
              : html`<${Num} id=${"aa-" + a.id} cls="small-num" label=${"How often " + a.name + " happens"} value=${a.amount || 0} min=${0}
                  onChange=${function (v) { edit(a.id, function (x) { x.amount = ADDON_POOL[x.basis] ? Math.min(100, v) : v; }); }} /><span class="unit">${unit[a.basis]}</span>`}</td>
            <td class="mono muted">${fmtNum(Math.round(n * 10) / 10)}</td>
            <td class="l">${ev ? html`<span class="muted small">every view</span>` : html`<select id=${"av-" + a.id} aria-label=${"Cost view where " + a.name + " starts counting"} value=${a.view || "direct"}
              onChange=${function (e) { var v = e.target.value; edit(a.id, function (x) { if (v === "direct") delete x.view; else x.view = v; }); }}>
              ${VIEWS.map(function (vw) { return html`<option key=${vw} value=${vw}>${VIEW_NAMES[vw]}</option>`; })}
            </select>`}</td>
            <td class="mono">${money(net, 2)}<${Info} label=${"How " + a.name + " is figured"} lines=${[
              money(a.price || 0) + " charged × " + fmtNum(Math.round(n * 10) / 10) + "/yr ÷ 12 ÷ " + fmtNum(doc.G.doors) + " doors = " + money((a.price || 0) * per, 2) + "/door/mo of revenue",
              "Each one: " + money(a.price || 0) + " charged − " + money(fixed) + (ev ? " court fees" : " paid out") +
                (a.split ? " − " + fmtNum(a.split) + "% of the remaining " + money(Math.max(0, (a.price || 0) - fixed)) + " to the PM (" + money(pmEach) + ")" : "") +
                " = " + money((a.price || 0) - costEach) + " kept. Net " + money(net, 2) + "/door/mo.",
              ev ? "For " + TIER_SHORT[st] + ": " + (evictionGuaranteed(doc, st)
                  ? "has the Eviction guarantee, so only the " + fmtNum(doc.G.evictNotPlacedPct || 0) + "% of evictions where Raynor didn't place the tenant are billed. The rest are in Cost lines → Eviction guarantee."
                  : evictionHandled(doc, st) ? "no Eviction guarantee, so every eviction is billed." : "Eviction service is off in Scope services, so nothing is billed.")
              : ADDON_POOL[a.basis]
                ? fmtNum(Math.round(share * 10) / 10) + "% of the " + fmtNum(ADDON_POOL[a.basis] === "wo" ? doc.G.wo || 0 : doc.G.evictions || 0) + (ADDON_POOL[a.basis] === "wo" ? " work orders" : " evictions") + " a year (Assumptions)" +
                  (isRest ? ": whatever the other " + (ADDON_POOL[a.basis] === "wo" ? "work-order" : "eviction") + " rows in " + TIER_SHORT[st] + " don't claim." : ".")
                : a.basis === "door_yr" ? fmtNum(a.amount || 0) + " per door a year × " + fmtNum(doc.G.doors) + " doors." : "Counted across the whole portfolio.",
              a.view ? "Counts only at " + VIEW_NAMES[a.view] + (a.view === "loaded" ? ", like the other guarantees." : " and up.") : "Counts at every view.",
              "Charged: you bill it and carry its cost. Included: you carry the cost but don't bill. Off: not offered."
            ]} /></td>
            ${vt.map(function (t) {
              if (ev) {
                var lbl = !evictionHandled(doc, t) ? "Off" : evictionGuaranteed(doc, t) ? "Non-placed" : "All";
                return html`<td key=${t} class="c"><span class="small muted" title=${"Follows the Eviction guarantee checkbox in Cost lines and the Eviction service in Scope services. " + fmtNum(Math.round(billedEvictionsYr(doc, t) * 10) / 10) + " billed/yr."}>${lbl}</span></td>`;
              }
              return html`<td key=${t} class="c"><select id=${"at-" + a.id + "-" + t} class=${"state " + a.tiers[t]} aria-label=${a.name + " for " + TIER_SHORT[t]} value=${a.tiers[t]}
                onChange=${function (e) { var v = e.target.value; edit(a.id, function (x) { x.tiers[t] = v; }); }}>
                ${ADDON_STATES.map(function (s) { return html`<option key=${s} value=${s}>${ADDON_STATE_NAMES[s]}</option>`; })}
              </select></td>`;
            })}
            <td class="c">${ev ? null : html`<button type="button" class="x" title="Remove fee" aria-label=${"Remove " + a.name}
              onClick=${function () { update(function (d) { d.addons = d.addons.filter(function (x) { return x.id !== a.id; }); }); }}>×</button>`}</td>
          </tr>`;
        })}
        <tr class="add-row"><td class="l" colspan=${cols}><button type="button" class="link" onClick=${add}>+ Add fee</button></td></tr>
      </tbody>
    </table></div>`;
  }

  function Bench(props) {
    var doc = props.doc, update = props.update;
    var ids = Object.keys(doc.MASTER).filter(function (id) { return doc.place[id] === "uc"; });
    var owners = bundleOwners(doc);
    if (!ids.length) return html`<p class="muted small pad">Nothing on the bench.</p>`;
    function promote(id, dest) {
      update(function (d) {
        var dt = d.MASTER[id].dt || { min: true, special: true, plus: true };
        if (dest === "scope") {
          d.place[id] = "scope";
          if (!d.scopeOwner[id] || !owners.some(function (o) { return o.id === d.scopeOwner[id]; })) d.scopeOwner[id] = owners.length ? (owners.find(function (o) { return o.id === "pm"; }) || owners[0]).id : "";
          d.templates.forEach(function (tp) { if (!tp.psk[id]) tp.psk[id] = Object.assign({}, dt); });
        } else {
          d.place[id] = "cost:" + dest;
          if (d.vl[id] == null) d.vl[id] = d.ucv[id] || 0;
          d.templates.forEach(function (tp) { if (!tp.ck[id]) tp.ck[id] = Object.assign({}, dt); });
        }
      });
    }
    return html`<ul class="bench">
      ${ids.map(function (id) {
        var svc = doc.MASTER[id];
        return html`<li key=${id}>
          <span class="bench-name">${svc.n}<span class="muted small"> · ${doc.icat[id] || svc.dc}</span></span>
          <select id=${"bench-" + id} aria-label=${"Add " + svc.n + " to"} value=""
            onChange=${function (e) { if (e.target.value) promote(id, e.target.value); }}>
            <option value="">Add to…</option>
            <option value="scope">Scope services (bundled)</option>
            ${doc.CG.map(function (g) { return html`<option key=${g.id} value=${g.id}>Cost line in ${g.label}</option>`; })}
          </select>
        </li>`;
      })}
    </ul>`;
  }

  /* ------------------------------ app ------------------------------ */
  function App() {
    var init = useMemo(load, []);
    var _d = useState(init.doc), doc = _d[0], setDoc = _d[1];
    var _s = useState(init.source), source = _s[0], setSource = _s[1];
    var _u = useState(loadUi), ui = _u[0], setUiState = _u[1];
    var _m = useState(null), msg = _m[0], setMsg = _m[1];
    var _j = useState(null), jsonOut = _j[0], setJsonOut = _j[1];
    var _r = useState(false), armReset = _r[0], setArmReset = _r[1];

    useEffect(function () {
      try { localStorage.setItem(STORE, JSON.stringify({ doc: doc, source: source })); } catch (e) {}
    }, [doc, source]);
    useEffect(function () {
      try { localStorage.setItem(UI_STORE, JSON.stringify(ui)); } catch (e) {}
    }, [ui]);

    function update(fn) { setDoc(function (d) { var n = clone(d); fn(n); return n; }); }
    function setUi(fn) { setUiState(function (u) { var n = clone(u); fn(n); return n; }); }
    function toggleOpen(k) { setUi(function (u) { u.open[k] = !u.open[k]; }); }

    var cost = useMemo(function () { return tierCost(doc, doc.cv); }, [doc]);
    var allViews = useMemo(function () {
      var o = {}; VIEWS.forEach(function (v) { o[v] = tierCost(doc, v); }); return o;
    }, [doc]);
    var margins = {};
    TIERS.forEach(function (t) { margins[t] = tierMargin(doc, t, cost.perDoor[t]); });
    var P = doc.pricing, G = doc.G;
    var focus = ui.focus, visTiers = focus === "all" ? TIERS : [focus];

    function onImport(e) {
      var file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var parsed = JSON.parse(reader.result);
          if (!validDoc(parsed)) throw new Error("shape");
          setDoc(normalizeDoc(parsed));
          setSource(file.name);
          setMsg({ kind: "good", text: "Loaded " + file.name + ". Every number below now comes from that scenario." });
        } catch (err) {
          setMsg({ kind: "bad", text: "That file isn't a scenario export. In the cost tool, open Edit model and use Export, then import that .json file here." });
        }
      };
      reader.readAsText(file);
    }

    function onCopy() {
      var text = JSON.stringify(doc, null, 2);
      var done = function () { setMsg({ kind: "good", text: "Scenario JSON copied. Save it as a .json file, then use Edit model → Import in the cost tool." }); };
      try {
        navigator.clipboard.writeText(text).then(done, function () { setJsonOut(text); });
      } catch (err) { setJsonOut(text); }
    }

    function onReset() {
      if (!armReset) { setArmReset(true); setTimeout(function () { setArmReset(false); }, 4000); return; }
      setArmReset(false);
      setDoc(normalizeDoc(SEED_DOC));
      setSource(SEED_LABEL);
      setMsg({ kind: "good", text: "Back to the seed model." });
    }

    var ck = activeTemplate(doc).ck;
    var costLineCount = 0, costOut = 0;
    forEachCostRow(doc, function (r) {
      costLineCount++;
      var f = ck[r.id] || {};
      if (visTiers.some(function (t) { return !f[t]; })) costOut++;
    });
    var scopeCount = scopeIds(doc).length;
    var benchCount = Object.keys(doc.MASTER).filter(function (id) { return doc.place[id] === "uc"; }).length;
    var outLabel = focus === "all" ? "left out of some tier" : "left out of " + TIER_SHORT[focus];

    return html`<div class="wrap">
      <header class="top">
        <div class="title-block">
          <div class="eyebrow">Raynor Realty · Internal</div>
          <h1>Package Margin Workbench</h1>
          <p class="sub">The cost model and the fee slider in one place. Check or uncheck any line or service for a tier, move its price, and the margin updates.</p>
        </div>
        <div class="actions">
          <span class="source" title="Where these numbers came from">Data: <b>${source}</b></span>
          <label class="btn" for="importFile">Import scenario</label>
          <input type="file" id="importFile" accept=".json,application/json" class="visually-hidden" onChange=${onImport} />
          <button type="button" class="btn" onClick=${onCopy}>Copy scenario JSON</button>
          <button type="button" class=${"btn" + (armReset ? " danger" : "")} onClick=${onReset}>${armReset ? "Click again to reset" : "Reset to seed"}</button>
        </div>
      </header>

      ${msg ? html`<div class=${"banner " + msg.kind} role="status"><span>${msg.text}</span>
        <button type="button" class="link" onClick=${function () { setMsg(null); }}>Dismiss</button></div>` : null}
      ${jsonOut ? html`<div class="card json-out"><div class="row-between"><strong>Scenario JSON</strong>
        <button type="button" class="link" onClick=${function () { setJsonOut(null); }}>Close</button></div>
        <p class="muted small">Copying was blocked here. Select all of the text below and copy it.</p>
        <textarea id="jsonOut" readOnly value=${jsonOut} onFocus=${function (e) { e.target.select(); }}></textarea></div>` : null}

      <div class="sticky">
        <div class="sticky-controls">
          <div class="seg" role="group" aria-label="Cost view">
            ${VIEWS.map(function (v) {
              return html`<button key=${v} type="button" class=${v === doc.cv ? "on" : ""} aria-pressed=${v === doc.cv}
                onClick=${function () { update(function (d) { d.cv = v; }); }}>${VIEW_NAMES[v]}</button>`;
            })}
          </div>
          <label class="focus-pick" for="focusPick">
            <span class="muted small">Focus</span>
            <select id="focusPick" value=${focus} onChange=${function (e) { var val = e.target.value; setUi(function (u) { u.focus = val; }); }}>
              <option value="all">All three tiers</option>
              ${TIERS.map(function (t) { return html`<option key=${t} value=${t}>${TIER_NAMES[t]}</option>`; })}
            </select>
          </label>
        </div>
        <div class="chips">
          ${TIERS.map(function (t) {
            var m = margins[t], v = verdict(m, P.targetPct), on = focus === t;
            return html`<button type="button" key=${t} class=${"chip " + v.cls + (on ? " on" : "") + (focus !== "all" && !on ? " faded" : "")}
              aria-pressed=${on} title=${on ? "Show all three tiers" : "Focus on " + TIER_NAMES[t]}
              onClick=${function () { setUi(function (u) { u.focus = on ? "all" : t; }); }}>
              <span class="chip-name">${TIER_SHORT[t]}</span>
              <span class="mono">${pct(P.tiers[t].monthlyPct, 2)}</span>
              <span class="mono muted">cost ${money(m.cost, 2)}</span>
              <span class="mono strong">${money(m.margin, 2)} · ${pct(m.marginPct)}</span>
            </button>`;
          })}
        </div>
      </div>

      <section class=${"tiers" + (focus === "all" ? "" : " single")}>
        ${visTiers.map(function (t) {
          return html`<${TierCard} key=${t} tier=${t} doc=${doc} margin=${margins[t]} cost=${cost} allViews=${allViews}
            update=${update} ui=${ui} toggleOpen=${toggleOpen} wide=${focus !== "all"} />`;
        })}
      </section>

      <${Section} id="growth" title="Margin as you grow" open=${ui.open.growth} onToggle=${function () { toggleOpen("growth"); }}
        summary=${"Today's " + G.doors + " doors vs. " + (ui.compareDoors || (G.doors < 250 ? 250 : Math.round((G.doors + 100) / 10) * 10)) + " doors"}>
        <${GrowthTable} doc=${doc} ui=${ui} setUi=${setUi} visTiers=${visTiers} today=${margins} />
      </${Section}>

      <${Section} id="assumptions" title="Assumptions" open=${ui.open.assumptions} onToggle=${function () { toggleOpen("assumptions"); }}
        summary=${G.doors + " doors · " + money(G.rent) + " rent · " + G.tenancy + "-yr tenancy · " + P.term + "-mo lease · " + P.targetPct + "% target" + (P.scopeSavings ? " · freed capacity counted" : "")}>
        <div class="assumptions">
          <div class="assume-group">
            <h3 class="sub-h">Portfolio</h3>
            <div class="fields">
              <${Field} id="g-doors" label="Doors" step=${1} min=${1} value=${G.doors} onChange=${function (v) { update(function (d) { d.G.doors = Math.max(1, Math.round(v)); d.af.rd = Math.max(0, d.G.doors - (d.af.cd || 0)); }); }} />
              <${Field} id="g-rent" label="Avg rent" prefix="$" step=${25} min=${0} value=${G.rent} onChange=${function (v) { update(function (d) { d.G.rent = v; }); }} />
              <${Field} id="g-tenancy" label="Avg tenancy" suffix="yrs" step=${0.5} min=${0.25} value=${G.tenancy} onChange=${function (v) { update(function (d) { d.G.tenancy = v; }); }} />
              <${Field} id="g-seats" label="Seats" step=${1} min=${0} value=${G.seats} onChange=${function (v) { update(function (d) { d.G.seats = v; }); }} />
              <${Field} id="g-listings" label="Listings" step=${1} min=${0} value=${G.listings} onChange=${function (v) { update(function (d) { d.G.listings = v; }); }} />
              <${Field} id="g-wo" label="Work orders" hint="/yr" step=${10} min=${0} value=${G.wo} onChange=${function (v) { update(function (d) { d.G.wo = v; }); }} />
              <${Field} id="g-hours" label="Work hours" hint="/yr" step=${40} min=${1} value=${G.hoursYr} onChange=${function (v) { update(function (d) { d.G.hoursYr = v; }); }} />
            </div>
          </div>
          <div class="assume-group">
            <h3 class="sub-h">Pricing</h3>
            <div class="fields">
              <${Field} id="p-term" label="Lease term" suffix="mo" step=${1} min=${1} value=${P.term} onChange=${function (v) { update(function (d) { d.pricing.term = Math.max(1, v); }); }} />
              <${Field} id="p-vac" label="Vacancy" hint="optional" suffix="%" step=${1} min=${0} max=${100} value=${P.vacancyPct} onChange=${function (v) { update(function (d) { d.pricing.vacancyPct = Math.min(100, v); }); }} />
              <${Field} id="p-target" label="Target margin" suffix="%" step=${1} min=${0} max=${95} value=${P.targetPct} onChange=${function (v) { update(function (d) { d.pricing.targetPct = Math.min(95, v); }); }} />
            </div>
            <h3 class="sub-h">Evictions</h3>
            <div class="fields">
              <${Field} id="g-evictions" label="Evictions" hint="/yr" step=${1} min=${0} value=${G.evictions} onChange=${function (v) { update(function (d) { d.G.evictions = v; }); }} />
              <${Field} id="g-court" label="Court fees" hint="each" prefix="$" step=${1} min=${0} value=${G.courtFee} onChange=${function (v) { update(function (d) { d.G.courtFee = v; }); }} />
              <${Field} id="g-notplaced" label="Tenant we didn't place" suffix="%" step=${5} min=${0} max=${100} value=${G.evictNotPlacedPct} onChange=${function (v) { update(function (d) { d.G.evictNotPlacedPct = Math.min(100, v); }); }} />
            </div>
            <p class="muted small">Shared by both eviction lines. Court fees are $96 + $30 per tenant. Where a tier has the Eviction guarantee (Cost lines), evictions of tenants Raynor placed cost Raynor the court fees. Every other eviction is billed $750 (Add-on fees).</p>
            <label class="switch" for="p-savings">
              <input type="checkbox" id="p-savings" checked=${P.scopeSavings} onChange=${function (e) { var on = e.target.checked; update(function (d) { d.pricing.scopeSavings = on; }); }} />
              <span>Count PM capacity freed by stripped services as a cost saving</span>
            </label>
            <p class="muted small">Scope services ride on staff comp. When a tier leaves one out, the hours it would have taken are freed. Off shows that figure on each card without changing cost. On takes it off the tier's cost. Items dismissed with Ignore in the cost tool never count.</p>
          </div>
          <div class="assume-group">
            <h3 class="sub-h">AppFolio</h3>
            <div class="fields">
              <${Field} id="af-rr" label="Res. rate" prefix="$" step=${0.01} min=${0} value=${doc.af.rr} onChange=${function (v) { update(function (d) { d.af.rr = v; }); }} />
              <div class="field">
                <span class="field-label">Res. units <span class="hint">= Doors − com.</span></span>
                <span class="affix readonly"><span class="mono">${fmtNum(doc.af.rd)}</span></span>
              </div>
              <${Field} id="af-cr" label="Com. rate" prefix="$" step=${0.01} min=${0} value=${doc.af.cr} onChange=${function (v) { update(function (d) { d.af.cr = v; }); }} />
              <${Field} id="af-cd" label="Com. units" step=${1} min=${0} value=${doc.af.cd} onChange=${function (v) { update(function (d) { d.af.cd = Math.min(v, d.G.doors); d.af.rd = Math.max(0, d.G.doors - d.af.cd); }); }} />
            </div>
            <label class="switch" for="af-ic">
              <input type="checkbox" id="af-ic" checked=${!!doc.af.ic} onChange=${function (e) { var on = e.target.checked; update(function (d) { d.af.ic = on ? 1 : 0; }); }} />
              <span>Include commercial units</span>
            </label>
            ${doc.templates.length > 1 ? html`<label class="field" for="tpl"><span class="field-label">Checkbox preset</span>
              <select id="tpl" value=${doc.at} onChange=${function (e) { var val = e.target.value; update(function (d) { d.at = val; }); }}>
                ${doc.templates.map(function (tp) { return html`<option key=${tp.id} value=${tp.id}>${tp.name}</option>`; })}
              </select></label>` : null}
          </div>
        </div>
      </${Section}>

      <${Section} id="cost" title="Cost lines" open=${ui.open.cost} onToggle=${function () { toggleOpen("cost"); }}
        summary=${costLineCount + " lines · " + costOut + " " + outLabel}
        intro=${"Everything Raynor pays to deliver the packages. Uncheck a line for a tier to take its cost out of that tier. Lines set to a heavier view than " + VIEW_NAMES[doc.cv] + " are dimmed and don't count right now."}>
        <${CostTable} doc=${doc} update=${update} ui=${ui} setUi=${setUi} focus=${focus} visTiers=${visTiers} />
      </${Section}>

      <${Section} id="scope" title="Scope services" open=${ui.open.scope} onToggle=${function () { toggleOpen("scope"); }}
        summary=${scopeCount + " services · capacity freed per door: " + visTiers.map(function (t) { return TIER_SHORT[t] + " " + money(cost.freed[t], 2); }).join(", ")}
        intro="What each tier promises, bundled under the staff role that does the work. Value is the labor it takes, per door per year or per event. Entering hours prices it at that role's hourly rate. Leaving a service out of a tier frees that labor.">
        <${ScopeTable} doc=${doc} update=${update} ui=${ui} setUi=${setUi} focus=${focus} visTiers=${visTiers} />
      </${Section}>

      <${Section} id="addons" title="Add-on fees" open=${ui.open.addons} onToggle=${function () { toggleOpen("addons"); }}
        summary=${doc.addons.length + " fees · net per door: " + visTiers.map(function (t) { return TIER_SHORT[t] + " " + money(margins[t].addon.rev - margins[t].addon.cost, 2); }).join(", ")}
        intro="Fees billed to owners on top of the monthly, leasing and renewal price, like maintenance coordination. Set what you charge, what each one costs you, and how often it happens. Then choose Charged, Included or Off for each tier.">
        <${AddonTable} doc=${doc} update=${update} visTiers=${visTiers} />
      </${Section}>

      <${Section} id="bench" title="Bench" open=${ui.open.bench} onToggle=${function () { toggleOpen("bench"); }}
        summary=${benchCount + " services not offered yet"}
        intro="Services that aren't offered yet. Add one to the scope list or turn it into a cost line.">
        <${Bench} doc=${doc} update=${update} />
      </${Section}>

      <footer class="foot muted small">
        <p>Cost per door is the cost tool's own math, ported line for line (Minimum Management at Fully Allocated, 180 doors, seed data = $94.40). Edits and layout choices save in this browser only. Use Copy scenario JSON to carry numbers back to the cost tool.</p>
      </footer>
    </div>`;
  }

  ReactDOM.createRoot(document.getElementById("root")).render(h(App));
})();
