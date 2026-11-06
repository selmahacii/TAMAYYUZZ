import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CoachLayout } from "@/components/coach/CoachLayout";
import { StudentLayout } from "@/components/student/StudentLayout";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/shared/LogoMark";

/**
 * Wraps a page that's reachable by any role AND by logged-out visitors
 * (course detail, certificate view, ...) in that role's real sidebar shell.
 * Logged-out visitors get the same minimal header used on the marketplace —
 * never the old flat NavBar, per the "sidebar everywhere, no navbar" direction.
 */
export function RoleAwareShell({ children, title, subtitle }: { children: ReactNode; title?: string; subtitle?: string }) {
  const { user, logout } = useAuth();
  const { lang } = useI18n();
  const [, setLocation] = useLocation();

  if (user?.role === "admin") return <AdminLayout title={title} subtitle={subtitle}>{children}</AdminLayout>;
  if (user?.role === "coach") return <CoachLayout title={title} subtitle={subtitle}>{children}</CoachLayout>;
  if (user?.role === "student") return <StudentLayout title={title} subtitle={subtitle}>{children}</StudentLayout>;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/marketplace">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-border shadow-xs p-1 shrink-0">
              <LogoMark className="w-full h-full object-contain" />
            </div>
            <span className="font-black text-foreground text-base tracking-tight" style={{ fontFamily: "Cairo, sans-serif" }}>Tamayyuz</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => setLocation("/login")} className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
            {{ ar: "تسجيل الدخول", fr: "Se connecter", en: "Log in" }[lang]}
          </button>
          <Button size="sm" className="bg-black hover:bg-black/90 text-white font-bold rounded-full px-5" onClick={() => setLocation("/register")}>
            {{ ar: "إنشاء حساب", fr: "S'inscrire", en: "Sign up" }[lang]}
          </Button>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 pb-8">{children}</div>
    </div>
  );
}
