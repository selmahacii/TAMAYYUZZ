import { Router, type IRouter } from "express";
import { eq, count, and, sql, desc, asc } from "drizzle-orm";
import {
  db, usersTable, coursesTable, enrollmentsTable, purchasesTable,
  couponsTable, certificatesTable, auditLogsTable, ticketsTable,
  invoicesTable, commissionsTable, knowledgeBaseTable, certificateTemplatesTable,
  priceRequestsTable, announcementsTable, lessonsTable, progressTable,
  platformSettingsTable,
} from "@workspace/db";
import { getPlatformSettings, refreshPlatformSettingsCache } from "../lib/settingsCache";
import {
  ApproveCoachParams, RejectCoachParams, PublishCourseParams, UnpublishCourseParams,
} from "@workspace/api-zod";
import { requireRole, type AuthenticatedRequest } from "../middlewares/auth";
import { formatCourse } from "./courses";
import { createNotification } from "./notifications";
import bcrypt from "bcrypt";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id, name: user.name, email: user.email, role: user.role,
    isApproved: user.isApproved, bio: user.bio ?? null, avatarUrl: user.avatarUrl ?? null,
    centerId: user.centerId ?? null,
    phone: user.phone ?? null,
    domain: user.domain ?? null,
    diplomas: user.diplomas ?? [],
    priorTrainings: user.priorTrainings ?? [],
    teachingPlan: user.teachingPlan ?? null,
    interests: user.interests ?? [],
    createdAt: user.createdAt.toISOString(),
  };
}

// ─── STATS ────────────────────────────────────────────────────────────────────
router.get("/admin/stats", requireRole("admin"), async (_req, res): Promise<void> => {
  const [totalUsersRow] = await db.select({ count: count() }).from(usersTable);
  const [studentCount] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "student"));
  const [coachCount] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "coach"));
  const [pendingCoachCount] = await db.select({ count: count() }).from(usersTable).where(and(eq(usersTable.role, "coach"), eq(usersTable.isApproved, false)));
  const [courseCount] = await db.select({ count: count() }).from(coursesTable);
  const [publishedCount] = await db.select({ count: count() }).from(coursesTable).where(eq(coursesTable.isPublished, true));
  const [enrollmentCount] = await db.select({ count: count() }).from(enrollmentsTable);
  const [purchaseCount] = await db.select({ count: count() }).from(purchasesTable);
  const [revenueRow] = await db.select({ total: sql<string>`coalesce(sum(amount), 0)::text` }).from(purchasesTable);
  const [couponCount] = await db.select({ count: count() }).from(couponsTable).where(eq(couponsTable.isActive, true));
  const [certCount] = await db.select({ count: count() }).from(certificatesTable);
  const [openTickets] = await db.select({ count: count() }).from(ticketsTable).where(eq(ticketsTable.status, "open"));
  const [pendingAds] = await db.select({ count: count() }).from(announcementsTable).where(eq(announcementsTable.isApproved, false));

  res.json({
    totalUsers: totalUsersRow?.count ?? 0,
    totalStudents: studentCount?.count ?? 0,
    totalCoaches: coachCount?.count ?? 0,
    pendingCoaches: pendingCoachCount?.count ?? 0,
    totalCourses: courseCount?.count ?? 0,
    publishedCourses: publishedCount?.count ?? 0,
    totalEnrollments: enrollmentCount?.count ?? 0,
    totalPurchases: purchaseCount?.count ?? 0,
    totalRevenue: revenueRow?.total ?? "0",
    activeCoupons: couponCount?.count ?? 0,
    totalCertificates: certCount?.count ?? 0,
    openTickets: openTickets?.count ?? 0,
    pendingAds: pendingAds?.count ?? 0,
  });
});

