import { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET must be set in production — refusing to start with an insecure default JWT secret.");
}
if (!process.env.SESSION_SECRET) {
  console.warn("[auth] SESSION_SECRET is not set — using an insecure default. Set SESSION_SECRET before deploying.");
}
export const JWT_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    name?: string;
    avatarUrl?: string | null;
    role: string;
    isApproved: boolean;
    tokenVersion: number;
  };
}

// In-memory revoked token ID set (for instant session invalidation)
export const revokedTokens = new Set<string>();

export function revokeToken(tokenIdOrSignature: string): void {
  revokedTokens.add(tokenIdOrSignature);
}

export function signToken(userId: number, tokenVersion: number = 1): string {
  return jwt.sign({ sub: userId, v: tokenVersion, jti: randomUUID() }, JWT_SECRET, { expiresIn: "7d" });
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (revokedTokens.has(token)) {
    res.status(401).json({ error: "Session révoquée, veuillez vous reconnecter" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as unknown as { sub: number; v?: number };
    const [user] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        avatarUrl: usersTable.avatarUrl,
        role: usersTable.role,
        isApproved: usersTable.isApproved,
        tokenVersion: usersTable.tokenVersion,
      })
      .from(usersTable)
      .where(eq(usersTable.id, payload.sub));

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Check token version if present in token payload
    if (payload.v !== undefined && payload.v !== user.tokenVersion) {
      res.status(401).json({ error: "Session invalidée suite à un changement de sécurité" });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(...roles: string[]) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    await requireAuth(req, res, () => {
      if (!req.user || !roles.includes(req.user.role)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      next();
    });
  };
}
