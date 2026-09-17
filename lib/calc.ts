import { CalcDoc, CostRow, CostView, MasterService, ScenarioTemplate, Tier, TIERS } from "./types";

const VIEW_ORDER: Record<CostView, number> = { direct: 0, allocated: 1, loaded: 2 };

/** The currently active saved checkbox preset — its `ck`/`psk` ARE the live tier state. */
export function activeTemplate(doc: CalcDoc): ScenarioTemplate {
  return doc.templates.find((t) => t.id === doc.at) ?? doc.templates[0];
}

/**
 * Monthly cost for a single row, given its basis and the live rate/burden/event
 * inputs on the document. This is the heart of the tool — port it exactly.
 */
export function cmo(row: CostRow, doc: CalcDoc): number {
  const v = doc.vl[row.id] ?? row.v;
  const bd = doc.bd[row.id] ?? row.n_bd ?? 0;
  const ev = doc.ev[row.id] ?? row.n_ev ?? 0;
  const { doors, seats, listings, tenancy } = doc.G;

  switch (row.e) {
    case "annual":
      // Payroll burden applies to annual only.
      return (v * (1 + bd / 100)) / 12;
    case "monthly":
      return v;
    case "door":
      return v * doors;
    case "door_yr":
      return (v * doors) / 12;
    case "seat":
      return v * seats;
    case "listing":
      return v * listings;
    case "event":
      // Assumes one event per tenancy cycle per door. A 0-year tenancy
      // assumption is nonsensical (infinite turnover) rather than "no cost" —
      // guard it so the UI shows 0 instead of Infinity/NaN cascading through
      // every total.
      return tenancy > 0 ? (v * doors) / (tenancy * 12) : 0;
    case "claim":
      // Total annual claim cost, spread across all doors at aggregation time.
      return (v * ev) / 12;
    case "af": {
      const { af } = doc;
      return af.rr * af.rd + (af.ic ? af.cr * af.cd : 0);
    }
    default:
      return 0;
  }
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Human-readable breakdown of how a row's $/mo was computed — the "info tab" from the original tool. */
export function formulaText(row: CostRow, doc: CalcDoc): string {
  const v = doc.vl[row.id] ?? row.v;
  const { doors, seats, listings, tenancy } = doc.G;
  const monthly = cmo(row, doc);
  const perDoor = doors ? monthly / doors : 0;
  const tail = ` = $${fmt(monthly)}/mo → $${fmt(perDoor)}/door`;

  switch (row.e) {
    case "annual": {
      const bd = doc.bd[row.id] ?? row.n_bd ?? 0;
      if (bd) {
        const withBurden = v * (1 + bd / 100);
        return `$${fmt(v)}/yr + ${fmt(bd)}% burden = $${fmt(withBurden)}/yr ÷ 12${tail}`;
      }
      return `$${fmt(v)}/yr ÷ 12${tail}`;
    }
    case "monthly":
      return `$${fmt(v)}/mo${tail}`;
    case "door":
      return `$${fmt(v)}/door/mo × ${doors} doors${tail}`;
    case "door_yr":
      return `$${fmt(v)}/door/yr × ${doors} doors ÷ 12${tail}`;
    case "seat":
      return `$${fmt(v)}/seat/mo × ${seats} seats${tail}`;
    case "listing":
      return `$${fmt(v)}/listing/mo × ${listings} listings${tail}`;
    case "event":
      return `$${fmt(v)}/event × ${doors} doors ÷ (${tenancy}yr tenancy × 12)${tail}`;
    case "claim": {
      const ev = doc.ev[row.id] ?? row.n_ev ?? 0;
      return `$${fmt(v)}/claim × ${fmt(ev)} claims/yr ÷ 12${tail}`;
    }
    case "af": {
      const { af } = doc;
      const com = af.ic ? ` + com: $${fmt(af.cr)} × ${af.cd} units` : " (commercial not included)";
      return `res: $${fmt(af.rr)} × ${af.rd} units${com}${tail}`;
    }
    default:
      return `${tail.slice(3)}`;
  }
}

function rowView(doc: CalcDoc, rowId: string, groupId: string): CostView {
  return (doc.itemView[rowId] as CostView) ?? doc.secView[groupId] ?? "direct";
}

function isVisible(rowV: CostView, activeView: CostView): boolean {
  return VIEW_ORDER[rowV] <= VIEW_ORDER[activeView];
}

/** Whether a bundle-owner row (and therefore everything bundled under it) is even shown at the given cost view. */
function isOwnerVisibleAtView(doc: CalcDoc, ownerRowId: string, view: CostView): boolean {
  for (const group of doc.CG) {
    if (group.rows.some((r) => r.id === ownerRowId)) {
      return isVisible(rowView(doc, ownerRowId, group.id), view);
    }
  }
  return true;
}

/** A promoted service (place = "cost:<groupId>") resolved into a synthetic cost row. */
function promotedRow(doc: CalcDoc, id: string): { row: CostRow; groupId: string } | null {
  const placement = doc.place[id];
  if (typeof placement !== "string" || !placement.startsWith("cost:")) return null;
  const groupId = placement.slice("cost:".length);
  const master = doc.MASTER[id];
  if (!master) return null;
  const basis = doc.pbase[id] ?? "door_yr";
  return {
    groupId,
    row: { id, name: master.n, e: basis as CostRow["e"], v: doc.vl[id] ?? 0 },
  };
}

export interface CalcResult {
  totalByTier: Record<Tier, number>;
  perDoorByTier: Record<Tier, number>;
}

/**
 * Per-tier, per-door cost at the document's active cost view.
 *
 *   for each group, for each row (including promoted services):
 *     if viewIndex(rowView) > viewIndex(activeView): skip
 *     for each tier: if ck[row][tier]: total[tier] += cmo(row)
 *   cpu[tier] = total[tier] / doors
 */
export function calculate(doc: CalcDoc, view: CostView = doc.cv): CalcResult {
  const total: Record<Tier, number> = { min: 0, special: 0, plus: 0 };
  const ck = activeTemplate(doc).ck;

  function apply(row: CostRow, groupId: string) {
    const rv = rowView(doc, row.id, groupId);
    if (!isVisible(rv, view)) return;
    const flags = ck[row.id];
    if (!flags) return;
    const monthly = cmo(row, doc);
    for (const t of TIERS) {
      if (flags[t]) total[t] += monthly;
    }
  }

  for (const group of doc.CG) {
    for (const row of group.rows) apply(row, group.id);
  }

  for (const id of Object.keys(doc.place)) {
    const promoted = promotedRow(doc, id);
    if (promoted) apply(promoted.row, promoted.groupId);
  }

  const perDoor: Record<Tier, number> = {
    min: doc.G.doors ? total.min / doc.G.doors : 0,
    special: doc.G.doors ? total.special / doc.G.doors : 0,
    plus: doc.G.doors ? total.plus / doc.G.doors : 0,
  };

  return { totalByTier: total, perDoorByTier: perDoor };
}

/** Convenience: per-door cost for every cost view, for the three tier readouts. */
export function calculateAllViews(doc: CalcDoc): Record<CostView, CalcResult> {
  return {
    direct: calculate(doc, "direct"),
    allocated: calculate(doc, "allocated"),
    loaded: calculate(doc, "loaded"),
  };
}

/** Promoted services (place = "cost:<groupId>") that belong to a given cost group, as synthetic rows. */
export function promotedRowsForGroup(doc: CalcDoc, groupId: string): CostRow[] {
  const rows: CostRow[] = [];
  for (const id of Object.keys(doc.place)) {
    const promoted = promotedRow(doc, id);
    if (promoted && promoted.groupId === groupId) rows.push(promoted.row);
  }
  return rows;
}

/** Cost rows flagged `pmScope: 1` — each gets its own expandable "included services" panel. */
export function bundleOwnerRows(doc: CalcDoc): CostRow[] {
  return doc.CG.flatMap((g) => g.rows).filter((r) => r.pmScope === 1);
}

/** PM-scope services owned by a given bundle row, grouped by their display category. */
export function scopedServicesByOwner(
  doc: CalcDoc,
  ownerRowId: string
): { category: string; services: MasterService[] }[] {
  const byCat = new Map<string, MasterService[]>();
  for (const [id, svc] of Object.entries(doc.MASTER)) {
    if (doc.place[id] !== "scope") continue;
    if (doc.scopeOwner[id] !== ownerRowId) continue;
    const cat = doc.icat[id] ?? svc.dc;
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat)!.push(svc);
  }
  return [...byCat.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, services]) => ({ category, services }));
}

