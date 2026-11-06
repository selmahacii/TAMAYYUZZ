import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetMyCourses } from "@workspace/api-client-react";
import { useI18n } from "@/i18n";
import { CoachLayout } from "@/components/coach/CoachLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Award, TrendingUp, Search, ArrowLeft, BookOpen, Mail } from "lucide-react";

interface StudentProgress {
  id: number; name: string; email: string;
  completedLessons: number; totalLessons: number;
  progressPercent: number; isCompleted: boolean;
  courseId: number; courseTitle: string;
}

export default function CoachStudentsPage() {
  const params = useParams<{ id?: string }>();
  const singleCourseId = params.id ? parseInt(params.id, 10) : null;
  const [, setLocation] = useLocation();
  const { lang } = useI18n();
  const { data: myCourses } = useGetMyCourses();

  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseName, setCourseName] = useState("");
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const token = localStorage.getItem("auth_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (singleCourseId) {
      setLoading(true);
      Promise.all([
        fetch(`${BASE}/api/coach/courses/${singleCourseId}/students`, { headers }).then((r) => r.json()),
        fetch(`${BASE}/api/courses/${singleCourseId}`, { headers }).then((r) => r.json()).catch(() => null),
      ]).then(([studentsData, courseData]) => {
        if (Array.isArray(studentsData)) {
          setStudents(studentsData.map((s: any) => ({ ...s, courseId: singleCourseId, courseTitle: courseData?.title ?? "" })));
        }
        if (courseData?.title) setCourseName(courseData.title);
      }).finally(() => setLoading(false));
      return;
    }

    if (!myCourses) return;
    setLoading(true);
    Promise.all(
      myCourses.map((c) =>
        fetch(`${BASE}/api/coach/courses/${c.id}/students`, { headers })
          .then((r) => r.json())
          .then((list) => (Array.isArray(list) ? list.map((s: any) => ({ ...s, courseId: c.id, courseTitle: c.title })) : []))
          .catch(() => [])
      )
    ).then((lists) => setStudents(lists.flat())).finally(() => setLoading(false));
  }, [singleCourseId, myCourses]);

  const filtered = students.filter((s) => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchCourse = courseFilter === "all" || s.courseId === parseInt(courseFilter, 10);
    return matchSearch && matchCourse;
  });

  const avgProgress = filtered.length > 0 ? Math.round(filtered.reduce((s, st) => s + st.progressPercent, 0) / filtered.length) : 0;
  const completedCount = filtered.filter((s) => s.isCompleted).length;

  return (
    <CoachLayout
      title={singleCourseId ? (courseName || { ar: "الطالبات", fr: "Étudiantes", en: "Students" }[lang]) : { ar: "الطالبات", fr: "Étudiantes", en: "Students" }[lang]}
      subtitle={{ ar: "متابعة تقدم الطالبات عبر جميع دوراتك", fr: "Suivi de la progression des étudiantes sur toutes vos formations", en: "Track student progress across all your courses" }[lang]}
    >
      {singleCourseId && (
        <Button variant="ghost" size="sm" onClick={() => setLocation("/coach/students")} className="gap-2 text-xs font-bold text-muted-foreground hover:text-foreground mb-4 -ml-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          {{ ar: "جميع الطالبات", fr: "Toutes les étudiantes", en: "All students" }[lang]}
        </Button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: { ar: "إجمالي الطالبات", fr: "Total étudiantes", en: "Total Students" }[lang], value: filtered.length, icon: <Users className="w-5 h-5 text-violet-600" />, bg: "bg-violet-50/50" },
          { label: { ar: "متوسط التقدم", fr: "Progression moy.", en: "Avg. Progress" }[lang], value: `${avgProgress}%`, icon: <TrendingUp className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50/50" },
          { label: { ar: "أكملن الدورة", fr: "Ont terminé", en: "Completed" }[lang], value: completedCount, icon: <Award className="w-5 h-5 text-emerald-600" />, bg: "bg-emerald-50/50" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-border shadow-2xs rounded-xl p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${stat.bg}`}>{stat.icon}</div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">{stat.label}</div>
              <div className="text-base font-black text-foreground mt-0.5" style={{ fontFamily: "Cairo, sans-serif" }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={{ ar: "بحث بالاسم أو البريد...", fr: "Rechercher par nom ou email...", en: "Search by name or email..." }[lang]} className="pl-9 bg-white" />
        </div>
        {!singleCourseId && (myCourses?.length ?? 0) > 1 && (
          <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="h-10 px-3 bg-white border border-border rounded-lg text-foreground text-sm">
            <option value="all">{{ ar: "كل الدورات", fr: "Toutes les formations", en: "All courses" }[lang]}</option>
            {myCourses?.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-white border border-border rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white border border-border rounded-xl">
          <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-semibold text-sm">{{ ar: "لا توجد طالبات مسجلات", fr: "Aucune étudiante inscrite", en: "No students enrolled" }[lang]}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((student) => (
            <div key={`${student.courseId}-${student.id}`} className="p-4 bg-white border border-border shadow-2xs rounded-xl">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 bg-black">
                  {student.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground text-sm">{student.name}</span>
                    {student.isCompleted && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100">
                        <Award className="w-3 h-3" />{{ ar: "مكتمل", fr: "Terminé", en: "Completed" }[lang]}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{student.email}</span>
                    {!singleCourseId && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{student.courseTitle}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-black text-foreground">{student.progressPercent}%</div>
                  <div className="text-[10px] text-muted-foreground">{student.completedLessons}/{student.totalLessons} {{ ar: "دروس", fr: "leçons", en: "lessons" }[lang]}</div>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${student.progressPercent}%`,
                    background: student.isCompleted ? "#10b981" : student.progressPercent > 50 ? "hsl(258,75%,55%)" : "#f59e0b",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </CoachLayout>
  );
}
