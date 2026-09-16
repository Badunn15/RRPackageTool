import { CalcDoc, CostGroup, MasterService } from "./types";
import seedJson from "../data/seed-model.json";

/**
 * seed-model.json doubles as the canonical set of shipped defaults: the
 * default cost groups/rows, the default service catalog (MASTER), and their
 * default placement/category/basis. A deploy that adds a new default line
 * here gives it to every scenario on next load, without touching anyone's
 * edited rates or resurrecting anything a user deleted.
 */
const SHIPPED = seedJson as unknown as CalcDoc;

export const CURRENT_SCHEMA = 3;

/**
 * migrate(doc) -> doc
 *
 * Rules (do not violate):
 *   1. Never drop a key this function doesn't recognize — unknown keys pass
 *      through untouched so a stale tab loading a doc written by a newer
 *      deploy doesn't strip data on its next save.
 *   2. Only ever add or reshape. Never overwrite a value that's already
 *      present in the incoming doc.
 *   3. Merge shipped defaults (CG rows, MASTER services, categories) by id,
 *      skipping anything tombstoned in `removed`.
 *   4. Backfill per-row state (vl/bd/ev/pbase/ck/psk) so every row/service
 *      renders even if it predates the field that holds its state.
 *   5. Idempotent: migrate(migrate(doc)) === migrate(doc).
 */
export function migrate(input: unknown): CalcDoc {
  let doc = normalizeLegacy(input);
  doc = mergeShippedDefaults(doc);
  doc = backfillRowState(doc);
  doc.schema = CURRENT_SCHEMA;
  if (!doc.savedAt) doc.savedAt = new Date().toISOString();
  return doc;
}

function emptyDocShape(): Omit<CalcDoc, "schema" | "savedAt" | "G" | "af"> {
  return {
    CG: [],
    CATS: [],
    MASTER: {},
    place: {},
    icat: {},
    udest: {},
    vl: {},
    bd: {},
    ev: {},
    pbase: {},
    scopeOwner: {},
    psv: {},
    uck: {},
    ucv: {},
    secView: {},
    itemView: {},
    cv: "allocated",
    templates: [],
    at: "default",
    co: {},
    so: {},
    removed: {},
  };
}

/**
 * Step 1 (schema bump: legacy v19 -> schema 1 skeleton).
 * The pre-schema format keyed its version off a top-level `v` and had no
 * MASTER/CG/CATS/bd/ev/pbase/removed at all. Rename `v` away and drop the
 * doc into the current shape with everything it's missing left empty, to be
 * filled in by mergeShippedDefaults/backfillRowState below.
 */
function normalizeLegacy(input: unknown): CalcDoc {
  const obj = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const isLegacy = "v" in obj && !("schema" in obj);
  if (isLegacy) {
    const { v: _v, ...rest } = obj;
    return {
      schema: 1,
      savedAt: (rest.savedAt as string) ?? "",
      ...emptyDocShape(),
      ...rest,
    } as CalcDoc;
  }
  return {
    schema: (obj.schema as number) ?? 0,
    savedAt: (obj.savedAt as string) ?? "",
    ...emptyDocShape(),
    ...obj,
  } as CalcDoc;
}

