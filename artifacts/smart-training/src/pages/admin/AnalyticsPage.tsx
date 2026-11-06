import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { TrendingUp, Users, BookOpen, Award, ShoppingBag, BarChart3 } from "lucide-react";

interface ReportData {
  enrollmentsByMonth: { month: string; count: number }[];
  revenueByMonth: { month: string; revenue: string }[];
  topCourses: { courseId: number; title: string; enrollmentCount: number; revenue: string }[];
  categoryDistribution: { category: string; count: number }[];
  userGrowth: { month: string; count: number }[];
}

function MiniChart({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const H = 60; const W = 200;
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * W;
    const y = H - (v / max) * (H - 8);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12 mt-2">
      <defs>
        <linearGradient id={`grad-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${points} ${W},${H}`} fill={`url(#grad-${color.replace("#","")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function StatCard({ title, value, sub, icon, color, chartData }: { title: string; value: string; sub?: string; icon: React.ReactNode; color: string; chartData?: number[] }) {
  return (
    <div className="bg-white border border-border shadow-sm rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-semibold text-muted-foreground">{title}</div>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}22` }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <div className="text-2xl font-black text-foreground" style={{ fontFamily: "Cairo, sans-serif" }}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground/60 mt-0.5">{sub}</div>}
      {chartData && chartData.length > 1 && <MiniChart data={chartData} color={color} />}
    </div>
  );
}

