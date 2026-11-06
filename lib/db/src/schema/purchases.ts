import {
  pgTable,
  serial,
  timestamp,
  integer,
  numeric,
  text,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { coursesTable } from "./courses";

export const purchasesTable = pgTable("purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  courseId: integer("course_id")
    .notNull()
    .references(() => coursesTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("DZD"),
  couponCode: text("coupon_code"),
  discountApplied: numeric("discount_applied", { precision: 10, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("paid"), // "paid" | "pending_verification" | "rejected"
  paymentMethod: text("payment_method").notNull().default("card"), // "card" | "baridimob" | "ccp" | "free"
  receiptUrl: text("receipt_url"),
  rejectionReason: text("rejection_reason"),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPurchaseSchema = createInsertSchema(purchasesTable).omit({
  id: true,
  paidAt: true,
});
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Purchase = typeof purchasesTable.$inferSelect;
