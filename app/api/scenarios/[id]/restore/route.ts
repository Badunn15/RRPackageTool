import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { scenarios, scenarioVersions } from "@/lib/db/schema";
import { ApiError, jsonError, requireUser } from "@/lib/api-helpers";
import { CURRENT_SCHEMA, migrate } from "@/lib/migrate";

type Params = { params: Promise<{ id: string }> };

/** Restores a past revision by writing it forward as a brand-new rev — never rewinds, so history is never destroyed. */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const email = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const rev = Number(body.rev);
    if (!Number.isInteger(rev)) throw new ApiError(400, "Missing or invalid rev.");

    const [version] = await db
      .select()
      .from(scenarioVersions)
      .where(and(eq(scenarioVersions.scenarioId, id), eq(scenarioVersions.rev, rev)))
      .limit(1);
    if (!version) throw new ApiError(404, "Version not found.");

    const [current] = await db.select().from(scenarios).where(eq(scenarios.id, id)).limit(1);
    if (!current) throw new ApiError(404, "Scenario not found.");

    const doc = migrate(version.doc);
    const nextRev = current.rev + 1;

    const updated = await db.transaction(async (tx) => {
      await tx.insert(scenarioVersions).values({
        scenarioId: id,
        rev: nextRev,
        doc,
        note: `Restored from rev ${rev}`,
        createdBy: email,
      });
      const [row] = await tx
        .update(scenarios)
        .set({ doc, schema: CURRENT_SCHEMA, rev: nextRev, updatedBy: email, updatedAt: new Date() })
        .where(eq(scenarios.id, id))
        .returning();
      return row;
    });

    return NextResponse.json(updated);
  } catch (err) {
    return jsonError(err);
  }
}
