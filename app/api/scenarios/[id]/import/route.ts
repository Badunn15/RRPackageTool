import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { scenarios, scenarioVersions } from "@/lib/db/schema";
import { ApiError, jsonError, requireUser } from "@/lib/api-helpers";
import { CURRENT_SCHEMA, migrate } from "@/lib/migrate";

type Params = { params: Promise<{ id: string }> };

/** Imports a JSON doc: migrate, validate, save as a new rev of the target scenario. */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const email = await requireUser();
    const { id } = await params;
    const body = await req.json();
    if (!body?.doc || typeof body.doc !== "object") {
      throw new ApiError(400, "Body must be { doc: <model JSON> }.");
    }

    const [current] = await db.select().from(scenarios).where(eq(scenarios.id, id)).limit(1);
    if (!current) throw new ApiError(404, "Scenario not found.");

    const doc = migrate(body.doc);
    const nextRev = current.rev + 1;

    const updated = await db.transaction(async (tx) => {
      await tx.insert(scenarioVersions).values({
        scenarioId: id,
        rev: nextRev,
        doc,
        note: "Imported",
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
