import { useGetAdminStats, useGetAdminReports, type AdminStats } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { Link } from "wouter";
import {
  Users,
  BookOpen,
  GraduationCap,
  Award,
  TrendingUp,
  Ticket,
  AlertCircle,
  Megaphone,
  Tag,
  ArrowUpRight,
  BarChart3,
  Trophy,
} from "lucide-react";

interface AdminStatsExt extends AdminStats {
  openTickets?: number;
  pendingAds?: number;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <div className="h-10" />;
  const max = Math.max(...data, 1);
  const H = 40, W = 160;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * (H - 6)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useGetAdminStats();
  const { data: reports, isLoading: reportsLoading } = useGetAdminReports();
  const { lang } = useI18n();
  const s = stats as AdminStatsExt | undefined;

  const statCards = [
    {
      label: { ar: "المستخدمون", fr: "Utilisateurs", en: "Users" }[lang],
      value: s?.totalUsers ?? 0,
      icon: <Users className="w-5 h-5 text-purple-600" />,
      bg: "bg-purple-50/50",
      sub: `${s?.totalStudents ?? 0} students · ${s?.totalCoaches ?? 0} coaches`
    },
    {
      label: { ar: "الدورات", fr: "Formations", en: "Courses" }[lang],
      value: s?.totalCourses ?? 0,
      icon: <BookOpen className="w-5 h-5 text-blue-600" />,
      bg: "bg-blue-50/50",
      sub: `${s?.publishedCourses ?? 0} published`
    },
    {
      label: { ar: "الإيرادات", fr: "Revenus", en: "Revenue" }[lang],
      value: `${parseFloat(s?.totalRevenue ?? "0").toLocaleString("fr-DZ")} DZD`,
      icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
      bg: "bg-emerald-50/50",
      sub: "Total earnings"
    },
    {
      label: { ar: "الإنتساب", fr: "Inscriptions", en: "Enrollments" }[lang],
      value: s?.totalEnrollments ?? 0,
      icon: <GraduationCap className="w-5 h-5 text-cyan-600" />,
      bg: "bg-cyan-50/50",
      sub: "Total student entries"
    },
    {
      label: { ar: "الشهادات", fr: "Certificats", en: "Certificates" }[lang],
      value: s?.totalCertificates ?? 0,
      icon: <Award className="w-5 h-5 text-rose-600" />,
      bg: "bg-rose-50/50",
      sub: "Issued certificates"
    },
    {
      label: { ar: "التذاكر", fr: "Tickets ouverts", en: "Open Tickets" }[lang],
      value: s?.openTickets ?? 0,
      icon: <Ticket className="w-5 h-5 text-orange-600" />,
      bg: "bg-orange-50/50",
      sub: "Support tickets open"
    },
    {
      label: { ar: "القسائم", fr: "Coupons actifs", en: "Active Coupons" }[lang],
      value: s?.activeCoupons ?? 0,
      icon: <Tag className="w-5 h-5 text-amber-600" />,
      bg: "bg-amber-50/50",
      sub: "Promo codes active"
    },
    {
      label: { ar: "الإعلانات", fr: "Annonces en attente", en: "Pending Ads" }[lang],
      value: s?.pendingAds ?? 0,
      icon: <Megaphone className="w-5 h-5 text-neutral-800" />,
      bg: "bg-neutral-50/50",
      sub: "Pending coach ads"
    },
  ];

  const revenueTrend = (reports?.revenueByMonth ?? []).map((d) => Math.round(parseFloat(d.revenue)));
  const enrollmentTrend = (reports?.enrollmentsByMonth ?? []).map((d) => d.count);
  const topCourses = [...(reports?.topCourses ?? [])].sort((a, b) => b.enrollmentCount - a.enrollmentCount).slice(0, 3);
  const topCategories = [...(reports?.categoryDistribution ?? [])].sort((a, b) => b.count - a.count).slice(0, 3);
  const maxCategory = Math.max(...topCategories.map((c) => c.count), 1);

