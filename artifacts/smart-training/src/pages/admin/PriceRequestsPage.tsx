import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle, XCircle, Clock, DollarSign, ArrowRight } from "lucide-react";

interface PriceRequest {
  id: number; coachId: number; coachName: string; courseId: number; courseTitle: string;
  requestedPrice: string; currentPrice: string; currency: string;
  justification: string | null; status: string; adminResponse: string | null;
  counterPrice: string | null; createdAt: string; resolvedAt: string | null;
}

const statusConfig: Record<string, { label: Record<string, string>; color: string; icon: React.ReactNode }> = {
  pending: { label: { ar: "في انتظار", fr: "En attente", en: "Pending" }, color: "bg-amber-50 text-amber-600 border border-amber-200", icon: <Clock className="w-3 h-3" /> },
  approved: { label: { ar: "مقبول", fr: "Approuvé", en: "Approved" }, color: "bg-emerald-50 text-emerald-600 border border-emerald-200", icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { label: { ar: "مرفوض", fr: "Rejeté", en: "Rejected" }, color: "bg-red-50 text-red-600 border border-red-200", icon: <XCircle className="w-3 h-3" /> },
  countered: { label: { ar: "بعرض مضاد", fr: "Contre-offre", en: "Countered" }, color: "bg-blue-50 text-blue-600 border border-blue-200", icon: <ArrowRight className="w-3 h-3" /> },
};

export default function AdminPriceRequestsPage() {
  const { lang } = useI18n();
  const { toast } = useToast();
  const [requests, setRequests] = useState<PriceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [response, setResponse] = useState({ status: "approved", adminResponse: "", counterPrice: "" });

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const token = localStorage.getItem("auth_token");
  const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/admin/price-requests`, { headers });
      const data = await r.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching price requests:", err);
      setRequests([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleResolve = async (id: number) => {
    const body: Record<string, unknown> = { status: response.status, adminResponse: response.adminResponse || null };
    if (response.status === "countered" && response.counterPrice) body.counterPrice = response.counterPrice;
    const r = await fetch(`${BASE}/api/admin/price-requests/${id}`, { method: "PATCH", headers, body: JSON.stringify(body) });
    if (r.ok) { toast({ title: { ar: "تم تسجيل القرار", fr: "Décision enregistrée", en: "Decision recorded" }[lang] }); setActiveId(null); fetchRequests(); }
    else toast({ title: "Erreur", variant: "destructive" });
  };

  const requestList = Array.isArray(requests) ? requests : [];

  return (
    <AdminLayout
      title={{ ar: "طلبات تعديل الأسعار", fr: "Demandes de modification de prix", en: "Price Change Requests" }[lang]}
      subtitle={{ ar: "مراجعة طلبات تعديل أسعار الدورات من المدربين", fr: "Examiner les demandes de modification de prix des coachs", en: "Review coach course price change requests" }[lang]}
    >
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-muted shadow-2xs rounded-2xl h-24 animate-pulse" />)}</div>
      ) : requestList.length === 0 ? (
        <div className="text-center py-20">
          <CreditCard className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{{ ar: "لا توجد طلبات", fr: "Aucune demande", en: "No requests" }[lang]}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requestList.map((pr) => {
            const sc = statusConfig[pr.status] ?? statusConfig.pending;
            const isOpen = activeId === pr.id;
            return (
              <div key={pr.id} className="bg-white border border-border shadow-sm rounded-2xl overflow-hidden">
                <div className="flex items-start gap-4 p-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 border border-amber-100">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-foreground text-sm">{pr.courseTitle}</span>
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold ${sc.color}`}>{sc.icon}{sc.label[lang]}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs flex-wrap">
                      <span className="text-muted-foreground">{pr.coachName}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">{{ ar: "الحالي:", fr: "Actuel:", en: "Current:" }[lang]}</span>
                        <span className="font-semibold text-foreground/70">{parseFloat(pr.currentPrice).toLocaleString()} {pr.currency}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                        <span className="font-bold text-amber-600">{parseFloat(pr.requestedPrice).toLocaleString()} {pr.currency}</span>
                      </div>
                    </div>
                    {pr.justification && <p className="text-muted-foreground text-xs mt-1 italic">"{pr.justification}"</p>}
                    {pr.adminResponse && <p className="text-muted-foreground text-xs mt-1">→ {pr.adminResponse}</p>}
                  </div>
                  {pr.status === "pending" && (
                    <Button onClick={() => { setActiveId(isOpen ? null : pr.id); setResponse({ status: "approved", adminResponse: "", counterPrice: "" }); }}
                      size="sm" variant="outline" className="text-xs shrink-0">
                      {{ ar: "مراجعة", fr: "Examiner", en: "Review" }[lang]}
                    </Button>
                  )}
                </div>

                {isOpen && pr.status === "pending" && (
                  <div className="p-4 border-t border-border space-y-3 bg-[#fafafa]">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{{ ar: "القرار", fr: "Décision", en: "Decision" }[lang]}</label>
                      <div className="flex gap-2">
                        {[
                          { key: "approved", label: { ar: "موافقة", fr: "Approuver", en: "Approve" }[lang], color: "hsl(160,60%,40%)" },
                          { key: "rejected", label: { ar: "رفض", fr: "Rejeter", en: "Reject" }[lang], color: "hsl(0,65%,45%)" },
                          { key: "countered", label: { ar: "عرض مضاد", fr: "Contre-offre", en: "Counter" }[lang], color: "hsl(210,80%,50%)" },
                        ].map((opt) => (
                          <button key={opt.key} type="button" onClick={() => setResponse((r) => ({ ...r, status: opt.key }))}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${response.status === opt.key ? "text-white" : "text-muted-foreground bg-muted hover:text-foreground"}`}
                            style={response.status === opt.key ? { background: opt.color } : undefined}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {response.status === "countered" && (
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">{{ ar: "السعر المضاد", fr: "Prix contre-offre", en: "Counter price" }[lang]} ({pr.currency})</label>
                        <input type="number" value={response.counterPrice} onChange={(e) => setResponse((r) => ({ ...r, counterPrice: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl text-sm text-foreground bg-white border border-border outline-none" />
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{{ ar: "رد الإدارة (اختياري)", fr: "Réponse admin (optionnel)", en: "Admin response (optional)" }[lang]}</label>
                      <textarea value={response.adminResponse} onChange={(e) => setResponse((r) => ({ ...r, adminResponse: e.target.value }))} rows={2}
                        className="w-full px-3 py-2 rounded-xl text-sm text-foreground bg-white border border-border resize-none outline-none" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleResolve(pr.id)} size="sm" className="font-bold bg-black hover:bg-black/90 text-white">
                        {{ ar: "تأكيد", fr: "Confirmer", en: "Confirm" }[lang]}
                      </Button>
                      <Button onClick={() => setActiveId(null)} size="sm" variant="outline">
                        {{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
