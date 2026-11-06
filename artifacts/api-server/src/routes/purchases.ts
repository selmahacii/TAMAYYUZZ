import { Router } from "express";
import { db, purchasesTable, coursesTable, enrollmentsTable, couponsTable, usersTable, invoicesTable, commissionsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

router.get("/purchases/my", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user!.id;
  const purchases = await db
    .select({
      id: purchasesTable.id,
      userId: purchasesTable.userId,
      courseId: purchasesTable.courseId,
      amount: purchasesTable.amount,
      currency: purchasesTable.currency,
      couponCode: purchasesTable.couponCode,
      discountApplied: purchasesTable.discountApplied,
      status: purchasesTable.status,
      paymentMethod: purchasesTable.paymentMethod,
      receiptUrl: purchasesTable.receiptUrl,
      rejectionReason: purchasesTable.rejectionReason,
      paidAt: purchasesTable.paidAt,
      courseTitle: coursesTable.title,
      courseCategory: coursesTable.category,
      courseImageUrl: coursesTable.imageUrl,
      courseLevel: coursesTable.level,
      courseIsFree: coursesTable.isFree,
      coursePrice: coursesTable.price,
      courseCurrency: coursesTable.currency,
      courseIsPublished: coursesTable.isPublished,
      courseDurationHours: coursesTable.durationHours,
      courseCreatedAt: coursesTable.createdAt,
      courseCoachId: coursesTable.coachId,
      courseDescription: coursesTable.description,
      invoiceNumber: invoicesTable.invoiceNumber,
      invoiceStatus: invoicesTable.status,
    })
    .from(purchasesTable)
    .innerJoin(coursesTable, eq(purchasesTable.courseId, coursesTable.id))
    .leftJoin(invoicesTable, eq(invoicesTable.purchaseId, purchasesTable.id))
    .where(eq(purchasesTable.userId, userId))
    .orderBy(sql`${purchasesTable.paidAt} desc`);

  const withMeta = await Promise.all(
    purchases.map(async (p) => {
      const [coach] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, p.courseCoachId));
      const [{ cnt }] = await db.select({ cnt: sql<number>`count(*)::int` }).from(enrollmentsTable).where(eq(enrollmentsTable.courseId, p.courseId));
      return {
        id: p.id, userId: p.userId, courseId: p.courseId,
        amount: p.amount, currency: p.currency, couponCode: p.couponCode,
        discountApplied: p.discountApplied,
        status: p.status, paymentMethod: p.paymentMethod,
        receiptUrl: p.receiptUrl, rejectionReason: p.rejectionReason,
        paidAt: p.paidAt.toISOString(),
        invoiceNumber: p.invoiceNumber, invoiceStatus: p.invoiceStatus,
        course: {
          id: p.courseId, title: p.courseTitle, description: p.courseDescription,
          category: p.courseCategory, imageUrl: p.courseImageUrl, coachId: p.courseCoachId,
          coachName: coach?.name ?? "", isPublished: p.courseIsPublished,
          enrollmentCount: cnt ?? 0, durationHours: p.courseDurationHours,
          level: p.courseLevel, isFree: p.courseIsFree, price: p.coursePrice,
          currency: p.courseCurrency, createdAt: p.courseCreatedAt.toISOString(),
        },
      };
    })
  );
  res.json(withMeta);
});

