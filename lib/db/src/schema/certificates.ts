import {
  pgTable,
  serial,
  timestamp,
  integer,
  text,
  unique,
  json,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { coursesTable } from "./courses";
import { certificateTemplatesTable } from "./certificate_templates";

export interface CertificateTemplateSnapshot {
  primaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  customTitleText: string;
  signatureTitle: string;
  fontFamily: string;
}

export const certificatesTable = pgTable(
  "certificates",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    // Nullable + "set null": deleting a course must never destroy a student's
    // already-earned proof of achievement. The snapshot fields below are the
    // source of truth for display once issued — courseId is kept only for
    // linking back to the (possibly still-existing) course.
    courseId: integer("course_id")
      .references(() => coursesTable.id, { onDelete: "set null" }),
    certificateCode: text("certificate_code").notNull().unique(),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Snapshot of names at issuance time so later renames/deletions of the
    // student, course or coach never retroactively alter an issued certificate.
    // Nullable for backward compatibility with certificates issued before this
    // column existed — buildCertificate() falls back to a live join for those.
    studentName: text("student_name"),
    courseName: text("course_name"),
    coachName: text("coach_name"),
    examScore: integer("exam_score"),
    templateId: integer("template_id")
      .references(() => certificateTemplatesTable.id, { onDelete: "set null" }),
    templateSnapshot: json("template_snapshot").$type<CertificateTemplateSnapshot | null>(),
  },
  (t) => [unique().on(t.userId, t.courseId)],
);

export const insertCertificateSchema = createInsertSchema(certificatesTable).omit({
  id: true,
  issuedAt: true,
});
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type Certificate = typeof certificatesTable.$inferSelect;
