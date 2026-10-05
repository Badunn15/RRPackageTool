/* Package Margin Workbench engine: cost side ported from lib/calc.ts, price side from the owner fee-choice pricing file. */
var TIERS = ["min", "special", "plus"];
var TIER_NAMES = { min: "Minimum Management", special: "Raynor Special", plus: "Protection Plus" };
var TIER_SHORT = { min: "Minimum", special: "Special", plus: "Plus" };
var VIEWS = ["direct", "allocated", "loaded"];
var VIEW_NAMES = { direct: "Direct COGS", allocated: "Fully Allocated", loaded: "Fully Loaded" };
var VIEW_ORDER = { direct: 0, allocated: 1, loaded: 2 };
var BASES = ["annual", "monthly", "door", "door_yr", "seat", "listing", "event", "claim", "af"];
var BASIS_NAMES = {
  annual: "$/yr", monthly: "$/mo", door: "$/door/mo", door_yr: "$/door/yr", seat: "$/seat/mo",
  listing: "$/listing/mo", event: "$/turnover", claim: "$/claim", af: "AppFolio"
};

var DEFAULT_PRICING = {
  term: 12, vacancyPct: 0, targetPct: 20, scopeSavings: false,
  tiers: {
    min: { monthlyPct: 8, leasePct: 75, renewal: 250, shift: 0 },
    special: { monthlyPct: 10, leasePct: 75, renewal: 250, shift: 0 },
    plus: { monthlyPct: 12, leasePct: 75, renewal: 250, shift: 0 }
  }
};

/* Fees billed to owners on top of the monthly/leasing/renewal price. Per tier: charged (bill it), included (do it, don't bill), off (don't offer). */
var ADDON_STATES = ["charged", "included", "off"];
var ADDON_STATE_NAMES = { charged: "Charged", included: "Included", off: "Off" };
/*
 * How often an add-on happens. "Share of" bases take a % of a portfolio pool (work orders or evictions); "rest of"
 * bases take whatever share the other rows in that pool, active in the same tier, don't claim. So a $150 special
 * coordination at 10% leaves the $75 regular fee at 90%, never 110%.
 */
var ADDON_BASES = {
  wo: "Share of work orders", wo_rest: "Rest of work orders",
  evict: "Share of evictions", evict_rest: "Rest of evictions",
  evict_billed: "Evictions not under a guarantee",
  events: "Events / yr (portfolio)", door_yr: "Per door / yr",
  optional: "Optional add-on", bundle: "Owner benefits package"
};
/*
 * Two kinds of owner-paid extras live in doc.addons next to the per-use service fees (kind "fee"):
 *  - kind "addon" (basis optional): an extra an owner can buy on any tier. Per tier, charged = sold to the
 *    share of owners who buy it (uptake), included = every door gets it, off = not offered. It happens
 *    `freq` times per door a year; price and cost are per time.
 *  - kind "bundle" (basis bundle): an owner benefits package of add-ons for one monthly price. Its cost is
 *    the cost of the add-ons in it; uptake works the same way.
 */
var ADDON_STATE_LABELS = { fee: ADDON_STATE_NAMES, addon: { charged: "Sold", included: "Included", off: "Off" } };
/* Bases a user can pick for a fee. Evictions have exactly one billed row (evict_billed), so the eviction pool isn't offered. */
var ADDON_BASES_PICKABLE = ["wo", "wo_rest", "events", "door_yr"];
var ADDON_POOL = { wo: "wo", wo_rest: "wo", evict: "evict", evict_rest: "evict" };
var DEFAULT_ADDONS = [
  { id: "addon_coord", name: "Maintenance coordination fee", price: 75, cost: 0, basis: "wo_rest", amount: 0,
    tiers: { min: "charged", special: "included", plus: "included" } },
  { id: "addon_coord_special", name: "Coordination fee, special circumstance", price: 150, cost: 0, basis: "wo", amount: 0,
    tiers: { min: "charged", special: "included", plus: "included" } },
  EVICTION_ADDON()
];

/*
 * Evictions live in one place each (v5):
 *  - Billed to the owner ($750): this add-on. Court fees come out first, the rest splits 50/50 with the PM.
 *    It covers every eviction the tier handles that its guarantee doesn't: all of them without the guarantee, or
 *    the tenants Raynor didn't place with it.
 *  - Guaranteed (Raynor placed the tenant, tier has the guarantee): the Eviction guarantee cost line. Raynor pays
 *    court fees, no PM pay, plus the attorney cap on the rare eviction that needs one.
 * Which tiers have the guarantee is the Eviction guarantee checkbox; which tiers handle evictions at all is the
 * "Eviction service" scope checkbox. Evictions/yr, court fees and the non-placed share are shared Assumptions.
 */
function EVICTION_ADDON() {
  return { id: "addon_evict", name: "Eviction billed to owner", price: 750, cost: 0, split: 50, basis: "evict_billed", amount: 0,
    tiers: { min: "charged", special: "charged", plus: "charged" } };
}
var LEGACY_EVICTION_IDS = ["addon_evict_noguar", "addon_evict_noqualify", "addon_evict_covered"];
var EVICT_SVC = "ps_evict_svc";

/* Does this tier handle evictions? Follows the "Eviction service" scope checkbox when that service is in scope. */
function evictionHandled(doc, tier) {
  if (doc.place[EVICT_SVC] !== "scope") return true;
  var f = activeTemplate(doc).psk[EVICT_SVC];
  return !!(f && f[tier]);
}
function evictionGuaranteed(doc, tier) {
  var f = activeTemplate(doc).ck.evict_g;
  return evictionHandled(doc, tier) && !!(f && f[tier]);
}
function guaranteedEvictionsYr(doc) {
  return (doc.G.evictions || 0) * (1 - (doc.G.evictNotPlacedPct || 0) / 100);
}
function billedEvictionsYr(doc, tier) {
  if (!evictionHandled(doc, tier)) return 0;
  if (evictionGuaranteed(doc, tier)) return ((doc.G.evictions || 0) * (doc.G.evictNotPlacedPct || 0)) / 100;
  // A tier that sells the eviction guarantee as an add-on: owners who buy it aren't billed for evictions of tenants Raynor placed.
  var n = doc.G.evictions || 0;
  (doc.addons || []).forEach(function (a) {
    if (a.svc === "evict_g" && addonState(a, tier) === "charged") n -= guaranteedEvictionsYr(doc) * Math.min(1, (a.uptake || 0) / 100);
  });
  return n;
}

