import { useState, useEffect } from "react";
import { Bell, Check, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const { token } = useAuth();
  const { lang } = useI18n();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const markAllRead = async () => {
    if (!token) return;
    try {
      await fetch("/api/notifications/mark-all-read", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const markOneRead = async (id: number) => {
    if (!token) return;
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 shadow-lg border border-border">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="font-bold text-xs text-foreground flex items-center gap-1.5" style={{ fontFamily: "Cairo, sans-serif" }}>
            <Bell className="w-3.5 h-3.5 text-neutral-800" />
            {{ ar: "الإشعارات", fr: "Notifications", en: "Notifications" }[lang]}
            {unreadCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[10px] text-muted-foreground hover:text-foreground font-semibold"
            >
              {{ ar: "تعليم الكل كمقروء", fr: "Tout marquer comme lu", en: "Mark all read" }[lang]}
            </button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {{ ar: "لا توجد إشعارات جديدة", fr: "Aucune notification", en: "No notifications" }[lang]}
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => !notif.isRead && markOneRead(notif.id)}
                className={`p-3 text-xs transition-colors hover:bg-muted/40 cursor-pointer ${
                  !notif.isRead ? "bg-blue-50/40" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-bold text-foreground text-[11px] leading-snug">
                    {notif.title}
                  </p>
                  {!notif.isRead && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1" />
                  )}
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-2">
                  {notif.message}
                </p>
                <div className="flex items-center justify-between mt-2 pt-1 text-[10px] text-muted-foreground/60">
                  <span>{new Date(notif.createdAt).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-DZ")}</span>
                  {notif.link && (
                    <Link
                      href={notif.link}
                      onClick={() => setIsOpen(false)}
                      className="text-black font-bold hover:underline flex items-center gap-0.5"
                    >
                      {{ ar: "عرض", fr: "Voir", en: "Open" }[lang]} <ExternalLink className="w-2.5 h-2.5" />
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
