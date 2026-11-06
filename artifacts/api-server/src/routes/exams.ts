import { Router } from "express";
import { db, coursesTable, enrollmentsTable, lessonsTable, progressTable, examAttemptsTable, auditLogsTable, type FinalExam } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, AuthenticatedRequest } from "../middlewares/auth";
import { issueCertificate, buildCertificateResponse } from "../lib/certificateIssuance";

const router = Router();

type EligibilityResult =
  | { ok: true; finalExam: FinalExam }
  | { ok: false; status: number; message: string };

async function assertEligible(userId: number, courseId: number): Promise<EligibilityResult> {
  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId));
  if (!course || !course.finalExam) return { ok: false, status: 400, message: "Aucun examen configuré pour cette formation" };

  const [enrollment] = await db.select({ id: enrollmentsTable.id }).from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, courseId)));
  if (!enrollment) return { ok: false, status: 403, message: "Non inscrit à ce cours" };

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(lessonsTable).where(eq(lessonsTable.courseId, courseId));
  const [{ completed }] = await db
    .select({ completed: sql<number>`count(*)::int` })
    .from(progressTable)
    .innerJoin(lessonsTable, eq(progressTable.lessonId, lessonsTable.id))
    .where(and(eq(progressTable.userId, userId), eq(lessonsTable.courseId, courseId)));
  if (!total || completed < total) return { ok: false, status: 400, message: "Complétez toutes les leçons avant de passer l'examen" };

  return { ok: true, finalExam: course.finalExam };
}

router.get("/courses/:id/exam", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user!.id;
  const courseId = parseInt(String(req.params.id));
  if (isNaN(courseId)) { res.status(400).json({ error: "Invalid course ID" }); return; }

  const result = await assertEligible(userId, courseId);
  if (!result.ok) { res.status(result.status).json({ error: result.message }); return; }

  const exam = result.finalExam;
  res.json({
    passingScore: exam.passingScore,
    questions: exam.questions.map((q) => ({ question: q.question, options: q.options })),
  });
});

router.post("/courses/:id/exam/submit", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user!.id;
  const courseId = parseInt(String(req.params.id));
  if (isNaN(courseId)) { res.status(400).json({ error: "Invalid course ID" }); return; }

  const result = await assertEligible(userId, courseId);
  if (!result.ok) { res.status(result.status).json({ error: result.message }); return; }

  const exam = result.finalExam;
  const { answers } = req.body as { answers?: number[] };
  if (!Array.isArray(answers) || answers.length !== exam.questions.length) {
    res.status(400).json({ error: "Réponses invalides" });
    return;
  }

  const correctAnswers = exam.questions.map((q) => q.answer);
  const correctCount = exam.questions.reduce((acc, q, i) => acc + (answers[i] === q.answer ? 1 : 0), 0);
  const score = Math.round((correctCount / exam.questions.length) * 100);
  const passed = score >= exam.passingScore;

  await db.insert(examAttemptsTable).values({ userId, courseId, score, passed });

  try {
    await db.insert(auditLogsTable).values({
      userId,
      action: passed ? "EXAM_PASSED" : "EXAM_FAILED",
      entity: "exam_attempt",
      entityId: courseId,
      details: { courseId, score, passed, passingScore: exam.passingScore },
      ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    });
  } catch (e) {
    console.error("Audit log error on exam attempt:", e);
  }

  const certificate = passed ? await buildCertificateResponse(await issueCertificate(userId, courseId, score)) : null;

  res.json({ score, passed, passingScore: exam.passingScore, correctAnswers, certificate });
});

export default router;