function HBar({ label, value, max, total, color }: { label: string; value: number; max: number; total: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const share = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-foreground/60 truncate max-w-[60%]">{label}</span>
        <span className="text-foreground font-semibold">{value} <span className="text-foreground/30">({share}%)</span></span>
      </div>
      <div className="h-2 rounded-full" style={{ background: "var(--color-muted)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { lang } = useI18n();
  const [reports, setReports] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const token = localStorage.getItem("auth_token");

  useEffect(() => {
    fetch(`${BASE}/api/admin/reports`, { headers: { "Authorization": `Bearer ${token}` } })
      .then((r) => r.json()).then(setReports).finally(() => setLoading(false));
  }, []);

  const totalRevenue = (reports?.revenueByMonth ?? []).reduce((s, d) => s + parseFloat(d.revenue), 0);
  const totalEnrollments = (reports?.enrollmentsByMonth ?? []).reduce((s, d) => s + d.count, 0);
  const totalUsers = (reports?.userGrowth ?? []).reduce((s, d) => s + d.count, 0);
  const maxCategory = Math.max(...(reports?.categoryDistribution ?? []).map((c) => c.count), 1);
  const totalCategory = (reports?.categoryDistribution ?? []).reduce((s, c) => s + c.count, 0);
  const maxCourse = Math.max(...(reports?.topCourses ?? []).map((c) => c.enrollmentCount), 1);
  const totalCourseEnroll = (reports?.topCourses ?? []).reduce((s, c) => s + c.enrollmentCount, 0);

  const PALETTE = ["#6d28d9", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16"];

  return (
    <AdminLayout
      title={{ ar: "التحليلات التفصيلية", fr: "Analytiques détaillées", en: "Detailed Analytics" }[lang]}
      subtitle={{ ar: "نظرة معمّقة على أداء المنصة", fr: "Vue approfondie des performances de la plateforme", en: "Deep platform performance insights" }[lang]}
    >
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="bg-muted shadow-2xs rounded-2xl h-32 animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* KPI cards with sparklines */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title={{ ar: "إجمالي الإيرادات", fr: "Revenu total", en: "Total Revenue" }[lang]}
              value={`${totalRevenue.toLocaleString("fr-DZ")} DZD`} icon={<TrendingUp className="w-4 h-4" />} color="#f59e0b"
              chartData={reports?.revenueByMonth.map(d => Math.round(parseFloat(d.revenue)))} />
            <StatCard title={{ ar: "الإنتساب", fr: "Total inscriptions", en: "Enrollments" }[lang]}
              value={totalEnrollments.toLocaleString()} icon={<BookOpen className="w-4 h-4" />} color="#6d28d9"
              chartData={reports?.enrollmentsByMonth.map(d => d.count)} />
            <StatCard title={{ ar: "نمو المستخدمين", fr: "Croissance utilisateurs", en: "User Growth" }[lang]}
              value={totalUsers.toLocaleString()} icon={<Users className="w-4 h-4" />} color="#10b981"
              chartData={reports?.userGrowth.map(d => d.count)} />
            <StatCard title={{ ar: "أفضل دورة", fr: "Top formation", en: "Top Course" }[lang]}
              value={(reports?.topCourses?.[0]?.enrollmentCount ?? 0).toString()}
              sub={reports?.topCourses?.[0]?.title?.slice(0, 20) ?? "—"} icon={<Award className="w-4 h-4" />} color="#3b82f6" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Revenue by month */}
            <div className="bg-white border border-border shadow-sm rounded-2xl p-5">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                {{ ar: "الإيرادات الشهرية (DZD)", fr: "Revenus mensuels (DZD)", en: "Monthly Revenue (DZD)" }[lang]}
              </h3>
              {!reports?.revenueByMonth.length ? (
                <div className="text-center py-8 text-muted-foreground/60 text-sm">{{ ar: "لا توجد بيانات", fr: "Pas de données", en: "No data" }[lang]}</div>
              ) : (
                <div className="space-y-2">
                  {reports.revenueByMonth.slice(-6).map((d) => (
                    <HBar key={d.month} label={d.month} value={Math.round(parseFloat(d.revenue))}
                      max={Math.max(...reports.revenueByMonth.map(x => parseFloat(x.revenue)), 1)}
                      total={totalRevenue} color="#f59e0b" />
                  ))}
                </div>
              )}
            </div>

            {/* Enrollments by month */}
            <div className="bg-white border border-border shadow-sm rounded-2xl p-5">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-400" />
                {{ ar: "الإنتساب الشهري", fr: "Inscriptions par mois", en: "Monthly Enrollments" }[lang]}
              </h3>
              {!reports?.enrollmentsByMonth.length ? (
                <div className="text-center py-8 text-muted-foreground/60 text-sm">{{ ar: "لا توجد بيانات", fr: "Pas de données", en: "No data" }[lang]}</div>
              ) : (
                <div className="space-y-2">
                  {reports.enrollmentsByMonth.slice(-6).map((d) => (
                    <HBar key={d.month} label={d.month} value={d.count}
                      max={Math.max(...reports.enrollmentsByMonth.map(x => x.count), 1)}
                      total={totalEnrollments} color="#6d28d9" />
                  ))}
                </div>
              )}
            </div>

            {/* Top courses */}
            <div className="bg-white border border-border shadow-sm rounded-2xl p-5">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                {{ ar: "أفضل 10 دورات", fr: "Top 10 formations", en: "Top 10 Courses" }[lang]}
              </h3>
              {!reports?.topCourses.length ? (
                <div className="text-center py-8 text-muted-foreground/60 text-sm">{{ ar: "لا توجد بيانات", fr: "Pas de données", en: "No data" }[lang]}</div>
              ) : (
                <div className="space-y-3">
                  {reports.topCourses.map((c, i) => (
                    <div key={c.courseId}>
                      <HBar label={c.title} value={c.enrollmentCount} max={maxCourse} total={totalCourseEnroll} color={PALETTE[i % PALETTE.length]} />
                      <div className="text-xs text-amber-600/80 mt-0.5">{parseFloat(c.revenue).toLocaleString("fr-DZ")} DZD</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category distribution */}
            <div className="bg-white border border-border shadow-sm rounded-2xl p-5">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                {{ ar: "توزيع الفئات", fr: "Répartition par catégorie", en: "Category Distribution" }[lang]}
              </h3>
              {!reports?.categoryDistribution.length ? (
                <div className="text-center py-8 text-muted-foreground/60 text-sm">{{ ar: "لا توجد بيانات", fr: "Pas de données", en: "No data" }[lang]}</div>
              ) : (
                <div className="space-y-3">
                  {reports.categoryDistribution.map((c, i) => (
                    <HBar key={c.category} label={c.category} value={c.count} max={maxCategory} total={totalCategory} color={PALETTE[i % PALETTE.length]} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
