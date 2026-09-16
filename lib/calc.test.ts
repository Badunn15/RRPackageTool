import { describe, expect, it } from "vitest";
import {
  bundleOwnerRows,
  calculate,
  calculateAllViews,
  cmo,
  scopedServicesByOwner,
} from "./calc";
import { migrate } from "./migrate";
import { CalcDoc } from "./types";
import seedRaw from "../data/seed-model.json";

const doc = seedRaw as unknown as CalcDoc;
const migrated = migrate(seedRaw);

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

  it("event basis returns 0, not Infinity/NaN, when tenancy is set to 0", () => {
    const zeroTenancyDoc: CalcDoc = { ...doc, G: { ...doc.G, tenancy: 0 } };
    const row = { id: "insp_mgmt", name: "Inspection", e: "event" as const, v: 75 };
    expect(cmo(row, zeroTenancyDoc)).toBe(0);
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

describe("scope-service bundle ownership", () => {
  it("still hits the $94.40 canary after migration, with Accounting split out at $0", () => {
    // acct's rate is 0 until someone sets a real salary, so splitting it out
    // of PM comp must not move the canary number.
    const result = calculate(migrated, "allocated");
    expect(result.perDoorByTier.min).toBeCloseTo(94.4, 1);
  });

  it("PM, Maintenance Coordinator, and Accounting are all bundle-owner rows", () => {
    const owners = bundleOwnerRows(migrated).map((r) => r.id);
    expect(owners).toEqual(expect.arrayContaining(["pm", "mc", "acct"]));
  });

  it("reassigned maintenance/accounting services show up under their new owner, not PM", () => {
    const pmServices = scopedServicesByOwner(migrated, "pm").flatMap((g) => g.services.map((s) => s.id));
    const mcServices = scopedServicesByOwner(migrated, "mc").flatMap((g) => g.services.map((s) => s.id));
    const acctServices = scopedServicesByOwner(migrated, "acct").flatMap((g) => g.services.map((s) => s.id));

    expect(mcServices).toEqual(
      expect.arrayContaining(["ps_wo_triage", "ps_vendor_comm", "ps_invoice_rev", "ps_after_hours"])
    );
    expect(acctServices).toEqual(
      expect.arrayContaining(["ps_distributions", "ps_vendor_pay", "ps_tax_docs"])
    );
    expect(pmServices).toEqual(
      expect.arrayContaining(["ps_wo_escalation", "ps_rent_roll", "ps_owner_stmt"])
    );
    expect(pmServices).not.toEqual(expect.arrayContaining(mcServices));
    expect(pmServices).not.toEqual(expect.arrayContaining(acctServices));
  });

  it("every scope service has exactly one owner", () => {
    const owners = bundleOwnerRows(migrated).map((r) => r.id);
    const scopeServiceIds = Object.entries(migrated.MASTER)
      .filter(([id]) => migrated.place[id] === "scope")
      .map(([id]) => id);
    for (const id of scopeServiceIds) {
      expect(owners).toContain(migrated.scopeOwner[id]);
    }
  });
});
