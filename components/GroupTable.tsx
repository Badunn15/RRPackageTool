"use client";

import { Fragment } from "react";
import { activeTemplate, cmo } from "@/lib/calc";
import { Basis, CalcDoc, CostRow, CostView, TIERS } from "@/lib/types";

const BASIS_LABEL: Record<Basis, string> = {
  annual: "$/yr",
  monthly: "$/mo",
  door: "$/door/mo",
  door_yr: "$/door/yr",
  seat: "$/seat/mo",
  listing: "$/list/mo",
  event: "$/event",
  claim: "$/claim",
  af: "(AppFolio)",
};

const VIEW_ORDER: Record<CostView, number> = { direct: 0, allocated: 1, loaded: 2 };

export default function GroupTable({
  doc,
  editMode,
  onRateChange,
  onBurdenChange,
  onEventsChange,
  onAfChange,
  onToggleTier,
  onToggleCollapsed,
  onGroupViewChange,
  onRenameRow,
  onRemoveRow,
}: {
  doc: CalcDoc;
  editMode: boolean;
  onRateChange: (rowId: string, value: number) => void;
  onBurdenChange: (rowId: string, value: number) => void;
  onEventsChange: (rowId: string, value: number) => void;
  onAfChange: (key: keyof CalcDoc["af"], value: number) => void;
  onToggleTier: (rowId: string, tier: "min" | "special" | "plus") => void;
  onToggleCollapsed: (groupId: string) => void;
  onGroupViewChange: (groupId: string, view: CostView) => void;
  onRenameRow: (rowId: string, name: string) => void;
  onRemoveRow: (rowId: string) => void;
}) {
  const ck = activeTemplate(doc).ck;
  const activeView = doc.cv;

  return (
    <div className="overflow-x-auto rounded-md border border-gold/20">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="bg-card text-left text-xs uppercase tracking-wide text-gold/80">
            <th className="px-3 py-2">Line</th>
            <th className="px-3 py-2 text-right">Rate</th>
            <th className="px-3 py-2">Basis</th>
            <th className="px-3 py-2 text-right">$/mo</th>
            <th className="px-3 py-2 text-right">$/door</th>
            <th className="px-2 py-2 text-center">Min</th>
            <th className="px-2 py-2 text-center">Special</th>
            <th className="px-2 py-2 text-center">Plus</th>
            {editMode && <th className="px-2 py-2" />}
          </tr>
        </thead>
        <tbody>
          {doc.CG.map((group) => {
            const collapsed = !!doc.co[group.id];
            const rowView = doc.secView[group.id] ?? "direct";
            const groupHidden = VIEW_ORDER[rowView] > VIEW_ORDER[activeView];
            const groupTotal = group.rows.reduce((sum, r) => sum + cmo(r, doc), 0);

            return (
              <Fragment key={group.id}>
                <tr className="border-t border-gold/20 bg-navy/60">
                  <td colSpan={editMode ? 9 : 8} className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onToggleCollapsed(group.id)}
                        className="text-gold"
                      >
                        {collapsed ? "▸" : "▾"}
                      </button>
                      <span className="font-display text-base text-cream">{group.label}</span>
                      {groupHidden && (
                        <span className="rounded bg-gold/10 px-2 py-0.5 text-[10px] uppercase text-gold/70">
                          hidden at this view
                        </span>
                      )}
                      <select
                        value={rowView}
                        onChange={(e) => onGroupViewChange(group.id, e.target.value as CostView)}
                        className="ml-auto rounded border border-gold/30 bg-navy px-2 py-0.5 font-mono text-xs text-cream"
                      >
                        <option value="direct">direct</option>
                        <option value="allocated">allocated</option>
                        <option value="loaded">loaded</option>
                      </select>
                      <span className="w-24 text-right font-mono text-xs text-cream/60">
                        ${groupTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
                      </span>
                    </div>
                  </td>
                </tr>
                {!collapsed &&
                  group.rows.map((row) => (
                    <Row
                      key={row.id}
                      row={row}
                      doc={doc}
                      editMode={editMode}
                      flags={ck[row.id]}
                      onRateChange={onRateChange}
                      onBurdenChange={onBurdenChange}
                      onEventsChange={onEventsChange}
                      onAfChange={onAfChange}
                      onToggleTier={onToggleTier}
                      onRenameRow={onRenameRow}
                      onRemoveRow={onRemoveRow}
                    />
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  row,
  doc,
  editMode,
  flags,
  onRateChange,
  onBurdenChange,
  onEventsChange,
  onAfChange,
  onToggleTier,
  onRenameRow,
  onRemoveRow,
}: {
  row: CostRow;
  doc: CalcDoc;
  editMode: boolean;
  flags: { min: boolean; special: boolean; plus: boolean } | undefined;
  onRateChange: (rowId: string, value: number) => void;
  onBurdenChange: (rowId: string, value: number) => void;
  onEventsChange: (rowId: string, value: number) => void;
  onAfChange: (key: keyof CalcDoc["af"], value: number) => void;
  onToggleTier: (rowId: string, tier: "min" | "special" | "plus") => void;
  onRenameRow: (rowId: string, name: string) => void;
  onRemoveRow: (rowId: string) => void;
}) {
  const value = doc.vl[row.id] ?? row.v;
  const monthly = cmo(row, doc);
  const perDoor = doc.G.doors ? monthly / doc.G.doors : 0;
  const isAf = row.e === "af";

  return (
    <tr className="border-t border-gold/10">
      <td className="px-3 py-1.5">
        {editMode ? (
          <input
            className="w-full rounded border border-gold/20 bg-navy px-1 py-0.5 text-cream"
            value={row.name}
            onChange={(e) => onRenameRow(row.id, e.target.value)}
          />
        ) : (
          <span className="text-cream/90">{row.name}</span>
        )}
        {row.d && <div className="text-[11px] text-cream/40">{row.d}</div>}
      </td>
      <td className="px-3 py-1.5 text-right">
        {isAf ? (
          <span className="text-cream/40">—</span>
        ) : (
          <input
            type="number"
            className="w-24 rounded border border-gold/20 bg-navy px-1 py-0.5 text-right font-mono text-cream"
            value={value}
            onChange={(e) => onRateChange(row.id, Number(e.target.value))}
          />
        )}
        {row.n_bd !== undefined && (
          <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-cream/50">
            burden
            <input
              type="number"
              className="w-14 rounded border border-gold/20 bg-navy px-1 py-0.5 text-right font-mono text-cream"
              value={doc.bd[row.id] ?? row.n_bd}
              onChange={(e) => onBurdenChange(row.id, Number(e.target.value))}
            />
            %
          </div>
        )}
        {row.n_ev !== undefined && (
          <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-cream/50">
            claims/yr
            <input
              type="number"
              className="w-12 rounded border border-gold/20 bg-navy px-1 py-0.5 text-right font-mono text-cream"
              value={doc.ev[row.id] ?? row.n_ev}
              onChange={(e) => onEventsChange(row.id, Number(e.target.value))}
            />
          </div>
        )}
        {isAf && (
          <div className="mt-1 grid grid-cols-2 gap-1 text-[11px] text-cream/50">
            <AfField label="res $/unit" value={doc.af.rr} onChange={(v) => onAfChange("rr", v)} />
            <AfField label="res units" value={doc.af.rd} onChange={(v) => onAfChange("rd", v)} />
            <AfField label="com $/unit" value={doc.af.cr} onChange={(v) => onAfChange("cr", v)} />
            <AfField label="com units" value={doc.af.cd} onChange={(v) => onAfChange("cd", v)} />
          </div>
        )}
      </td>
      <td className="px-3 py-1.5 font-mono text-xs text-cream/60">{BASIS_LABEL[row.e]}</td>
      <td className="px-3 py-1.5 text-right font-mono text-cream">
        {monthly.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </td>
      <td className="px-3 py-1.5 text-right font-mono text-cream/80">{perDoor.toFixed(2)}</td>
      {TIERS.map((tier) => (
        <td key={tier} className="px-2 py-1.5 text-center">
          <input
            type="checkbox"
            checked={!!flags?.[tier]}
            onChange={() => onToggleTier(row.id, tier)}
          />
        </td>
      ))}
      {editMode && (
        <td className="px-2 py-1.5 text-right">
          <button
            type="button"
            onClick={() => onRemoveRow(row.id)}
            className="text-xs text-red-300 hover:text-red-200"
          >
            remove
          </button>
        </td>
      )}
    </tr>
  );
}

function AfField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-1">
      {label}
      <input
        type="number"
        className="w-14 rounded border border-gold/20 bg-navy px-1 py-0.5 text-right font-mono text-cream"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
