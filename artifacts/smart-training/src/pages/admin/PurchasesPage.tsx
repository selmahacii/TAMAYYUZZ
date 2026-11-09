import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag, Search, Eye, Calendar, Mail, User, GraduationCap,
  Percent, FileText, Tag, CheckCircle2, XCircle, Clock, ExternalLink,
  ShieldCheck, Loader2, ArrowRight, AlertTriangle
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";

interface Purchase {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  courseId: number;
  courseTitle: string;
  coachName: string;
  amount: string;
  currency: string;
  couponCode: string | null;
  discountApplied: string | null;
  status: string;
  paymentMethod: string | null;
  receiptUrl: string | null;
  rejectionReason: string | null;
  paidAt: string;
  invoiceId: number | null;
  invoiceNumber: string | null;
  invoiceStatus: string | null;
  commissionId: number | null;
  commissionAmount: string | null;
  commissionStatus: string | null;
  commissionRate: string | null;
}

const statusConfig: Record<string, { label: Record<string, string>; color: string; icon: React.ReactNode }> = {
  paid: { label: { ar: "مدفوع ومؤكد", fr: "Paiement Validé", en: "Paid" }, color: "bg-emerald-50 text-emerald-800 border-emerald-200/80", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> },
  pending: { label: { ar: "في انتظار التحقق", fr: "En attente de vérification", en: "Pending" }, color: "bg-amber-50 text-amber-800 border-amber-200/80", icon: <Clock className="w-3.5 h-3.5 text-amber-700" /> },
  rejected: { label: { ar: "مرفوض", fr: "Justificatif Rejeté", en: "Rejected" }, color: "bg-red-50 text-red-800 border-red-200/80", icon: <XCircle className="w-3.5 h-3.5 text-red-700" /> },
};

