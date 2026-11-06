import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, lessonsTable, coursesTable } from "@workspace/db";
import {
  GetCourseLessonsParams,
  CreateLessonParams,
  CreateLessonBody,
  UpdateLessonParams,
  UpdateLessonBody,
  DeleteLessonParams,
} from "@workspace/api-zod";
import { requireRole, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

function formatLesson(l: typeof lessonsTable.$inferSelect) {
  return {
    id: l.id,
    courseId: l.courseId,
    chapterId: l.chapterId ?? null,
    title: l.title,
    description: l.description ?? null,
    order: l.order,
    durationMinutes: l.durationMinutes ?? null,
    type: l.type,
    videoUrl: l.videoUrl ?? null,
    pdfUrl: l.pdfUrl ?? null,
    quizData: l.quizData ?? null,
  };
}

router.get("/courses/:id/lessons", async (req, res): Promise<void> => {
  const params = GetCourseLessonsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid course ID" }); return; }

  const lessons = await db
    .select()
    .from(lessonsTable)
    .where(eq(lessonsTable.courseId, params.data.id))
    .orderBy(lessonsTable.order);

  res.json(lessons.map(formatLesson));
});

router.post("/courses/:id/lessons", requireRole("coach"), async (req: AuthenticatedRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = CreateLessonParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid course ID" }); return; }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, params.data.id));
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  if (course.coachId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }

  const parsed = CreateLessonBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const existingLessons = await db
    .select({ order: lessonsTable.order })
    .from(lessonsTable)
    .where(eq(lessonsTable.courseId, params.data.id));

  const nextOrder = parsed.data.order ?? existingLessons.length + 1;

  const [lesson] = await db
    .insert(lessonsTable)
    .values({
      courseId: params.data.id,
      chapterId: (parsed.data as { chapterId?: number | null }).chapterId ?? null,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      order: nextOrder,
      durationMinutes: parsed.data.durationMinutes ?? null,
      type: (parsed.data.type as "text" | "video" | "pdf" | "quiz" | undefined) ?? "text",
      videoUrl: (parsed.data as { videoUrl?: string | null }).videoUrl ?? null,
      pdfUrl: (parsed.data as { pdfUrl?: string | null }).pdfUrl ?? null,
      quizData: (parsed.data as { quizData?: unknown }).quizData ?? null,
    })
    .returning();

  res.status(201).json(formatLesson(lesson));
});

router.patch("/courses/:id/lessons/:lessonId", requireRole("coach"), async (req: AuthenticatedRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = UpdateLessonParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, params.data.id));
  if (!course || course.coachId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }

  const [existingLesson] = await db
    .select()
    .from(lessonsTable)
    .where(and(eq(lessonsTable.id, params.data.lessonId), eq(lessonsTable.courseId, params.data.id)));

  if (!existingLesson) { res.status(404).json({ error: "Lesson not found" }); return; }

  const parsed = UpdateLessonBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description ?? null;
  const chapterBody = parsed.data as { chapterId?: number | null };
  if (chapterBody.chapterId !== undefined) updateData.chapterId = chapterBody.chapterId ?? null;
  if (parsed.data.order !== undefined) updateData.order = parsed.data.order;
  if (parsed.data.durationMinutes !== undefined) updateData.durationMinutes = parsed.data.durationMinutes ?? null;
  if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
  const body = parsed.data as { videoUrl?: string | null; pdfUrl?: string | null; quizData?: unknown };
  if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl ?? null;
  if (body.pdfUrl !== undefined) updateData.pdfUrl = body.pdfUrl ?? null;
  if (body.quizData !== undefined) updateData.quizData = body.quizData ?? null;

  const [updated] = await db
    .update(lessonsTable)
    .set(updateData)
    .where(eq(lessonsTable.id, params.data.lessonId))
    .returning();

  res.json(formatLesson(updated));
});

router.delete("/courses/:id/lessons/:lessonId", requireRole("coach"), async (req: AuthenticatedRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = DeleteLessonParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, params.data.id));
  if (!course || course.coachId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(lessonsTable).where(and(eq(lessonsTable.id, params.data.lessonId), eq(lessonsTable.courseId, params.data.id)));
  res.json({ message: "Lesson deleted" });
});

export default router;
