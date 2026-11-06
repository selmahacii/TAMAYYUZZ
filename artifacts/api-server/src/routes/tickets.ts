import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, ticketsTable, usersTable, auditLogsTable } from "@workspace/db";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

function formatTicket(t: typeof ticketsTable.$inferSelect, userName: string, assigneeName?: string | null) {
  return {
    id: t.id,
    userId: t.userId,
    userName,
    assignedToId: t.assignedToId,
    assigneeName: assigneeName ?? null,
    subject: t.subject,
    description: t.description,
    status: t.status,
    priority: t.priority,
    category: t.category,
    resolution: t.resolution,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    resolvedAt: t.resolvedAt?.toISOString() ?? null,
  };
}

// User: create ticket
router.post("/tickets", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { subject, description, category, priority } = req.body as any;
  if (!subject?.trim() || !description?.trim()) { res.status(400).json({ error: "Subject and description required" }); return; }
  const [ticket] = await db.insert(ticketsTable).values({
    userId: req.user!.id,
    subject: subject.trim(),
    description: description.trim(),
    category: category ?? "other",
    priority: priority ?? "medium",
  }).returning();
  await db.insert(auditLogsTable).values({ userId: req.user!.id, action: "CREATE_TICKET", entity: "ticket", entityId: ticket.id });
  res.status(201).json(ticket);
});

// User: get own tickets
router.get("/tickets/my", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const tickets = await db.select().from(ticketsTable)
    .where(eq(ticketsTable.userId, req.user!.id))
    .orderBy(desc(ticketsTable.createdAt));
  res.json(tickets);
});

// Admin: get all tickets
router.get("/admin/tickets", requireRole("admin"), async (_req, res): Promise<void> => {
  const rows = await db
    .select({ t: ticketsTable, u: usersTable })
    .from(ticketsTable)
    .innerJoin(usersTable, eq(ticketsTable.userId, usersTable.id))
    .orderBy(desc(ticketsTable.createdAt));
  res.json(rows.map(({ t, u }) => formatTicket(t, u.name)));
});

// Admin: update ticket (assign, change status, resolve)
router.patch("/admin/tickets/:id", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { status, priority, assignedToId, resolution } = req.body as any;
  const updates: Partial<typeof ticketsTable.$inferInsert> = {};
  if (status !== undefined) updates.status = status;
  if (priority !== undefined) updates.priority = priority;
  if (assignedToId !== undefined) updates.assignedToId = assignedToId;
  if (resolution !== undefined) updates.resolution = resolution;
  if (status === "resolved") updates.resolvedAt = new Date();

  const [updated] = await db.update(ticketsTable).set(updates).where(eq(ticketsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Ticket not found" }); return; }
  await db.insert(auditLogsTable).values({ userId: req.user!.id, action: "UPDATE_TICKET", entity: "ticket", entityId: id, details: { status, resolution } });
  res.json(updated);
});

// Admin: delete ticket
router.delete("/admin/tickets/:id", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(ticketsTable).where(eq(ticketsTable.id, id));
  res.json({ message: "Deleted" });
});

export default router;
