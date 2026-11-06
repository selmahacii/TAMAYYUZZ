import { pgTable, text, serial, timestamp, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const payoutStatusEnum = pgEnum("payout_status", ["pending", "processed", "rejected"]);

export const payoutsTable = pgTable("payouts", {
  id: serial("id").primaryKey(),
  coachId: integer("coach_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("DZD"),
  status: payoutStatusEnum("status").notNull().default("pending"),
  paymentMethod: text("payment_method").notNull().default("bank_transfer"), // ccp, bank_transfer, baridimob, cash
  referenceNumber: text("reference_number"),
  notes: text("notes"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPayoutSchema = createInsertSchema(payoutsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPayout = z.infer<typeof insertPayoutSchema>;
export type Payout = typeof payoutsTable.$inferSelect;
