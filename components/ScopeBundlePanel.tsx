"use client";

import { Fragment, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { activeTemplate, ownerHourlyRate, scopeServiceValue, scopedServicesByOwner } from "@/lib/calc";
import { Basis, CalcDoc, MasterService, TIERS } from "@/lib/types";

/**
 * Renders as sibling <tr> rows in the same <table> as the main cost table
 * (not a nested table) so its tier checkboxes land in the exact same
 * columns as every other row's Min/Special/Plus checkboxes.
 *
 * Category reassignment is drag-and-drop: grab the handle on the left of a
 * service row and drop it on a category header (moves category) or on a
 * bundle-owner row elsewhere in the table (moves owner) — see GroupTable's
 * DndContext for the drop handling.
 */
export default function ScopeBundlePanel({
  doc,
  ownerRowId,
  colCount,
  editMode,
  onToggleTier,
  onValueChange,
  onEventsChange,
  onHoursChange,
  onRenameService,
  onBench,
  onAddCategory,
  onRemoveCategory,
  onRenameCategory,
}: {
  doc: CalcDoc;
  ownerRowId: string;
  colCount: number;
  editMode: boolean;
  onToggleTier: (serviceId: string, tier: "min" | "special" | "plus") => void;
  onValueChange: (serviceId: string, value: number) => void;
  onEventsChange: (serviceId: string, value: number) => void;
  onHoursChange: (serviceId: string, hours: number) => void;
  onRenameService: (serviceId: string, name: string) => void;
  onBench: (serviceId: string) => void;
  onAddCategory: (name: string) => void;
  onRemoveCategory: (name: string) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
}) {
  const groups = scopedServicesByOwner(doc, ownerRowId);
  const psk = activeTemplate(doc).psk;
  const trailingCols = colCount - 9; // extra column(s) after Plus, e.g. edit-mode actions
  const hourlyRate = ownerHourlyRate(doc, ownerRowId);
  // Categories just created via "+ add category" below, before any service
  // has been dragged into them -- scopedServicesByOwner only returns
  // categories that already have a service, so without this a brand-new
  // category would have nowhere to render a droppable header to drop onto.
  const [pendingCategories, setPendingCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const shownCategories = new Set(groups.map((g) => g.category));
  const emptyPending = pendingCategories.filter((c) => !shownCategories.has(c));

  if (groups.length === 0 && emptyPending.length === 0 && !editMode) {
    return (
      <tr className="bg-navy/40">
        <td colSpan={colCount} className="px-6 py-3 text-xs text-cream/40">
          No services are currently bundled under this line. Drag one in from another role or
          category, or move one here from the Bench.
        </td>
      </tr>
    );
  }

  return (
    <>
      {groups.length === 0 && emptyPending.length === 0 && (
        <tr className="bg-navy/40">
          <td colSpan={colCount} className="px-6 py-3 text-xs text-cream/40">
            No services are currently bundled under this line. Drag one in from another role or
            category, or move one here from the Bench.
          </td>
        </tr>
      )}
      {groups.map(({ category, services }) => (
        <Fragment key={category}>
          <CategoryHeaderRow
            category={category}
            count={services.length}
            colCount={colCount}
            editMode={editMode}
            onRemove={() => onRemoveCategory(category)}
            onRename={(next) => onRenameCategory(category, next)}
          />
          {services.map((svc) => (
            <ServiceRow
              key={svc.id}
              svc={svc}
              value={scopeServiceValue(doc, svc.id, svc)}
              basis={doc.pbase[svc.id] ?? "door_yr"}
              events={doc.ev[svc.id] ?? 0}
              hours={doc.psh[svc.id] ?? 0}
              hourlyRate={hourlyRate}
              flags={psk[svc.id]}
              trailingCols={trailingCols}
              editMode={editMode}
              onToggleTier={onToggleTier}
              onValueChange={onValueChange}
              onEventsChange={onEventsChange}
              onHoursChange={onHoursChange}
              onRenameService={onRenameService}
              onBench={onBench}
            />
          ))}
        </Fragment>
      ))}
      {emptyPending.map((category) => (
        <CategoryHeaderRow
          key={category}
          category={category}
          count={0}
          colCount={colCount}
          editMode={editMode}
          onRemove={() => {
            onRemoveCategory(category);
            setPendingCategories((prev) => prev.filter((c) => c !== category));
          }}
          onRename={(next) => onRenameCategory(category, next)}
        />
      ))}
      {editMode && (
        <tr className="bg-navy/40">
          <td colSpan={colCount} className="px-6 py-1.5">
            <div className="flex items-center gap-1.5">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name"
                className="w-48 rounded border border-gold/20 bg-navy px-2 py-0.5 text-xs text-cream"
              />
              <button
                type="button"
                onClick={() => {
                  const name = newCategory.trim();
                  if (!name) return;
                  onAddCategory(name);
                  setPendingCategories((prev) => (prev.includes(name) ? prev : [...prev, name]));
                  setNewCategory("");
                }}
                className="flex h-5 w-5 items-center justify-center rounded border border-gold/40 text-xs text-gold hover:bg-gold/10"
                title="Add a new scope-service category"
              >
                +
              </button>
              <span className="text-[11px] text-cream/30">
                drag a service onto the new category header to move it in
              </span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function CategoryHeaderRow({
  category,
  count,
  colCount,
  editMode,
  onRemove,
  onRename,
}: {
  category: string;
  count: number;
  colCount: number;
  editMode: boolean;
  onRemove: () => void;
  onRename: (next: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `category:${category}` });
  return (
    <tr ref={setNodeRef} className={isOver ? "bg-gold/20" : "bg-navy/40"}>
      <td
        colSpan={colCount}
        className="px-6 pt-2 text-xs font-semibold uppercase tracking-wide text-gold/70"
      >
        <div className="flex items-center gap-2">
          {editMode ? (
            <input
              defaultValue={category}
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (next && next !== category) onRename(next);
              }}
              className="rounded border border-gold/20 bg-navy px-1.5 py-0.5 text-xs font-semibold normal-case text-gold"
            />
          ) : (
            <span>{category}</span>
          )}
          <span className="text-cream/30">({count})</span>
          {editMode && (
            <button
              type="button"
              onClick={onRemove}
              className="flex h-4 w-4 items-center justify-center rounded border border-red-400/40 text-[10px] normal-case text-red-300 hover:bg-red-400/10"
              title="Remove this category"
            >
              −
            </button>
          )}
          {isOver && <span className="normal-case text-gold">drop to move here</span>}
        </div>
      </td>
    </tr>
  );
}

function ServiceRow({
  svc,
  value,
  basis,
  events,
  hours,
  hourlyRate,
  flags,
  trailingCols,
  editMode,
  onToggleTier,
  onValueChange,
  onEventsChange,
  onHoursChange,
  onRenameService,
  onBench,
}: {
  svc: MasterService;
  value: number;
  basis: Basis;
  events: number;
  hours: number;
  hourlyRate: number;
  flags: { min: boolean; special: boolean; plus: boolean } | undefined;
  trailingCols: number;
  editMode: boolean;
  onToggleTier: (serviceId: string, tier: "min" | "special" | "plus") => void;
  onValueChange: (serviceId: string, value: number) => void;
  onEventsChange: (serviceId: string, value: number) => void;
  onHoursChange: (serviceId: string, hours: number) => void;
  onRenameService: (serviceId: string, name: string) => void;
  onBench: (serviceId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `svc:${svc.id}` });
  const isEventBased = basis === "claim";
  const isHoursMode = hours > 0;

  return (
    <tr className={`bg-navy/40 text-xs ${isDragging ? "opacity-30" : ""}`}>
      <td className="py-1 pl-2 pr-3 text-cream/80">
        <div className="flex items-center gap-1.5">
          <span
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className="cursor-grab touch-none select-none px-1 text-cream/30 hover:text-gold active:cursor-grabbing"
            title="Drag to move to a different category or role"
          >
            {"⋮⋮"}
          </span>
          {editMode ? (
            <input
              value={svc.n}
              onChange={(e) => onRenameService(svc.id, e.target.value)}
              className="ml-1 w-full rounded border border-gold/20 bg-navy px-1 py-0.5 text-cream"
            />
          ) : (
            <span className="pl-1">{svc.n}</span>
          )}
        </div>
      </td>
      <td className="px-3 py-1 text-right">
        <div className="flex items-center justify-end gap-1">
          <input
            type="number"
            value={hours || ""}
            placeholder="hrs"
            onChange={(e) => onHoursChange(svc.id, Number(e.target.value))}
            className="w-10 rounded border border-gold/20 bg-navy px-1 py-0.5 text-right font-mono text-cream placeholder:text-cream/30"
            title={`Hours of ${svc.n.toLowerCase()} time — auto-converts to $ using this role's derived hourly rate (currently $${hourlyRate.toFixed(2)}/hr), no need to know the rate yourself`}
          />
          <input
            type="number"
            value={isHoursMode ? Math.round(value * 100) / 100 : value}
            onChange={(e) => onValueChange(svc.id, Number(e.target.value))}
            readOnly={isHoursMode}
            className={`w-16 rounded border border-gold/20 px-1 py-0.5 text-right font-mono text-cream ${isHoursMode ? "bg-navy/60 text-cream/60" : "bg-navy"}`}
            title={
              isHoursMode
                ? `Computed from ${hours} hr(s) × $${hourlyRate.toFixed(2)}/hr — clear the hrs field to enter a $ value directly`
                : isEventBased
                  ? "Indicative value per event — used for the tier readouts' excluded-value estimate"
                  : "Indicative service value ($/door/yr) — used for the tier readouts' excluded-value estimate"
            }
          />
        </div>
      </td>
      <td className="px-3 py-1 font-mono text-[11px] text-cream/50">
        {isEventBased ? (
          <span className="flex items-center gap-1">
            $/event ×
            <input
              type="number"
              value={events}
              onChange={(e) => onEventsChange(svc.id, Number(e.target.value))}
              className="w-12 rounded border border-gold/20 bg-navy px-1 py-0.5 text-right font-mono text-cream"
              title="Events per year — used for the tier readouts' excluded-value estimate"
            />
            /yr
          </span>
        ) : (
          "$/door/yr"
        )}
      </td>
      <td className="px-3 py-1">
        <button
          type="button"
          onClick={() => onBench(svc.id)}
          className="text-cream/40 hover:text-gold"
          title="Send to bench"
        >
          Bench
        </button>
      </td>
      <td />
      <td />
      {TIERS.map((tier) => (
        <td key={tier} className="px-2 py-1 text-center">
          <input
            type="checkbox"
            checked={!!flags?.[tier]}
            onChange={() => onToggleTier(svc.id, tier)}
            title={tier}
          />
        </td>
      ))}
      {trailingCols > 0 && <td colSpan={trailingCols} />}
    </tr>
  );
}
