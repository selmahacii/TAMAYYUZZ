import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Bell,
  Plus,
  Trash2,
  CheckCircle,
  X,
  Pin,
  Megaphone,
  FileText,
  Calendar,
  Loader2,
  AlertCircle,
  Clock
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

interface Announcement {
  id: number;
  authorId: number;
  authorName: string;
  title: string;
  content: string;
  imageUrl: string | null;
  type: string;
  isPublished: boolean;
  isPinned: boolean;
  isApproved: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const typeConfig: Record<string, { label: Record<string, string>; icon: React.ReactNode; color: string; bg: string }> = {
  announcement: {
    label: { ar: "إعلان", fr: "Annonce", en: "Announcement" },
    icon: <Bell className="w-3.5 h-3.5" />,
    color: "text-blue-700 border-blue-100",
    bg: "bg-blue-50/50"
  },
  ad: {
    label: { ar: "إشهار", fr: "Publicité", en: "Ad" },
    icon: <Megaphone className="w-3.5 h-3.5" />,
    color: "text-amber-700 border-amber-100",
    bg: "bg-amber-50/50"
  },
  article: {
    label: { ar: "مقالة", fr: "Article", en: "Article" },
    icon: <FileText className="w-3.5 h-3.5" />,
    color: "text-purple-700 border-purple-100",
    bg: "bg-purple-50/50"
  },
};

export default function AdminAnnouncementsPage() {
  const { lang } = useI18n();
  const { toast } = useToast();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Dialog visibility states
  const [isOpen, setIsOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [type, setType] = useState("announcement");
  const [isPinned, setIsPinned] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [isApproved, setIsApproved] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const token = localStorage.getItem("auth_token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/admin/announcements`, { headers });
      const data = await r.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleOpenAdd = () => {
    setTitle("");
    setContent("");
    setImageUrl("");
    setType("announcement");
    setIsPinned(false);
    setIsPublished(true);
    setIsApproved(true);
    setExpiresAt("");
    setIsOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setCreating(true);
    try {
      const res = await fetch(`${BASE}/api/announcements`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title,
          content,
          imageUrl: imageUrl || null,
          type,
          isPinned,
          isPublished,
          isApproved,
          expiresAt: expiresAt || null
        })
      });
      if (res.ok) {
        toast({
          title: {
            ar: "تم إنشاء الإشهار بنجاح",
            fr: "Annonce/Publicité créée avec succès",
            en: "Announcement/Ad created successfully"
          }[lang]
        });
        setIsOpen(false);
        fetchItems();
      } else {
        throw new Error("Failed to create announcement");
      }
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const approve = async (id: number) => {
    const r = await fetch(`${BASE}/api/admin/announcements/${id}/approve`, { method: "PATCH", headers });
    if (r.ok) {
      toast({ title: { ar: "تمت الموافقة", fr: "Approuvé", en: "Approved" }[lang] });
      fetchItems();
    } else {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const togglePin = async (item: Announcement) => {
    await fetch(`${BASE}/api/admin/announcements/${item.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ ...item, isPinned: !item.isPinned })
    });
    fetchItems();
  };

  const deleteItem = async (id: number) => {
    setDeleting(true);
    try {
      const res = await fetch(`${BASE}/api/admin/announcements/${id}`, { method: "DELETE", headers });
      if (res.ok) {
        toast({ title: { ar: "تم الحذف", fr: "Supprimé", en: "Deleted" }[lang] });
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  return (
    <AdminLayout
      title={{ ar: "الإعلانات والإشهارات", fr: "Annonces & Publicités", en: "Announcements & Ads" }[lang]}
      subtitle={{ ar: "إدارة الإعلانات وإشهارات المدربين", fr: "Gérer les annonces et publicités des coachs", en: "Manage platform announcements and coach ads" }[lang]}
    >
      <div className="flex justify-end mb-6">
        <Button onClick={handleOpenAdd} className="flex items-center gap-2 bg-black hover:bg-black/90 text-white font-bold shadow-sm">
          <Plus className="w-4 h-4" />
          {{ ar: "إنشاء إعلان", fr: "Créer une annonce", en: "Create Announcement" }[lang]}
        </Button>
      </div>

      {/* Announcements and Ads list */}
      {loading ? (
        <div className="space-y-3">
          <div className="h-20 bg-white border border-border rounded-xl animate-pulse" />
          <div className="h-20 bg-white border border-border rounded-xl animate-pulse" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-white border border-border rounded-xl">
          <Bell className="w-12 h-12 text-muted-foreground/35 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm font-semibold">{{ ar: "لا توجد إعلانات", fr: "Aucune annonce ou publicité active", en: "No announcements or ads active" }[lang]}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(Array.isArray(items) ? items : []).map((item) => {
            const tc = typeConfig[item.type] ?? typeConfig.announcement;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 p-4 bg-white border border-border rounded-xl hover:shadow-2xs transition-all text-foreground"
                style={!item.isApproved ? { borderLeft: "4px solid #fbbf24" } : undefined}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tc.bg} ${tc.color} border`}>
                    {tc.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-foreground text-sm">{item.title}</span>
                      <Badge variant="secondary" className="capitalize text-[10px]">
                        {tc.label[lang]}
                      </Badge>
                      {!item.isApproved && (
                        <Badge variant="outline" className="border-amber-100 text-amber-700 bg-amber-50 text-[10px]">
                          {{ ar: "في انتظار الموافقة", fr: "En attente d'approbation", en: "Pending approval" }[lang]}
                        </Badge>
                      )}
                      {item.isPinned && <Pin className="w-3 h-3 text-amber-600 fill-amber-600" />}
                    </div>
                    <p className="text-muted-foreground text-xs font-medium line-clamp-1 leading-relaxed">{item.content}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground font-semibold">
                      <span className="text-neutral-800">{item.authorName}</span>
                      <span>•</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      {item.expiresAt && (
                        <>
                          <span>•</span>
                          <span className="text-rose-700 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(item.expiresAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!item.isApproved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => approve(item.id)}
                      title={{ ar: "الموافقة", fr: "Approuver", en: "Approve" }[lang]}
                      className="h-8 gap-1 border-emerald-100 text-emerald-700 hover:bg-emerald-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {{ ar: "الموافقة", fr: "Approuver", en: "Approve" }[lang]}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePin(item)}
                    title={item.isPinned ? { ar: "إلغاء التثبيت", fr: "Désépingler", en: "Unpin" }[lang] : { ar: "تثبيت", fr: "Épingler", en: "Pin" }[lang]}
                    className={`w-8 h-8 p-0 border-border text-foreground hover:bg-muted ${item.isPinned ? "bg-amber-50 border-amber-200 text-amber-700" : ""}`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPendingDelete(item)}
                    className="w-8 h-8 p-0 border-rose-100 text-rose-700 hover:bg-rose-50/50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation Modal Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) setIsOpen(false); }}>
        <DialogContent className="max-w-md bg-white border border-border p-6 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground font-black">
              {{ ar: "إنشاء إعلان جديد", fr: "Créer une annonce", en: "Create Announcement" }[lang]}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {{ ar: "إصدار إعلان أو إشهار أو مقال جديد على المنصة للجميع", fr: "Diffuser une annonce, publicité ou article à destination de la communauté", en: "Broadcast an announcement, ad or article to the community" }[lang]}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 mt-2 text-xs">
            
            {/* Type selector buttons */}
            <div className="space-y-1.5">
              <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                {{ ar: "النوع", fr: "Type de diffusion", en: "Broadcast Type" }[lang]}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["announcement", "ad", "article"].map((t) => {
                  const active = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`py-2 px-1 text-center font-bold border rounded-lg transition-all ${
                        active
                          ? t === "announcement"
                            ? "bg-blue-50 border-blue-500 text-blue-700"
                            : t === "ad"
                            ? "bg-amber-50 border-amber-500 text-amber-700"
                            : "bg-purple-50 border-purple-500 text-purple-700"
                          : "bg-white border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {typeConfig[t]?.label[lang]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                {{ ar: "العنوان", fr: "Titre de l'annonce", en: "Title" }[lang]} *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Lancement du nouveau module !"
                required
                className="bg-white border-border text-foreground font-semibold"
              />
            </div>

            {/* Content */}
            <div className="space-y-1">
              <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                {{ ar: "المحتوى", fr: "Contenu", en: "Content" }[lang]} *
              </label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                placeholder="Écrivez le message..."
                required
                className="bg-white border-border text-foreground min-h-[90px]"
              />
            </div>

            {/* Image URL */}
            <div className="space-y-1">
              <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                {{ ar: "رابط الصورة (اختياري)", fr: "URL de l'image (optionnel)", en: "Image URL (optional)" }[lang]}
              </label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="bg-white border-border text-foreground"
              />
            </div>

            {/* Expiration Date */}
            <div className="space-y-1">
              <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                {{ ar: "تاريخ الانتهاء (اختياري)", fr: "Date d'expiration (optionnel)", en: "Expiry Date (optional)" }[lang]}
              </label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="bg-white border-border text-foreground"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1 border-border text-foreground">
                {{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}
              </Button>
              <Button type="submit" disabled={creating} className="flex-1 bg-black hover:bg-black/90 text-white font-bold">
                {creating && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                {{ ar: "إنشاء", fr: "Créer", en: "Create" }[lang]}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {{ ar: "حذف هذا الإشهار؟", fr: "Supprimer cette annonce ?", en: "Delete this announcement?" }[lang]}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {{
                ar: `سيتم حذف "${pendingDelete?.title}" نهائيًا. هذا الإجراء لا يمكن التراجع عنه.`,
                fr: `"${pendingDelete?.title}" sera supprimée définitivement. Cette action est irréversible.`,
                en: `"${pendingDelete?.title}" will be permanently deleted. This action cannot be undone.`,
              }[lang]}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && deleteItem(pendingDelete.id)}
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
