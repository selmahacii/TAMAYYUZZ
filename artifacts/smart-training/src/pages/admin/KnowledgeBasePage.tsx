import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  HelpCircle,
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  Search,
  Loader2,
  BookOpen,
  Eye,
  Clock,
  FileText
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface KBArticle {
  id: number;
  title: string;
  content: string;
  category: string;
  isPublished: boolean;
  viewCount: number;
  order: number;
  createdAt: string;
}

const CATEGORIES = ["general", "students", "coaches", "billing", "technical"];

export default function AdminKnowledgeBasePage() {
  const { lang } = useI18n();
  const { toast } = useToast();
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<KBArticle | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Dialog state
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [isPublished, setIsPublished] = useState(true);
  const [order, setOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const token = localStorage.getItem("auth_token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/admin/knowledge-base`, { headers });
      setArticles(await r.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleOpenAdd = () => {
    setEditId(null);
    setTitle("");
    setContent("");
    setCategory("general");
    setIsPublished(true);
    setOrder(0);
    setIsOpen(true);
  };

  const handleOpenEdit = (article: KBArticle) => {
    setEditId(article.id);
    setTitle(article.title);
    setContent(article.content);
    setCategory(article.category);
    setIsPublished(article.isPublished);
    setOrder(article.order);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    
    setSaving(true);
    const url = editId !== null ? `${BASE}/api/admin/knowledge-base/${editId}` : `${BASE}/api/admin/knowledge-base`;
    const method = editId !== null ? "PUT" : "POST";
    
    try {
      const r = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({ title, content, category, isPublished, order })
      });
      if (r.ok) {
        toast({
          title: editId !== null 
            ? { ar: "تم التحديث", fr: "Article mis à jour", en: "Article updated" }[lang] 
            : { ar: "تم الإنشاء", fr: "Article créé", en: "Article created" }[lang]
        });
        setIsOpen(false);
        fetchArticles();
      } else {
        throw new Error("Failed to save article");
      }
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      const res = await fetch(`${BASE}/api/admin/knowledge-base/${id}`, { method: "DELETE", headers });
      if (res.ok) {
        toast({ title: { ar: "تم الحذف", fr: "Article supprimé", en: "Deleted" }[lang] });
        setArticles((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  const catLabel = (cat: string): string => {
    const labels: Record<string, Record<string, string>> = {
      general: { ar: "عام", fr: "Général", en: "General" },
      students: { ar: "الطالبات", fr: "Étudiantes", en: "Students" },
      coaches: { ar: "المدربات", fr: "Coachs", en: "Coaches" },
      billing: { ar: "الفواتير", fr: "Facturation", en: "Billing" },
      technical: { ar: "تقني", fr: "Technique", en: "Technical" },
    };
    return labels[cat]?.[lang] ?? cat;
  };

  const filteredArticles = searchQuery
    ? articles.filter(
        (art) =>
          (art.title && art.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (art.content && art.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (art.category && art.category.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : articles;

  // Real-time micro statistics for the FAQ form
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const readTime = Math.max(1, Math.round(wordCount / 200)); // Average 200 WPM

  return (
    <AdminLayout
      title={{ ar: "قاعدة المعرفة", fr: "Base de connaissances", en: "Knowledge Base" }[lang]}
      subtitle={{ ar: "إدارة مقالات المساعدة والأسئلة الشائعة", fr: "Gérer les articles d'aide et FAQ", en: "Manage help articles and FAQ" }[lang]}
    >
      {/* Search and Action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={{ ar: "البحث في المقالات والأسئلة...", fr: "Rechercher un article ou FAQ...", en: "Search articles or FAQs..." }[lang]}
            className="pl-9 bg-white border-border text-foreground"
          />
        </div>

        <Button onClick={handleOpenAdd} className="flex items-center gap-2 bg-black hover:bg-black/90 text-white font-bold self-stretch sm:self-auto shadow-sm">
          <Plus className="w-4 h-4" />
          {{ ar: "مقالة جديدة", fr: "Nouvel article", en: "New Article" }[lang]}
        </Button>
      </div>

      {/* Articles list */}
      {loading ? (
        <div className="space-y-3">
          <div className="h-16 bg-white border border-border rounded-xl animate-pulse" />
          <div className="h-16 bg-white border border-border rounded-xl animate-pulse" />
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="text-center py-20 bg-white border border-border rounded-xl">
          <HelpCircle className="w-12 h-12 text-muted-foreground/35 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm font-semibold">{{ ar: "لا توجد مقالات", fr: "Aucun article d'aide répertorié", en: "No help articles listed" }[lang]}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredArticles.map((article) => {
            const isExp = expandedId === article.id;
            return (
              <div key={article.id} className="bg-white border border-border rounded-xl overflow-hidden shadow-2xs hover:shadow-xs transition-all">
                <div
                  className="flex items-center justify-between gap-4 p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExp ? null : article.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-neutral-50 text-neutral-800 border">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-foreground">{article.title}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px] py-0">
                          {catLabel(article.category)}
                        </Badge>
                        {!article.isPublished && (
                          <Badge variant="outline" className="border-amber-100 text-amber-700 bg-amber-50 text-[10px] py-0">
                            {{ ar: "مسودة", fr: "Brouillon", en: "Draft" }[lang]}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3" />{article.viewCount} views</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(article)}
                      className="w-8 h-8 p-0 border-border text-foreground hover:bg-muted"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPendingDelete(article)}
                      className="w-8 h-8 p-0 border-rose-100 text-rose-700 hover:bg-rose-50/50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(isExp ? null : article.id)}
                      className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground"
                    >
                      {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                {isExp && (
                  <div className="px-4 pb-4 border-t border-border pt-4 bg-[#fafafa]">
                    <p className="text-muted-foreground text-sm whitespace-pre-wrap leading-relaxed font-medium">
                      {article.content}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Creation/Edition Modal Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) setIsOpen(false); }}>
        <DialogContent className="max-w-4xl bg-white border border-border p-6 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground font-black">
              {editId !== null 
                ? { ar: "تعديل مقالة المساعدة", fr: "Modifier l'article d'aide", en: "Edit Help Article" }[lang] 
                : { ar: "إنشاء مقالة جديدة", fr: "Créer un nouvel article", en: "Create New Help Article" }[lang]}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {{ ar: "كتابة وتنسيق مقالات الدعم الفني والأسئلة الشائعة", fr: "Rédiger et catégoriser les articles d'aide de la plateforme", en: "Write and categorize support articles and FAQs" }[lang]}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
            
            {/* Editor form (Left side) */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                    {{ ar: "الفئة", fr: "Catégorie", en: "Category" }[lang]}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-black"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{catLabel(c)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                    {{ ar: "الترتيب / الأولوية", fr: "Ordre d'affichage", en: "Display Order" }[lang]}
                  </label>
                  <Input
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                    className="bg-white border-border text-foreground font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                  {{ ar: "عنوان المقال", fr: "Titre de l'article", en: "Article Title" }[lang]} *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Comment s'inscrire à une formation ?"
                  required
                  className="bg-white border-border text-foreground font-semibold"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                    {{ ar: "المحتوى", fr: "Contenu de l'article", en: "Article Content" }[lang]} *
                  </label>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {charCount} chars · {wordCount} words
                  </span>
                </div>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  placeholder="Rédigez l'article..."
                  required
                  className="bg-white border-border text-foreground min-h-[140px] text-xs font-medium leading-relaxed"
                />
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Temps de lecture estimé : ~{readTime} min</span>
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-black focus:ring-black"
                />
                <label htmlFor="isPublished" className="text-foreground text-xs font-semibold cursor-pointer">
                  {{ ar: "نشر المقال فوراً", fr: "Publier cet article", en: "Publish this article" }[lang]}
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1 border-border text-foreground">
                  {{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}
                </Button>
                <Button type="submit" disabled={saving} className="flex-1 bg-black hover:bg-black/90 text-white font-bold">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  {editId !== null 
                    ? { ar: "حفظ التعديلات", fr: "Mettre à jour", en: "Update" }[lang] 
                    : { ar: "إنشاء المقال", fr: "Créer", en: "Create" }[lang]}
                </Button>
              </div>
            </form>

            {/* Visual real-time preview (Right side) */}
            <div className="border border-border rounded-xl p-4 bg-muted/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-border pb-3 mb-3">
                  <Eye className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {{ ar: "معاينة مباشرة للمستخدم", fr: "Aperçu en temps réel", en: "Real-time user preview" }[lang]}
                  </span>
                </div>

                <div className="bg-white border border-border rounded-lg overflow-hidden shadow-2xs">
                  <div className="flex items-center justify-between p-3.5 bg-muted/10 border-b border-border">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6.5 h-6.5 rounded bg-neutral-100 flex items-center justify-center text-foreground font-black text-[10px]">
                        ?
                      </div>
                      <span className="font-bold text-foreground text-xs">
                        {title || { ar: "العنوان يظهر هنا...", fr: "Le titre s'affiche ici...", en: "Title appears here..." }[lang]}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                  <div className="p-3.5 bg-[#fafafa]">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-[9px] py-0">
                        {catLabel(category)}
                      </Badge>
                      <span className="text-[9px] text-muted-foreground flex items-center gap-1 font-semibold">
                        <Clock className="w-3 h-3" />
                        ~{readTime} min read
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs whitespace-pre-wrap leading-relaxed min-h-[60px]">
                      {content || { ar: "محتوى مقالة المساعدة يظهر هنا عند الكتابة...", fr: "Le contenu de l'article d'aide apparaîtra ici au fur et à mesure de votre saisie...", en: "The content of the help article will appear here as you type..." }[lang]}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-neutral-50 rounded-lg border flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-neutral-500 shrink-0" />
                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                  {{ ar: "معاينة كيف تظهر مقالة المساعدة للطلاب والمدربين على صفحات الدعم.", fr: "Voici à quoi ressemblera cet article d'aide pour les utilisateurs sur les portails FAQ.", en: "This is how this article will look for users on the help centers." }[lang]}
                </p>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {{ ar: "حذف هذه المقالة؟", fr: "Supprimer cet article ?", en: "Delete this article?" }[lang]}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {{
                ar: `سيتم حذف "${pendingDelete?.title}" نهائيًا. هذا الإجراء لا يمكن التراجع عنه.`,
                fr: `"${pendingDelete?.title}" sera supprimé définitivement. Cette action est irréversible.`,
                en: `"${pendingDelete?.title}" will be permanently deleted. This action cannot be undone.`,
              }[lang]}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && handleDelete(pendingDelete.id)}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {{ ar: "حذف", fr: "Supprimer", en: "Delete" }[lang]}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
