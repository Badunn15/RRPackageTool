import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { scenarios, scenarioVersions } from "@/lib/db/schema";
import { ApiError, jsonError, requireUser } from "@/lib/api-helpers";
import { CURRENT_SCHEMA, migrate } from "@/lib/migrate";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const email = await requireUser();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const [source] = await db.select().from(scenarios).where(eq(scenarios.id, id)).limit(1);
    if (!source) throw new ApiError(404, "Scenario not found.");

    const doc = migrate(source.doc);
    const name = body.name ?? `${source.name} (copy)`;

    const [copy] = await db
      .insert(scenarios)
      .values({
        name,
        description: source.description,
        doc,
        schema: CURRENT_SCHEMA,
        isDefault: false,
        createdBy: email,
        updatedBy: email,
        rev: 1,
      })
      .returning();

    await db.insert(scenarioVersions).values({
      scenarioId: copy.id,
      rev: 1,
      doc,
      note: `Duplicated from "${source.name}"`,
      createdBy: email,
    });

    return NextResponse.json(copy, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
