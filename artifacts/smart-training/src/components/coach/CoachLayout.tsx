import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n";
import {
  LayoutDashboard, BookOpen, Users, Megaphone, CreditCard, Wallet,
  UserCircle, ChevronDown, ChevronRight, LogOut, Menu, X, HelpCircle, ShieldCheck,
} from "lucide-react";
import { LogoMark } from "@/components/shared/LogoMark";
import { NotificationBell } from "@/components/shared/NotificationBell";

interface NavItem {
  key: string;
  href: string;
  icon: ReactNode;
  badge?: number;
}

interface NavSection {
  key: string;
  labelKey: string;
  items: NavItem[];
}

interface CoachLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  stats?: { pendingPriceRequests?: number; pendingAnnouncements?: number };
}

export function CoachLayout({ children, title, subtitle, stats }: CoachLayoutProps) {
  const { user, logout } = useAuth();
  const { t, lang, setLang, isRTL } = useI18n();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    principal: true, content: true, finances: true, account: true,
  });

  const isActive = (href: string) => location === href || location.startsWith(href + "/");

  const sections: NavSection[] = [
    {
      key: "principal",
      labelKey: t("coach.section.principal"),
      items: [
        { key: "dashboard", href: "/coach/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
        { key: "courses", href: "/coach/courses", icon: <BookOpen className="w-4 h-4" /> },
        { key: "students", href: "/coach/students", icon: <Users className="w-4 h-4" /> },
      ],
    },
    {
      key: "content",
      labelKey: t("coach.section.content"),
      items: [
        { key: "announcements", href: "/coach/announcements", icon: <Megaphone className="w-4 h-4" />, badge: stats?.pendingAnnouncements },
      ],
    },
    {
      key: "finances",
      labelKey: t("coach.section.finances"),
      items: [
        { key: "price_requests", href: "/coach/price-requests", icon: <CreditCard className="w-4 h-4" />, badge: stats?.pendingPriceRequests },
        { key: "earnings", href: "/coach/earnings", icon: <Wallet className="w-4 h-4" /> },
      ],
    },
    {
      key: "account",
      labelKey: t("coach.section.account"),
      items: [
        { key: "help", href: "/help", icon: <HelpCircle className="w-4 h-4" /> },
        { key: "profile", href: "/coach/profile", icon: <UserCircle className="w-4 h-4" /> },
      ],
    },
  ];

  const navLabel = (key: string): string => {
    const map: Record<string, string> = {
      dashboard: t("coach.dashboard"),
      courses: t("coach.courses"),
      students: t("coach.students"),
      announcements: t("coach.announcements"),
      price_requests: t("coach.price_requests"),
      earnings: t("coach.earnings"),
      help: t("nav.help_center"),
      profile: t("coach.profile"),
    };
    return map[key] ?? key;
  };

  const toggleSection = (key: string) => {
    setExpandedSections((s) => ({ ...s, [key]: !s[key] }));
  };

  const Sidebar = (
    <aside
      className={`flex flex-col h-full transition-all duration-300 bg-white border-r border-border ${collapsed ? "w-16" : "w-64"}`}
    >
      {/* Header */}
      <div className={`flex items-center ${collapsed ? "flex-col gap-3 py-3 px-2" : "justify-between p-4"} border-b border-border`}>
        <Link href="/coach/dashboard">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white border border-border shadow-xs p-1 overflow-hidden">
              <LogoMark className="w-full h-full object-contain" />
            </div>
            {!collapsed && (
              <div>
                <p className="text-foreground text-sm font-black tracking-tight" style={{ fontFamily: "Cairo, sans-serif" }}>Tamayyuz</p>
                <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Coach Space</p>
              </div>
            )}
          </div>
        </Link>
        <button onClick={() => setCollapsed(!collapsed)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {sections.map((section) => (
          <div key={section.key} className="mb-2">
            {!collapsed && (
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full flex items-center justify-between px-2 py-1.5 mb-1 rounded-lg group transition-all hover:bg-muted/50"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {section.labelKey}
                </span>
                {expandedSections[section.key]
                  ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                }
              </button>
            )}

            {(collapsed || expandedSections[section.key]) && section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link key={item.key} href={item.href}>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 cursor-pointer transition-all group relative ${collapsed ? "justify-center" : ""} ${
                      active
                        ? "bg-black text-white font-bold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    title={collapsed ? navLabel(item.key) : undefined}
                  >
                    <span className={`shrink-0 ${active ? "text-white" : "text-muted-foreground group-hover:text-foreground"}`}>
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span className="text-xs font-medium flex-1 truncate" style={{ fontFamily: "Cairo, sans-serif" }}>
                        {navLabel(item.key)}
                      </span>
                    )}
                    {!collapsed && item.badge !== undefined && item.badge > 0 && (
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        active ? "bg-white text-black" : "bg-black text-white"
                      }`}>
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                    {collapsed && item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold leading-none">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer: lang switcher + user */}
      <div className="p-3 border-t border-border space-y-3">
        {!collapsed && (
          <div className="flex items-center gap-1 rounded-lg p-0.5 bg-muted">
            {(["ar", "fr", "en"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`flex-1 py-1 rounded-md text-xs font-bold uppercase transition-all ${
                  lang === l
                    ? "bg-white text-black shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        <div className={`flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 bg-black">
            {user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "CO"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-xs font-bold truncate" style={{ fontFamily: "Cairo, sans-serif" }}>{user?.name}</p>
              <p className="text-muted-foreground text-[10px] uppercase font-bold">Coach</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={logout} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all" title={t("nav.logout")}>
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground" dir={isRTL ? "rtl" : "ltr"}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full flex-col shrink-0">
        {Sidebar}
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="flex h-full flex-col w-64">
            {Sidebar}
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-4 shrink-0 border-b border-border bg-white">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted">
              <Menu className="w-4 h-4" />
            </button>
            {title && (
              <div>
                <h1 className="text-sm font-black text-foreground" style={{ fontFamily: "Cairo, sans-serif" }}>{title}</h1>
                {subtitle && <p className="text-muted-foreground text-[10px]">{subtitle}</p>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="flex items-center gap-1 rounded-lg p-0.5 bg-muted lg:hidden">
              {(["ar", "fr", "en"] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase ${
                    lang === l ? "bg-white text-black shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="hidden lg:flex items-center gap-1 rounded-lg p-0.5 bg-muted">
              {(["ar", "fr", "en"] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase transition-all ${
                    lang === l
                      ? "bg-white text-black shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[#fafafa]">
          {user?.isApproved === false && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between text-amber-900 text-xs">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {{
                    ar: "حسابك كمدرب قيد المراجعة والتدقيق من طرف فريقنا (24-48 ساعة). ستتمكن من نشر دوراتك فور اعتماد شهاداتك.",
                    fr: "Votre profil de coach est en cours de validation par notre équipe pédagogique sous 24-48h. La création et publication seront débloquées dès approbation.",
                    en: "Your coach profile is currently pending review by our pedagogical team (24-48h). Course publishing will be unlocked upon approval.",
                  }[lang]}
                </span>
              </div>
              <Link href="/coach/profile" className="font-bold text-amber-800 underline hover:text-amber-950 shrink-0 ml-4">
                {{ ar: "معاينة الملف", fr: "Vérifier mon profil", en: "View profile" }[lang]}
              </Link>
            </div>
          )}
          <div className="p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
