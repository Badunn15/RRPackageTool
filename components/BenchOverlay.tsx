"use client";

import { benchedServices } from "@/lib/calc";
import { CalcDoc } from "@/lib/types";

export default function BenchOverlay({
  doc,
  onClose,
  onDestinationChange,
  onMove,
}: {
  doc: CalcDoc;
  onClose: () => void;
  onDestinationChange: (serviceId: string, destination: string) => void;
  onMove: (serviceId: string) => void;
}) {
  const services = benchedServices(doc);

  const destinations = [
    ...doc.CG.map((g) => ({ value: `cost::${g.id}`, label: `Cost group: ${g.label}` })),
    ...doc.CATS.map((cat) => ({ value: `scope::${cat}`, label: `Scope category: ${cat}` })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gold/30 bg-card p-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-xl text-cream">
            Bench <span className="text-sm text-cream/40">({services.length})</span>
          </h2>
          <button onClick={onClose} className="text-cream/60 hover:text-cream">
            close
          </button>
        </div>
        <p className="mb-4 text-xs text-cream/50">
          Staged services — not yet part of any tier&apos;s cost or scope. Pick a destination, then Move.
          Hover a row in the main table and hit Bench to send something back here.
        </p>

        {services.length === 0 ? (
          <p className="text-sm text-cream/40">
            Bench is empty. Every service is live in the model, either bundled into a role&apos;s scope or
            promoted into a cost group.
          </p>
        ) : (
          <ul className="divide-y divide-gold/10 text-sm">
            {services.map((svc) => (
              <li key={svc.id} className="flex flex-wrap items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <div className="text-cream/90">{svc.n}</div>
                  {svc.d && <div className="text-[11px] text-cream/40">{svc.d}</div>}
                </div>
                <select
                  value={doc.udest[svc.id] ?? ""}
                  onChange={(e) => onDestinationChange(svc.id, e.target.value)}
                  className="rounded border border-gold/20 bg-navy px-2 py-1 text-xs text-cream"
                >
                  <option value="">choose destination…</option>
                  {destinations.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!doc.udest[svc.id]}
                  onClick={() => onMove(svc.id)}
                  className="rounded bg-gold px-3 py-1 text-xs text-navy disabled:opacity-40"
                >
                  Move {"→"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
