"use client";

interface VersionRow {
  rev: number;
  note: string | null;
  createdBy: string;
  createdAt: string;
}

export default function VersionHistoryOverlay({
  versions,
  onClose,
  onRestore,
}: {
  versions: VersionRow[];
  onClose: () => void;
  onRestore: (rev: number) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border border-gold/30 bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-cream">Version history</h2>
          <button onClick={onClose} className="text-cream/60 hover:text-cream">
            close
          </button>
        </div>
        <p className="mb-3 text-xs text-cream/50">
          Restoring writes that revision forward as a new version — nothing is ever rewound or lost.
        </p>
        <ul className="divide-y divide-gold/10 text-sm">
          {versions.map((v) => (
            <li key={v.rev} className="flex items-center justify-between py-2">
              <div>
                <div className="font-mono text-cream">rev {v.rev}</div>
                <div className="text-xs text-cream/50">
                  {v.createdBy} &middot; {new Date(v.createdAt).toLocaleString()}
                </div>
                {v.note && <div className="text-xs text-cream/40">{v.note}</div>}
              </div>
              <button
                onClick={() => onRestore(v.rev)}
                className="rounded border border-gold/40 px-2 py-1 text-xs text-gold hover:bg-gold/10"
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
