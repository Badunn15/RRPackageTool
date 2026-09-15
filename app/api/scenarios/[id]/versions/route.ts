import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { scenarioVersions } from "@/lib/db/schema";
import { jsonError, requireUser } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const rows = await db
      .select({
        rev: scenarioVersions.rev,
        note: scenarioVersions.note,
        createdBy: scenarioVersions.createdBy,
        createdAt: scenarioVersions.createdAt,
      })
      .from(scenarioVersions)
      .where(eq(scenarioVersions.scenarioId, id))
      .orderBy(desc(scenarioVersions.rev));
    return NextResponse.json(rows);
  } catch (err) {
    return jsonError(err);
  }
}
