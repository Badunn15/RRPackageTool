import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const scenarios = pgTable(
  "scenarios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    doc: jsonb("doc").notNull(),
    schema: integer("schema").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: text("updated_by").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    rev: integer("rev").notNull().default(1),
  },
  (table) => ({
    activeIdx: index("scenarios_active_idx")
      .on(table.archivedAt)
      .where(sql`${table.archivedAt} is null`),
  })
);

/** Append-only. Never UPDATE or DELETE a row here — this is the undo history. */
export const scenarioVersions = pgTable(
  "scenario_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scenarioId: uuid("scenario_id")
      .notNull()
      .references(() => scenarios.id, { onDelete: "cascade" }),
    rev: integer("rev").notNull(),
    doc: jsonb("doc").notNull(),
    note: text("note"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    scenarioRevUnique: uniqueIndex("scenario_versions_scenario_id_rev_key").on(
      table.scenarioId,
      table.rev
    ),
    scenarioRevDescIdx: index("scenario_versions_scenario_id_rev_desc_idx").on(
      table.scenarioId,
      table.rev.desc()
    ),
  })
);
