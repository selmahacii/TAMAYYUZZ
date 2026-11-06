import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable, auditLogsTable } from "@workspace/db";
import bcrypt from "bcrypt";
import {
  RegisterBody,
  LoginBody,
} from "@workspace/api-zod";
import { signToken, requireAuth, revokeToken, type AuthenticatedRequest } from "../middlewares/auth";

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

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, password, role, phone, domain, diplomas, priorTrainings, teachingPlan, interests } = parsed.data;

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const isApproved = role === "student";

  const [user] = await db
    .insert(usersTable)
    .values({
      name, email, passwordHash, role, isApproved,
      phone: phone ?? null,
      domain: domain ?? null,
      // verified is always forced false here — only an admin can flip it, via the dedicated verify endpoint
      diplomas: role === "coach" ? (diplomas ?? []).map((d) => ({ ...d, verified: false })) : [],
      priorTrainings: role === "coach" ? (priorTrainings ?? []) : [],
      teachingPlan: role === "coach" ? (teachingPlan ?? null) : null,
      interests: role === "student" ? (interests ?? []) : [],
    })
    .returning();

  try {
    await db.insert(auditLogsTable).values({
      userId: user.id,
      action: "REGISTER",
      entity: "user",
      entityId: user.id,
      details: { role: user.role, email: user.email, name: user.name },
      ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    });
  } catch (e) {
    console.error("Audit log error on register:", e);
  }

  const token = signToken(user.id, user.tokenVersion);

  res.status(201).json({ user: formatUser(user), token });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  try {
    await db.insert(auditLogsTable).values({
      userId: user.id,
      action: "LOGIN",
      entity: "user",
      entityId: user.id,
      details: { email: user.email, role: user.role },
      ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    });
  } catch (e) {
    console.error("Audit log error on login:", e);
  }

  const token = signToken(user.id, user.tokenVersion);
  res.json({ user: formatUser(user), token });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    revokeToken(authHeader.slice(7));
  }
  res.json({ message: "Logged out" });
});

// Revoke all existing sessions for the current user (e.g. after password change or suspicious activity)
router.post("/auth/revoke-sessions", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user!.id;
  await db.update(usersTable)
    .set({ tokenVersion: sql`${usersTable.tokenVersion} + 1` })
    .where(eq(usersTable.id, userId));

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    revokeToken(authHeader.slice(7));
  }

  try {
    await db.insert(auditLogsTable).values({
      userId,
      action: "REVOKE_ALL_SESSIONS",
      entity: "user",
      entityId: userId,
      details: { reason: "User requested full session invalidation" },
      ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    });
  } catch (e) {
    console.error("Audit log error on revoke sessions:", e);
  }

  res.json({ message: "All sessions have been revoked successfully" });
});

// Forgot password / Reset simulation (since no external SMTP is configured)
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email, newPassword } = req.body as { email?: string; newPassword?: string };
  if (!email || !email.trim()) {
    res.status(400).json({ error: "L'adresse email est requise" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.trim()));
  if (!user) {
    // Security best practice: don't reveal email existence, but here simulate confirmation
    res.json({ message: "Si cet email existe, les instructions de réinitialisation ont été générées." });
    return;
  }

  if (newPassword && newPassword.length >= 6) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(usersTable)
      .set({
        passwordHash,
        tokenVersion: sql`${usersTable.tokenVersion} + 1`,
      })
      .where(eq(usersTable.id, user.id));

    try {
      await db.insert(auditLogsTable).values({
        userId: user.id,
        action: "RESET_PASSWORD",
        entity: "user",
        entityId: user.id,
        details: { email: user.email },
        ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
        userAgent: req.headers["user-agent"] || null,
      });
    } catch (e) {
      console.error("Audit log error on reset password:", e);
    }

    res.json({ message: "Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter." });
    return;
  }

  res.json({
    message: "Email validé. Veuillez fournir votre nouveau mot de passe.",
    userExists: true,
  });
});

// Authenticated password change
router.post("/auth/change-password", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user!.id;
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "Mot de passe actuel et nouveau mot de passe (min 6 caractères) requis" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "Utilisateur introuvable" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Le mot de passe actuel est incorrect" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db
    .update(usersTable)
    .set({
      passwordHash,
      tokenVersion: sql`${usersTable.tokenVersion} + 1`,
    })
    .where(eq(usersTable.id, userId));

  try {
    await db.insert(auditLogsTable).values({
      userId,
      action: "CHANGE_PASSWORD",
      entity: "user",
      entityId: userId,
      details: { email: user.email },
      ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    });
  } catch (e) {
    console.error("Audit log error on change password:", e);
  }

  res.json({ success: true, message: "Mot de passe modifié avec succès" });
});

router.get("/auth/me", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
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

export { formatUser };
export default router;
