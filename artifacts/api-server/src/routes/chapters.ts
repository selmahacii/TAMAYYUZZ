import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, chaptersTable, lessonsTable, coursesTable, auditLogsTable } from "@workspace/db";
import {
  GetCourseChaptersParams,
  CreateChapterParams,
  CreateChapterBody,
  UpdateChapterParams,
  UpdateChapterBody,
  DeleteChapterParams,
  AssignLessonChapterParams,
  AssignLessonChapterBody,
} from "@workspace/api-zod";
import { requireRole, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

// Get chapters for a course (public - lessons organized by chapter)
router.get("/courses/:id/chapters", async (req, res): Promise<void> => {
  const params = GetCourseChaptersParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid course ID" }); return; }
  const courseId = params.data.id;

  const chapters = await db
    .select()
    .from(chaptersTable)
    .where(eq(chaptersTable.courseId, courseId))
    .orderBy(asc(chaptersTable.order));

  const lessons = await db
    .select()
    .from(lessonsTable)
    .where(eq(lessonsTable.courseId, courseId))
    .orderBy(asc(lessonsTable.order));

  const result = chapters.map((ch) => ({
    ...ch,
    lessons: lessons.filter((l) => l.chapterId === ch.id),
  }));

  // Also include lessons without chapter
  const uncategorized = lessons.filter((l) => !l.chapterId);
  if (uncategorized.length > 0) {
    result.push({
      id: 0,
      courseId,
      title: "Sans chapitre",
      description: null,
      order: 999,
      createdAt: new Date(),
      lessons: uncategorized,
    } as any);
  }

  res.json(result);
});

// Create chapter (coach only, must own the course)
router.post("/courses/:id/chapters", requireRole("coach"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = CreateChapterParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid course ID" }); return; }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, params.data.id));
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  if (course.coachId !== req.user?.id) { res.status(403).json({ error: "Not your course" }); return; }

  const parsed = CreateChapterBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [chapter] = await db.insert(chaptersTable).values({
    courseId: params.data.id,
    title: parsed.data.title.trim(),
    description: parsed.data.description ?? null,
    order: parsed.data.order ?? 1,
  }).returning();

  try {
    await db.insert(auditLogsTable).values({
      userId: req.user!.id,
      action: "CREATE_CHAPTER",
      entity: "chapter",
      entityId: chapter.id,
      details: { courseId: params.data.id, title: chapter.title },
      ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    });
  } catch (e) {
    console.error("Audit log error on chapter create:", e);
  }

  res.status(201).json(chapter);
});

// Update chapter
router.put("/courses/:id/chapters/:chapterId", requireRole("coach"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = UpdateChapterParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, params.data.id));
  if (!course || course.coachId !== req.user?.id) { res.status(403).json({ error: "Not authorized" }); return; }

  const parsed = UpdateChapterBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description ?? null;
  if (parsed.data.order !== undefined) updateData.order = parsed.data.order;

  const [updated] = await db.update(chaptersTable)
    .set(updateData)
    .where(and(eq(chaptersTable.id, params.data.chapterId), eq(chaptersTable.courseId, params.data.id)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Chapter not found" }); return; }

  try {
    await db.insert(auditLogsTable).values({
      userId: req.user!.id,
      action: "UPDATE_CHAPTER",
      entity: "chapter",
      entityId: updated.id,
      details: { courseId: params.data.id, title: updated.title },
      ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    });
  } catch (e) {
    console.error("Audit log error on chapter update:", e);
  }

  res.json(updated);
});

// Delete chapter
router.delete("/courses/:id/chapters/:chapterId", requireRole("coach"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = DeleteChapterParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, params.data.id));
  if (!course || course.coachId !== req.user?.id) { res.status(403).json({ error: "Not authorized" }); return; }

  // Unlink lessons from this chapter
  await db.update(lessonsTable).set({ chapterId: null }).where(and(eq(lessonsTable.courseId, params.data.id), eq(lessonsTable.chapterId, params.data.chapterId)));
  await db.delete(chaptersTable).where(and(eq(chaptersTable.id, params.data.chapterId), eq(chaptersTable.courseId, params.data.id)));

  try {
    await db.insert(auditLogsTable).values({
      userId: req.user!.id,
      action: "DELETE_CHAPTER",
      entity: "chapter",
      entityId: params.data.chapterId,
      details: { courseId: params.data.id },
      ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    });
  } catch (e) {
    console.error("Audit log error on chapter delete:", e);
  }

  res.json({ message: "Chapter deleted" });
});

// Assign lesson to chapter
router.patch("/courses/:id/lessons/:lessonId/chapter", requireRole("coach"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = AssignLessonChapterParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, params.data.id));
  if (!course || course.coachId !== req.user?.id) { res.status(403).json({ error: "Not authorized" }); return; }

  const parsed = AssignLessonChapterBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [updated] = await db.update(lessonsTable)
    .set({ chapterId: parsed.data.chapterId ?? null })
    .where(and(eq(lessonsTable.id, params.data.lessonId), eq(lessonsTable.courseId, params.data.id)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Lesson not found" }); return; }
  res.json(updated);
});

export default router;