/* What one owner benefits package costs Raynor, and is worth à la carte, per door per year. */
function bundleItems(doc, b) {
  return (b.items || []).map(function (id) { return doc.addons.find(function (a) { return a.id === id; }); }).filter(Boolean);
}
/*
 * How often an optional add-on happens, per door per year, from its "How often" number and unit (a.per):
 * per door a year (default), per turnover (only when a unit turns over), per door a month, or a count a year across all doors.
 */
var ADDON_PER = { door_yr: "per door / yr", turnover: "per turnover", month: "per door / mo", portfolio_yr: "per year, all doors" };
function addonTimesPerDoorYr(doc, a) {
  var n = a.freq || 0, per = a.per || "door_yr";
  if (per === "turnover") return doc.G.tenancy > 0 ? n / doc.G.tenancy : 0;
  if (per === "month") return n * 12;
  if (per === "portfolio_yr") return doc.G.doors ? n / doc.G.doors : 0;
  return n;
}
function bundleCostPerDoorYr(doc, b) {
  return bundleItems(doc, b).reduce(function (s, a) { return s + (a.cost || 0) * addonTimesPerDoorYr(doc, a); }, 0);
}
function bundleValuePerDoorYr(doc, b) {
  return bundleItems(doc, b).reduce(function (s, a) { return s + (a.price || 0) * addonTimesPerDoorYr(doc, a); }, 0);
}

/* Raynor's fixed cost per occurrence. The billed eviction's is the court fee from Assumptions, shared with the guarantee line. */
function addonFixedCost(doc, a) {
  return a.basis === "evict_billed" ? doc.G.courtFee || 0 : a.cost || 0;
}

/* What one occurrence costs Raynor: its fixed cost, plus the PM's split of whatever the fee leaves after that cost (only when billed). */
function addonCostEach(doc, a, state) {
  var fixed = addonFixedCost(doc, a);
  if (state !== "charged") return fixed;
  return fixed + ((a.split || 0) / 100) * Math.max(0, (a.price || 0) - fixed);
}

function addonState(a, tier) { return (a.tiers && a.tiers[tier]) || "off"; }

/* % of its pool an add-on covers in a tier: its own share, or for a "rest" row, 100% minus the other active rows' shares. */
function addonShare(doc, a, tier) {
  var pool = ADDON_POOL[a.basis];
  if (!pool) return null;
  if (a.basis === pool) return a.amount || 0;
  var taken = 0;
  (doc.addons || []).forEach(function (x) {
    if (x.id !== a.id && ADDON_POOL[x.basis] === pool && x.basis === pool && addonState(x, tier) !== "off") taken += x.amount || 0;
  });
  return Math.max(0, 100 - taken);
}

function addonEventsYr(doc, a, tier) {
  var pool = ADDON_POOL[a.basis];
  if (pool === "wo") return ((doc.G.wo || 0) * addonShare(doc, a, tier)) / 100;
  if (pool === "evict") return ((doc.G.evictions || 0) * addonShare(doc, a, tier)) / 100;
  if (a.basis === "evict_billed") return billedEvictionsYr(doc, tier);
  if (a.basis === "optional" || a.basis === "bundle") {
    var share = addonState(a, tier) === "included" ? 1 : (a.uptake || 0) / 100;
    return (doc.G.doors || 0) * share * (a.basis === "optional" ? addonTimesPerDoorYr(doc, a) : 1);
  }
  if (a.basis === "door_yr") return (a.amount || 0) * (doc.G.doors || 0);
  return a.amount || 0;
}

/* Add-on revenue and cost per door per month for a tier, at a cost view (an add-on can be set to count only from a view up). */
function addonPerDoor(doc, tier, view) {
  view = view || doc.cv;
  var doors = doc.G.doors || 0, out = { rev: 0, cost: 0, items: [] };
  (doc.addons || []).forEach(function (a) {
    // The billed eviction is always billed; which evictions it covers comes from the guarantee and service checkboxes.
    var state = a.basis === "evict_billed" ? "charged" : addonState(a, tier);
    if (state === "off" || !doors) return;
    if (a.view && !isVisible(a.view, view)) return;
    var eventsYr = addonEventsYr(doc, a, tier);
    var perDoorMo = eventsYr / 12 / (ADDON_POOL[a.basis] === "wo" ? allUnits(doc) : doors);
    var rev = state === "charged" ? (a.price || 0) * perDoorMo : 0;
    var cost = addonCostEach(doc, a, state) * perDoorMo;
    if (a.basis === "bundle") {
      // eventsYr here is owners on the package; its price is monthly and its cost is its add-ons' yearly cost.
      var on = eventsYr / doors;
      rev = state === "charged" ? (a.price || 0) * on : 0;
      cost = bundleCostPerDoorYr(doc, a) / 12 * on;
    }
    out.rev += rev; out.cost += cost;
    out.items.push({ addon: a, state: state, rev: rev, cost: cost, eventsYr: eventsYr, share: addonShare(doc, a, tier) });
  });
  return out;
}

/*
 * Guarantee lines whose cost the generic row math can't express. Their Guarantees checkbox is the only switch.
 *  - evict_g: court fees on every guaranteed eviction + the attorney cap × the rare times one is needed.
 *  - lease_brk: the tenant breaks the lease and the tier waives its leasing fee on the re-placement. The fee
 *    depends on the tier's price and the owner's pick, so it's figured per tier in tierMargin, not in tierCost.
 */
var CALC_ROWS = { evict_g: true, lease_brk: true };

function rowEv(doc, row) { return doc.ev[row.id] != null ? doc.ev[row.id] : (row.n_ev || 0); }
function findRow(doc, id) {
  var r = null;
  doc.CG.forEach(function (g) { g.rows.forEach(function (x) { if (x.id === id) r = x; }); });
  return r;
}

function leaseBreakCost(doc, tier, view, q) {
  var row = findRow(doc, "lease_brk"), doors = doc.G.doors || 0, f = activeTemplate(doc).ck.lease_brk || {};
  var out = { cost: 0, perYear: row ? rowEv(doc, row) : 0, waived: !!(row && f[tier]), counted: false, fee: q.leaseUp };
  if (!row) return out;
  out.counted = isVisible(rowView(doc, "lease_brk", "guar"), view || doc.cv);
  if (!doors || !out.counted || !out.waived) return out;
  out.cost = (q.leaseUp * out.perYear) / 12 / doors;
  return out;
}

/* A tier's lease-break waiver in $/mo for the whole portfolio at its current price and owner pick (for the cost table). */
function leaseBreakMo(doc, tier) {
  var p = doc.pricing.tiers[tier], q = quote(p, doc.G.rent, doc.pricing.term, splitPct(p, doc.G.rent, doc.pricing.term));
  var row = findRow(doc, "lease_brk");
  return row ? (q.leaseUp * rowEv(doc, row)) / 12 : 0;
}

