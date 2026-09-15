export type Basis =
  | "annual"
  | "monthly"
  | "door"
  | "door_yr"
  | "seat"
  | "listing"
  | "event"
  | "claim"
  | "af";

export type Tier = "min" | "special" | "plus";

export type CostView = "direct" | "allocated" | "loaded";

export interface TierFlags {
  min: boolean;
  special: boolean;
  plus: boolean;
}

export interface CostRow {
  id: string;
  name: string;
  e: Basis;
  v: number;
  n_bd?: number;
  n_ev?: number;
  sub?: 1;
  pmScope?: 1;
  d?: string;
}

export interface CostGroup {
  id: string;
  label: string;
  rows: CostRow[];
}

/** Placement of a PM-scope service: bundled in scope, benched (upsell), or promoted into a cost group. */
export type Placement = "scope" | "uc" | string; // "cost:<groupId>"

/** Staged destination for a benched service once it's moved. */
export type Destination = string; // "cost::<groupId>" | "scope::<Category>"

export interface MasterService {
  id: string;
  n: string;
  d?: string;
  dp: "scope" | "uc";
  dc: string;
  dsv: number;
  dt: TierFlags;
  dest?: Destination;
}

export interface Globals {
  doors: number;
  rent: number;
  seats: number;
  listings: number;
  tenancy: number;
  wo: number;
}

export interface AppFolioConfig {
  rr: number;
  cr: number;
  rd: number;
  cd: number;
  ic: 0 | 1;
}

/**
 * A saved tier-checkbox preset. Its `ck` (cost row / promoted service tier
 * inclusion) and `psk` (scope service tier inclusion) ARE the live checkbox
 * state for whichever template is active — there is no separate top-level
 * `ck`/`psk` map. This matches seed-model.json, which is authoritative over
 * the handoff doc's summary table.
 */
export interface ScenarioTemplate {
  id: string;
  name: string;
  ck: Record<string, TierFlags>;
  psk: Record<string, TierFlags>;
}

/**
 * The entire model document — one JSON blob, read and written as a whole.
 * Unknown keys must always be preserved through load/save/migrate.
 */
export interface CalcDoc {
  schema: number;
  savedAt: string;
  G: Globals;
  af: AppFolioConfig;
  CG: CostGroup[];
  CATS: string[];
  MASTER: Record<string, MasterService>;
  place: Record<string, Placement>;
  icat: Record<string, string>;
  udest: Record<string, Destination>;
  vl: Record<string, number>;
  bd: Record<string, number>;
  ev: Record<string, number>;
  pbase: Record<string, Basis>;
  psv: Record<string, number>;
  uck: Record<string, TierFlags>;
  ucv: Record<string, number>;
  secView: Record<string, CostView>;
  itemView: Record<string, CostView>;
  cv: CostView;
  templates: ScenarioTemplate[];
  at: string;
  co: Record<string, boolean>;
  so: Record<string, boolean>;
  removed: Record<string, true>;
  [key: string]: unknown;
}

export const TIERS: Tier[] = ["min", "special", "plus"];
export const COST_VIEWS: CostView[] = ["direct", "allocated", "loaded"];
export const TIER_LABELS: Record<Tier, string> = {
  min: "Min Mgmt",
  special: "Raynor Special",
  plus: "Prot Plus",
};
