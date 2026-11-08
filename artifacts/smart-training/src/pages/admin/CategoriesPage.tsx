import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tag, BookOpen, Plus, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";

interface Category {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

interface ReportDistribution {
  category: string;
  count: number;
}

export default function AdminCategoriesPage() {
  const { lang } = useI18n();
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Fetch categories from the DB table
  const { data: categories, isLoading: isLoadingCats } = useQuery<Category[]>({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  // Fetch category distribution stats from reports
  const { data: reports, isLoading: isLoadingStats } = useQuery<{ categoryDistribution: ReportDistribution[] }>({
    queryKey: ["admin", "reports-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reports", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
  });

  // Create Category mutation
  const createMutation = useMutation({
    mutationFn: async (newCat: { name: string; description: string | null }) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newCat),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create category");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast({
        title: {
          ar: "تم إنشاء الفئة بنجاح",
          fr: "Catégorie créée avec succès",
          en: "Category created successfully"
        }[lang],
      });
      setName("");
      setDescription("");
      setIsOpen(false);
    },
    onError: (err: any) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  // Delete Category mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete category");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast({
        title: {
          ar: "تم حذف الفئة بنجاح",
          fr: "Catégorie supprimée avec succès",
          en: "Category deleted successfully"
        }[lang],
      });
      setPendingDelete(null);
    },
    onError: (err: any) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name,
      description: description || null,
    });
  };

  const getCourseCount = (catName: string) => {
    if (!reports?.categoryDistribution || !catName) return 0;
    const match = reports.categoryDistribution.find(d => d && d.category && d.category.toLowerCase().trim() === catName.toLowerCase().trim());
    return match ? match.count : 0;
  };

  const PALETTE = ["#171717", "#4b5563", "#059669", "#2563eb", "#dc2626", "#7c3aed", "#db2777", "#0d9488", "#ea580c", "#65a30d"];

  const isLoading = isLoadingCats || isLoadingStats;
  const categoryList = Array.isArray(categories) ? categories : [];

  return (
    <AdminLayout
      title={{ ar: "فئات الدورات", fr: "Catégories de formations", en: "Course Categories" }[lang]}
      subtitle={{ ar: "عرض وإدارة فئات الدورات التدريبية", fr: "Voir et gérer les catégories de formations", en: "View and manage course categories" }[lang]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories list */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-foreground">
              {{ ar: "الفئات المتاحة", fr: "Catégories existantes", en: "Existing categories" }[lang]}
              <span className="ml-2 text-muted-foreground">({categoryList.length})</span>
            </h3>
            
            <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setIsOpen(false); setName(""); setDescription(""); } }}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsOpen(true)} size="sm" className="flex items-center gap-1 bg-black hover:bg-black/90 text-white font-bold">
                  <Plus className="w-4 h-4" />
                  {{ ar: "إضافة فئة", fr: "Ajouter une catégorie", en: "Add Category" }[lang]}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white border border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">
                    {{ ar: "إضافة فئة جديدة", fr: "Ajouter une nouvelle catégorie", en: "Add New Category" }[lang]}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                  <div className="space-y-1">
                    <Label htmlFor="catName" className="text-foreground">{{ ar: "اسم الفئة", fr: "Nom de la catégorie", en: "Category name" }[lang]}</Label>
                    <Input
                      id="catName"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. DevOps, Intelligence Artificielle"
                      required
                      className="bg-white border-border text-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="catDesc" className="text-foreground">{{ ar: "الوصف", fr: "Description", en: "Description" }[lang]}</Label>
                    <Textarea
                      id="catDesc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Description..."
                      className="bg-white border-border text-foreground"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="border-border text-foreground">
                      {{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      {{ ar: "إنشاء الفئة", fr: "Créer la catégorie", en: "Create Category" }[lang]}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : categoryList.length === 0 ? (
            <div className="text-center py-12 bg-white border border-border rounded-xl">
              <Tag className="w-10 h-10 text-muted-foreground/35 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm font-medium">{{ ar: "لا توجد فئات", fr: "Aucune catégorie", en: "No categories" }[lang]}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categoryList.map((rawCat: any, i: number) => {
                const catName = typeof rawCat === "string" ? rawCat : (rawCat?.name ?? "");
                const catDesc = typeof rawCat === "object" ? (rawCat?.description ?? null) : null;
                const catObj: Category = typeof rawCat === "object" && rawCat?.id ? rawCat : { id: i + 1, name: catName, description: catDesc, createdAt: new Date().toISOString() };
                const count = getCourseCount(catName);
                const maxCount = Math.max(1, ...(reports?.categoryDistribution?.map(d => d.count) || [1]));
                return (
                  <div key={catObj.id || i} className="flex items-center justify-between gap-4 p-4 bg-white border border-border shadow-2xs rounded-xl hover:shadow-xs transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${PALETTE[i % PALETTE.length]}10` }}>
                        <Tag className="w-4.5 h-4.5" style={{ color: PALETTE[i % PALETTE.length] }} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">{catName}</div>
                        <div className="text-xs text-muted-foreground">
                          {count} {{ ar: "دورة منشورة", fr: "formation(s) publiée(s)", en: "published course(s)" }[lang]}
                        </div>
                        {catDesc && (
                          <p className="text-[10px] text-muted-foreground/80 mt-1 max-w-sm">{catDesc}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-2 rounded-full w-20 bg-muted overflow-hidden hidden sm:block">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (count / maxCount) * 100)}%`, background: PALETTE[i % PALETTE.length] }} />
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setPendingDelete(catObj)} className="border-rose-100 text-rose-700 hover:bg-rose-50/50 p-1.5 h-8 w-8">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="bg-white border border-border shadow-2xs rounded-xl p-5 h-fit space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4.5 h-4.5 text-foreground" />
            <h3 className="text-sm font-bold text-foreground">{{ ar: "معلومات", fr: "Informations", en: "Information" }[lang]}</h3>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed font-medium">
            {{ 
              ar: "يمكنك الآن إضافة فئات جديدة مباشرة من لوحة التحكم. سيتمكن المدربون من اختيار هذه الفئات عند إنشاء دورات جديدة.", 
              fr: "Vous pouvez désormais créer des catégories directement. Les formateurs pourront choisir ces catégories prédéfinies lors de la création de nouvelles formations.", 
              en: "You can now create categories directly from the dashboard. Coaches will be able to select these predefined categories when creating new courses." 
            }[lang]}
          </p>
          <div className="pt-4 border-t border-border space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{{ ar: "إجمالي الفئات", fr: "Total catégories", en: "Total categories" }[lang]}</span>
              <span className="text-foreground font-bold">{categoryList.length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{{ ar: "إجمالي الدورات", fr: "Total formations", en: "Total courses" }[lang]}</span>
              <span className="text-foreground font-bold">
                {reports?.categoryDistribution?.reduce((s, c) => s + (c?.count || 0), 0) ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {{ ar: "حذف الفئة؟", fr: "Supprimer cette catégorie ?", en: "Delete this category?" }[lang]}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {{
                ar: `سيتم حذف فئة "${pendingDelete?.name}" نهائيًا. هذا الإجراء لا يمكن التراجع عنه.`,
                fr: `La catégorie "${pendingDelete?.name}" sera supprimée définitivement. Cette action est irréversible.`,
                en: `The category "${pendingDelete?.name}" will be permanently deleted. This action cannot be undone.`,
              }[lang]}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>{{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {{ ar: "حذف", fr: "Supprimer", en: "Delete" }[lang]}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
