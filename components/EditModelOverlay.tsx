"use client";

import { useRef, useState } from "react";
import { bundleOwnerRows } from "@/lib/calc";
import { Basis, CalcDoc } from "@/lib/types";

const BASES: Basis[] = ["annual", "monthly", "door", "door_yr", "seat", "listing", "event", "claim"];

export default function EditModelOverlay({
  doc,
  onClose,
  onAddGroup,
  onRenameGroup,
  onRemoveGroup,
  onAddRow,
  onRemoveRow,
  onAddCategory,
  onRemoveCategory,
  onRenameCategory,
  onAddScopeService,
  onExport,
  onImport,
}: {
  doc: CalcDoc;
  onClose: () => void;
  onAddGroup: (label: string) => void;
  onRenameGroup: (groupId: string, label: string) => void;
  onRemoveGroup: (groupId: string) => void;
  onAddRow: (groupId: string, name: string, basis: Basis, value: number) => void;
  onRemoveRow: (rowId: string) => void;
  onAddCategory: (name: string) => void;
  onRemoveCategory: (name: string) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
  onAddScopeService: (opts: { name: string; category: string; ownerRowId: string; value: number }) => void;
  onExport: () => void;
  onImport: (file: File) => void;
}) {
  const [tab, setTab] = useState<"groups" | "categories" | "backup">("groups");
  const [newGroupLabel, setNewGroupLabel] = useState("");
  const [newRowGroup, setNewRowGroup] = useState(doc.CG[0]?.id ?? "");
  const [newRowName, setNewRowName] = useState("");
  const [newRowBasis, setNewRowBasis] = useState<Basis>("monthly");
  const [newRowValue, setNewRowValue] = useState(0);
  const [newCategory, setNewCategory] = useState("");
  const owners = bundleOwnerRows(doc);
  const [newSvcName, setNewSvcName] = useState("");
  const [newSvcCategory, setNewSvcCategory] = useState(doc.CATS[0] ?? "");
  const [newSvcOwner, setNewSvcOwner] = useState(owners[0]?.id ?? "");
  const [newSvcValue, setNewSvcValue] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-gold/30 bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-cream">Edit model</h2>
          <button onClick={onClose} className="text-cream/60 hover:text-cream">
            close
          </button>
        </div>

        <div className="mb-4 flex gap-2 border-b border-gold/20 pb-2 text-sm">
          {(["groups", "categories", "backup"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded px-3 py-1 ${tab === t ? "bg-gold text-navy" : "text-cream/70 hover:bg-gold/10"}`}
            >
              {t === "groups" ? "Cost groups & lines" : t === "categories" ? "Scope categories" : "Data & backup"}
            </button>
          ))}
        </div>

        {tab === "groups" && (
          <div className="space-y-6 text-sm">
            <div>
              <h3 className="mb-2 font-semibold text-gold">Cost groups</h3>
              <ul className="space-y-1">
                {doc.CG.map((g) => (
                  <li key={g.id} className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded border border-gold/20 bg-navy px-2 py-1 text-cream"
                      value={g.label}
                      onChange={(e) => onRenameGroup(g.id, e.target.value)}
                    />
                    <span className="text-xs text-cream/40">{g.rows.length} lines</span>
                    <button
                      onClick={() => onRemoveGroup(g.id)}
                      className="text-xs text-red-300 hover:text-red-200"
                    >
                      remove
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2">
                <input
                  placeholder="New group name"
                  className="flex-1 rounded border border-gold/20 bg-navy px-2 py-1 text-cream"
                  value={newGroupLabel}
                  onChange={(e) => setNewGroupLabel(e.target.value)}
                />
                <button
                  onClick={() => {
                    if (!newGroupLabel.trim()) return;
                    onAddGroup(newGroupLabel.trim());
                    setNewGroupLabel("");
                  }}
                  className="rounded bg-gold px-3 py-1 text-navy"
                >
                  Add group
                </button>
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-gold">Add a cost line</h3>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={newRowGroup}
                  onChange={(e) => setNewRowGroup(e.target.value)}
                  className="rounded border border-gold/20 bg-navy px-2 py-1 text-cream"
                >
                  {doc.CG.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Line name"
                  className="rounded border border-gold/20 bg-navy px-2 py-1 text-cream"
                  value={newRowName}
                  onChange={(e) => setNewRowName(e.target.value)}
                />
                <select
                  value={newRowBasis}
                  onChange={(e) => setNewRowBasis(e.target.value as Basis)}
                  className="rounded border border-gold/20 bg-navy px-2 py-1 text-cream"
                >
                  {BASES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Rate"
                  className="w-24 rounded border border-gold/20 bg-navy px-2 py-1 text-cream"
                  value={newRowValue}
                  onChange={(e) => setNewRowValue(Number(e.target.value))}
                />
                <button
                  onClick={() => {
                    if (!newRowName.trim() || !newRowGroup) return;
                    onAddRow(newRowGroup, newRowName.trim(), newRowBasis, newRowValue);
                    setNewRowName("");
                    setNewRowValue(0);
                  }}
                  className="rounded bg-gold px-3 py-1 text-navy"
                >
                  Add line
                </button>
              </div>
              <p className="mt-2 text-xs text-cream/50">
                To remove, reorder, or move a line to another group, use its row in the main table (edit
                mode).
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-gold">Add a PM-scope service</h3>
              <p className="mb-2 text-xs text-cream/50">
                Scope services don&apos;t add to cost directly — their cost is bundled into whichever role
                &quot;owns&quot; them. Reassign ownership any time from that role&apos;s expandable panel in
                the main table.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  placeholder="Service name"
                  className="rounded border border-gold/20 bg-navy px-2 py-1 text-cream"
                  value={newSvcName}
                  onChange={(e) => setNewSvcName(e.target.value)}
                />
                <select
                  value={newSvcCategory}
                  onChange={(e) => setNewSvcCategory(e.target.value)}
                  className="rounded border border-gold/20 bg-navy px-2 py-1 text-cream"
                >
                  {doc.CATS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={newSvcOwner}
                  onChange={(e) => setNewSvcOwner(e.target.value)}
                  className="rounded border border-gold/20 bg-navy px-2 py-1 text-cream"
                >
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Value ($/door/yr)"
                  className="w-28 rounded border border-gold/20 bg-navy px-2 py-1 text-cream"
                  value={newSvcValue}
                  onChange={(e) => setNewSvcValue(Number(e.target.value))}
                />
                <button
                  onClick={() => {
                    if (!newSvcName.trim() || !newSvcCategory || !newSvcOwner) return;
                    onAddScopeService({
                      name: newSvcName.trim(),
                      category: newSvcCategory,
                      ownerRowId: newSvcOwner,
                      value: newSvcValue,
                    });
                    setNewSvcName("");
                    setNewSvcValue(0);
                  }}
                  className="rounded bg-gold px-3 py-1 text-navy"
                >
                  Add service
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "categories" && (
          <div className="text-sm">
            <h3 className="mb-2 font-semibold text-gold">PM scope service categories</h3>
            <ul className="space-y-1">
              {doc.CATS.map((cat) => (
                <li key={cat} className="flex items-center gap-2">
                  <input
                    className="flex-1 rounded border border-gold/20 bg-navy px-2 py-1 text-cream"
                    defaultValue={cat}
                    onBlur={(e) => {
                      const next = e.target.value.trim();
                      if (next && next !== cat) onRenameCategory(cat, next);
                    }}
                  />
                  <button
                    onClick={() => onRemoveCategory(cat)}
                    className="text-xs text-red-300 hover:text-red-200"
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <input
                placeholder="New category"
                className="flex-1 rounded border border-gold/20 bg-navy px-2 py-1 text-cream"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <button
                onClick={() => {
                  if (!newCategory.trim()) return;
                  onAddCategory(newCategory.trim());
                  setNewCategory("");
                }}
                className="rounded bg-gold px-3 py-1 text-navy"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {tab === "backup" && (
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="mb-2 font-semibold text-gold">Export</h3>
              <button onClick={onExport} className="rounded bg-gold px-3 py-1 text-navy">
                Download this scenario as JSON
              </button>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-gold">Import</h3>
              <p className="mb-2 text-xs text-cream/60">
                Replaces this scenario&apos;s model with the uploaded JSON (migrated on the way in, saved as
                a new version — nothing is lost from history).
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImport(file);
                }}
                className="text-cream/80"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
