import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { scenarioVersions } from "@/lib/db/schema";
import { ApiError, jsonError, requireUser } from "@/lib/api-helpers";
import { migrate } from "@/lib/migrate";

type Params = { params: Promise<{ id: string; rev: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id, rev } = await params;
    const revNum = Number(rev);
    if (!Number.isInteger(revNum)) throw new ApiError(400, "Invalid rev.");

    const [version] = await db
      .select()
      .from(scenarioVersions)
      .where(and(eq(scenarioVersions.scenarioId, id), eq(scenarioVersions.rev, revNum)))
      .limit(1);
    if (!version) throw new ApiError(404, "Version not found.");

    return NextResponse.json({ version, doc: migrate(version.doc) });
  } catch (err) {
    return jsonError(err);
  }
}
