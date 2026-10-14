/* Package Margin Workbench engine: cost side ported from lib/calc.ts, price side from the owner fee-choice pricing file. */
var TIERS = ["min", "special", "plus"];
var TIER_NAMES = { min: "Minimum Management", special: "Raynor Special", plus: "Protection Plus" };
var TIER_SHORT = { min: "Minimum", special: "Special", plus: "Plus" };

/*
 * Which packages a scenario offers (doc.tierOn). There are always three slots; a switched-off one keeps its settings
 * and its margin is still figured, but every page shows it blanked out and Acquisitions doesn't place owners in it.
 */
function tierOn(doc, t) { return !doc || !doc.tierOn || doc.tierOn[t] !== false; }
function onTiers(doc) { return TIERS.filter(function (t) { return tierOn(doc, t); }); }
var VIEWS = ["direct", "allocated", "loaded"];
var VIEW_NAMES = { direct: "Direct COGS", allocated: "Fully Allocated", loaded: "Fully Loaded" };
var VIEW_ORDER = { direct: 0, allocated: 1, loaded: 2 };
var BASES = ["annual", "monthly", "door", "door_yr", "seat", "listing", "event", "claim", "af"];
var BASIS_NAMES = {
  annual: "$/yr", monthly: "$/mo", door: "$/door/mo", door_yr: "$/door/yr", seat: "$/seat/mo",
  listing: "$/listing/mo", event: "$/turnover", claim: "$/claim", af: "AppFolio"
};

var DEFAULT_PRICING = {
  term: 12, vacancyPct: 0, targetPct: 20, scopeSavings: false, vacancyFee: 99,
  // Owners who pick a low monthly fee (paying more up front) get a discount on what they prepay. Each step: when the
  // owner's monthly fee is at or below `atPct`% of rent, `pct`% comes off the leasing and renewal fees. 0% monthly means
  // the whole lease term is paid up front. The biggest step reached wins.
  upfrontDiscount: { on: true, steps: [{ atPct: 0, pct: 10 }] },
  tiers: {
    min: { monthlyPct: 8, leasePct: 75, renewal: 250, shift: 0, vacancyCharge: true },
    special: { monthlyPct: 10, leasePct: 75, renewal: 250, shift: 0, vacancyCharge: true },
    plus: { monthlyPct: 12, leasePct: 75, renewal: 250, shift: 0, vacancyCharge: false }
  }
};

/*
 * What residents pay that Raynor keeps (doc.resident). It's the same in every package (except pet rent and late fees when
 * they match the management fee) and only comes from tenants
 * Raynor placed or has renewed. resident.on switches it into revenue: off shows what owners pay alone.
 *  - RBP: every unit is on one of the resident benefits packages; Raynor keeps the spread (FMV less program fee).
 *    The plain average of the packages is used, on occupied doors under a Raynor lease.
 *  - Tenant renewal fee: $ per renewal ($50-250 depending on how fast they sign) x renewals a year.
 *  - Admin fee: charged at move-in, x move-ins a year (G.moveIns, a portfolio count), spread over doors.
 *  - Pet rent and late fees: last year's P&L per door, times the share Raynor keeps (they fund the pet and
 *    eviction guarantees; the rest would go to the owner). lateMatch sets the late-fee share to each package's
 *    standard monthly management fee instead. petAsRent counts pet rent as rent: it leaves resident revenue and the
 *    average pet rent joins the base the monthly management fee is charged on (see feeBase), so it follows the
 *    owner's pick and moves into the up-front fees like the rest of the fee.
 *  - Application fees: $ per door a year from the P&L ($75 charged, about $35 cost, per applicant).
 */
var DEFAULT_RBP = [
  { name: "RBP #1", fmv: 34.05, fee: 14.00 }, { name: "RBP #2", fmv: 45.00, fee: 24.95 },
  { name: "RBP #3", fmv: 10.95, fee: 10.95 }, { name: "RBP #4", fmv: 55.00, fee: 34.45 },
  { name: "RBP #5", fmv: 44.05, fee: 23.50 }, { name: "RBP #6", fmv: 40.00, fee: 20.45 },
  { name: "RBP #7", fmv: 29.05, fee: 9.50 }, { name: "RBP #8", fmv: 35.00, fee: 19.45 },
  { name: "RBP #9", fmv: 24.05, fee: 3.50 }
];
var DEFAULT_RESIDENT = { on: true, rbp: DEFAULT_RBP, raynorPct: 100, renewalFee: 150, adminFee: 195,
  petYr: 89, petKeep: 100, petAsRent: false, lateYr: 58, lateKeep: 100, lateMatch: false, appYr: 2.5 };
var RESIDENT_NAMES = { rbp: "Resident benefits package", renewal: "Tenant renewal fees", admin: "Admin fees at move-in",
  pet: "Pet rent", late: "Late fees", app: "Application fees" };

/* Average RBP spread per unit per month: the plain average of every package's FMV less its program fee. */
function rbpSpread(R) {
  var list = (R && R.rbp) || [];
  if (!list.length) return 0;
  return list.reduce(function (s, p) { return s + ((p.fmv || 0) - (p.fee || 0)); }, 0) / list.length;
}

/*
 * Turnovers and renewals per door a year, and the share of the year a door sits vacant between tenants.
 * The tool's job is the RPU of a filled unit, so vacancy only counts when pricing.countVacancy is on. Otherwise the
 * vacancy fee is a package benefit to compare (who charges it), not money in the margin.
 */