/** Benched (staged / not-yet-sold) services — the Bench overlay's contents. */
export function benchedServices(doc: CalcDoc): MasterService[] {
  return Object.entries(doc.MASTER)
    .filter(([id]) => doc.place[id] === "uc")
    .map(([, svc]) => svc);
}

/**
 * A bundle-owner role's derived hourly rate: that row's own annual cost
 * (its $/mo formula x 12, e.g. PM comp's $/door rate x doors) divided by the
 * portfolio's assumed work-hours/yr. Lets a scope service's value be entered
 * as "N hours of someone's time" instead of a dollar figure someone has to
 * compute by hand — and keeps it live if comp rates or doors change later.
 */
export function ownerHourlyRate(doc: CalcDoc, ownerRowId: string): number {
  const row = bundleOwnerRows(doc).find((r) => r.id === ownerRowId);
  if (!row || !doc.G.hoursYr) return 0;
  return (cmo(row, doc) * 12) / doc.G.hoursYr;
}

/**
 * A scope service's own indicative value, in whatever unit its basis calls
 * for ($/door/yr for "door_yr", $/event for "claim"): the live hours-mode
 * calculation (`psh` x owner's hourly rate) when hours mode is set, else the
 * manually-entered `psv` dollar figure.
 */
export function scopeServiceValue(doc: CalcDoc, id: string, svc: MasterService): number {
  const hours = doc.psh[id];
  if (hours) return ownerHourlyRate(doc, doc.scopeOwner[id]) * hours;
  return doc.psv[id] ?? svc.dsv;
}

