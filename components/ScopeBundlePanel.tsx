"use client";

import { activeTemplate, bundleOwnerRows, scopedServicesByOwner } from "@/lib/calc";
import { CalcDoc, TIERS } from "@/lib/types";

export default function ScopeBundlePanel({
  doc,
  ownerRowId,
  onToggleTier,
  onOwnerChange,
  onBench,
}: {
  doc: CalcDoc;
  ownerRowId: string;
  onToggleTier: (serviceId: string, tier: "min" | "special" | "plus") => void;
  onOwnerChange: (serviceId: string, newOwnerId: string) => void;
  onBench: (serviceId: string) => void;
}) {
  const groups = scopedServicesByOwner(doc, ownerRowId);
  const owners = bundleOwnerRows(doc);
  const psk = activeTemplate(doc).psk;

  if (groups.length === 0) {
    return (
      <div className="px-6 py-3 text-xs text-cream/40">
        No services are currently bundled under this line. Move one here from the Bench, or reassign one
        from another role below.
      </div>
    );
  }

  return (
    <div className="space-y-3 px-6 py-3">
      {groups.map(({ category, services }) => (
        <div key={category}>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gold/70">
            {category} <span className="text-cream/30">({services.length})</span>
          </div>
          <table className="w-full text-xs">
            <tbody>
              {services.map((svc) => (
                <tr key={svc.id} className="border-t border-gold/5">
                  <td className="py-1 pr-2 text-cream/80">{svc.n}</td>
                  {TIERS.map((tier) => (
                    <td key={tier} className="w-10 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={!!psk[svc.id]?.[tier]}
                        onChange={() => onToggleTier(svc.id, tier)}
                        title={tier}
                      />
                    </td>
                  ))}
                  <td className="w-40 py-1 pl-2">
                    <select
                      value={ownerRowId}
                      onChange={(e) => onOwnerChange(svc.id, e.target.value)}
                      className="w-full rounded border border-gold/20 bg-navy px-1 py-0.5 text-cream"
                    >
                      {owners.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="w-16 py-1 pl-2 text-right">
                    <button
                      type="button"
                      onClick={() => onBench(svc.id)}
                      className="text-cream/40 hover:text-gold"
                      title="Send to bench"
                    >
                      Bench
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
