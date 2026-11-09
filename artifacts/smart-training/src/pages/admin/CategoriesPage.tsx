import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Layers, Target, Code2, Rocket, Palette, Coins, Briefcase, MessageSquareQuote,
  BookOpen, Plus, Trash2, Loader2, Sparkles, Check, Globe, HelpCircle, ShieldCheck
} from "lucide-react";
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

const PRESET_ICONS = [
  { id: "target", label: "Marketing", icon: Target },
  { id: "code", label: "Tech & Dev", icon: Code2 },
  { id: "rocket", label: "Entrepreneuriat", icon: Rocket },
  { id: "palette", label: "Design & UX", icon: Palette },
  { id: "coins", label: "Finance & Fiscal", icon: Coins },
  { id: "briefcase", label: "Business", icon: Briefcase },
  { id: "comm", label: "Communication", icon: MessageSquareQuote },
  { id: "layers", label: "Général", icon: Layers },
];

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
  const [selectedIconId, setSelectedIconId] = useState("layers");
  const [targetAudience, setTargetAudience] = useState("");

  // Computed slug
  const slug = useMemo(() => {
    return name
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }, [name]);

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
      setTargetAudience("");
      setSelectedIconId("layers");
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
    if (!name.trim()) return;
    const finalDesc = description.trim() + (targetAudience.trim() ? ` [Public cible : ${targetAudience.trim()}]` : "");
    createMutation.mutate({
      name: name.trim(),
      description: finalDesc || null,
    });
  };

  const getCourseCount = (catName: string) => {
    if (!reports?.categoryDistribution || !catName) return 0;
    const match = reports.categoryDistribution.find(d => d && d.category && d.category.toLowerCase().trim() === catName.toLowerCase().trim());
    return match ? match.count : 0;
  };

  const resolveCategoryIcon = (catName: string) => {
    const n = (catName || "").toLowerCase().trim();
    if (n.includes("market") || n.includes("pub") || n.includes("ad")) return <Target className="w-5 h-5 text-neutral-800" />;
    if (n.includes("tech") || n.includes("dev") || n.includes("prog") || n.includes("web") || n.includes("code")) return <Code2 className="w-5 h-5 text-neutral-800" />;
    if (n.includes("entrep") || n.includes("start") || n.includes("commerce")) return <Rocket className="w-5 h-5 text-neutral-800" />;
    if (n.includes("design") || n.includes("ui") || n.includes("ux") || n.includes("art")) return <Palette className="w-5 h-5 text-neutral-800" />;
    if (n.includes("finan") || n.includes("compta") || n.includes("fiscal") || n.includes("argent")) return <Coins className="w-5 h-5 text-neutral-800" />;
    if (n.includes("busin") || n.includes("manag") || n.includes("vent")) return <Briefcase className="w-5 h-5 text-neutral-800" />;
    if (n.includes("comm") || n.includes("media") || n.includes("presse")) return <MessageSquareQuote className="w-5 h-5 text-neutral-800" />;
    return <Layers className="w-5 h-5 text-neutral-800" />;
  };

  const isLoading = isLoadingCats || isLoadingStats;
  const categoryList = Array.isArray(categories) ? categories : [];

  return (
    <AdminLayout
      title={{ ar: "فئات الدورات", fr: "Catégories de formations", en: "Course Categories" }[lang]}
      subtitle={{ ar: "إدارة الهيكل الأكاديمي وتصنيف الدورات التدريبية", fr: "Gestion de l'architecture académique et classification des formations", en: "Manage academic taxonomy and course classification" }[lang]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center bg-white border border-border p-4 rounded-xl shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {{ ar: "الفئات المعتمدة في المنصة", fr: "Catégories officielles enregistrées", en: "Registered platform categories" }[lang]}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {{ ar: "تنظيم المسارات التعليمية المتاحة للمدربين والمتدربات", fr: "Organisation des parcours pédagogiques proposés aux étudiantes", en: "Pedagogical pathways available to students" }[lang]}
              </p>
            </div>
            
            <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setIsOpen(false); setName(""); setDescription(""); setTargetAudience(""); } }}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsOpen(true)} size="sm" className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold shadow-xs">
                  <Plus className="w-4 h-4" />
                  {{ ar: "إضافة فئة جديدة", fr: "Créer une catégorie", en: "Add Category" }[lang]}
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-3xl bg-white border border-border p-0 overflow-hidden shadow-2xl rounded-2xl">
                {/* Modal Header */}
                <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800 flex items-start justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-200 border border-neutral-700 mb-2">
                      <Layers className="w-3.5 h-3.5" />
                      {{ ar: "الهيكل الأكاديمي", fr: "Taxonomie Pédagogique", en: "Pedagogical Taxonomy" }[lang]}
                    </div>
                    <DialogTitle className="text-xl font-bold tracking-tight text-white">
                      {{ ar: "إنشاء فئة تدريبية رسمية", fr: "Créer une catégorie académique", en: "Create Academic Category" }[lang]}
                    </DialogTitle>
                    <p className="text-xs text-neutral-300 mt-1 max-w-xl leading-relaxed">
                      {{ 
                        ar: "تحديد تصنيف رسمي يتيح للمدربين نشر دوراتهم تحته ومساعدة الطالبات على العثور على التخصص المناسب.", 
                        fr: "Définissez une catégorie pour classifier les formations, guider les formateurs lors de la publication et orienter les étudiantes.", 
                        en: "Define an official category to classify courses, structure coach submissions and guide student navigation." 
                      }[lang]}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Form Inputs */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="catName" className="text-xs font-bold text-foreground flex items-center justify-between">
                          <span>{{ ar: "اسم الفئة الرسمي", fr: "Nom de la catégorie", en: "Category Name" }[lang]} *</span>
                          {slug && <span className="font-mono text-[10px] text-muted-foreground">/{slug}</span>}
                        </Label>
                        <Input
                          id="catName"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="ex. Intelligence Artificielle & Data"
                          required
                          className="bg-neutral-50 border-border focus:bg-white text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="targetAudience" className="text-xs font-bold text-foreground">
                          {{ ar: "الجمهور المستهدف", fr: "Public cible recommandé", en: "Target Audience" }[lang]}
                        </Label>
                        <Input
                          id="targetAudience"
                          value={targetAudience}
                          onChange={(e) => setTargetAudience(e.target.value)}
                          placeholder="ex. Étudiantes en reconversion, Freelances, Cadres"
                          className="bg-neutral-50 border-border focus:bg-white text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="catDesc" className="text-xs font-bold text-foreground">
                          {{ ar: "الوصف البيداغوجي والمخرجات", fr: "Description pédagogique", en: "Pedagogical Description" }[lang]}
                        </Label>
                        <Textarea
                          id="catDesc"
                          rows={3}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Détaillez les compétences enseignées, les cas pratiques et les objectifs professionnels visés..."
                          className="bg-neutral-50 border-border focus:bg-white text-sm resize-none"
                        />
                      </div>

                      {/* Icon selector */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground block">
                          {{ ar: "أيقونة التصنيف المهني", fr: "Icône thématique", en: "Thematic Icon" }[lang]}
                        </Label>
                        <div className="grid grid-cols-4 gap-2">
                          {PRESET_ICONS.map((item) => {
                            const IconComponent = item.icon;
                            const isSelected = selectedIconId === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setSelectedIconId(item.id)}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                                  isSelected
                                    ? "bg-neutral-900 border-neutral-900 text-white shadow-xs"
                                    : "bg-neutral-50 border-border hover:bg-neutral-100 text-neutral-700"
                                }`}
                              >
                                <IconComponent className="w-4 h-4 mb-1" />
                                <span className="text-[10px] font-semibold truncate w-full">{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Live Card Preview & Standards */}
                    <div className="space-y-4 flex flex-col justify-between">
                      <div>
                        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2">
                          <Sparkles className="w-3.5 h-3.5 text-neutral-600" />
                          {{ ar: "معاينة حية في الدليل", fr: "Aperçu en direct dans le catalogue", en: "Live Catalogue Preview" }[lang]}
                        </Label>

                        <div className="bg-white border border-border shadow-xs rounded-xl p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
                                {(() => {
                                  const found = PRESET_ICONS.find(p => p.id === selectedIconId);
                                  const Comp = found ? found.icon : Layers;
                                  return <Comp className="w-5 h-5 text-neutral-900" />;
                                })()}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-foreground">
                                  {name.trim() || { ar: "اسم الفئة التجريبي", fr: "Nouvelle Catégorie", en: "Category Name" }[lang]}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  0 {{ ar: "دورة منشورة", fr: "formation publiée", en: "published course" }[lang]}
                                </div>
                              </div>
                            </div>
                            <Badge variant="outline" className="font-mono text-[10px] bg-neutral-50 text-neutral-600 border-neutral-200">
                              /{slug || "slug-url"}
                            </Badge>
                          </div>

                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {description.trim() || {
                              ar: "وصف بيداغوجي وتطبيقي يوضح المحاور التعليمية المندرجة تحت هذا التخصص...",
                              fr: "Description pédagogique expliquant les axes de formation et les compétences acquises...",
                              en: "Pedagogical description explaining the learning pillars and acquired competencies..."
                            }[lang]}
                          </p>

                          {targetAudience.trim() && (
                            <div className="pt-2 border-t border-border flex items-center gap-1 text-[11px] text-neutral-600">
                              <span className="font-semibold text-neutral-800">Public :</span>
                              <span className="truncate">{targetAudience.trim()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quality standards notice */}
                      <div className="bg-neutral-50 border border-border rounded-xl p-3.5 text-xs text-neutral-600 space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-neutral-800">
                          <ShieldCheck className="w-4 h-4 text-neutral-700" />
                          <span>{{ ar: "معايير النشر الأكاديمي", fr: "Règles de classification", en: "Classification standards" }[lang]}</span>
                        </div>
                        <ul className="space-y-1 text-[11px] text-muted-foreground list-disc list-inside">
                          <li>{{ ar: "تجنب التكرار مع الفئات الموجودة مسبقًا", fr: "Éviter les redondances avec les catégories déjà actives", en: "Avoid duplicates with active categories" }[lang]}</li>
                          <li>{{ ar: "ربط الدورات المستقبلية يتم مباشرة من واجهة المدرب", fr: "Rattachement automatique lors de la soumission de cours par les coachs", en: "Automatic linking when coaches submit courses" }[lang]}</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex justify-end gap-2.5 pt-5 mt-6 border-t border-border">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="border-border text-foreground text-xs">
                      {{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending || !name.trim()} className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs px-5">
                      {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                      {{ ar: "تأكيد وإنشاء الفئة", fr: "Enregistrer la catégorie", en: "Save Category" }[lang]}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20 bg-white border border-border rounded-xl">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : categoryList.length === 0 ? (
            <div className="text-center py-16 bg-white border border-border rounded-xl">
              <Layers className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm font-medium">{{ ar: "لا توجد فئات", fr: "Aucune catégorie enregistrée", en: "No categories recorded" }[lang]}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {categoryList.map((rawCat: any, i: number) => {
                const catName = typeof rawCat === "string" ? rawCat : (rawCat?.name ?? "");
                const catDesc = typeof rawCat === "object" ? (rawCat?.description ?? null) : null;
                const catObj: Category = typeof rawCat === "object" && rawCat?.id ? rawCat : { id: i + 1, name: catName, description: catDesc, createdAt: new Date().toISOString() };
                const count = getCourseCount(catName);
                const maxCount = Math.max(1, ...(reports?.categoryDistribution?.map(d => d.count) || [1]));
                const categorySlug = catName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

                return (
                  <div key={catObj.id || i} className="group flex items-center justify-between gap-4 p-4 bg-white border border-border shadow-2xs rounded-xl hover:border-neutral-300 hover:shadow-xs transition-all">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200/90 flex items-center justify-center shrink-0 text-neutral-800 group-hover:bg-neutral-200/50 transition-colors">
                        {resolveCategoryIcon(catName)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-foreground tracking-tight">{catName}</span>
                          <span className="font-mono text-[10px] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200/70">
                            /{categorySlug}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {count} {{ ar: "دورة", fr: "formation" + (count > 1 ? "s" : ""), en: "course" + (count > 1 ? "s" : "") }[lang]}
                          </span>
                        </div>
                        {catDesc && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1 leading-relaxed max-w-xl">
                            {catDesc}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="h-1.5 rounded-full w-24 bg-neutral-100 overflow-hidden hidden sm:block border border-neutral-200/50">
                        <div className="h-full rounded-full bg-neutral-800" style={{ width: `${Math.min(100, (count / maxCount) * 100)}%` }} />
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setPendingDelete(catObj)} className="text-neutral-400 hover:text-red-600 hover:bg-red-50 p-1.5 h-8 w-8 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Info Panel */}
        <div className="bg-white border border-border shadow-2xs rounded-xl p-5 h-fit space-y-5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4.5 h-4.5 text-neutral-900" />
            <h3 className="text-sm font-bold text-foreground">
              {{ ar: "دليل الهيكل الأكاديمي", fr: "Architecture des formations", en: "Academic Architecture" }[lang]}
            </h3>
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed">
            {{ 
              ar: "الفئات المعتمدة تظهر مباشرة في شريط التنقل الرئيسي للزوار، وتسمح للمدربين باستهداف المتدربات وفق التخصصات الأكثر طلبًا في سوق العمل الجزائري.", 
              fr: "Les catégories approuvées organisent le catalogue officiel et structurent le moteur de recherche des formations selon les filières porteuses en Algérie.", 
              en: "Approved categories structure the public directory and power the course search engine across trending sectors in Algeria." 
            }[lang]}
          </p>

          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">{{ ar: "إجمالي الفئات المسجلة", fr: "Total catégories", en: "Total categories" }[lang]}</span>
              <span className="font-bold text-foreground font-mono bg-neutral-100 px-2 py-0.5 rounded">{categoryList.length}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">{{ ar: "إجمالي الدورات المفعلة", fr: "Total formations rattachées", en: "Total linked courses" }[lang]}</span>
              <span className="font-bold text-foreground font-mono bg-neutral-100 px-2 py-0.5 rounded">
                {reports?.categoryDistribution?.reduce((s, c) => s + (c?.count || 0), 0) ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent className="bg-white border border-border rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              {{ ar: "تأكيد حذف الفئة التدريبية", fr: "Confirmer la suppression de la catégorie", en: "Confirm Category Deletion" }[lang]}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {{
                ar: `سيتم حذف فئة "${pendingDelete?.name}" من دليل التصنيف. الدورات المرتبطة بهذه الفئة لن يتم حذفها ولكن سيتطلب إعادة تعيين تصنيفها.`,
                fr: `La catégorie "${pendingDelete?.name}" sera retirée de la taxonomie. Les formations existantes resteront disponibles mais nécessiteront une réaffectation.`,
                en: `Category "${pendingDelete?.name}" will be removed from the taxonomy. Associated courses will remain intact but may require reassignment.`,
              }[lang]}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel disabled={deleteMutation.isPending} className="text-xs">{{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
            >
              {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {{ ar: "تأكيد الحذف", fr: "Supprimer définitivement", en: "Delete" }[lang]}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