// ─── REPORTS ──────────────────────────────────────────────────────────────────
router.get("/admin/reports", requireRole("admin"), async (_req, res): Promise<void> => {
  const enrollmentsByMonth = await db
    .select({ month: sql<string>`to_char(enrolled_at, 'YYYY-MM')`, count: sql<number>`count(*)::int` })
    .from(enrollmentsTable)
    .groupBy(sql`to_char(enrolled_at, 'YYYY-MM')`)
    .orderBy(sql`to_char(enrolled_at, 'YYYY-MM')`);

  const revenueByMonth = await db
    .select({ month: sql<string>`to_char(paid_at, 'YYYY-MM')`, revenue: sql<string>`coalesce(sum(amount), 0)::text` })
    .from(purchasesTable)
    .groupBy(sql`to_char(paid_at, 'YYYY-MM')`)
    .orderBy(sql`to_char(paid_at, 'YYYY-MM')`);

  const topCourses = await db
    .select({
      courseId: coursesTable.id, title: coursesTable.title,
      enrollmentCount: count(enrollmentsTable.id),
      revenue: sql<string>`coalesce(sum(${purchasesTable.amount}), 0)::text`,
    })
    .from(coursesTable)
    .leftJoin(enrollmentsTable, eq(enrollmentsTable.courseId, coursesTable.id))
    .leftJoin(purchasesTable, eq(purchasesTable.courseId, coursesTable.id))
    .groupBy(coursesTable.id)
    .orderBy(sql`count(${enrollmentsTable.id}) desc`)
    .limit(10);

  const categoryDistribution = await db
    .select({ category: coursesTable.category, count: sql<number>`count(*)::int` })
    .from(coursesTable)
    .where(eq(coursesTable.isPublished, true))
    .groupBy(coursesTable.category)
    .orderBy(sql`count(*) desc`);

  const userGrowth = await db
    .select({ month: sql<string>`to_char(created_at, 'YYYY-MM')`, count: sql<number>`count(*)::int` })
    .from(usersTable)
    .groupBy(sql`to_char(created_at, 'YYYY-MM')`)
    .orderBy(sql`to_char(created_at, 'YYYY-MM')`);

  res.json({ enrollmentsByMonth, revenueByMonth, topCourses, categoryDistribution, userGrowth });
});

// ─── COACHES ──────────────────────────────────────────────────────────────────
router.get("/admin/coaches", requireRole("admin"), async (_req, res): Promise<void> => {
  try {
    const coaches = await db.select().from(usersTable).where(eq(usersTable.role, "coach")).orderBy(usersTable.createdAt);
    const results = [];
    
    for (const coach of coaches) {
      const [cCount] = await db.select({ count: count() }).from(coursesTable).where(eq(coursesTable.coachId, coach.id));
      const [sCount] = await db.select({ count: count() })
        .from(enrollmentsTable)
        .innerJoin(coursesTable, eq(enrollmentsTable.courseId, coursesTable.id))
        .where(eq(coursesTable.coachId, coach.id));
      const [commTotal] = await db.select({
        total: sql<string>`coalesce(sum(amount), 0)::text`,
        paid: sql<string>`coalesce(sum(case when is_paid = true then amount else 0 end), 0)::text`
      }).from(commissionsTable).where(eq(commissionsTable.coachId, coach.id));

      const totalComms = parseFloat(commTotal?.total ?? "0");
      const paidComms = parseFloat(commTotal?.paid ?? "0");
      const pendingComms = totalComms - paidComms;

      results.push({
        ...formatUser(coach),
        totalCourses: cCount?.count ?? 0,
        totalStudents: sCount?.count ?? 0,
        totalCommissions: totalComms,
        paidCommissions: paidComms,
        pendingCommissions: pendingComms,
      });
    }
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin creates coach directly (approved by default)
router.post("/admin/coaches", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { name, email, password, bio } = req.body as any;
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      res.status(400).json({ error: "name, email, and password are required" });
      return;
    }

    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email.trim()));
    if (existing) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password.trim(), 10);
    const [coach] = await db.insert(usersTable).values({
      name: name.trim(),
      email: email.trim(),
      passwordHash,
      role: "coach",
      isApproved: true,
      bio: bio ?? null,
    }).returning();

    await db.insert(auditLogsTable).values({
      userId: req.user!.id,
      action: "CREATE_COACH",
      entity: "user",
      entityId: coach.id,
    });

    res.status(201).json({
      ...formatUser(coach),
      totalCourses: 0,
      totalStudents: 0,
      totalCommissions: 0,
      paidCommissions: 0,
      pendingCommissions: 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/admin/coaches/:id/approve", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = ApproveCoachParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [user] = await db.update(usersTable).set({ isApproved: true }).where(eq(usersTable.id, params.data.id)).returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  await db.insert(auditLogsTable).values({ userId: req.user!.id, action: "APPROVE_COACH", entity: "user", entityId: params.data.id });

  // In-app notification to the coach
  await createNotification({
    userId: user.id,
    title: "Profil Coach Validé !",
    message: "Félicitations, votre candidature et vos diplômes ont été validés par l'équipe pédagogique. Vous pouvez dès à présent créer et publier vos formations.",
    type: "success",
    link: "/coach/dashboard",
  });

  res.json(formatUser(user));
});

router.post("/admin/coaches/:id/reject", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = RejectCoachParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { reason } = req.body as { reason?: string };

  const [user] = await db.update(usersTable).set({ isApproved: false }).where(eq(usersTable.id, params.data.id)).returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  await db.insert(auditLogsTable).values({ userId: req.user!.id, action: "REJECT_COACH", entity: "user", entityId: params.data.id, details: { reason } });

  // In-app notification with explanation to the coach
  await createNotification({
    userId: user.id,
    title: "Candidature Coach Non Retenue",
    message: reason ? `Votre profil coach n'a pas été validé pour le motif suivant : ${reason}` : "Votre profil coach nécessite des informations complémentaires avant validation.",
    type: "warning",
    link: "/coach/profile",
  });

  res.json(formatUser(user));
});

