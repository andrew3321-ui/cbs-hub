import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const scenarios = sqliteTable("scenarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  revenueCents: integer("revenue_cents").notNull(),
  currentRateBps: integer("current_rate_bps").notNull(),
  newRateBps: integer("new_rate_bps").notNull(),
  costRateBps: integer("cost_rate_bps").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
