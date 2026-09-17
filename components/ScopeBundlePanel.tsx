"use client";

import { Fragment } from "react";
import { activeTemplate, bundleOwnerRows, scopedServicesByOwner } from "@/lib/calc";
import { CalcDoc, TIERS } from "@/lib/types";

/**
 * Renders as sibling <tr> rows in the same <table> as the main cost table
 * (not a nested table) so its tier checkboxes land in the exact same
 * columns as every other row's Min/Special/Plus checkboxes.
 */
export default function ScopeBundlePanel({
  doc,
  ownerRowId,
  colCount,
  onToggleTier,
  onOwnerChange,
  onCategoryChange,
  onBench,
}: {
  doc: CalcDoc;
  ownerRowId: string;
  colCount: number;
  onToggleTier: (serviceId: string, tier: "min" | "special" | "plus") => void;
  onOwnerChange: (serviceId: string, newOwnerId: string) => void;
  onCategoryChange: (serviceId: string, category: string) => void;
  onBench: (serviceId: string) => void;
}) {
  const groups = scopedServicesByOwner(doc, ownerRowId);
  const owners = bundleOwnerRows(doc);
  const psk = activeTemplate(doc).psk;
  const trailingCols = colCount - 9; // extra column(s) after Plus, e.g. edit-mode actions

  if (groups.length === 0) {
    return (
      <tr className="bg-navy/40">
        <td colSpan={colCount} className="px-6 py-3 text-xs text-cream/40">
          No services are currently bundled under this line. Move one here from the Bench, or reassign one
          from another role below.
        </td>
      </tr>
    );
  }

  return (
    <>
      {groups.map(({ category, services }) => (
        <Fragment key={category}>
          <tr className="bg-navy/40">
            <td colSpan={colCount} className="px-6 pt-2 text-xs font-semibold uppercase tracking-wide text-gold/70">
              {category} <span className="text-cream/30">({services.length})</span>
            </td>
          </tr>
          {services.map((svc) => (
            <tr key={svc.id} className="bg-navy/40 text-xs">
              <td className="py-1 pl-10 pr-3 text-cream/80">{svc.n}</td>
              <td className="px-3 py-1">
                <select
                  value={category}
                  onChange={(e) => onCategoryChange(svc.id, e.target.value)}
                  className="w-full rounded border border-gold/20 bg-navy px-1 py-0.5 text-cream"
                  title="Move to a different PM-scope category"
                >
                  {doc.CATS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-1">
                <select
                  value={ownerRowId}
                  onChange={(e) => onOwnerChange(svc.id, e.target.value)}
                  className="w-full rounded border border-gold/20 bg-navy px-1 py-0.5 text-cream"
                  title="Reassign which role owns this service"
                >
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
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
                    checked={!!psk[svc.id]?.[tier]}
                    onChange={() => onToggleTier(svc.id, tier)}
                    title={tier}
                  />
                </td>
              ))}
              {trailingCols > 0 && <td colSpan={trailingCols} />}
            </tr>
          ))}
        </Fragment>
      ))}
    </>
  );
}
