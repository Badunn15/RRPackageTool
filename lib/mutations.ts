import { activeTemplate, ExcludedItem } from "./calc";
import { Basis, CalcDoc, CostView, Destination, TierFlags, Tier } from "./types";

function clone(doc: CalcDoc): CalcDoc {
  return structuredClone(doc);
}

export function setCostView(doc: CalcDoc, view: CostView): CalcDoc {
  const next = clone(doc);
  next.cv = view;
  return next;
}

export function setGlobal(doc: CalcDoc, key: keyof CalcDoc["G"], value: number): CalcDoc {
  const next = clone(doc);
  next.G[key] = value;
  return next;
}

export function setAfConfig(doc: CalcDoc, key: keyof CalcDoc["af"], value: number): CalcDoc {
  const next = clone(doc);
  (next.af[key] as number) = value;
  return next;
}

export function setRowRate(doc: CalcDoc, rowId: string, value: number): CalcDoc {
  const next = clone(doc);
  next.vl[rowId] = value;
  return next;
}

export function setRowBasis(doc: CalcDoc, rowId: string, basis: Basis): CalcDoc {
  const next = clone(doc);
  for (const group of next.CG) {
    const row = group.rows.find((r) => r.id === rowId);
    if (row) row.e = basis;
  }
  return next;
}

export function setRowBurden(doc: CalcDoc, rowId: string, value: number): CalcDoc {
  const next = clone(doc);
  next.bd[rowId] = value;
  return next;
}

export function setRowEvents(doc: CalcDoc, rowId: string, value: number): CalcDoc {
  const next = clone(doc);
  next.ev[rowId] = value;
  return next;
}

export function toggleTier(doc: CalcDoc, rowId: string, tier: Tier): CalcDoc {
  const next = clone(doc);
  const tpl = activeTemplate(next);
  if (!tpl.ck[rowId]) tpl.ck[rowId] = { min: false, special: false, plus: false };
  tpl.ck[rowId][tier] = !tpl.ck[rowId][tier];
  return next;
}

export function setGroupView(doc: CalcDoc, groupId: string, view: CostView): CalcDoc {
  const next = clone(doc);
  next.secView[groupId] = view;
  return next;
}

/** Per-row cost-view override. `null` clears it, so the row inherits its group's view again. */
export function setItemView(doc: CalcDoc, rowId: string, view: CostView | null): CalcDoc {
  const next = clone(doc);
  if (view === null) delete next.itemView[rowId];
  else next.itemView[rowId] = view;
  return next;
}

/** Reorder a line within its group (direction: -1 up, +1 down). */
export function reorderRow(doc: CalcDoc, groupId: string, rowId: string, direction: -1 | 1): CalcDoc {
  const next = clone(doc);
  const group = next.CG.find((g) => g.id === groupId);
  if (!group) return next;
  const idx = group.rows.findIndex((r) => r.id === rowId);
  const newIdx = idx + direction;
  if (idx === -1 || newIdx < 0 || newIdx >= group.rows.length) return next;
  const [row] = group.rows.splice(idx, 1);
  group.rows.splice(newIdx, 0, row);
  return next;
}

/** Move a cost line from its current group into a different one. */
export function moveRowToGroup(doc: CalcDoc, rowId: string, targetGroupId: string): CalcDoc {
  const next = clone(doc);
  let moved: CalcDoc["CG"][number]["rows"][number] | undefined;
  for (const group of next.CG) {
    const idx = group.rows.findIndex((r) => r.id === rowId);
    if (idx !== -1) {
      moved = group.rows.splice(idx, 1)[0];
      break;
    }
  }
  if (!moved) return next;
  const target = next.CG.find((g) => g.id === targetGroupId);
  if (target) target.rows.push(moved);
  return next;
}

export function toggleGroupCollapsed(doc: CalcDoc, groupId: string): CalcDoc {
  const next = clone(doc);
  next.co[groupId] = !next.co[groupId];
  return next;
}

export function addGroup(doc: CalcDoc, label: string): CalcDoc {
  const next = clone(doc);
  const id = slug(label, next.CG.map((g) => g.id));
  next.CG.push({ id, label, rows: [] });
  next.secView[id] = "direct";
  return next;
}

export function renameGroup(doc: CalcDoc, groupId: string, label: string): CalcDoc {
  const next = clone(doc);
  const group = next.CG.find((g) => g.id === groupId);
  if (group) group.label = label;
  return next;
}