// KYC: admin marks a specific diploma verified/unverified after reviewing its proof document
router.patch("/admin/coaches/:id/diplomas/:index/verify", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  const index = parseInt(String(req.params.index));
  if (isNaN(id) || isNaN(index)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { verified } = req.body as { verified?: boolean };
  if (typeof verified !== "boolean") { res.status(400).json({ error: "verified (boolean) is required" }); return; }

  const [coach] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!coach || coach.role !== "coach") { res.status(404).json({ error: "Coach not found" }); return; }

  const diplomas = [...(coach.diplomas ?? [])];
  if (index < 0 || index >= diplomas.length) { res.status(400).json({ error: "Invalid diploma index" }); return; }
  diplomas[index] = { ...diplomas[index], verified };

  const [updated] = await db.update(usersTable).set({ diplomas }).where(eq(usersTable.id, id)).returning();
  await db.insert(auditLogsTable).values({
    userId: req.user!.id, action: verified ? "VERIFY_DIPLOMA" : "UNVERIFY_DIPLOMA", entity: "user", entityId: id,
    details: { diplomaName: diplomas[index].name },
  });
  res.json(formatUser(updated));
});

// ─── COURSES ──────────────────────────────────────────────────────────────────
router.get("/admin/courses", requireRole("admin"), async (_req, res): Promise<void> => {
  const courses = await db
    .select({ course: coursesTable, coach: usersTable, enrollmentCount: count(enrollmentsTable.id) })
    .from(coursesTable)
    .innerJoin(usersTable, eq(coursesTable.coachId, usersTable.id))
    .leftJoin(enrollmentsTable, eq(coursesTable.id, enrollmentsTable.courseId))
    .groupBy(coursesTable.id, usersTable.id)
    .orderBy(coursesTable.createdAt);
  res.json(courses.map(({ course, coach, enrollmentCount }) => formatCourse(course, coach.name, enrollmentCount)));
});

router.post("/admin/courses/:id/publish", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = PublishCourseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [course] = await db.update(coursesTable).set({ isPublished: true }).where(eq(coursesTable.id, params.data.id)).returning();
  if (!course) { res.status(404).json({ error: "Not found" }); return; }
  const [coach] = await db.select().from(usersTable).where(eq(usersTable.id, course.coachId));
  const [countRow] = await db.select({ cnt: count() }).from(enrollmentsTable).where(eq(enrollmentsTable.courseId, course.id));
  await db.insert(auditLogsTable).values({ userId: req.user!.id, action: "PUBLISH_COURSE", entity: "course", entityId: course.id });

  // Notify coach that course is published live on marketplace
  await createNotification({
    userId: course.coachId,
    title: "Formation publiée !",
    message: `Votre formation « ${course.title} » est désormais en ligne et disponible sur le catalogue public.`,
    type: "success",
    link: `/course/${course.id}`,
  });

  res.json(formatCourse(course, coach.name, countRow?.cnt ?? 0));
});

router.post("/admin/courses/:id/unpublish", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = UnpublishCourseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [course] = await db.update(coursesTable).set({ isPublished: false }).where(eq(coursesTable.id, params.data.id)).returning();
  if (!course) { res.status(404).json({ error: "Not found" }); return; }
  const [coach] = await db.select().from(usersTable).where(eq(usersTable.id, course.coachId));
  const [countRow] = await db.select({ cnt: count() }).from(enrollmentsTable).where(eq(enrollmentsTable.courseId, course.id));
  await db.insert(auditLogsTable).values({ userId: req.user!.id, action: "UNPUBLISH_COURSE", entity: "course", entityId: course.id });
  res.json(formatCourse(course, coach.name, countRow?.cnt ?? 0));
});

// ─── USERS ────────────────────────────────────────────────────────────────────
router.get("/admin/users", requireRole("admin"), async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(users.map(formatUser));
});

router.patch("/admin/users/:id/role", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  if (req.user?.id === id) { res.status(400).json({ error: "Cannot change own role" }); return; }
  const { role } = req.body as { role: string };
  if (!["student", "coach", "admin"].includes(role)) { res.status(400).json({ error: "Invalid role" }); return; }
  const [user] = await db.update(usersTable).set({ role: role as any }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  await db.insert(auditLogsTable).values({ userId: req.user!.id, action: "CHANGE_ROLE", entity: "user", entityId: id, details: { role } });
  res.json(formatUser(user));
});

