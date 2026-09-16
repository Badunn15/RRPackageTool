import { describe, expect, it } from "vitest";
import { migrate } from "./migrate";
import { calculate } from "./calc";
import * as M from "./mutations";
import seedRaw from "../data/seed-model.json";

function freshDoc() {
  return migrate(seedRaw);
}

describe("removeGroup", () => {
  it("sends a promoted service back to the bench instead of leaving it an invisible cost", () => {
    let doc = freshDoc();
    // Promote a benched service into the "ops" cost group.
    doc = M.setBenchDestination(doc, "uc_hvac", "cost::ops");
    doc = M.promoteFromBench(doc, "uc_hvac");
    expect(doc.place.uc_hvac).toBe("cost:ops");

    const before = calculate(doc, "allocated");
    doc = M.removeGroup(doc, "ops");
    const after = calculate(doc, "allocated");

    expect(doc.place.uc_hvac).toBe("uc"); // back on the bench
    // Removing the group must not leave uc_hvac's cost silently baked into
    // totals with no visible row anywhere in the table.
    expect(after.totalByTier.min).toBeLessThan(before.totalByTier.min);
  });
});

describe("reorderRow", () => {
  it("no-ops at the boundaries instead of throwing or corrupting order", () => {
    const doc = freshDoc();
    const group = doc.CG.find((g) => g.id === "staff")!;
    const originalOrder = group.rows.map((r) => r.id);

    const movedUpFromTop = M.reorderRow(doc, "staff", originalOrder[0], -1);
    expect(movedUpFromTop.CG.find((g) => g.id === "staff")!.rows.map((r) => r.id)).toEqual(
      originalOrder
    );

    const lastId = originalOrder[originalOrder.length - 1];
    const movedDownFromBottom = M.reorderRow(doc, "staff", lastId, 1);
    expect(movedDownFromBottom.CG.find((g) => g.id === "staff")!.rows.map((r) => r.id)).toEqual(
      originalOrder
    );
  });

  it("swaps adjacent rows", () => {
    const doc = freshDoc();
    const group = doc.CG.find((g) => g.id === "staff")!;
    const [first, second] = group.rows.map((r) => r.id);

    const moved = M.reorderRow(doc, "staff", second, -1);
    const newOrder = moved.CG.find((g) => g.id === "staff")!.rows.map((r) => r.id);
    expect(newOrder[0]).toBe(second);
    expect(newOrder[1]).toBe(first);
  });
});

describe("promoteFromBench / benchService round trip", () => {
  it("promoting to scope gives it a category and an owner, and it's editable again after benching", () => {
    let doc = freshDoc();
    doc = M.setBenchDestination(doc, "uc_term", "scope::Owner Lifecycle");
    doc = M.promoteFromBench(doc, "uc_term");

    expect(doc.place.uc_term).toBe("scope");
    expect(doc.icat.uc_term).toBe("Owner Lifecycle");
    expect(doc.scopeOwner.uc_term).toBeDefined();

    doc = M.benchService(doc, "uc_term");
    expect(doc.place.uc_term).toBe("uc");
  });
});

describe("addScopeService / removeScopeService", () => {
  it("a newly added service is immediately visible under its chosen owner and countable", () => {
    let doc = freshDoc();
    doc = M.addScopeService(doc, {
      name: "Test new service",
      category: "Owner Lifecycle",
      ownerRowId: "mc",
      value: 42,
    });
    const added = Object.values(doc.MASTER).find((s) => s.n === "Test new service");
    expect(added).toBeDefined();
    expect(doc.scopeOwner[added!.id]).toBe("mc");

    doc = M.removeScopeService(doc, added!.id);
    expect(doc.MASTER[added!.id]).toBeUndefined();
    expect(doc.removed[`svc:${added!.id}`]).toBe(true);
  });
});

describe("renameCategory", () => {
  it("updates CATS and every service pointing at that category", () => {
    let doc = freshDoc();
    doc = M.renameCategory(doc, "Renewals", "Lease Renewals");
    expect(doc.CATS).toContain("Lease Renewals");
    expect(doc.CATS).not.toContain("Renewals");
    const stillOldCategory = Object.values(doc.MASTER).filter((s) => s.dc === "Renewals");
    expect(stillOldCategory).toHaveLength(0);
  });

  it("refuses to rename into a name that already exists, rather than merging categories silently", () => {
    let doc = freshDoc();
    doc = M.renameCategory(doc, "Renewals", "Inspections");
    expect(doc.CATS).toContain("Renewals");
    expect(doc.CATS.filter((c) => c === "Inspections")).toHaveLength(1);
  });
});
