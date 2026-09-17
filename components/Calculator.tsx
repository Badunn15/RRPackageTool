"use client";

import { useCallback, useEffect, useState } from "react";
import { benchedServices, calculate } from "@/lib/calc";
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
import BenchOverlay from "./BenchOverlay";
import PromptModal from "./PromptModal";

type ConflictState = { serverScenario: ScenarioRow; serverDoc: CalcDoc } | null;
type PromptState = { kind: "create" | "duplicate" | "rename"; defaultValue: string } | null;

/**
 * Edits are local-only until explicitly saved. Nothing autosaves and
 * nothing is written to the shared scenario until the user clicks "Save
 * changes" and confirms — someone can tweak rates to test an idea, and as
 * long as they don't save, nobody else is affected and reloading the page
 * (or picking a different scenario) just drops those tweaks.
 */
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
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmingSave, setConfirmingSave] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [conflict, setConflict] = useState<ConflictState>(null);
  const [editMode, setEditMode] = useState(false);
  const [overlay, setOverlay] = useState<"edit" | "versions" | "compare" | "bench" | null>(null);
  const [versions, setVersions] = useState<
    { rev: number; note: string | null; createdBy: string; createdAt: string }[]
  >([]);
  const [initError, setInitError] = useState<string | null>(null);
  const [initAttempt, setInitAttempt] = useState(0);
  const [promptState, setPromptState] = useState<PromptState>(null);

  const loadScenario = useCallback(async (id: string) => {
    const { scenario: s, doc: d } = await api.get(id);
    setScenario(s);
    setDoc(d);
    setRev(s.rev);
    setDirty(false);
    setStatus("idle");
  }, []);

  useEffect(() => {
    setInitError(null);
    (async () => {
      try {
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
      } catch (err) {
        setInitError(err instanceof Error ? err.message : "Failed to load scenarios.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initAttempt]);

  // Warn before closing/reloading the tab with unsaved tweaks.
  useEffect(() => {
    if (!dirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function saveNow(revOverride?: number) {
    if (!scenario || !doc || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { ok, body } = await api.save(scenario.id, doc, revOverride ?? rev);
      if (!ok && "error" in body) {
        setConflict({ serverScenario: body.scenario, serverDoc: body.doc });
        setStatus("error");
        return;
      }
      const saved = body as ScenarioRow;
      setRev(saved.rev);
      setScenario(saved);
      setDirty(false);
      setStatus("saved");
    } catch (err) {
      // A failed request (session hiccup, network blip, server error) must
      // never leave `saving` stuck true forever -- that permanently disables
      // the Save button with zero feedback, which looks like "nothing
      // happens" when you click it. Surface the error and let them retry.
      setSaveError(err instanceof Error ? err.message : "Save failed. Your changes are still here — try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleSaveClick() {
    setConfirmingSave(true);
  }

  async function handleDiscardClick() {
    setConfirmingDiscard(false);
    if (!scenario) return;
    try {
      await loadScenario(scenario.id);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't reload the saved version — try again.");
    }
  }

  /** Confirms losing unsaved edits before navigating away from them (switching/creating/archiving a scenario, restoring a version, importing). */
  function confirmDiscardIfDirty(): boolean {
    if (!dirty) return true;
    return window.confirm("You have unsaved changes that will be lost. Continue anyway?");
  }

  function update(mutator: (d: CalcDoc) => CalcDoc) {
    setDoc((prev) => (prev ? mutator(prev) : prev));
    setDirty(true);
  }

  async function refreshList() {
    setScenarios(await api.list());
  }

  if (!doc || !scenario) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-navy p-4 text-center font-body text-cream/60">
        {initError ? (
          <>
            <p className="max-w-md text-red-300">Couldn&apos;t load the model: {initError}</p>
            <button
              onClick={() => setInitAttempt((n) => n + 1)}
              className="rounded border border-gold/40 px-3 py-1 text-sm text-gold hover:bg-gold/10"
            >
              Retry
            </button>
          </>
        ) : (
          "Loading…"
        )}
      </div>
    );
  }

  const result = calculate(doc, doc.cv);
  const benchCount = benchedServices(doc).length;

  return (
    <div className="min-h-screen bg-navy font-body text-cream">
      <header className="sticky top-0 z-40 border-b border-gold/20 bg-navy/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
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

          <div className="flex items-center gap-1 rounded border border-gold/20 bg-card/40 p-1">
            <select
              value={scenario.id}
              onChange={(e) => {
                if (!confirmDiscardIfDirty()) return;
                loadScenario(e.target.value);
              }}
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
              onCreate={() => setPromptState({ kind: "create", defaultValue: "New scenario" })}
              onDuplicate={() => {
                // Duplicates the last *saved* version server-side, not any
                // local unsaved tweaks.
                if (!confirmDiscardIfDirty()) return;
                setPromptState({ kind: "duplicate", defaultValue: `${scenario.name} (copy)` });
              }}
              onRename={() => setPromptState({ kind: "rename", defaultValue: scenario.name })}
              onDelete={async () => {
                if (!confirmDiscardIfDirty()) return;
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
          </div>

          <div className="flex items-center gap-2 border-l border-gold/20 pl-3">
            <button
              onClick={() => setOverlay("bench")}
              className="rounded border border-gold/30 px-3 py-1 text-sm text-gold hover:bg-gold/10"
            >
              Bench{benchCount > 0 ? ` (${benchCount})` : ""}
            </button>
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
            <label className="flex items-center gap-1 whitespace-nowrap text-sm text-cream/70">
              <input type="checkbox" checked={editMode} onChange={(e) => setEditMode(e.target.checked)} />
              edit rows
            </label>
          </div>

          <div className="ml-auto flex items-center gap-3 text-xs text-cream/50">
            {confirmingSave ? (
              <>
                <span className="text-gold">Save for everyone who opens this scenario?</span>
                <button
                  onClick={() => setConfirmingSave(false)}
                  className="rounded border border-gold/30 px-2 py-1 text-cream/70 hover:bg-gold/10"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setConfirmingSave(false);
                    saveNow();
                  }}
                  className="rounded bg-gold px-3 py-1 font-semibold text-navy"
                >
                  Yes, save
                </button>
              </>
            ) : confirmingDiscard ? (
              <>
                <span className="text-gold">Discard your changes?</span>
                <button
                  onClick={() => setConfirmingDiscard(false)}
                  className="rounded border border-gold/30 px-2 py-1 text-cream/70 hover:bg-gold/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDiscardClick}
                  className="rounded bg-red-500/80 px-3 py-1 font-semibold text-navy hover:bg-red-500"
                >
                  Yes, discard
                </button>
              </>
            ) : dirty ? (
              <>
                <span className="text-gold">Unsaved changes</span>
                <button
                  onClick={() => setConfirmingDiscard(true)}
                  disabled={saving}
                  className="rounded border border-gold/30 px-2 py-1 text-cream/70 hover:bg-gold/10 disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveClick}
                  disabled={saving}
                  className="rounded bg-gold px-3 py-1 font-semibold text-navy disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </>
            ) : (
              <SaveIndicator status={status} />
            )}
            <span className="hidden max-w-[180px] truncate sm:inline" title={userEmail}>
              {userEmail}
            </span>
            <form action={signOutAction}>
              <button type="submit" className="text-gold hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {saveError && (
        <div className="flex items-center justify-between border-b border-red-400/40 bg-red-950/40 px-4 py-2 text-sm text-red-100">
          <span>{saveError}</span>
          <button className="underline" onClick={() => setSaveError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {conflict && (
        <div className="border-b border-red-400/40 bg-red-950/40 px-4 py-2 text-sm text-red-100">
          Someone saved changes to this scenario while you were editing.{" "}
          <button
            className="underline"
            onClick={() => {
              setDoc(conflict.serverDoc);
              setScenario(conflict.serverScenario);
              setRev(conflict.serverScenario.rev);
              setDirty(false);
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
              const targetRev = conflict.serverScenario.rev;
              setConflict(null);
              saveNow(targetRev);
            }}
          >
            keep mine and overwrite
          </button>
          .
        </div>
      )}

      <main className="mx-auto max-w-6xl space-y-4 p-4">
        <TierReadouts doc={doc} result={result} />

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
          onItemViewChange={(id, view) => update((d) => M.setItemView(d, id, view))}
          onRenameRow={(id, name) => update((d) => M.renameRow(d, id, name))}
          onRemoveRow={(id) => update((d) => M.removeRow(d, id))}
          onReorderRow={(groupId, id, dir) => update((d) => M.reorderRow(d, groupId, id, dir))}
          onMoveRowToGroup={(id, targetGroupId) => update((d) => M.moveRowToGroup(d, id, targetGroupId))}
          onToggleScopeTier={(id, tier) => update((d) => M.togglePsk(d, id, tier))}
          onScopeValueChange={(id, value) => update((d) => M.setScopeServiceValue(d, id, value))}
          onBenchService={(id) => update((d) => M.benchService(d, id))}
          onQuickAddRow={(groupId) => update((d) => M.addRow(d, groupId, "New line", "monthly", 0))}
          onRemoveGroup={(id) => update((d) => M.removeGroup(d, id))}
          onQuickAddGroup={() => update((d) => M.addGroup(d, "New group"))}
          onRenameGroup={(id, label) => update((d) => M.renameGroup(d, id, label))}
          onDragServiceToCategory={(id, category) => update((d) => M.setServiceCategory(d, id, category))}
          onDragServiceToOwner={(id, ownerId) => update((d) => M.setScopeOwner(d, id, ownerId))}
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
          onRenameCategory={(oldName, newName) => update((d) => M.renameCategory(d, oldName, newName))}
          onAddScopeService={(opts) => update((d) => M.addScopeService(d, opts))}
          onExport={() => window.open(api.exportUrl(scenario.id), "_blank")}
          onImport={async (file) => {
            if (!confirmDiscardIfDirty()) return;
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
            if (!confirmDiscardIfDirty()) return;
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

      {overlay === "bench" && (
        <BenchOverlay
          doc={doc}
          onClose={() => setOverlay(null)}
          onDestinationChange={(id, destination) =>
            update((d) => M.setBenchDestination(d, id, destination))
          }
          onMove={(id) => update((d) => M.promoteFromBench(d, id))}
        />
      )}

      {promptState && (
        <PromptModal
          title={
            promptState.kind === "create"
              ? "New scenario"
              : promptState.kind === "duplicate"
                ? "Duplicate scenario"
                : "Rename scenario"
          }
          label={promptState.kind === "rename" ? undefined : "Name"}
          defaultValue={promptState.defaultValue}
          confirmLabel={promptState.kind === "rename" ? "Rename" : "Create"}
          onCancel={() => setPromptState(null)}
          onSubmit={async (name) => {
            const kind = promptState.kind;
            setPromptState(null);
            if (kind === "create") {
              const created = await api.create(name, doc);
              await refreshList();
              await loadScenario(created.id);
            } else if (kind === "duplicate") {
              const created = await api.duplicate(scenario.id, name);
              await refreshList();
              await loadScenario(created.id);
            } else {
              await api.rename(scenario.id, name);
              await refreshList();
              setScenario((s) => (s ? { ...s, name } : s));
            }
          }}
        />
      )}
    </div>
  );
}

function SaveIndicator({ status }: { status: "idle" | "saved" | "error" }) {
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
