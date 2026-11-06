import { pgTable, serial, timestamp, integer, numeric, text, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { coursesTable } from "./courses";

export const priceRequestStatusEnum = pgEnum("price_request_status", ["pending", "approved", "rejected", "countered"]);

export const priceRequestsTable = pgTable("price_requests", {
  id: serial("id").primaryKey(),
  coachId: integer("coach_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  requestedPrice: numeric("requested_price", { precision: 10, scale: 2 }).notNull(),
  currentPrice: numeric("current_price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("DZD"),
  justification: text("justification"),
  status: priceRequestStatusEnum("status").notNull().default("pending"),
  adminResponse: text("admin_response"),
  counterPrice: numeric("counter_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export type PriceRequest = typeof priceRequestsTable.$inferSelect;
