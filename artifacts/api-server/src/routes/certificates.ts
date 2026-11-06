import { Router } from "express";
import { db, certificatesTable, coursesTable, lessonsTable, progressTable, enrollmentsTable, certificateTemplatesTable } from "@workspace/db";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { requireAuth, AuthenticatedRequest } from "../middlewares/auth";
import { issueCertificate, buildCertificateResponse } from "../lib/certificateIssuance";

const router = Router();

// Coaches pick from this list when configuring a course's certification (see CourseFormPage).
router.get("/certificate-templates", requireAuth, async (_req, res): Promise<void> => {
  const templates = await db.select().from(certificateTemplatesTable)
    .where(eq(certificateTemplatesTable.isActive, true))
    .orderBy(desc(certificateTemplatesTable.isDefault), asc(certificateTemplatesTable.id));
  res.json(templates);
});

router.get("/certificates/my", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const certs = await db.select().from(certificatesTable).where(eq(certificatesTable.userId, req.user!.id)).orderBy(sql`${certificatesTable.issuedAt} desc`);
  res.json(await Promise.all(certs.map(buildCertificateResponse)));
});

// Legacy manual issuance path — only for courses with no final exam configured.
// Courses with a final exam issue their certificate automatically from
// POST /courses/:id/exam/submit once the student passes.
router.post("/certificates/generate", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user!.id;
  const { courseId } = req.body as { courseId?: number };
  if (!courseId) { res.status(400).json({ error: "courseId requis" }); return; }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId));
  if (!course) { res.status(404).json({ error: "Cours introuvable" }); return; }
  if (course.finalExam) { res.status(400).json({ error: "Cette formation nécessite de réussir l'examen final pour obtenir le certificat" }); return; }

  // RBAC: verify the student is enrolled in this course
  const [enrollment] = await db.select({ id: enrollmentsTable.id }).from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, courseId)));
  if (!enrollment) { res.status(403).json({ error: "Non inscrit à ce cours" }); return; }

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(lessonsTable).where(eq(lessonsTable.courseId, courseId));
  const [{ completed }] = await db
    .select({ completed: sql<number>`count(*)::int` })
    .from(progressTable)
    .innerJoin(lessonsTable, eq(progressTable.lessonId, lessonsTable.id))
    .where(and(eq(progressTable.userId, userId), eq(lessonsTable.courseId, courseId)));

  if (!total || completed < total) {
    res.status(400).json({ error: "Complétez toutes les leçons d'abord" });
    return;
  }

  const cert = await issueCertificate(userId, courseId, null);
  res.status(201).json(await buildCertificateResponse(cert));
});

router.get("/certificates/:code", async (req, res): Promise<void> => {
  const code = String(req.params.code);
  const [cert] = await db.select().from(certificatesTable).where(eq(certificatesTable.certificateCode, code));
  if (!cert) { res.status(404).json({ error: "Certificat non trouvé" }); return; }
  res.json(await buildCertificateResponse(cert));
});

export default router;
