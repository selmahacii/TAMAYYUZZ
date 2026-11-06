import { Router, type IRouter } from "express";
import { eq, and, desc, or } from "drizzle-orm";
import { db, announcementsTable, usersTable, auditLogsTable } from "@workspace/db";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

function formatAnnouncement(a: typeof announcementsTable.$inferSelect, authorName: string) {
  return {
    id: a.id,
    authorId: a.authorId,
    authorName,
    title: a.title,
    content: a.content,
    imageUrl: a.imageUrl,
    type: a.type,
    isPublished: a.isPublished,
    isPinned: a.isPinned,
    isApproved: a.isApproved,
    expiresAt: a.expiresAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

// Public: get published announcements/ads
router.get("/announcements", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ a: announcementsTable, u: usersTable })
    .from(announcementsTable)
    .innerJoin(usersTable, eq(announcementsTable.authorId, usersTable.id))
    .where(and(eq(announcementsTable.isPublished, true), eq(announcementsTable.isApproved, true)))
    .orderBy(desc(announcementsTable.isPinned), desc(announcementsTable.createdAt))
    .limit(50);
  res.json(rows.map(({ a, u }) => formatAnnouncement(a, u.name)));
});

// Coach: create ad/article
router.post("/announcements", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const user = req.user!;
  if (!["coach", "admin"].includes(user.role)) { res.status(403).json({ error: "Only coaches and admins can post" }); return; }

  const { title, content, imageUrl, type, expiresAt } = req.body as { title: string; content: string; imageUrl?: string; type?: string; expiresAt?: string };
  if (!title?.trim() || !content?.trim()) { res.status(400).json({ error: "Title and content required" }); return; }

  const allowedType = (type === "ad" || type === "article") ? type : "announcement";

  const [created] = await db.insert(announcementsTable).values({
    authorId: user.id,
    title: title.trim(),
    content: content.trim(),
    imageUrl: imageUrl ?? null,
    type: user.role === "admin" ? (allowedType as any) : "ad",
    isPublished: user.role === "admin",
    isApproved: user.role === "admin",
    isPinned: false,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }).returning();

  // Audit log
  await db.insert(auditLogsTable).values({ userId: user.id, action: "CREATE", entity: "announcement", entityId: created.id, details: { title } });

  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));
  res.status(201).json(formatAnnouncement(created, author.name));
});

// Admin: get all announcements (including pending)
router.get("/admin/announcements", requireRole("admin"), async (_req, res): Promise<void> => {
  const rows = await db
    .select({ a: announcementsTable, u: usersTable })
    .from(announcementsTable)
    .innerJoin(usersTable, eq(announcementsTable.authorId, usersTable.id))
    .orderBy(desc(announcementsTable.createdAt));
  res.json(rows.map(({ a, u }) => formatAnnouncement(a, u.name)));
});

// Admin: approve/publish
router.patch("/admin/announcements/:id/approve", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [updated] = await db.update(announcementsTable).set({ isApproved: true, isPublished: true }).where(eq(announcementsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  await db.insert(auditLogsTable).values({ userId: req.user!.id, action: "APPROVE", entity: "announcement", entityId: id });
  res.json(updated);
});

// Admin: update
router.put("/admin/announcements/:id", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { title, content, imageUrl, type, isPinned, isPublished, isApproved, expiresAt } = req.body as any;
  const [updated] = await db.update(announcementsTable)
    .set({ title, content, imageUrl, type, isPinned, isPublished, isApproved, expiresAt: expiresAt ? new Date(expiresAt) : null })
    .where(eq(announcementsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  await db.insert(auditLogsTable).values({ userId: req.user!.id, action: "UPDATE", entity: "announcement", entityId: id });
  res.json(updated);
});

// Delete
router.delete("/admin/announcements/:id", requireRole("admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
  await db.insert(auditLogsTable).values({ userId: req.user!.id, action: "DELETE", entity: "announcement", entityId: id });
  res.json({ message: "Deleted" });
});

// Coach delete own ad
router.delete("/announcements/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  const user = req.user!;
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [existing] = await db.select().from(announcementsTable).where(eq(announcementsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (existing.authorId !== user.id && user.role !== "admin") { res.status(403).json({ error: "Not authorized" }); return; }
  await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
  res.json({ message: "Deleted" });
});

// Coach: get own ads
router.get("/coach/announcements", requireRole("coach"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db.select().from(announcementsTable)
    .where(eq(announcementsTable.authorId, req.user!.id))
    .orderBy(desc(announcementsTable.createdAt));
  res.json(rows);
});

export default router;
