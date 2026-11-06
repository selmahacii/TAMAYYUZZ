import { pgTable, text, serial, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const kbCategoryEnum = pgEnum("kb_category", ["general", "students", "coaches", "billing", "technical"]);

export const knowledgeBaseTable = pgTable("knowledge_base", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").references(() => usersTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: kbCategoryEnum("category").notNull().default("general"),
  isPublished: boolean("is_published").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type KnowledgeBase = typeof knowledgeBaseTable.$inferSelect;