/*
 * Keep checkboxes that describe the same thing in step. Called after a checkbox changes; kind is "ck" (cost line)
 * or "psk" (scope service). The eviction guarantee needs the tier to handle evictions, so turning the guarantee on
 * turns the Eviction service on, and turning the service off turns the guarantee off.
 */
function syncLinked(doc, tp, kind, id, tier) {
  // A service or cost line sold as an add-on: a tier that includes it doesn't also sell it, a tier that leaves it out can.
  if (kind === "psk" || kind === "ck") (doc.addons || []).forEach(function (a) {
    if (a.svc !== id || !a.tiers) return;
    var inTier = !!(tp[kind][id] && tp[kind][id][tier]);
    if (inTier) a.tiers[tier] = "off";
    else if (a.tiers[tier] === "off") a.tiers[tier] = "charged";
  });
  if (doc.place[EVICT_SVC] !== "scope") return;
  if (kind === "ck" && id === "evict_g" && tp.ck.evict_g && tp.ck.evict_g[tier]) {
    tp.psk[EVICT_SVC] = tp.psk[EVICT_SVC] || { min: false, special: false, plus: false };
    tp.psk[EVICT_SVC][tier] = true;
  }
  if (kind === "psk" && id === EVICT_SVC && !(tp.psk[EVICT_SVC] && tp.psk[EVICT_SVC][tier]) && tp.ck.evict_g) {
    tp.ck.evict_g[tier] = false;
  }
}

/*
 * Units. G.doors = long-term residential doors, the ones on the three packages. G.str (short-term rentals) and
 * G.comm (commercial) are other units Raynor manages. Costs that come with every unit (salaries, flat software,
 * overhead, per-unit software) are spread over all of them, so STR and commercial lower the cost per package door.
 * Turnovers, active listings and guarantees only happen on package doors, so they stay on those doors.
 */
/* AppFolio's residential units: package doors, plus STR when it's switched on (AppFolio bills STR as residential). */
function afResUnits(doc) { return (doc.G.doors || 0) + (doc.af.istr ? doc.G.str || 0 : 0); }
function otherUnits(doc) { return (doc.G.str || 0) + (doc.G.comm || 0); }
function allUnits(doc) { return (doc.G.doors || 0) + otherUnits(doc); }
/* Costs only package doors cause: turnovers, active listings (cameras and the like) and guarantees. */
function residentialOnly(row, gid) { return row.e === "event" || row.e === "listing" || gid === "guar"; }
function linePerDoor(doc, mo, row, gid) {
  if (!doc.G.doors) return 0;
  return residentialOnly(row, gid) ? mo / doc.G.doors : mo / allUnits(doc);
}

/* What STR and commercial bring in each month: STR at a % of income received, commercial at a % of rent plus other fees. */
function otherRevenueMo(doc) {
  var G = doc.G;
  var str = (G.str || 0) * (G.strIncome || 0) * (G.strPct || 0) / 100;
  var comm = (G.comm || 0) * ((G.commRent || 0) * (G.commPct || 0) / 100 + (G.commOtherYr || 0) / 12);
  return { str: str, comm: comm, total: str + comm };
}

function activeTemplate(doc) {
  return doc.templates.find(function (t) { return t.id === doc.at; }) || doc.templates[0];
}

/* A per-seat line uses its own seat count when one is set (doc.seats), otherwise the portfolio-wide Software seats. */
function seatsFor(doc, id) {
  return doc.seats && doc.seats[id] != null ? doc.seats[id] : doc.G.seats;
}

function cmo(row, doc) {
  var v = doc.vl[row.id] != null ? doc.vl[row.id] : row.v;
  var bd = doc.bd[row.id] != null ? doc.bd[row.id] : (row.n_bd || 0);
  var ev = doc.ev[row.id] != null ? doc.ev[row.id] : (row.n_ev || 0);
  var G = doc.G;
  // Guarantee lines figured their own way (see CALC_ROWS). lease_brk is per tier, so it adds nothing here.
  if (row.id === "evict_g") return (v * ev + (G.courtFee || 0) * guaranteedEvictionsYr(doc)) / 12;
  if (row.id === "lease_brk") return 0;
  switch (row.e) {
    case "annual": return (v * (1 + bd / 100)) / 12;
    case "monthly": return v;
    case "door": return v * allUnits(doc);
    case "door_yr": return (v * allUnits(doc)) / 12;
    case "seat": return v * seatsFor(doc, row.id);
    case "listing": return v * G.listings;
    case "event": return G.tenancy > 0 ? (v * G.doors) / (G.tenancy * 12) : 0;
    case "claim": return (v * ev) / 12;
    case "af": return doc.af.rr * doc.af.rd + (doc.af.ic ? doc.af.cr * doc.af.cd : 0);
    default: return 0;
  }
}

function rowView(doc, rowId, groupId) {
  return doc.itemView[rowId] || doc.secView[groupId] || "direct";
}
function isVisible(rv, view) { return VIEW_ORDER[rv] <= VIEW_ORDER[view]; }

function promotedRow(doc, id) {
  var p = doc.place[id];
  if (typeof p !== "string" || p.indexOf("cost:") !== 0) return null;
  var m = doc.MASTER[id];
  if (!m) return null;
  return { groupId: p.slice(5), row: { id: id, name: m.n, e: doc.pbase[id] || "door_yr", v: doc.vl[id] || 0, promoted: true } };
}

function groupRows(doc, group) {
  var rows = group.rows.slice();
  Object.keys(doc.place).forEach(function (id) {
    var pr = promotedRow(doc, id);
    if (pr && pr.groupId === group.id) rows.push(pr.row);
  });
  return rows;
}

function forEachCostRow(doc, fn) {
  doc.CG.forEach(function (g) { groupRows(doc, g).forEach(function (r) { fn(r, g.id); }); });
}

function ownerVisible(doc, ownerId, view) {
  for (var i = 0; i < doc.CG.length; i++) {
    var g = doc.CG[i];
    if (g.rows.some(function (r) { return r.id === ownerId; })) return isVisible(rowView(doc, ownerId, g.id), view);
  }
  return true;
}

function bundleOwners(doc) {
  var out = [];
  doc.CG.forEach(function (g) { g.rows.forEach(function (r) { if (r.pmScope === 1) out.push(r); }); });
  return out;
}

