import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";
import { UPLOADS_DIR } from "./routes/uploads";
import { getPlatformSettings } from "./lib/settingsCache";
import { JWT_SECRET } from "./middlewares/auth";

const MAINTENANCE_ALLOWLIST = ["/api/healthz", "/api/auth/login", "/api/admin/settings"];

async function maintenanceGate(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (MAINTENANCE_ALLOWLIST.some((p) => req.path.startsWith(p))) { next(); return; }

  const settings = await getPlatformSettings();
  if (!settings.maintenanceMode) { next(); return; }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET) as unknown as { sub: number };
      const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, payload.sub));
      if (user?.role === "admin") { next(); return; }
    } catch { /* fall through to maintenance response */ }
  }

  res.status(503).json({ error: "La plateforme est actuellement en maintenance. Veuillez réessayer plus tard." });
}

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/uploads", express.static(UPLOADS_DIR));
app.use("/api", maintenanceGate, router);

export default app;
