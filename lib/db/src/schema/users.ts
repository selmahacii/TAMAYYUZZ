import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
  integer,
  json,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { centersTable } from "./centers";

export const roleEnum = pgEnum("user_role", ["student", "coach", "admin"]);

export interface Diploma {
  name: string;
  documentUrl: string | null;
  verified: boolean;
}

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("student"),
  isApproved: boolean("is_approved").notNull().default(false),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  centerId: integer("center_id").references(() => centersTable.id, { onDelete: "set null" }),
  phone: text("phone"),
  domain: text("domain"),
  diplomas: json("diplomas").$type<Diploma[]>().notNull().default([]),
  priorTrainings: json("prior_trainings").$type<string[]>().notNull().default([]),
  teachingPlan: text("teaching_plan"),
  interests: json("interests").$type<string[]>().notNull().default([]),
  tokenVersion: integer("token_version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
