import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Profiles sync table — one row per (syncCode, profileId) pair
export const syncProfilesTable = pgTable("sync_profiles", {
  syncCode: text("sync_code").notNull(),
  profileId: text("profile_id").notNull(),
  nome: text("nome").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [unique().on(t.syncCode, t.profileId)]);

// Daily sales — one row per (syncCode, profileId, data)
export const syncDiasTable = pgTable("sync_dias", {
  syncCode: text("sync_code").notNull(),
  profileId: text("profile_id").notNull(),
  data: text("data").notNull(), // YYYY-MM-DD
  itensJson: text("itens_json").notNull().default("[]"),
  margem: text("margem").notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [unique().on(t.syncCode, t.profileId, t.data)]);

// Monthly configs — one row per (syncCode, profileId, mesId)
export const syncConfigsTable = pgTable("sync_configs", {
  syncCode: text("sync_code").notNull(),
  profileId: text("profile_id").notNull(),
  mesId: text("mes_id").notNull(), // YYYY-MM
  configJson: text("config_json").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [unique().on(t.syncCode, t.profileId, t.mesId)]);

export const insertSyncProfileSchema = createInsertSchema(syncProfilesTable);
export const insertSyncDiaSchema = createInsertSchema(syncDiasTable);
export const insertSyncConfigSchema = createInsertSchema(syncConfigsTable);

export type SyncProfile = typeof syncProfilesTable.$inferSelect;
export type SyncDia = typeof syncDiasTable.$inferSelect;
export type SyncConfig = typeof syncConfigsTable.$inferSelect;
