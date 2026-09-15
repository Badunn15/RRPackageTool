import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { scenarios } from "@/lib/db/schema";
import { ApiError, jsonError, requireUser } from "@/lib/api-helpers";
import { migrate } from "@/lib/migrate";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const [scenario] = await db.select().from(scenarios).where(eq(scenarios.id, id)).limit(1);
    if (!scenario) throw new ApiError(404, "Scenario not found.");

    const doc = migrate(scenario.doc);
    const filename = `${scenario.name.replace(/[^a-z0-9-_]+/gi, "-")}.json`;

    return new NextResponse(JSON.stringify(doc, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