function ownerHourlyRate(doc, ownerId) {
  var row = bundleOwners(doc).find(function (r) { return r.id === ownerId; });
  if (!row || !doc.G.hoursYr) return 0;
  return (cmo(row, doc) * 12) / doc.G.hoursYr;
}

function scopeValue(doc, id) {
  var hrs = doc.psh[id];
  if (hrs) return ownerHourlyRate(doc, doc.scopeOwner[id]) * hrs;
  var svc = doc.MASTER[id];
  return doc.psv[id] != null ? doc.psv[id] : (svc ? svc.dsv : 0);
}

/* A scope service's labor value per door per month: $/door/yr / 12; $/event x events/yr / 12 / doors; or $/turnover, one turnover per door every tenancy. */
function scopePerDoorMo(doc, id) {
  var v = scopeValue(doc, id), basis = doc.pbase[id] || "door_yr";
  if (basis === "claim") return doc.G.doors ? (v * (doc.ev[id] || 0)) / 12 / doc.G.doors : 0;
  if (basis === "event") return doc.G.tenancy > 0 ? v / (doc.G.tenancy * 12) : 0;
  return v / 12;
}

function scopeIds(doc) {
  return Object.keys(doc.MASTER).filter(function (id) { return doc.place[id] === "scope"; });
}

/*
 * Per-tier cost per door at a view. Scope services ride on staff comp, so they add no cost; a
 * service a tier leaves out frees PM capacity worth its labor value ("freed"). That credit comes
 * off the tier's cost only when pricing.scopeSavings is on. Items the cost tool's "Ignore"
 * dismissed for a tier (exclIgnore) never count as freed.
 */
function tierCost(doc, view) {
  var tp = activeTemplate(doc), ck = tp.ck, psk = tp.psk, ign = tp.exclIgnore || {};
  var total = { min: 0, special: 0, plus: 0 }, freed = { min: 0, special: 0, plus: 0 }, freedCount = { min: 0, special: 0, plus: 0 };
  var included = { min: 0, special: 0, plus: 0 }, possible = 0;
  var shared = { min: 0, special: 0, plus: 0 }, sharedAny = 0;
  forEachCostRow(doc, function (row, gid) {
    if (!isVisible(rowView(doc, row.id, gid), view)) return;
    var m = cmo(row, doc), f = ck[row.id] || {}, res = residentialOnly(row, gid);
    if (gid !== "staff") possible++;
    if (!res && TIERS.some(function (t) { return f[t]; })) sharedAny += m;
    TIERS.forEach(function (t) {
      if (f[t]) { total[t] += m; if (!res) shared[t] += m; if (gid !== "staff") included[t]++; }
    });
  });
  scopeIds(doc).forEach(function (id) {
    var owner = doc.scopeOwner[id];
    if (owner && !ownerVisible(doc, owner, view)) return;
    possible++;
    var f = psk[id] || {}, pd = scopePerDoorMo(doc, id);
    TIERS.forEach(function (t) {
      if (f[t]) included[t]++;
      else if (!(ign[id] && ign[id][t]) && pd > 0) { freed[t] += pd; freedCount[t]++; }
    });
  });
  var doors = doc.G.doors || 0, units = allUnits(doc), perDoor = {}, base = {};
  var useSavings = doc.pricing && doc.pricing.scopeSavings;
  TIERS.forEach(function (t) {
    base[t] = doors ? shared[t] / units + (total[t] - shared[t]) / doors : 0;
    perDoor[t] = base[t] - (useSavings ? freed[t] : 0);
  });
  // STR and commercial carry their share of the costs every unit comes with.
  var other = otherUnits(doc), rev = otherRevenueMo(doc), otherCost = units ? sharedAny / units * other : 0;
  return { totalMo: total, base: base, perDoor: perDoor, freed: freed, freedCount: freedCount, included: included, possible: possible,
    units: units, sharedPerUnit: units ? sharedAny / units : 0,
    other: { units: other, revenueMo: rev.total, strRevenueMo: rev.str, commRevenueMo: rev.comm, costMo: otherCost, contributionMo: rev.total - otherCost } };
}

/* ---------- price side: owner fee choice ---------- */
function priceFrame(p, rent, term) {
  var anchor = (p.monthlyPct / 100) * rent;
  var turnTerm = anchor * term + (p.leasePct / 100) * rent;
  var renewTerm = anchor * term + p.renewal;
  return {
    anchor: anchor, turnTerm: turnTerm, renewTerm: renewTerm,
    zeroRenewalPct: rent > 0 && term > 0 ? (renewTerm / term / rent) * 100 : 0,
    zeroLeasePct: rent > 0 && term > 0 ? (turnTerm / term / rent) * 100 : 0
  };
}

function quote(p, rent, term, pct) {
  var f = priceFrame(p, rent, term);
  var monthly = (pct / 100) * rent;
  var perTerm = monthly * term;
  var leaseUp = Math.max(0, f.turnTerm - perTerm);
  var renewal = Math.max(0, f.renewTerm - perTerm);
  return {
    pct: pct, monthly: monthly, leaseUp: leaseUp, renewal: renewal, frame: f,
    dueAtSigning: leaseUp + monthly,
    zone: pct < f.zeroRenewalPct - 0.01 ? 0 : pct < f.zeroLeasePct - 0.01 ? 1 : 2
  };
}

function splitPct(p, rent, term) {
  var f = priceFrame(p, rent, term);
  return Math.min(Math.max(0, p.monthlyPct + (p.shift || 0)), f.zeroLeasePct);
}

/* Raynor revenue per door per month for a tier's pricing, at a given owner split. */
function revenuePerDoor(doc, p, pct) {
  var P = doc.pricing, G = doc.G;
  var q = quote(p, G.rent, P.term, pct);
  var tenancyMo = Math.max(1, G.tenancy * 12);
  var turnsYr = 12 / tenancyMo;
  var renewalsYr = Math.max(0, 12 / Math.max(1, P.term) - turnsYr);
  var mgmt = q.monthly * 12 * (1 - P.vacancyPct / 100);
  var leasing = q.leaseUp * turnsYr;
  var renewal = q.renewal * renewalsYr;
  return { quote: q, mgmt: mgmt / 12, leasing: leasing / 12, renewal: renewal / 12, total: (mgmt + leasing + renewal) / 12, turnsYr: turnsYr, renewalsYr: renewalsYr };
}

/*
 * Everything a tier brings in per door per month at an owner split (price revenue + add-on fees), and the
 * lease-break waiver cost at that split, since the waived leasing fee moves with the owner's pick.
 */
