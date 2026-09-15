import { eq } from "drizzle-orm";
import { db } from "./index";
import { scenarios, scenarioVersions } from "./schema";
import { CURRENT_SCHEMA, migrate } from "../migrate";
import seedModel from "../../data/seed-model.json";

/** Seeds one scenario named "Current" from data/seed-model.json, if it doesn't already exist. */
async function main() {
  const existing = await db.select().from(scenarios).where(eq(scenarios.name, "Current")).limit(1);
  if (existing.length > 0) {
    console.log('A scenario named "Current" already exists — skipping seed.');
    return;
  }

  const doc = migrate(seedModel);
  const createdBy = "seed@raynorrealtync.com";

  const [scenario] = await db
    .insert(scenarios)
    .values({
      name: "Current",
      description: "Seeded from the original ClickUp model export.",
      doc,
      schema: CURRENT_SCHEMA,
      isDefault: true,
      createdBy,
      updatedBy: createdBy,
      rev: 1,
    })
    .returning();

  await db.insert(scenarioVersions).values({
    scenarioId: scenario.id,
    rev: 1,
    doc,
    note: "Initial seed",
    createdBy,
  });

  console.log(`Seeded scenario "Current" (${scenario.id}).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
