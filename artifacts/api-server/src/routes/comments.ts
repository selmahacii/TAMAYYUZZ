import { Router, type IRouter } from "express";
import { eq, desc, asc, and } from "drizzle-orm";
import { db, lessonCommentsTable, lessonsTable, coursesTable, usersTable, enrollmentsTable, auditLogsTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { createNotification } from "./notifications";

const router: IRouter = Router();

// GET /api/lessons/:id/comments - Retrieve Q&A discussions for a lesson
router.get("/lessons/:id/comments", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const lessonId = parseInt(String(req.params.id));
  if (isNaN(lessonId)) {
    res.status(400).json({ error: "Invalid lesson ID" });
    return;
  }

  // Get comments with user metadata
  const rows = await db
    .select({
      id: lessonCommentsTable.id,
      lessonId: lessonCommentsTable.lessonId,
      userId: lessonCommentsTable.userId,
      parentId: lessonCommentsTable.parentId,
      content: lessonCommentsTable.content,
      createdAt: lessonCommentsTable.createdAt,
      userName: usersTable.name,
      userAvatar: usersTable.avatarUrl,
      userRole: usersTable.role,
    })
    .from(lessonCommentsTable)
    .innerJoin(usersTable, eq(lessonCommentsTable.userId, usersTable.id))
    .where(eq(lessonCommentsTable.lessonId, lessonId))
    .orderBy(asc(lessonCommentsTable.createdAt));

  // Organize into threaded structure (parents with replies array)
  const commentMap = new Map<number, any>();
  const rootComments: any[] = [];

  for (const row of rows) {
    const item = {
      ...row,
      createdAt: row.createdAt.toISOString(),
      replies: [],
    };
    commentMap.set(row.id, item);
  }

  for (const row of rows) {
    const item = commentMap.get(row.id);
    if (row.parentId && commentMap.has(row.parentId)) {
      commentMap.get(row.parentId).replies.push(item);
    } else {
      rootComments.push(item);
    }
  }

  // Newest root comments first
  rootComments.reverse();

  res.json({
    comments: rootComments,
    totalCount: rows.length,
  });
});

// POST /api/lessons/:id/comments - Post a question or a reply
router.post("/lessons/:id/comments", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user!.id;
  const lessonId = parseInt(String(req.params.id));
  if (isNaN(lessonId)) {
    res.status(400).json({ error: "Invalid lesson ID" });
    return;
  }

  const { content, parentId } = req.body as { content?: string; parentId?: number };
  if (!content || typeof content !== "string" || content.trim().length < 2) {
    res.status(400).json({ error: "Le message ne peut pas être vide" });
    return;
  }

  // Verify lesson exists and get course details
  const [lesson] = await db
    .select({
      id: lessonsTable.id,
      title: lessonsTable.title,
      courseId: lessonsTable.courseId,
    })
    .from(lessonsTable)
    .where(eq(lessonsTable.id, lessonId));

  if (!lesson) {
    res.status(404).json({ error: "Leçon introuvable" });
    return;
  }

  const [course] = await db
    .select({
      id: coursesTable.id,
      title: coursesTable.title,
      coachId: coursesTable.coachId,
    })
    .from(coursesTable)
    .where(eq(coursesTable.id, lesson.courseId));

  // Check enrollment unless coach/admin
  const isCoachOrAdmin = req.user!.role === "admin" || (course && course.coachId === userId);
  if (!isCoachOrAdmin) {
    const [enrollment] = await db
      .select()
      .from(enrollmentsTable)
      .where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, lesson.courseId)));

    if (!enrollment) {
      res.status(403).json({ error: "Vous devez être inscrit pour participer à la discussion" });
      return;
    }
  }

  const [comment] = await db
    .insert(lessonCommentsTable)
    .values({
      lessonId,
      userId,
      parentId: parentId ? Number(parentId) : null,
      content: content.trim(),
    })
    .returning();

  try {
    await db.insert(auditLogsTable).values({
      userId,
      action: parentId ? "REPLY_COMMENT" : "POST_COMMENT",
      entity: "lesson_comment",
      entityId: comment.id,
      details: { lessonId, courseId: lesson.courseId, parentId },
      ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    });
  } catch (e) {
    console.error("Audit log error on comment:", e);
  }

  // Send notifications
  if (parentId) {
    // Reply: notify the original poster
    const [parent] = await db
      .select({ userId: lessonCommentsTable.userId })
      .from(lessonCommentsTable)
      .where(eq(lessonCommentsTable.id, parentId));

    if (parent && parent.userId !== userId) {
      await createNotification({
        userId: parent.userId,
        title: "Nouvelle réponse à votre question",
        message: `${req.user!.name} a répondu à votre commentaire sur la leçon "${lesson.title}".`,
        type: "info",
        link: `/student/learn/${lesson.courseId}?lessonId=${lesson.id}`,
      });
    }
  } else {
    // New Question: notify coach if poster is not the coach
    if (course && course.coachId && course.coachId !== userId) {
      await createNotification({
        userId: course.coachId,
        title: "Nouvelle question d'un étudiant !",
        message: `${req.user!.name} a posé une question sur la leçon "${lesson.title}" (${course.title}).`,
        type: "info",
        link: `/student/learn/${lesson.courseId}?lessonId=${lesson.id}`,
      });
    }
  }

  res.status(201).json({
    ...comment,
    userName: req.user!.name,
    userRole: req.user!.role,
    userAvatar: req.user!.avatarUrl,
    createdAt: comment.createdAt.toISOString(),
    replies: [],
  });
});

export default router;
