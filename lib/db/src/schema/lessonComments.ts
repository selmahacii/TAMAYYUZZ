import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { lessonsTable } from "./lessons";

export const lessonCommentsTable = pgTable(
  "lesson_comments",
  {
    id: serial("id").primaryKey(),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => lessonsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    parentId: integer("parent_id"), // Self-referencing reply
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const insertLessonCommentSchema = createInsertSchema(lessonCommentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLessonComment = z.infer<typeof insertLessonCommentSchema>;
export type LessonComment = typeof lessonCommentsTable.$inferSelect;
