import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Users, BookOpen, Clock } from "lucide-react";

interface ReportData {
  enrollmentsByMonth: { month: string; count: number }[];
  revenueByMonth: { month: string; revenue: string }[];
  topCourses: { courseId: number; title: string; enrollmentCount: number; revenue: string }[];
  categoryDistribution: { category: string; count: number }[];
}

function SimpleBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground font-semibold truncate max-w-[70%]">{label}</span>
        <span className="text-foreground font-black">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-neutral-100 border border-neutral-200/50">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function LineChart({ data, label, strokeColor = "#0f172a" }: { data: { x: string; y: number }[]; label: string; strokeColor?: string }) {
  if (data.length === 0) return <div className="text-center py-8 text-muted-foreground text-xs font-semibold">Pas de données</div>;
  const max = Math.max(...data.map((d) => d.y), 1);
  const H = 120;
  const W = 100;
  const points = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * W;
    const y = H - (d.y / max) * (H - 20);
    return `${x},${y}`;
  }).join(" ");
  
  return (
    <div>
      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-3">{label}</p>
      <svg viewBox={`0 0 100 ${H}`} className="w-full" style={{ height: 100 }}>
        <polyline points={points} fill="none" stroke={strokeColor} strokeWidth="1.5" />
        {data.map((d, i) => {
          const x = (i / Math.max(data.length - 1, 1)) * W;
          const y = H - (d.y / max) * (H - 20);
          return <circle key={i} cx={x} cy={y} r="2" fill={strokeColor} />;
        })}
      </svg>
      <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-semibold">
        {data[0] && <span>{data[0].x}</span>}
        {data.length > 1 && <span>{data[data.length - 1].x}</span>}
      </div>
    </div>
  );
}

