import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
  integer,
  real,
  pgEnum,
  numeric,
  json,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { certificateTemplatesTable } from "./certificate_templates";

export const levelEnum = pgEnum("course_level", [
  "beginner",
  "intermediate",
  "advanced",
]);

export interface FinalExamQuestion {
  question: string;
  options: string[];
  answer: number;
}

export interface FinalExam {
  passingScore: number; // out of 100
  questions: FinalExamQuestion[];
}

export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  description: text("description").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  language: text("language").notNull().default("fr"),
  tags: json("tags").$type<string[]>().notNull().default([]),
  learningObjectives: json("learning_objectives").$type<string[]>().notNull().default([]),
  requirements: json("requirements").$type<string[]>().notNull().default([]),
  targetAudience: json("target_audience").$type<string[]>().notNull().default([]),
  coachId: integer("coach_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  isPublished: boolean("is_published").notNull().default(false),
  durationHours: real("duration_hours"),
  level: levelEnum("level").notNull().default("beginner"),
  isFree: boolean("is_free").notNull().default(true),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("DZD"),
  certificateTemplateId: integer("certificate_template_id")
    .references(() => certificateTemplatesTable.id, { onDelete: "set null" }),
  finalExam: json("final_exam").$type<FinalExam | null>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertCourseSchema = createInsertSchema(coursesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof coursesTable.$inferSelect;
