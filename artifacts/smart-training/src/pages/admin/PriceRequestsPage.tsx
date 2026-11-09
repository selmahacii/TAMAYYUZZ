import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  ReceiptText, CheckCircle2, XCircle, Clock, ArrowRight, TrendingUp,
  Percent, FileText, User, BookOpen, Scale, Loader2, MessageSquare
} from "lucide-react";

interface PriceRequest {
  id: number;
  coachId: number;
  coachName: string;
  courseId: number;
  courseTitle: string;
  requestedPrice: string;
  currentPrice: string;
  currency: string;
  justification: string | null;
  status: string;
  adminResponse: string | null;
  counterPrice: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

const statusConfig: Record<string, { label: Record<string, string>; color: string; icon: React.ReactNode }> = {
  pending: { label: { ar: "قيد المراجعة", fr: "En attente d'arbitrage", en: "Pending Review" }, color: "bg-amber-50 text-amber-800 border-amber-200/80", icon: <Clock className="w-3.5 h-3.5 text-amber-700" /> },
  approved: { label: { ar: "تمت الموافقة", fr: "Tarif Approuvé", en: "Approved" }, color: "bg-emerald-50 text-emerald-800 border-emerald-200/80", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> },
  rejected: { label: { ar: "مرفوض", fr: "Demande Rejetée", en: "Rejected" }, color: "bg-red-50 text-red-800 border-red-200/80", icon: <XCircle className="w-3.5 h-3.5 text-red-700" /> },
  countered: { label: { ar: "عرض بديل", fr: "Contre-offre transmise", en: "Countered" }, color: "bg-blue-50 text-blue-800 border-blue-200/80", icon: <ArrowRight className="w-3.5 h-3.5 text-blue-700" /> },
};

export default function AdminPriceRequestsPage() {
  const { lang } = useI18n();
  const { toast } = useToast();
  const [requests, setRequests] = useState<PriceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PriceRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decision, setDecision] = useState({ status: "approved", adminResponse: "", counterPrice: "" });

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

  const openReviewModal = (pr: PriceRequest) => {
    setSelectedRequest(pr);
    setDecision({
      status: "approved",
      adminResponse: "",
      counterPrice: pr.requestedPrice,
    });
  };

  const handleResolve = async () => {
    if (!selectedRequest) return;
    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        status: decision.status,
        adminResponse: decision.adminResponse.trim() || null
      };
      if (decision.status === "countered" && decision.counterPrice) {
        body.counterPrice = decision.counterPrice;
      }
      const r = await fetch(`${BASE}/api/admin/price-requests/${selectedRequest.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body)
      });
      if (r.ok) {
        toast({
          title: {
            ar: "تم تسجيل قرار التحكيم المالي بنجاح",
            fr: "Décision d'arbitrage tarifaire enregistrée",
            en: "Arbitration decision recorded successfully"
          }[lang]
        });
        setSelectedRequest(null);
        await fetchRequests();
      } else {
        toast({ title: "Erreur lors de l'enregistrement", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestList = Array.isArray(requests) ? requests : [];

  return (
    <AdminLayout
      title={{ ar: "طلبات تعديل الأسعار", fr: "Demandes de modification de prix", en: "Price Change Requests" }[lang]}
      subtitle={{ ar: "التحكيم المالي ومراجعة مقترحات تعديل رسوم الدورات", fr: "Commission d'arbitrage tarifaire et examen des propositions des formateurs", en: "Fee arbitration commission and coach price proposal reviews" }[lang]}
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-border rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      ) : requestList.length === 0 ? (
        <div className="text-center py-20 bg-white border border-border rounded-xl">
          <ReceiptText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm font-medium">
            {{ ar: "لا توجد طلبات تعديل أسعار معلقة حاليًا", fr: "Aucune demande d'arbitrage tarifaire en attente", en: "No pending price change requests" }[lang]}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requestList.map((pr) => {
            const sc = statusConfig[pr.status] ?? statusConfig.pending;
            const current = parseFloat(pr.currentPrice) || 0;
            const requested = parseFloat(pr.requestedPrice) || 0;
            const diff = requested - current;
            const diffPercent = current > 0 ? ((diff / current) * 100).toFixed(1) : "0";

            return (
              <div key={pr.id} className="bg-white border border-border shadow-2xs rounded-xl p-4 hover:border-neutral-300 hover:shadow-xs transition-all">
                <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200/90 flex items-center justify-center shrink-0 text-neutral-800">
                      <ReceiptText className="w-5 h-5 text-neutral-800" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-sm tracking-tight">{pr.courseTitle}</span>
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold border ${sc.color}`}>
                          {sc.icon}
                          {sc.label[lang]}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-neutral-700">
                          <User className="w-3.5 h-3.5 text-neutral-400" />
                          {pr.coachName}
                        </span>

                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-muted-foreground">{{ ar: "الحالي:", fr: "Actuel :", en: "Current:" }[lang]}</span>
                          <span className="font-semibold text-neutral-800">{current.toLocaleString()} {pr.currency}</span>
                          <ArrowRight className="w-3 h-3 text-neutral-400" />
                          <span className="font-bold text-neutral-900">{requested.toLocaleString()} {pr.currency}</span>
                          <span className={`text-[11px] px-1.5 py-0.2 rounded font-semibold ${diff >= 0 ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"}`}>
                            {diff >= 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()} {pr.currency} ({diff >= 0 ? `+${diffPercent}%` : `${diffPercent}%`})
                          </span>
                        </div>
                      </div>

