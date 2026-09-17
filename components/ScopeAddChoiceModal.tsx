"use client";

/** Asks whether a newly-added scope service should apply to just the open scenario or every scenario in the tool. */
export default function ScopeAddChoiceModal({
  name,
  category,
  busy,
  onJustThis,
  onAllScenarios,
  onCancel,
}: {
  name: string;
  category: string;
  busy: boolean;
  onJustThis: () => void;
  onAllScenarios: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-lg border border-gold/30 bg-card p-5">
        <h2 className="mb-2 font-display text-lg text-cream">Add &quot;{name}&quot;</h2>
        <p className="mb-4 text-xs text-cream/60">
          Under {category}. Add it to just this scenario, or to every scenario in the tool?
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onJustThis}
            disabled={busy}
            className="rounded border border-gold/30 px-3 py-2 text-left text-sm text-cream hover:bg-gold/10 disabled:opacity-50"
          >
            Just this scenario
            <span className="block text-[11px] text-cream/50">
              Local-only until you click Save, like any other edit here.
            </span>
          </button>
          <button
            type="button"
            onClick={onAllScenarios}
            disabled={busy}
            className="rounded border border-gold/30 bg-gold/10 px-3 py-2 text-left text-sm text-gold hover:bg-gold/20 disabled:opacity-50"
          >
            {busy ? "Adding to all scenarios…" : "All scenarios"}
            <span className="block text-[11px] text-gold/70">
              Writes to every scenario immediately — not staged, no Save needed.
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="mt-3 w-full text-center text-xs text-cream/50 hover:underline disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
