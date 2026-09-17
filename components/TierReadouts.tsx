"use client";

import { CalcResult, scopeServiceStats } from "@/lib/calc";
import { CalcDoc, Tier, TIER_LABELS, TIERS } from "@/lib/types";

export default function TierReadouts({ doc, result }: { doc: CalcDoc; result: CalcResult }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {TIERS.map((tier: Tier) => {
        const scope = scopeServiceStats(doc, tier);
        return (
          <div key={tier} className="rounded-md border border-gold/25 bg-card p-4">
            <div className="font-display text-sm text-gold">{TIER_LABELS[tier]}</div>
            <div className="mt-1 font-mono text-2xl text-cream">
              ${result.perDoorByTier[tier].toFixed(2)}
              <span className="ml-1 text-xs text-cream/50">/door/mo</span>
            </div>
            <div className="mt-2 flex justify-between font-mono text-xs text-cream/60">
              <span>${result.totalByTier[tier].toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo total</span>
              <span>{result.servicesByTier[tier]} lines</span>
            </div>
            <div
              className="mt-1 flex justify-between font-mono text-xs text-cream/40"
              title="Rough gauge, not a hard number: sum of $/door/yr service value for scope services excluded at this tier."
            >
              <span>
                {scope.included} of {scope.total} services
              </span>
              {scope.excludedValue > 0 && (
                <span>${scope.excludedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} svc value excluded</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