function leaseCycle(doc) {
  var G = doc.G, P = doc.pricing || {}, term = Math.max(1, P.term || 12);
  var turnsYr = G.tenancy > 0 ? 12 / Math.max(1, G.tenancy * 12) : 0;
  var renewalsYr = Math.max(0, 12 / term - turnsYr);
  var vacantShare = P.countVacancy ? Math.min(1, turnsYr * (G.vacantDays || 0) / 365) : 0;
  return { turnsYr: turnsYr, renewalsYr: renewalsYr, vacantShare: vacantShare };
}

/* Average pet rent per door per month that the management fee is charged on, when pet rent counts as rent (else 0). */
function petRentMo(doc) {
  var R = doc.resident || DEFAULT_RESIDENT;
  return R.petAsRent ? (R.petYr || 0) / 12 : 0;
}

/* What the monthly management fee % is charged on: rent, plus average pet rent when it counts as rent. */
function feeBase(doc) { return (doc.G.rent || 0) + petRentMo(doc); }

/* The % of pet rent or late fees Raynor keeps in a tier: its own setting, or the tier's standard monthly fee when matched. */
function residentKeepPct(doc, which, tier) {
  var R = doc.resident || DEFAULT_RESIDENT, keep = R[which + "Keep"];
  if (R[which + "Match"] && tier && doc.pricing && doc.pricing.tiers[tier]) return doc.pricing.tiers[tier].monthlyPct || 0;
  return keep == null ? 100 : keep;
}

/*
 * Resident revenue per door per month in a tier. "full" is what it adds when counted; total is 0 when it's switched off.
 * The tier only matters for pet rent and late fees matched to the management fee.
 */
function residentPerDoor(doc, tier) {
  var R = doc.resident || DEFAULT_RESIDENT, cyc = leaseCycle(doc);
  var items = {
    rbp: rbpSpread(R) * (1 - cyc.vacantShare) * (R.raynorPct == null ? 100 : R.raynorPct) / 100,
    renewal: (R.renewalFee || 0) * cyc.renewalsYr / 12,
    admin: doc.G.doors ? (R.adminFee || 0) * (doc.G.moveIns || 0) / doc.G.doors / 12 : 0,
    // Counted as rent, pet rent is in the management fee instead (owner revenue).
    pet: R.petAsRent ? 0 : (R.petYr || 0) * residentKeepPct(doc, "pet", tier) / 100 / 12,
    late: (R.lateYr || 0) * residentKeepPct(doc, "late", tier) / 100 / 12,
    app: (R.appYr || 0) / 12
  };
  var full = Object.keys(items).reduce(function (s, k) { return s + items[k]; }, 0);
  return { on: !!R.on, items: items, full: full, total: R.on ? full : 0, cycle: cyc,
    petKeep: residentKeepPct(doc, "pet", tier), lateKeep: residentKeepPct(doc, "late", tier) };
}

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
  events: "Events / yr (portfolio)", door_yr: "Per door / yr", entity_yr: "Per owner entity / yr",
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
var ADDON_BASES_PICKABLE = ["wo", "wo_rest", "events", "door_yr", "entity_yr"];
var ADDON_POOL = { wo: "wo", wo_rest: "wo", evict: "evict", evict_rest: "evict" };
var DEFAULT_ADDONS = [
  { id: "addon_coord", name: "Maintenance coordination fee", price: 75, cost: 0, basis: "wo_rest", amount: 0,
    tiers: { min: "charged", special: "included", plus: "included" } },
  { id: "addon_coord_special", name: "Coordination fee, special circumstance", price: 150, cost: 0, basis: "wo", amount: 0,
    tiers: { min: "charged", special: "included", plus: "included" } },
  EVICTION_ADDON(),
  ACCOUNTING_ADDON()
];
/* Owner accounting fee, $125 a door a year: billed on Minimum (required, since Raynor has to do it), included in Special and Plus. */
function ACCOUNTING_ADDON() {
  // Charged once a year per owner entity (an owner with several doors pays it once), spread over the doors.
  return { id: "addon_acct", name: "Owner accounting fee", kind: "fee", price: 125, cost: 0, basis: "entity_yr", amount: 1,
    tiers: { min: "charged", special: "included", plus: "included" } };
}

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
 * per door a year (default), per turnover (only when a unit turns over), per door a month, a count a year across all doors,
 * per event: a one-off an owner orders when they need it (a vacancy check), counted as times ordered over the tenancy,
 * or per vacant month: billed each month a unit sits empty (utility management), the number being months vacant per turnover.
 */
var ADDON_PER = { door_yr: "per door / yr", turnover: "per turnover", month: "per door / mo", portfolio_yr: "per year, all doors", event: "per event (one-off orders over the tenancy)", vacant_mo: "per vacant month (months vacant per turnover)" };
function addonTimesPerDoorYr(doc, a) {
  var n = a.freq || 0, per = a.per || "door_yr";
  if (per === "turnover" || per === "event" || per === "vacant_mo") return doc.G.tenancy > 0 ? n / doc.G.tenancy : 0;
  if (per === "month") return n * 12;
  if (per === "portfolio_yr") return doc.G.doors ? n / doc.G.doors : 0;
  return n;
}
function bundleCostPerDoorYr(doc, b) {
  return bundleItems(doc, b).reduce(function (s, a) { return s + addonFixedCost(doc, a) * addonTimesPerDoorYr(doc, a); }, 0);
}
function bundleValuePerDoorYr(doc, b) {
  return bundleItems(doc, b).reduce(function (s, a) { return s + (a.price || 0) * addonTimesPerDoorYr(doc, a); }, 0);
}

