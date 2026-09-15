import { activeTemplate } from "./calc";
import { Basis, CalcDoc, CostView, Tier } from "./types";

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
