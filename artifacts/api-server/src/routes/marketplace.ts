import { Router } from "express";
import { eq, and, like, sql, count, gte, lte } from "drizzle-orm";
import { db, coursesTable, usersTable, enrollmentsTable, lessonsTable, purchasesTable, chaptersTable } from "@workspace/db";
import { formatCourse } from "./courses";
import { JWT_SECRET } from "../middlewares/auth";

const router = Router();

async function getAuthUserId(authHeader: string | undefined): Promise<number | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const jwt = await import("jsonwebtoken");
    const payload = jwt.verify(token, JWT_SECRET) as unknown as { sub: number };
    return payload.sub;
  } catch {
    return null;
  }
}

router.get("/marketplace", async (req, res): Promise<void> => {
  const { search, category, level, isFree, minPrice, maxPrice, sortBy } = req.query as Record<string, string>;

  const conditions = [eq(coursesTable.isPublished, true)];
  if (search) conditions.push(like(coursesTable.title, `%${search}%`));
  if (category) conditions.push(eq(coursesTable.category, category));
  if (level && ["beginner", "intermediate", "advanced"].includes(level)) {
    conditions.push(eq(coursesTable.level, level as "beginner" | "intermediate" | "advanced"));
  }
  if (isFree === "true") conditions.push(eq(coursesTable.isFree, true));
  if (isFree === "false") conditions.push(eq(coursesTable.isFree, false));
  if (minPrice) conditions.push(gte(coursesTable.price, minPrice));
  if (maxPrice) conditions.push(lte(coursesTable.price, maxPrice));

  let orderBy = coursesTable.createdAt;
  let orderDir: "asc" | "desc" = "desc";
  if (sortBy === "popular") { orderDir = "desc"; }
  else if (sortBy === "price_asc") { orderDir = "asc"; }
  else if (sortBy === "price_desc") { orderDir = "desc"; }

  const courses = await db
    .select({
      course: coursesTable,
      coach: usersTable,
      enrollmentCount: count(enrollmentsTable.id),
    })
    .from(coursesTable)
    .innerJoin(usersTable, eq(coursesTable.coachId, usersTable.id))
    .leftJoin(enrollmentsTable, eq(coursesTable.id, enrollmentsTable.courseId))
    .where(and(...conditions))
    .groupBy(coursesTable.id, usersTable.id)
    .orderBy(orderDir === "desc" ? sql`${orderBy} desc` : sql`${orderBy} asc`);

  const userId = await getAuthUserId(req.headers.authorization);

  const withMeta = await Promise.all(
    courses.map(async ({ course, coach, enrollmentCount }) => {
      const [{ lessonCount }] = await db
        .select({ lessonCount: count(lessonsTable.id) })
        .from(lessonsTable)
        .where(eq(lessonsTable.courseId, course.id));

      let isEnrolled = false;
      let isPurchased = false;
      if (userId) {
        const [enroll] = await db
          .select({ id: enrollmentsTable.id })
          .from(enrollmentsTable)
          .where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, course.id)));
        isEnrolled = !!enroll;
        const [purchase] = await db
          .select({ id: purchasesTable.id })
          .from(purchasesTable)
          .where(and(eq(purchasesTable.userId, userId), eq(purchasesTable.courseId, course.id)));
        isPurchased = !!purchase;
      }

      return {
        ...formatCourse(course, coach.name, enrollmentCount),
        isEnrolled,
        isPurchased,
        lessonCount: lessonCount ?? 0,
      };
    })
  );

  res.json(withMeta);
});

router.get("/marketplace/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [row] = await db
    .select({
      course: coursesTable,
      coach: usersTable,
      enrollmentCount: count(enrollmentsTable.id),
    })
    .from(coursesTable)
    .innerJoin(usersTable, eq(coursesTable.coachId, usersTable.id))
    .leftJoin(enrollmentsTable, eq(coursesTable.id, enrollmentsTable.courseId))
    .where(and(eq(coursesTable.id, id), eq(coursesTable.isPublished, true)))
    .groupBy(coursesTable.id, usersTable.id);

  if (!row) { res.status(404).json({ error: "Course not found" }); return; }

  // Order by the lesson's chapter position first (chapterless lessons sort last),
  // then by the lesson's own order within that chapter — a flat "order by lessons.order"
  // alone breaks whenever chapters each restart their lesson numbering at 1.
  const lessons = await db
    .select({ lesson: lessonsTable })
    .from(lessonsTable)
    .leftJoin(chaptersTable, eq(lessonsTable.chapterId, chaptersTable.id))
    .where(eq(lessonsTable.courseId, id))
    .orderBy(sql`coalesce(${chaptersTable.order}, 2147483647)`, lessonsTable.order)
    .then((rows) => rows.map((r) => r.lesson));

  const userId = await getAuthUserId(req.headers.authorization);
  let isEnrolled = false;
  let isPurchased = false;
  if (userId) {
    const [enroll] = await db
      .select({ id: enrollmentsTable.id })
      .from(enrollmentsTable)
      .where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, id)));
    isEnrolled = !!enroll;
    const [purchase] = await db
      .select({ id: purchasesTable.id })
      .from(purchasesTable)
      .where(and(eq(purchasesTable.userId, userId), eq(purchasesTable.courseId, id)));
    isPurchased = !!purchase;
  }

  res.json({
    ...formatCourse(row.course, row.coach.name, row.enrollmentCount),
    lessons: lessons.map((l) => ({
      id: l.id,
      courseId: l.courseId,
      title: l.title,
      description: l.description ?? null,
      order: l.order,
      durationMinutes: l.durationMinutes ?? null,
      type: l.type,
      videoUrl: l.videoUrl ?? null,
      pdfUrl: l.pdfUrl ?? null,
      quizData: l.quizData ?? null,
    })),
    isEnrolled,
    isPurchased,
    lessonCount: lessons.length,
  });
});

export default router;
