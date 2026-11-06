import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, auditLogsTable } from "@workspace/db";
import { UpdateProfileBody } from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isApproved: user.isApproved,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
    phone: user.phone ?? null,
    domain: user.domain ?? null,
    diplomas: user.diplomas ?? [],
    priorTrainings: user.priorTrainings ?? [],
    teachingPlan: user.teachingPlan ?? null,
    interests: user.interests ?? [],
    createdAt: user.createdAt.toISOString(),
  };
}

router.get("/users/profile", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
});

router.patch("/users/profile", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates = { ...parsed.data };
  if (updates.diplomas) {
    // A diploma can only be "verified" by an admin (via the dedicated verify endpoint).
    // If the user resubmits an unchanged diploma (same name + document), its existing
    // verified status is preserved; any new or edited diploma is forced back to unverified.
    const [current] = await db.select({ diplomas: usersTable.diplomas }).from(usersTable).where(eq(usersTable.id, req.user.id));
    const existing = current?.diplomas ?? [];
    updates.diplomas = updates.diplomas.map((d) => {
      const match = existing.find((e) => e.name === d.name && e.documentUrl === d.documentUrl);
      return { ...d, verified: match?.verified ?? false };
    });
  }

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.user.id))
    .returning();

  try {
    await db.insert(auditLogsTable).values({
      userId: req.user.id,
      action: "UPDATE_PROFILE",
      entity: "user",
      entityId: user.id,
      details: { updatedFields: Object.keys(updates) },
      ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    });
  } catch (e) {
    console.error("Audit log error on update profile:", e);
  }

  res.json(formatUser(user));
});

export default router;
