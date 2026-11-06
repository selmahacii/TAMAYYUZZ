import { Router } from "express";
import { eq, desc, asc, and, inArray, sql } from "drizzle-orm";
import { db, payoutsTable, usersTable, commissionsTable, auditLogsTable } from "@workspace/db";
import { requireRole, type AuthenticatedRequest } from "../middlewares/auth";
import { createNotification } from "./notifications";

const router = Router();

// Get all payouts with coach information (Admin only)
router.get("/admin/payouts", requireRole("admin"), async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select({
        payout: payoutsTable,
        coach: usersTable,
      })
      .from(payoutsTable)
      .innerJoin(usersTable, eq(payoutsTable.coachId, usersTable.id))
      .orderBy(desc(payoutsTable.createdAt));

    res.json(rows.map(row => ({
      ...row.payout,
      coachName: row.coach.name,
      coachEmail: row.coach.email,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create payout record (Admin only)
router.post("/admin/payouts", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { coachId, amount, currency, paymentMethod, referenceNumber, notes } = req.body as any;
    if (!coachId || !amount) {
      res.status(400).json({ error: "coachId and amount are required" });
      return;
    }

    // Verify coach exists
    const [coach] = await db.select().from(usersTable).where(eq(usersTable.id, coachId));
    if (!coach || coach.role !== "coach") {
      res.status(400).json({ error: "Invalid coach ID" });
      return;
    }

    const [payout] = await db.insert(payoutsTable).values({
      coachId,
      amount: String(amount),
      currency: currency ?? "DZD",
      paymentMethod: paymentMethod ?? "bank_transfer",
      referenceNumber: referenceNumber ?? null,
      notes: notes ?? null,
      status: "processed", // Default processed for manual registry entries
      processedAt: new Date(),
    }).returning();

    // Settle pending commissions up to the entered payout amount (oldest first),
    // linking each settled commission to this payout for a reconcilable ledger.
    // A commission is only marked paid if it's fully covered — no partial settlement.
    const pendingCommissions = await db
      .select()
      .from(commissionsTable)
      .where(and(eq(commissionsTable.coachId, coachId), eq(commissionsTable.isPaid, false)))
      .orderBy(asc(commissionsTable.createdAt));

    let remaining = parseFloat(String(amount));
    const settledIds: number[] = [];
    for (const c of pendingCommissions) {
      const cAmount = parseFloat(c.amount);
      if (cAmount <= remaining + 0.01) {
        settledIds.push(c.id);
        remaining -= cAmount;
      }
    }
    if (settledIds.length > 0) {
      await db.update(commissionsTable)
        .set({ isPaid: true, status: "paid", paidAt: new Date(), payoutId: payout.id })
        .where(inArray(commissionsTable.id, settledIds));
    }

    await db.insert(auditLogsTable).values({
      userId: req.user!.id, action: "CREATE_PAYOUT", entity: "payout", entityId: payout.id,
      details: { coachId, amount: payout.amount, currency: payout.currency, settledCommissionIds: settledIds },
    });

    res.status(201).json({
      ...payout,
      coachName: coach.name,
      coachEmail: coach.email,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update payout status/reference (Admin only)
router.patch("/admin/payouts/:id", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const { status, referenceNumber, notes } = req.body as any;
    const updates: Partial<typeof payoutsTable.$inferInsert> = {};
    if (status) {
      updates.status = status;
      if (status === "processed") {
        updates.processedAt = new Date();
      }
    }
    if (referenceNumber !== undefined) updates.referenceNumber = referenceNumber;
    if (notes !== undefined) updates.notes = notes;

    const [payout] = await db.update(payoutsTable).set(updates).where(eq(payoutsTable.id, id)).returning();
    if (!payout) {
      res.status(404).json({ error: "Payout not found" });
      return;
    }

    // If the payout is rejected, revert any commissions that were settled against it —
    // the coach was never actually paid, so their balance must go back to pending.
    if (status === "rejected") {
      await db.update(commissionsTable)
        .set({ isPaid: false, status: "pending", paidAt: null, payoutId: null })
        .where(eq(commissionsTable.payoutId, payout.id));

      await createNotification({
        userId: payout.coachId,
        title: "Demande de retrait rejetée",
        message: `Votre demande de virement de ${payout.amount} ${payout.currency} n'a pas pu aboutir. ${notes ? `Motif: ${notes}` : ""}`,
        type: "warning",
        link: "/coach/earnings",
      });
    } else if (status === "processed") {
      await createNotification({
        userId: payout.coachId,
        title: "Virement exécuté !",
        message: `Votre virement de ${payout.amount} ${payout.currency} a été traité par notre équipe financière. N° de référence : ${referenceNumber || "Banque / CCP"}.`,
        type: "success",
        link: "/coach/earnings",
      });
    }

    await db.insert(auditLogsTable).values({
      userId: req.user!.id, action: "UPDATE_PAYOUT", entity: "payout", entityId: payout.id, details: { status, referenceNumber, notes },
    });

    const [coach] = await db.select().from(usersTable).where(eq(usersTable.id, payout.coachId));

    res.json({
      ...payout,
      coachName: coach?.name ?? "",
      coachEmail: coach?.email ?? "",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── COACH PAYOUT ENDPOINTS ──────────────────────────────────────────────────

// Get coach's own payouts history
router.get("/coach/payouts", requireRole("coach"), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const coachId = req.user!.id;
    const payouts = await db
      .select()
      .from(payoutsTable)
      .where(eq(payoutsTable.coachId, coachId))
      .orderBy(desc(payoutsTable.createdAt));

    res.json(payouts.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      processedAt: p.processedAt?.toISOString() ?? null,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Coach submits a payout request
router.post("/coach/payout-requests", requireRole("coach"), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const coachId = req.user!.id;
    const { amount, rip, paymentMethod = "baridimob", notes } = req.body as {
      amount?: number;
      rip?: string;
      paymentMethod?: string;
      notes?: string;
    };

    const numAmount = parseFloat(String(amount || 0));
    if (isNaN(numAmount) || numAmount < 1000) {
      res.status(400).json({ error: "Le montant minimum de retrait est de 1 000 DZD" });
      return;
    }

    if (!rip || !rip.trim()) {
      res.status(400).json({ error: "Le RIP CCP / BaridiMob est requis" });
      return;
    }

    // Verify coach is approved
    const [coach] = await db.select().from(usersTable).where(eq(usersTable.id, coachId));
    if (!coach || !coach.isApproved) {
      res.status(403).json({ error: "Votre compte coach doit être validé avant d'effectuer un retrait" });
      return;
    }

    // Calculate coach available unpaid commissions
    const [pendingComm] = await db
      .select({ total: sql<string>`coalesce(sum(amount), 0)::text` })
      .from(commissionsTable)
      .where(and(eq(commissionsTable.coachId, coachId), eq(commissionsTable.isPaid, false)));

    const availableBalance = parseFloat(pendingComm?.total ?? "0");
    if (numAmount > availableBalance) {
      res.status(400).json({
        error: `Solde insuffisant. Votre solde disponible est de ${availableBalance.toFixed(0)} DZD.`,
      });
      return;
    }

    const [payout] = await db.insert(payoutsTable).values({
      coachId,
      amount: String(numAmount),
      currency: "DZD",
      paymentMethod,
      notes: `RIP: ${rip.trim()}${notes ? ` - ${notes.trim()}` : ""}`,
      status: "pending",
    }).returning();

    // Notify all admins of the new payout request
    const admins = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "admin"));
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        title: "Nouvelle demande de retrait coach",
        message: `${coach.name} a demandé un virement de ${numAmount.toLocaleString("fr-DZ")} DZD (RIP: ${rip.trim()}).`,
        type: "info",
        link: "/admin/payouts",
      });
    }

    res.status(201).json({
      ...payout,
      createdAt: payout.createdAt.toISOString(),
      message: "Demande de virement enregistrée avec succès",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
