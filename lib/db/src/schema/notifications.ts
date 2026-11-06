import { pgTable, serial, timestamp, integer, text, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const inAppNotificationsTable = pgTable("in_app_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // "info" | "success" | "warning" | "error"
  link: text("link"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InAppNotification = typeof inAppNotificationsTable.$inferSelect;
