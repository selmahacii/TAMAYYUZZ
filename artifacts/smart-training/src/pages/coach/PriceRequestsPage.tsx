import { useState, useEffect } from "react";
import { useGetMyCourses } from "@workspace/api-client-react";
import { useI18n } from "@/i18n";
import { CoachLayout } from "@/components/coach/CoachLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Plus, Clock, CheckCircle, XCircle, ArrowRight, X } from "lucide-react";

interface PriceRequest {
  id: number; courseId: number; courseTitle: string;
  requestedPrice: string; currentPrice: string; currency: string;
  justification: string | null; status: string;
  adminResponse: string | null; counterPrice: string | null; createdAt: string;
}

export default function CoachPriceRequestsPage() {
  const { lang } = useI18n();
  const { toast } = useToast();
  const { data: courses } = useGetMyCourses();
  const [requests, setRequests] = useState<PriceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ courseId: "", requestedPrice: "", justification: "" });
  const [submitting, setSubmitting] = useState(false);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const token = localStorage.getItem("auth_token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: { ar: "قيد الانتظار", fr: "En attente", en: "Pending" }[lang], color: "bg-amber-50 text-amber-600 border border-amber-200", icon: <Clock className="w-3 h-3" /> },
    approved: { label: { ar: "موافق عليه", fr: "Approuvé", en: "Approved" }[lang], color: "bg-emerald-50 text-emerald-600 border border-emerald-200", icon: <CheckCircle className="w-3 h-3" /> },
    rejected: { label: { ar: "مرفوض", fr: "Rejeté", en: "Rejected" }[lang], color: "bg-red-50 text-red-600 border border-red-200", icon: <XCircle className="w-3 h-3" /> },
    countered: { label: { ar: "عرض مقابل", fr: "Contre-offre", en: "Counter-offer" }[lang], color: "bg-blue-50 text-blue-600 border border-blue-200", icon: <ArrowRight className="w-3 h-3" /> },
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await fetch(`${BASE}/api/coach/price-requests`, { headers }).then((r) => r.json());
      if (Array.isArray(data)) setRequests(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.courseId || !form.requestedPrice) return;
    setSubmitting(true);
    try {
      const r = await fetch(`${BASE}/api/coach/price-requests`, {
        method: "POST", headers,
        body: JSON.stringify({ courseId: parseInt(form.courseId), requestedPrice: parseFloat(form.requestedPrice), justification: form.justification || null }),
      });
      if (r.ok) {
        toast({ title: { ar: "تم إرسال الطلب إلى الإدارة", fr: "Demande envoyée à l'admin", en: "Request sent to admin" }[lang] });
        setShowForm(false);
        setForm({ courseId: "", requestedPrice: "", justification: "" });
        fetchRequests();
      } else {
        const err = await r.json().catch(() => ({}));
        toast({ title: err.error ?? "Erreur", variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCourse = courses?.find((c) => c.id.toString() === form.courseId);

  return (
    <CoachLayout
      title={{ ar: "طلبات التسعير", fr: "Demandes de prix", en: "Price Requests" }[lang]}
      subtitle={{ ar: "اطلبي من الإدارة تعديل أسعار دوراتك", fr: "Demandez à l'admin de modifier le prix de vos formations", en: "Ask an admin to adjust the price of your courses" }[lang]}
    >
      <div className="flex justify-end mb-6">
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-black hover:bg-black/90 text-white font-bold shadow-sm">
          <Plus className="w-4 h-4" />
          {{ ar: "طلب جديد", fr: "Nouvelle demande", en: "New Request" }[lang]}
        </Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white border border-border rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-foreground text-sm" style={{ fontFamily: "Cairo, sans-serif" }}>{{ ar: "طلب تعديل سعر جديد", fr: "Nouvelle demande de prix", en: "New Price Request" }[lang]}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1">{{ ar: "الدورة", fr: "Formation", en: "Course" }[lang]} *</label>
                <select value={form.courseId} onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))} required
                  className="w-full h-10 px-3 bg-white border border-border rounded-lg text-foreground text-xs">
                  <option value="">{{ ar: "اختيار دورة", fr: "Sélectionner une formation", en: "Select a course" }[lang]}</option>
                  {courses?.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>

              {selectedCourse && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-2 rounded-lg bg-muted/40">
                  <span>{{ ar: "السعر الحالي:", fr: "Prix actuel :", en: "Current price:" }[lang]}</span>
                  <span className="font-bold text-foreground">{parseFloat(selectedCourse.price).toLocaleString()} {selectedCourse.currency}</span>
                </div>
              )}

              <div>
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1">{{ ar: "السعر الجديد المطلوب", fr: "Nouveau prix demandé", en: "Requested new price" }[lang]} ({selectedCourse?.currency ?? "DZD"}) *</label>
                <Input type="number" min="0" step="0.01" value={form.requestedPrice} onChange={(e) => setForm((f) => ({ ...f, requestedPrice: e.target.value }))} required placeholder="2500" className="bg-white" />
              </div>

              <div>
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1">{{ ar: "المبرر (اختياري)", fr: "Justification (optionnel)", en: "Justification (optional)" }[lang]}</label>
                <Textarea value={form.justification} onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))} rows={3} placeholder={{ ar: "سبب تعديل السعر...", fr: "Raison de la modification de prix...", en: "Reason for the price change..." }[lang]} className="bg-white" />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting} className="flex-1 font-bold bg-black hover:bg-black/90 text-white">{{ ar: "إرسال", fr: "Envoyer", en: "Send" }[lang]}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">{{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-white border border-border rounded-xl animate-pulse" />)}</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 bg-white border border-border rounded-xl">
          <CreditCard className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-semibold text-sm">{{ ar: "لا توجد طلبات", fr: "Aucune demande", en: "No requests" }[lang]}</p>
          <p className="text-muted-foreground text-xs mt-1">{{ ar: "ستظهر طلبات تعديل الأسعار هنا", fr: "Vos demandes de modification de prix apparaîtront ici", en: "Your price change requests will appear here" }[lang]}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((pr) => {
            const sc = statusConfig[pr.status] ?? statusConfig.pending;
            return (
              <div key={pr.id} className="p-5 bg-white border border-border shadow-2xs rounded-xl">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 border border-amber-100">
                    <CreditCard className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-foreground text-sm">{pr.courseTitle}</span>
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold ${sc.color}`}>{sc.icon}{sc.label}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm mb-2">
                      <span className="text-muted-foreground">{{ ar: "الحالي:", fr: "Actuel:", en: "Current:" }[lang]}</span>
                      <span className="font-bold text-foreground/70">{parseFloat(pr.currentPrice).toLocaleString()} {pr.currency}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                      <span className="font-bold text-amber-600">{parseFloat(pr.requestedPrice).toLocaleString()} {pr.currency}</span>
                    </div>

                    {pr.justification && <p className="text-muted-foreground text-xs italic mb-2">"{pr.justification}"</p>}

                    {pr.adminResponse && (
                      <div className={`rounded-lg p-3 text-xs ${pr.status === "approved" ? "bg-emerald-50" : pr.status === "rejected" ? "bg-red-50" : "bg-blue-50"}`}>
                        <p className="text-muted-foreground font-bold mb-0.5">{{ ar: "رد الإدارة:", fr: "Réponse admin :", en: "Admin response:" }[lang]}</p>
                        <p className="text-foreground/80">{pr.adminResponse}</p>
                        {pr.counterPrice && (
                          <p className="mt-1 font-bold text-blue-600">
                            {{ ar: "عرض مقابل:", fr: "Contre-offre :", en: "Counter-offer:" }[lang]} {parseFloat(pr.counterPrice).toLocaleString()} {pr.currency}
                          </p>
                        )}
                      </div>
                    )}

                    <p className="text-muted-foreground/60 text-[10px] mt-2">{new Date(pr.createdAt).toLocaleDateString("fr-DZ")}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CoachLayout>
  );
}
