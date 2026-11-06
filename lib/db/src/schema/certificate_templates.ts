import { pgTable, text, serial, timestamp, boolean, json } from "drizzle-orm/pg-core";

export const certificateTemplatesTable = pgTable("certificate_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  primaryColor: text("primary_color").notNull().default("#6d28d9"),
  accentColor: text("accent_color").notNull().default("#f59e0b"),
  logoUrl: text("logo_url"),
  backgroundUrl: text("background_url"),
  layout: json("layout"),
  customTitleText: text("custom_title_text"),
  signatureTitle: text("signature_title"),
  fontFamily: text("font_family").$type<"serif" | "sans">().default("serif"),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type CertificateTemplate = typeof certificateTemplatesTable.$inferSelect;
