import { Router, type IRouter } from "express";
import { eq, and, like, sql, count } from "drizzle-orm";
import { db, coursesTable, usersTable, enrollmentsTable, lessonsTable, purchasesTable, chaptersTable, certificateTemplatesTable, auditLogsTable, type FinalExam } from "@workspace/db";
import {
  GetCoursesQueryParams,
  CreateCourseBody,
  GetCourseParams,
  UpdateCourseParams,
  UpdateCourseBody,
  DeleteCourseParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole, JWT_SECRET, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

function formatCourse(course: typeof coursesTable.$inferSelect, coachName: string, enrollmentCount: number) {
  return {
    id: course.id,
    title: course.title,
    subtitle: course.subtitle ?? null,
    description: course.description,
    category: course.category,
    imageUrl: course.imageUrl ?? null,
    coachId: course.coachId,
    coachName,
    isPublished: course.isPublished,
    enrollmentCount,
    durationHours: course.durationHours ?? null,
    level: course.level,
    isFree: course.isFree,
    price: course.price ?? "0",
    currency: course.currency ?? "DZD",
    language: course.language ?? "fr",
    tags: course.tags ?? [],
    learningObjectives: course.learningObjectives ?? [],
    requirements: course.requirements ?? [],
    targetAudience: course.targetAudience ?? [],
    createdAt: course.createdAt.toISOString(),
    certificateTemplateId: course.certificateTemplateId ?? null,
    hasFinalExam: !!course.finalExam,
  };
}

// A course's certification config (template + exam) is authored by the owning coach.
// Validated server-side so a malformed/malicious payload can never silently break
// certificate issuance or leak an unwinnable exam (e.g. answer index out of range).
async function validateCertificationFields(body: { certificateTemplateId?: number | null; finalExam?: FinalExam | null }) {
  if (body.certificateTemplateId != null) {
    const [template] = await db.select({ id: certificateTemplatesTable.id }).from(certificateTemplatesTable)
      .where(and(eq(certificateTemplatesTable.id, body.certificateTemplateId), eq(certificateTemplatesTable.isActive, true)));
    if (!template) return "Modèle de certificat invalide ou inactif";
  }
  if (body.finalExam != null) {
    const { passingScore, questions } = body.finalExam;
    if (typeof passingScore !== "number" || passingScore < 0 || passingScore > 100) return "Le seuil de réussite doit être entre 0 et 100";
    if (!Array.isArray(questions) || questions.length === 0) return "L'examen doit contenir au moins une question";
    for (const q of questions) {
      if (!q.question?.trim()) return "Chaque question doit avoir un texte";
      if (!Array.isArray(q.options) || q.options.filter((o) => o?.trim()).length < 2) return "Chaque question nécessite au moins 2 options";
      if (typeof q.answer !== "number" || q.answer < 0 || q.answer >= q.options.length) return "Réponse correcte invalide";
    }
  }
  return null;
}

router.get("/courses", async (req, res): Promise<void> => {
  const params = GetCoursesQueryParams.safeParse(req.query);
  const search = params.success ? params.data.search : undefined;
  const category = params.success ? params.data.category : undefined;

  const conditions = [eq(coursesTable.isPublished, true)];
  if (search) conditions.push(like(coursesTable.title, `%${search}%`));
  if (category) conditions.push(eq(coursesTable.category, category));

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
    .orderBy(coursesTable.createdAt);

  res.json(courses.map(({ course, coach, enrollmentCount }) =>
    formatCourse(course, coach.name, enrollmentCount)
  ));
});

router.post("/courses", requireRole("coach"), async (req: AuthenticatedRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!req.user.isApproved) { res.status(403).json({ error: "Your coach account is pending approval" }); return; }

  const parsed = CreateCourseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const validationError = await validateCertificationFields(parsed.data);
  if (validationError) { res.status(400).json({ error: validationError }); return; }

  const [course] = await db
    .insert(coursesTable)
    .values({ ...parsed.data, coachId: req.user.id })
    .returning();

  try {
    await db.insert(auditLogsTable).values({
      userId: req.user.id,
      action: "CREATE_COURSE",
      entity: "course",
      entityId: course.id,
      details: { title: course.title, category: course.category, price: course.price },
      ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    });
  } catch (e) {
    console.error("Audit log error on course create:", e);
  }

  const [coach] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id));
  res.status(201).json(formatCourse(course, coach.name, 0));
});

router.get("/courses/my", requireRole("coach"), async (req: AuthenticatedRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const courses = await db
    .select({
      course: coursesTable,
      coach: usersTable,
      enrollmentCount: count(enrollmentsTable.id),
    })
    .from(coursesTable)
    .innerJoin(usersTable, eq(coursesTable.coachId, usersTable.id))
    .leftJoin(enrollmentsTable, eq(coursesTable.id, enrollmentsTable.courseId))
    .where(eq(coursesTable.coachId, req.user.id))
    .groupBy(coursesTable.id, usersTable.id)
    .orderBy(coursesTable.createdAt);

  res.json(courses.map(({ course, coach, enrollmentCount }) =>
    formatCourse(course, coach.name, enrollmentCount)
  ));
});

router.get("/courses/categories", async (_req, res): Promise<void> => {
  const rows = await db
    .selectDistinct({ category: coursesTable.category })
    .from(coursesTable)
    .where(eq(coursesTable.isPublished, true));
  res.json(rows.map((r) => r.category));
});