  return (
    <AdminLayout
      title={{ ar: "لوحة الإدارة الرئيسية", fr: "Tableau de bord", en: "Admin Dashboard" }[lang]}
      subtitle={{ ar: "نظرة عامة شاملة على المنصة", fr: "Vue d'ensemble de la plateforme", en: "Full platform overview" }[lang]}
      stats={{ pendingCoaches: s?.pendingCoaches ?? 0, openTickets: s?.openTickets ?? 0, pendingAds: s?.pendingAds ?? 0 }}
    >
      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white border border-border rounded-xl h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((card) => (
            <div key={card.label} className="bg-white border border-border shadow-2xs rounded-xl p-4 flex flex-col justify-between h-28">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{card.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${card.bg}`}>
                  {card.icon}
                </div>
              </div>
              <div>
                <div className="text-lg font-black text-foreground" style={{ fontFamily: "Cairo, sans-serif" }}>
                  {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
                </div>
                <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">{card.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Revenue banner */}
      <div className="bg-white border border-border rounded-xl p-6 mb-6 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
            {{ ar: "إجمالي الإيرادات", fr: "Revenu total de la plateforme", en: "Total Platform Revenue" }[lang]}
          </p>
          <div className="text-3xl font-black text-foreground mt-1" style={{ fontFamily: "Cairo, sans-serif" }}>
            {parseFloat(s?.totalRevenue ?? "0").toLocaleString("fr-DZ")} <span className="text-base text-muted-foreground font-bold">DZD</span>
          </div>
          <p className="text-muted-foreground text-[10px] font-semibold mt-1">
            {s?.totalPurchases ?? 0} {{ ar: "عمليات شراء", fr: "achats complétés", en: "completed purchases" }[lang]}
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
          <ArrowUpRight className="w-6 h-6" />
        </div>
      </div>

      {/* Alerts */}
      {((s?.pendingCoaches ?? 0) > 0 || (s?.openTickets ?? 0) > 0 || (s?.pendingAds ?? 0) > 0) && (
        <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-amber-800 text-xs font-bold mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            {{ ar: "تتطلب الاهتمام", fr: "Actions requises", en: "Actions required" }[lang]}
          </p>
          <div className="space-y-2">
            {(s?.pendingCoaches ?? 0) > 0 && (
              <Link href="/admin/coaches">
                <div className="flex items-center justify-between p-3 bg-white border border-amber-100 rounded-lg cursor-pointer hover:bg-amber-50/20 transition-all">
                  <span className="text-xs text-neutral-800 font-medium">
                    {s?.pendingCoaches} {{ ar: "مدرب/ة في انتظار الموافقة", fr: "coach(s) en attente d'approbation", en: "coach(es) pending approval" }[lang]}
                  </span>
                  <span className="text-xs text-amber-700 font-bold">→</span>
                </div>
              </Link>
            )}
            {(s?.openTickets ?? 0) > 0 && (
              <Link href="/admin/tickets">
                <div className="flex items-center justify-between p-3 bg-white border border-amber-100 rounded-lg cursor-pointer hover:bg-amber-50/20 transition-all">
                  <span className="text-xs text-neutral-800 font-medium">
                    {s?.openTickets} {{ ar: "تذكرة مفتوحة", fr: "ticket(s) ouvert(s)", en: "open ticket(s)" }[lang]}
                  </span>
                  <span className="text-xs text-amber-700 font-bold">→</span>
                </div>
              </Link>
            )}
            {(s?.pendingAds ?? 0) > 0 && (
              <Link href="/admin/announcements">
                <div className="flex items-center justify-between p-3 bg-white border border-amber-100 rounded-lg cursor-pointer hover:bg-amber-50/20 transition-all">
                  <span className="text-xs text-neutral-800 font-medium">
                    {s?.pendingAds} {{ ar: "إعلان في انتظار الموافقة", fr: "annonce(s) en attente d'approbation", en: "ad(s) pending approval" }[lang]}
                  </span>
                  <span className="text-xs text-amber-700 font-bold">→</span>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Performance snapshot — pulled from admin reports for a richer, data-driven overview */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5" />
          {{ ar: "لمحة عن الأداء", fr: "Aperçu de performance", en: "Performance snapshot" }[lang]}
        </h2>
        <Link href="/admin/analytics" className="text-xs font-bold text-black hover:underline flex items-center gap-1">
          {{ ar: "التحليلات الكاملة", fr: "Analyse complète", en: "Full analytics" }[lang]} <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {reportsLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-white border border-border rounded-xl h-32 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Revenue trend */}
          <div className="bg-white border border-border shadow-2xs rounded-xl p-4">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
              {{ ar: "اتجاه الإيرادات", fr: "Tendance des revenus", en: "Revenue trend" }[lang]}
            </p>
            {revenueTrend.length > 1 ? (
              <Sparkline data={revenueTrend} color="#f59e0b" />
            ) : (
              <p className="text-xs text-muted-foreground py-3">{{ ar: "بيانات غير كافية", fr: "Pas assez de données", en: "Not enough data yet" }[lang]}</p>
            )}
          </div>

          {/* Enrollment trend */}
          <div className="bg-white border border-border shadow-2xs rounded-xl p-4">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
              {{ ar: "اتجاه الإنتساب", fr: "Tendance des inscriptions", en: "Enrollment trend" }[lang]}
            </p>
            {enrollmentTrend.length > 1 ? (
              <Sparkline data={enrollmentTrend} color="#6d28d9" />
            ) : (
              <p className="text-xs text-muted-foreground py-3">{{ ar: "بيانات غير كافية", fr: "Pas assez de données", en: "Not enough data yet" }[lang]}</p>
            )}
          </div>

          {/* Top courses */}
          <div className="bg-white border border-border shadow-2xs rounded-xl p-4">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Trophy className="w-3 h-3 text-amber-500" />
              {{ ar: "أفضل الدورات", fr: "Meilleures formations", en: "Top courses" }[lang]}
            </p>
            {topCourses.length === 0 ? (
              <p className="text-xs text-muted-foreground">{{ ar: "لا توجد بيانات", fr: "Pas de données", en: "No data" }[lang]}</p>
            ) : (
              <div className="space-y-2">
                {topCourses.map((c, i) => (
                  <div key={c.courseId} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-foreground truncate flex-1">
                      <span className="text-muted-foreground font-bold mr-1">#{i + 1}</span>{c.title}
                    </span>
                    <span className="text-xs font-bold text-foreground shrink-0">{c.enrollmentCount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category distribution */}
          <div className="bg-white border border-border shadow-2xs rounded-xl p-4">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-3">
              {{ ar: "توزيع الفئات", fr: "Répartition par catégorie", en: "Category distribution" }[lang]}
            </p>
            {topCategories.length === 0 ? (
              <p className="text-xs text-muted-foreground">{{ ar: "لا توجد بيانات", fr: "Pas de données", en: "No data" }[lang]}</p>
            ) : (
              <div className="space-y-2">
                {topCategories.map((c) => (
                  <div key={c.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground/70 truncate">{c.category}</span>
                      <span className="text-foreground font-semibold">{c.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(c.count / maxCategory) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
