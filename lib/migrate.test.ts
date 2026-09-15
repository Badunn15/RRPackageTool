import { describe, expect, it } from "vitest";
import { CURRENT_SCHEMA, migrate } from "./migrate";
import { activeTemplate, calculate } from "./calc";
import legacy from "../data/legacy-v19-fixture.json";
import { CalcDoc } from "./types";

describe("migrate — legacy v19 fixture", () => {
  it("upgrades to the current schema without throwing", () => {
    const doc = migrate(legacy);
    expect(doc.schema).toBe(CURRENT_SCHEMA);
  });

  it("preserves rates from the legacy doc", () => {
    const doc = migrate(legacy);
    expect(doc.vl.aptly).toBe(80);
    expect(doc.vl.quo).toBe(140);
    expect(doc.vl.meld).toBe(2);
  });

  it("preserves the legacy template id/name and active pointer", () => {
    const doc = migrate(legacy);
    expect(doc.at).toBe("default");
    expect(doc.templates.find((t) => t.id === "default")?.name).toBe("Default");
  });

  it("preserves scope service values (psv)", () => {
    const doc = migrate(legacy);
    expect(doc.psv.ps_renew_comp).toBe(23);
    expect(doc.psv.ps_portfolio_rpt).toBe(47);
  });

  it("backfills missing CG/MASTER/ck/psk so the migrated doc renders and calculates", () => {
    const doc = migrate(legacy);
    expect(doc.CG.length).toBeGreaterThan(0);
    expect(Object.keys(doc.MASTER).length).toBeGreaterThan(0);
    expect(activeTemplate(doc).ck.pm).toBeDefined();
    const result = calculate(doc, "allocated");
    expect(result.perDoorByTier.min).toBeGreaterThan(0);
  });

  it("is idempotent", () => {
    const once = migrate(legacy);
    const twice = migrate(once);
    expect(twice).toEqual(once);
  });

  it("never drops unrecognized keys", () => {
    const doc = migrate({ ...(legacy as object), mysteryField: "keep me" });
    expect((doc as unknown as Record<string, unknown>).mysteryField).toBe("keep me");
  });

  it("respects tombstones — a removed group/row/service/category stays gone", () => {
    const withRemoved = {
      ...(legacy as object),
      removed: {
        "grp:exec": true,
        "row:mc": true,
        "svc:uc_hvac": true,
        "cat:Renewals": true,
      },
    };
    const doc = migrate(withRemoved) as CalcDoc;
    expect(doc.CG.find((g) => g.id === "exec")).toBeUndefined();
    expect(doc.CG.flatMap((g) => g.rows).find((r) => r.id === "mc")).toBeUndefined();
    expect(doc.MASTER.uc_hvac).toBeUndefined();
    expect(doc.CATS).not.toContain("Renewals");
  });

  it("does not overwrite a value already present in the incoming doc", () => {
    const edited = { ...(legacy as object), vl: { ...(legacy as any).vl, aptly: 999 } };
    const doc = migrate(edited);
    expect(doc.vl.aptly).toBe(999);
  });
});
