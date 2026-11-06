import { Router, type IRouter } from "express";
import { eq, desc, and, inArray, sql, count } from "drizzle-orm";
import { db, centersTable, usersTable, coursesTable, enrollmentsTable, purchasesTable, auditLogsTable } from "@workspace/db";
import { requireRole, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

async function computeCenterStats(centerId: number) {
  const coaches = await db.select({ id: usersTable.id }).from(usersTable)
    .where(and(eq(usersTable.centerId, centerId), eq(usersTable.role, "coach")));
  const coachIds = coaches.map((c) => c.id);

  if (coachIds.length === 0) {
    return { coachCount: 0, courseCount: 0, publishedCourseCount: 0, studentCount: 0, totalRevenue: "0.00" };
  }

  const courses = await db.select({ id: coursesTable.id, isPublished: coursesTable.isPublished }).from(coursesTable)
    .where(inArray(coursesTable.coachId, coachIds));
  const courseIds = courses.map((c) => c.id);
  const publishedCourseCount = courses.filter((c) => c.isPublished).length;

  if (courseIds.length === 0) {
    return { coachCount: coachIds.length, courseCount: 0, publishedCourseCount: 0, studentCount: 0, totalRevenue: "0.00" };
  }

  const [{ studentCount }] = await db
    .select({ studentCount: sql<number>`count(distinct ${enrollmentsTable.userId})::int` })
    .from(enrollmentsTable)
    .where(inArray(enrollmentsTable.courseId, courseIds));

  const [{ totalRevenue }] = await db
    .select({ totalRevenue: sql<string>`coalesce(sum(${purchasesTable.amount}), 0)::text` })
    .from(purchasesTable)
    .where(inArray(purchasesTable.courseId, courseIds));

  return {
    coachCount: coachIds.length,
    courseCount: courseIds.length,
    publishedCourseCount,
    studentCount: studentCount ?? 0,
    totalRevenue: totalRevenue ?? "0.00",
  };
}

// Get all centers with aggregated analytics (coaches/courses/students/revenue)
router.get("/centers", async (_req, res): Promise<void> => {
  try {
    const centers = await db.select().from(centersTable).orderBy(desc(centersTable.createdAt));
    const withStats = await Promise.all(centers.map(async (center) => ({
      ...center,
      stats: await computeCenterStats(center.id),
    })));
    res.json(withStats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get one center's detailed analysis: affiliated coaches with their own individual stats
router.get("/centers/:id/analysis", requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [center] = await db.select().from(centersTable).where(eq(centersTable.id, id));
    if (!center) { res.status(404).json({ error: "Center not found" }); return; }

    const coaches = await db.select().from(usersTable)
      .where(and(eq(usersTable.centerId, id), eq(usersTable.role, "coach")));

    const coachDetails = await Promise.all(coaches.map(async (coach) => {
      const [{ courseCount }] = await db.select({ courseCount: count() }).from(coursesTable).where(eq(coursesTable.coachId, coach.id));
      const courses = await db.select({ id: coursesTable.id }).from(coursesTable).where(eq(coursesTable.coachId, coach.id));
      const courseIds = courses.map((c) => c.id);

      let studentCount = 0;
      let revenue = "0.00";
      if (courseIds.length > 0) {
        const [studentRow] = await db.select({ n: sql<number>`count(distinct ${enrollmentsTable.userId})::int` })
          .from(enrollmentsTable).where(inArray(enrollmentsTable.courseId, courseIds));
        studentCount = studentRow?.n ?? 0;
        const [revenueRow] = await db.select({ n: sql<string>`coalesce(sum(${purchasesTable.amount}), 0)::text` })
          .from(purchasesTable).where(inArray(purchasesTable.courseId, courseIds));
        revenue = revenueRow?.n ?? "0.00";
      }

      return {
        id: coach.id, name: coach.name, email: coach.email, isApproved: coach.isApproved,
        avatarUrl: coach.avatarUrl ?? null, courseCount, studentCount, revenue,
      };
    }));

    const stats = await computeCenterStats(id);
    res.json({ center, stats, coaches: coachDetails });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Assign or unassign a coach to/from a center (Admin only)
router.patch("/centers/coaches/:coachId/assign", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const coachId = parseInt(String(req.params.coachId));
    if (isNaN(coachId)) { res.status(400).json({ error: "Invalid coach ID" }); return; }
    const { centerId } = req.body as { centerId: number | null };

    if (centerId !== null) {
      const [center] = await db.select().from(centersTable).where(eq(centersTable.id, centerId));
      if (!center) { res.status(400).json({ error: "Invalid center ID" }); return; }
    }

    const [coach] = await db.select().from(usersTable).where(eq(usersTable.id, coachId));
    if (!coach || coach.role !== "coach") { res.status(400).json({ error: "Invalid coach ID" }); return; }

    const [updated] = await db.update(usersTable).set({ centerId: centerId ?? null }).where(eq(usersTable.id, coachId)).returning();
    await db.insert(auditLogsTable).values({
      userId: req.user!.id, action: "ASSIGN_COACH_CENTER", entity: "user", entityId: coachId, details: { centerId },
    });
    res.json({ id: updated.id, name: updated.name, centerId: updated.centerId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create center (Admin only)
router.post("/centers", requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const { name, description, address, phone, email, isActive } = req.body as any;
    if (!name?.trim()) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const [center] = await db.insert(centersTable).values({
      name: name.trim(),
      description: description ?? null,
      address: address ?? null,
      phone: phone ?? null,
      email: email ?? null,
      isActive: isActive ?? true,
    }).returning();
    res.status(201).json(center);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update center (Admin only)
router.put("/centers/:id", requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const { name, description, address, phone, email, isActive } = req.body as any;
    const [updated] = await db.update(centersTable).set({
      name: name ? name.trim() : undefined,
      description: description !== undefined ? description : undefined,
      address: address !== undefined ? address : undefined,
      phone: phone !== undefined ? phone : undefined,
      email: email !== undefined ? email : undefined,
      isActive: isActive !== undefined ? isActive : undefined,
    }).where(eq(centersTable.id, id)).returning();

    if (!updated) {
      res.status(404).json({ error: "Center not found" });
      return;
    }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete center (Admin only)
router.delete("/centers/:id", requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [deleted] = await db.delete(centersTable).where(eq(centersTable.id, id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Center not found" });
      return;
    }
    res.json({ message: "Center deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