function tierRevenue(doc, tier, p, pct, view, addon) {
  var rev = revenuePerDoor(doc, p, pct);
  var lb = leaseBreakCost(doc, tier, view, rev.quote);
  return { rev: rev, lb: lb, total: rev.total + addon.rev };
}

function tierMargin(doc, tier, costPerDoor, view) {
  view = view || doc.cv;
  var p = doc.pricing.tiers[tier];
  var pct = splitPct(p, doc.G.rent, doc.pricing.term);
  var addon = addonPerDoor(doc, tier, view);
  var tr = tierRevenue(doc, tier, p, pct, view, addon);
  var revenue = tr.total, cost = costPerDoor + addon.cost + tr.lb.cost;
  var margin = revenue - cost;
  return {
    rev: tr.rev, addon: addon, leaseBreak: tr.lb, revenue: revenue, baseCost: costPerDoor, cost: cost, margin: margin,
    marginPct: revenue > 0 ? (margin / revenue) * 100 : (margin >= 0 ? 0 : -100),
    portfolioMo: margin * doc.G.doors
  };
}

/* Worst and best margin across every position on the owner's split slider. */
function ownerChoiceRange(doc, tier, costPerDoor, view) {
  view = view || doc.cv;
  var p = doc.pricing.tiers[tier], f = priceFrame(p, doc.G.rent, doc.pricing.term);
  var addon = addonPerDoor(doc, tier, view);
  costPerDoor = costPerDoor + addon.cost;
  var points = [f.zeroRenewalPct, f.zeroLeasePct];
  for (var x = 0; x <= f.zeroLeasePct; x += 0.05) points.push(x);
  var lo = null, hi = null;
  points.forEach(function (x) {
    var tr = tierRevenue(doc, tier, p, x, view, addon), r = tr.total;
    var m = r - costPerDoor - tr.lb.cost, row = { pct: x, rev: r, margin: m, marginPct: r > 0 ? (m / r) * 100 : (m >= 0 ? 0 : -100) };
    if (!lo || m < lo.margin - 1e-9) lo = row;
    if (!hi || m > hi.margin + 1e-9) hi = row;
  });
  return { lo: lo, hi: hi, zeroRenewalPct: f.zeroRenewalPct };
}

/* Lowest standard monthly % (owner split at standard) that reaches a margin %; null if nothing up to 25% does. */
function monthlyPctFor(doc, tier, costPerDoor, marginTarget, view) {
  view = view || doc.cv;
  var base = doc.pricing.tiers[tier];
  var addon = addonPerDoor(doc, tier, view);
  costPerDoor = costPerDoor + addon.cost;
  for (var a = 0; a <= 25.0001; a += 0.05) {
    var p = { monthlyPct: a, leasePct: base.leasePct, renewal: base.renewal, shift: 0 };
    var tr = tierRevenue(doc, tier, p, a, view, addon), rev = tr.total;
    if (rev <= 0) continue;
    if (((rev - costPerDoor - tr.lb.cost) / rev) * 100 >= marginTarget - 1e-9) return Math.round(a * 100) / 100;
  }
  return null;
}

/*
 * The same model at a different door count. Per-door things already scale. Portfolio-wide yearly counts (work orders,
 * evictions, lease breaks, active listings, guarantee and per-event counts, portfolio add-on events) grow in
 * proportion. AppFolio residential units follow doors. Salaried roles and software seats stay at today's level.
 */
function scaleToDoors(doc, n) {
  var d = JSON.parse(JSON.stringify(doc)), f = doc.G.doors ? n / doc.G.doors : 1;
  d.G.doors = n;
  d.G.wo = (d.G.wo || 0) * f;
  d.G.evictions = (d.G.evictions || 0) * f;
  d.G.listings = (d.G.listings || 0) * f;
  forEachCostRow(d, function (r) { if (r.e === "claim" && d.ev[r.id] == null && r.n_ev != null) d.ev[r.id] = r.n_ev; });
  Object.keys(d.ev).forEach(function (k) { d.ev[k] = (d.ev[k] || 0) * f; });
  (d.addons || []).forEach(function (a) { if (a.basis === "events") a.amount = (a.amount || 0) * f; });
  d.af.rd = afResUnits(d);
  return d;
}

/* ---------- acquisitions: a book of business added to today's portfolio ---------- */
function newDeal(doc) {
  var G = doc.G, D = G.doors || 1, n = 50;
  return { id: "deal_" + Date.now().toString(36), name: "New book of business", doors: n, rent: G.rent, tenancy: G.tenancy,
    wo: null, evictions: null, listings: null,
    comm: 0, mix: { min: 100, special: 0, plus: 0 }, lost: 10, price: 0, onetime: 0, staffYr: 0 };
}

/*
 * The portfolio after a deal. Doors kept = book doors less the owners expected to leave in year one. Per-door
 * costs, guarantee claims and other per-door counts scale with doors (as in scaleToDoors); the book's own work
 * orders, evictions, listings and commercial units are added on top of today's (less the same attrition).
 * Added staff or overhead becomes a direct cost line every package carries. Rent and tenancy stay each group's
 * own: margins for today's doors use today's, margins for the book's doors use the book's.
 */
/* A book's yearly count: the number typed in, or (left blank) the same rate per door as today's portfolio. */
function dealCount(doc, deal, key) {
  if (deal[key] != null && deal[key] !== '') return deal[key];
  return (deal.doors || 0) * (doc.G[key] || 0) / (doc.G.doors || 1);
}

function acquiredDoc(doc, deal, forBook) {
  var keep = 1 - Math.min(100, Math.max(0, deal.lost || 0)) / 100, add = (deal.doors || 0) * keep, D = doc.G.doors || 0;
  var d = scaleToDoors(doc, D + add), f = D ? (D + add) / D : 1;
  d.G.wo = (doc.G.wo || 0) + dealCount(doc, deal, 'wo') * keep;
  d.G.evictions = (doc.G.evictions || 0) + dealCount(doc, deal, 'evictions') * keep;
  d.G.listings = (doc.G.listings || 0) + dealCount(doc, deal, 'listings') * keep;
  d.G.comm = (doc.G.comm || 0) + (deal.comm || 0) * keep;
  d.af.cd = d.G.comm;
  d.af.rd = afResUnits(d);
  if (deal.staffYr) {
    var g = d.CG.find(function (x) { return x.id === "staff"; }) || d.CG[0];
    g.rows.push({ id: "acq_staff", name: "Added staff or overhead from the deal", e: "annual", v: deal.staffYr });
    d.vl.acq_staff = deal.staffYr;
    d.templates.forEach(function (t) { t.ck.acq_staff = { min: true, special: true, plus: true }; });
  }
  if (forBook) { d.G.rent = deal.rent || 0; d.G.tenancy = deal.tenancy || doc.G.tenancy; }
  return { doc: d, kept: add };
}

