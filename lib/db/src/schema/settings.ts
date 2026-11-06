import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const platformSettingsTable = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  platformName: text("platform_name").notNull().default("Smart Training"),
  platformEmail: text("platform_email").notNull().default("contact@smarttraining.dz"),
  defaultCurrency: text("default_currency").notNull().default("DZD"),
  defaultCommissionRate: text("default_commission_rate").notNull().default("70"),
  maxCoursesPerCoach: text("max_courses_per_coach").notNull().default("10"),
  requireCoachApproval: boolean("require_coach_approval").notNull().default(true),
  requireAdApproval: boolean("require_ad_approval").notNull().default(true),
  allowFreeCoachRegistration: boolean("allow_free_coach_registration").notNull().default(true),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type PlatformSettings = typeof platformSettingsTable.$inferSelect;