router.get("/courses/recommended", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [me] = await db.select({ domain: usersTable.domain, interests: usersTable.interests })
    .from(usersTable).where(eq(usersTable.id, req.user.id));

  // Courses matching the student's field of study / interests are prioritized first;
  // popularity (enrollment count) only breaks ties within and across those two groups.
  const matchCategories = new Set([me?.domain, ...(me?.interests ?? [])].filter((c): c is string => !!c));

  const enrolled = await db
    .select({ courseId: enrollmentsTable.courseId })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.userId, req.user.id));

  const enrolledIds = new Set(enrolled.map((e) => e.courseId));

  const courses = await db
    .select({
      course: coursesTable,
      coach: usersTable,
      enrollmentCount: count(enrollmentsTable.id),
    })
    .from(coursesTable)
    .innerJoin(usersTable, eq(coursesTable.coachId, usersTable.id))
    .leftJoin(enrollmentsTable, eq(coursesTable.id, enrollmentsTable.courseId))
    .where(eq(coursesTable.isPublished, true))
    .groupBy(coursesTable.id, usersTable.id)
    .orderBy(sql`count(${enrollmentsTable.id}) desc`);

  const ranked = courses
    .filter(({ course }) => !enrolledIds.has(course.id))
    .sort((a, b) => {
      const aMatch = matchCategories.has(a.course.category) ? 1 : 0;
      const bMatch = matchCategories.has(b.course.category) ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return b.enrollmentCount - a.enrollmentCount;
    })
    .slice(0, 6)
    .map(({ course, coach, enrollmentCount }) => ({
      ...formatCourse(course, coach.name, enrollmentCount),
      matchesProfile: matchCategories.has(course.category),
    }));

  res.json(ranked);
});

router.get("/courses/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = GetCourseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid course ID" }); return; }

  const [row] = await db
    .select({
      course: coursesTable,
      coach: usersTable,
      enrollmentCount: count(enrollmentsTable.id),
    })
    .from(coursesTable)
    .innerJoin(usersTable, eq(coursesTable.coachId, usersTable.id))
    .leftJoin(enrollmentsTable, eq(coursesTable.id, enrollmentsTable.courseId))
    .where(eq(coursesTable.id, params.data.id))
    .groupBy(coursesTable.id, usersTable.id);

  if (!row) { res.status(404).json({ error: "Course not found" }); return; }

  // Order by the lesson's chapter position first (chapterless lessons sort last),
  // then by the lesson's own order within that chapter — a flat "order by lessons.order"
  // alone breaks whenever chapters each restart their lesson numbering at 1.
  const lessons = await db
    .select({ lesson: lessonsTable })
    .from(lessonsTable)
    .leftJoin(chaptersTable, eq(lessonsTable.chapterId, chaptersTable.id))
    .where(eq(lessonsTable.courseId, params.data.id))
    .orderBy(sql`coalesce(${chaptersTable.order}, 2147483647)`, lessonsTable.order)
    .then((rows) => rows.map((r) => r.lesson));

  let isEnrolled = false;
  let isPurchased = false;
  let canSeeExamAnswers = false;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const jwt = await import("jsonwebtoken");
      const payload = jwt.verify(token, JWT_SECRET) as unknown as { sub: number };
      const [enrollment] = await db
        .select({ id: enrollmentsTable.id })
        .from(enrollmentsTable)
        .where(and(eq(enrollmentsTable.userId, payload.sub), eq(enrollmentsTable.courseId, params.data.id)));
      isEnrolled = !!enrollment;
      const [purchase] = await db
        .select({ id: purchasesTable.id })
        .from(purchasesTable)
        .where(and(eq(purchasesTable.userId, payload.sub), eq(purchasesTable.courseId, params.data.id)));
      isPurchased = !!purchase;
      // The final exam's correct answers must never reach students (or anyone but the
      // owning coach / an admin) — everyone else only sees `hasFinalExam` from formatCourse.
      if (payload.sub === row.course.coachId) {
        canSeeExamAnswers = true;
      } else {
        const [requester] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, payload.sub));
        canSeeExamAnswers = requester?.role === "admin";
      }
    } catch { /* unauthenticated */ }
  }

  const formatted = formatCourse(row.course, row.coach.name, row.enrollmentCount);
  res.json({
    ...formatted,
    ...(canSeeExamAnswers ? { finalExam: row.course.finalExam ?? null } : {}),
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

router.patch("/courses/:id", requireRole("coach"), async (req: AuthenticatedRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = UpdateCourseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid course ID" }); return; }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, params.data.id));
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  if (course.coachId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }

  const parsed = UpdateCourseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const validationError = await validateCertificationFields(parsed.data);
  if (validationError) { res.status(400).json({ error: validationError }); return; }

  const [updated] = await db
    .update(coursesTable)
    .set(parsed.data)
    .where(eq(coursesTable.id, params.data.id))
    .returning();

  try {
    await db.insert(auditLogsTable).values({
      userId: req.user.id,
      action: "UPDATE_COURSE",
      entity: "course",
      entityId: updated.id,
      details: { title: updated.title, changes: Object.keys(parsed.data) },
      ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    });
  } catch (e) {
    console.error("Audit log error on course update:", e);
  }

  const [coach] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id));
  const [countRow] = await db
    .select({ enrollmentCount: count(enrollmentsTable.id) })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.courseId, updated.id));

  res.json(formatCourse(updated, coach.name, countRow?.enrollmentCount ?? 0));
});

router.delete("/courses/:id", requireRole("coach"), async (req: AuthenticatedRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = DeleteCourseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid course ID" }); return; }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, params.data.id));
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  if (course.coachId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(coursesTable).where(eq(coursesTable.id, params.data.id));

  try {
    await db.insert(auditLogsTable).values({
      userId: req.user.id,
      action: "DELETE_COURSE",
      entity: "course",
      entityId: params.data.id,
      details: { title: course.title },
      ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    });
  } catch (e) {
    console.error("Audit log error on course delete:", e);
  }

  res.json({ message: "Course deleted" });
});

export { formatCourse };
export default router;
