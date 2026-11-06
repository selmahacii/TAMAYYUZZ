import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetMyCourses } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n";
import { CoachLayout } from "@/components/coach/CoachLayout";
import { Button } from "@/components/ui/button";
import {
  Plus, BookOpen, Users, Eye, AlertCircle, TrendingUp, Megaphone,
  CreditCard, ArrowUpRight, List, Edit,
} from "lucide-react";

interface PriceRequest { id: number; status: string; }
interface CoachAnnouncement { id: number; isApproved: boolean; }

export default function CoachDashboardPage() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [, setLocation] = useLocation();
  const { data: courses, isLoading } = useGetMyCourses();

  const [pendingPriceRequests, setPendingPriceRequests] = useState(0);
  const [pendingAnnouncements, setPendingAnnouncements] = useState(0);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const token = localStorage.getItem("auth_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${BASE}/api/coach/price-requests`, { headers })
      .then((r) => r.json())
      .then((d: PriceRequest[]) => { if (Array.isArray(d)) setPendingPriceRequests(d.filter((r) => r.status === "pending").length); })
      .catch(() => {});
    fetch(`${BASE}/api/coach/announcements`, { headers })
      .then((r) => r.json())
      .then((d: CoachAnnouncement[]) => { if (Array.isArray(d)) setPendingAnnouncements(d.filter((a) => !a.isApproved).length); })
      .catch(() => {});
  }, []);

  const totalEnrollments = courses?.reduce((sum, c) => sum + c.enrollmentCount, 0) ?? 0;
  const publishedCount = courses?.filter((c) => c.isPublished).length ?? 0;
  const revenueEstimate = courses?.reduce((sum, c) => sum + (c.isFree ? 0 : c.enrollmentCount * parseFloat(c.price || "0")), 0) ?? 0;
  const recentCourses = [...(courses ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  const statCards = [
    {
      label: { ar: "إجمالي الدورات", fr: "Total formations", en: "Total Courses" }[lang],
      value: courses?.length ?? 0,
      icon: <BookOpen className="w-5 h-5 text-purple-600" />,
      bg: "bg-purple-50/50",
    },
    {
      label: { ar: "منشورة", fr: "Publiées", en: "Published" }[lang],
      value: publishedCount,
      icon: <Eye className="w-5 h-5 text-blue-600" />,
      bg: "bg-blue-50/50",
    },
    {
      label: { ar: "الطالبات", fr: "Étudiantes", en: "Students" }[lang],
      value: totalEnrollments,
      icon: <Users className="w-5 h-5 text-cyan-600" />,
      bg: "bg-cyan-50/50",
    },
    {
      label: { ar: "تقدير الإيرادات", fr: "Revenu estimé", en: "Est. Revenue" }[lang],
      value: `${revenueEstimate.toLocaleString("fr-DZ")} DZD`,
      icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
      bg: "bg-emerald-50/50",
    },
  ];

  return (
    <CoachLayout
      title={{ ar: "لوحة القيادة", fr: "Tableau de bord", en: "Coach Dashboard" }[lang]}
      subtitle={{ ar: "نظرة عامة على نشاطك التدريبي", fr: "Vue d'ensemble de votre activité pédagogique", en: "Overview of your teaching activity" }[lang]}
      stats={{ pendingPriceRequests, pendingAnnouncements }}
    >
      {!user?.isApproved && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 text-sm">
              {{ ar: "في انتظار الموافقة", fr: "Compte en attente d'approbation", en: "Pending Approval" }[lang]}
            </p>
            <p className="text-sm text-amber-700 mt-0.5">
              {{
                ar: "حسابك كمدرب في انتظار موافقة الإدارة. ستتمكن من إنشاء الدورات وإدارتها بعد الموافقة.",
                fr: "Votre compte coach est en attente d'approbation par un administrateur. Vous pourrez créer et gérer des formations une fois approuvé.",
                en: "Your coach account is pending admin approval. You'll be able to create and manage courses once approved.",
              }[lang]}
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-white border border-border rounded-xl h-28 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((card) => (
            <div key={card.label} className="bg-white border border-border shadow-2xs rounded-xl p-4 flex flex-col justify-between h-28">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{card.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${card.bg}`}>{card.icon}</div>
              </div>
              <div className="text-lg font-black text-foreground" style={{ fontFamily: "Cairo, sans-serif" }}>
                {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      {user?.isApproved && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Link href="/coach/course/new">
            <div className="bg-black text-white rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-black/90 transition-all shadow-sm">
              <div>
                <p className="text-xs text-white/60 font-bold uppercase tracking-wider mb-1">{{ ar: "بدء", fr: "Démarrer", en: "Get started" }[lang]}</p>
                <p className="font-bold text-sm">{{ ar: "دورة جديدة", fr: "Nouvelle formation", en: "New Course" }[lang]}</p>
              </div>
              <Plus className="w-6 h-6" />
            </div>
          </Link>
          <Link href="/coach/price-requests">
            <div className="bg-white border border-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:shadow-sm transition-all">
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">{pendingPriceRequests} {{ ar: "قيد الانتظار", fr: "en attente", en: "pending" }[lang]}</p>
                <p className="font-bold text-sm text-foreground">{{ ar: "طلبات التسعير", fr: "Demandes de prix", en: "Price Requests" }[lang]}</p>
              </div>
              <CreditCard className="w-6 h-6 text-amber-600" />
            </div>
          </Link>
          <Link href="/coach/announcements">
            <div className="bg-white border border-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:shadow-sm transition-all">
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">{pendingAnnouncements} {{ ar: "قيد الانتظار", fr: "en attente", en: "pending" }[lang]}</p>
                <p className="font-bold text-sm text-foreground">{{ ar: "الإعلانات", fr: "Annonces", en: "Announcements" }[lang]}</p>
              </div>
              <Megaphone className="w-6 h-6 text-violet-600" />
            </div>
          </Link>
        </div>
      )}

      {/* Recent courses */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {{ ar: "أحدث الدورات", fr: "Formations récentes", en: "Recent Courses" }[lang]}
        </h2>
        <Link href="/coach/courses" className="text-xs font-bold text-black hover:underline flex items-center gap-1">
          {{ ar: "عرض الكل", fr: "Voir tout", en: "View all" }[lang]} <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-white border border-border rounded-xl animate-pulse" />)}</div>
      ) : recentCourses.length === 0 ? (
        <div className="text-center py-16 bg-white border border-border rounded-xl">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <h3 className="font-bold text-foreground mb-1 text-sm">{{ ar: "لا توجد دورات بعد", fr: "Aucune formation pour l'instant", en: "No courses yet" }[lang]}</h3>
          {user?.isApproved ? (
            <>
              <p className="text-muted-foreground text-xs mb-4">{{ ar: "أنشئي دورتك الأولى وابدئي التدريس", fr: "Créez votre première formation et commencez à enseigner", en: "Create your first course and start teaching" }[lang]}</p>
              <Link href="/coach/course/new">
                <Button className="gap-2 bg-black hover:bg-black/90 text-white font-bold">
                  <Plus className="w-4 h-4" />
                  {{ ar: "إنشاء دورة", fr: "Créer une formation", en: "Create Course" }[lang]}
                </Button>
              </Link>
            </>
          ) : (
            <p className="text-muted-foreground text-xs">{{ ar: "ستتمكنين من إنشاء الدورات بعد الموافقة", fr: "Vous pourrez créer des formations une fois approuvée", en: "You'll be able to create courses once approved" }[lang]}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {recentCourses.map((course) => (
            <div key={course.id} className="flex items-center gap-4 p-4 bg-white border border-border shadow-2xs rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-neutral-50 border flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-neutral-700" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground text-sm truncate">{course.title}</h3>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{course.enrollmentCount}</span>
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${course.isPublished ? "bg-emerald-500" : "bg-amber-500"}`} />
                    {course.isPublished ? { ar: "منشور", fr: "Publié", en: "Published" }[lang] : { ar: "مسودة", fr: "Brouillon", en: "Draft" }[lang]}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" title={{ ar: "المحتوى", fr: "Contenu", en: "Content" }[lang]} onClick={() => setLocation(`/coach/course/${course.id}/lessons`)}>
                  <List className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" title={{ ar: "تعديل", fr: "Modifier", en: "Edit" }[lang]} onClick={() => setLocation(`/coach/course/${course.id}/edit`)}>
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </CoachLayout>
  );
}
