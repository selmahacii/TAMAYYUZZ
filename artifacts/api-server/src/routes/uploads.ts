import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { db, usersTable, coursesTable, purchasesTable, certificateTemplatesTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

// __dirname is polyfilled to the bundled dist directory by build.mjs's banner,
// so this resolves to artifacts/api-server/uploads regardless of invoking cwd.
export const UPLOADS_DIR = path.resolve(__dirname, "..", "uploads");
mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime",
  "application/pdf",
]);

// Dangerous extensions strictly blocked regardless of MIME type
const FORBIDDEN_EXTENSIONS = new Set([
  ".php", ".phtml", ".php3", ".php4", ".php5", ".phps",
  ".html", ".htm", ".xhtml",
  ".js", ".mjs", ".cjs", ".ts",
  ".exe", ".bat", ".cmd", ".sh", ".bash", ".ps1", ".vbs",
  ".svg", ".xml", // block SVG/XML script injection risks
  ".dll", ".so", ".bin",
]);

const MAX_BYTES_BY_KIND: Record<string, number> = {
  image: 4 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  application: 8 * 1024 * 1024,
};

// ── Rate limiter in memory by client IP ─────────────────────────
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const uploadRateLimits = new Map<string, RateLimitEntry>();
const MAX_UPLOADS_PER_WINDOW = 30; // Max 30 uploads per 15 minutes per IP
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function uploadRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown_ip";
  const now = Date.now();
  const entry = uploadRateLimits.get(ip);

  if (!entry || now > entry.resetAt) {
    uploadRateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    next();
    return;
  }

  if (entry.count >= MAX_UPLOADS_PER_WINDOW) {
    res.status(429).json({
      error: "Trop de fichiers téléversés. Veuillez patienter quelques minutes avant de réessayer.",
    });
    return;
  }

  entry.count++;
  next();
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    // Neutralize dangerous extensions
    const ext = FORBIDDEN_EXTENSIONS.has(rawExt) ? ".blocked" : rawExt;
    cb(null, `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (FORBIDDEN_EXTENSIONS.has(ext)) {
      cb(new Error("Type d'extension de fichier interdite pour des raisons de sécurité"));
      return;
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error("Type MIME non supporté. Seules les images, vidéos et PDF sont autorisés"));
      return;
    }
    cb(null, true);
  },
});

const router: IRouter = Router();

// Clean orphan files older than 24h that are not referenced in the database
export async function cleanOrphanUploads(): Promise<{ deleted: number }> {
  try {
    const files = readdirSync(UPLOADS_DIR);
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    let deleted = 0;

    // Fetch all referenced media paths in DB
    const users = await db.select({ avatarUrl: usersTable.avatarUrl, diplomas: usersTable.diplomas }).from(usersTable);
    const courses = await db.select({ imageUrl: coursesTable.imageUrl }).from(coursesTable);
    const purchases = await db.select({ receiptUrl: purchasesTable.receiptUrl }).from(purchasesTable);

    const referencedFiles = new Set<string>();
    for (const u of users) {
      if (u.avatarUrl) referencedFiles.add(path.basename(u.avatarUrl));
      if (Array.isArray(u.diplomas)) {
        for (const d of u.diplomas) {
          if (d.documentUrl) referencedFiles.add(path.basename(d.documentUrl));
        }
      }
    }
    for (const c of courses) {
      if (c.imageUrl) referencedFiles.add(path.basename(c.imageUrl));
    }
    for (const p of purchases) {
      if (p.receiptUrl) referencedFiles.add(path.basename(p.receiptUrl));
    }

    for (const file of files) {
      const filePath = path.join(UPLOADS_DIR, file);
      try {
        const stats = statSync(filePath);
        // Only delete orphan files older than 24h
        if (now - stats.mtimeMs > ONE_DAY_MS && !referencedFiles.has(file)) {
          unlinkSync(filePath);
          deleted++;
        }
      } catch {
        // ignore individual file stat/unlink error
      }
    }
    return { deleted };
  } catch {
    return { deleted: 0 };
  }
}

// Upload endpoint with rate limiter and strict file verification
router.post("/uploads", uploadRateLimiter, (req, res): void => {
  upload.single("file")(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : "Échec du téléversement";
      res.status(400).json({ error: message });
      return;
    }
    const file = req.file;
    if (!file) { res.status(400).json({ error: "Aucun fichier fourni" }); return; }

    const kind = file.mimetype.split("/")[0];
    const limit = MAX_BYTES_BY_KIND[kind] ?? MAX_BYTES_BY_KIND.image;
    if (file.size > limit) {
      // Remove file immediately if it exceeds limit
      try { unlinkSync(file.path); } catch {}
      res.status(400).json({ error: `Le fichier dépasse la limite de ${Math.round(limit / (1024 * 1024))} Mo pour ce format` });
      return;
    }

    res.status(201).json({
      url: `/api/uploads/${file.filename}`,
      filename: file.filename,
      mimeType: file.mimetype,
      size: file.size,
    });
  });
});

// Admin endpoint to trigger orphan file cleanup manually
router.post("/admin/cleanup-uploads", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Interdit" });
    return;
  }
  const result = await cleanOrphanUploads();
  res.json({ message: "Nettoyage terminé", deletedCount: result.deleted });
});

export default router;