function acquisitionImpact(doc, deal, view) {
  view = view || doc.cv;
  var today = marginsAt(doc, doc.G.doors, view);
  var after = acquiredDoc(doc, deal, false), book = acquiredDoc(doc, deal, true);
  var cA = tierCost(after.doc, view), cB = tierCost(book.doc, view);
  var mix = deal.mix || {}, mixSum = TIERS.reduce(function (s, t) { return s + (mix[t] || 0); }, 0) || 1;
  var tiers = {}, bookYr = 0, bookRevYr = 0;
  TIERS.forEach(function (t) {
    var mA = tierMargin(after.doc, t, cA.perDoor[t], view), mB = tierMargin(book.doc, t, cB.perDoor[t], view);
    var doorsT = book.kept * (mix[t] || 0) / mixSum;
    tiers[t] = { today: today.margins[t], after: mA, book: mB, doors: doorsT, bookYr: doorsT * mB.margin * 12 };
    bookYr += tiers[t].bookYr; bookRevYr += doorsT * mB.revenue * 12;
  });
  var upfront = (deal.price || 0) + (deal.onetime || 0);
  return { tiers: tiers, kept: book.kept, doorsAfter: after.doc.G.doors, bookYr: bookYr, bookRevYr: bookRevYr, upfront: upfront,
    paybackMo: bookYr > 0 ? upfront / (bookYr / 12) : null, firstYearNet: bookYr - upfront, mixSum: mixSum, afterDoc: after.doc };
}

function marginsAt(doc, n, view) {
  view = view || doc.cv;
  var d = n === doc.G.doors ? doc : scaleToDoors(doc, n);
  var c = tierCost(d, view), out = {};
  TIERS.forEach(function (t) { out[t] = tierMargin(d, t, c.perDoor[t], view); });
  return { doc: d, cost: c, margins: out };
}

/* ---------- "how is this calculated" text, ported from lib/calc.ts formulaText ---------- */
function fmtN(n) { return n.toLocaleString("en-US", { maximumFractionDigits: 2 }); }
function usd(n) { return (n < 0 ? "-$" : "$") + fmtN(Math.abs(n)); }

function formulaLines(row, doc, groupId, view) {
  var v = doc.vl[row.id] != null ? doc.vl[row.id] : row.v;
  var G = doc.G, mo = cmo(row, doc), resOnly = residentialOnly(row, groupId);
  var perDoor = linePerDoor(doc, mo, row, groupId);
  var tail = " = " + usd(mo) + "/mo → " + usd(perDoor) + "/door/mo" + (otherUnits(doc) ? (resOnly ? " (package doors only)" : " (spread over " + fmtN(allUnits(doc)) + " units)") : "");
  var lines = [];
  if (CALC_ROWS[row.id]) return calcRowLines(row, doc, groupId, view);
  switch (row.e) {
    case "annual":
      var bd = doc.bd[row.id] != null ? doc.bd[row.id] : (row.n_bd || 0);
      lines.push(bd ? usd(v) + "/yr + " + fmtN(bd) + "% burden = " + usd(v * (1 + bd / 100)) + "/yr ÷ 12" + tail : usd(v) + "/yr ÷ 12" + tail);
      break;
    case "monthly": lines.push(usd(v) + "/mo" + tail); break;
    case "door": lines.push(usd(v) + "/unit/mo × " + fmtN(allUnits(doc)) + " units" + tail); break;
    case "door_yr": lines.push(usd(v) + "/unit/yr × " + fmtN(allUnits(doc)) + " units ÷ 12" + tail); break;
    case "seat": lines.push(usd(v) + "/seat/mo × " + fmtN(seatsFor(doc, row.id)) + " seats" + (doc.seats && doc.seats[row.id] != null ? " (this tool's own count)" : "") + tail); break;
    case "listing": lines.push(usd(v) + "/listing/mo × " + fmtN(G.listings) + " listings" + tail); break;
    case "event":
      lines.push(usd(v) + " per turnover × " + fmtN(G.doors) + " doors ÷ (" + fmtN(G.tenancy) + "-yr avg tenancy × 12)" + tail);
      lines.push("One turnover per door every " + fmtN(G.tenancy) + " years, so about " + fmtN(G.tenancy > 0 ? G.doors / G.tenancy : 0) + " turnovers a year across the portfolio.");
      break;
    case "claim":
      var ev = doc.ev[row.id] != null ? doc.ev[row.id] : (row.n_ev || 0);
      lines.push(usd(v) + " per event × " + fmtN(ev) + " events/yr across the portfolio ÷ 12" + tail);
      lines.push("Events are counted for the whole portfolio, then spread over all " + fmtN(G.doors) + " doors.");
      break;
    case "af":
      var af = doc.af;
      lines.push("Residential " + usd(af.rr) + " × " + fmtN(af.rd) + " units" + (af.istr ? "" : " (STR not included)") + (af.ic ? " + commercial " + usd(af.cr) + " × " + fmtN(af.cd) + " units" : " (commercial not included)") + tail);
      break;
  }
  var rv = rowView(doc, row.id, groupId);
  if (!isVisible(rv, view)) lines.push("Not counted at " + VIEW_NAMES[view] + ": this line only counts at " + VIEW_NAMES[rv] + ".");
  return lines;
}

function calcRowLines(row, doc, groupId, view) {
  var G = doc.G, lines = [], rv = rowView(doc, row.id, groupId), ev = rowEv(doc, row);
  if (row.id === "evict_g") {
    var v = doc.vl[row.id] != null ? doc.vl[row.id] : row.v, gy = guaranteedEvictionsYr(doc), mo = cmo(row, doc);
    lines.push(usd(G.courtFee || 0) + " court fees × " + fmtN(gy) + " guaranteed evictions/yr + " + usd(v) + " attorney × " + fmtN(ev) + " uses/yr, ÷ 12 = " + usd(mo) + "/mo → " + usd(G.doors ? mo / G.doors : 0) + "/door/mo");
    lines.push("Guaranteed evictions = " + fmtN(G.evictions || 0) + " evictions/yr × " + fmtN(100 - (G.evictNotPlacedPct || 0)) + "% where Raynor placed the tenant. Both are set under Assumptions → Evictions.");
    lines.push("No PM pay: the PM's time is already covered by salary. The attorney cap is almost never used.");
    lines.push("Checking a tier here gives it the guarantee. Every eviction it doesn't cover is billed to the owner under Add-on fees.");
  } else {
    lines.push("Each tier's own leasing fee × " + fmtN(ev) + " lease breaks/yr ÷ 12, for tiers checked here (they waive the fee on the re-placement).");
    var f = activeTemplate(doc).ck.lease_brk || {};
    TIERS.forEach(function (t) {
      lines.push(TIER_SHORT[t] + ": " + (f[t] ? usd(leaseBreakMo(doc, t)) + "/mo at its current price and owner pick." : "collects its leasing fee, $0."));
    });
    lines.push("It follows the owner's fee choice: a smaller leasing fee means less is waived.");
  }
  if (!isVisible(rv, view)) lines.push("Not counted at " + VIEW_NAMES[view] + ": this line only counts at " + VIEW_NAMES[rv] + ".");
  return lines;
}