export default function AdminPurchasesPage() {
  const { lang } = useI18n();
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const token = localStorage.getItem("auth_token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/purchases`, { headers });
      const data = await res.json();
      setPurchases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleVerify = async (id: number) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/purchases/${id}/verify`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        toast({
          title: {
            ar: "تم تأكيد الدفع وتفعيل الدورة بنجاح",
            fr: "Paiement validé et accès à la formation activé",
            en: "Payment verified and course access granted"
          }[lang]
        });
        setSelectedPurchase(null);
        await fetchPurchases();
      } else {
        toast({ title: "Erreur lors de la validation", variant: "destructive" });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: number) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/purchases/${id}/reject`, {
        method: "POST",
        headers,
        body: JSON.stringify({ reason: rejectionReason.trim() || "Reçu non conforme ou illisible" })
      });
      if (res.ok) {
        toast({
          title: {
            ar: "تم رفض الإيصال وإشعار الطالبة",
            fr: "Reçu rejeté et étudiante notifiée",
            en: "Receipt rejected and student notified"
          }[lang]
        });
        setSelectedPurchase(null);
        setIsRejecting(false);
        setRejectionReason("");
        await fetchPurchases();
      } else {
        toast({ title: "Erreur lors du rejet", variant: "destructive" });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      const matchSearch =
        !search ||
        p.userName?.toLowerCase().includes(search.toLowerCase()) ||
        p.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
        p.courseTitle?.toLowerCase().includes(search.toLowerCase()) ||
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === "all" || (p.status || "paid") === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [purchases, search, statusFilter]);

  const totalRevenue = useMemo(() => {
    return purchases
      .filter((p) => (p.status || "paid") === "paid")
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  }, [purchases]);

  const pendingCount = purchases.filter((p) => p.status === "pending").length;

  return (
    <AdminLayout
      title={{ ar: "سجل المبيعات والمدفوعات", fr: "Transactions & Paiements Reçus", en: "Sales & Payment Records" }[lang]}
      subtitle={{ ar: "تدقيق إيصالات الدفع وتأكيد الحوالات وتتبع الفواتير", fr: "Audit des bordereaux de virement, validation des encaissements et facturation", en: "Payment slip auditing, transfer validation and invoicing" }[lang]}
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-border shadow-2xs rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5 text-neutral-800" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold">
              {{ ar: "إجمالي التحصيلات المؤكدة", fr: "Chiffre d'affaires encaissé", en: "Collected Revenue" }[lang]}
            </div>
            <div className="text-base font-bold text-foreground font-mono mt-0.5">
              {totalRevenue.toLocaleString("fr-DZ")} DZD
            </div>
          </div>
        </div>

        <div className="bg-white border border-border shadow-2xs rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-neutral-800" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold">
              {{ ar: "إجمالي العمليات", fr: "Total des transactions", en: "Total Transactions" }[lang]}
            </div>
            <div className="text-base font-bold text-foreground font-mono mt-0.5">
              {purchases.length}
            </div>
          </div>
        </div>

        <div className="bg-white border border-border shadow-2xs rounded-xl p-4 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${pendingCount > 0 ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-neutral-100 border-neutral-200 text-neutral-800"}`}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold">
              {{ ar: "إيصالات قيد المراجعة", fr: "Justificatifs en attente", en: "Pending Verification" }[lang]}
            </div>
            <div className={`text-base font-bold font-mono mt-0.5 ${pendingCount > 0 ? "text-amber-800" : "text-foreground"}`}>
              {pendingCount}
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Status Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 justify-between items-start sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={{ ar: "بحث بالطالبة، الدورة، الفاتورة...", fr: "Rechercher par étudiante, cours, facture...", en: "Search user, course, invoice..." }[lang]}
            className="pl-9 bg-white border-border text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: "all", label: { ar: "الكل", fr: "Toutes", en: "All" }[lang], count: purchases.length },
            { id: "pending", label: { ar: "قيد المراجعة", fr: "En attente", en: "Pending" }[lang], count: pendingCount },
            { id: "paid", label: { ar: "المؤكدة", fr: "Validées", en: "Paid" }[lang], count: purchases.filter(p => (p.status || "paid") === "paid").length },
            { id: "rejected", label: { ar: "المرفوضة", fr: "Rejetées", en: "Rejected" }[lang], count: purchases.filter(p => p.status === "rejected").length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                statusFilter === tab.id
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "bg-white text-muted-foreground border-border hover:bg-neutral-50"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${statusFilter === tab.id ? "bg-neutral-800 text-neutral-300" : "bg-neutral-100 text-neutral-600"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-white border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-neutral-50 text-neutral-600 text-xs font-bold">
                  <th className="p-4">{{ ar: "الطالبة", fr: "Étudiante", en: "Student" }[lang]}</th>
                  <th className="p-4">{{ ar: "التكوين", fr: "Formation", en: "Course" }[lang]}</th>
                  <th className="p-4">{{ ar: "المبلغ", fr: "Montant Net", en: "Amount" }[lang]}</th>
                  <th className="p-4">{{ ar: "طريقة الدفع", fr: "Méthode", en: "Method" }[lang]}</th>
                  <th className="p-4">{{ ar: "الحالة", fr: "Statut", en: "Status" }[lang]}</th>
                  <th className="p-4">{{ ar: "التاريخ", fr: "Date", en: "Date" }[lang]}</th>
                  <th className="p-4 text-right">{{ ar: "إجراءات", fr: "Actions", en: "Actions" }[lang]}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs text-foreground">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-muted-foreground font-medium">
                      <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                      {{ ar: "لا توجد معاملات مطابقة", fr: "Aucune transaction trouvée", en: "No transactions found" }[lang]}
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const st = statusConfig[p.status || "paid"] ?? statusConfig.paid;
                    return (
                      <tr key={p.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-foreground">{p.userName}</div>
                          <div className="text-muted-foreground text-[10px]">{p.userEmail}</div>
                        </td>
                        <td className="p-4 font-medium max-w-[220px] truncate">{p.courseTitle}</td>
                        <td className="p-4 font-bold text-foreground font-mono">
                          {parseFloat(p.amount).toLocaleString("fr-DZ")} {p.currency}
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200/70 text-[11px]">
                            {p.paymentMethod || "BaridiMob / Virement"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${st.color}`}>
                            {st.icon}
                            {st.label[lang]}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground font-mono">{new Date(p.paidAt).toLocaleDateString()}</td>
                        <td className="p-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedPurchase(p); setIsRejecting(false); setRejectionReason(""); }}
                            className="h-8 gap-1.5 text-xs font-bold border-border text-foreground hover:bg-neutral-100"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {{ ar: "فحص الإيصال", fr: "Examiner", en: "Inspect" }[lang]}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction & Receipt Inspection Modal */}
      <Dialog open={!!selectedPurchase} onOpenChange={(open) => !open && setSelectedPurchase(null)}>
        <DialogContent className="max-w-2xl bg-white border border-border p-0 overflow-hidden shadow-2xl rounded-2xl">
          {selectedPurchase && (
            <div>
              {/* Header */}
              <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-200 border border-neutral-700">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {{ ar: "تدقيق المعاملة المالية", fr: "Audit d'Encaissement", en: "Payment Audit" }[lang]}
                  </span>
                  <span className="font-mono text-xs text-neutral-400">Transaction #{selectedPurchase.id}</span>
                </div>
                <DialogTitle className="text-xl font-bold tracking-tight text-white">
                  {selectedPurchase.courseTitle}
                </DialogTitle>
                <p className="text-xs text-neutral-300 mt-1">
                  {{ ar: "الطالبة المسجلة :", fr: "Étudiante requérante :", en: "Enrolled Student:" }[lang]} <strong className="text-white">{selectedPurchase.userName}</strong> ({selectedPurchase.userEmail})
                </p>
              </div>

              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Financial KPI */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-neutral-50 border border-border rounded-xl p-3">
                    <span className="text-[10px] text-muted-foreground font-semibold block">{{ ar: "المبلغ الإجمالي", fr: "Montant Réglé", en: "Paid Amount" }[lang]}</span>
                    <p className="text-base font-black text-neutral-900 font-mono mt-0.5">
                      {parseFloat(selectedPurchase.amount).toLocaleString("fr-DZ")} {selectedPurchase.currency}
                    </p>
                  </div>
                  <div className="bg-neutral-50 border border-border rounded-xl p-3">
                    <span className="text-[10px] text-muted-foreground font-semibold block">{{ ar: "طريقة السداد", fr: "Méthode de Paiement", en: "Payment Method" }[lang]}</span>
                    <p className="text-xs font-bold text-neutral-900 mt-1">
                      {selectedPurchase.paymentMethod || "BaridiMob / CCP"}
                    </p>
                  </div>
                  <div className="bg-neutral-50 border border-border rounded-xl p-3">
                    <span className="text-[10px] text-muted-foreground font-semibold block">{{ ar: "حالة التحصيل", fr: "Statut d'Encaissement", en: "Status" }[lang]}</span>
                    <div className="mt-1">
                      {(() => {
                        const st = statusConfig[selectedPurchase.status || "paid"] ?? statusConfig.paid;
                        return (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${st.color}`}>
                            {st.icon}
                            {st.label[lang]}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Section: Official Payment Receipt */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-neutral-700" />
                      {{ ar: "صورة إيصال التحويل البنكي أو البريدي", fr: "Justificatif de Paiement (Récépissé)", en: "Official Payment Slip" }[lang]}
                    </h4>
                    {selectedPurchase.receiptUrl && (
                      <a
                        href={selectedPurchase.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-900 underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {{ ar: "فتح بالحجم الكامل", fr: "Plein écran", en: "Full size" }[lang]}
                      </a>
                    )}
                  </div>

                  {selectedPurchase.receiptUrl ? (
                    <div className="bg-neutral-50 border border-border rounded-xl p-3 flex flex-col items-center justify-center">
                      {selectedPurchase.receiptUrl.endsWith(".pdf") ? (
                        <iframe
                          src={selectedPurchase.receiptUrl}
                          className="w-full h-64 rounded-lg border border-border"
                          title="Justificatif PDF"
                        />
                      ) : (
                        <div className="relative group max-h-72 overflow-hidden rounded-lg border border-border bg-white">
                          <img
                            src={selectedPurchase.receiptUrl}
                            alt="Justificatif de paiement"
                            className="max-h-72 object-contain mx-auto"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-neutral-50 border border-border rounded-xl p-6 text-center text-xs text-muted-foreground">
                      {{ ar: "لم يتم إرفاق إيصال إلكتروني لهذا الطلب", fr: "Aucun bordereau téléversé (paiement direct ou dérogation)", en: "No receipt uploaded" }[lang]}
                    </div>
                  )}
                </div>

                {/* Rejection notice if previously rejected */}
                {selectedPurchase.status === "rejected" && selectedPurchase.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3.5 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-700" />
                      Motif du rejet communiqué à l'étudiante :
                    </div>
                    <p className="italic">"{selectedPurchase.rejectionReason}"</p>
                  </div>
                )}

                {/* Linked Invoice & Commission */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-neutral-50 border border-border p-3 rounded-xl space-y-1">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Facture Fiscale</span>
                    <p className="font-mono font-bold text-neutral-900">{selectedPurchase.invoiceNumber || "Générée à validation"}</p>
                  </div>
                  <div className="bg-neutral-50 border border-border p-3 rounded-xl space-y-1">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Commission Coach (70%)</span>
                    <p className="font-mono font-bold text-neutral-900">
                      {selectedPurchase.commissionAmount ? `${parseFloat(selectedPurchase.commissionAmount).toLocaleString("fr-DZ")} DZD` : "Calculée à validation"}
                    </p>
                  </div>
                </div>

                {/* Pending Action Bar */}
                {selectedPurchase.status === "pending" && (
                  <div className="pt-4 border-t border-border space-y-3">
                    {isRejecting ? (
                      <div className="space-y-2 bg-neutral-50 border border-border p-3 rounded-xl">
                        <label className="text-xs font-bold text-neutral-900 block">
                          Motif officiel du rejet du reçu :
                        </label>
                        <Input
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="ex. Montant incomplet, bordereau illisible, référence manquante..."
                          className="bg-white border-border text-xs"
                        />
                        <div className="flex gap-2 justify-end pt-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => setIsRejecting(false)} className="text-xs">
                            Annuler
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => handleReject(selectedPurchase.id)}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                          >
                            {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                            Confirmer le rejet
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsRejecting(true)}
                          className="border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1.5" />
                          Rejeter le reçu
                        </Button>
                        <Button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleVerify(selectedPurchase.id)}
                          className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs px-5"
                        >
                          {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                          Valider le paiement & Débloquer l'accès
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end p-4 border-t border-border bg-neutral-50">
                <Button onClick={() => setSelectedPurchase(null)} variant="outline" className="text-xs">
                  {{ ar: "إغلاق", fr: "Fermer", en: "Close" }[lang]}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
