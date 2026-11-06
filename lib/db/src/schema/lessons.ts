import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  pgEnum,
  json,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { coursesTable } from "./courses";
import { chaptersTable } from "./chapters";

export const lessonTypeEnum = pgEnum("lesson_type", [
  "text",
  "video",
  "pdf",
  "quiz",
]);

export const lessonsTable = pgTable("lessons", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .notNull()
    .references(() => coursesTable.id, { onDelete: "cascade" }),
  chapterId: integer("chapter_id").references(() => chaptersTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(1),
  durationMinutes: integer("duration_minutes"),
  type: lessonTypeEnum("type").notNull().default("text"),
  videoUrl: text("video_url"),
  pdfUrl: text("pdf_url"),
  quizData: json("quiz_data"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertLessonSchema = createInsertSchema(lessonsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessonsTable.$inferSelect;
