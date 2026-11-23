import { Router, type IRouter, type Request } from "express";
import { eq, and } from "drizzle-orm";
import { timingSafeEqual, createHmac } from "node:crypto";
import {
  db,
  purchasesTable,
  coursesTable,
  enrollmentsTable,
  invoicesTable,
  commissionsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { createNotification } from "./notifications";
import { logger } from "../lib/logger";
import { getPlatformSettings } from "../lib/settingsCache";

const router: IRouter = Router();

if (!process.env.PAYMENT_WEBHOOK_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("PAYMENT_WEBHOOK_SECRET must be set in production — refusing to start with an unverifiable payment webhook.");
}
if (!process.env.PAYMENT_WEBHOOK_SECRET) {
  console.warn("[payments] PAYMENT_WEBHOOK_SECRET is not set — using an insecure default. Set it before deploying.");
}
const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET ?? "dev-webhook-secret-change-me";

function isValidWebhookSignature(req: Request): boolean {
  const signature = req.headers["x-webhook-signature"];
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (typeof signature !== "string" || !rawBody) return false;

  const expected = createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const signatureBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}

// POST /api/payments/checkout - Initiates an automated checkout session
router.post("/payments/checkout", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { courseId, gateway } = req.body as {
      courseId?: number;
      gateway?: "chargily" | "satim" | "slickpay";
    };

    if (!courseId || isNaN(Number(courseId))) {
      res.status(400).json({ error: "courseId est requis" });
      return;
    }

    const selectedGateway = gateway ?? "chargily";

    // Verify course
    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, Number(courseId)));
    if (!course) {
      res.status(404).json({ error: "Formation introuvable" });
      return;
    }

    // Check if already enrolled or paid
    const [existingEnrollment] = await db
      .select()
      .from(enrollmentsTable)
      .where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, course.id)));
    if (existingEnrollment) {
      res.status(400).json({ error: "Vous êtes déjà inscrit à cette formation" });
      return;
    }

    const amount = parseFloat(course.price);
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    // Create purchase record in pending state
    const [purchase] = await db
      .insert(purchasesTable)
      .values({
        userId,
        courseId: course.id,
        amount: String(amount),
        currency: "DZD",
        paymentMethod: selectedGateway === "chargily" ? "card" : "card",
        status: "pending_verification",
      })
      .returning();

    // Create associated pending invoice
    await db.insert(invoicesTable).values({
      purchaseId: purchase.id,
      userId,
      invoiceNumber,
      amount: purchase.amount,
      currency: purchase.currency,
      status: "issued",
    });

    // Simulated gateway checkout URL for integration
    const checkoutUrl = `/checkout/gateway-simulation?paymentId=${purchase.id}&gateway=${selectedGateway}&amount=${amount}`;

    res.status(201).json({
      success: true,
      purchaseId: purchase.id,
      gateway: selectedGateway,
      amount,
      currency: "DZD",
      checkoutUrl,
      message: `Session de paiement ${selectedGateway.toUpperCase()} initialisée`,
    });
  } catch (err: any) {
    console.error("Payments checkout error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/webhook - Webhook listener for IPN / payment callbacks
router.post("/payments/webhook", async (req, res): Promise<void> => {
  if (!isValidWebhookSignature(req)) {
    logger.warn({ ip: req.ip }, "Rejected payment webhook: invalid or missing signature");
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  try {
    const { event, data } = req.body as {
      event?: string;
      data?: {
        purchaseId?: number;
        status?: "paid" | "failed";
        gateway?: string;
        transactionId?: string;
      };
    };

    const purchaseId = data?.purchaseId ? Number(data.purchaseId) : null;
    if (!purchaseId) {
      res.status(400).json({ error: "Invalid webhook payload: purchaseId required" });
      return;
    }

    const [purchase] = await db.select().from(purchasesTable).where(eq(purchasesTable.id, purchaseId));
    if (!purchase) {
      res.status(404).json({ error: "Purchase not found" });
      return;
    }

    if (purchase.status === "paid") {
      res.json({ message: "Purchase already processed" });
      return;
    }

    const isSuccess = data?.status === "paid" || event === "checkout.paid";

    if (isSuccess) {
      // 1. Mark purchase as paid
      const [updatedPurchase] = await db
        .update(purchasesTable)
        .set({
          status: "paid",
          paidAt: new Date(),
        })
        .where(eq(purchasesTable.id, purchase.id))
        .returning();

      // 2. Enroll student
      await db
        .insert(enrollmentsTable)
        .values({
          userId: purchase.userId,
          courseId: purchase.courseId,
        })
        .onConflictDoNothing();

      // 3. Mark invoice paid
      await db
        .update(invoicesTable)
        .set({ status: "paid", paidAt: new Date() })
        .where(eq(invoicesTable.purchaseId, purchase.id));

      // 4. Generate coach commission
      const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, purchase.courseId));
      if (course && course.coachId) {
        const settings = await getPlatformSettings();
        const ratePercent = parseFloat(settings.defaultCommissionRate) || 70;
        const purchaseAmount = parseFloat(purchase.amount);
        const commissionAmount = (purchaseAmount * (ratePercent / 100)).toFixed(2);

        await db.insert(commissionsTable).values({
          coachId: course.coachId,
          courseId: course.id,
          purchaseId: purchase.id,
          amount: commissionAmount,
          currency: purchase.currency,
          ratePercent: ratePercent.toFixed(2),
          isPaid: false,
          status: "pending",
        });

        // Notify coach
        await createNotification({
          userId: course.coachId,
          title: "Nouvelle vente confirmée !",
          message: `Un étudiant a acheté "${course.title}". Commission créditée : ${commissionAmount} DZD.`,
          type: "success",
          link: "/coach/earnings",
        });
      }

      // 5. Notify student
      await createNotification({
        userId: purchase.userId,
        title: "Paiement en ligne validé !",
        message: `Votre accès à la formation "${course?.title ?? "Formation"}" est maintenant débloqué. Bon apprentissage !`,
        type: "success",
        link: `/student/learn/${purchase.courseId}`,
      });

      res.json({ success: true, status: "paid", purchase: updatedPurchase });
    } else {
      await db
        .update(purchasesTable)
        .set({ status: "rejected", rejectionReason: "Échec de transaction passerelle bancaire" })
        .where(eq(purchasesTable.id, purchase.id));

      res.json({ success: false, status: "failed" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/:id/status - Status check endpoint
router.get("/payments/:id/status", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid payment ID" });
    return;
  }

  const [purchase] = await db.select().from(purchasesTable).where(eq(purchasesTable.id, id));
  if (!purchase) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  const isOwner = purchase.userId === req.user!.id;
  const isAdmin = req.user!.role === "admin";
  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json({
    id: purchase.id,
    status: purchase.status,
    amount: purchase.amount,
    currency: purchase.currency,
    paymentMethod: purchase.paymentMethod,
    paidAt: purchase.paidAt?.toISOString() ?? null,
  });
});

export default router;
