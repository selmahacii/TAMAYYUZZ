import { Router, type IRouter } from "express";
import { eq, and, count, inArray } from "drizzle-orm";
import { db, enrollmentsTable, coursesTable, usersTable } from "@workspace/db";
import { EnrollCourseBody } from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { formatCourse } from "./courses";

const router: IRouter = Router();

router.get("/enrollments", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userEnrollments = await db
    .select({
      enrollment: enrollmentsTable,
      course: coursesTable,
      coach: usersTable,
    })
    .from(enrollmentsTable)
    .innerJoin(coursesTable, eq(enrollmentsTable.courseId, coursesTable.id))
    .innerJoin(usersTable, eq(coursesTable.coachId, usersTable.id))
    .where(eq(enrollmentsTable.userId, req.user.id));

  const courseIds = userEnrollments.map((e) => e.enrollment.courseId);

  const enrollmentCounts =
    courseIds.length > 0
      ? await db
          .select({ courseId: enrollmentsTable.courseId, cnt: count() })
          .from(enrollmentsTable)
          .where(inArray(enrollmentsTable.courseId, courseIds))
          .groupBy(enrollmentsTable.courseId)
      : [];

  const countMap = new Map(enrollmentCounts.map((r) => [r.courseId, r.cnt]));

  res.json(
    userEnrollments.map(({ enrollment, course, coach }) => ({
      id: enrollment.id,
      courseId: enrollment.courseId,
      userId: enrollment.userId,
      enrolledAt: enrollment.enrolledAt.toISOString(),
      course: formatCourse(course, coach.name, countMap.get(enrollment.courseId) ?? 0),
    }))
  );
});

router.post("/enrollments", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = EnrollCourseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { courseId } = parsed.data;

  const [existing] = await db
    .select({ id: enrollmentsTable.id })
    .from(enrollmentsTable)
    .where(
      and(
        eq(enrollmentsTable.userId, req.user.id),
        eq(enrollmentsTable.courseId, courseId)
      )
    );

  if (existing) {
    res.status(400).json({ error: "Already enrolled in this course" });
    return;
  }

  const [course] = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.id, courseId));

  if (!course || !course.isPublished) {
    res.status(404).json({ error: "Course not found or not available" });
    return;
  }

  const [enrollment] = await db
    .insert(enrollmentsTable)
    .values({ userId: req.user.id, courseId })
    .returning();

  const [coach] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, course.coachId));

  const [countRow] = await db
    .select({ cnt: count() })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.courseId, courseId));

  res.status(201).json({
    id: enrollment.id,
    courseId: enrollment.courseId,
    userId: enrollment.userId,
    enrolledAt: enrollment.enrolledAt.toISOString(),
    course: formatCourse(course, coach.name, countRow?.cnt ?? 1),
  });
});

export default router;
