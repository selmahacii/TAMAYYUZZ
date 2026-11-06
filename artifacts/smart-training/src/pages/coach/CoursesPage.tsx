import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetMyCourses, useDeleteCourse, getGetMyCoursesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n";
import { CoachLayout } from "@/components/coach/CoachLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, BookOpen, Users, Search, Edit, Trash2, List, CreditCard, Clock } from "lucide-react";

export default function CoachCoursesPage() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { data: courses, isLoading } = useGetMyCourses();
  const deleteMutation = useDeleteCourse();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [pendingDelete, setPendingDelete] = useState<{ id: number; title: string } | null>(null);

  const filtered = (courses ?? []).filter((c) => {
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" ? true : statusFilter === "published" ? c.isPublished : !c.isPublished;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: courses?.length ?? 0,
    published: courses?.filter((c) => c.isPublished).length ?? 0,
    draft: courses?.filter((c) => !c.isPublished).length ?? 0,
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteMutation.mutate(
      { id: pendingDelete.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyCoursesQueryKey() });
          toast({ title: { ar: "تم حذف الدورة", fr: "Formation supprimée", en: "Course deleted" }[lang] });
          setPendingDelete(null);
        },
        onError: () => {
          toast({ title: { ar: "فشل الحذف", fr: "Échec de la suppression", en: "Delete failed" }[lang], variant: "destructive" });
        },
      }
    );
  };

  return (
    <CoachLayout
      title={{ ar: "دوراتي", fr: "Mes formations", en: "My Courses" }[lang]}
      subtitle={{ ar: "إدارة كاملة لجميع دوراتك التدريبية", fr: "Gestion complète de toutes vos formations", en: "Complete management of all your courses" }[lang]}
    >
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {([
            { key: "all", label: { ar: "الكل", fr: "Toutes", en: "All" }[lang], count: counts.all },
            { key: "published", label: { ar: "منشورة", fr: "Publiées", en: "Published" }[lang], count: counts.published },
            { key: "draft", label: { ar: "مسودات", fr: "Brouillons", en: "Drafts" }[lang], count: counts.draft },
          ] as const).map((tab) => (
            <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${statusFilter === tab.key ? "text-white" : "text-foreground/60 hover:text-foreground bg-muted"}`}
              style={statusFilter === tab.key ? { background: "hsl(258,75%,55%)" } : undefined}>
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${statusFilter === tab.key ? "bg-white/20" : "bg-black/5"}`}>{tab.count}</span>
            </button>
          ))}
        </div>
        {user?.isApproved && (
          <Link href="/coach/course/new">
            <Button className="gap-2 bg-black hover:bg-black/90 text-white font-bold shadow-sm">
              <Plus className="w-4 h-4" />
              {{ ar: "دورة جديدة", fr: "Nouvelle formation", en: "New Course" }[lang]}
            </Button>
          </Link>
        )}
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={{ ar: "بحث بالعنوان أو الفئة...", fr: "Rechercher par titre ou catégorie...", en: "Search by title or category..." }[lang]}
          className="pl-9 bg-white" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-white border border-border rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white border border-border rounded-xl">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm font-semibold">{{ ar: "لا توجد دورات مطابقة", fr: "Aucune formation trouvée", en: "No courses found" }[lang]}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((course) => (
            <div key={course.id} className="flex items-center gap-4 p-4 bg-white border border-border shadow-2xs rounded-xl hover:shadow-sm transition-shadow">
              {course.imageUrl ? (
                <img src={course.imageUrl} alt={course.title} className="w-14 h-14 rounded-lg object-cover shrink-0 border border-border" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-neutral-50 border flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6 text-neutral-700" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-foreground text-sm truncate">{course.title}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 capitalize">{course.category}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{course.enrollmentCount} {{ ar: "طالبة", fr: "étudiantes", en: "students" }[lang]}</span>
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${course.isPublished ? "bg-emerald-500" : "bg-amber-500"}`} />
                    {course.isPublished ? { ar: "منشور", fr: "Publié", en: "Published" }[lang] : { ar: "مسودة", fr: "Brouillon", en: "Draft" }[lang]}
                  </span>
                  <span className="capitalize">{course.level}</span>
                  <span className="font-bold text-foreground">{course.isFree ? { ar: "مجاني", fr: "Gratuit", en: "Free" }[lang] : `${parseFloat(course.price).toLocaleString("fr-DZ")} ${course.currency}`}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(course.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="outline" size="sm" title={{ ar: "المحتوى", fr: "Contenu", en: "Content" }[lang]} onClick={() => setLocation(`/coach/course/${course.id}/lessons`)} className="h-8 gap-1.5 text-xs font-bold border-border text-foreground hover:bg-muted">
                  <List className="w-3.5 h-3.5" />
                  {{ ar: "المحتوى", fr: "Contenu", en: "Content" }[lang]}
                </Button>
                <Button variant="outline" size="sm" title={{ ar: "الطالبات", fr: "Étudiantes", en: "Students" }[lang]} onClick={() => setLocation(`/coach/course/${course.id}/students`)} className="w-8 h-8 p-0 border-border text-foreground hover:bg-muted">
                  <Users className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="sm" title={{ ar: "طلب تسعير", fr: "Demande de prix", en: "Price request" }[lang]} onClick={() => setLocation(`/coach/price-requests`)} className="w-8 h-8 p-0 border-border text-foreground hover:bg-muted">
                  <CreditCard className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="sm" title={{ ar: "تعديل", fr: "Modifier", en: "Edit" }[lang]} onClick={() => setLocation(`/coach/course/${course.id}/edit`)} className="w-8 h-8 p-0 border-border text-foreground hover:bg-muted">
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="sm" title={{ ar: "حذف", fr: "Supprimer", en: "Delete" }[lang]} onClick={() => setPendingDelete({ id: course.id, title: course.title })} className="w-8 h-8 p-0 border-rose-100 text-rose-600 hover:bg-rose-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{{ ar: "تأكيد الحذف", fr: "Confirmer la suppression", en: "Confirm deletion" }[lang]}</AlertDialogTitle>
            <AlertDialogDescription>
              {{
                ar: `سيتم حذف "${pendingDelete?.title ?? ""}" نهائيًا مع كل محتواها. لا يمكن التراجع.`,
                fr: `"${pendingDelete?.title ?? ""}" sera supprimée définitivement avec tout son contenu. Cette action est irréversible.`,
                en: `"${pendingDelete?.title ?? ""}" and all its content will be permanently deleted. This action cannot be undone.`,
              }[lang]}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>{{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteMutation.isPending} className="bg-red-600 hover:bg-red-700 text-white">
              {{ ar: "حذف", fr: "Supprimer", en: "Delete" }[lang]}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CoachLayout>
  );
}
