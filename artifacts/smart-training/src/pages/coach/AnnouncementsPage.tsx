import { useState, useEffect } from "react";
import { useI18n } from "@/i18n";
import { CoachLayout } from "@/components/coach/CoachLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Megaphone, Plus, Trash2, X, Clock, CheckCircle, AlertCircle, Pin, Loader2 } from "lucide-react";

interface Announcement {
  id: number; title: string; content: string; imageUrl: string | null;
  type: string; isPublished: boolean; isApproved: boolean;
  isPinned: boolean; expiresAt: string | null; createdAt: string;
}

export default function CoachAnnouncementsPage() {
  const { lang } = useI18n();
  const { toast } = useToast();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", imageUrl: "", expiresAt: "" });
  const [pendingDelete, setPendingDelete] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const token = localStorage.getItem("auth_token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/coach/announcements`, { headers });
      const data = await r.json();
      if (Array.isArray(data)) setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await fetch(`${BASE}/api/announcements`, {
        method: "POST", headers,
        body: JSON.stringify({ title: form.title, content: form.content, imageUrl: form.imageUrl || null, type: "ad", expiresAt: form.expiresAt || null }),
      });
      if (r.ok) {
        toast({ title: { ar: "تم إرسال الإعلان، بانتظار موافقة الإدارة", fr: "Publicité soumise — en attente d'approbation admin", en: "Ad submitted — pending admin approval" }[lang] });
        setShowForm(false);
        setForm({ title: "", content: "", imageUrl: "", expiresAt: "" });
        fetchItems();
      } else {
        toast({ title: "Erreur", variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const r = await fetch(`${BASE}/api/announcements/${pendingDelete.id}`, { method: "DELETE", headers });
      if (r.ok) {
        toast({ title: { ar: "تم الحذف", fr: "Supprimée", en: "Deleted" }[lang] });
        setItems((prev) => prev.filter((i) => i.id !== pendingDelete.id));
      } else {
        toast({ title: "Erreur", variant: "destructive" });
      }
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  return (
    <CoachLayout
      title={{ ar: "إعلاناتي", fr: "Mes annonces", en: "My Announcements" }[lang]}
      subtitle={{ ar: "انشري إعلاناتك وعروضك في المتجر", fr: "Publiez vos annonces et publicités sur la marketplace", en: "Publish your ads and offers on the marketplace" }[lang]}
    >
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-black hover:bg-black/90 text-white font-bold shadow-sm">
          <Plus className="w-4 h-4" />
          {{ ar: "إعلان جديد", fr: "Nouvelle annonce", en: "New Announcement" }[lang]}
        </Button>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl mb-6 bg-amber-50/50 border border-amber-100">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-amber-800 text-xs leading-relaxed">
          {{
            ar: "تخضع إعلاناتك لموافقة الإدارة قبل ظهورها في المتجر، حيث ستكون مرئية لجميع الزوار.",
            fr: "Vos annonces sont soumises à l'approbation de l'administration avant d'apparaître sur la marketplace, où elles seront visibles par tous les visiteurs.",
            en: "Your announcements require admin approval before appearing on the marketplace, where they'll be visible to all visitors.",
          }[lang]}
        </p>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-white border border-border rounded-2xl p-6 max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-foreground text-sm" style={{ fontFamily: "Cairo, sans-serif" }}>{{ ar: "إعلان جديد", fr: "Nouvelle publicité", en: "New Ad" }[lang]}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1">{{ ar: "العنوان", fr: "Titre", en: "Title" }[lang]} *</label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required
                  placeholder={{ ar: "مثال: خصم 30٪ على دورة الأعمال هذا الشهر!", fr: "Ex: Formation Business : -30% ce mois !", en: "Ex: Business course -30% off this month!" }[lang]} className="bg-white" />
              </div>
              <div>
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1">{{ ar: "المحتوى", fr: "Contenu", en: "Content" }[lang]} *</label>
                <Textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} rows={5} required
                  placeholder={{ ar: "صفي عرضك أو خدماتك أو دورتك...", fr: "Décrivez votre offre, vos services ou votre formation...", en: "Describe your offer, services or course..." }[lang]} className="bg-white" />
              </div>
              <div>
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1">{{ ar: "رابط الصورة (اختياري)", fr: "URL Image (optionnel)", en: "Image URL (optional)" }[lang]}</label>
                <Input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." className="bg-white" />
              </div>
              <div>
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1">{{ ar: "تاريخ الانتهاء (اختياري)", fr: "Date d'expiration (optionnel)", en: "Expiry date (optional)" }[lang]}</label>
                <Input type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} className="bg-white" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting} className="flex-1 font-bold bg-black hover:bg-black/90 text-white">{{ ar: "إرسال", fr: "Soumettre", en: "Submit" }[lang]}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">{{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-white border border-border rounded-xl animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-white border border-border rounded-xl">
          <Megaphone className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-semibold text-sm">{{ ar: "لا توجد إعلانات", fr: "Aucune annonce", en: "No announcements" }[lang]}</p>
          <p className="text-muted-foreground text-xs mt-1">{{ ar: "أنشئي أول إعلان لك في المتجر", fr: "Créez votre première publicité sur la marketplace", en: "Create your first ad on the marketplace" }[lang]}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className={`flex gap-4 p-5 bg-white rounded-xl shadow-2xs border ${!item.isApproved ? "border-amber-200" : "border-border"}`}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 border border-amber-100">
                <Megaphone className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold text-foreground text-sm">{item.title}</span>
                  {item.isApproved ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100">
                      <CheckCircle className="w-3 h-3" />{{ ar: "منشور", fr: "Publiée", en: "Published" }[lang]}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-amber-700 font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100">
                      <Clock className="w-3 h-3" />{{ ar: "قيد الانتظار", fr: "En attente", en: "Pending" }[lang]}
                    </span>
                  )}
                  {item.isPinned && <Pin className="w-3 h-3 text-amber-600 fill-amber-600" />}
                </div>
                <p className="text-muted-foreground text-xs line-clamp-2">{item.content}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground/70">
                  <span>{new Date(item.createdAt).toLocaleDateString("fr-DZ")}</span>
                  {item.expiresAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{{ ar: "تنتهي في", fr: "Expire le", en: "Expires" }[lang]} {new Date(item.expiresAt).toLocaleDateString("fr-DZ")}</span>}
                </div>
              </div>
              <button onClick={() => setPendingDelete(item)} className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-500/60 hover:text-rose-600 hover:bg-rose-50 transition-all shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
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
                ar: `سيتم حذف "${pendingDelete?.title ?? ""}" نهائيًا.`,
                fr: `"${pendingDelete?.title ?? ""}" sera supprimée définitivement.`,
                en: `"${pendingDelete?.title ?? ""}" will be permanently deleted.`,
              }[lang]}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {{ ar: "حذف", fr: "Supprimer", en: "Delete" }[lang]}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CoachLayout>
  );
}
