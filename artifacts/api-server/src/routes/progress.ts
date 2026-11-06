import { Router } from "express";
import { db, progressTable, lessonsTable, enrollmentsTable, chaptersTable } from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { requireAuth, AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

router.get("/progress/course/:courseId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user!.id;
  const courseId = parseInt(String(req.params.courseId));
  if (isNaN(courseId)) { res.status(400).json({ error: "Invalid courseId" }); return; }

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(lessonsTable)
    .where(eq(lessonsTable.courseId, courseId));

  const progressRows = await db
    .select({
      lessonId: progressTable.lessonId,
      isCompleted: progressTable.isCompleted,
      lastPositionSeconds: progressTable.lastPositionSeconds,
    })
    .from(progressTable)
    .innerJoin(lessonsTable, eq(progressTable.lessonId, lessonsTable.id))
    .where(and(eq(progressTable.userId, userId), eq(lessonsTable.courseId, courseId)));

  const completedLessonIds = progressRows
    .filter((r) => r.isCompleted)
    .map((r) => r.lessonId);

  const timestamps: Record<number, number> = {};
  for (const r of progressRows) {
    if (r.lastPositionSeconds > 0) {
      timestamps[r.lessonId] = r.lastPositionSeconds;
    }
  }

  const completedCount = completedLessonIds.length;
  const totalLessons = total ?? 0;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  res.json({
    courseId,
    totalLessons,
    completedLessons: completedCount,
    progressPercent,
    completedLessonIds,
    timestamps,
    isCompleted: totalLessons > 0 && completedCount >= totalLessons,
  });
});

// POST /progress/lesson/:lessonId/timestamp - Save exact seconds watched
router.post("/progress/lesson/:lessonId/timestamp", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user!.id;
  const lessonId = parseInt(String(req.params.lessonId));
  if (isNaN(lessonId)) { res.status(400).json({ error: "Invalid lessonId" }); return; }

  const { seconds } = req.body as { seconds?: number };
  const posSeconds = Math.max(0, Math.floor(Number(seconds) || 0));

  // Verify lesson exists and get courseId
  const [lesson] = await db.select({ courseId: lessonsTable.courseId }).from(lessonsTable).where(eq(lessonsTable.id, lessonId));
  if (!lesson) { res.status(404).json({ error: "Lesson not found" }); return; }

  // Verify enrollment
  const [enrollment] = await db.select({ id: enrollmentsTable.id }).from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, lesson.courseId)));
  if (!enrollment && req.user!.role !== "admin") {
    res.status(403).json({ error: "Not enrolled in this course" });
    return;
  }

  const [existing] = await db
    .select()
    .from(progressTable)
    .where(and(eq(progressTable.userId, userId), eq(progressTable.lessonId, lessonId)));

  if (existing) {
    await db
      .update(progressTable)
      .set({
        lastPositionSeconds: posSeconds,
        updatedAt: new Date(),
      })
      .where(eq(progressTable.id, existing.id));
  } else {
    await db
      .insert(progressTable)
      .values({
        userId,
        lessonId,
        isCompleted: false,
        lastPositionSeconds: posSeconds,
      });
  }

  res.json({ success: true, lessonId, lastPositionSeconds: posSeconds });
});

router.post("/progress/lesson/:lessonId/complete", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user!.id;
  const lessonId = parseInt(String(req.params.lessonId));
  if (isNaN(lessonId)) { res.status(400).json({ error: "Invalid lessonId" }); return; }

  // Verify the lesson exists and get its courseId
  const [lesson] = await db.select({ courseId: lessonsTable.courseId }).from(lessonsTable).where(eq(lessonsTable.id, lessonId));
  if (!lesson) { res.status(404).json({ error: "Lesson not found" }); return; }

  // Verify the student is enrolled in the course (RBAC: students can only complete lessons in their enrolled courses)
  const [enrollment] = await db.select({ id: enrollmentsTable.id }).from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, lesson.courseId)));
  if (!enrollment && req.user!.role !== "admin") { res.status(403).json({ error: "Not enrolled in this course" }); return; }

  // Sequential unlock: a lesson can only be completed once every lesson before it is done
  const orderedLessons = await db
    .select({ id: lessonsTable.id })
    .from(lessonsTable)
    .leftJoin(chaptersTable, eq(lessonsTable.chapterId, chaptersTable.id))
    .where(eq(lessonsTable.courseId, lesson.courseId))
    .orderBy(sql`coalesce(${chaptersTable.order}, 2147483647)`, lessonsTable.order);

  const targetIndex = orderedLessons.findIndex((l) => l.id === lessonId);
  const precedingIds = orderedLessons.slice(0, targetIndex).map((l) => l.id);

  if (precedingIds.length > 0) {
    const completedPreceding = await db
      .select({ lessonId: progressTable.lessonId })
      .from(progressTable)
      .where(and(
        eq(progressTable.userId, userId),
        eq(progressTable.isCompleted, true),
        inArray(progressTable.lessonId, precedingIds)
      ));
    if (completedPreceding.length < precedingIds.length) {
      res.status(400).json({ error: "Veuillez d'abord compléter les leçons précédentes" });
      return;
    }
  }

  const [existing] = await db
    .select()
    .from(progressTable)
    .where(and(eq(progressTable.userId, userId), eq(progressTable.lessonId, lessonId)));

  if (existing) {
    await db
      .update(progressTable)
      .set({
        isCompleted: true,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(progressTable.id, existing.id));
  } else {
    await db.insert(progressTable).values({
      userId,
      lessonId,
      isCompleted: true,
      completedAt: new Date(),
    });
  }

  res.json({ message: "Leçon complétée" });
});

export default router;