router.post("/purchases", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user!.id;
  const {
    courseId,
    couponCode,
    paymentMethod = "card",
    receiptUrl = null,
  } = req.body as {
    courseId?: number;
    couponCode?: string;
    paymentMethod?: "card" | "baridimob" | "ccp" | "free";
    receiptUrl?: string | null;
  };

  if (!courseId || typeof courseId !== "number") { res.status(400).json({ error: "courseId requis" }); return; }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId));
  if (!course) { res.status(404).json({ error: "Cours introuvable" }); return; }

  // Check existing purchase
  const [existingPurchase] = await db.select().from(purchasesTable)
    .where(and(eq(purchasesTable.userId, userId), eq(purchasesTable.courseId, courseId)));

  if (existingPurchase) {
    if (existingPurchase.status === "paid") {
      res.status(400).json({ error: "Vous possédez déjà ce cours" });
      return;
    }
    if (existingPurchase.status === "pending_verification") {
      res.status(400).json({ error: "Votre preuve de paiement pour ce cours est déjà en cours de vérification par l'administrateur" });
      return;
    }
  }

  const existingEnroll = await db.select({ id: enrollmentsTable.id }).from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, courseId)));
  if (existingEnroll.length > 0) { res.status(400).json({ error: "Déjà inscrit" }); return; }

  let discountPercent = 0;
  let appliedCouponCode: string | null = null;
  let couponId: number | null = null;

  if (couponCode && typeof couponCode === "string") {
    const [coupon] = await db.select().from(couponsTable)
      .where(and(eq(couponsTable.code, couponCode.toUpperCase()), eq(couponsTable.isActive, true)));
    if (!coupon) { res.status(400).json({ error: "Coupon invalide" }); return; }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) { res.status(400).json({ error: "Coupon expiré" }); return; }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) { res.status(400).json({ error: "Coupon épuisé" }); return; }
    if (coupon.courseId !== null && coupon.courseId !== courseId) { res.status(400).json({ error: "Coupon non applicable" }); return; }
    discountPercent = coupon.discountPercent;
    appliedCouponCode = couponCode.toUpperCase();
    couponId = coupon.id;
  }

  const basePrice = parseFloat(course.price ?? "0");
  const discountAmount = basePrice * (discountPercent / 100);
  const finalAmount = Math.max(0, basePrice - discountAmount);

  // Determine initial status based on payment method and course price
  const isFree = course.isFree || finalAmount === 0;
  const isOfflineVerification = !isFree && (paymentMethod === "baridimob" || paymentMethod === "ccp");

  if (isOfflineVerification && !receiptUrl) {
    res.status(400).json({ error: "Veuillez téléverser la preuve ou le reçu de votre virement CCP / BaridiMob" });
    return;
  }

  const initialStatus = isFree ? "paid" : (isOfflineVerification ? "pending_verification" : "paid");

  // Upsert if previous purchase was rejected
  let purchase: typeof purchasesTable.$inferSelect;
  if (existingPurchase && existingPurchase.status === "rejected") {
    const [updated] = await db.update(purchasesTable).set({
      amount: finalAmount.toFixed(2),
      currency: course.currency ?? "DZD",
      couponCode: appliedCouponCode,
      discountApplied: discountAmount.toFixed(2),
      status: initialStatus,
      paymentMethod,
      receiptUrl,
      rejectionReason: null,
      paidAt: new Date(),
    }).where(eq(purchasesTable.id, existingPurchase.id)).returning();
    purchase = updated;
  } else {
    const [created] = await db.insert(purchasesTable).values({
      userId,
      courseId,
      amount: finalAmount.toFixed(2),
      currency: course.currency ?? "DZD",
      couponCode: appliedCouponCode,
      discountApplied: discountAmount.toFixed(2),
      status: initialStatus,
      paymentMethod: isFree ? "free" : paymentMethod,
      receiptUrl: isOfflineVerification ? receiptUrl : null,
    }).returning();
    purchase = created;
  }

  if (couponId) {
    await db.update(couponsTable).set({ usedCount: sql`${couponsTable.usedCount} + 1` }).where(eq(couponsTable.id, couponId));
  }

  // If status is paid, immediately enroll and credit invoice/commissions
  if (initialStatus === "paid") {
    await db.insert(enrollmentsTable).values({ userId, courseId }).onConflictDoNothing();

    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await db.insert(invoicesTable).values({
      invoiceNumber,
      userId,
      purchaseId: purchase.id,
      amount: purchase.amount,
      currency: purchase.currency,
      status: "paid",
      paidAt: new Date(),
    });

    const commissionAmount = (parseFloat(purchase.amount) * 0.70).toFixed(2);
    await db.insert(commissionsTable).values({
      coachId: course.coachId,
      purchaseId: purchase.id,
      courseId,
      amount: commissionAmount,
      currency: purchase.currency,
      ratePercent: "70",
      status: "pending",
      isPaid: false,
    });
  } else {
    // For pending verification, create invoice as issued (awaiting confirmation)
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await db.insert(invoicesTable).values({
      invoiceNumber,
      userId,
      purchaseId: purchase.id,
      amount: purchase.amount,
      currency: purchase.currency,
      status: "issued",
      notes: `Paiement ${paymentMethod.toUpperCase()} en attente de vérification administrative.`,
    });
  }

  const [coach] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, course.coachId));
  const [{ cnt }] = await db.select({ cnt: sql<number>`count(*)::int` }).from(enrollmentsTable).where(eq(enrollmentsTable.courseId, courseId));

  res.status(201).json({
    ...purchase,
    paidAt: purchase.paidAt.toISOString(),
    course: { ...course, coachName: coach?.name ?? "", enrollmentCount: cnt ?? 0, createdAt: course.createdAt.toISOString() },
  });
});

export default router;
