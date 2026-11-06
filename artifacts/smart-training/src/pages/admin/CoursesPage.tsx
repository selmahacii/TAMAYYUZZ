import { useGetAdminCourses, usePublishCourse, useUnpublishCourse, getGetAdminCoursesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { BookOpen, Eye, EyeOff, Users, Clock, Search, GraduationCap, DollarSign } from "lucide-react";

export default function AdminCoursesPage() {
  const { data: courses, isLoading } = useGetAdminCourses();
  const publishMutation = usePublishCourse();
  const unpublishMutation = useUnpublishCourse();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { lang } = useI18n();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  const handlePublish = (id: number, title: string) => {
    publishMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminCoursesQueryKey() });
        toast({ title: `"${title}" ${{ ar: "تم نشره", fr: "publiée", en: "published" }[lang]}` });
      },
      onError: () => toast({ title: "Erreur", variant: "destructive" }),
    });
  };

  const handleUnpublish = (id: number, title: string) => {
    unpublishMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminCoursesQueryKey() });
        toast({ title: `"${title}" ${{ ar: "تم إيقاف نشره", fr: "dépubliée", en: "unpublished" }[lang]}` });
      },
      onError: () => toast({ title: "Erreur", variant: "destructive" }),
    });
  };

  const filtered = (courses ?? []).filter((c) => {
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.coachName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" ? true : filter === "published" ? c.isPublished : !c.isPublished;
    return matchSearch && matchFilter;
  });

  const publishedCount = (courses ?? []).filter((c) => c.isPublished).length;
  const draftCount = (courses ?? []).filter((c) => !c.isPublished).length;

  return (
    <AdminLayout
      title={{ ar: "إدارة الدورات", fr: "Gestion des formations", en: "Course Management" }[lang]}
      subtitle={{ ar: "نشر أو إيقاف نشر الدورات التدريبية", fr: "Publier ou dépublier les formations", en: "Publish or unpublish training courses" }[lang]}
    >
      {/* Summary bar */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-1.5">
          {[
            { key: "all", label: { ar: "الكل", fr: "Toutes", en: "All" }[lang], count: courses?.length ?? 0 },
            { key: "published", label: { ar: "منشور", fr: "Publiées", en: "Published" }[lang], count: publishedCount },
            { key: "draft", label: { ar: "مسودة", fr: "Brouillon", en: "Draft" }[lang], count: draftCount },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setFilter(tab.key as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === tab.key ? "text-white" : "text-foreground/60 hover:text-foreground bg-muted"}`}
              style={filter === tab.key ? { background: "hsl(258,75%,55%)" } : undefined}>
              {tab.label} <span className="opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={{ ar: "بحث في الدورات...", fr: "Rechercher une formation...", en: "Search courses..." }[lang]}
            className="pl-9 bg-white" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="bg-muted shadow-2xs rounded-2xl h-20 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-border shadow-sm rounded-2xl">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{{ ar: "لا توجد دورات", fr: "Aucune formation", en: "No courses found" }[lang]}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((course) => (
            <div key={course.id} className="flex items-center gap-4 p-4 bg-white border border-border shadow-sm rounded-2xl">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${course.isPublished ? "bg-violet-50" : "bg-muted"}`}>
                <BookOpen className={`w-5 h-5 ${course.isPublished ? "text-violet-600" : "text-muted-foreground/50"}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <h3 className="font-semibold text-foreground text-sm truncate">{course.title}</h3>
                  <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${course.isPublished ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${course.isPublished ? "bg-emerald-500" : "bg-amber-500"}`} />
                    {course.isPublished ? { ar: "منشور", fr: "Publiée", en: "Published" }[lang] : { ar: "مسودة", fr: "Brouillon", en: "Draft" }[lang]}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{course.coachName}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{course.enrollmentCount} {{ ar: "منتسب", fr: "inscrit(e)s", en: "enrolled" }[lang]}</span>
                  {course.durationHours && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{course.durationHours}h</span>}
                  <span className="capitalize px-1.5 py-0.5 rounded text-xs bg-muted">{course.category}</span>
                  <span className="flex items-center gap-1 font-semibold text-amber-600">
                    <DollarSign className="w-3 h-3" />
                    {course.isFree ? { ar: "مجاني", fr: "Gratuit", en: "Free" }[lang] : `${parseFloat(String(course.price)).toLocaleString()} ${course.currency}`}
                  </span>
                </div>
              </div>

              <div className="shrink-0">
                {course.isPublished ? (
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => handleUnpublish(course.id, course.title)}
                    disabled={unpublishMutation.isPending}>
                    <EyeOff className="w-3.5 h-3.5" />
                    {{ ar: "إيقاف النشر", fr: "Dépublier", en: "Unpublish" }[lang]}
                  </Button>
                ) : (
                  <Button size="sm" className="gap-1.5 text-xs h-8 font-bold"
                    style={{ background: "hsl(160,60%,40%)" }}
                    onClick={() => handlePublish(course.id, course.title)}
                    disabled={publishMutation.isPending}>
                    <Eye className="w-3.5 h-3.5" />
                    {{ ar: "نشر", fr: "Publier", en: "Publish" }[lang]}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
