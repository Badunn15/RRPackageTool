import { NextRequest, NextResponse } from "next/server";
import { isNull } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { scenarios, scenarioVersions } from "@/lib/db/schema";
import { ApiError, jsonError, requireUser } from "@/lib/api-helpers";
import { CURRENT_SCHEMA, migrate } from "@/lib/migrate";
import { addScopeService } from "@/lib/mutations";

/**
 * Adds a brand-new PM-scope service to every active (non-archived) scenario
 * at once, bypassing the normal local-edit-then-Save flow -- this writes
 * straight to the database for scenarios the caller isn't even looking at.
 * Used only when the user explicitly chooses "all scenarios" over "just this
 * one" when adding a new line item.
 */
export async function POST(req: NextRequest) {
  try {
    const email = await requireUser();
    const body = await req.json().catch(() => ({}));
    const { name, category, ownerRowId, value } = body as {
      name?: string;
      category?: string;
      ownerRowId?: string;
      value?: number;
    };
    if (!name?.trim() || !category?.trim() || !ownerRowId?.trim()) {
      throw new ApiError(400, "Missing name, category, or ownerRowId.");
    }

    const activeIds = (
      await db.select({ id: scenarios.id }).from(scenarios).where(isNull(scenarios.archivedAt))
    ).map((r) => r.id);

    const updated = await db.transaction(async (tx) => {
      const results: { id: string; name: string; rev: number }[] = [];
      for (const id of activeIds) {
        // Re-read each row's doc/rev inside the transaction rather than off
        // an outer snapshot, so a concurrent edit to that one scenario
        // between the initial SELECT and this write isn't silently
        // clobbered.
        const [current] = await tx.select().from(scenarios).where(eq(scenarios.id, id)).limit(1);
        if (!current || current.archivedAt) continue;

        const doc = addScopeService(migrate(current.doc), {
          name: name.trim(),
          category: category.trim(),
          ownerRowId: ownerRowId.trim(),
          value,
        });
        const nextRev = current.rev + 1;
        await tx.insert(scenarioVersions).values({
          scenarioId: id,
          rev: nextRev,
          doc,
          note: `Bulk-added scope service: ${name.trim()} (all scenarios)`,
          createdBy: email,
        });
        const [saved] = await tx
          .update(scenarios)
          .set({ doc, schema: CURRENT_SCHEMA, rev: nextRev, updatedBy: email, updatedAt: new Date() })
          .where(eq(scenarios.id, id))
          .returning();
        results.push({ id: saved.id, name: saved.name, rev: saved.rev });
      }
      return results;
    });

    return NextResponse.json({ updatedScenarios: updated });
  } catch (err) {
    return jsonError(err);
  }
}
