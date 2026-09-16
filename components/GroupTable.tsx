"use client";

import { Fragment, useState } from "react";
import { activeTemplate, cmo, formulaText, promotedRowsForGroup } from "@/lib/calc";
import { Basis, CalcDoc, CostRow, CostView, TIERS } from "@/lib/types";
import ScopeBundlePanel from "./ScopeBundlePanel";

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

export interface GroupTableHandlers {
  onRateChange: (rowId: string, value: number) => void;
  onBurdenChange: (rowId: string, value: number) => void;
  onEventsChange: (rowId: string, value: number) => void;
  onAfChange: (key: keyof CalcDoc["af"], value: number) => void;
  onToggleTier: (rowId: string, tier: "min" | "special" | "plus") => void;
  onToggleCollapsed: (groupId: string) => void;
  onGroupViewChange: (groupId: string, view: CostView) => void;
  onItemViewChange: (rowId: string, view: CostView | null) => void;
  onRenameRow: (rowId: string, name: string) => void;
  onRemoveRow: (rowId: string) => void;
  onReorderRow: (groupId: string, rowId: string, direction: -1 | 1) => void;
  onMoveRowToGroup: (rowId: string, targetGroupId: string) => void;
  onToggleScopeTier: (serviceId: string, tier: "min" | "special" | "plus") => void;
  onScopeOwnerChange: (serviceId: string, newOwnerId: string) => void;
  onBenchService: (serviceId: string) => void;
}