export default function AdminReportsPage() {
  const { lang } = useI18n();
  const [reports, setReports] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const token = localStorage.getItem("auth_token");

  useEffect(() => {
    fetch(`${BASE}/api/admin/reports`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setReports)
      .finally(() => setLoading(false));
  }, []);

  const enrollChartData = (reports?.enrollmentsByMonth ?? []).map((d) => ({ x: d.month, y: d.count }));
  const revenueChartData = (reports?.revenueByMonth ?? []).map((d) => ({ x: d.month, y: Math.round(parseFloat(d.revenue)) }));
  const maxEnroll = Math.max(...(reports?.topCourses ?? []).map((c) => c.enrollmentCount), 1);
  const maxCategory = Math.max(...(reports?.categoryDistribution ?? []).map((c) => c.count), 1);
  const totalRevenue = (reports?.revenueByMonth ?? []).reduce((s, d) => s + parseFloat(d.revenue), 0);
  const totalEnrollments = (reports?.enrollmentsByMonth ?? []).reduce((s, d) => s + d.count, 0);

  return (
    <AdminLayout
      title={{ ar: "التقارير والتحليلات", fr: "Rapports & Analyses", en: "Reports & Analytics" }[lang]}
      subtitle={{ ar: "أداء المنصة والإحصائيات", fr: "Performances et statistiques de la plateforme", en: "Platform performance and statistics" }[lang]}
    >
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-white border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              {
                label: { ar: "إجمالي الإيرادات", fr: "Revenu total", en: "Total Revenue" }[lang],
                value: `${totalRevenue.toLocaleString("fr-DZ")} DZD`,
                icon: <TrendingUp className="w-4 h-4 text-emerald-600" />,
                bg: "bg-emerald-50/50"
              },
              {
                label: { ar: "الإنتساب", fr: "Inscriptions", en: "Enrollments" }[lang],
                value: totalEnrollments.toString(),
                icon: <Users className="w-4 h-4 text-purple-600" />,
                bg: "bg-purple-50/50"
              },
              {
                label: { ar: "أفضل دورة", fr: "Top cours", en: "Top course" }[lang],
                value: reports?.topCourses?.[0]?.title?.slice(0, 18) ?? "—",
                icon: <BookOpen className="w-4 h-4 text-blue-600" />,
                bg: "bg-blue-50/50"
              },
              {
                label: { ar: "الفئات", fr: "Catégories", en: "Categories" }[lang],
                value: (reports?.categoryDistribution?.length ?? 0).toString(),
                icon: <BarChart3 className="w-4 h-4 text-neutral-800" />,
                bg: "bg-neutral-50/50"
              },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white border border-border shadow-2xs rounded-xl p-4 flex flex-col justify-between h-24">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{kpi.label}</span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${kpi.bg}`}>
                    {kpi.icon}
                  </div>
                </div>
                <div className="text-base font-black text-foreground truncate" style={{ fontFamily: "Cairo, sans-serif" }}>
                  {kpi.value}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Enrollments chart */}
            <div className="bg-white border border-border rounded-xl p-6 shadow-2xs">
              <div className="flex items-center gap-2 mb-6 border-b pb-3">
                <Users className="w-4.5 h-4.5 text-purple-600 shrink-0" />
                <h3 className="font-bold text-foreground text-sm">
                  {{ ar: "الإنتساب شهرياً", fr: "Inscriptions par mois", en: "Enrollments per month" }[lang]}
                </h3>
              </div>
              {enrollChartData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm font-semibold">Pas encore de données</div>
              ) : (
                <LineChart data={enrollChartData} label="Nouvelles inscriptions" strokeColor="#7c3aed" />
              )}
            </div>

            {/* Revenue chart */}
            <div className="bg-white border border-border rounded-xl p-6 shadow-2xs">
              <div className="flex items-center gap-2 mb-6 border-b pb-3">
                <TrendingUp className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                <h3 className="font-bold text-foreground text-sm">
                  {{ ar: "الإيرادات شهرياً", fr: "Revenus par mois (DZD)", en: "Monthly Revenue (DZD)" }[lang]}
                </h3>
              </div>
              {revenueChartData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm font-semibold">Pas encore de données</div>
              ) : (
                <LineChart data={revenueChartData} label="Revenu en DZD" strokeColor="#10b981" />
              )}
            </div>

            {/* Top courses */}
            <div className="bg-white border border-border rounded-xl p-6 shadow-2xs">
              <div className="flex items-center gap-2 mb-4 border-b pb-3">
                <BookOpen className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                <h3 className="font-bold text-foreground text-sm">
                  {{ ar: "أفضل 10 دورات تدريبية", fr: "Top 10 formations", en: "Top 10 courses" }[lang]}
                </h3>
              </div>
              {(reports?.topCourses ?? []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm font-semibold">Pas encore de données</div>
              ) : (
                <div className="space-y-4">
                  {reports?.topCourses.slice(0, 10).map((course) => (
                    <div key={course.courseId} className="space-y-1">
                      <SimpleBar label={course.title} value={course.enrollmentCount} max={maxEnroll} color="linear-gradient(90deg, #7c3aed, #a855f7)" />
                      <div className="text-[10px] font-bold text-emerald-700">
                        {parseFloat(course.revenue).toLocaleString("fr-DZ")} DZD
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category distribution */}
            <div className="bg-white border border-border rounded-xl p-6 shadow-2xs">
              <div className="flex items-center gap-2 mb-4 border-b pb-3">
                <BarChart3 className="w-4.5 h-4.5 text-neutral-800 shrink-0" />
                <h3 className="font-bold text-foreground text-sm">
                  {{ ar: "توزيع الدورات حسب الفئة", fr: "Répartition par catégorie", en: "Distribution by category" }[lang]}
                </h3>
              </div>
              {(reports?.categoryDistribution ?? []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm font-semibold">Pas encore de données</div>
              ) : (
                <div className="space-y-4">
                  {reports?.categoryDistribution.map((cat, i) => (
                    <SimpleBar
                      key={cat.category}
                      label={cat.category}
                      value={cat.count}
                      max={maxCategory}
                      color={["#7c3aed", "#d97706", "#10b981", "#0284c7", "#ef4444"][i % 5]}
                    />
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
