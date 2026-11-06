import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, courseReviewsTable, coursesTable, usersTable, enrollmentsTable, auditLogsTable } from "@workspace/db";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middlewares/auth";
import { createNotification } from "./notifications";

const router: IRouter = Router();

// Recalculate and update course average rating and review count
async function updateCourseRating(courseId: number) {
  const [stats] = await db
    .select({
      avgRating: sql<string>`coalesce(avg(rating), 0)::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(courseReviewsTable)
    .where(eq(courseReviewsTable.courseId, courseId));

  const ratingFloat = parseFloat(stats?.avgRating ?? "0");
  const roundedRating = (Math.round(ratingFloat * 10) / 10).toFixed(1);
  const reviewCount = stats?.count ?? 0;

  await db
    .update(coursesTable)
    .set({
      rating: roundedRating,
      reviewCount,
    })
    .where(eq(coursesTable.id, courseId));

  return { rating: roundedRating, reviewCount };
}

// GET /api/courses/:id/reviews - Public list of reviews with user metadata
router.get("/courses/:id/reviews", async (req, res): Promise<void> => {
  const courseId = parseInt(String(req.params.id));
  if (isNaN(courseId)) {
    res.status(400).json({ error: "Invalid course ID" });
    return;
  }

  const reviews = await db
    .select({
      id: courseReviewsTable.id,
      courseId: courseReviewsTable.courseId,
      userId: courseReviewsTable.userId,
      rating: courseReviewsTable.rating,
      comment: courseReviewsTable.comment,
      createdAt: courseReviewsTable.createdAt,
      userName: usersTable.name,
      userAvatar: usersTable.avatarUrl,
      userRole: usersTable.role,
    })
    .from(courseReviewsTable)
    .innerJoin(usersTable, eq(courseReviewsTable.userId, usersTable.id))
    .where(eq(courseReviewsTable.courseId, courseId))
    .orderBy(desc(courseReviewsTable.createdAt));

  // Compute rating distribution (5, 4, 3, 2, 1 stars)
  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of reviews) {
    if (distribution[r.rating] !== undefined) {
      distribution[r.rating]++;
    }
  }

  res.json({
    reviews: reviews.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
    total: reviews.length,
    distribution,
  });
});

// POST /api/courses/:id/reviews - Authenticated student posts or updates a review
router.post("/courses/:id/reviews", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user!.id;
  const courseId = parseInt(String(req.params.id));
  if (isNaN(courseId)) {
    res.status(400).json({ error: "Invalid course ID" });
    return;
  }

  const { rating, comment } = req.body as { rating?: number; comment?: string };
  if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
    res.status(400).json({ error: "La note doit être un entier entre 1 et 5 étoiles" });
    return;
  }
  if (!comment || typeof comment !== "string" || comment.trim().length < 5) {
    res.status(400).json({ error: "Le commentaire doit contenir au moins 5 caractères" });
    return;
  }

  // Verify course exists
  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId));
  if (!course) {
    res.status(404).json({ error: "Formation introuvable" });
    return;
  }

  // Verify user is enrolled (RBAC: only students who bought or enrolled can review)
  const [enrollment] = await db
    .select()
    .from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, courseId)));

  if (!enrollment && req.user!.role !== "admin") {
    res.status(403).json({ error: "Vous devez être inscrit à cette formation pour laisser un avis" });
    return;
  }

  // Upsert review (one review per user per course)
  const [existing] = await db
    .select()
    .from(courseReviewsTable)
    .where(and(eq(courseReviewsTable.courseId, courseId), eq(courseReviewsTable.userId, userId)));

  let review;
  if (existing) {
    [review] = await db
      .update(courseReviewsTable)
      .set({
        rating,
        comment: comment.trim(),
        updatedAt: new Date(),
      })
      .where(eq(courseReviewsTable.id, existing.id))
      .returning();
  } else {
    [review] = await db
      .insert(courseReviewsTable)
      .values({
        courseId,
        userId,
        rating,
        comment: comment.trim(),
      })
      .returning();
  }

  // Recalculate course rating
  const updatedRating = await updateCourseRating(courseId);

  // Notify coach of the new review
  if (course.coachId && course.coachId !== userId) {
    await createNotification({
      userId: course.coachId,
      title: "Nouvel avis sur votre formation !",
      message: `${req.user!.name} a noté "${course.title}" ${rating}/5 : "${comment.trim().slice(0, 80)}..."`,
      type: "info",
      link: `/marketplace/${course.id}`,
    });
  }

  res.status(201).json({
    review: {
      ...review,
      userName: req.user!.name,
      createdAt: review.createdAt.toISOString(),
    },
    courseRating: updatedRating,
  });
});

// DELETE /api/admin/reviews/:id - Admin moderation
router.delete("/admin/reviews/:id", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [review] = await db.select().from(courseReviewsTable).where(eq(courseReviewsTable.id, id));
  if (!review) {
    res.status(404).json({ error: "Avis introuvable" });
    return;
  }

  await db.delete(courseReviewsTable).where(eq(courseReviewsTable.id, id));
  await updateCourseRating(review.courseId);

  await db.insert(auditLogsTable).values({
    userId: req.user!.id,
    action: "DELETE_REVIEW",
    entity: "review",
    entityId: id,
    details: { courseId: review.courseId, rating: review.rating },
  });

  res.json({ message: "Avis supprimé avec succès" });
});

export default router;
