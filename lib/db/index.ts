import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// The neon-http driver can't do real multi-statement transactions (each query
// is its own HTTP call). The save flow needs a real transaction — insert the
// version row and update the scenario row atomically, or neither lands — so
// we use the pooled, WebSocket-based driver instead.
neonConfig.webSocketConstructor = ws;

type Db = NeonDatabase<typeof schema>;

let cached: Db | null = null;

function getDb(): Db {
  if (cached) return cached;
  const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Missing POSTGRES_URL. Link a Postgres database to this Vercel project (Storage -> Postgres -> Connect to Project), " +
        "or set POSTGRES_URL/DATABASE_URL in .env.local for local development."
    );
  }
  const pool = new Pool({ connectionString });
  cached = drizzle(pool, { schema });
  return cached;
}

// Lazily initialized so importing this module (e.g. during `next build`,
// which loads every route module) never throws for a missing env var —
// only an actual query at request time does.
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
});
