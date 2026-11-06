import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
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

const router: IRouter = Router();

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
        const purchaseAmount = parseFloat(purchase.amount);
        const commissionRate = 0.7; // 70%
        const commissionAmount = (purchaseAmount * commissionRate).toFixed(2);

        await db.insert(commissionsTable).values({
          coachId: course.coachId,
          courseId: course.id,
          purchaseId: purchase.id,
          amount: commissionAmount,
          currency: purchase.currency,
          ratePercent: "70.00",
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
