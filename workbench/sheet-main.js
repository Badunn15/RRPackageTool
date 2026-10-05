  /* ============================== Package Margin Sheet ============================== */
  var SHEET_STORE = "rr-margin-sheet-v1";
  var SHEET_UI = "rr-margin-sheet-ui-v1";
  var LAYER = {
    direct: { title: "Direct costs", margin: "Margin after direct costs", note: "What it takes to deliver the service." },
    allocated: { title: "Overhead", margin: "Margin after overhead", note: "Running the business: brokerage split, operating costs." },
    loaded: { title: "Leadership and guarantees", margin: "Fully loaded margin", note: "Executive pay and the guarantees you pay out." }
  };
  var BENCH_NOTE = "Industry rule of thumb: 10–20% net margin is healthy and 30–35% is top tier, measured fully loaded. Revenue per door commonly runs $130–175 a month.";

  function sheetLoad() {
    try {
      var raw = localStorage.getItem(SHEET_STORE);
      if (raw) { var s = JSON.parse(raw); if (s && validDoc(s.doc)) return { doc: normalizeDoc(s.doc), source: s.source || SEED_LABEL }; }
    } catch (e) {}
    return { doc: normalizeDoc(SEED_DOC), source: SEED_LABEL };
  }
  function sheetUi() {
    var ui = { open: {}, panel: null, sel: null, q: "", compareDoors: null, focus: "all" };
    try {
      var s = JSON.parse(localStorage.getItem(SHEET_UI) || "null");
      if (s) { ui.open = s.open || {}; ui.compareDoors = typeof s.compareDoors === "number" ? s.compareDoors : null; }
    } catch (e) {}
    return ui;
  }

  /* Services split the way a pricing page reads: what differs between packages, and what every package gets. */
  function serviceSplit(doc) {
    var psk = activeTemplate(doc).psk, differ = [], every = [], none = [];
    scopeIds(doc).forEach(function (id) {
      var f = psk[id] || {}, on = TIERS.filter(function (t) { return f[t]; }).length;
      (on === 3 ? every : on === 0 ? none : differ).push(id);
    });
    return { differ: differ.concat(none), every: every };
  }
  function lineMeta(doc, r) {
    var v = doc.vl[r.id] != null ? doc.vl[r.id] : r.v, ev = doc.ev[r.id] != null ? doc.ev[r.id] : (r.n_ev || 0);
    if (r.id === "lease_brk") return "tier's leasing fee × " + fmtNum(ev) + " breaks/yr";
    if (r.id === "evict_g") return money(doc.G.courtFee || 0) + " court fees × guaranteed evictions";
    if (r.e === "af") return "AppFolio, per unit";
    if (r.e === "claim") return money(v) + " × " + fmtNum(ev) + "/yr";
    if (r.e === "annual") return money(v) + "/yr";
    return money(v, v % 1 ? 2 : 0) + " " + BASIS_NAMES[r.e].replace("$", "");
  }
  function match(q, name) { return !q || name.toLowerCase().indexOf(q.toLowerCase()) >= 0; }

  function DeltaLine(props) {
    if (TIERS.every(function (t) { return Math.abs(props.d[t].door) < 0.005; })) {
      return html`<div class="deltas"><span class="same">No change to the ${VIEW_NAMES[props.view]} margin${props.view !== "loaded" ? ". It may only count further down the sheet." : "."}</span></div>`;
    }
    return html`<div class="deltas">${TIERS.map(function (t) {
      var d = props.d[t], cls = Math.abs(d.door) < 0.005 ? "same" : d.door > 0 ? "up" : "down";
      return html`<span key=${t} class=${cls}>${TIER_SHORT[t]} ${cls === "same" ? "no change" : (d.door > 0 ? "+" : "−") + money(Math.abs(d.door), 2) + " (" + (d.pts > 0 ? "+" : "−") + Math.abs(d.pts).toFixed(1) + " pts)"}</span>`;
    })}</div>`;
  }

  /* One row of the sheet: a label cell and one cell per tier. */
  function Row(props) {
    return html`<tr class=${(props.cls || "") + (props.lvl ? " lvl" + props.lvl : "")}>
      <td><div class="lbl">${props.label}</div></td>
      ${TIERS.map(function (t) { return html`<td key=${t} class="v">${props.cell(t)}</td>`; })}
    </tr>`;
  }
  function Caret(props) {
    return html`<button type="button" class="caret" aria-expanded=${props.open} aria-label=${(props.open ? "Collapse " : "Expand ") + props.name}
      onClick=${props.onClick}>${props.open ? "▾" : "▸"}</button>`;
  }
  function Name(props) {
    return html`<button type="button" class="name" onClick=${props.onClick} title="Open details">${props.children}</button>`;
  }

  function Sheet(props) {
    var doc = props.doc, C = props.C, P = doc.pricing, G = doc.G, ui = props.ui, update = props.update;
    var open = ui.open, q = ui.q, ck = activeTemplate(doc).ck, psk = activeTemplate(doc).psk;
    var doors = G.doors || 1, head = doc.cv;
    function isOpen(k) { return !!open[k] || !!q; }
    function toggle(k) { props.setUi(function (u) { u.open[k] = !u.open[k]; }); }
    function sel(kind, id) { props.setUi(function (u) { u.sel = { kind: kind, id: id }; u.panel = null; }); }
    var rows = [];
    function sec(n, title, note, key) {
      rows.push(html`<tr key=${"sec-" + key} class="sec"><td colspan="4"><div class="sec-t"><span class="n">${n}</span><h2>${title}</h2><p>${note}</p></div></td></tr>`);
    }
    function subh(text, key) { rows.push(html`<tr key=${"sh-" + key} class="subh"><td colspan="4">${text}</td></tr>`); }
    function push(key, el) { rows.push(h(React.Fragment, { key: key }, el)); }

    /* ---------- 1. Price ---------- */
    sec("1", "What the owner pays", "Each package's price. Break-even and target show the lowest monthly fee that covers cost or hits your " + P.targetPct + "% target at " + VIEW_NAMES[head] + ".", "price");
    push("p-m", html`<${Row} label=${html`<span class="plain">Monthly fee</span><span class="meta">% of rent</span>`} cell=${function (t) {
      var p = P.tiers[t], m = C.margins[t];
      var be = monthlyPctFor(doc, t, m.baseCost, 0), tg = monthlyPctFor(doc, t, m.baseCost, P.targetPct);
      return html`<div class="cellc"><span class="sub">${money(p.monthlyPct / 100 * G.rent)}</span>
        <${Affix} id=${"pm-" + t} suffix="%" cls="w-sm" step=${0.25} min=${0} label=${TIER_NAMES[t] + " monthly fee"} value=${p.monthlyPct}
          onChange=${function (v) { update(function (d) { d.pricing.tiers[t].monthlyPct = Math.min(30, v); }, TIER_SHORT[t] + " monthly fee " + fmtNum(v) + "%"); }} /></div>
        <div class="sub" style=${{ marginTop: "3px" }}>break-even ${be == null ? ">25%" : pct(be, 2)} · target ${tg == null ? ">25%" : pct(tg, 2)}</div>`;
    }} />`);
    push("p-l", html`<${Row} label=${html`<span class="plain">Leasing fee</span><span class="meta">% of one month's rent, per placement</span>`} cell=${function (t) {
      var p = P.tiers[t];
      return html`<div class="cellc"><span class="sub">${money(p.leasePct / 100 * G.rent)}</span>
        <${Affix} id=${"pl-" + t} suffix="%" cls="w-sm" step=${5} min=${0} label=${TIER_NAMES[t] + " leasing fee"} value=${p.leasePct}
          onChange=${function (v) { update(function (d) { d.pricing.tiers[t].leasePct = v; }, TIER_SHORT[t] + " leasing fee " + fmtNum(v) + "%"); }} /></div>`;
    }} />`);
    push("p-r", html`<${Row} label=${html`<span class="plain">Renewal fee</span><span class="meta">flat, per renewal</span>`} cell=${function (t) {
      var p = P.tiers[t];
      return html`<div class="cellc"><${Affix} id=${"prn-" + t} prefix="$" cls="w-sm" step=${25} min=${0} label=${TIER_NAMES[t] + " renewal fee"} value=${p.renewal}
        onChange=${function (v) { update(function (d) { d.pricing.tiers[t].renewal = v; }, TIER_SHORT[t] + " renewal fee $" + fmtNum(v)); }} /></div>`;
    }} />`);
    var choiceOpen = !!open.choice;
    push("p-c", html`<${Row} cls="group" label=${html`<${Caret} open=${choiceOpen} name="owner's fee choice" onClick=${function () { toggle("choice"); }} />
      <span class="plain">Owner's fee choice</span><span class="meta">owners can trade monthly fee for up-front fees</span>
      <${Info} plain=${true} label="How the owner's fee choice works" lines=${[
        "An owner can take a lower monthly fee with bigger leasing and renewal fees, or a higher monthly fee with smaller ones. Each lease term costs them the same total.",
        "Past the point where the renewal fee reaches $0, renewal years pay Raynor more, so margin climbs. The range shows the worst and best margin across every pick."
      ]} />`} cell=${function (t) {
      var r = ownerChoiceRange(doc, t, C.margins[t].baseCost), shift = Math.abs(P.tiers[t].shift || 0) > 0.001;
      return html`<span class="small">${pct(r.lo.marginPct, 0)} to ${pct(r.hi.marginPct, 0)}</span>${shift ? html`<div class="sub">owner pick set</div>` : null}`;
    }} />`);
    if (choiceOpen) {
      push("p-c1", html`<${Row} lvl=${1} label=${html`<span class="plain">Owner picks monthly</span><span class="meta">standard is the price above</span>`} cell=${function (t) {
        var p = P.tiers[t], q2 = C.margins[t].rev.quote;
        return html`<div class="cellc"><${Affix} id=${"po-" + t} suffix="%" cls="w-sm" step=${0.25} min=${0} label=${TIER_NAMES[t] + " owner's pick"} value=${Math.round(q2.pct * 100) / 100}
          onChange=${function (v) { update(function (d) { var pp = d.pricing.tiers[t]; var f = priceFrame(pp, d.G.rent, d.pricing.term); pp.shift = Math.round((Math.min(v, f.zeroLeasePct) - pp.monthlyPct) * 100) / 100; }, TIER_SHORT[t] + " owner's pick " + fmtNum(v) + "%"); }} /></div>
          ${Math.abs(p.shift || 0) > 0.001 ? html`<div class="sub"><button type="button" class="link small" onClick=${function () { update(function (d) { d.pricing.tiers[t].shift = 0; }, TIER_SHORT[t] + " back to standard mix"); }}>back to standard</button></div>` : null}`;
      }} />`);
      push("p-c2", html`<${Row} lvl=${1} label=${html`<span class="plain">At that pick: leasing / renewal</span>`} cell=${function (t) {
        var q2 = C.margins[t].rev.quote; return html`<span class="small">${money(q2.leaseUp)} / ${money(q2.renewal)}</span>`;
      }} />`);
      push("p-c3", html`<${Row} lvl=${1} label=${html`<span class="plain">Renewal fee reaches $0 at</span>`} cell=${function (t) {
        return html`<span class="small">${pct(priceFrame(P.tiers[t], G.rent, P.term).zeroRenewalPct, 2)}</span>`;
      }} />`);
    }

    /* ---------- 2. What's included ---------- */
    sec("2", "What each package includes", "Guarantees, owner fees and services, side by side. Only the services that differ are listed; the rest are in every package.", "incl");
    var guar = doc.CG.find(function (g) { return g.id === "guar"; });
    if (guar) {
      subh("Guarantees", "g");
      groupRows(doc, guar).forEach(function (r) {
        var name = rowName(doc, r);
        if (!match(q, name)) return;
        var f = ck[r.id] || {};
        push("gi-" + r.id, html`<${Row} lvl=${1} cls=${ui.sel && ui.sel.id === r.id ? "hit" : ""} label=${html`<${Name} onClick=${function () { sel("cost", r.id); }}>${name}</${Name}><span class="meta">${lineMeta(doc, r)}</span>`}
          cell=${function (t) {
            var c = lineCost(doc, r, "guar", t, "loaded");
            return html`<label class="cellc" for=${"gi-" + r.id + "-" + t}><span class="sub">${f[t] ? money(c, 2) + "/door" : r.id === "lease_brk" ? "collects fee" : "not included"}</span>
              <input type="checkbox" id=${"gi-" + r.id + "-" + t} checked=${!!f[t]} aria-label=${name + " in " + TIER_SHORT[t]} onChange=${function () { toggleCk(update, "ck", r.id, t, name); }} /></label>`;
          }} />`);
      });
    }
    subh("Fees billed to the owner", "f");
    doc.addons.forEach(function (a) {
      if (!match(q, a.name)) return;
      var ev = a.basis === "evict_billed";
      push("fi-" + a.id, html`<${Row} lvl=${1} cls=${ui.sel && ui.sel.id === a.id ? "hit" : ""} label=${html`<${Name} onClick=${function () { sel("fee", a.id); }}>${a.name}</${Name}><span class="meta">${money(a.price || 0)}${ev ? ", evictions the guarantee doesn't cover" : ""}</span>`}
        cell=${function (t) {
          var it = C.margins[t].addon.items.find(function (x) { return x.addon.id === a.id; }), net = it ? it.rev - it.cost : 0;
          if (ev) {
            return html`<div class="cellc"><span class="sub">${fmtNum(Math.round(billedEvictionsYr(doc, t) * 10) / 10)}/yr</span><span class="locked">${!evictionHandled(doc, t) ? "Off" : evictionGuaranteed(doc, t) ? "Not placed only" : "All billed"}</span></div>`;
          }
          return html`<div class="cellc"><span class="sub">${it && Math.abs(net) > 0.004 ? (net >= 0 ? "+" : "") + money(net, 2) : ""}</span>
            <select id=${"fs-" + a.id + "-" + t} class=${"state " + a.tiers[t]} aria-label=${a.name + " for " + TIER_SHORT[t]} value=${a.tiers[t]}
              onChange=${function (e) { var v = e.target.value; update(function (d) { var x = d.addons.find(function (y) { return y.id === a.id; }); if (x) x.tiers[t] = v; }, a.name + ": " + TIER_SHORT[t] + " " + ADDON_STATE_NAMES[v].toLowerCase()); }}>
              ${ADDON_STATES.map(function (s) { return html`<option key=${s} value=${s}>${ADDON_STATE_NAMES[s]}</option>`; })}
            </select></div>`;
        }} />`);
    });
    if (!q) push("fi-add", html`<tr class="lvl1"><td colspan="4"><div class="lbl"><button type="button" class="link small" onClick=${function () {
      var id = "addon_" + Date.now().toString(36);
      update(function (d) { d.addons.push({ id: id, name: "New fee", price: 0, cost: 0, basis: "events", amount: 0, tiers: { min: "off", special: "off", plus: "off" } }); }, "Added a fee");
      sel("fee", id);
    }}>+ Add a fee</button></div></td></tr>`);

    var split = serviceSplit(doc);
    function svcRow(id, lvl) {
      var svc = doc.MASTER[id], f = psk[id] || {}, pd = scopePerDoorMo(doc, id), ign = activeTemplate(doc).exclIgnore || {};
      var warn = (doc.pbase[id] || "door_yr") === "door_yr" && scopeValue(doc, id) >= 200;
      push("sv-" + id, html`<${Row} lvl=${lvl} cls=${ui.sel && ui.sel.id === id ? "hit" : ""} label=${html`<${Name} onClick=${function () { sel("svc", id); }}>${svc.n}</${Name}>
        ${warn ? html`<span class="tag warn" title="Large per-door value. If it's a price per event, change the unit in its details.">check unit</span>` : null}
        ${id === EVICT_SVC ? html`<span class="tag link" title="Linked to the Eviction guarantee">linked</span>` : null}`}
        cell=${function (t) {
          return html`<label class="cellc" for=${"sk-" + id + "-" + t}><span class="sub">${f[t] ? "" : ign[id] && ign[id][t] ? "ignored" : pd > 0.004 ? "frees " + money(pd, 2) : "left out"}</span>
            <input type="checkbox" id=${"sk-" + id + "-" + t} checked=${!!f[t]} aria-label=${svc.n + " in " + TIER_SHORT[t]} onChange=${function () { toggleCk(update, "psk", id, t, svc.n); }} /></label>`;
        }} />`);
    }
    var diffShown = split.differ.filter(function (id) { return match(q, doc.MASTER[id].n); });
    subh("Services that differ between packages · " + split.differ.length, "sd");
    diffShown.forEach(function (id) { svcRow(id, 1); });
    var everyShown = split.every.filter(function (id) { return match(q, doc.MASTER[id].n); });
    var evOpen = isOpen("every");
    if (!q || everyShown.length) {
      push("sv-every", html`<${Row} cls="group" label=${html`<${Caret} open=${evOpen} name="services in every package" onClick=${function () { toggle("every"); }} />
        <span class="plain">In every package</span><span class="meta">${split.every.length} services</span>`} cell=${function (t) {
        return html`<span class="small">${C.cost.included[t]} of ${C.cost.possible} items</span>`;
      }} />`);
      if (evOpen) {
        var cats = {};
        everyShown.forEach(function (id) { var c = doc.icat[id] || doc.MASTER[id].dc; (cats[c] = cats[c] || []).push(id); });
        Object.keys(cats).sort().forEach(function (c) {
          push("cat-" + c, html`<tr class="lvl1"><td colspan="4"><div class="lbl small faint">${c}</div></td></tr>`);
          cats[c].forEach(function (id) { svcRow(id, 2); });
        });
      }
    }
    var bench = Object.keys(doc.MASTER).filter(function (id) { return doc.place[id] === "uc" && match(q, doc.MASTER[id].n); });
    var bOpen = isOpen("bench");
    push("bench", html`<${Row} cls="group" label=${html`<${Caret} open=${bOpen} name="services not offered yet" onClick=${function () { toggle("bench"); }} />
      <span class="plain">Not offered yet</span><span class="meta">${bench.length} ideas on the bench</span>`} cell=${function () { return null; }} />`);
    if (bOpen) bench.forEach(function (id) {
      var svc = doc.MASTER[id];
      push("b-" + id, html`<tr class="lvl1"><td colspan="4"><div class="lbl" style=${{ justifyContent: "space-between" }}><span>${svc.n} <span class="meta">· ${doc.icat[id] || svc.dc}</span></span>
        <select id=${"bench-" + id} aria-label=${"Offer " + svc.n + " as"} value="" onChange=${function (e) { if (e.target.value) props.promote(id, e.target.value); }}>
          <option value="">Offer it as…</option><option value="scope">A service</option>
          ${doc.CG.map(function (g) { return html`<option key=${g.id} value=${g.id}>A cost in ${g.label}</option>`; })}
        </select></div></td></tr>`);
    });

    /* ---------- 3. Revenue ---------- */
    sec("3", "What Raynor brings in", "Per door per month. One-time fees are spread over the year by how often they happen.", "rev");
    var addD = {};
    TIERS.forEach(function (t) { addD[t] = addonPerDoor(doc, t, "direct"); });
    [["Monthly fee", "mgmt", "The owner's monthly % × " + money(G.rent) + " average rent" + (P.vacancyPct ? ", less " + P.vacancyPct + "% vacancy." : ".")],
     ["Leasing fees", "leasing", "Leasing fee × " + C.margins.min.rev.turnsYr.toFixed(2) + " placements a year (1 ÷ " + fmtNum(G.tenancy) + "-yr tenancy) ÷ 12."],
     ["Renewal fees", "renewal", "Renewal fee × " + C.margins.min.rev.renewalsYr.toFixed(2) + " renewals a year ÷ 12."]].forEach(function (x) {
      push("r-" + x[1], html`<${Row} lvl=${1} label=${html`<span class="plain">${x[0]}</span><${Info} plain=${true} lines=${[x[2]]} />`} cell=${function (t) { return money(C.margins[t].rev[x[1]], 2); }} />`);
    });
    push("r-add", html`<${Row} lvl=${1} label=${html`<span class="plain">Fees billed to owners</span><${Info} plain=${true} lines=${["What owners pay for the fees in section 2, spread per door per month. What those fees cost Raynor is under Direct costs."]} />`}
      cell=${function (t) { return money(addD[t].rev, 2); }} />`);
    push("r-tot", html`<${Row} cls="total" label=${html`<span class="plain">Revenue per door</span><${Info} plain=${true} lines=${[BENCH_NOTE]} />`}
      cell=${function (t) { return money(C.margins[t].rev.total + addD[t].rev, 2); }} />`);

    /* ---------- 4. Costs, layer by layer ---------- */
    sec("4", "What Raynor spends, and what's left", "Costs in three layers with the margin after each. Click a group to see its lines; click a line to edit it. The starred margin drives the header and the targets.", "cost");
    var prev = null;
    VIEWS.forEach(function (v) {
      var L = LAYER[v];
      subh(L.title + " · " + L.note, "l-" + v);
      doc.CG.forEach(function (g) {
        var lrows = groupRows(doc, g).filter(function (r) { return rowView(doc, r.id, g.id) === v; });
        if (!lrows.length) return;
        var shownRows = lrows.filter(function (r) { return match(q, rowName(doc, r)); });
        if (q && !shownRows.length) return;
        var key = "g-" + v + "-" + g.id, gOpen = isOpen(key);
        var differ = lrows.some(function (r) { var f = ck[r.id] || {}; return !(f.min === f.special && f.special === f.plus); });
        push(key, html`<${Row} cls="group" label=${html`<${Caret} open=${gOpen} name=${g.label} onClick=${function () { toggle(key); }} />
          <span class="plain">${g.label}</span><span class="meta">${lrows.length} line${lrows.length > 1 ? "s" : ""}${differ ? " · differs by package" : ""}</span>`}
          cell=${function (t) { return money(lrows.reduce(function (s, r) { return s + lineCost(doc, r, g.id, t, v); }, 0), 2); }} />`);
        if (!gOpen) return;
        shownRows.forEach(function (r) {
          var name = rowName(doc, r), f = ck[r.id] || {};
          push("gl-" + r.id, html`<${Row} lvl=${1} cls=${ui.sel && ui.sel.id === r.id ? "hit" : ""} label=${html`<${Name} onClick=${function () { sel("cost", r.id); }}>${name}</${Name}><span class="meta">${lineMeta(doc, r)}</span>
            ${CALC_ROWS[r.id] ? html`<span class="tag link">linked</span>` : null}`}
            cell=${function (t) {
              return html`<label class="cellc" for=${"ck-" + r.id + "-" + t}><span>${f[t] ? money(lineCost(doc, r, g.id, t, v), 2) : html`<span class="sub">not charged</span>`}</span>
                <input type="checkbox" id=${"ck-" + r.id + "-" + t} checked=${!!f[t]} aria-label=${name + " in " + TIER_SHORT[t]} onChange=${function () { toggleCk(update, "ck", r.id, t, name); }} /></label>`;
            }} />`);
        });
        if (!q) push("ga-" + key, html`<tr class="lvl1"><td colspan="4"><div class="lbl" style=${{ gap: "14px" }}>
          <button type="button" class="link small" onClick=${function () { props.addLine(g.id, g.label); }}>+ Add a line to ${g.label}</button>
          <label class="small faint" for=${"gv-" + g.id}>Group counts in</label>
          <select id=${"gv-" + g.id} value=${doc.secView[g.id] || "direct"} onChange=${function (e) { var val = e.target.value; update(function (d) { d.secView[g.id] = val; }, g.label + " moved to " + LAYER[val].title); }}>
            ${VIEWS.map(function (vw) { return html`<option key=${vw} value=${vw}>${LAYER[vw].title}</option>`; })}
          </select></div></td></tr>`);
      });
      // Add-on fee costs, freed PM time and add-on revenue that start counting at this layer.
      var addNow = {}, addPrev = {};
      TIERS.forEach(function (t) { addNow[t] = addonPerDoor(doc, t, v); addPrev[t] = prev ? addonPerDoor(doc, t, prev) : { rev: 0, cost: 0 }; });
      if (TIERS.some(function (t) { return addNow[t].cost - addPrev[t].cost > 0.004; })) {
        push("ac-" + v, html`<${Row} cls="group" label=${html`<span class="plain" style=${{ paddingLeft: "24px" }}>Cost of fees billed to owners</span>
          <${Info} plain=${true} lines=${["Court fees and the PM's 50% split on billed evictions, plus any cost you set on a fee. Open a fee in section 2 for its math."]} />`}
          cell=${function (t) { return money(addNow[t].cost - addPrev[t].cost, 2); }} />`);
      }
      if (prev && TIERS.some(function (t) { return addNow[t].rev - addPrev[t].rev > 0.004; })) {
        push("ar-" + v, html`<${Row} cls="group" label=${html`<span class="plain" style=${{ paddingLeft: "24px" }}>Fee revenue counted from here</span>`}
          cell=${function (t) { return "+" + money(addNow[t].rev - addPrev[t].rev, 2); }} />`);
      }
      if (P.scopeSavings) {
        var fNow = C.allViews[v].freed, fPrev = prev ? C.allViews[prev].freed : { min: 0, special: 0, plus: 0 };
        if (TIERS.some(function (t) { return fNow[t] - fPrev[t] > 0.004; })) {
          push("fr-" + v, html`<${Row} cls="group" label=${html`<span class="plain" style=${{ paddingLeft: "24px" }}>Less PM time freed by services left out</span>`}
            cell=${function (t) { return "−" + money(fNow[t] - fPrev[t], 2); }} />`);
        }
      }
      var isHead = head === v;
      push("m-" + v, html`<${Row} cls=${"margin" + (isHead ? " head" : "")} label=${html`<span class="plain strong">${L.margin}</span>
        <button type="button" class="star" aria-pressed=${isHead} title=${isHead ? "This margin drives the header and targets" : "Use this margin in the header and for targets"}
          onClick=${function () { update(function (d) { d.cv = v; }, "Headline margin: " + L.margin); }}>${isHead ? "★ headline" : "☆ use as headline"}</button>
        ${v === "loaded" ? html`<${Info} plain=${true} lines=${[BENCH_NOTE]} />` : null}`}
        cell=${function (t) {
          var mm = tierMargin(doc, t, C.allViews[v].perDoor[t], v), vd = verdict(mm, P.targetPct);
          return html`<span class=${vd.cls}>${money(mm.margin, 2)}</span> <span class=${"small " + vd.cls}>${pct(mm.marginPct)}</span>`;
        }} />`);
      prev = v;
    });
    push("yr", html`<${Row} cls="total" label=${html`<span class="plain">Margin per year, all ${fmtNum(G.doors)} doors</span><${Info} plain=${true} lines=${["Headline margin per door × doors × 12, as if every door were on this package."]} />`}
      cell=${function (t) { return money(C.margins[t].portfolioMo * 12); }} />`);

    return html`<div class="sheet-wrap"><table class="sheet">
      <colgroup><col /><col class="c-tier" /><col class="c-tier" /><col class="c-tier" /></colgroup>
      <thead><tr><th>Per door, per month</th>${TIERS.map(function (t) {
        var m = C.margins[t], vd = verdict(m, P.targetPct);
        return html`<th key=${t}><div class="th-tier"><b>${TIER_NAMES[t]}</b><span class=${"m " + vd.cls}>${pct(m.marginPct)}</span>
          <span class="s">${money(m.margin, 2)}/door · <span class=${"pill " + vd.cls}>${vd.label}</span></span></div></th>`;
      })}</tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  }

  function NumbersPanel(props) {
    var doc = props.doc, update = props.update;
    return html`<div style=${{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <p class="note">The facts every other number is built on. Each one says what it drives.</p>
      ${FIELD_GROUPS.map(function (grp) {
        return html`<section key=${grp.title} class="fgroup"><h3>${grp.title}</h3>
          ${grp.fields.map(function (f) {
            var ctrl = f.readonly ? html`<span class="affix ro">${f.readonly(doc)}</span>`
              : f.toggle ? html`<input type="checkbox" id=${f.id} checked=${f.toggle(doc)} onChange=${function (e) { var on = e.target.checked; update(function (d) { f.setToggle(d, on); }, f.label + (on ? " on" : " off")); }} />`
              : html`<${Affix} id=${f.id} prefix=${f.prefix} suffix=${f.suffix} step=${f.step} min=${f.min} max=${f.max} label=${f.label} cls="w-lg"
                  value=${f.get(doc)} onChange=${function (v) { update(function (d) { f.set(d, v); }, f.label + " " + fmtNum(v)); }} />`;
            return html`<div key=${f.id} class="frow" id=${"row-" + f.id}><label for=${f.id}>${f.label}</label>${ctrl}<div class="help">${f.help}</div></div>`;
          })}
        </section>`;
      })}
      ${doc.templates.length > 1 ? html`<section class="fgroup"><h3>Checkbox preset</h3><div class="frow"><label for="f-tpl">Preset</label>
        <select id="f-tpl" value=${doc.at} onChange=${function (e) { var val = e.target.value; update(function (d) { d.at = val; }, "Checkbox preset"); }}>
          ${doc.templates.map(function (tp) { return html`<option key=${tp.id} value=${tp.id}>${tp.name}</option>`; })}
        </select><div class="help">Which saved set of package checkboxes from the cost tool to use.</div></div></section>` : null}
    </div>`;
  }

  function GrowthBlock(props) {
    var doc = props.doc, today = doc.G.doors, C = props.C;
    var n = props.ui.compareDoors || (today < 250 ? 250 : Math.round((today + 100) / 10) * 10);
    var at = useMemo(function () { return marginsAt(doc, n, doc.cv); }, [doc, n]);
    var mc = null;
    doc.CG.forEach(function (g) { g.rows.forEach(function (r) { if (r.id === "mc") mc = r; }); });
    function delta(a, b, fmt) {
      var d = b - a;
      if (Math.abs(d) < 0.005) return html`<span class="faint">—</span>`;
      return html`<span class=${"strong " + (d > 0 ? "good" : "bad")}>${d > 0 ? "+" : "−"}${fmt(Math.abs(d))}</span>`;
    }
    return html`<section class="growth" aria-labelledby="growth-h">
      <div class="growth-h"><h2 id="growth-h">If you grow</h2>
        <span class="small muted">Compare today's ${fmtNum(today)} doors with</span>
        <${Affix} id="compareDoors" value=${n} step=${10} min=${1} suffix="doors" label="Door count to compare"
          onChange=${function (v) { props.setUi(function (u) { u.compareDoors = Math.max(1, Math.round(v)); }); }} />
        <${Info} plain=${true} label="What grows with doors" lines=${[
          "Grows: anything per door (PM pay, per-door software, AppFolio), turnover costs, and yearly counts of work orders, evictions, lease breaks, listings and guarantee claims.",
          "Stays: salaried roles, flat software and seats, and other yearly or monthly costs. Spreading those over more doors is where the gain comes from.",
          "Prices, fees and checkboxes stay as they are. Uses the headline margin (" + VIEW_NAMES[doc.cv] + ")."
        ]} />
      </div>
      <div style=${{ overflowX: "auto" }}><table>
        <thead><tr><th>Package</th><th>Cost/door now</th><th>Margin now</th><th>Cost/door at ${fmtNum(n)}</th><th>Margin at ${fmtNum(n)}</th><th>Change</th><th>Margin/yr change</th></tr></thead>
        <tbody>${TIERS.map(function (t) {
          var a = C.margins[t], b = at.margins[t];
          return html`<tr key=${t}><td>${TIER_NAMES[t]}</td><td>${money(a.cost, 2)}</td><td>${money(a.margin, 2)} · ${pct(a.marginPct)}</td>
            <td>${money(b.cost, 2)}</td><td>${money(b.margin, 2)} · ${pct(b.marginPct)}</td>
            <td>${delta(a.marginPct, b.marginPct, function (x) { return x.toFixed(1) + " pts"; })}</td>
            <td>${delta(a.portfolioMo * 12, b.portfolioMo * 12, function (x) { return money(x); })}</td></tr>`;
        })}</tbody>
      </table></div>
      <p class="note">Staffing is held at today's level. Rough capacity: a PM handles 200–300 doors (PM pay is already per door, so it grows here), a maintenance coordinator about 500, a process coordinator is effectively unlimited.</p>
      ${n > 500 && mc ? html`<p class="growth-flag">At ${fmtNum(n)} doors you'd likely need a second Maintenance coordinator (about ${money(cmo(mc, doc) * 12)}/yr), which isn't included above.</p>` : null}
    </section>`;
  }

  function SheetApp() {
    var init = useMemo(sheetLoad, []);
    var _d = useState(init.doc), doc = _d[0], setDoc = _d[1];
    var docRef = useRef(init.doc);
    var _s = useState(init.source), source = _s[0], setSource = _s[1];
    var _u = useState(sheetUi), ui = _u[0], setUiState = _u[1];
    var _h = useState([]), hist = _h[0], setHist = _h[1];
    var _t = useState(false), toast = _t[0], setToast = _t[1];
    var _m = useState(null), msg = _m[0], setMsg = _m[1];
    var _j = useState(null), jsonOut = _j[0], setJsonOut = _j[1];
    var _r = useState(false), armReset = _r[0], setArmReset = _r[1];
    var _o = useState(false), menu = _o[0], setMenu = _o[1];
    var _f = useState(null), pendingField = _f[0], setPendingField = _f[1];
    var toastTimer = useRef(null);

    useEffect(function () { try { localStorage.setItem(SHEET_STORE, JSON.stringify({ doc: doc, source: source })); } catch (e) {} }, [doc, source]);
    useEffect(function () { try { localStorage.setItem(SHEET_UI, JSON.stringify({ open: ui.open, compareDoors: ui.compareDoors })); } catch (e) {} }, [ui]);
    useEffect(function () {
      if (!menu) return;
      function close(e) { if (!e.target.closest(".menu-wrap")) setMenu(false); }
      function esc(e) { if (e.key === "Escape") setMenu(false); }
      document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
      return function () { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
    }, [menu]);
    useEffect(function () {
      function key(e) {
        if (e.key === "Escape" && !menu) setUi(function (u) { u.sel = null; u.panel = null; });
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey && !e.target.closest("input,textarea,select")) { e.preventDefault(); undo(); }
      }
      document.addEventListener("keydown", key);
      return function () { document.removeEventListener("keydown", key); };
    });
    useEffect(function () {
      if (!pendingField) return;
      var el = document.getElementById(pendingField), row = document.getElementById("row-" + pendingField);
      if (el) { el.scrollIntoView({ block: "center" }); el.focus({ preventScroll: true }); }
      if (row) { row.classList.remove("flash"); void row.offsetWidth; row.classList.add("flash"); }
      setPendingField(null);
    }, [pendingField, ui.panel]);

    function showToast() {
      setToast(true);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(function () { setToast(false); }, 9000);
    }
    /* Every edit goes through here: it records how each package's headline margin moved, so it can be undone. */
    function update(fn, label) {
      var prev = docRef.current, next = clone(prev);
      fn(next);
      docRef.current = next; setDoc(next);
      var now = Date.now();
      label = label || "Edit";
      setHist(function (hs) {
        var last = hs[0], merge = last && last.key === label.replace(/[\d.,$%]+/g, "#") && now - last.at < 2500;
        var base = merge ? last.before : prev;
        return [{ label: label, key: label.replace(/[\d.,$%]+/g, "#"), before: base, at: now, view: next.cv, deltas: deltasBetween(base, next) }].concat(merge ? hs.slice(1) : hs).slice(0, 50);
      });
      showToast();
    }
    function undo() {
      setHist(function (hs) {
        if (!hs.length) return hs;
        docRef.current = hs[0].before; setDoc(hs[0].before);
        return hs.slice(1);
      });
      setToast(false);
    }
    function setUi(fn) { setUiState(function (u) { var n = clone(u); fn(n); return n; }); }
    function replaceDoc(d, src, text) { docRef.current = d; setDoc(d); setSource(src); setHist([]); setMsg({ kind: "good", text: text }); }
    function jump(x) {
      if (x.page === "data") { setMenu(true); return; }
      if (x.field) { setUi(function (u) { u.panel = "numbers"; u.sel = null; }); setPendingField(x.field); return; }
      if (x.sel) setUi(function (u) { u.sel = x.sel; u.panel = null; });
    }
    function addLine(gid, label) {
      var id = "row_" + Date.now().toString(36);
      update(function (d) {
        d.CG.find(function (x) { return x.id === gid; }).rows.push({ id: id, name: "New line", e: "monthly", v: 0 });
        d.vl[id] = 0;
        d.templates.forEach(function (tp) { tp.ck[id] = { min: true, special: true, plus: true }; });
      }, "Added a line to " + label);
      setUi(function (u) { u.sel = { kind: "cost", id: id }; u.panel = null; });
    }
    function promote(id, dest) {
      var owners = bundleOwners(doc), svc = doc.MASTER[id];
      update(function (d) {
        var dt = d.MASTER[id].dt || { min: true, special: true, plus: true };
        if (dest === "scope") {
          d.place[id] = "scope";
          if (!d.scopeOwner[id] || !owners.some(function (o) { return o.id === d.scopeOwner[id]; })) d.scopeOwner[id] = owners.length ? (owners.find(function (o) { return o.id === "pm"; }) || owners[0]).id : "";
          d.templates.forEach(function (tp) { if (!tp.psk[id]) tp.psk[id] = Object.assign({}, dt); });
        } else {
          d.place[id] = "cost:" + dest;
          if (d.vl[id] == null) d.vl[id] = (d.ucv && d.ucv[id]) || 0;
          d.templates.forEach(function (tp) { if (!tp.ck[id]) tp.ck[id] = Object.assign({}, dt); });
        }
      }, "Offered " + svc.n);
      setUi(function (u) { u.sel = { kind: dest === "scope" ? "svc" : "cost", id: id }; u.panel = null; });
    }

    var C = useMemo(function () { return compute(doc); }, [doc]);
    var todo = needsInput(doc, source);

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
      var done = function () { setMsg({ kind: "good", text: "Scenario JSON copied. Save it as a .json file to import into the cost tool, Workbench or Planner." }); };
      try { navigator.clipboard.writeText(text).then(done, function () { setJsonOut(text); }); } catch (err) { setJsonOut(text); }
      setMenu(false);
    }
    function onReset() {
      if (!armReset) { setArmReset(true); setTimeout(function () { setArmReset(false); }, 4000); return; }
      setArmReset(false); setMenu(false);
      replaceDoc(normalizeDoc(SEED_DOC), SEED_LABEL, "Back to the seed model.");
    }

    var sel = ui.sel, panel = ui.panel, drawer = null;
    var close = function () { setUi(function (u) { u.sel = null; u.panel = null; }); };
    if (panel === "numbers") drawer = { title: "Business numbers", body: html`<${NumbersPanel} doc=${doc} update=${update} />` };
    else if (panel === "todo") drawer = { title: "Needs your numbers", body: todo.length ? html`<ul class="todo">${todo.map(function (x, i) {
      return html`<li key=${i}><div class="what"><b>${x.title}</b><div>${x.text}</div></div>
        <button type="button" class="btn sm" onClick=${function () { jump(x); }}>${x.page === "data" ? "Open Data" : "Go"}</button></li>`;
    })}</ul>` : html`<p class="note">Nothing flagged. Every placeholder has a number.</p>` };
    else if (sel && sel.kind === "cost") drawer = { title: "Cost line", body: html`<${CostInspector} doc=${doc} C=${C} id=${sel.id} update=${update} setUi=${setUi} />` };
    else if (sel && sel.kind === "svc") drawer = { title: "Service", body: html`<${ServiceInspector} doc=${doc} C=${C} id=${sel.id} update=${update} setUi=${setUi} />` };
    else if (sel && sel.kind === "fee") drawer = { title: "Owner fee", body: html`<${FeeInspector} doc=${doc} C=${C} id=${sel.id} update=${update} setUi=${setUi} />` };

    var last = hist[0];
    return html`<div>
      <header class="bar">
        <div class="brand"><span>Raynor Realty · Internal</span><b>Package Margin Sheet</b></div>
        <div class="bar-actions">
          <button type="button" class="btn" disabled=${!hist.length} onClick=${undo} title=${last ? "Undo: " + last.label + " (Ctrl/Cmd+Z)" : "Nothing to undo"}>Undo</button>
          <button type="button" class="btn" aria-pressed=${panel === "numbers"} onClick=${function () { setUi(function (u) { u.panel = u.panel === "numbers" ? null : "numbers"; u.sel = null; }); }}>Business numbers</button>
          <button type="button" class="btn" aria-pressed=${panel === "todo"} onClick=${function () { setUi(function (u) { u.panel = u.panel === "todo" ? null : "todo"; u.sel = null; }); }}>
            Placeholders ${todo.length ? html`<span class="count">${todo.length}</span>` : null}</button>
          <span class="src" title=${"Numbers from: " + source}>${source === SEED_LABEL ? "Seed numbers" : source}</span>
          <div class="menu-wrap">
            <button type="button" class="btn" aria-expanded=${menu} onClick=${function () { setMenu(!menu); }}>Data ▾</button>
            ${menu ? html`<div class="menu" role="dialog" aria-label="Scenario data">
              <p class="small"><b>Numbers from:</b> ${source}</p>
              <p class="small muted">Edits save in this browser only. To use live numbers, export from the cost tool (Edit model → Export) and import the file here.</p>
              <label class="btn primary" for="importFile">Import scenario (.json)</label>
              <input type="file" id="importFile" accept=".json,application/json" class="visually-hidden" onChange=${onImport} />
              <button type="button" class="btn" onClick=${onCopy}>Copy scenario JSON</button>
              <button type="button" class=${"btn" + (armReset ? " danger" : "")} onClick=${onReset}>${armReset ? "Click again to reset" : "Reset to seed numbers"}</button>
            </div>` : null}
          </div>
        </div>
      </header>
      <main class="wrap">
        <div class="intro">
          <div><h1>Is each package making money?</h1>
            <p>Read it top to bottom: what the owner pays, what each package includes, what Raynor brings in, then costs in three layers with the margin left after each. Every package is a column.</p></div>
          <input type="search" id="find" class="find" placeholder="Find a line, service or fee" aria-label="Find a line, service or fee" value=${ui.q}
            onChange=${function (e) { var v = e.target.value; setUi(function (u) { u.q = v; }); }} />
        </div>
        ${msg ? html`<div class=${"banner " + msg.kind} role="status"><span>${msg.text}</span><button type="button" class="link" onClick=${function () { setMsg(null); }}>Dismiss</button></div>` : null}
        ${jsonOut ? html`<section class="growth json-out"><div class="growth-h"><h2>Scenario JSON</h2><button type="button" class="link" onClick=${function () { setJsonOut(null); }}>Close</button></div>
          <p class="note">Copying was blocked here. Select all of the text below and copy it.</p>
          <textarea id="jsonOut" readOnly value=${jsonOut} onFocus=${function (e) { e.target.select(); }}></textarea></section>` : null}
        <${Sheet} doc=${doc} C=${C} ui=${ui} setUi=${setUi} update=${update} addLine=${addLine} promote=${promote} />
        <${GrowthBlock} doc=${doc} C=${C} ui=${ui} setUi=${setUi} />
      </main>
      ${drawer ? html`<aside class="drawer" aria-label=${drawer.title}>
        <div class="drawer-h"><h2>${drawer.title}</h2><button type="button" class="x" onClick=${close} aria-label="Close panel">Close</button></div>
        ${drawer.body}
      </aside>` : null}
      ${toast && last ? html`<div class="toast" role="status">
        <div class="t"><b>${last.label}</b><${DeltaLine} d=${last.deltas} view=${last.view} /></div>
        <button type="button" class="btn sm" onClick=${undo}>Undo</button>
        <button type="button" class="x" aria-label="Dismiss" onClick=${function () { setToast(false); }}>×</button>
      </div>` : null}
    </div>`;
  }

  ReactDOM.createRoot(document.getElementById("root")).render(h(SheetApp));
})();
