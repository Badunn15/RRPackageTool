import { CalcDoc } from "./types";

export interface ScenarioSummary {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  updatedBy: string;
  rev: number;
  isDefault: boolean;
}

export interface ScenarioRow extends ScenarioSummary {
  doc: CalcDoc;
  schema: number;
  createdBy: string;
  createdAt: string;
  archivedAt: string | null;
}

async function asJson<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 409) {
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export const api = {
  list: () => fetch("/api/scenarios").then((r) => asJson<ScenarioSummary[]>(r)),

  create: (name: string, doc?: CalcDoc) =>
    fetch("/api/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, doc }),
    }).then((r) => asJson<ScenarioRow>(r)),

  get: (id: string) =>
    fetch(`/api/scenarios/${id}`).then((r) => asJson<{ scenario: ScenarioRow; doc: CalcDoc }>(r)),

  save: async (id: string, doc: CalcDoc, rev: number, note?: string) => {
    const res = await fetch(`/api/scenarios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc, rev, note }),
    });
    const body = await asJson<
      ScenarioRow | { error: "conflict"; scenario: ScenarioRow; doc: CalcDoc }
    >(res);
    return { ok: res.status !== 409, status: res.status, body };
  },

  rename: (id: string, name: string) =>
    fetch(`/api/scenarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then((r) => asJson<ScenarioRow>(r)),

  duplicate: (id: string, name?: string) =>
    fetch(`/api/scenarios/${id}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then((r) => asJson<ScenarioRow>(r)),

  remove: (id: string) => fetch(`/api/scenarios/${id}`, { method: "DELETE" }).then((r) => asJson(r)),

  versions: (id: string) =>
    fetch(`/api/scenarios/${id}/versions`).then((r) =>
      asJson<{ rev: number; note: string | null; createdBy: string; createdAt: string }[]>(r)
    ),

  version: (id: string, rev: number) =>
    fetch(`/api/scenarios/${id}/versions/${rev}`).then((r) => asJson<{ doc: CalcDoc }>(r)),

  restore: (id: string, rev: number) =>
    fetch(`/api/scenarios/${id}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rev }),
    }).then((r) => asJson<ScenarioRow>(r)),

  exportUrl: (id: string) => `/api/scenarios/${id}/export`,

  import: (id: string, doc: CalcDoc) =>
    fetch(`/api/scenarios/${id}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc }),
    }).then((r) => asJson<ScenarioRow>(r)),
};
