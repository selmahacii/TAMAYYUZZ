import { pgTable, serial, timestamp, integer, numeric, text, pgEnum, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { purchasesTable } from "./purchases";
import { coursesTable } from "./courses";
import { payoutsTable } from "./payouts";

export const commissionStatusEnum = pgEnum("commission_status", ["pending", "approved", "paid", "cancelled"]);

export const commissionsTable = pgTable("commissions", {
  id: serial("id").primaryKey(),
  coachId: integer("coach_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  purchaseId: integer("purchase_id").references(() => purchasesTable.id, { onDelete: "set null" }),
  courseId: integer("course_id").references(() => coursesTable.id, { onDelete: "set null" }),
  payoutId: integer("payout_id").references(() => payoutsTable.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("DZD"),
  ratePercent: numeric("rate_percent", { precision: 5, scale: 2 }).notNull().default("70"),
  status: commissionStatusEnum("status").notNull().default("pending"),
  isPaid: boolean("is_paid").notNull().default(false),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Commission = typeof commissionsTable.$inferSelect;
