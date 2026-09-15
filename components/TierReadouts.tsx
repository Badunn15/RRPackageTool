"use client";

import { CalcResult } from "@/lib/calc";
import { Tier, TIER_LABELS, TIERS } from "@/lib/types";

export default function TierReadouts({ result }: { result: CalcResult }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {TIERS.map((tier: Tier) => (
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
        </div>
      ))}
    </div>
  );
}
