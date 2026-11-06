import { Router } from "express";
import { db, couponsTable, coursesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

router.get("/coupons", requireRole("admin"), async (_req, res): Promise<void> => {
  const coupons = await db.select().from(couponsTable).orderBy(couponsTable.createdAt);
  const withCourseName = await Promise.all(
    coupons.map(async (c) => {
      if (!c.courseId) return { ...c, createdAt: c.createdAt.toISOString(), expiresAt: c.expiresAt?.toISOString() ?? null, courseName: null };
      const [course] = await db.select({ title: coursesTable.title }).from(coursesTable).where(eq(coursesTable.id, c.courseId));
      return { ...c, createdAt: c.createdAt.toISOString(), expiresAt: c.expiresAt?.toISOString() ?? null, courseName: course?.title ?? null };
    })
  );
  res.json(withCourseName);
});

router.post("/coupons", requireRole("admin"), async (_req, res): Promise<void> => {
  const body = _req.body as { code?: string; discountPercent?: number; maxUses?: number | null; expiresAt?: string | null; courseId?: number | null; isActive?: boolean };
  if (!body.code || typeof body.discountPercent !== "number") { res.status(400).json({ error: "code et discountPercent requis" }); return; }

  const [coupon] = await db.insert(couponsTable).values({
    code: body.code.toUpperCase(),
    discountPercent: body.discountPercent,
    maxUses: body.maxUses ?? null,
    expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    courseId: body.courseId ?? null,
    isActive: body.isActive ?? true,
  }).returning();

  let courseName: string | null = null;
  if (coupon.courseId) {
    const [course] = await db.select({ title: coursesTable.title }).from(coursesTable).where(eq(coursesTable.id, coupon.courseId));
    courseName = course?.title ?? null;
  }
  res.status(201).json({ ...coupon, createdAt: coupon.createdAt.toISOString(), expiresAt: coupon.expiresAt?.toISOString() ?? null, courseName });
});

router.delete("/coupons/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  await db.delete(couponsTable).where(eq(couponsTable.id, id));
  res.json({ message: "Coupon supprimé" });
});

router.post("/coupons/validate", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { code, courseId } = req.body as { code?: string; courseId?: number };
  if (!code || !courseId) { res.status(400).json({ error: "code et courseId requis" }); return; }

  const [coupon] = await db.select().from(couponsTable)
    .where(and(eq(couponsTable.code, code.toUpperCase()), eq(couponsTable.isActive, true)));

  if (!coupon) { res.json({ valid: false, discountPercent: 0, discountedPrice: 0, message: "Code invalide" }); return; }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) { res.json({ valid: false, discountPercent: 0, discountedPrice: 0, message: "Code expiré" }); return; }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) { res.json({ valid: false, discountPercent: 0, discountedPrice: 0, message: "Code épuisé" }); return; }
  if (coupon.courseId !== null && coupon.courseId !== courseId) { res.json({ valid: false, discountPercent: 0, discountedPrice: 0, message: "Non applicable à ce cours" }); return; }

  const [course] = await db.select({ price: coursesTable.price }).from(coursesTable).where(eq(coursesTable.id, courseId));
  const basePrice = parseFloat(course?.price ?? "0");
  const discountedPrice = Math.max(0, basePrice * (1 - coupon.discountPercent / 100));

  res.json({ valid: true, discountPercent: coupon.discountPercent, discountedPrice, message: `Réduction de ${coupon.discountPercent}%` });
});

export default router;
