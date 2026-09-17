"use client";

import { FormEvent, useState } from "react";

/** In-app replacement for window.prompt() — matches the rest of the UI instead of a jarring native dialog. */
export default function PromptModal({
  title,
  label,
  defaultValue,
  confirmLabel = "OK",
  onSubmit,
  onCancel,
}: {
  title: string;
  label?: string;
  defaultValue?: string;
  confirmLabel?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultValue ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-gold/30 bg-card p-5"
      >
        <h2 className="mb-3 font-display text-lg text-cream">{title}</h2>
        {label && <label className="mb-1 block text-xs text-cream/60">{label}</label>}
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={(e) => e.target.select()}
          className="w-full rounded border border-gold/30 bg-navy px-3 py-2 text-cream"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-gold/30 px-3 py-1 text-sm text-cream/70 hover:bg-gold/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!value.trim()}
            className="rounded bg-gold px-3 py-1 text-sm font-semibold text-navy disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