function scopeFormulaLines(doc, id) {
  var G = doc.G, hrs = doc.psh[id], basis = doc.pbase[id] || "door_yr", v = scopeValue(doc, id), lines = [];
  if (hrs) {
    var owner = bundleOwners(doc).find(function (r) { return r.id === doc.scopeOwner[id]; });
    var rate = ownerHourlyRate(doc, doc.scopeOwner[id]);
    lines.push(fmtN(hrs) + " hrs × " + usd(rate) + "/hr = " + usd(v) + (basis === "claim" ? " per event" : basis === "event" ? " per turnover" : " per door per year"));
    if (owner) lines.push("Hourly rate: " + owner.name + " costs " + usd(cmo(owner, doc) * 12) + "/yr ÷ " + fmtN(G.hoursYr) + " work hours.");
  }
  if (basis === "claim") {
    var ev = doc.ev[id] || 0;
    lines.push(usd(v) + " per event × " + fmtN(ev) + " events/yr ÷ 12 ÷ " + fmtN(G.doors) + " doors = " + usd(scopePerDoorMo(doc, id)) + "/door/mo");
  } else if (basis === "event") {
    lines.push(usd(v) + " per turnover ÷ (" + fmtN(G.tenancy) + "-yr avg tenancy × 12) = " + usd(scopePerDoorMo(doc, id)) + "/door/mo");
    lines.push("About " + fmtN(G.tenancy > 0 ? Math.round(G.doors / G.tenancy) : 0) + " turnovers a year across " + fmtN(G.doors) + " doors.");
  } else {
    lines.push(usd(v) + "/door/yr ÷ 12 = " + usd(scopePerDoorMo(doc, id)) + "/door/mo");
  }
  lines.push("This is labor, not added cost. A tier that leaves the service out frees this much PM capacity.");
  return lines;
}