export interface ServiceStats {
  included: number;
  total: number;
  /** Annualized $ NOT in this tier's total at this view — real cost-row dollars (hidden by view and/or unchecked for the tier) plus scope-catalog indicative value for unchecked services. A rough, non-authoritative gauge of what's being left out, not a hard number. */
  excludedValue: number;
}

/**
 * Annualized $ for cost-group/promoted rows that do NOT make it into a
 * tier's total at the given view — either the row is hidden entirely at
 * this view (e.g. Guarantees, gated to "loaded"), or it's visible but
 * simply unchecked for this tier. Mirrors calculate()'s own
 * visible-and-checked condition, just inverted.
 */
function excludedCostRowValue(doc: CalcDoc, tier: Tier, view: CostView): number {
  const ck = activeTemplate(doc).ck;
  const exclIgnore = activeTemplate(doc).exclIgnore;
  let sum = 0;

  function consider(row: CostRow, groupId: string) {
    const visible = isVisible(rowView(doc, row.id, groupId), view);
    const checked = !!ck[row.id]?.[tier];
    if (exclIgnore[row.id]?.[tier]) return;
    if (!(visible && checked)) sum += cmo(row, doc) * 12;
  }

  for (const group of doc.CG) {
    for (const row of group.rows) consider(row, group.id);
  }
  for (const id of Object.keys(doc.place)) {
    const promoted = promotedRow(doc, id);
    if (promoted) consider(promoted.row, promoted.groupId);
  }

  return sum;
}

/** A scope service's own indicative annual value: $/event × events/yr for "claim"-basis services, or its raw indicative value for door-scaled ones. */
function annualScopeValue(doc: CalcDoc, id: string, svc: MasterService): number {
  const value = scopeServiceValue(doc, id, svc);
  const basis = doc.pbase[id] ?? "door_yr";
  if (basis === "claim") return value * (doc.ev[id] ?? 0);
  return value;
}

/**
 * How many "services" are included at a tier, out of how many could apply
 * at the given cost view -- one combined count spanning both real
 * cost-group lines (Photography, Delinquency & collections once promoted,
 * Guarantees, etc.) and PM-scope catalog items (Delinquency & collections,
 * Renewal negotiation, etc. while still bundled under a role). The
 * Staffing group's own rows (PM comp, Maintenance coordinator, Process
 * coordinator, Accounting) are excluded from the count -- those are staff
 * positions, not services being delivered -- though their dollars still
 * count in calculate()'s totals as always.
 *
 * Also returns a rough indicative annual value for what's NOT in this
 * tier's total at this view: real cost-row dollars (hidden by view and/or
 * unchecked for the tier) plus scope-catalog indicative value for
 * unchecked services.
 *
 * A scope-catalog service whose bundle owner isn't even shown at this view
 * (e.g. an owner row gated to "loaded" while looking at "direct") is left
 * out of the included/total counts entirely: nothing about that owner is
 * part of the picture at this view, so it isn't a meaningful exclusion at
 * this tier, just invisible at this view. A hidden-by-view cost row is
 * treated the same way for the count (though it still lands in
 * excludedValue, unlike an invisible-owner's scope services).
 */
