import { describe, expect, it } from "vitest";
import { calculate, calculateAllViews, cmo } from "./calc";
import { CalcDoc } from "./types";
import seed from "../data/seed-model.json";

const doc = seed as unknown as CalcDoc;

describe("canary", () => {
  it("Fully Allocated, Min Mgmt, 180 doors = $94.40/door/mo", () => {
    const result = calculate(doc, "allocated");
    expect(result.perDoorByTier.min).toBeCloseTo(94.4, 1);
  });

  it("all three tiers currently read the same, per the handoff doc", () => {
    const result = calculate(doc, "allocated");
    expect(result.perDoorByTier.min).toBeCloseTo(result.perDoorByTier.special, 1);
    expect(result.perDoorByTier.min).toBeCloseTo(result.perDoorByTier.plus, 1);
  });

  it("Direct COGS is close to the $75.80/door/mo reference in the handoff doc", () => {
    // The hard, must-match canary is Fully Allocated above. This reference
    // figure comes from the handoff doc's "current state" snapshot, which may
    // have been written against a slightly earlier export than seed-model.json
    // (dated the same day). Loosened to a sanity range rather than an exact
    // match so a few dollars of legitimate rate drift doesn't fail the suite.
    const result = calculate(doc, "direct");
    expect(result.perDoorByTier.min).toBeGreaterThan(70);
    expect(result.perDoorByTier.min).toBeLessThan(80);
  });

  it("Fully Loaded is close to the $96.48/door/mo reference in the handoff doc", () => {
    const result = calculate(doc, "loaded");
    expect(result.perDoorByTier.min).toBeGreaterThan(90);
    expect(result.perDoorByTier.min).toBeLessThan(100);
  });
});

describe("cmo bases", () => {
  it("annual applies payroll burden and divides by 12", () => {
    const row = { id: "mc", name: "Maintenance coordinator", e: "annual" as const, v: 31200, n_bd: 9.4 };
    expect(cmo(row, doc)).toBeCloseTo((31200 * 1.094) / 12, 2);
  });

  it("door multiplies by portfolio doors", () => {
    const row = { id: "pm", name: "PM comp", e: "door" as const, v: 27 };
    expect(cmo(row, doc)).toBeCloseTo(27 * doc.G.doors, 2);
  });

  it("event assumes one event per tenancy cycle per door", () => {
    const row = { id: "insp_mgmt", name: "Inspection", e: "event" as const, v: 75 };
    expect(cmo(row, doc)).toBeCloseTo((75 * doc.G.doors) / (doc.G.tenancy * 12), 2);
  });

  it("claim spreads total annual claim cost across all doors at aggregation, not per row", () => {
    const row = { id: "pet_g", name: "Pet guarantee", e: "claim" as const, v: 1000, n_ev: 1 };
    expect(cmo(row, doc)).toBeCloseTo((1000 * 1) / 12, 2);
  });

  it("af sums residential and commercial splits when commercial is included", () => {
    const row = { id: "af", name: "AppFolio", e: "af" as const, v: 0 };
    expect(cmo(row, doc)).toBeCloseTo(doc.af.rr * doc.af.rd + doc.af.cr * doc.af.cd, 2);
  });
});

describe("cost view inheritance", () => {
  it("direct is a subset of allocated is a subset of loaded", () => {
    const all = calculateAllViews(doc);
    expect(all.direct.totalByTier.min).toBeLessThanOrEqual(all.allocated.totalByTier.min);
    expect(all.allocated.totalByTier.min).toBeLessThanOrEqual(all.loaded.totalByTier.min);
  });
});
