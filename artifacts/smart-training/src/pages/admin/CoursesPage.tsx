import { useState, useMemo } from "react";
import { useGetAdminCourses, usePublishCourse, useUnpublishCourse, getGetAdminCoursesQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen, Eye, EyeOff, Users, Clock, Search, GraduationCap, DollarSign,
  CheckCircle2, AlertTriangle, XCircle, Award, Calendar, Phone, Mail,
  Layers, FileText, Video, HelpCircle, ChevronRight, Check, X, ArrowUpRight,
  UserCheck, UserX, BarChart3, AlertCircle, PlayCircle, Loader2, RefreshCw
} from "lucide-react";

interface StudentAttendance {
  userId: number;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  enrolledAt: string | null;
  completedLessonsCount: number;
  totalLessonsCount: number;
  progressPercent: number;
  attendanceStatus: "completed" | "active" | "never_started" | "at_risk";
  lastActivityAt: string | null;
  completedLessonIds: number[];
  examAttempt: {
    score: number;
    passed: boolean;
    attemptedAt: string | null;
  } | null;
  certificate: {
    certificateCode: string;
    issuedAt: string | null;
    examScore: number | null;
  } | null;
}

interface CourseAttendanceData {
  course: {
    id: number;
    title: string;
    subtitle: string | null;
    description: string | null;
    category: string;
    level: string | null;
    price: string | number;
    currency: string;
    isFree: boolean;
    isPublished: boolean;
    durationHours: number | null;
    imageUrl: string | null;
    promoVideoUrl: string | null;
    faq: Array<{ question: string; answer: string }>;
    learningObjectives: string[];
    requirements: string[];
    targetAudience: string[];
    tags: string[];
    hasFinalExam: boolean;
    finalExam: any | null;
    coach: {
      id: number;
      name: string;
      email: string;
      avatarUrl: string | null;
      phone: string | null;
    };
  };
  curriculum: {
    chapters: Array<{
      id: number;
      title: string;
      description: string | null;
      order: number;
    }>;
    lessons: Array<{
      id: number;
      chapterId: number | null;
      title: string;
      description: string | null;
      order: number;
      durationMinutes: number | null;
      type: "video" | "pdf" | "quiz" | "text";
      videoUrl: string | null;
      pdfUrl: string | null;
      quizData: any | null;
    }>;
    totalChaptersCount: number;
    totalLessonsCount: number;
  };
  analytics: {
    totalEnrolled: number;
    attendedCount: number;
    neverStartedCount: number;
    activeCount: number;
    atRiskCount: number;
    completedCount: number;
    certifiedCount: number;
    averageProgressPercent: number;
    attendanceRatePercent: number;
  };
  students: StudentAttendance[];
}