export function serviceStats(doc: CalcDoc, tier: Tier, view: CostView = doc.cv): ServiceStats {
  const ck = activeTemplate(doc).ck;
  const psk = activeTemplate(doc).psk;
  const exclIgnore = activeTemplate(doc).exclIgnore;
  let included = 0;
  let total = 0;
  let excludedValue = excludedCostRowValue(doc, tier, view);

  function considerRow(row: CostRow, groupId: string) {
    if (groupId === "staff") return;
    if (!isVisible(rowView(doc, row.id, groupId), view)) return;
    total += 1;
    if (ck[row.id]?.[tier]) included += 1;
  }

  for (const group of doc.CG) {
    for (const row of group.rows) considerRow(row, group.id);
  }
  for (const id of Object.keys(doc.place)) {
    const promoted = promotedRow(doc, id);
    if (promoted) considerRow(promoted.row, promoted.groupId);
  }

  for (const [id, svc] of Object.entries(doc.MASTER)) {
    if (doc.place[id] !== "scope") continue;
    const ownerId = doc.scopeOwner[id];
    if (ownerId && !isOwnerVisibleAtView(doc, ownerId, view)) continue;
    total += 1;
    if (psk[id]?.[tier]) {
      included += 1;
    } else if (!exclIgnore[id]?.[tier]) {
      excludedValue += annualScopeValue(doc, id, svc);
    }
  }
  return { included, total, excludedValue };
}

export interface ExcludedItem {
  id: string;
  name: string;
  kind: "cost" | "scope";
  /** Why this item isn't in the tier's total: hidden entirely at this view, or visible but unchecked/unincluded for this tier. */
  reason: "hidden" | "unchecked";
  /** Whether the tier checkbox itself is already on (a "hidden" row can still be checked — only its view is the problem). */
  checked: boolean;
  /** Intentionally dismissed from the excluded-value gauge (via "Ignore") — still not in the tier's total, just not counted as a "missed" dollar. */
  ignored: boolean;
  annualValue: number;
}

/**
 * The itemized breakdown behind serviceStats().excludedValue, one row per
 * excluded cost-row/promoted-service and unchecked scope-catalog service, so
 * the UI can list what's being left out instead of just a lump sum. Includes
 * ignored items too (flagged via `ignored`) so the UI can offer an undo;
 * callers computing a dollar total should sum only the non-ignored ones, to
 * match serviceStats().excludedValue exactly. Sorted largest dollar impact
 * first.
 */
export function excludedItems(doc: CalcDoc, tier: Tier, view: CostView = doc.cv): ExcludedItem[] {
  const ck = activeTemplate(doc).ck;
  const psk = activeTemplate(doc).psk;
  const exclIgnore = activeTemplate(doc).exclIgnore;
  const items: ExcludedItem[] = [];

  function considerCostRow(row: CostRow, groupId: string) {
    const visible = isVisible(rowView(doc, row.id, groupId), view);
    const checked = !!ck[row.id]?.[tier];
    if (visible && checked) return;
    items.push({
      id: row.id,
      name: row.name,
      kind: "cost",
      reason: visible ? "unchecked" : "hidden",
      checked,
      ignored: !!exclIgnore[row.id]?.[tier],
      annualValue: cmo(row, doc) * 12,
    });
  }

  for (const group of doc.CG) {
    for (const row of group.rows) considerCostRow(row, group.id);
  }
  for (const id of Object.keys(doc.place)) {
    const promoted = promotedRow(doc, id);
    if (promoted) considerCostRow(promoted.row, promoted.groupId);
  }

  for (const [id, svc] of Object.entries(doc.MASTER)) {
    if (doc.place[id] !== "scope") continue;
    const ownerId = doc.scopeOwner[id];
    if (ownerId && !isOwnerVisibleAtView(doc, ownerId, view)) continue;
    if (psk[id]?.[tier]) continue;
    items.push({
      id,
      name: svc.n,
      kind: "scope",
      reason: "unchecked",
      checked: false,
      ignored: !!exclIgnore[id]?.[tier],
      annualValue: annualScopeValue(doc, id, svc),
    });
  }

  return items.sort((a, b) => b.annualValue - a.annualValue);
}