/*
 * What one occurrence of an add-on sold from a service or cost line costs, read live from that source:
 * a service's value (its hours x the owner's rate, or its set value), a cost line's amount, and for the
 * guarantees their expected cost per door a month (eviction: the line's cost spread over doors; lease break:
 * Minimum's leasing fee x lease breaks a year, spread over doors). null when the source is gone.
 */
function linkedAddonCost(doc, a) {
  var id = a.svc;
  if (!id) return null;
  var doors = doc.G.doors || 0;
  // A service is PM time, already paid in salaries, so selling it costs the same as including it: nothing, unless
  // "Count freed PM capacity" credits tiers that leave it out. Then each sale uses that freed time back up.
  if (doc.place[id] === "scope") return doc.pricing && doc.pricing.scopeSavings ? scopeValue(doc, id) : 0;
  if (id === "evict_g") { var g = findRow(doc, id); return g && doors ? cmo(g, doc) / doors : 0; }
  if (id === "lease_brk") return doors ? leaseBreakMo(doc, "min") / doors : 0;
  var r = findRow(doc, id);
  if (r) return doc.vl[id] != null ? doc.vl[id] : r.v;
  if (typeof doc.place[id] === "string" && doc.place[id].indexOf("cost:") === 0) return doc.vl[id] || 0;
  return null;
}
/* Does this add-on's cost follow its source? Yes unless someone typed their own (costOwn). */
function addonCostLinked(doc, a) { return !!a.svc && !a.costOwn && linkedAddonCost(doc, a) != null; }