router.delete("/admin/users/:id", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  if (req.user?.id === id) { res.status(400).json({ error: "Cannot delete own account" }); return; }
  await db.delete(usersTable).where(eq(usersTable.id, id));
  await db.insert(auditLogsTable).values({ userId: req.user!.id, action: "DELETE_USER", entity: "user", entityId: id });
  res.json({ message: "Utilisateur supprimé" });
});

// ─── FINANCES: INVOICES ────────────────────────────────────────────────────────
router.get("/admin/invoices", requireRole("admin"), async (_req, res): Promise<void> => {
  const rows = await db
    .select({ inv: invoicesTable, u: usersTable })
    .from(invoicesTable)
    .innerJoin(usersTable, eq(invoicesTable.userId, usersTable.id))
    .orderBy(desc(invoicesTable.issuedAt));
  res.json(rows.map(({ inv, u }) => ({
    id: inv.id, invoiceNumber: inv.invoiceNumber, userId: inv.userId,
    userName: u.name, userEmail: u.email, amount: inv.amount, currency: inv.currency,
    status: inv.status, issuedAt: inv.issuedAt.toISOString(),
    paidAt: inv.paidAt?.toISOString() ?? null, notes: inv.notes,
  })));
});

router.post("/admin/invoices", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { userId, amount, status, notes, invoiceNumber } = req.body as any;
    if (!userId || !amount) {
      res.status(400).json({ error: "userId and amount are required" });
      return;
    }
    const num = invoiceNumber?.trim() || `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const [existing] = await db.select().from(invoicesTable).where(eq(invoicesTable.invoiceNumber, num));
    if (existing) {
      res.status(400).json({ error: "Invoice number already exists" });
      return;
    }
    const [invoice] = await db.insert(invoicesTable).values({
      invoiceNumber: num,
      userId,
      amount: String(amount),
      status: status ?? "issued",
      notes: notes ?? null,
      paidAt: status === "paid" ? new Date() : null,
    }).returning();

    await db.insert(auditLogsTable).values({ userId: req.user!.id, action: "CREATE_INVOICE", entity: "invoice", entityId: invoice.id });

    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    res.status(201).json({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      userId: invoice.userId,
      userName: u?.name ?? "Inconnu",
      userEmail: u?.email ?? "Inconnu",
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      issuedAt: invoice.issuedAt.toISOString(),
      paidAt: invoice.paidAt?.toISOString() ?? null,
      notes: invoice.notes,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/admin/invoices/:id", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    
    const { status, notes } = req.body as { status?: string; notes?: string };
    
    const updateData: any = {};
    if (status) {
      if (!["draft", "issued", "paid", "cancelled"].includes(status)) {
        res.status(400).json({ error: "Invalid status" });
        return;
      }
      updateData.status = status;
      if (status === "paid") {
        updateData.paidAt = new Date();
      }
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    
    const [updated] = await db.update(invoicesTable).set(updateData).where(eq(invoicesTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Invoice not found" }); return; }
    
    await db.insert(auditLogsTable).values({ userId: req.user!.id, action: "UPDATE_INVOICE", entity: "invoice", entityId: id, details: { status, notes } });
    
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId));
    res.json({
      id: updated.id, invoiceNumber: updated.invoiceNumber, userId: updated.userId,
      userName: u?.name ?? "Inconnu", userEmail: u?.email ?? "Inconnu", amount: updated.amount, currency: updated.currency,
      status: updated.status, issuedAt: updated.issuedAt.toISOString(),
      paidAt: updated.paidAt?.toISOString() ?? null, notes: updated.notes,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── FINANCES: COMMISSIONS ────────────────────────────────────────────────────
router.get("/admin/commissions", requireRole("admin"), async (_req, res): Promise<void> => {
  const rows = await db
    .select({ c: commissionsTable, u: usersTable, course: coursesTable })
    .from(commissionsTable)
    .innerJoin(usersTable, eq(commissionsTable.coachId, usersTable.id))
    .leftJoin(coursesTable, eq(commissionsTable.courseId, coursesTable.id))
    .orderBy(desc(commissionsTable.createdAt));
  res.json(rows.map(({ c, u, course }) => ({
    id: c.id, coachId: c.coachId, coachName: u.name,
    courseId: c.courseId, courseName: course?.title ?? null,
    amount: c.amount, currency: c.currency, ratePercent: c.ratePercent,
    status: c.status, isPaid: c.isPaid, paidAt: c.paidAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  })));
});

router.post("/admin/commissions", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { coachId, amount, ratePercent, courseId, notes, isPaid } = req.body as any;
    if (!coachId || !amount) {
      res.status(400).json({ error: "coachId and amount are required" });
      return;
    }
    
    const [comm] = await db.insert(commissionsTable).values({
      coachId: parseInt(coachId),
      amount: String(amount),
      ratePercent: ratePercent ? String(ratePercent) : "70.00",
      courseId: courseId ? parseInt(courseId) : null,
      notes: notes ?? null,
      isPaid: isPaid ?? false,
      status: isPaid ? "paid" : "pending",
      paidAt: isPaid ? new Date() : null,
    }).returning();
    
    await db.insert(auditLogsTable).values({ userId: req.user!.id, action: "CREATE_COMMISSION", entity: "commission", entityId: comm.id });
    
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(coachId)));
    let courseName = null;
    if (comm.courseId) {
      const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, comm.courseId));
      courseName = course?.title ?? null;
    }
    
    res.status(201).json({
      id: comm.id, coachId: comm.coachId, coachName: u?.name ?? "Inconnu",
      courseId: comm.courseId, courseName,
      amount: comm.amount, currency: comm.currency, ratePercent: comm.ratePercent,
      status: comm.status, isPaid: comm.isPaid, paidAt: comm.paidAt?.toISOString() ?? null,
      createdAt: comm.createdAt.toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/admin/commissions/:id/pay", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [updated] = await db.update(commissionsTable).set({ isPaid: true, paidAt: new Date(), status: "paid" }).where(eq(commissionsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  await db.insert(auditLogsTable).values({ userId: req.user!.id, action: "PAY_COMMISSION", entity: "commission", entityId: id });
  res.json(updated);
});

router.delete("/admin/commissions/:id", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    
    const [deleted] = await db.delete(commissionsTable).where(eq(commissionsTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Commission not found" }); return; }
    
    await db.insert(auditLogsTable).values({ userId: req.user!.id, action: "DELETE_COMMISSION", entity: "commission", entityId: id });
    res.json({ message: "Commission deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── FINANCES: PURCHASES HISTORY ─────────────────────────────────────────────
router.get("/admin/purchases", requireRole("admin"), async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select({ 
        p: purchasesTable, 
        u: usersTable, 
        c: coursesTable,
        invoice: invoicesTable,
        comm: commissionsTable
      })
      .from(purchasesTable)
      .innerJoin(usersTable, eq(purchasesTable.userId, usersTable.id))
      .innerJoin(coursesTable, eq(purchasesTable.courseId, coursesTable.id))
      .leftJoin(invoicesTable, eq(invoicesTable.purchaseId, purchasesTable.id))
      .leftJoin(commissionsTable, eq(commissionsTable.purchaseId, purchasesTable.id))
      .orderBy(desc(purchasesTable.paidAt));

    const results = [];
    for (const r of rows) {
      const [coachRow] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, r.c.coachId));
      results.push({
        id: r.p.id,
        userId: r.p.userId,
        userName: r.u.name,
        userEmail: r.u.email,
        courseId: r.p.courseId,
        courseTitle: r.c.title,
        coachName: coachRow?.name ?? "Coach inconnu",
        amount: r.p.amount,
        currency: r.p.currency,
        couponCode: r.p.couponCode,
        discountApplied: r.p.discountApplied,
        status: r.p.status,
        paymentMethod: r.p.paymentMethod,
        receiptUrl: r.p.receiptUrl,
        rejectionReason: r.p.rejectionReason,
        paidAt: r.p.paidAt.toISOString(),
        invoiceId: r.invoice?.id ?? null,
        invoiceNumber: r.invoice?.invoiceNumber ?? null,
        invoiceStatus: r.invoice?.status ?? null,
        commissionId: r.comm?.id ?? null,
        commissionAmount: r.comm?.amount ?? null,
        commissionStatus: r.comm?.status ?? null,
        commissionRate: r.comm?.ratePercent ?? null,
      });
    }

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin approves an offline payment receipt (BaridiMob / CCP)
router.post("/admin/purchases/:id/verify", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const purchaseId = parseInt(String(req.params.id));
    if (isNaN(purchaseId)) { res.status(400).json({ error: "ID invalide" }); return; }

    const [purchase] = await db.select().from(purchasesTable).where(eq(purchasesTable.id, purchaseId));
    if (!purchase) { res.status(404).json({ error: "Achat introuvable" }); return; }
    if (purchase.status === "paid") { res.status(400).json({ error: "Cet achat est déjà validé" }); return; }

    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, purchase.courseId));
    if (!course) { res.status(404).json({ error: "Cours introuvable" }); return; }

    // 1. Update purchase status
    const [updated] = await db.update(purchasesTable).set({
      status: "paid",
      rejectionReason: null,
      paidAt: new Date(),
    }).where(eq(purchasesTable.id, purchaseId)).returning();

    // 2. Grant course enrollment
    await db.insert(enrollmentsTable).values({
      userId: purchase.userId,
      courseId: purchase.courseId,
    }).onConflictDoNothing();

    // 3. Mark invoice as paid
    await db.update(invoicesTable).set({
      status: "paid",
      paidAt: new Date(),
      notes: "Paiement validé par l'administration après vérification du reçu",
    }).where(eq(invoicesTable.purchaseId, purchaseId));

    // 4. Create coach commission
    const commissionAmount = (parseFloat(purchase.amount) * 0.70).toFixed(2);
    await db.insert(commissionsTable).values({
      coachId: course.coachId,
      purchaseId: purchase.id,
      courseId: course.id,
      amount: commissionAmount,
      currency: purchase.currency,
      ratePercent: "70",
      status: "pending",
      isPaid: false,
    });

    await db.insert(auditLogsTable).values({
      userId: req.user!.id,
      action: "VERIFY_PAYMENT_RECEIPT",
      entity: "purchase",
      entityId: purchaseId,
      details: { amount: purchase.amount, method: purchase.paymentMethod },
    });

    // Notify the student that their payment was verified and course unlocked
    await createNotification({
      userId: purchase.userId,
      title: "Paiement Validé & Cours Débloqué !",
      message: `Votre reçu de paiement pour « ${course.title} » a été approuvé. Votre accès complet est désormais actif.`,
      type: "success",
      link: `/student/learn/${course.id}`,
    });

    // Notify the coach about the new paid enrollment
    await createNotification({
      userId: course.coachId,
      title: "Nouvelle inscription payante !",
      message: `Une nouvelle apprenante s'est inscrite à votre cours « ${course.title} ». Commission générée : ${commissionAmount} DZD.`,
      type: "info",
      link: "/coach/earnings",
    });

    res.json({ message: "Paiement validé avec succès", purchase: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin rejects an invalid payment receipt
router.post("/admin/purchases/:id/reject", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const purchaseId = parseInt(String(req.params.id));
    if (isNaN(purchaseId)) { res.status(400).json({ error: "ID invalide" }); return; }

    const { reason = "Reçu illisible ou montant incorrect" } = req.body as { reason?: string };

    const [purchase] = await db.select().from(purchasesTable).where(eq(purchasesTable.id, purchaseId));
    if (!purchase) { res.status(404).json({ error: "Achat introuvable" }); return; }

    // 1. Update purchase status to rejected
    const [updated] = await db.update(purchasesTable).set({
      status: "rejected",
      rejectionReason: reason,
    }).where(eq(purchasesTable.id, purchaseId)).returning();

    // 2. Cancel invoice
    await db.update(invoicesTable).set({
      status: "cancelled",
      notes: `Rejeté par l'administration: ${reason}`,
    }).where(eq(invoicesTable.purchaseId, purchaseId));

    // 3. Remove enrollment if any was previously given
    await db.delete(enrollmentsTable).where(
      and(eq(enrollmentsTable.userId, purchase.userId), eq(enrollmentsTable.courseId, purchase.courseId))
    );

    await db.insert(auditLogsTable).values({
      userId: req.user!.id,
      action: "REJECT_PAYMENT_RECEIPT",
      entity: "purchase",
      entityId: purchaseId,
      details: { reason },
    });

    // Notify student about payment receipt rejection with explanation
    const [cRow] = await db.select({ title: coursesTable.title }).from(coursesTable).where(eq(coursesTable.id, purchase.courseId));
    await createNotification({
      userId: purchase.userId,
      title: "Reçu de paiement non validé",
      message: `Votre reçu de paiement pour « ${cRow?.title ?? "la formation"} » a été refusé : ${reason}. Vous pouvez soumettre un nouveau reçu lisible.`,
      type: "error",
      link: "/student/purchases",
    });

    res.json({ message: "Paiement rejeté", purchase: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GESTION: KNOWLEDGE BASE ──────────────────────────────────────────────────
router.get("/admin/knowledge-base", requireRole("admin"), async (_req, res): Promise<void> => {
  const articles = await db.select().from(knowledgeBaseTable).orderBy(asc(knowledgeBaseTable.order), desc(knowledgeBaseTable.createdAt));
  res.json(articles);
});

router.post("/admin/knowledge-base", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const { title, content, category, isPublished, order } = req.body as any;
  if (!title?.trim() || !content?.trim()) { res.status(400).json({ error: "Title and content required" }); return; }
  const [article] = await db.insert(knowledgeBaseTable).values({
    authorId: req.user!.id, title: title.trim(), content: content.trim(),
    category: category ?? "general", isPublished: isPublished ?? false, order: order ?? 0,
  }).returning();
  await db.insert(auditLogsTable).values({ userId: req.user!.id, action: "CREATE_KB", entity: "knowledge_base", entityId: article.id });
  res.status(201).json(article);
});

router.put("/admin/knowledge-base/:id", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { title, content, category, isPublished, order } = req.body as any;
  const [updated] = await db.update(knowledgeBaseTable).set({ title, content, category, isPublished, order }).where(eq(knowledgeBaseTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/admin/knowledge-base/:id", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(knowledgeBaseTable).where(eq(knowledgeBaseTable.id, id));
  res.json({ message: "Deleted" });
});

// ─── GESTION: CERTIFICATE TEMPLATES ──────────────────────────────────────────
router.get("/admin/certificate-templates", requireRole("admin"), async (_req, res): Promise<void> => {
  const templates = await db.select().from(certificateTemplatesTable).orderBy(desc(certificateTemplatesTable.isDefault), asc(certificateTemplatesTable.id));
  res.json(templates);
});

router.post("/admin/certificate-templates", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const { name, description, primaryColor, accentColor, logoUrl, customTitleText, signatureTitle, fontFamily, isDefault } = req.body as any;
  if (!name?.trim()) { res.status(400).json({ error: "Name required" }); return; }
  if (isDefault) {
    await db.update(certificateTemplatesTable).set({ isDefault: false });
  }
  const [template] = await db.insert(certificateTemplatesTable).values({
    name: name.trim(), description: description ?? null, primaryColor: primaryColor ?? "#1e293b",
    accentColor: accentColor ?? "#1e293b", logoUrl: logoUrl ?? null,
    customTitleText: customTitleText ?? null, signatureTitle: signatureTitle ?? null,
    fontFamily: fontFamily ?? "serif", isDefault: isDefault ?? false,
  }).returning();
  await db.insert(auditLogsTable).values({ userId: req.user!.id, action: "CREATE_CERT_TEMPLATE", entity: "certificate_template", entityId: template.id });
  res.status(201).json(template);
});

router.put("/admin/certificate-templates/:id", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { name, description, primaryColor, accentColor, logoUrl, customTitleText, signatureTitle, fontFamily, isDefault, isActive } = req.body as any;
  if (isDefault) {
    await db.update(certificateTemplatesTable).set({ isDefault: false });
  }
  const [updated] = await db.update(certificateTemplatesTable)
    .set({ name, description, primaryColor, accentColor, logoUrl, customTitleText, signatureTitle, fontFamily, isDefault, isActive })
    .where(eq(certificateTemplatesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/admin/certificate-templates/:id", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(certificateTemplatesTable).where(eq(certificateTemplatesTable.id, id));
  res.json({ message: "Deleted" });
});

// ─── SYSTÈME: AUDIT LOG ───────────────────────────────────────────────────────
router.get("/admin/audit-logs", requireRole("admin"), async (req, res): Promise<void> => {
  const limitQ = parseInt(String((req.query as any).limit ?? "100"));
  const offsetQ = parseInt(String((req.query as any).offset ?? "0"));
  const rows = await db
    .select({ log: auditLogsTable, u: usersTable })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limitQ)
    .offset(offsetQ);
  res.json(rows.map(({ log, u }) => ({
    id: log.id, action: log.action, entity: log.entity, entityId: log.entityId,
    details: log.details, ipAddress: log.ipAddress, userAgent: log.userAgent,
    userId: log.userId, userName: u?.name ?? "System",
    createdAt: log.createdAt.toISOString(),
  })));
});

// ─── SYSTÈME: PRICE REQUESTS ──────────────────────────────────────────────────
router.get("/admin/price-requests", requireRole("admin"), async (_req, res): Promise<void> => {
  const rows = await db
    .select({ pr: priceRequestsTable, u: usersTable, c: coursesTable })
    .from(priceRequestsTable)
    .innerJoin(usersTable, eq(priceRequestsTable.coachId, usersTable.id))
    .innerJoin(coursesTable, eq(priceRequestsTable.courseId, coursesTable.id))
    .orderBy(desc(priceRequestsTable.createdAt));
  res.json(rows.map(({ pr, u, c }) => ({
    id: pr.id, coachId: pr.coachId, coachName: u.name,
    courseId: pr.courseId, courseTitle: c.title,
    requestedPrice: pr.requestedPrice, currentPrice: pr.currentPrice,
    currency: pr.currency, justification: pr.justification,
    status: pr.status, adminResponse: pr.adminResponse, counterPrice: pr.counterPrice,
    createdAt: pr.createdAt.toISOString(), resolvedAt: pr.resolvedAt?.toISOString() ?? null,
  })));
});

router.patch("/admin/price-requests/:id", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { status, adminResponse, counterPrice } = req.body as any;

  const [pr] = await db.select().from(priceRequestsTable).where(eq(priceRequestsTable.id, id));
  if (!pr) { res.status(404).json({ error: "Not found" }); return; }

  const [updated] = await db.update(priceRequestsTable)
    .set({ status, adminResponse, counterPrice: counterPrice ?? null, resolvedAt: new Date() })
    .where(eq(priceRequestsTable.id, id)).returning();

  // If approved, update the course price
  if (status === "approved") {
    await db.update(coursesTable).set({ price: pr.requestedPrice, isFree: parseFloat(String(pr.requestedPrice)) === 0 }).where(eq(coursesTable.id, pr.courseId));
  }

  await db.insert(auditLogsTable).values({ userId: req.user!.id, action: "RESOLVE_PRICE_REQUEST", entity: "price_request", entityId: id, details: { status, adminResponse } });
  res.json(updated);
});

// ─── PLATFORM SETTINGS ─────────────────────────────────────────────────────────
router.get("/admin/settings", requireRole("admin"), async (_req, res): Promise<void> => {
  const settings = await getPlatformSettings();
  res.json(settings);
});

router.patch("/admin/settings", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const body = req.body as Partial<{
    platformName: string; platformEmail: string; defaultCurrency: string;
    defaultCommissionRate: string; maxCoursesPerCoach: string;
    requireCoachApproval: boolean; requireAdApproval: boolean;
    allowFreeCoachRegistration: boolean; maintenanceMode: boolean;
  }>;

  const current = await getPlatformSettings();
  const [updated] = await db.update(platformSettingsTable).set(body).where(eq(platformSettingsTable.id, current.id)).returning();
  refreshPlatformSettingsCache(updated);

  await db.insert(auditLogsTable).values({ userId: req.user!.id, action: "UPDATE_SETTINGS", entity: "platform_settings", entityId: updated.id, details: body });
  res.json(updated);
});

// ─── COACH: STUDENT PROGRESS ──────────────────────────────────────────────────
router.get("/coach/courses/:id/students", requireRole("coach"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const courseId = parseInt(String(req.params.id));
  if (isNaN(courseId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId));
  if (!course || course.coachId !== req.user!.id) { res.status(403).json({ error: "Not authorized" }); return; }

  const [lessonCount] = await db.select({ cnt: count() }).from(lessonsTable).where(eq(lessonsTable.courseId, courseId));
  const totalLessons = lessonCount?.cnt ?? 0;

  const students = await db
    .select({ u: usersTable, completedCount: sql<number>`count(${progressTable.id})::int` })
    .from(enrollmentsTable)
    .innerJoin(usersTable, eq(enrollmentsTable.userId, usersTable.id))
    .leftJoin(progressTable, and(eq(progressTable.userId, usersTable.id), sql`${progressTable.lessonId} IN (SELECT id FROM lessons WHERE course_id = ${courseId})`))
    .where(eq(enrollmentsTable.courseId, courseId))
    .groupBy(usersTable.id);

  res.json(students.map(({ u, completedCount }) => ({
    id: u.id, name: u.name, email: u.email,
    completedLessons: completedCount,
    totalLessons,
    progressPercent: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0,
    isCompleted: completedCount >= totalLessons && totalLessons > 0,
  })));
});

// ─── COACH: PRICE REQUESTS ────────────────────────────────────────────────────
router.get("/coach/price-requests", requireRole("coach"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db
    .select({ pr: priceRequestsTable, c: coursesTable })
    .from(priceRequestsTable)
    .innerJoin(coursesTable, eq(priceRequestsTable.courseId, coursesTable.id))
    .where(eq(priceRequestsTable.coachId, req.user!.id))
    .orderBy(desc(priceRequestsTable.createdAt));
  res.json(rows.map(({ pr, c }) => ({
    id: pr.id, courseId: pr.courseId, courseTitle: c.title,
    requestedPrice: pr.requestedPrice, currentPrice: pr.currentPrice,
    currency: pr.currency, justification: pr.justification,
    status: pr.status, adminResponse: pr.adminResponse, counterPrice: pr.counterPrice,
    createdAt: pr.createdAt.toISOString(),
  })));
});

router.post("/coach/price-requests", requireRole("coach"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const { courseId, requestedPrice, justification } = req.body as any;
  if (!courseId || !requestedPrice) { res.status(400).json({ error: "courseId and requestedPrice required" }); return; }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId));
  if (!course || course.coachId !== req.user!.id) { res.status(403).json({ error: "Not authorized" }); return; }

  const [existing] = await db.select().from(priceRequestsTable)
    .where(and(eq(priceRequestsTable.courseId, courseId), eq(priceRequestsTable.status, "pending")));
  if (existing) { res.status(400).json({ error: "A pending request already exists for this course" }); return; }

  const [pr] = await db.insert(priceRequestsTable).values({
    coachId: req.user!.id, courseId, requestedPrice: String(requestedPrice),
    currentPrice: String(course.price), currency: course.currency,
    justification: justification ?? null,
  }).returning();

  res.status(201).json(pr);
});

export default router;
