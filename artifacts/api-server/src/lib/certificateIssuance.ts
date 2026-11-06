import { db, certificatesTable, coursesTable, usersTable, certificateTemplatesTable } from "@workspace/db";
import type { CertificateTemplateSnapshot } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const FALLBACK_TEMPLATE: CertificateTemplateSnapshot = {
  primaryColor: "#1e293b",
  accentColor: "#1e293b",
  logoUrl: null,
  customTitleText: "",
  signatureTitle: "",
  fontFamily: "serif",
};

function toSnapshot(t: typeof certificateTemplatesTable.$inferSelect): CertificateTemplateSnapshot {
  return {
    primaryColor: t.primaryColor,
    accentColor: t.accentColor,
    logoUrl: t.logoUrl,
    customTitleText: t.customTitleText ?? "",
    signatureTitle: t.signatureTitle ?? "",
    fontFamily: t.fontFamily ?? "serif",
  };
}

async function resolveTemplate(certificateTemplateId: number | null) {
  if (certificateTemplateId) {
    const [t] = await db.select().from(certificateTemplatesTable)
      .where(and(eq(certificateTemplatesTable.id, certificateTemplateId), eq(certificateTemplatesTable.isActive, true)));
    if (t) return { id: t.id, snapshot: toSnapshot(t) };
  }
  const [def] = await db.select().from(certificateTemplatesTable)
    .where(and(eq(certificateTemplatesTable.isDefault, true), eq(certificateTemplatesTable.isActive, true)));
  if (def) return { id: def.id, snapshot: toSnapshot(def) };
  return { id: null as number | null, snapshot: FALLBACK_TEMPLATE };
}

// Shared by both issuance paths (legacy no-exam completion, and exam-gated
// completion): idempotent — returns the existing certificate if one was
// already issued for this user+course, rather than creating a duplicate.
export async function issueCertificate(userId: number, courseId: number, examScore: number | null) {
  const [existing] = await db.select().from(certificatesTable)
    .where(and(eq(certificatesTable.userId, userId), eq(certificatesTable.courseId, courseId)));
  if (existing) return existing;

  const [student] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId));
  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId));
  if (!course) throw new Error("Course not found");
  const [coach] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, course.coachId));

  const { id: templateId, snapshot } = await resolveTemplate(course.certificateTemplateId);
  const code = `ST-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

  const [cert] = await db.insert(certificatesTable).values({
    userId, courseId, certificateCode: code,
    studentName: student?.name ?? "", courseName: course.title, coachName: coach?.name ?? "",
    examScore, templateId, templateSnapshot: snapshot,
  }).returning();
  return cert;
}

export async function buildCertificateResponse(cert: typeof certificatesTable.$inferSelect) {
  // Snapshot fields are populated for every certificate issued through issueCertificate();
  // fall back to a live join only for certificates issued before these columns existed.
  let studentName = cert.studentName;
  let courseName = cert.courseName;
  let coachName = cert.coachName;
  let template = cert.templateSnapshot;

  if (!studentName || !courseName) {
    const [student] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, cert.userId));
    studentName = student?.name ?? "";
    if (cert.courseId) {
      const [course] = await db.select({ title: coursesTable.title, coachId: coursesTable.coachId }).from(coursesTable).where(eq(coursesTable.id, cert.courseId));
      courseName = course?.title ?? "";
      if (course?.coachId) {
        const [coach] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, course.coachId));
        coachName = coach?.name ?? "";
      }
    } else {
      courseName = courseName ?? "";
      coachName = coachName ?? "";
    }
  }

  return {
    id: cert.id, userId: cert.userId, courseId: cert.courseId,
    certificateCode: cert.certificateCode, issuedAt: cert.issuedAt.toISOString(),
    studentName: studentName ?? "", courseName: courseName ?? "", coachName: coachName ?? "",
    examScore: cert.examScore, template: template ?? FALLBACK_TEMPLATE,
  };
}