/* Raynor's fixed cost per occurrence. The billed eviction's is the court fee from Assumptions, shared with the guarantee line. */
function addonFixedCost(doc, a) {
  if (a.basis === "evict_billed") return doc.G.courtFee || 0;
  if (addonCostLinked(doc, a)) return linkedAddonCost(doc, a);
  return a.cost || 0;
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

/*
 * Residential work orders a year. By default they follow doors (G.woByDoor): a rate per door a year x doors, so
 * changing the door count moves them with it. Off, G.wo is a fixed yearly count.
 */
function woYr(doc) {
  var G = doc.G;
  return G.woByDoor ? (G.woPerDoor || 0) * (G.doors || 0) : G.wo || 0;
}

function addonEventsYr(doc, a, tier) {
  var pool = ADDON_POOL[a.basis];
  if (pool === "wo") return (woYr(doc) * addonShare(doc, a, tier)) / 100;
  if (pool === "evict") return ((doc.G.evictions || 0) * addonShare(doc, a, tier)) / 100;
  if (a.basis === "evict_billed") return billedEvictionsYr(doc, tier);
  if (a.basis === "optional" || a.basis === "bundle") {
    var share = addonState(a, tier) === "included" ? 1 : (a.uptake || 0) / 100;
    return (doc.G.doors || 0) * share * (a.basis === "optional" ? addonTimesPerDoorYr(doc, a) : 1);
  }
  if (a.basis === "door_yr") return (a.amount || 0) * (doc.G.doors || 0);
  if (a.basis === "entity_yr") return (a.amount || 0) * (doc.G.entities || 0);
  return a.amount || 0;
}

/*
 * Add-on revenue and cost per door per month for a tier, at a cost view (an add-on can be set to count only from a view up).
 * Split two ways: per-use fees (kind "fee": driven by work orders, evictions, doors) and optional extras owners choose to buy
 * (kind "addon" and "bundle"). rev/cost are the totals of both.
 */
function addonPerDoor(doc, tier, view) {
  view = view || doc.cv;
  var doors = doc.G.doors || 0, out = { rev: 0, cost: 0, feeRev: 0, feeCost: 0, extraRev: 0, extraCost: 0, items: [] };
  (doc.addons || []).forEach(function (a) {
    // The billed eviction is always billed; which evictions it covers comes from the guarantee and service checkboxes.
    var state = a.basis === "evict_billed" ? "charged" : addonState(a, tier);
    if (state === "off" || !doors) return;
    if (a.view && !isVisible(a.view, view)) return;
    var eventsYr = addonEventsYr(doc, a, tier);
    // G.wo counts residential work orders only (confirmed 2026-10-09), so every fee spreads over the package doors.
    var perDoorMo = eventsYr / 12 / doors;
    var rev = state === "charged" ? (a.price || 0) * perDoorMo : 0;
    var cost = addonCostEach(doc, a, state) * perDoorMo;
    if (a.basis === "bundle") {
      // eventsYr here is owners on the package; its price is monthly and its cost is its add-ons' yearly cost.
      var on = eventsYr / doors;
      rev = state === "charged" ? (a.price || 0) * on : 0;
      cost = bundleCostPerDoorYr(doc, a) / 12 * on;
    }
    out.rev += rev; out.cost += cost;
    if (a.kind === "addon" || a.kind === "bundle") { out.extraRev += rev; out.extraCost += cost; }
    else { out.feeRev += rev; out.feeCost += cost; }
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
  var p = doc.pricing.tiers[tier], q = quote(p, doc.G.rent, doc.pricing.term, splitPct(p, doc.G.rent, doc.pricing.term, feeBase(doc)), doc.pricing.upfrontDiscount, feeBase(doc));
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

/*
 * PM's share of a cost line (doc.pmShare, a %; 100 when unset). Lines split with the brokerage hold the full P&L total
 * as their amount, and the tool takes PM's share of it.
 */
function pmShareOf(doc, id) { var s = doc.pmShare && doc.pmShare[id]; return s == null ? 100 : s; }

function cmo(row, doc) { return cmoFull(row, doc) * pmShareOf(doc, row.id) / 100; }

/* A per-seat line's flat monthly base on top of the per-seat price (doc.seatBase; 0 when unset), e.g. Gusto's $49 + $6/person. */
function seatBaseOf(doc, id) { return (doc.seatBase && doc.seatBase[id]) || 0; }

/* A cost line's full monthly cost, before PM's share. */
function cmoFull(row, doc) {
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
    case "seat": return v * seatsFor(doc, row.id) + seatBaseOf(doc, row.id);
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
/*
 * A tier's standard fees over one lease term. The monthly % is charged on `base` (rent, plus average pet rent when it
 * counts as rent); the leasing fee stays a % of one month's rent. `base` defaults to rent.
 */
function priceFrame(p, rent, term, base) {
  base = base == null ? rent : base;
  var anchor = (p.monthlyPct / 100) * base;
  var turnTerm = anchor * term + (p.leasePct / 100) * rent;
  var renewTerm = anchor * term + p.renewal;
  return {
    anchor: anchor, turnTerm: turnTerm, renewTerm: renewTerm, base: base,
    zeroRenewalPct: base > 0 && term > 0 ? (renewTerm / term / base) * 100 : 0,
    zeroLeasePct: base > 0 && term > 0 ? (turnTerm / term / base) * 100 : 0
  };
}

/* The discount % an owner earns at a monthly fee of `pct`% of rent (0 when off or no step is reached). */
function upfrontDiscountPct(disc, pct) {
  if (!disc || !disc.on || !Array.isArray(disc.steps)) return 0;
  var best = 0;
  disc.steps.forEach(function (s) { if (pct <= (s.atPct || 0) + 0.001 && (s.pct || 0) > best) best = s.pct || 0; });
  return Math.min(100, best);
}

function quote(p, rent, term, pct, disc, base) {
  var f = priceFrame(p, rent, term, base);
  var monthly = (pct / 100) * f.base;
  var perTerm = monthly * term;
  var leaseUpFull = Math.max(0, f.turnTerm - perTerm);
  var renewalFull = Math.max(0, f.renewTerm - perTerm);
  // Share of a new-tenant lease term paid up front (the leasing fee) rather than monthly. The discount comes off the up-front fees.
  var upfrontShare = f.turnTerm > 0 ? (leaseUpFull / f.turnTerm) * 100 : 0;
  var discountPct = upfrontDiscountPct(disc, pct);
  var leaseUp = leaseUpFull * (1 - discountPct / 100);
  var renewal = renewalFull * (1 - discountPct / 100);
  return {
    pct: pct, monthly: monthly, leaseUp: leaseUp, renewal: renewal, frame: f,
    leaseUpFull: leaseUpFull, renewalFull: renewalFull, upfrontShare: upfrontShare, discountPct: discountPct,
    dueAtSigning: leaseUp + monthly,
    zone: pct < f.zeroRenewalPct - 0.01 ? 0 : pct < f.zeroLeasePct - 0.01 ? 1 : 2
  };
}

function splitPct(p, rent, term, base) {
  var f = priceFrame(p, rent, term, base);
  return Math.min(Math.max(0, p.monthlyPct + (p.shift || 0)), f.zeroLeasePct);
}

/* Raynor revenue per door per month for a tier's pricing, at a given owner split. */
function revenuePerDoor(doc, p, pct) {
  var P = doc.pricing, G = doc.G;
  var q = quote(p, G.rent, P.term, pct, P.upfrontDiscount, feeBase(doc));
  var cyc = leaseCycle(doc), turnsYr = cyc.turnsYr, renewalsYr = cyc.renewalsYr;
  // No rent comes in while a door sits empty between tenants, so the % fee isn't earned then. Tiers that charge
  // the flat vacancy fee bill it for those months instead.
  var mgmt = q.monthly * 12 * Math.max(0, 1 - P.vacancyPct / 100 - cyc.vacantShare);
  var vacancy = p.vacancyCharge ? (P.vacancyFee || 0) * 12 * cyc.vacantShare : 0;
  var leasing = q.leaseUp * turnsYr;
  var renewal = q.renewal * renewalsYr;
  return { quote: q, mgmt: mgmt / 12, vacancy: vacancy / 12, leasing: leasing / 12, renewal: renewal / 12, total: (mgmt + vacancy + leasing + renewal) / 12,
    turnsYr: turnsYr, renewalsYr: renewalsYr, vacantShare: cyc.vacantShare };
}

/*
 * Everything a tier brings in per door per month at an owner split (price revenue + add-on fees + resident revenue), and the
 * lease-break waiver cost at that split, since the waived leasing fee moves with the owner's pick.
 */
function tierRevenue(doc, tier, p, pct, view, addon) {
  var rev = revenuePerDoor(doc, p, pct);
  var lb = leaseBreakCost(doc, tier, view, rev.quote), res = residentPerDoor(doc, tier);
  return { rev: rev, lb: lb, resident: res, owner: rev.total + addon.rev, total: rev.total + addon.rev + res.total };
}

function tierMargin(doc, tier, costPerDoor, view) {
  view = view || doc.cv;
  var p = doc.pricing.tiers[tier];
  var pct = splitPct(p, doc.G.rent, doc.pricing.term, feeBase(doc));
  var addon = addonPerDoor(doc, tier, view);
  var tr = tierRevenue(doc, tier, p, pct, view, addon);
  var revenue = tr.total, cost = costPerDoor + addon.cost + tr.lb.cost;
  var margin = revenue - cost;
  return {
    rev: tr.rev, addon: addon, leaseBreak: tr.lb, resident: tr.resident, ownerRevenue: tr.owner, revenue: revenue, baseCost: costPerDoor, cost: cost, margin: margin,
    marginPct: revenue > 0 ? (margin / revenue) * 100 : (margin >= 0 ? 0 : -100),
    portfolioMo: margin * doc.G.doors
  };
}

/* Worst and best margin across every position on the owner's split slider. */
function ownerChoiceRange(doc, tier, costPerDoor, view) {
  view = view || doc.cv;
  var p = doc.pricing.tiers[tier], f = priceFrame(p, doc.G.rent, doc.pricing.term, feeBase(doc));
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
    var p = { monthlyPct: a, leasePct: base.leasePct, renewal: base.renewal, shift: 0, vacancyCharge: base.vacancyCharge };
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
  if (!d.G.woByDoor) d.G.wo = (d.G.wo || 0) * f;
  d.G.evictions = (d.G.evictions || 0) * f;
  d.G.listings = (d.G.listings || 0) * f;
  d.G.moveIns = (d.G.moveIns || 0) * f;
  // Same doors per owner as today, so owner entities grow with doors.
  d.G.entities = (d.G.entities || 0) * f;
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
  return (deal.doors || 0) * (key === 'wo' ? woYr(doc) : doc.G[key] || 0) / (doc.G.doors || 1);
}

function acquiredDoc(doc, deal, forBook) {
  var keep = 1 - Math.min(100, Math.max(0, deal.lost || 0)) / 100, add = (deal.doors || 0) * keep, D = doc.G.doors || 0;
  var d = scaleToDoors(doc, D + add), f = D ? (D + add) / D : 1;
  // The combined portfolio's work orders are a count: today's plus the book's own (which may differ from today's rate).
  d.G.woByDoor = false;
  d.G.wo = woYr(doc) + dealCount(doc, deal, 'wo') * keep;
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
  // Owners only land in packages this scenario offers.
  var mix = {};
  TIERS.forEach(function (t) { mix[t] = tierOn(doc, t) ? ((deal.mix || {})[t] || 0) : 0; });
  var mixSum = TIERS.reduce(function (s, t) { return s + mix[t]; }, 0) || 1;
  var tiers = {}, bookYr = 0, bookRevYr = 0;
  TIERS.forEach(function (t) {
    var mA = tierMargin(after.doc, t, cA.perDoor[t], view), mB = tierMargin(book.doc, t, cB.perDoor[t], view);
    var doorsT = book.kept * (mix[t] || 0) / mixSum;
    tiers[t] = { today: today.margins[t], after: mA, book: mB, doors: doorsT, bookYr: doorsT * mB.margin * 12 };
    bookYr += tiers[t].bookYr; bookRevYr += doorsT * mB.revenue * 12;
  });
  var upfront = (deal.price || 0) + (deal.onetime || 0);
  // Resident revenue only comes from tenants Raynor placed or renewed. The book's tenants move onto Raynor leases as
  // their leases renew or turn over (spread evenly over one lease term), so year one collects only part of the
  // monthly items (RBP, pet rent, late fees). Renewal, admin and application fees happen at those events anyway.
  var term = Math.max(1, doc.pricing.term || 12);
  var onRaynorYr1 = term >= 12 ? 6 / term : 1 - term / 24;
  // Pet rent and late fees can differ by package (matched to the management fee), so weight by the deal's tier mix.
  var residentRamp = 0;
  TIERS.forEach(function (t) {
    var res = residentPerDoor(book.doc, t), monthlyRes = res.on ? res.items.rbp + res.items.pet + res.items.late : 0;
    residentRamp += tiers[t].doors * monthlyRes * 12 * (1 - onRaynorYr1);
  });
  return { tiers: tiers, kept: book.kept, doorsAfter: after.doc.G.doors, bookYr: bookYr, bookRevYr: bookRevYr, upfront: upfront,
    paybackMo: bookYr > 0 ? upfront / (bookYr / 12) : null, firstYearNet: bookYr - upfront - residentRamp, residentRamp: residentRamp,
    onRaynorYr1: onRaynorYr1, mixSum: mixSum, afterDoc: after.doc };
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
  var G = doc.G, mo = cmo(row, doc), resOnly = residentialOnly(row, groupId), share = pmShareOf(doc, row.id);
  var perDoor = linePerDoor(doc, mo, row, groupId);
  var tail = " = " + (share !== 100 ? usd(cmoFull(row, doc)) + "/mo × " + fmtN(Math.round(share * 100) / 100) + "% PM share" : "") + (share !== 100 ? " = " : "") + usd(mo) + "/mo → " + usd(perDoor) + "/door/mo" + (otherUnits(doc) ? (resOnly ? " (package doors only)" : " (spread over " + fmtN(allUnits(doc)) + " units)") : "");
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
    case "seat": lines.push((seatBaseOf(doc, row.id) ? usd(seatBaseOf(doc, row.id)) + "/mo base + " : "") + usd(v) + "/seat/mo × " + fmtN(seatsFor(doc, row.id)) + " seats" + (doc.seats && doc.seats[row.id] != null ? " (this tool's own count)" : "") + tail); break;
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
  ["vl", "bd", "ev", "psv", "psh", "pbase", "place", "scopeOwner", "icat", "itemView", "secView", "MASTER", "removed", "udest", "seats", "pmShare", "seatBase"].forEach(function (k) {
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
  // Packages offered: all three unless switched off, and never none.
  var on = d.tierOn && typeof d.tierOn === "object" ? d.tierOn : {};
  d.tierOn = {};
  TIERS.forEach(function (t) { d.tierOn[t] = on[t] !== false; });
  if (!TIERS.some(function (t) { return d.tierOn[t]; })) TIERS.forEach(function (t) { d.tierOn[t] = true; });
  if (d.G.hoursYr == null) d.G.hoursYr = 2080;
  if (d.G.wo == null) d.G.wo = 0;
  // v9 (2026-10-09): work orders follow doors by default, at today's rate per door.
  if (d.G.woByDoor == null) { d.G.woByDoor = true; d.G.woPerDoor = d.G.doors ? d.G.wo / d.G.doors : 0; }
  if (d.G.woPerDoor == null) d.G.woPerDoor = d.G.doors ? d.G.wo / d.G.doors : 0;
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
  // v7 (2026-10-09): resident income, the vacancy fee and the owner accounting fee. The accounting fee was a $125 scope
  // value (a price, not PM time), so like the eviction service it moves out of scope labor into a billed fee.
  if (ver < 7) {
    if (!d.addons.some(function (a) { return a.id === "addon_acct"; })) d.addons.push(ACCOUNTING_ADDON());
    if (d.psv.ps_tax_docs === 125 && !d.psh.ps_tax_docs) d.psv.ps_tax_docs = 0;
    // The old owner-side vacancy % becomes days vacant per turnover (one vacancy every tenancy).
    if (d.G.vacantDays == null && P.vacancyPct > 0 && d.G.tenancy > 0) d.G.vacantDays = Math.round(P.vacancyPct / 100 * 365 * d.G.tenancy);
    if (P.vacancyPct > 0) P.vacancyPct = 0;
  }
  // v8 (2026-10-09): "Annual accounting / tax docs" is covered by the owner accounting fee, so the service is removed.
  if (ver < 8 && d.MASTER.ps_tax_docs) {
    delete d.MASTER.ps_tax_docs; delete d.place.ps_tax_docs; delete d.icat.ps_tax_docs; delete d.scopeOwner.ps_tax_docs;
    delete d.psv.ps_tax_docs; delete d.psh.ps_tax_docs; delete d.pbase.ps_tax_docs; delete d.ev.ps_tax_docs;
    d.templates.forEach(function (t) { delete t.psk.ps_tax_docs; delete t.ck.ps_tax_docs; if (t.exclIgnore) delete t.exclIgnore.ps_tax_docs; });
    d.removed.ps_tax_docs = true;
  }
  // v12 (2026-10-12): the move-in / move-out inspection service splits into two services under Inspections.
  if (ver < 12 && d.MASTER.ps_insp_mimo) splitService(d, "ps_insp_mimo", [
    { id: "ps_insp_movein", n: "Move-in inspection" },
    { id: "ps_insp_moveout", n: "Move-out inspection" }
  ]);
  // v13 (2026-10-12): owner entities. The owner accounting fee is charged per entity, not per door (about 80 today).
  if (d.G.entities == null) d.G.entities = Math.min(80, d.G.doors || 0);
  if (ver < 13) d.addons.forEach(function (a) { if (a.id === "addon_acct" && a.basis === "door_yr" && (a.amount || 0) === 1) a.basis = "entity_yr"; });
  // v14 (2026-10-13): brokerage-split lines hold the full P&L total and a PM share, instead of a share worked out by
  // hand. Converts the lines entered as PM's share, only where the amount is still the one entered.
  if (ver < 14) {
    var SPLIT = {
      goshen: [375, 750, 50, null],
      education: [1018, 2036, 50, "Education and training on the 2025 P&L. PM's share below; brokerage covers the rest."],
      events: [1984, 3968, 50, "Events and meetings on the 2025 P&L. PM's share below; brokerage covers the rest."],
      office_rent: [9600, 14400, 200 / 3, "Office rent on the 2025 P&L ($1,200/mo). PM's share below; brokerage covers the rest."],
      meals: [5633, 11265.68, 50, "Meals and entertainment on the 2025 P&L. PM's share below; brokerage covers the rest."],
      fuel_auto: [4076, 8151.08, 50, "Fuel and auto on the 2025 P&L (fuel $6,742, repairs $1,004, other $405). PM's share below; brokerage covers the rest."],
      bank_fees: [787, 1181.11, 200 / 3, "Bank charges and fees on the 2025 P&L. 2026 is running over 5x higher ($6,252 to Oct 12), likely payment processing: worth checking. PM's share below."]
    };
    Object.keys(SPLIT).forEach(function (id) {
      var r = findRow(d, id), x = SPLIT[id];
      if (!r || d.pmShare[id] != null) return;
      var v = d.vl[id] != null ? d.vl[id] : r.v;
      if (Math.abs(v - x[0]) > 1) return;
      d.vl[id] = x[1]; d.pmShare[id] = x[2];
      if (x[3]) r.d = x[3];
    });
  }
  // v15 (2026-10-13): a per-seat line can carry a flat monthly base. The separate "Gusto base" line becomes Gusto's base.
  if (ver < 15) {
    var gb = findRow(d, "gusto_base"), gu = findRow(d, "gusto");
    if (gb && gu && gu.e === "seat" && gb.e === "monthly") {
      d.seatBase.gusto = d.vl.gusto_base != null ? d.vl.gusto_base : gb.v;
      d.CG.forEach(function (g) { g.rows = g.rows.filter(function (x) { return x.id !== "gusto_base"; }); });
      d.templates.forEach(function (t) { delete t.ck.gusto_base; });
      delete d.vl.gusto_base; delete d.itemView.gusto_base; delete d.pmShare.gusto_base;
      d.removed.gusto_base = true;
    }
  }
  if (d.G.vacantDays == null) d.G.vacantDays = 0;
  // Move-ins a year across the portfolio (admin fees). Starts at one per door every average tenancy.
  if (d.G.moveIns == null) d.G.moveIns = d.G.tenancy > 0 ? Math.round((d.G.doors || 0) / d.G.tenancy) : 0;
  if (!d.resident || typeof d.resident !== "object") {
    d.resident = JSON.parse(JSON.stringify(DEFAULT_RESIDENT));
    // Last year's P&L showed $100 a door from tenant renewal fees. Start the per-renewal fee where it matches that today.
    var cyc0 = leaseCycle({ G: d.G, pricing: { term: P.term || 12 } });
    if (cyc0.renewalsYr > 0) d.resident.renewalFee = Math.round(100 / cyc0.renewalsYr);
  }
  // petMatch (2026-10-12, matched pet rent to the standard fee) became petAsRent: pet rent counted as rent.
  if (d.resident && d.resident.petMatch != null) { if (d.resident.petAsRent == null) d.resident.petAsRent = !!d.resident.petMatch; delete d.resident.petMatch; }
  Object.keys(DEFAULT_RESIDENT).forEach(function (k) { if (d.resident[k] == null) d.resident[k] = JSON.parse(JSON.stringify(DEFAULT_RESIDENT[k])); });
  if (!Array.isArray(d.resident.rbp)) d.resident.rbp = JSON.parse(JSON.stringify(DEFAULT_RBP));
  d.resident.on = !!d.resident.on;

  if (d.af.istr == null) d.af.istr = 1;
  d.af.rd = afResUnits(d);
  d.af.cd = d.G.comm || 0;
  // v1 defaulted vacancy to 4% (an owner-side assumption from the fee-choice pricing file). Raynor only collects fees once a renter is placed, so v2 defaults it to 0.
  var vacancy = P.vacancyPct != null && (P.v || 1) >= 2 ? P.vacancyPct : (P.vacancyPct != null && P.vacancyPct !== 4 ? P.vacancyPct : DEFAULT_PRICING.vacancyPct);
  d.pricing = {
    v: 15,
    // v10 (2026-10-12): up-front discount, 10% off when the whole lease term is paid up front.
    // v11: discount steps are set by the owner's monthly fee (atPct) instead of the share paid up front.
    upfrontDiscount: normalizeDiscount(P.upfrontDiscount),
    term: P.term != null ? P.term : DEFAULT_PRICING.term,
    countVacancy: !!P.countVacancy,
    vacancyFee: P.vacancyFee != null ? P.vacancyFee : DEFAULT_PRICING.vacancyFee,
    vacancyPct: vacancy,
    targetPct: P.targetPct != null ? P.targetPct : DEFAULT_PRICING.targetPct,
    scopeSavings: !!P.scopeSavings,
    tiers: {}
  };
  TIERS.forEach(function (t) {
    d.pricing.tiers[t] = Object.assign({}, DEFAULT_PRICING.tiers[t], (P.tiers && P.tiers[t]) || {});
  });
  // Add-ons sold from a service or cost line follow its cost. Ones saved before that keep a cost that was changed by hand.
  d.addons.forEach(function (a) {
    if (!a.svc || a.costOwn != null) return;
    var lv = linkedAddonCost(d, a);
    a.costOwn = lv != null && Math.abs((a.cost || 0) - lv) > 0.5;   // costs were saved rounded to the dollar
  });
  return d;
}

/*
 * Replace one catalog service with several that keep its settings (category, tiers, owner, values) and its place in the
 * list. Every per-service map at the top of the doc and in each template carries over to each new id.
 */
function splitService(d, oldId, parts) {
  function copyInto(map) {
    if (!map || typeof map !== "object" || Array.isArray(map) || !(oldId in map)) return map;
    var out = {};
    Object.keys(map).forEach(function (k) {
      if (k !== oldId) { out[k] = map[k]; return; }
      parts.forEach(function (p) {
        var v = JSON.parse(JSON.stringify(map[k]));
        if (map === d.MASTER) { v.id = p.id; v.n = p.n; }
        out[p.id] = v;
      });
    });
    return out;
  }
  Object.keys(d).forEach(function (k) { if (k !== "removed") d[k] = copyInto(d[k]); });
  d.templates.forEach(function (t) { Object.keys(t).forEach(function (k) { t[k] = copyInto(t[k]); }); });
  d.removed[oldId] = true;
}

function normalizeDiscount(x) {
  if (!x || typeof x !== "object") return JSON.parse(JSON.stringify(DEFAULT_PRICING.upfrontDiscount));
  var steps = [];
  (Array.isArray(x.steps) ? x.steps : []).forEach(function (s) {
    var at = s.atPct;
    // v10 steps were "share paid up front"; only 100% (a 0% monthly fee) carries over the same for every tier.
    if (at == null) { if ((+s.upfront || 0) >= 100) at = 0; else return; }
    steps.push({ atPct: Math.min(30, Math.max(0, +at || 0)), pct: Math.min(100, Math.max(0, +s.pct || 0)) });
  });
  return { on: !!x.on, steps: steps };
}

/*
 * Copy one add-on (or per-use fee) from scenario `src` into scenario `dst` (both normalized; dst is changed in place).
 * A linked add-on brings its source with it when dst doesn't have it: the cost line (same group, its value, counts and
 * tier checkboxes) or the catalog service (category, value, hours, owner). With `matchTiers`, dst's tier checkboxes for
 * that source are set to src's, so the same packages include it and the rest sell it. Either way the add-on is sold
 * only in the tiers of dst that leave the source out. Replaces any add-on in dst with the same id or the same source.
 * Returns notes on anything that couldn't come across.
 */
function copyAddonInto(src, dst, addonId, matchTiers) {
  var notes = [], a = (src.addons || []).find(function (x) { return x.id === addonId; });
  if (!a) return ["That add-on isn't in this scenario."];
  a = JSON.parse(JSON.stringify(a));
  var sid = a.svc, kind = null;
  var MAPS = ["vl", "ev", "bd", "psv", "psh", "pbase", "place", "scopeOwner", "icat", "itemView", "udest", "pmShare", "seatBase"];
  function copyMaps(id) { MAPS.forEach(function (k) { if (src[k] && src[k][id] != null) { dst[k] = dst[k] || {}; dst[k][id] = JSON.parse(JSON.stringify(src[k][id])); } }); }
  if (sid) {
    var hit = null;
    src.CG.forEach(function (g) { g.rows.forEach(function (r) { if (r.id === sid) hit = { g: g, r: r }; }); });
    if (hit) {
      kind = "ck";
      if (!findRow(dst, sid)) {
        var g2 = dst.CG.find(function (g) { return g.id === hit.g.id; });
        if (g2) { g2.rows.push(JSON.parse(JSON.stringify(hit.r))); copyMaps(sid); if (dst.removed) delete dst.removed[sid]; matchTiers = true; }
        else notes.push("Its cost group isn't in this scenario, so the cost line wasn't added.");
      }
    } else if (src.MASTER[sid]) {
      kind = src.place[sid] === "scope" ? "psk" : "ck";
      if (!dst.MASTER[sid]) { dst.MASTER[sid] = JSON.parse(JSON.stringify(src.MASTER[sid])); copyMaps(sid); if (dst.removed) delete dst.removed[sid]; matchTiers = true; }
      else if (dst.place[sid] !== src.place[sid]) { dst.place[sid] = src.place[sid]; copyMaps(sid); }
    }
    if (kind && matchTiers) {
      var flags = activeTemplate(src)[kind][sid] || { min: false, special: false, plus: false };
      dst.templates.forEach(function (tp) { tp[kind] = tp[kind] || {}; tp[kind][sid] = JSON.parse(JSON.stringify(flags)); });
    }
    if (kind) {
      var mine = activeTemplate(dst)[kind][sid] || {};
      TIERS.forEach(function (t) {
        if (mine[t]) a.tiers[t] = "off";
        else if (a.tiers[t] === "off") a.tiers[t] = "charged";
      });
    }
  }
  if (a.kind === "bundle" && Array.isArray(a.items)) {
    var before = a.items.length;
    a.items = a.items.filter(function (i) { return (dst.addons || []).some(function (x) { return x.id === i; }); });
    if (a.items.length < before) notes.push((before - a.items.length) + " of the package's add-ons aren't in this scenario and were left out.");
  }
  var at = (dst.addons || []).findIndex(function (x) { return x.id === a.id || (sid && x.svc === sid); });
  dst.addons = (dst.addons || []).filter(function (x) { return !(x.id === a.id || (sid && x.svc === sid)); });
  if (at < 0 || at > dst.addons.length) dst.addons.push(a); else dst.addons.splice(at, 0, a);
  return notes;
}

function validDoc(d) {
  return d && typeof d === "object" && Array.isArray(d.CG) && Array.isArray(d.templates) && d.templates.length && d.G && d.af;
}

if (typeof module !== "undefined") {
  module.exports = { seatBaseOf: seatBaseOf, pmShareOf: pmShareOf, cmoFull: cmoFull, copyAddonInto: copyAddonInto, tierOn: tierOn, onTiers: onTiers, woYr: woYr, residentPerDoor: residentPerDoor, residentKeepPct: residentKeepPct, feeBase: feeBase, petRentMo: petRentMo, priceFrame: priceFrame, rbpSpread: rbpSpread, leaseCycle: leaseCycle, linkedAddonCost: linkedAddonCost, addonFixedCost: addonFixedCost, billedEvictionsYr: billedEvictionsYr, leaseBreakMo: leaseBreakMo, findRow: findRow, scopeValue: scopeValue, addonTimesPerDoorYr: addonTimesPerDoorYr, afResUnits: afResUnits, linePerDoor: linePerDoor, allUnits: allUnits, otherUnits: otherUnits, otherRevenueMo: otherRevenueMo, dealCount: dealCount, acquisitionImpact: acquisitionImpact, newDeal: newDeal, marginsAt: marginsAt, scaleToDoors: scaleToDoors, leaseBreakCost: leaseBreakCost, syncLinked: syncLinked, activeTemplate: activeTemplate, billedEvictionsYr: billedEvictionsYr, cmo: cmo, addonShare: addonShare, addonPerDoor: addonPerDoor, tierCost: tierCost, tierMargin: tierMargin, normalizeDoc: normalizeDoc, monthlyPctFor: monthlyPctFor, quote: quote, upfrontDiscountPct: upfrontDiscountPct, revenuePerDoor: revenuePerDoor, ownerChoiceRange: ownerChoiceRange };
}
