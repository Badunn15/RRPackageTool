import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { scenarios, scenarioVersions } from "@/lib/db/schema";
import { ApiError, jsonError, requireUser } from "@/lib/api-helpers";
import { CURRENT_SCHEMA, migrate } from "@/lib/migrate";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const [scenario] = await db.select().from(scenarios).where(eq(scenarios.id, id)).limit(1);
    if (!scenario) throw new ApiError(404, "Scenario not found.");

    // Migrate on read. The migrated doc is returned but never written back
    // here — it lands in the database on the client's next normal save, and
    // history keeps the original untouched.
    const doc = migrate(scenario.doc);
    return NextResponse.json({ scenario, doc });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const email = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const { doc: incomingDoc, rev, note } = body as { doc: unknown; rev: number; note?: string };

    if (typeof rev !== "number") throw new ApiError(400, "Missing rev.");

    const [current] = await db.select().from(scenarios).where(eq(scenarios.id, id)).limit(1);
    if (!current) throw new ApiError(404, "Scenario not found.");

    if (current.rev !== rev) {
      // Do not silently last-write-wins: hand back the current doc so the UI
      // can say "someone saved changes while you were editing."
      return NextResponse.json(
        { error: "conflict", scenario: current, doc: migrate(current.doc) },
        { status: 409 }
      );
    }

    const doc = migrate(incomingDoc);
    const nextRev = current.rev + 1;

    // Both writes happen in one transaction: insert the version, then bump
    // the scenario. If either fails, neither lands.
    const updated = await db.transaction(async (tx) => {
      await tx.insert(scenarioVersions).values({
        scenarioId: id,
        rev: nextRev,
        doc,
        note: note ?? null,
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

/** Renames a scenario / edits its description. Metadata only — no doc change, no new version. */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const email = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const patch: { name?: string; description?: string | null; updatedBy: string; updatedAt: Date } = {
      updatedBy: email,
      updatedAt: new Date(),
    };
    if (typeof body.name === "string") patch.name = body.name;
    if (typeof body.description === "string" || body.description === null) {
      patch.description = body.description;
    }
    const [row] = await db.update(scenarios).set(patch).where(eq(scenarios.id, id)).returning();
    if (!row) throw new ApiError(404, "Scenario not found.");
    return NextResponse.json(row);
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const email = await requireUser();
    const { id } = await params;
    const [row] = await db
      .update(scenarios)
      .set({ archivedAt: new Date(), updatedBy: email })
      .where(eq(scenarios.id, id))
      .returning();
    if (!row) throw new ApiError(404, "Scenario not found.");
    return NextResponse.json(row);
  } catch (err) {
    return jsonError(err);
  }
}
