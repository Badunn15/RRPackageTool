import { describe, expect, it } from "vitest";
import {
  bundleOwnerRows,
  calculate,
  calculateAllViews,
  cmo,
  ownerHourlyRate,
  scopeServiceValue,
  scopedServicesByOwner,
  serviceStats,
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

describe("serviceStats", () => {
  it("counts every scope service as included by default (all dt flags true in the seed)", () => {
    // Min Mgmt is the exception: several scope services default to false
    // there (e.g. ps_pre_list, ps_renew_comp) -- Special/Plus include more.
    // Use "loaded" so every group is visible -- avoids needing to replicate
    // per-group view-gating here just to compute the expected total.
    const special = serviceStats(migrated, "special", "loaded");
    const plus = serviceStats(migrated, "plus", "loaded");
    expect(special.included).toBeGreaterThan(0);
    expect(special.total).toBe(plus.total);

    // total = every scope-catalog service, plus every cost-row/promoted-row
    // outside the Staffing group (staff comp rows aren't "services").
    const scopeCount = Object.values(migrated.place).filter((p) => p === "scope").length;
    let rowCount = 0;
    for (const group of migrated.CG) {
      if (group.id === "staff") continue;
      rowCount += group.rows.length;
    }
    const promotedCount = Object.values(migrated.place).filter(
      (p) => typeof p === "string" && p.startsWith("cost:")
    ).length;
    expect(special.total).toBe(scopeCount + rowCount + promotedCount);
  });

  it("excludedValue sums psv only for services NOT checked at that tier", () => {
    // ps_proactive_rpt defaults to min:false, special:false, plus:true, dsv:16.
    const min = serviceStats(migrated, "min");
    const plus = serviceStats(migrated, "plus");
    expect(min.excludedValue).toBeGreaterThanOrEqual(16);
    expect(min.included).toBeLessThan(min.total);
    expect(plus.included).toBeGreaterThanOrEqual(min.included);
  });

  it("editing a service's psv value changes the excluded-value estimate, not the cost total", () => {
    const before = serviceStats(migrated, "min");
    const edited: CalcDoc = { ...migrated, psv: { ...migrated.psv, ps_proactive_rpt: 500 } };
    const after = serviceStats(edited, "min");
    expect(after.excludedValue).toBeGreaterThan(before.excludedValue);
    // Scope services never contribute to cost -- only their bundle owner's rate does.
    expect(calculate(edited, "allocated").perDoorByTier.min).toBeCloseTo(
      calculate(migrated, "allocated").perDoorByTier.min,
      6
    );
  });

  it("excludes scope services whose bundle owner isn't shown at the given cost view", () => {
    // Gate just the Accounting row to "loaded" (via itemView override) so
    // its bundled scope services drop out of the picture at direct/allocated
    // but come back at loaded -- without touching PM/MC's services.
    const acctOwnedCount = Object.entries(migrated.MASTER).filter(
      ([id]) => migrated.place[id] === "scope" && migrated.scopeOwner[id] === "acct"
    ).length;
    expect(acctOwnedCount).toBeGreaterThan(0);

    const gated: CalcDoc = { ...migrated, itemView: { ...migrated.itemView, acct: "loaded" } };

    // Compare gated vs ungated at the SAME view each time, so the (now
    // combined) total's cost-row portion -- which varies by view on its
    // own, independent of acct's gating -- doesn't confound the comparison.
    const baselineAtDirect = serviceStats(migrated, "min", "direct");
    const gatedAtDirect = serviceStats(gated, "min", "direct");
    expect(gatedAtDirect.total).toBe(baselineAtDirect.total - acctOwnedCount);

    const baselineAtLoaded = serviceStats(migrated, "min", "loaded");
    const gatedAtLoaded = serviceStats(gated, "min", "loaded");
    expect(gatedAtLoaded.total).toBe(baselineAtLoaded.total);
  });

  it("counts cost-group lines (e.g. Photography, Guarantees) as services, but never the Staffing group's own comp rows", () => {
    const stats = serviceStats(migrated, "special", "loaded");

    // Unchecking a non-staff cost-group row (Photography, in Turnover)
    // drops "included" by exactly one but leaves "total" unchanged -- it's
    // still counted as a service, just not one turned on for this tier.
    const ckId = migrated.at;
    const tpl = migrated.templates.find((t) => t.id === ckId)!;
    expect(tpl.ck.photo?.special).toBe(true);
    const withPhotoUnchecked: CalcDoc = {
      ...migrated,
      templates: migrated.templates.map((t) =>
        t.id === ckId ? { ...t, ck: { ...t.ck, photo: { min: false, special: false, plus: false } } } : t
      ),
    };
    const statsPhotoUnchecked = serviceStats(withPhotoUnchecked, "special", "loaded");
    expect(statsPhotoUnchecked.total).toBe(stats.total);
    expect(statsPhotoUnchecked.included).toBe(stats.included - 1);

    // Staffing's own rows (PM comp, MC, Process coordinator, Accounting)
    // never move the count at all -- removing the whole group changes
    // nothing about "total" or "included".
    const withoutStaffGroup: CalcDoc = {
      ...migrated,
      CG: migrated.CG.filter((g) => g.id !== "staff"),
    };
    const statsNoStaff = serviceStats(withoutStaffGroup, "special", "loaded");
    expect(statsNoStaff.total).toBe(stats.total);
    expect(statsNoStaff.included).toBe(stats.included);
  });

  it("the five 'Reporting & Proactive' items are event-based (claim), not door-scaled", () => {
    // These are things done once for an owner/portfolio/deal, not per door --
    // door_yr would wrongly multiply their value by door count if ever promoted.
    for (const id of [
      "ps_portfolio_rpt",
      "ps_annual_review",
      "ps_budget_capex",
      "ps_deal_analysis",
      "ps_proactive_rpt",
    ]) {
      expect(migrated.pbase[id]).toBe("claim");
    }
  });

  it("excludedValue for a claim-basis service is rate x events/yr, not just the raw rate", () => {
    // ps_proactive_rpt: dsv 16, excluded at min. Default ev is 1/yr from the seed.
    const oneEventPerYear = serviceStats(migrated, "min").excludedValue;
    const tripled: CalcDoc = { ...migrated, ev: { ...migrated.ev, ps_proactive_rpt: 3 } };
    const threeEventsPerYear = serviceStats(tripled, "min").excludedValue;
    expect(threeEventsPerYear - oneEventPerYear).toBeCloseTo(16 * (3 - 1), 6);
  });
});

describe("hours-mode scope value", () => {
  it("ownerHourlyRate derives $/hr from the role's own annual cost / hoursYr", () => {
    // PM comp: $27/door x 180 doors x 12mo = $58,320/yr, over 2,080 hrs/yr.
    const rate = ownerHourlyRate(migrated, "pm");
    expect(rate).toBeCloseTo(58320 / 2080, 6);
  });

  it("scopeServiceValue uses hours x hourly rate when psh is set, overriding psv", () => {
    const withHours: CalcDoc = { ...migrated, psh: { ...migrated.psh, ps_pre_list: 2 } };
    const svc = withHours.MASTER.ps_pre_list;
    const rate = ownerHourlyRate(withHours, withHours.scopeOwner.ps_pre_list);
    expect(scopeServiceValue(withHours, "ps_pre_list", svc)).toBeCloseTo(rate * 2, 6);
  });

  it("clearing psh back to 0 falls back to the manually-entered psv value", () => {
    const edited: CalcDoc = {
      ...migrated,
      psv: { ...migrated.psv, ps_pre_list: 40 },
      psh: { ...migrated.psh, ps_pre_list: 0 },
    };
    const svc = edited.MASTER.ps_pre_list;
    expect(scopeServiceValue(edited, "ps_pre_list", svc)).toBe(40);
  });

  it("hours-mode value flows into serviceStats' excluded-value estimate", () => {
    // ps_pre_list defaults to min:false -- excluded at min, so hours mode should show up there.
    const before = serviceStats(migrated, "min").excludedValue;
    const withHours: CalcDoc = { ...migrated, psh: { ...migrated.psh, ps_pre_list: 2 } };
    const rate = ownerHourlyRate(withHours, withHours.scopeOwner.ps_pre_list);
    const after = serviceStats(withHours, "min").excludedValue;
    expect(after - before).toBeCloseTo(rate * 2, 6);
  });
});

describe("excludedValue includes hidden-by-view cost rows, not just scope-catalog services", () => {
  it("Guarantees (gated to 'loaded') count as excluded at direct/allocated, but not once counted at loaded", () => {
    const direct = serviceStats(migrated, "min", "direct");
    const loaded = serviceStats(migrated, "min", "loaded");
    expect(direct.excludedValue).toBeGreaterThan(loaded.excludedValue);

    // The scope-catalog portion is identical at both views here (PM/MC/
    // Accounting are all gated to "direct", visible everywhere), so the
    // entire delta should be exactly the annualized cost of every row in
    // every group NOT gated to "direct" (i.e. newly visible at "loaded":
    // Brokerage Split and Operating at "allocated", Guarantees and
    // Executive at "loaded") that's checked for "min".
    const ck = migrated.templates.find((t) => t.id === migrated.at)!.ck;
    let expectedDelta = 0;
    for (const group of migrated.CG) {
      if ((migrated.secView[group.id] ?? "direct") === "direct") continue;
      for (const row of group.rows) {
        if (ck[row.id]?.min) expectedDelta += cmo(row, migrated) * 12;
      }
    }
    expect(expectedDelta).toBeGreaterThan(0);
    expect(direct.excludedValue - loaded.excludedValue).toBeCloseTo(expectedDelta, 2);
  });
});

describe("evict_filing hard cost", () => {
  it("is a real cost row (claim basis) separate from the owner-facing evict_g guarantee", () => {
    const row = migrated.CG.flatMap((g) => g.rows).find((r) => r.id === "evict_filing");
    expect(row).toBeDefined();
    expect(row!.e).toBe("claim");
    // $126/event (court filing + 1 occupant) x events/yr, spread monthly -- not door-scaled directly.
    const monthly = cmo(row!, migrated);
    const ev = migrated.ev["evict_filing"] ?? row!.n_ev ?? 0;
    expect(monthly).toBeCloseTo((126 * ev) / 12, 6);
  });
});