/** Merge shipped default CG groups/rows, MASTER services, and categories by id. */
function mergeShippedDefaults(doc: CalcDoc): CalcDoc {
  if (!doc.removed) doc.removed = {};
  const removed = doc.removed;

  for (const defGroup of SHIPPED.CG) {
    if (removed[`grp:${defGroup.id}`]) continue;
    let group: CostGroup | undefined = doc.CG.find((g) => g.id === defGroup.id);
    if (!group) {
      group = { id: defGroup.id, label: defGroup.label, rows: [] };
      doc.CG.push(group);
    }
    for (const defRow of defGroup.rows) {
      if (removed[`row:${defRow.id}`]) continue;
      const existingRow = group.rows.find((r) => r.id === defRow.id);
      if (!existingRow) {
        group.rows.push({ ...defRow });
        continue;
      }
      // Additive capability backfill: if this deploy declared a row
      // burden/claims-eligible or a bundle owner (pmScope) that an
      // already-seeded scenario predates, that capability applies going
      // forward too. Never touches rate/name/basis -- those are the user's.
      if (defRow.pmScope !== undefined && existingRow.pmScope === undefined) {
        existingRow.pmScope = defRow.pmScope;
      }
      if (defRow.n_bd !== undefined && existingRow.n_bd === undefined) {
        existingRow.n_bd = defRow.n_bd;
      }
      if (defRow.n_ev !== undefined && existingRow.n_ev === undefined) {
        existingRow.n_ev = defRow.n_ev;
      }
    }
  }

  for (const [id, svc] of Object.entries(SHIPPED.MASTER)) {
    if (removed[`svc:${id}`]) continue;
    if (!doc.MASTER[id]) doc.MASTER[id] = svc as MasterService;
    if (doc.place[id] === undefined) doc.place[id] = SHIPPED.place[id];
    if (doc.icat[id] === undefined) doc.icat[id] = SHIPPED.icat[id];
    if (SHIPPED.udest[id] !== undefined && doc.udest[id] === undefined) {
      doc.udest[id] = SHIPPED.udest[id];
    }
    if (doc.scopeOwner[id] === undefined && SHIPPED.scopeOwner[id] !== undefined) {
      doc.scopeOwner[id] = SHIPPED.scopeOwner[id];
    }
  }

  for (const cat of SHIPPED.CATS) {
    if (!removed[`cat:${cat}`] && !doc.CATS.includes(cat)) doc.CATS.push(cat);
  }

  for (const [id, view] of Object.entries(SHIPPED.secView)) {
    if (doc.secView[id] === undefined) doc.secView[id] = view;
  }

  if (!doc.G) doc.G = { ...SHIPPED.G };
  if (!doc.af) doc.af = { ...SHIPPED.af };

  return doc;
}

/** Backfill vl/bd/ev/pbase for every row/service, and ck/psk on every template. */
function backfillRowState(doc: CalcDoc): CalcDoc {
  const cgRows = new Map<string, CostGroup["rows"][number]>();
  for (const group of doc.CG) {
    for (const row of group.rows) cgRows.set(row.id, row);
  }

  for (const [id, row] of cgRows) {
    if (doc.vl[id] === undefined) doc.vl[id] = row.v;
    if (doc.bd[id] === undefined) doc.bd[id] = row.n_bd ?? 0;
    if (doc.ev[id] === undefined) doc.ev[id] = row.n_ev ?? 0;
  }

  const bundleOwnerIds = new Set(
    [...cgRows.values()].filter((r) => r.pmScope === 1).map((r) => r.id)
  );
  const fallbackOwner = bundleOwnerIds.has("pm") ? "pm" : [...bundleOwnerIds][0];

  for (const [id, svc] of Object.entries(doc.MASTER)) {
    if (doc.psv[id] === undefined) doc.psv[id] = svc.dsv;
    if (doc.uck[id] === undefined) doc.uck[id] = { ...svc.dt };
    if (doc.ucv[id] === undefined) doc.ucv[id] = svc.dsv;
    if (doc.pbase[id] === undefined) doc.pbase[id] = "door_yr";
    if (doc.vl[id] === undefined) doc.vl[id] = svc.dsv;
    if (doc.bd[id] === undefined) doc.bd[id] = 0;
    if (doc.ev[id] === undefined) doc.ev[id] = 0;
    // A scope service without a valid bundle owner (missing, or pointing at a
    // row that was removed / never had pmScope set) falls back to "pm" (or
    // whatever bundle-owner row exists) so it always renders somewhere.
    if (
      doc.place[id] === "scope" &&
      fallbackOwner &&
      (doc.scopeOwner[id] === undefined || !bundleOwnerIds.has(doc.scopeOwner[id]))
    ) {
      doc.scopeOwner[id] = fallbackOwner;
    }
  }

  if (!doc.templates.length) {
    doc.templates = [{ id: "default", name: "Default", ck: {}, psk: {} }];
  }
  if (!doc.templates.some((t) => t.id === doc.at)) {
    doc.at = doc.templates[0].id;
  }
  for (const tpl of doc.templates) {
    if (!tpl.ck) tpl.ck = {};
    if (!tpl.psk) tpl.psk = {};
    for (const id of cgRows.keys()) {
      if (!tpl.ck[id]) tpl.ck[id] = { min: true, special: true, plus: true };
    }
    for (const [id, svc] of Object.entries(doc.MASTER)) {
      if (!tpl.ck[id]) tpl.ck[id] = { ...svc.dt };
      if (!tpl.psk[id]) tpl.psk[id] = { ...svc.dt };
    }
  }

  return doc;
}
