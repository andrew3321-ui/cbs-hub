import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  cnpj: text("cnpj"),
  taxRegime: text("tax_regime").notNull(),
  sector: text("sector").notNull().default("Serviços"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const scenarios = sqliteTable("scenarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  revenueCents: integer("revenue_cents").notNull(),
  currentRateBps: integer("current_rate_bps").notNull(),
  newRateBps: integer("new_rate_bps").notNull(),
  costRateBps: integer("cost_rate_bps").notNull(),
  priceAdjustmentBps: integer("price_adjustment_bps").notNull().default(0),
  companyId: integer("company_id").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