                      {pr.justification && (
                        <p className="text-xs text-neutral-600 italic bg-neutral-50 px-2.5 py-1 rounded border border-neutral-200/60 max-w-2xl mt-1 line-clamp-1">
                          "{pr.justification}"
                        </p>
                      )}

                      {pr.adminResponse && (
                        <p className="text-xs text-neutral-700 font-medium mt-1">
                          <span className="text-muted-foreground">Notification transmise :</span> {pr.adminResponse}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {pr.status === "pending" ? (
                      <Button onClick={() => openReviewModal(pr)} size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs">
                        {{ ar: "فحص الطلب والتحكيم", fr: "Examiner le dossier", en: "Review Request" }[lang]}
                      </Button>
                    ) : (
                      <Button onClick={() => openReviewModal(pr)} size="sm" variant="outline" className="border-border text-xs text-neutral-600">
                        {{ ar: "عرض التفاصيل", fr: "Détails", en: "View Details" }[lang]}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deep Arbitration Decision Modal */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl bg-white border border-border p-0 overflow-hidden shadow-2xl rounded-2xl">
          {selectedRequest && (() => {
            const current = parseFloat(selectedRequest.currentPrice) || 0;
            const requested = parseFloat(selectedRequest.requestedPrice) || 0;
            const diff = requested - current;
            const diffPercent = current > 0 ? ((diff / current) * 100).toFixed(1) : "0";

            // Commissions simulation
            const coachCurrent = Math.round(current * 0.7);
            const coachRequested = Math.round(requested * 0.7);
            const platformCurrent = current - coachCurrent;
            const platformRequested = requested - coachRequested;

            return (
              <div>
                {/* Header */}
                <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-200 border border-neutral-700">
                      <Scale className="w-3.5 h-3.5" />
                      {{ ar: "لجنة التحكيم المالي", fr: "Arbitrage Tarifaire", en: "Price Arbitration" }[lang]}
                    </span>
                    <span className="font-mono text-xs text-neutral-400">Dossier #{selectedRequest.id}</span>
                  </div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-white">
                    {selectedRequest.courseTitle}
                  </DialogTitle>
                  <p className="text-xs text-neutral-300 mt-1">
                    {{ ar: "طلب مقدم من المدرب(ة):", fr: "Formulé par :", en: "Submitted by:" }[lang]} <strong className="text-white">{selectedRequest.coachName}</strong>
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Financial Comparison KPI */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-neutral-50 border border-border rounded-xl p-3">
                      <div className="text-[11px] text-muted-foreground font-semibold">{{ ar: "السعر الحالي", fr: "Tarif Actuel", en: "Current Price" }[lang]}</div>
                      <div className="text-base font-black text-neutral-800 font-mono mt-0.5">{current.toLocaleString()} {selectedRequest.currency}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">Coach: {coachCurrent.toLocaleString()} | Plateforme: {platformCurrent.toLocaleString()}</div>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 text-white rounded-xl p-3">
                      <div className="text-[11px] text-neutral-400 font-semibold">{{ ar: "السعر المطلوب", fr: "Nouveau Tarif", en: "Requested Price" }[lang]}</div>
                      <div className="text-base font-black text-white font-mono mt-0.5">{requested.toLocaleString()} {selectedRequest.currency}</div>
                      <div className="text-[10px] text-neutral-400 mt-1">Coach: {coachRequested.toLocaleString()} | Plateforme: {platformRequested.toLocaleString()}</div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3">
                      <div className="text-[11px] text-emerald-800 font-semibold">{{ ar: "الفارق المقترح", fr: "Variation", en: "Difference" }[lang]}</div>
                      <div className="text-base font-black text-emerald-900 font-mono mt-0.5">
                        {diff >= 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()} {selectedRequest.currency}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-1">
                        {diff >= 0 ? `+${diffPercent}%` : `${diffPercent}%`} par inscription
                      </div>
                    </div>
                  </div>

                  {/* Coach's justification note */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-neutral-600" />
                      {{ ar: "التعليل والمبررات البيداغوجية المقدمة", fr: "Argumentaire pédagogique du formateur", en: "Coach pedagogical justification" }[lang]}
                    </Label>
                    <div className="bg-neutral-50 border border-border rounded-xl p-3 text-xs text-neutral-700 leading-relaxed italic">
                      "{selectedRequest.justification || "Aucune justification fournie."}"
                    </div>
                  </div>

                  {/* Decision Form (if pending) */}
                  {selectedRequest.status === "pending" ? (
                    <div className="space-y-4 pt-4 border-t border-border">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-neutral-800">
                          {{ ar: "قرار الإدارة الرسمي", fr: "Décision officielle de la direction", en: "Official Direction Decision" }[lang]}
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { key: "approved", label: { ar: "قبول السعر", fr: "Valider le prix demandé", en: "Approve Price" }[lang], desc: "Mise à jour immédiate du cours" },
                            { key: "countered", label: { ar: "عرض بديل", fr: "Proposer une contre-offre", en: "Counter Offer" }[lang], desc: "Ajustement négocié" },
                            { key: "rejected", label: { ar: "رفض الطلب", fr: "Rejeter la demande", en: "Reject Request" }[lang], desc: "Maintien du tarif initial" },
                          ].map((opt) => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => setDecision(prev => ({ ...prev, status: opt.key }))}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                decision.status === opt.key
                                  ? "bg-neutral-900 border-neutral-900 text-white shadow-xs"
                                  : "bg-white border-border hover:bg-neutral-50 text-neutral-800"
                              }`}
                            >
                              <div className="text-xs font-bold">{opt.label}</div>
                              <div className={`text-[10px] mt-0.5 ${decision.status === opt.key ? "text-neutral-300" : "text-muted-foreground"}`}>{opt.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {decision.status === "countered" && (
                        <div className="space-y-1.5 bg-neutral-50 border border-border p-3.5 rounded-xl">
                          <Label className="text-xs font-bold text-foreground">
                            {{ ar: "السعر المقترح من الإدارة (دج)", fr: "Tarif contre-proposé par l'administration (DZD)", en: "Counter price (DZD)" }[lang]}
                          </Label>
                          <Input
                            type="number"
                            value={decision.counterPrice}
                            onChange={(e) => setDecision(prev => ({ ...prev, counterPrice: e.target.value }))}
                            className="bg-white border-border font-mono text-sm max-w-xs"
                          />
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-neutral-600" />
                          {{ ar: "رسالة التبليغ والتوجيه للمدرب(ة)", fr: "Notification officielle transmise au formateur", en: "Notification sent to coach" }[lang]}
                        </Label>
                        <Textarea
                          rows={2}
                          value={decision.adminResponse}
                          onChange={(e) => setDecision(prev => ({ ...prev, adminResponse: e.target.value }))}
                          placeholder="Indiquez les motifs de la décision ou les recommandations pédagogiques..."
                          className="bg-neutral-50 border-border text-xs focus:bg-white resize-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-neutral-50 border border-border rounded-xl p-3.5 text-xs text-neutral-700 space-y-1">
                      <div className="font-bold text-neutral-900">Dossier clôturé :</div>
                      <div>Statut : <strong>{statusConfig[selectedRequest.status]?.label[lang]}</strong></div>
                      {selectedRequest.adminResponse && <div>Notification : "{selectedRequest.adminResponse}"</div>}
                    </div>
                  )}

                  {/* Modal Footer */}
                  <div className="flex justify-end gap-2 pt-4 border-t border-border">
                    <Button type="button" variant="outline" onClick={() => setSelectedRequest(null)} className="text-xs">
                      {{ ar: "إغلاق", fr: "Fermer", en: "Close" }[lang]}
                    </Button>
                    {selectedRequest.status === "pending" && (
                      <Button
                        type="button"
                        onClick={handleResolve}
                        disabled={isSubmitting}
                        className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs px-5"
                      >
                        {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                        {{ ar: "اعتماد القرار النهائي", fr: "Valider l'arbitrage", en: "Confirm Decision" }[lang]}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
