"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { calculate } from "@/lib/calc";
import { api, ScenarioRow, ScenarioSummary } from "@/lib/api-client";
import * as M from "@/lib/mutations";
import { Basis, CalcDoc, CostView } from "@/lib/types";
import seedModel from "@/data/seed-model.json";
import TierReadouts from "./TierReadouts";
import AssumptionsDrawer from "./AssumptionsDrawer";
import GroupTable from "./GroupTable";
import EditModelOverlay from "./EditModelOverlay";
import VersionHistoryOverlay from "./VersionHistoryOverlay";
import CompareOverlay from "./CompareOverlay";

type ConflictState = { serverScenario: ScenarioRow; serverDoc: CalcDoc } | null;

const AUTOSAVE_MS = 1500;

export default function Calculator({
  userEmail,
  signOutAction,
}: {
  userEmail: string;
  signOutAction: () => Promise<void>;
}) {
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [scenario, setScenario] = useState<ScenarioRow | null>(null);
  const [doc, setDoc] = useState<CalcDoc | null>(null);
  const [rev, setRev] = useState<number>(0);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [conflict, setConflict] = useState<ConflictState>(null);
  const [editMode, setEditMode] = useState(false);
  const [overlay, setOverlay] = useState<"edit" | "versions" | "compare" | null>(null);
  const [versions, setVersions] = useState<
    { rev: number; note: string | null; createdBy: string; createdAt: string }[]
  >([]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  const loadScenario = useCallback(async (id: string) => {
    const { scenario: s, doc: d } = await api.get(id);
    setScenario(s);
    setDoc(d);
    setRev(s.rev);
    setStatus("idle");
    dirtyRef.current = false;
  }, []);

  useEffect(() => {
    (async () => {
      const list = await api.list();
      setScenarios(list);
      const initial = list.find((s) => s.isDefault) ?? list[0];
      if (initial) {
        await loadScenario(initial.id);
      } else {
        const created = await api.create("Current", seedModel as unknown as CalcDoc);
        setScenarios([created]);
        await loadScenario(created.id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleSave = useCallback(
    (nextDoc: CalcDoc) => {
      dirtyRef.current = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        if (!scenario) return;
        setStatus("saving");
        const { ok, body } = await api.save(scenario.id, nextDoc, rev);
        if (!ok && "error" in body) {
          setConflict({ serverScenario: body.scenario, serverDoc: body.doc });
          setStatus("error");
          return;
        }
        const saved = body as ScenarioRow;
        setRev(saved.rev);
        setScenario(saved);
        dirtyRef.current = false;
        setStatus("saved");
      }, AUTOSAVE_MS);
    },
    [scenario, rev]
  );

  function update(mutator: (d: CalcDoc) => CalcDoc) {
    setDoc((prev) => {
      if (!prev) return prev;
      const next = mutator(prev);
      scheduleSave(next);
      return next;
    });
  }

  async function refreshList() {
    setScenarios(await api.list());
  }

  if (!doc || !scenario) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy font-body text-cream/60">
        Loading…
      </div>
    );
  }

  const result = calculate(doc, doc.cv);

  return (
    <div className="min-h-screen bg-navy font-body text-cream">
      <header className="sticky top-0 z-40 border-b border-gold/20 bg-navy/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-xl text-cream">Package Cost Calculator</h1>

          <select
            value={doc.cv}
            onChange={(e) => update((d) => M.setCostView(d, e.target.value as CostView))}
            className="rounded border border-gold/30 bg-card px-2 py-1 font-mono text-sm text-cream"
          >
            <option value="direct">Direct COGS</option>
            <option value="allocated">Fully Allocated</option>
            <option value="loaded">Fully Loaded</option>
          </select>

          <select
            value={scenario.id}
            onChange={(e) => loadScenario(e.target.value)}
            className="rounded border border-gold/30 bg-card px-2 py-1 text-sm text-cream"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <ScenarioMenu
            scenario={scenario}
            onCreate={async () => {
              const name = window.prompt("New scenario name?", "New scenario");
              if (!name) return;
              const created = await api.create(name, doc);
              await refreshList();
              await loadScenario(created.id);
            }}
            onDuplicate={async () => {
              const name = window.prompt("Name for the duplicate?", `${scenario.name} (copy)`);
              const created = await api.duplicate(scenario.id, name ?? undefined);
              await refreshList();
              await loadScenario(created.id);
            }}
            onRename={async () => {
              const name = window.prompt("Rename scenario", scenario.name);
              if (!name) return;
              await api.rename(scenario.id, name);
              await refreshList();
              setScenario((s) => (s ? { ...s, name } : s));
            }}
            onDelete={async () => {
              if (!window.confirm(`Archive "${scenario.name}"? This can be restored by an admin later.`)) {
                return;
              }
              await api.remove(scenario.id);
              await refreshList();
              const list = await api.list();
              if (list[0]) await loadScenario(list[0].id);
            }}
            onVersions={async () => {
              setVersions(await api.versions(scenario.id));
              setOverlay("versions");
            }}
          />

          <button
            onClick={() => setOverlay("compare")}
            className="rounded border border-gold/30 px-3 py-1 text-sm text-gold hover:bg-gold/10"
          >
            Compare
          </button>
          <button
            onClick={() => setOverlay("edit")}
            className="rounded border border-gold/30 px-3 py-1 text-sm text-gold hover:bg-gold/10"
          >
            Edit model
          </button>
          <label className="flex items-center gap-1 text-sm text-cream/70">
            <input type="checkbox" checked={editMode} onChange={(e) => setEditMode(e.target.checked)} />
            edit rows
          </label>

          <div className="ml-auto flex items-center gap-3 text-xs text-cream/50">
            <SaveIndicator status={status} />
            <span>{userEmail}</span>
            <form action={signOutAction}>
              <button type="submit" className="text-gold hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {conflict && (
        <div className="border-b border-red-400/40 bg-red-950/40 px-4 py-2 text-sm text-red-100">
          Someone saved changes to this scenario while you were editing.{" "}
          <button
            className="underline"
            onClick={() => {
              setDoc(conflict.serverDoc);
              setScenario(conflict.serverScenario);
              setRev(conflict.serverScenario.rev);
              setConflict(null);
              setStatus("idle");
            }}
          >
            Reload their version
          </button>{" "}
          or{" "}
          <button
            className="underline"
            onClick={() => {
              setRev(conflict.serverScenario.rev);
              setConflict(null);
              if (doc) scheduleSave(doc);
            }}
          >
            keep mine and overwrite
          </button>
          .
        </div>
      )}

      <main className="mx-auto max-w-6xl space-y-4 p-4">
        <TierReadouts result={result} />

        <AssumptionsDrawer
          doc={doc}
          onGlobalChange={(key, value) => update((d) => M.setGlobal(d, key, value))}
          onReset={() =>
            update((d) => ({
              ...d,
              G: { ...(seedModel as unknown as CalcDoc).G },
              af: { ...(seedModel as unknown as CalcDoc).af },
            }))
          }
        />

        <GroupTable
          doc={doc}
          editMode={editMode}
          onRateChange={(id, v) => update((d) => M.setRowRate(d, id, v))}
          onBurdenChange={(id, v) => update((d) => M.setRowBurden(d, id, v))}
          onEventsChange={(id, v) => update((d) => M.setRowEvents(d, id, v))}
          onAfChange={(key, v) => update((d) => M.setAfConfig(d, key, v))}
          onToggleTier={(id, tier) => update((d) => M.toggleTier(d, id, tier))}
          onToggleCollapsed={(id) => update((d) => M.toggleGroupCollapsed(d, id))}
          onGroupViewChange={(id, view) => update((d) => M.setGroupView(d, id, view))}
          onRenameRow={(id, name) => update((d) => M.renameRow(d, id, name))}
          onRemoveRow={(id) => update((d) => M.removeRow(d, id))}
        />
      </main>

      {overlay === "edit" && (
        <EditModelOverlay
          doc={doc}
          onClose={() => setOverlay(null)}
          onAddGroup={(label) => update((d) => M.addGroup(d, label))}
          onRenameGroup={(id, label) => update((d) => M.renameGroup(d, id, label))}
          onRemoveGroup={(id) => update((d) => M.removeGroup(d, id))}
          onAddRow={(groupId, name, basis, value) =>
            update((d) => M.addRow(d, groupId, name, basis as Basis, value))
          }
          onRemoveRow={(id) => update((d) => M.removeRow(d, id))}
          onAddCategory={(name) => update((d) => M.addCategory(d, name))}
          onRemoveCategory={(name) => update((d) => M.removeCategory(d, name))}
          onExport={() => window.open(api.exportUrl(scenario.id), "_blank")}
          onImport={async (file) => {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const updated = await api.import(scenario.id, parsed);
            await loadScenario(updated.id);
          }}
        />
      )}

      {overlay === "versions" && (
        <VersionHistoryOverlay
          versions={versions}
          onClose={() => setOverlay(null)}
          onRestore={async (rv) => {
            if (!window.confirm(`Restore rev ${rv}? This writes it forward as a new version.`)) return;
            await api.restore(scenario.id, rv);
            await loadScenario(scenario.id);
            setOverlay(null);
          }}
        />
      )}

      {overlay === "compare" && (
        <CompareOverlay scenarios={scenarios} view={doc.cv} onClose={() => setOverlay(null)} />
      )}
    </div>
  );
}

function SaveIndicator({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "saving") return <span>Saving…</span>;
  if (status === "saved") return <span className="text-gold">Saved</span>;
  if (status === "error") return <span className="text-red-300">Save conflict</span>;
  return <span>Up to date</span>;
}

function ScenarioMenu({
  scenario,
  onCreate,
  onDuplicate,
  onRename,
  onDelete,
  onVersions,
}: {
  scenario: ScenarioRow;
  onCreate: () => void;
  onDuplicate: () => void;
  onRename: () => void;
  onDelete: () => void;
  onVersions: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded border border-gold/30 px-2 py-1 text-sm text-gold hover:bg-gold/10"
      >
        Scenario {"▾"}
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-48 rounded border border-gold/30 bg-card text-sm shadow-lg">
          {[
            ["New scenario", onCreate],
            ["Duplicate", onDuplicate],
            ["Rename", onRename],
            ["Version history", onVersions],
            [`Archive "${scenario.name}"`, onDelete],
          ].map(([label, fn]) => (
            <button
              key={label as string}
              onClick={() => {
                setOpen(false);
                (fn as () => void)();
              }}
              className="block w-full px-3 py-2 text-left text-cream/80 hover:bg-gold/10"
            >
              {label as string}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
