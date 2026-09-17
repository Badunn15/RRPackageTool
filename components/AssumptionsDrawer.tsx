"use client";

import { useState } from "react";
import { CalcDoc } from "@/lib/types";

const FIELDS: { key: keyof CalcDoc["G"]; label: string }[] = [
  { key: "doors", label: "Doors" },
  { key: "rent", label: "Avg rent" },
  { key: "seats", label: "Seats" },
  { key: "listings", label: "Listings" },
  { key: "tenancy", label: "Tenancy (yrs)" },
  { key: "wo", label: "Work orders/yr" },
  { key: "hoursYr", label: "Work hours/yr" },
];

export default function AssumptionsDrawer({
  doc,
  onGlobalChange,
  onReset,
}: {
  doc: CalcDoc;
  onGlobalChange: (key: keyof CalcDoc["G"], value: number) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border border-gold/20 bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-semibold text-cream"
      >
        Portfolio assumptions
        <span className="text-gold">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-3 border-t border-gold/10 p-4 sm:grid-cols-3 md:grid-cols-6">
          {FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1 text-xs text-cream/70">
              {f.label}
              <input
                type="number"
                className="rounded border border-gold/30 bg-navy px-2 py-1 font-mono text-cream"
                value={doc.G[f.key]}
                onChange={(e) => onGlobalChange(f.key, Number(e.target.value))}
              />
            </label>
          ))}
          <div className="col-span-2 flex items-end sm:col-span-3 md:col-span-6">
            <button
              type="button"
              onClick={onReset}
              className="rounded border border-gold/40 px-3 py-1 text-xs text-gold hover:bg-gold/10"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
