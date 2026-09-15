import { defineConfig } from "drizzle-kit";

const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Set POSTGRES_URL (or DATABASE_URL) before running drizzle-kit.");
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: connectionString },
});