export default function AdminCoursesPage() {
  const { data: courses, isLoading } = useGetAdminCourses();
  const publishMutation = usePublishCourse();
  const unpublishMutation = useUnpublishCourse();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { lang } = useI18n();

  // Filters
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  // Inspection Modal States
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [modalTab, setModalTab] = useState<"attendance" | "curriculum" | "exam" | "faq">("attendance");
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | "completed" | "active" | "never_started" | "at_risk">("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [expandedStudentId, setExpandedStudentId] = useState<number | null>(null);

  const token = localStorage.getItem("auth_token") || localStorage.getItem("tamayuz_token") || localStorage.getItem("token");

  // Fetch detailed attendance dossier
  const {
    data: attendanceData,
    isLoading: isLoadingAttendance,
    refetch: refetchAttendance
  } = useQuery<CourseAttendanceData>({
    queryKey: ["admin", "course", selectedCourseId, "attendance"],
    queryFn: async () => {
      if (!selectedCourseId) throw new Error("No course selected");
      const res = await fetch(`/api/admin/courses/${selectedCourseId}/attendance`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("Erreur lors de la récupération des données d'assiduité");
      }
      return res.json();
    },
    enabled: !!selectedCourseId,
  });

  const handlePublish = (id: number, title: string) => {
    publishMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminCoursesQueryKey() });
        if (selectedCourseId === id) refetchAttendance();
        toast({ title: `"${title}" ${{ ar: "تم نشره", fr: "publiée avec succès", en: "published successfully" }[lang]}` });
      },
      onError: () => toast({ title: "Erreur lors de la publication", variant: "destructive" }),
    });
  };

  const handleUnpublish = (id: number, title: string) => {
    unpublishMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminCoursesQueryKey() });
        if (selectedCourseId === id) refetchAttendance();
        toast({ title: `"${title}" ${{ ar: "تم إيقاف نشره", fr: "retirée de la publication", en: "unpublished successfully" }[lang]}` });
      },
      onError: () => toast({ title: "Erreur lors de la dépublication", variant: "destructive" }),
    });
  };

  const filtered = (courses ?? []).filter((c) => {
    const matchSearch = !search ||
      (c.title && c.title.toLowerCase().includes(search.toLowerCase())) ||
      (c.coachName && c.coachName.toLowerCase().includes(search.toLowerCase())) ||
      (c.category && c.category.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === "all" ? true : filter === "published" ? c.isPublished : !c.isPublished;
    return matchSearch && matchFilter;
  });

  const publishedCount = (courses ?? []).filter((c) => c.isPublished).length;
  const draftCount = (courses ?? []).filter((c) => !c.isPublished).length;

  // Filter students within the attendance tab
  const filteredStudents = useMemo(() => {
    if (!attendanceData?.students) return [];
    return attendanceData.students.filter((s) => {
      const matchSearch = !studentSearch ||
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.phone && s.phone.includes(studentSearch));
      const matchFilter = attendanceFilter === "all" ? true : s.attendanceStatus === attendanceFilter;
      return matchSearch && matchFilter;
    });
  }, [attendanceData?.students, studentSearch, attendanceFilter]);

  const renderAttendanceStatusBadge = (status: StudentAttendance["attendanceStatus"]) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {{ ar: "أكملت الدورة (حضور تام)", fr: "Assiduité achevée (100%)", en: "Course completed" }[lang]}
          </span>
        );
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            {{ ar: "حضور نشط ومستمر", fr: "Assiduité active", en: "Actively attending" }[lang]}
          </span>
        );
      case "at_risk":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            {{ ar: "انقطاع مؤقت (> 14 يوم)", fr: "Décrochage (> 14 jours)", en: "At risk (> 14 days)" }[lang]}
          </span>
        );
      case "never_started":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            {{ ar: "لم تحضر بعد (0%)", fr: "N'a pas assisté (0%)", en: "Not attended (0%)" }[lang]}
          </span>
        );
    }
  };

  return (
    <AdminLayout
      title={{ ar: "إدارة الدورات التدريبية", fr: "Gestion académique des formations", en: "Academic Course Management" }[lang]}
      subtitle={{ ar: "متابعة الحضور، نسب الإنجاز واعتماد المحتوى التدريبي", fr: "Supervision pédagogique, suivi de l'assiduité des apprenantes et contrôle du catalogue", en: "Pedagogical supervision, student attendance tracking and catalogue control" }[lang]}
    >
      {/* Controls & Summary */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-1.5">
          {[
            { key: "all", label: { ar: "جميع الدورات", fr: "Toutes les formations", en: "All courses" }[lang], count: courses?.length ?? 0 },
            { key: "published", label: { ar: "المنشورة", fr: "Publiées", en: "Published" }[lang], count: publishedCount },
            { key: "draft", label: { ar: "المسودات", fr: "Brouillons", en: "Drafts" }[lang], count: draftCount },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === tab.key
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "bg-white text-neutral-600 hover:text-neutral-900 border border-border hover:bg-neutral-50"
              }`}
            >
              {tab.label} <span className="text-[11px] opacity-75">({tab.count})</span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={{ ar: "بحث بالعنوان، المدرب، أو التخصص...", fr: "Rechercher par titre, formateur ou domaine...", en: "Search by title, coach or category..." }[lang]}
            className="pl-9.5 bg-white border-border text-xs rounded-xl shadow-2xs h-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-border rounded-2xl p-5 shadow-2xs animate-pulse h-28" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white border border-border rounded-2xl shadow-2xs">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-semibold text-sm">
            {{ ar: "لا توجد دورات مطابقة للبحث", fr: "Aucune formation trouvée", en: "No matching courses found" }[lang]}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((course) => (
            <div
              key={course.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white border border-border shadow-2xs rounded-2xl hover:border-neutral-300 hover:shadow-xs transition-all cursor-pointer group"
              onClick={() => {
                setSelectedCourseId(course.id);
                setModalTab("attendance");
              }}
            >
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                  course.isPublished ? "bg-neutral-900 border-neutral-900 text-white" : "bg-neutral-100 border-neutral-200 text-neutral-500"
                }`}>
                  <BookOpen className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-foreground text-sm group-hover:text-neutral-900 transition-colors">
                      {course.title}
                    </h3>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                      course.isPublished
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${course.isPublished ? "bg-emerald-500" : "bg-amber-500"}`} />
                      {course.isPublished ? { ar: "منشور رسميًا", fr: "Publiée", en: "Published" }[lang] : { ar: "مسودة غير معلنة", fr: "Brouillon", en: "Draft" }[lang]}
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <GraduationCap className="w-3.5 h-3.5 text-neutral-600" />
                      {course.coachName}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded-md">
                      <Users className="w-3 h-3 text-neutral-700" />
                      {course.enrollmentCount} {{ ar: "مسجلة", fr: "inscrite(s)", en: "enrolled" }[lang]}
                    </span>
                    {course.durationHours && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-neutral-500" />
                        {course.durationHours}h de formation
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-neutral-50 border border-neutral-200 text-neutral-700">
                      {course.category}
                    </span>
                    <span className="font-bold text-neutral-900 flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-neutral-600" />
                      {course.isFree
                        ? { ar: "مجاني بالكامل", fr: "Formation Gratuite", en: "Free Course" }[lang]
                        : `${parseFloat(String(course.price)).toLocaleString()} ${course.currency}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  className="gap-1.5 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl h-9 px-3.5 shadow-2xs"
                  onClick={() => {
                    setSelectedCourseId(course.id);
                    setModalTab("attendance");
                  }}
                >
                  <Users className="w-3.5 h-3.5" />
                  {{ ar: "تفاصيل الدورة والحضور", fr: "Détails & Assiduité", en: "Details & Attendance" }[lang]}
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                </Button>

                {course.isPublished ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs font-bold h-9 rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50"
                    onClick={() => handleUnpublish(course.id, course.title)}
                    disabled={unpublishMutation.isPending}
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    {{ ar: "تعليق النشر", fr: "Dépublier", en: "Unpublish" }[lang]}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs font-bold h-9 rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => handlePublish(course.id, course.title)}
                    disabled={publishMutation.isPending}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {{ ar: "نشر الدورة", fr: "Publier", en: "Publish" }[lang]}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comprehensive Course Inspection & Attendance Dossier Modal */}
      <Dialog open={!!selectedCourseId} onOpenChange={(open) => { if (!open) { setSelectedCourseId(null); setExpandedStudentId(null); } }}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] bg-white border border-border p-0 overflow-hidden shadow-2xl rounded-2xl flex flex-col">
          {/* Modal Header */}
          <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800 flex items-start justify-between gap-4 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                  ID #{selectedCourseId}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-neutral-800 text-neutral-200 border border-neutral-700">
                  {attendanceData?.course?.category || "Formation"}
                </span>
                {attendanceData?.course?.level && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-neutral-800/80 text-neutral-300 border border-neutral-700">
                    Niveau : {attendanceData.course.level}
                  </span>
                )}
                {attendanceData?.course && (
                  <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    attendanceData.course.isPublished
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${attendanceData.course.isPublished ? "bg-emerald-400" : "bg-amber-400"}`} />
                    {attendanceData.course.isPublished ? "Publiée au catalogue" : "Mode Brouillon"}
                  </span>
                )}
              </div>

              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white line-clamp-1">
                {attendanceData?.course?.title || "Dossier Pédagogique"}
              </DialogTitle>

              <div className="flex items-center gap-4 text-xs text-neutral-300 mt-2 flex-wrap">
                {attendanceData?.course?.coach && (
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-neutral-400" />
                    <span className="text-neutral-400">Formateur référent :</span>
                    <span className="font-bold text-white">{attendanceData.course.coach.name}</span>
                    <span className="text-neutral-400 text-[11px]">({attendanceData.course.coach.email})</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-neutral-300">
                  <DollarSign className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="font-bold text-white">
                    {attendanceData?.course?.isFree
                      ? "Formation Gratuite"
                      : `${parseFloat(String(attendanceData?.course?.price || 0)).toLocaleString()} ${attendanceData?.course?.currency || "DZD"}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchAttendance()}
                className="bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700 hover:text-white h-8 w-8 p-0 rounded-lg"
                title="Actualiser les données"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>

              {attendanceData?.course && (
                attendanceData.course.isPublished ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-900/60 bg-red-950/40 text-red-300 hover:bg-red-900/60 h-8 text-xs font-bold rounded-lg"
                    onClick={() => handleUnpublish(attendanceData.course.id, attendanceData.course.title)}
                    disabled={unpublishMutation.isPending}
                  >
                    <EyeOff className="w-3.5 h-3.5 mr-1" />
                    Dépublier
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white h-8 text-xs font-bold rounded-lg"
                    onClick={() => handlePublish(attendanceData.course.id, attendanceData.course.title)}
                    disabled={publishMutation.isPending}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Publier
                  </Button>
                )
              )}
            </div>
          </div>

          {/* Modal Tab Selector */}
          <div className="bg-neutral-50 border-b border-border px-6 py-2.5 flex items-center gap-2 shrink-0 overflow-x-auto">
            {[
              {
                id: "attendance",
                label: "Assiduité & Apprenantes",
                icon: Users,
                badge: attendanceData?.analytics?.totalEnrolled ?? 0
              },
              {
                id: "curriculum",
                label: "Programme & Leçons",
                icon: Layers,
                badge: attendanceData?.curriculum?.totalLessonsCount ?? 0
              },
              {
                id: "exam",
                label: "Examen & Certification",
                icon: Award,
                badge: attendanceData?.analytics?.certifiedCount ? `${attendanceData.analytics.certifiedCount} diplômée(s)` : null
              },
              {
                id: "faq",
                label: "Foire Aux Questions (FAQ)",
                icon: HelpCircle,
                badge: attendanceData?.course?.faq?.length ?? 0
              },
            ].map((t) => {
              const IconComp = t.icon;
              const isActive = modalTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setModalTab(t.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-white text-neutral-900 border border-neutral-300 shadow-2xs"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border border-transparent"
                  }`}
                >
                  <IconComp className={`w-3.5 h-3.5 ${isActive ? "text-neutral-900" : "text-neutral-500"}`} />
                  <span>{t.label}</span>
                  {t.badge !== null && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isActive ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-700"
                    }`}>
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoadingAttendance ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-neutral-700" />
                <p className="text-xs text-muted-foreground font-semibold">
                  Chargement des registres d'assiduité et métriques pédagogiques...
                </p>
              </div>
            ) : !attendanceData ? (
              <div className="text-center py-16">
                <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-neutral-800">Impossible de charger les données de la formation.</p>
              </div>
            ) : (
              <>
                {/* TAB 1: ATTENDANCE & STUDENTS */}
                {modalTab === "attendance" && (
                  <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="bg-neutral-50 border border-border p-3.5 rounded-xl shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Total Inscrites
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="text-2xl font-black text-foreground">
                            {attendanceData.analytics.totalEnrolled}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">étudiantes</span>
                        </div>
                      </div>

                      <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-xl shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                          Formations Achevées
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="text-2xl font-black text-emerald-900">
                            {attendanceData.analytics.completedCount}
                          </span>
                          <span className="text-xs text-emerald-700 font-medium">100% complétées</span>
                        </div>
                      </div>

                      <div className="bg-blue-50/70 border border-blue-200/80 p-3.5 rounded-xl shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">
                          Assiduité Active
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="text-2xl font-black text-blue-900">
                            {attendanceData.analytics.activeCount}
                          </span>
                          <span className="text-xs text-blue-700 font-medium">en cours</span>
                        </div>
                      </div>

                      <div className="bg-rose-50/70 border border-rose-200/80 p-3.5 rounded-xl shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">
                          N'ont Pas Assisté
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="text-2xl font-black text-rose-900">
                            {attendanceData.analytics.neverStartedCount}
                          </span>
                          <span className="text-xs text-rose-700 font-medium">0% d'avancement</span>
                        </div>
                      </div>

                      <div className="bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-xl shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                          En Décrochage
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="text-2xl font-black text-amber-900">
                            {attendanceData.analytics.atRiskCount}
                          </span>
                          <span className="text-xs text-amber-700 font-medium">&gt; 14j inactives</span>
                        </div>
                      </div>

                      <div className="bg-neutral-900 text-white p-3.5 rounded-xl shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                          Taux Moyen Global
                        </span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-black text-white">
                            {attendanceData.analytics.averageProgressPercent}%
                          </span>
                        </div>
                        <Progress value={attendanceData.analytics.averageProgressPercent} className="h-1.5 bg-neutral-800 mt-2" />
                      </div>
                    </div>

                    {/* Filter and search bar for students */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-border p-3 rounded-xl shadow-2xs">
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                        {[
                          { id: "all", label: "Toutes les étudiantes", count: attendanceData.analytics.totalEnrolled },
                          { id: "completed", label: "Terminées (100%)", count: attendanceData.analytics.completedCount },
                          { id: "active", label: "Assiduité active", count: attendanceData.analytics.activeCount },
                          { id: "never_started", label: "N'ont pas assisté (0%)", count: attendanceData.analytics.neverStartedCount },
                          { id: "at_risk", label: "Décrochage", count: attendanceData.analytics.atRiskCount },
                        ].map((btn) => (
                          <button
                            key={btn.id}
                            onClick={() => setAttendanceFilter(btn.id as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                              attendanceFilter === btn.id
                                ? "bg-neutral-900 text-white shadow-2xs"
                                : "bg-neutral-100 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70"
                            }`}
                          >
                            {btn.label} <span className="opacity-75">({btn.count})</span>
                          </button>
                        ))}
                      </div>

                      <div className="relative sm:w-64 shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          placeholder="Rechercher une apprenante..."
                          className="pl-8 text-xs h-8 bg-neutral-50 border-border"
                        />
                      </div>
                    </div>

                    {/* Students Roster Table */}
                    {filteredStudents.length === 0 ? (
                      <div className="text-center py-12 bg-neutral-50 border border-border rounded-xl">
                        <UserX className="w-9 h-9 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground font-semibold">
                          Aucune apprenante ne correspond aux filtres d'assiduité sélectionnés.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white border border-border rounded-xl overflow-hidden shadow-2xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-neutral-50/80 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                              <tr>
                                <th className="p-3.5">Apprenante</th>
                                <th className="p-3.5">Date Inscription</th>
                                <th className="p-3.5">Statut Assiduité</th>
                                <th className="p-3.5">Progression</th>
                                <th className="p-3.5">Dernière Activité</th>
                                <th className="p-3.5">Évaluation & Certificat</th>
                                <th className="p-3.5 text-right">Détails Leçons</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {filteredStudents.map((student) => {
                                const isExpanded = expandedStudentId === student.userId;
                                return (
                                  <>
                                    <tr key={student.userId} className="hover:bg-neutral-50/60 transition-colors">
                                      <td className="p-3.5">
                                        <div className="flex items-center gap-2.5">
                                          {student.avatarUrl ? (
                                            <img
                                              src={student.avatarUrl}
                                              alt={student.name}
                                              className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
                                            />
                                          ) : (
                                            <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                              {student.name.charAt(0)}
                                            </div>
                                          )}
                                          <div className="min-w-0">
                                            <div className="font-bold text-foreground truncate">{student.name}</div>
                                            <div className="text-[11px] text-muted-foreground truncate">{student.email}</div>
                                            {student.phone && (
                                              <div className="text-[10px] text-neutral-500 font-mono flex items-center gap-1 mt-0.5">
                                                <Phone className="w-2.5 h-2.5" />
                                                {student.phone}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </td>

                                      <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                                          {student.enrolledAt ? new Date(student.enrolledAt).toLocaleDateString("fr-FR") : "Date inconnue"}
                                        </div>
                                      </td>

                                      <td className="p-3.5 whitespace-nowrap">
                                        {renderAttendanceStatusBadge(student.attendanceStatus)}
                                      </td>

                                      <td className="p-3.5 min-w-36">
                                        <div className="space-y-1">
                                          <div className="flex justify-between items-center text-[11px]">
                                            <span className="font-bold text-foreground">{student.progressPercent}%</span>
                                            <span className="text-muted-foreground font-mono">
                                              {student.completedLessonsCount} / {student.totalLessonsCount} leçons
                                            </span>
                                          </div>
                                          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200/50">
                                            <div
                                              className={`h-full rounded-full transition-all ${
                                                student.progressPercent === 100
                                                  ? "bg-emerald-600"
                                                  : student.progressPercent > 0
                                                  ? "bg-neutral-900"
                                                  : "bg-transparent"
                                              }`}
                                              style={{ width: `${student.progressPercent}%` }}
                                            />
                                          </div>
                                        </div>
                                      </td>

                                      <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                                        {student.lastActivityAt ? (
                                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                                            <Clock className="w-3.5 h-3.5 text-neutral-400" />
                                            <span>{new Date(student.lastActivityAt).toLocaleDateString("fr-FR")}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                              {new Date(student.lastActivityAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-neutral-400 italic">Aucune interaction</span>
                                        )}
                                      </td>

                                      <td className="p-3.5 whitespace-nowrap">
                                        {student.certificate ? (
                                          <div className="space-y-1">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                              <Award className="w-3 h-3 text-amber-600" />
                                              Diplômée ({student.certificate.examScore ?? "100"}%)
                                            </span>
                                            <div className="font-mono text-[9px] text-neutral-500">
                                              {student.certificate.certificateCode}
                                            </div>
                                          </div>
                                        ) : student.examAttempt ? (
                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                            student.examAttempt.passed
                                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                              : "bg-rose-50 text-rose-800 border border-rose-200"
                                          }`}>
                                            Note : {student.examAttempt.score}% {student.examAttempt.passed ? "(Validé)" : "(Échoué)"}
                                          </span>
                                        ) : (
                                          <span className="text-neutral-400 text-[11px]">Examen non passé</span>
                                        )}
                                      </td>

                                      <td className="p-3.5 text-right whitespace-nowrap">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setExpandedStudentId(isExpanded ? null : student.userId)}
                                          className="text-xs h-7 px-2 font-semibold text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100"
                                        >
                                          {isExpanded ? "Masquer" : "Inspecter"}
                                          <ChevronRight className={`w-3.5 h-3.5 ml-1 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                        </Button>
                                      </td>
                                    </tr>

                                    {/* Expanded Lesson Attendance Checklist */}
                                    {isExpanded && (
                                      <tr className="bg-neutral-50/80">
                                        <td colSpan={7} className="p-4 border-t border-b border-border">
                                          <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                <Layers className="w-3.5 h-3.5 text-neutral-700" />
                                                Relevé d'assiduité leçon par leçon pour {student.name}
                                              </span>
                                              <span className="text-xs text-muted-foreground">
                                                {student.completedLessonsCount} leçons validées sur {student.totalLessonsCount}
                                              </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                              {attendanceData.curriculum.lessons.map((lesson) => {
                                                const isCompleted = student.completedLessonIds.includes(lesson.id);
                                                return (
                                                  <div
                                                    key={lesson.id}
                                                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                                                      isCompleted
                                                        ? "bg-emerald-50/60 border-emerald-200 text-emerald-950 font-medium"
                                                        : "bg-white border-border text-neutral-500"
                                                    }`}
                                                  >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                      <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                                        isCompleted ? "bg-emerald-600 text-white" : "bg-neutral-200 text-neutral-400"
                                                      }`}>
                                                        {isCompleted ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                                                      </span>
                                                      <span className="truncate">{lesson.title}</span>
                                                    </div>
                                                    <span className="text-[10px] font-mono shrink-0 uppercase opacity-75">
                                                      {lesson.type}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: CURRICULUM & PEDAGOGICAL CONTENT */}
                {modalTab === "curriculum" && (
                  <div className="space-y-6">
                    {/* Promo Video Preview if present */}
                    {attendanceData.course.promoVideoUrl && (
                      <div className="bg-neutral-900 text-white p-5 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold text-sm">
                            <Video className="w-4 h-4 text-emerald-400" />
                            <span>Vidéo Promotionnelle & Teaser Officiel</span>
                          </div>
                          <span className="text-[10px] font-mono text-neutral-400">
                            URL externe configurée
                          </span>
                        </div>
                        <div className="aspect-video w-full max-w-2xl bg-black/60 rounded-xl overflow-hidden border border-neutral-800 flex items-center justify-center">
                          {attendanceData.course.promoVideoUrl.includes("youtube.com") || attendanceData.course.promoVideoUrl.includes("youtu.be") ? (
                            <iframe
                              src={attendanceData.course.promoVideoUrl.replace("watch?v=", "embed/")}
                              title="Promo Video"
                              className="w-full h-full"
                              allowFullScreen
                            />
                          ) : (
                            <video src={attendanceData.course.promoVideoUrl} controls className="w-full h-full object-cover" />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Pedagogical pillars */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {attendanceData.course.learningObjectives && attendanceData.course.learningObjectives.length > 0 && (
                        <div className="bg-neutral-50 border border-border p-4 rounded-xl space-y-2">
                          <span className="text-xs font-bold text-foreground block uppercase tracking-wider">
                            Objectifs Pédagogiques
                          </span>
                          <ul className="space-y-1.5 text-xs text-muted-foreground">
                            {attendanceData.course.learningObjectives.map((obj, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                <span>{obj}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {attendanceData.course.requirements && attendanceData.course.requirements.length > 0 && (
                        <div className="bg-neutral-50 border border-border p-4 rounded-xl space-y-2">
                          <span className="text-xs font-bold text-foreground block uppercase tracking-wider">
                            Prérequis & Matériel
                          </span>
                          <ul className="space-y-1.5 text-xs text-muted-foreground">
                            {attendanceData.course.requirements.map((req, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-1.5 shrink-0" />
                                <span>{req}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {attendanceData.course.targetAudience && attendanceData.course.targetAudience.length > 0 && (
                        <div className="bg-neutral-50 border border-border p-4 rounded-xl space-y-2">
                          <span className="text-xs font-bold text-foreground block uppercase tracking-wider">
                            Public Cible Recommandé
                          </span>
                          <ul className="space-y-1.5 text-xs text-muted-foreground">
                            {attendanceData.course.targetAudience.map((aud, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <Users className="w-3.5 h-3.5 text-neutral-500 mt-0.5 shrink-0" />
                                <span>{aud}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Chapters & Lessons syllabus */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-neutral-700" />
                          Architecture du Programme ({attendanceData.curriculum.totalChaptersCount} chapitres · {attendanceData.curriculum.totalLessonsCount} leçons)
                        </h4>
                      </div>

                      {attendanceData.curriculum.chapters.length === 0 ? (
                        <div className="p-8 text-center bg-neutral-50 border border-border rounded-xl">
                          <p className="text-xs text-muted-foreground">Aucun chapitre structuré pour cette formation.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {attendanceData.curriculum.chapters.map((chapter) => {
                            const chapterLessons = attendanceData.curriculum.lessons.filter(l => l.chapterId === chapter.id);
                            return (
                              <div key={chapter.id} className="bg-white border border-border rounded-xl p-4 shadow-2xs space-y-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-bold text-foreground text-sm flex items-center gap-2">
                                      <span className="w-6 h-6 rounded-md bg-neutral-900 text-white font-mono text-xs flex items-center justify-center">
                                        {chapter.order}
                                      </span>
                                      {chapter.title}
                                    </div>
                                    {chapter.description && (
                                      <p className="text-xs text-muted-foreground mt-1 ml-8">{chapter.description}</p>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground font-semibold">
                                    {chapterLessons.length} leçon(s)
                                  </span>
                                </div>

                                {chapterLessons.length > 0 && (
                                  <div className="divide-y divide-border border border-border rounded-lg overflow-hidden ml-8">
                                    {chapterLessons.map((lesson) => (
                                      <div key={lesson.id} className="p-3 bg-neutral-50/50 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2.5">
                                          {lesson.type === "video" && <Video className="w-3.5 h-3.5 text-blue-600" />}
                                          {lesson.type === "pdf" && <FileText className="w-3.5 h-3.5 text-rose-600" />}
                                          {lesson.type === "quiz" && <HelpCircle className="w-3.5 h-3.5 text-amber-600" />}
                                          {lesson.type === "text" && <BookOpen className="w-3.5 h-3.5 text-neutral-600" />}
                                          <span className="font-medium text-foreground">{lesson.title}</span>
                                        </div>

                                        <div className="flex items-center gap-3 text-muted-foreground font-mono text-[11px]">
                                          {lesson.durationMinutes && <span>{lesson.durationMinutes} min</span>}
                                          <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-neutral-200 text-neutral-700">
                                            {lesson.type}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: EXAM & CERTIFICATION */}
                {modalTab === "exam" && (
                  <div className="space-y-6">
                    <div className="bg-neutral-50 border border-border p-5 rounded-2xl flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                          Configuration de la Certification
                        </span>
                        <h4 className="text-base font-bold text-foreground">
                          Examen de Fin de Formation
                        </h4>
                        <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                          Pour obtenir l'attestation numérique officielle vérifiable avec QR code, l'apprenante doit avoir suivi l'ensemble des leçons obligatoires et obtenir la note de passage minimale requise.
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-neutral-900 text-white">
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          Seuil Requis : 70%
                        </span>
                      </div>
                    </div>

                    {/* Certified students list */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Étudiantes Certifiées ({attendanceData.analytics.certifiedCount})
                      </h4>

                      {attendanceData.students.filter(s => !!s.certificate).length === 0 ? (
                        <div className="p-8 text-center bg-white border border-border rounded-xl">
                          <Award className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground font-medium">
                            Aucune attestation n'a encore été délivrée pour ce cours.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {attendanceData.students.filter(s => !!s.certificate).map((s) => (
                            <div key={s.userId} className="p-4 bg-white border border-border rounded-xl shadow-2xs flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold text-xs">
                                  <Award className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="font-bold text-foreground text-xs">{s.name}</div>
                                  <div className="font-mono text-[10px] text-neutral-500">{s.certificate?.certificateCode}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    Délivré le {s.certificate?.issuedAt ? new Date(s.certificate.issuedAt).toLocaleDateString("fr-FR") : "Récemment"}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="font-bold text-emerald-700 text-xs">
                                  Score : {s.certificate?.examScore ?? "100"}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: FAQ */}
                {modalTab === "faq" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-neutral-700" />
                        Foire Aux Questions Pédagogiques ({attendanceData.course.faq?.length || 0})
                      </h4>
                    </div>

                    {!attendanceData.course.faq || attendanceData.course.faq.length === 0 ? (
                      <div className="p-12 text-center bg-neutral-50 border border-border rounded-xl">
                        <HelpCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground font-medium">
                          Aucune question fréquente n'a été rédigée pour cette formation.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {attendanceData.course.faq.map((item, idx) => (
                          <div key={idx} className="bg-white border border-border rounded-xl p-4 shadow-2xs space-y-2">
                            <div className="font-bold text-foreground text-xs flex items-start gap-2">
                              <span className="w-5 h-5 rounded-md bg-neutral-100 text-neutral-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                Q{idx + 1}
                              </span>
                              <span>{item.question}</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed pl-7">
                              {item.answer}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div className="bg-neutral-50 border-t border-border px-6 py-3.5 flex justify-end gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSelectedCourseId(null); setExpandedStudentId(null); }}
              className="text-xs font-semibold bg-white border-border"
            >
              Fermer le dossier
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
