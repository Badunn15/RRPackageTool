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
  servicesByTier: Record<Tier, number>;
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
  const services: Record<Tier, number> = { min: 0, special: 0, plus: 0 };
  const ck = activeTemplate(doc).ck;

  function apply(row: CostRow, groupId: string) {
    const rv = rowView(doc, row.id, groupId);
    if (!isVisible(rv, view)) return;
    const flags = ck[row.id];
    if (!flags) return;
    const monthly = cmo(row, doc);
    for (const t of TIERS) {
      if (flags[t]) {
        total[t] += monthly;
        services[t] += 1;
      }
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

  return { totalByTier: total, perDoorByTier: perDoor, servicesByTier: services };
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

export interface ScopeServiceStats {
  included: number;
  total: number;
  /** Sum of `psv` ($/door/yr) for scope services NOT checked at this tier — a rough, non-authoritative gauge of what's being left out, not a hard number. */
  excludedValue: number;
}

/** How many PM-scope services are included at a tier, and a rough indicative $/door/yr value for the ones that aren't. */
export function scopeServiceStats(doc: CalcDoc, tier: Tier): ScopeServiceStats {
  const psk = activeTemplate(doc).psk;
  let included = 0;
  let total = 0;
  let excludedValue = 0;
  for (const [id, svc] of Object.entries(doc.MASTER)) {
    if (doc.place[id] !== "scope") continue;
    total += 1;
    if (psk[id]?.[tier]) {
      included += 1;
    } else {
      excludedValue += doc.psv[id] ?? svc.dsv;
    }
  }
  return { included, total, excludedValue };
}
