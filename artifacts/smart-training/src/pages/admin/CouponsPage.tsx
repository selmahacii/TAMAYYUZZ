import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tag,
  Plus,
  Trash2,
  Calendar,
  Users,
  BookOpen,
  X,
  Percent,
  TrendingUp,
  Loader2
} from "lucide-react";

interface Coupon {
  id: number;
  code: string;
  discountPercent: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  courseId: number | null;
  isActive: boolean;
  createdAt: string;
  courseName: string | null;
}

interface Course {
  id: number;
  title: string;
}

export default function AdminCouponsPage() {
  const { lang } = useI18n();
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [pendingDelete, setPendingDelete] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discountPercent: 20,
    maxUses: "",
    expiresAt: "",
    courseId: "",
    isActive: true
  });

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const token = localStorage.getItem("auth_token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/coupons`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) setCoupons(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
    fetch(`${BASE}/api/admin/courses`, { headers })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCourses(data);
      });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const body = {
        code: form.code.trim().toUpperCase(),
        discountPercent: Number(form.discountPercent),
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresAt: form.expiresAt || null,
        courseId: form.courseId ? Number(form.courseId) : null,
        isActive: form.isActive,
      };
      const res = await fetch(`${BASE}/api/coupons`, { method: "POST", headers, body: JSON.stringify(body) });
      if (res.ok) {
        toast({ title: { ar: "تم إنشاء القسيمة", fr: "Coupon créé !", en: "Coupon created!" }[lang] });
        setShowForm(false);
        setForm({ code: "", discountPercent: 20, maxUses: "", expiresAt: "", courseId: "", isActive: true });
        fetchCoupons();
      } else {
        const err = await res.json();
        toast({ title: "Erreur", description: err.error, variant: "destructive" });
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      const res = await fetch(`${BASE}/api/coupons/${id}`, { method: "DELETE", headers });
      if (res.ok) {
        toast({ title: { ar: "محذوف", fr: "Coupon supprimé", en: "Deleted" }[lang] });
        fetchCoupons();
      }
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setForm((f) => ({ ...f, code }));
  };

  const activeCoupons = coupons.filter((c) => {
    const isExpired = !!c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();
    const isExhausted = c.maxUses !== null && c.usedCount >= c.maxUses;
    return c.isActive && !isExpired && !isExhausted;
  }).length;

  return (
    <AdminLayout
      title={{ ar: "القسائم الترويجية", fr: "Coupons de réduction", en: "Discount Coupons" }[lang]}
      subtitle={{ ar: "إنشاء وإدارة أكواد الخصم", fr: "Créer et gérer les codes promo", en: "Create and manage promo codes" }[lang]}
    >
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          {
            label: { ar: "إجمالي القسائم", fr: "Total coupons", en: "Total coupons" }[lang],
            value: coupons.length,
            icon: <Tag className="w-4 h-4 text-purple-600" />,
            bg: "bg-purple-50/50"
          },
          {
            label: { ar: "القسائم النشطة", fr: "Actifs", en: "Active" }[lang],
            value: activeCoupons,
            icon: <Percent className="w-4 h-4 text-emerald-600" />,
            bg: "bg-emerald-50/50"
          },
          {
            label: { ar: "إجمالي الاستخدامات", fr: "Utilisations totales", en: "Total uses" }[lang],
            value: coupons.reduce((s, c) => s + c.usedCount, 0),
            icon: <TrendingUp className="w-4 h-4 text-amber-600" />,
            bg: "bg-amber-50/50"
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-border shadow-2xs rounded-xl p-4 flex items-center gap-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${stat.bg}`}>{stat.icon}</div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">{stat.label}</div>
              <div className="text-base font-black text-foreground mt-0.5" style={{ fontFamily: "Cairo, sans-serif" }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end mb-6">
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-black hover:bg-black/90 text-white font-bold shadow-sm">
          <Plus className="w-4 h-4" />
          {{ ar: "إنشاء قسيمة", fr: "Créer un coupon", en: "Create Coupon" }[lang]}
        </Button>
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white border border-border rounded-xl p-6 shadow-md text-foreground">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-foreground" style={{ fontFamily: "Cairo, sans-serif" }}>
                {{ ar: "إنشاء قسيمة جديدة", fr: "Créer un coupon", en: "Create Coupon" }[lang]}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] text-foreground font-bold uppercase tracking-wider mb-1 block">
                  {{ ar: "كود الخصم", fr: "Code promo", en: "Promo code" }[lang]} *
                </label>
                <div className="flex gap-2">
                  <Input
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="PROMO20"
                    className="uppercase font-mono font-bold bg-white border-border text-foreground"
                    required
                  />
                  <Button type="button" onClick={generateCode} variant="outline" size="sm" className="shrink-0 border-border text-foreground text-xs font-semibold">
                    {{ ar: "تلقائي", fr: "Auto", en: "Auto" }[lang]}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-foreground font-bold uppercase tracking-wider mb-1 block">
                  {{ ar: "نسبة الخصم (%)", fr: "Réduction (%)", en: "Discount (%)" }[lang]} *
                </label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={form.discountPercent}
                  onChange={(e) => setForm((f) => ({ ...f, discountPercent: Number(e.target.value) }))}
                  required
                  className="bg-white border-border text-foreground font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-foreground font-bold uppercase tracking-wider mb-1 block">
                    {{ ar: "الحد الأقصى للاستخدام", fr: "Utilisations max", en: "Max uses" }[lang]}
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={form.maxUses}
                    onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                    placeholder={{ ar: "غير محدود", fr: "Illimité", en: "Unlimited" }[lang]}
                    className="bg-white border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-foreground font-bold uppercase tracking-wider mb-1 block">
                    {{ ar: "تاريخ الانتهاء", fr: "Expire le", en: "Expires" }[lang]}
                  </label>
                  <Input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                    className="bg-white border-border text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-foreground font-bold uppercase tracking-wider mb-1 block">
                  {{ ar: "دورة محددة (اختياري)", fr: "Formation spécifique (optionnel)", en: "Specific course (optional)" }[lang]}
                </label>
                <select
                  value={form.courseId}
                  onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))}
                  className="w-full h-10 px-3 bg-white border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-black"
                >
                  <option value="">{{ ar: "جميع الدورات", fr: "Toutes les formations", en: "All courses" }[lang]}</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={creating} className="flex-1 border-border text-foreground">
                  {{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}
                </Button>
                <Button type="submit" disabled={creating} className="flex-1 bg-black hover:bg-black/90 text-white font-bold">
                  {creating && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                  {{ ar: "إنشاء", fr: "Créer", en: "Create" }[lang]}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coupons List */}
      {loading ? (
        <div className="space-y-3">
          <div className="h-16 bg-white border border-border rounded-xl animate-pulse" />
          <div className="h-16 bg-white border border-border rounded-xl animate-pulse" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-20 bg-white border border-border rounded-xl">
          <Tag className="w-12 h-12 text-muted-foreground/35 mx-auto mb-3" />
          <p className="text-muted-foreground font-semibold text-sm">{{ ar: "لا توجد قسائم", fr: "Aucun coupon créé", en: "No coupons yet" }[lang]}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => {
            const isExpired = !!coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now();
            const isExhausted = coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;
            const isEffectivelyActive = coupon.isActive && !isExpired && !isExhausted;
            return (
            <div key={coupon.id} className="flex items-center justify-between gap-4 p-4 bg-white border border-border shadow-2xs rounded-xl hover:shadow-xs transition-all text-foreground">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isEffectivelyActive ? "bg-emerald-50 text-emerald-600" : "bg-neutral-50 text-neutral-400"}`}>
                  <Tag className="w-5 h-5 shrink-0" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono font-black text-foreground text-sm">{coupon.code}</span>
                    <Badge variant="warning">-{coupon.discountPercent}%</Badge>
                    {!coupon.isActive && (
                      <Badge variant="outline" className="border-rose-100 text-rose-700 bg-rose-50/50">
                        {{ ar: "غير نشط", fr: "Inactif", en: "Inactive" }[lang]}
                      </Badge>
                    )}
                    {coupon.isActive && isExpired && (
                      <Badge variant="outline" className="border-amber-100 text-amber-700 bg-amber-50/50">
                        {{ ar: "منتهية الصلاحية", fr: "Expiré", en: "Expired" }[lang]}
                      </Badge>
                    )}
                    {coupon.isActive && !isExpired && isExhausted && (
                      <Badge variant="outline" className="border-amber-100 text-amber-700 bg-amber-50/50">
                        {{ ar: "استُنفذ الحد", fr: "Épuisé", en: "Exhausted" }[lang]}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      {coupon.usedCount}{coupon.maxUses !== null ? `/${coupon.maxUses}` : ""} {{ ar: "استخدام", fr: "utilisations", en: "uses" }[lang]}
                    </span>
                    {coupon.expiresAt && (
                      <span className={`flex items-center gap-1 ${isExpired ? "text-amber-600 font-semibold" : ""}`}>
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        {new Date(coupon.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                    {coupon.courseName && (
                      <span className="flex items-center gap-1 font-bold text-neutral-800">
                        <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {coupon.courseName}
                      </span>
                    )}
                  </div>
                  {coupon.maxUses !== null && (
                    <div className="h-1 rounded-full bg-muted mt-2 max-w-[180px]">
                      <div
                        className={`h-full rounded-full ${isExhausted ? "bg-amber-500" : "bg-emerald-500"}`}
                        style={{ width: `${Math.min((coupon.usedCount / coupon.maxUses) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPendingDelete(coupon)}
                className="h-8 border-rose-100 text-rose-700 hover:bg-rose-50/50 p-2 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {{ ar: "حذف هذه القسيمة؟", fr: "Supprimer ce coupon ?", en: "Delete this coupon?" }[lang]}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {{
                ar: `سيتم حذف الكود "${pendingDelete?.code}" نهائيًا. هذا الإجراء لا يمكن التراجع عنه.`,
                fr: `Le code "${pendingDelete?.code}" sera supprimé définitivement. Cette action est irréversible.`,
                en: `The code "${pendingDelete?.code}" will be permanently deleted. This action cannot be undone.`,
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