export function removeGroup(doc: CalcDoc, groupId: string): CalcDoc {
  const next = clone(doc);
  next.CG = next.CG.filter((g) => g.id !== groupId);
  next.removed[`grp:${groupId}`] = true;
  // Any service promoted into this group (place = "cost:<groupId>") would
  // otherwise become invisible in the table but keep contributing to cost
  // totals, since calculate() resolves promoted rows from `place` directly
  // rather than from what's actually still in CG. Send them back to the
  // bench instead of silently orphaning them.
  for (const id of Object.keys(next.place)) {
    if (next.place[id] === `cost:${groupId}`) next.place[id] = "uc";
  }
  return next;
}

export function addRow(
  doc: CalcDoc,
  groupId: string,
  name: string,
  basis: Basis,
  value: number
): CalcDoc {
  const next = clone(doc);
  const group = next.CG.find((g) => g.id === groupId);
  if (!group) return next;
  const allIds = next.CG.flatMap((g) => g.rows.map((r) => r.id));
  const id = slug(name, allIds);
  group.rows.push({ id, name, e: basis, v: value });
  next.vl[id] = value;
  next.bd[id] = 0;
  next.ev[id] = 0;
  for (const tpl of next.templates) {
    tpl.ck[id] = { min: true, special: true, plus: true };
  }
  return next;
}

export function renameRow(doc: CalcDoc, rowId: string, name: string): CalcDoc {
  const next = clone(doc);
  for (const group of next.CG) {
    const row = group.rows.find((r) => r.id === rowId);
    if (row) row.name = name;
  }
  return next;
}

export function removeRow(doc: CalcDoc, rowId: string): CalcDoc {
  const next = clone(doc);
  for (const group of next.CG) {
    group.rows = group.rows.filter((r) => r.id !== rowId);
  }
  next.removed[`row:${rowId}`] = true;
  return next;
}

export function addCategory(doc: CalcDoc, name: string): CalcDoc {
  const next = clone(doc);
  if (!next.CATS.includes(name)) next.CATS.push(name);
  return next;
}

export function removeCategory(doc: CalcDoc, name: string): CalcDoc {
  const next = clone(doc);
  next.CATS = next.CATS.filter((c) => c !== name);
  next.removed[`cat:${name}`] = true;
  return next;
}

export function renameCategory(doc: CalcDoc, oldName: string, newName: string): CalcDoc {
  const next = clone(doc);
  const idx = next.CATS.indexOf(oldName);
  if (idx === -1 || !newName.trim() || next.CATS.includes(newName)) return next;
  next.CATS[idx] = newName;
  for (const id of Object.keys(next.icat)) {
    if (next.icat[id] === oldName) next.icat[id] = newName;
  }
  for (const svc of Object.values(next.MASTER)) {
    if (svc.dc === oldName) svc.dc = newName;
  }
  return next;
}

/** Toggle a PM-scope service's tier inclusion (lives in the active template's `psk`, mirroring `ck`). */
export function togglePsk(doc: CalcDoc, serviceId: string, tier: Tier): CalcDoc {
  const next = clone(doc);
  const tpl = activeTemplate(next);
  if (!tpl.psk[serviceId]) tpl.psk[serviceId] = { min: false, special: false, plus: false };
  tpl.psk[serviceId][tier] = !tpl.psk[serviceId][tier];
  return next;
}

/**
 * Toggle whether an item's dollar value is dismissed from the excluded-value
 * gauge for a tier. Purely cosmetic to the gauge -- never touches ck/psk/
 * itemView, so the item stays exactly as unchecked/hidden as it was; this
 * just stops counting it as a "missed" dollar (e.g. "not sure what this
 * costs yet, don't hold it against the total").
 */
export function toggleExclusionIgnored(doc: CalcDoc, id: string, tier: Tier): CalcDoc {
  const next = clone(doc);
  const tpl = activeTemplate(next);
  if (!tpl.exclIgnore[id]) tpl.exclIgnore[id] = { min: false, special: false, plus: false };
  tpl.exclIgnore[id][tier] = !tpl.exclIgnore[id][tier];
  return next;
}

/**
 * Force an excluded item (from calc.ts's excludedItems()) into a tier's
 * total: clears any per-row view override hiding it at the current view,
 * then checks its tier box if it isn't already. The two steps are
 * independent because a "hidden" cost row can still have its checkbox on —
 * only the view was the problem.
 */
export function includeExcludedItem(doc: CalcDoc, item: ExcludedItem, tier: Tier): CalcDoc {
  let next = doc;
  if (item.kind === "cost" && item.reason === "hidden") {
    next = setItemView(next, item.id, next.cv);
  }
  if (item.checked) return next;
  return item.kind === "cost" ? toggleTier(next, item.id, tier) : togglePsk(next, item.id, tier);
}

