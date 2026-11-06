import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, inAppNotificationsTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

// Helper to push notification to any user
export async function createNotification(params: {
  userId: number;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  link?: string;
}) {
  try {
    const [notif] = await db.insert(inAppNotificationsTable).values({
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type ?? "info",
      link: params.link ?? null,
    }).returning();
    return notif;
  } catch (err) {
    console.error("Failed to create notification:", err);
    return null;
  }
}

// Get user notifications
router.get("/notifications", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user!.id;
  const notifications = await db
    .select()
    .from(inAppNotificationsTable)
    .where(eq(inAppNotificationsTable.userId, userId))
    .orderBy(desc(inAppNotificationsTable.createdAt))
    .limit(50);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  res.json({
    notifications: notifications.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  });
});

// Mark all as read
router.patch("/notifications/mark-all-read", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user!.id;
  await db
    .update(inAppNotificationsTable)
    .set({ isRead: true })
    .where(eq(inAppNotificationsTable.userId, userId));

  res.json({ success: true, message: "Toutes les notifications ont été marquées comme lues" });
});

// Mark specific as read
router.patch("/notifications/:id/read", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user!.id;
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) {
    res.status(400).json({ error: "ID invalide" });
    return;
  }

  await db
    .update(inAppNotificationsTable)
    .set({ isRead: true })
    .where(and(eq(inAppNotificationsTable.id, id), eq(inAppNotificationsTable.userId, userId)));

  res.json({ success: true, message: "Notification marquée comme lue" });
});

export default router;