function normalizeDoc(raw) {
  var d = JSON.parse(JSON.stringify(raw));
  ["vl", "bd", "ev", "psv", "psh", "pbase", "place", "scopeOwner", "icat", "itemView", "secView", "MASTER", "removed", "udest", "seats"].forEach(function (k) {
    if (!d[k] || typeof d[k] !== "object") d[k] = {};
  });
  if (!Array.isArray(d.CATS)) d.CATS = [];
  if (!Array.isArray(d.acq)) d.acq = [];
  if (!d.cv) d.cv = "allocated";
  // Same backfill as the cost tool's lib/migrate.ts: a cost line with no tier checkboxes yet counts for every tier,
  // and a catalog service with none takes its default tiers.
  d.templates.forEach(function (t) {
    t.ck = t.ck || {}; t.psk = t.psk || {}; t.exclIgnore = t.exclIgnore || {};
    d.CG.forEach(function (g) { g.rows.forEach(function (r) { if (!t.ck[r.id]) t.ck[r.id] = { min: true, special: true, plus: true }; }); });
    Object.keys(d.MASTER).forEach(function (id) {
      var dt = d.MASTER[id].dt || { min: true, special: true, plus: true };
      if (!t.ck[id]) t.ck[id] = { min: dt.min, special: dt.special, plus: dt.plus };
      if (!t.psk[id]) t.psk[id] = { min: dt.min, special: dt.special, plus: dt.plus };
    });
  });
  if (!d.templates.some(function (t) { return t.id === d.at; })) d.at = d.templates[0].id;
  if (d.G.hoursYr == null) d.G.hoursYr = 2080;
  if (d.G.wo == null) d.G.wo = 0;
  if (!Array.isArray(d.addons)) d.addons = JSON.parse(JSON.stringify(DEFAULT_ADDONS));
  d.addons.forEach(function (a) {
    a.tiers = a.tiers || {};
    TIERS.forEach(function (t) { if (ADDON_STATES.indexOf(a.tiers[t]) < 0) a.tiers[t] = "off"; });
    if (!ADDON_BASES[a.basis]) a.basis = "events";
    a.kind = a.basis === "optional" ? "addon" : a.basis === "bundle" ? "bundle" : "fee";
    if (a.kind !== "fee") { if (a.uptake == null) a.uptake = 0; }
    if (a.kind === "addon" && a.freq == null) a.freq = 1;
    if (a.kind === "bundle") a.items = Array.isArray(a.items) ? a.items : [];
  });
  var P = d.pricing || {};
  var ver = P.v || 1;
  // v3: eviction service moves out of scope labor into add-on fees (it's a $750 owner charge with a PM split, not salaried time).
  if (ver < 3 && d.psv.ps_evict_svc === 750 && !d.psh.ps_evict_svc) d.psv.ps_evict_svc = 0;

  function rowEvents(id) {
    if (d.ev[id] != null) return d.ev[id];
    var r = null;
    d.CG.forEach(function (g) { g.rows.forEach(function (x) { if (x.id === id) r = x; }); });
    return r && r.n_ev != null ? r.n_ev : null;
  }
  if (d.G.evictions == null) { var fe = rowEvents("evict_filing"); d.G.evictions = fe != null ? fe : 5; }

  // v4 (confirmed with the user 2026-09-25): only Protection Plus has the eviction guarantee, and it covers tenants
  // Raynor placed. Everyone else is billed $750. Court fees for every eviction now live in the eviction add-ons, so
  // the old filing-fee line stops counting. Attorney fees are almost never needed. Special coordination replaces the
  // $75 rather than adding to it. The $500 lease-break placeholder is replaced by the real lost fees (see leaseBreakLoss).
  if (ver < 4) {
    d.addons.forEach(function (a) {
      if (a.id === "addon_coord" && a.basis === "wo" && a.amount === 100) { a.basis = "wo_rest"; a.amount = 0; }
      if (a.id === "addon_evict_noguar" && a.basis === "events") { a.basis = "evict_rest"; a.amount = 0; a.name = "Eviction billed $750, tier has no guarantee"; }
      if (a.id === "addon_evict_noqualify" && a.basis === "events") {
        a.amount = d.G.evictions ? Math.min(100, ((a.amount || 0) / d.G.evictions) * 100) : 0;
        a.basis = "evict"; a.name = "Eviction billed $750, tenant we didn't place";
      }
    });
    d.templates.forEach(function (t) {
      if (t.ck.evict_g) { t.ck.evict_g.min = false; t.ck.evict_g.special = false; }
    });
    if (rowEvents("evict_g") != null) d.ev.evict_g = 0;
  }

  // v5: one home per guarantee. The three eviction add-ons become one billed row; the guaranteed court fees move
  // into the Eviction guarantee line; the old filing-fee line is removed. The lease-break waiver moves from
  // Assumptions back into its Guarantees line, whose tier checkboxes become "waives the leasing fee".
  if (ver < 5) {
    var byId = function (id) { return d.addons.find(function (a) { return a.id === id; }); };
    var nq = byId("addon_evict_noqualify"), ng = byId("addon_evict_noguar");
    if (d.G.evictNotPlacedPct == null) d.G.evictNotPlacedPct = nq && nq.basis === "evict" ? Math.min(100, nq.amount || 0) : 0;
    if (d.G.courtFee == null) {
      var fr = null;
      d.CG.forEach(function (g) { g.rows.forEach(function (x) { if (x.id === "evict_filing") fr = x; }); });
      d.G.courtFee = fr ? (d.vl.evict_filing != null ? d.vl.evict_filing : fr.v) : ng ? ng.cost : 126;
    }
    if (!d.addons.some(function (a) { return a.basis === "evict_billed"; })) {
      var ea = EVICTION_ADDON();
      if (ng) { ea.price = ng.price; ea.split = ng.split; }
      var at = d.addons.findIndex(function (a) { return LEGACY_EVICTION_IDS.indexOf(a.id) >= 0; });
      if (at < 0) d.addons.push(ea); else d.addons.splice(at, 0, ea);
    }
    d.addons = d.addons.filter(function (a) { return LEGACY_EVICTION_IDS.indexOf(a.id) < 0; });
    d.CG.forEach(function (g) { g.rows = g.rows.filter(function (x) { return x.id !== "evict_filing"; }); });
    d.templates.forEach(function (t) { delete t.ck.evict_filing; });
    delete d.vl.evict_filing; delete d.ev.evict_filing;
    d.removed.evict_filing = true;
    var LBo = P.leaseBreak || {}, w = Object.assign({ min: false, special: true, plus: true }, LBo.waived || {});
    if (LBo.perYear != null) d.ev.lease_brk = LBo.perYear;
    d.templates.forEach(function (t) { t.ck.lease_brk = { min: !!w.min, special: !!w.special, plus: !!w.plus }; });
    d.CG.forEach(function (g) {
      g.rows.forEach(function (x) { if (x.id === "lease_brk") { delete x.d; x.name = "Lease break waiver"; } });
    });
  }
  if (ver < 6 && d.G.comm == null) {
    d.G.comm = d.af.cd || 0;
    d.G.doors = Math.max(1, (d.G.doors || 0) - d.G.comm);
  }
  if (d.G.str == null) d.G.str = 0;
  if (d.G.comm == null) d.G.comm = 0;
  if (d.G.strIncome == null) d.G.strIncome = 0;
  if (d.G.strPct == null) d.G.strPct = 25;
  if (d.G.commRent == null) d.G.commRent = 0;
  if (d.G.commPct == null) d.G.commPct = 6;
  if (d.G.commOtherYr == null) d.G.commOtherYr = 0;
  if (d.G.courtFee == null) d.G.courtFee = 126;
  if (d.G.evictNotPlacedPct == null) d.G.evictNotPlacedPct = 0;
  if (!d.addons.some(function (a) { return a.basis === "evict_billed"; })) d.addons.push(EVICTION_ADDON());
  d.addons.forEach(function (a) { if (a.basis === "evict_billed") { a.tiers = { min: "charged", special: "charged", plus: "charged" }; delete a.view; } });

  // AppFolio bills per unit: STR counts as residential, commercial at its own rate.
  if (d.af.istr == null) d.af.istr = 1;
  d.af.rd = afResUnits(d);
  d.af.cd = d.G.comm || 0;
  // v1 defaulted vacancy to 4% (an owner-side assumption from the fee-choice pricing file). Raynor only collects fees once a renter is placed, so v2 defaults it to 0.
  var vacancy = P.vacancyPct != null && (P.v || 1) >= 2 ? P.vacancyPct : (P.vacancyPct != null && P.vacancyPct !== 4 ? P.vacancyPct : DEFAULT_PRICING.vacancyPct);
  d.pricing = {
    v: 6,
    term: P.term != null ? P.term : DEFAULT_PRICING.term,
    vacancyPct: vacancy,
    targetPct: P.targetPct != null ? P.targetPct : DEFAULT_PRICING.targetPct,
    scopeSavings: !!P.scopeSavings,
    tiers: {}
  };
  TIERS.forEach(function (t) {
    d.pricing.tiers[t] = Object.assign({}, DEFAULT_PRICING.tiers[t], (P.tiers && P.tiers[t]) || {});
  });
  return d;
}

function validDoc(d) {
  return d && typeof d === "object" && Array.isArray(d.CG) && Array.isArray(d.templates) && d.templates.length && d.G && d.af;
}

if (typeof module !== "undefined") {
  module.exports = { billedEvictionsYr: billedEvictionsYr, leaseBreakMo: leaseBreakMo, findRow: findRow, scopeValue: scopeValue, addonTimesPerDoorYr: addonTimesPerDoorYr, afResUnits: afResUnits, linePerDoor: linePerDoor, allUnits: allUnits, otherUnits: otherUnits, otherRevenueMo: otherRevenueMo, dealCount: dealCount, acquisitionImpact: acquisitionImpact, newDeal: newDeal, marginsAt: marginsAt, scaleToDoors: scaleToDoors, leaseBreakCost: leaseBreakCost, syncLinked: syncLinked, activeTemplate: activeTemplate, billedEvictionsYr: billedEvictionsYr, cmo: cmo, addonShare: addonShare, addonPerDoor: addonPerDoor, tierCost: tierCost, tierMargin: tierMargin, normalizeDoc: normalizeDoc, monthlyPctFor: monthlyPctFor, quote: quote, revenuePerDoor: revenuePerDoor, ownerChoiceRange: ownerChoiceRange };
}