/** Reassign which bundle-owner row (PM comp, Maintenance Coordinator, Accounting, ...) a scope service shows up under. */
export function setScopeOwner(doc: CalcDoc, serviceId: string, ownerRowId: string): CalcDoc {
  const next = clone(doc);
  next.scopeOwner[serviceId] = ownerRowId;
  return next;
}

/** Move a scope service into a different PM-scope category (e.g. Communication & Support -> Leasing & Placement). */
export function setServiceCategory(doc: CalcDoc, serviceId: string, category: string): CalcDoc {
  const next = clone(doc);
  next.icat[serviceId] = category;
  return next;
}

/** Edit a scope service's own indicative value (`psv`) — $/door/yr or $/event depending on `pbase` — used for the "value excluded" estimate. */
export function setScopeServiceValue(doc: CalcDoc, serviceId: string, value: number): CalcDoc {
  const next = clone(doc);
  next.psv[serviceId] = value;
  return next;
}

/**
 * Set a scope service's value via hours instead of a dollar figure: `hours`
 * of the bundle owner's time, converted live using their derived hourly
 * rate. Passing 0 clears hours mode and falls back to the manually-entered
 * `psv` dollar figure.
 */
export function setScopeServiceHours(doc: CalcDoc, serviceId: string, hours: number): CalcDoc {
  const next = clone(doc);
  next.psh[serviceId] = hours;
  return next;
}

/** Rename an existing PM-scope service (e.g. "Owner distributions (weekly)"). */
export function renameScopeService(doc: CalcDoc, serviceId: string, name: string): CalcDoc {
  const next = clone(doc);
  const svc = next.MASTER[serviceId];
  if (svc) svc.n = name;
  return next;
}

/** Add a brand-new PM-scope service, owned by the given bundle row, in the given category. */
export function addScopeService(
  doc: CalcDoc,
  opts: { name: string; category: string; ownerRowId: string; value?: number }
): CalcDoc {
  const next = clone(doc);
  const id = slug(opts.name, Object.keys(next.MASTER));
  const dt: TierFlags = { min: true, special: true, plus: true };
  const value = opts.value ?? 0;
  next.MASTER[id] = { id, n: opts.name, dp: "scope", dc: opts.category, dsv: value, dt };
  next.place[id] = "scope";
  next.icat[id] = opts.category;
  next.scopeOwner[id] = opts.ownerRowId;
  next.psv[id] = value;
  next.ucv[id] = value;
  next.uck[id] = { ...dt };
  next.pbase[id] = "door_yr";
  next.vl[id] = value;
  next.bd[id] = 0;
  next.ev[id] = 0;
  for (const tpl of next.templates) tpl.psk[id] = { ...dt };
  return next;
}

export function removeScopeService(doc: CalcDoc, serviceId: string): CalcDoc {
  const next = clone(doc);
  delete next.MASTER[serviceId];
  next.removed[`svc:${serviceId}`] = true;
  return next;
}

/** Stage where a benched service should go — the destination picker in the Bench overlay. */
export function setBenchDestination(doc: CalcDoc, serviceId: string, destination: Destination): CalcDoc {
  const next = clone(doc);
  next.udest[serviceId] = destination;
  return next;
}

/** Send a live scope or promoted service back to the bench. */
export function benchService(doc: CalcDoc, serviceId: string): CalcDoc {
  const next = clone(doc);
  next.place[serviceId] = "uc";
  return next;
}

/** Move a benched service to its staged destination — either a cost group or a scope category. */
export function promoteFromBench(doc: CalcDoc, serviceId: string): CalcDoc {
  const next = clone(doc);
  const master = next.MASTER[serviceId];
  const destination = next.udest[serviceId];
  if (!master || !destination) return next;
  const [kind, target] = destination.split("::");

  if (kind === "cost" && target) {
    next.place[serviceId] = `cost:${target}`;
    if (next.pbase[serviceId] === undefined) next.pbase[serviceId] = "door_yr";
    if (next.vl[serviceId] === undefined) next.vl[serviceId] = master.dsv;
    for (const tpl of next.templates) {
      if (!tpl.ck[serviceId]) tpl.ck[serviceId] = { ...master.dt };
    }
  } else if (kind === "scope" && target) {
    next.place[serviceId] = "scope";
    next.icat[serviceId] = target;
    if (next.scopeOwner[serviceId] === undefined) next.scopeOwner[serviceId] = "pm";
    for (const tpl of next.templates) {
      if (!tpl.psk[serviceId]) tpl.psk[serviceId] = { ...master.dt };
    }
  }
  return next;
}

function slug(label: string, existing: string[]): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "item";
  let id = base;
  let n = 1;
  while (existing.includes(id)) {
    id = `${base}_${++n}`;
  }
  return id;
}
