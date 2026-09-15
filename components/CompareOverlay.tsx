"use client";

import { useState } from "react";
import { calculate } from "@/lib/calc";
import { api, ScenarioSummary } from "@/lib/api-client";
import { CalcDoc, CostView, TIER_LABELS, TIERS } from "@/lib/types";

export default function CompareOverlay({
  scenarios,
  view,
  onClose,
}: {
  scenarios: ScenarioSummary[];
  view: CostView;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(scenarios.slice(0, 3).map((s) => s.id));
  const [docs, setDocs] = useState<Record<string, CalcDoc>>({});
  const [loading, setLoading] = useState(false);

  async function loadSelected() {
    setLoading(true);
    const entries = await Promise.all(
      selected.map(async (id) => {
        if (docs[id]) return [id, docs[id]] as const;
        const { doc } = await api.get(id);
        return [id, doc] as const;
      })
    );
    setDocs((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gold/30 bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-cream">Compare scenarios</h2>
          <button onClick={onClose} className="text-cream/60 hover:text-cream">
            close
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          {scenarios.map((s) => (
            <label key={s.id} className="flex items-center gap-1 text-cream/80">
              <input
                type="checkbox"
                checked={selected.includes(s.id)}
                onChange={(e) =>
                  setSelected((prev) =>
                    e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                  )
                }
              />
              {s.name}
            </label>
          ))}
        </div>
        <button
          onClick={loadSelected}
          disabled={loading || selected.length === 0}
          className="mb-4 rounded bg-gold px-3 py-1 text-sm text-navy disabled:opacity-50"
        >
          {loading ? "Loading…" : "Compare"}
        </button>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-gold/80">
              <th className="px-2 py-1">Scenario</th>
              {TIERS.map((t) => (
                <th key={t} className="px-2 py-1 text-right">
                  {TIER_LABELS[t]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {selected
              .filter((id) => docs[id])
              .map((id) => {
                const doc = docs[id];
                const result = calculate(doc, view);
                const name = scenarios.find((s) => s.id === id)?.name ?? id;
                const values = TIERS.map((t) => result.perDoorByTier[t]);
                const best = Math.min(...values);
                return (
                  <tr key={id} className="border-t border-gold/10">
                    <td className="px-2 py-1 text-cream/90">{name}</td>
                    {TIERS.map((t) => (
                      <td
                        key={t}
                        className={`px-2 py-1 text-right font-mono ${
                          result.perDoorByTier[t] === best ? "text-gold" : "text-cream"
                        }`}
                      >
                        ${result.perDoorByTier[t].toFixed(2)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-cream/40">
          Per-door / month at the &quot;{view}&quot; cost view. Lowest value in each column highlighted.
        </p>
      </div>
    </div>
  );
}
