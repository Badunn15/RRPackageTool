"use client";

import { useState } from "react";
import { CalcResult, ExcludedItem, excludedItems, serviceStats } from "@/lib/calc";
import { CalcDoc, Tier, TIER_LABELS, TIERS } from "@/lib/types";

export default function TierReadouts({
  doc,
  result,
  onIncludeExcluded,
}: {
  doc: CalcDoc;
  result: CalcResult;
  onIncludeExcluded: (item: ExcludedItem, tier: Tier) => void;
}) {
  const [expanded, setExpanded] = useState<Tier | null>(null);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {TIERS.map((tier: Tier) => {
        const stats = serviceStats(doc, tier);
        const isOpen = expanded === tier;
        return (
          <div key={tier} className="rounded-md border border-gold/25 bg-card p-4">
            <div className="font-display text-sm uppercase tracking-wide text-gold">{TIER_LABELS[tier]}</div>
            <div className="mt-1 font-mono text-2xl text-cream">
              ${result.perDoorByTier[tier].toFixed(2)}
              <span className="ml-1 text-xs text-cream/50">/door/mo</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-mono text-xs text-cream/60">
              <span>${result.totalByTier[tier].toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo</span>
              <span className="text-cream/30">·</span>
              <span title="Every checked line, cost-row or scope-catalog service, except staff comp rows themselves.">
                {stats.included} of {stats.total} services
              </span>
              {stats.excludedValue > 0 && (
                <>
                  <span className="text-cream/30">·</span>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : tier)}
                    className="text-cream/40 underline decoration-dotted underline-offset-2 hover:text-cream/70"
                    title="Rough gauge, not a hard number: annualized $ not in this tier's total at the current view -- real cost-row dollars hidden by view or unchecked for this tier, plus indicative value for unchecked scope-catalog services. Click to see what's excluded."
                  >
                    ${stats.excludedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr excluded
                  </button>
                </>
              )}
            </div>

            {isOpen && (
              <ExcludedBreakdown
                doc={doc}
                tier={tier}
                onIncludeExcluded={onIncludeExcluded}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExcludedBreakdown({
  doc,
  tier,
  onIncludeExcluded,
}: {
  doc: CalcDoc;
  tier: Tier;
  onIncludeExcluded: (item: ExcludedItem, tier: Tier) => void;
}) {
  const items = excludedItems(doc, tier);
  if (items.length === 0) return null;

  return (
    <div className="mt-3 max-h-56 space-y-1 overflow-y-auto border-t border-gold/15 pt-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-2 font-mono text-xs">
          <div className="min-w-0 flex-1 truncate text-cream/70" title={item.name}>
            {item.name}
            <span
              className="ml-1.5 rounded-sm bg-navy/60 px-1 py-0.5 text-[10px] uppercase tracking-wide text-cream/40"
              title={item.reason === "hidden" ? "Hidden entirely at the current cost view" : "Not checked/included for this tier"}
            >
              {item.reason === "hidden" ? "hidden" : "unchecked"}
            </span>
          </div>
          <span className="shrink-0 text-cream/50">
            ${item.annualValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
          </span>
          <button
            type="button"
            onClick={() => onIncludeExcluded(item, tier)}
            className="shrink-0 rounded-sm border border-gold/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gold hover:bg-gold/10"
            title="Include this item in this tier's calculation anyway"
          >
            Include
          </button>
        </div>
      ))}
    </div>
  );
}
