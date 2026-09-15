import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import ws from "ws";

/** Applies generated SQL migrations (from `npm run db:generate`) to the target database. */
async function main() {
  neonConfig.webSocketConstructor = ws;
  const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Set POSTGRES_URL (or DATABASE_URL) before running this script.");
  }
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