export default function GroupTable({
  doc,
  editMode,
  ...h
}: { doc: CalcDoc; editMode: boolean } & GroupTableHandlers) {
  const ck = activeTemplate(doc).ck;
  const activeView = doc.cv;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(rowId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }

  return (
    <div className="overflow-x-auto rounded-md border border-gold/20">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead>
          <tr className="bg-card text-left text-xs uppercase tracking-wide text-gold/80">
            <th className="px-3 py-2">Line</th>
            <th className="px-3 py-2 text-right">Rate</th>
            <th className="px-3 py-2">Basis</th>
            <th className="px-3 py-2">View</th>
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
            const promotedRows = promotedRowsForGroup(doc, group.id);
            const allRows = [...group.rows, ...promotedRows];
            const groupTotal = allRows.reduce((sum, r) => sum + cmo(r, doc), 0);
            const colCount = editMode ? 10 : 9;

            return (
              <Fragment key={group.id}>
                <tr className="border-t border-gold/30 bg-card">
                  <td colSpan={colCount} className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => h.onToggleCollapsed(group.id)}
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
                        onChange={(e) => h.onGroupViewChange(group.id, e.target.value as CostView)}
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
                  group.rows.map((row, idx) => (
                    <Row
                      key={row.id}
                      row={row}
                      doc={doc}
                      groups={doc.CG}
                      currentGroupId={group.id}
                      editMode={editMode}
                      expanded={expanded.has(row.id)}
                      onToggleExpanded={() => toggleExpanded(row.id)}
                      isFirst={idx === 0}
                      isLast={idx === group.rows.length - 1}
                      flags={ck[row.id]}
                      handlers={h}
                    />
                  ))}
                {!collapsed &&
                  promotedRows.map((row) => (
                    <Row
                      key={row.id}
                      row={row}
                      doc={doc}
                      groups={doc.CG}
                      currentGroupId={group.id}
                      editMode={editMode}
                      expanded={expanded.has(row.id)}
                      onToggleExpanded={() => toggleExpanded(row.id)}
                      isFirst
                      isLast
                      isPromoted
                      flags={ck[row.id]}
                      handlers={h}
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
  groups,
  currentGroupId,
  editMode,
  expanded,
  onToggleExpanded,
  isFirst,
  isLast,
  isPromoted,
  flags,
  handlers: h,
}: {
  row: CostRow;
  doc: CalcDoc;
  groups: CalcDoc["CG"];
  currentGroupId: string;
  editMode: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  isFirst: boolean;
  isLast: boolean;
  isPromoted?: boolean;
  flags: { min: boolean; special: boolean; plus: boolean } | undefined;
  handlers: GroupTableHandlers;
}) {
  const value = doc.vl[row.id] ?? row.v;
  const monthly = cmo(row, doc);
  const perDoor = doc.G.doors ? monthly / doc.G.doors : 0;
  const isAf = row.e === "af";
  const hasSubConfig = row.n_bd !== undefined || row.n_ev !== undefined || isAf;
  const hasScopePanel = row.pmScope === 1;
  const canExpand = hasSubConfig || hasScopePanel;
  const itemView = doc.itemView[row.id] as CostView | undefined;

  return (
    <>
      <tr className="border-t border-gold/10 bg-card/20 hover:bg-card/40">
        <td className="px-3 py-1.5">
          <div className="flex items-center gap-1.5">
            {canExpand && (
              <button
                type="button"
                onClick={onToggleExpanded}
                className="text-gold/60 hover:text-gold"
                title={hasScopePanel ? "Included services" : "More settings"}
              >
                {expanded ? "▾" : "▸"}
              </button>
            )}
            {editMode && !isPromoted ? (
              <input
                className="w-full rounded border border-gold/20 bg-navy px-1 py-0.5 text-cream"
                value={row.name}
                onChange={(e) => h.onRenameRow(row.id, e.target.value)}
              />
            ) : (
              <span className="text-cream/90">{row.name}</span>
            )}
            {isPromoted && (
              <span className="rounded bg-gold/10 px-1.5 py-0.5 text-[10px] uppercase text-gold/60">
                promoted
              </span>
            )}
          </div>
          {row.d && <div className="pl-5 text-[11px] text-cream/40">{row.d}</div>}
        </td>
        <td className="px-3 py-1.5 text-right">
          {isAf ? (
            <span className="text-cream/40">—</span>
          ) : (
            <input
              type="number"
              className="w-24 rounded border border-gold/20 bg-navy px-1 py-0.5 text-right font-mono text-cream"
              value={value}
              onChange={(e) => h.onRateChange(row.id, Number(e.target.value))}
            />
          )}
        </td>
        <td className="px-3 py-1.5 font-mono text-xs text-cream/60">{BASIS_LABEL[row.e]}</td>
        <td className="px-3 py-1.5">
          <select
            value={itemView ?? ""}
            onChange={(e) => h.onItemViewChange(row.id, (e.target.value || null) as CostView | null)}
            className="rounded border border-gold/20 bg-navy px-1 py-0.5 font-mono text-[11px] text-cream/70"
            title="Override this line's cost view (blank = inherit from group)"
          >
            <option value="">inherit</option>
            <option value="direct">direct</option>
            <option value="allocated">allocated</option>
            <option value="loaded">loaded</option>
          </select>
        </td>
        <td className="px-3 py-1.5 text-right font-mono text-cream">
          <span className="cursor-help border-b border-dotted border-cream/30" title={formulaText(row, doc)}>
            {monthly.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </td>
        <td className="px-3 py-1.5 text-right font-mono text-cream/80">{perDoor.toFixed(2)}</td>
        {TIERS.map((tier) => (
          <td key={tier} className="px-2 py-1.5 text-center">
            <input
              type="checkbox"
              checked={!!flags?.[tier]}
              onChange={() => h.onToggleTier(row.id, tier)}
            />
          </td>
        ))}
        {editMode && (
          <td className="whitespace-nowrap px-2 py-1.5 text-right">
            {!isPromoted && (
              <span className="mr-2 inline-flex flex-col align-middle leading-none">
                <button
                  type="button"
                  disabled={isFirst}
                  onClick={() => h.onReorderRow(currentGroupId, row.id, -1)}
                  className="text-cream/50 hover:text-gold disabled:opacity-20"
                  title="Move up"
                >
                  {"▴"}
                </button>
                <button
                  type="button"
                  disabled={isLast}
                  onClick={() => h.onReorderRow(currentGroupId, row.id, 1)}
                  className="text-cream/50 hover:text-gold disabled:opacity-20"
                  title="Move down"
                >
                  {"▾"}
                </button>
              </span>
            )}
            {!isPromoted && (
              <select
                value={currentGroupId}
                onChange={(e) => h.onMoveRowToGroup(row.id, e.target.value)}
                className="mr-2 rounded border border-gold/20 bg-navy px-1 py-0.5 text-[11px] text-cream"
                title="Move to another group"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            )}
            {isPromoted ? (
              <button
                type="button"
                onClick={() => h.onBenchService(row.id)}
                className="text-xs text-cream/50 hover:text-gold"
              >
                bench
              </button>
            ) : (
              <button
                type="button"
                onClick={() => h.onRemoveRow(row.id)}
                className="text-xs text-red-300 hover:text-red-200"
              >
                remove
              </button>
            )}
          </td>
        )}
      </tr>
      {expanded && hasSubConfig && (
        <tr className="border-t border-gold/5 bg-navy/40">
          <td colSpan={editMode ? 10 : 9} className="px-6 py-2">
            <div className="flex flex-wrap items-center gap-4 text-xs text-cream/60">
              {row.n_bd !== undefined && (
                <label className="flex items-center gap-1">
                  Payroll burden %
                  <input
                    type="number"
                    className="w-16 rounded border border-gold/20 bg-navy px-1 py-0.5 text-right font-mono text-cream"
                    value={doc.bd[row.id] ?? row.n_bd}
                    onChange={(e) => h.onBurdenChange(row.id, Number(e.target.value))}
                  />
                </label>
              )}
              {row.n_ev !== undefined && (
                <label className="flex items-center gap-1">
                  Claims / yr
                  <input
                    type="number"
                    className="w-14 rounded border border-gold/20 bg-navy px-1 py-0.5 text-right font-mono text-cream"
                    value={doc.ev[row.id] ?? row.n_ev}
                    onChange={(e) => h.onEventsChange(row.id, Number(e.target.value))}
                  />
                </label>
              )}
              {isAf && (
                <>
                  <AfField label="res $/unit" value={doc.af.rr} onChange={(v) => h.onAfChange("rr", v)} />
                  <AfField label="res units" value={doc.af.rd} onChange={(v) => h.onAfChange("rd", v)} />
                  <AfField label="com $/unit" value={doc.af.cr} onChange={(v) => h.onAfChange("cr", v)} />
                  <AfField label="com units" value={doc.af.cd} onChange={(v) => h.onAfChange("cd", v)} />
                </>
              )}
            </div>
          </td>
        </tr>
      )}
      {expanded && hasScopePanel && (
        <ScopeBundlePanel
          doc={doc}
          ownerRowId={row.id}
          colCount={editMode ? 10 : 9}
          onToggleTier={h.onToggleScopeTier}
          onOwnerChange={h.onScopeOwnerChange}
          onBench={h.onBenchService}
        />
      )}
    </>
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
    <label className="flex items-center gap-1">
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
