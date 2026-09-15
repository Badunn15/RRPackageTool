import { NextRequest, NextResponse } from "next/server";
import { asc, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { scenarios, scenarioVersions } from "@/lib/db/schema";
import { jsonError, requireUser } from "@/lib/api-helpers";
import { CURRENT_SCHEMA, migrate } from "@/lib/migrate";
import seedModel from "@/data/seed-model.json";

export async function GET() {
  try {
    await requireUser();
    const rows = await db
      .select({
        id: scenarios.id,
        name: scenarios.name,
        description: scenarios.description,
        updatedAt: scenarios.updatedAt,
        updatedBy: scenarios.updatedBy,
        rev: scenarios.rev,
        isDefault: scenarios.isDefault,
      })
      .from(scenarios)
      .where(isNull(scenarios.archivedAt))
      .orderBy(asc(scenarios.name));
    return NextResponse.json(rows);
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const email = await requireUser();
    const body = await req.json().catch(() => ({}));
    const name: string = body.name ?? "Untitled scenario";
    const doc = migrate(body.doc ?? seedModel);

    const [scenario] = await db
      .insert(scenarios)
      .values({
        name,
        description: body.description ?? null,
        doc,
        schema: CURRENT_SCHEMA,
        isDefault: false,
        createdBy: email,
        updatedBy: email,
        rev: 1,
      })
      .returning();

    await db.insert(scenarioVersions).values({
      scenarioId: scenario.id,
      rev: 1,
      doc,
      note: "Created",
      createdBy: email,
    });

    return NextResponse.json(scenario, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
