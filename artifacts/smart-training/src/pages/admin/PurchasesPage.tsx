import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag,
  Search,
  TrendingUp,
  Eye,
  Calendar,
  Mail,
  User,
  GraduationCap,
  Percent,
  FileText,
  DollarSign,
  Tag
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
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
  paidAt: string;
  invoiceId: number | null;
  invoiceNumber: string | null;
  invoiceStatus: string | null;
  commissionId: number | null;
  commissionAmount: string | null;
  commissionStatus: string | null;
  commissionRate: string | null;
}

export default function AdminPurchasesPage() {
  const { lang } = useI18n();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const token = localStorage.getItem("auth_token");

  useEffect(() => {
    fetch(`${BASE}/api/admin/purchases`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setPurchases(d);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? purchases.filter(
        (p) =>
          (p.userName && p.userName.toLowerCase().includes(search.toLowerCase())) ||
          (p.courseTitle && p.courseTitle.toLowerCase().includes(search.toLowerCase())) ||
          (p.userEmail && p.userEmail.toLowerCase().includes(search.toLowerCase())) ||
          (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(search.toLowerCase())) ||
          (p.couponCode && p.couponCode.toLowerCase().includes(search.toLowerCase()))
      )
    : purchases;

  const totalRevenue = purchases.reduce((s, p) => s + parseFloat(p.amount), 0);

  return (
    <AdminLayout
      title={{ ar: "سجل المشتريات", fr: "Historique d'achats", en: "Purchase History" }[lang]}
      subtitle={{ ar: "سجل كامل لجميع المعاملات المالية", fr: "Historique complet de toutes les transactions", en: "Complete record of all transactions" }[lang]}
    >
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          {
            label: { ar: "إجمالي الإيرادات", fr: "Revenu total", en: "Total Revenue" }[lang],
            value: `${totalRevenue.toLocaleString("fr-DZ")} DZD`,
            icon: <TrendingUp className="w-4 h-4 text-emerald-600" />,
            bg: "bg-emerald-50/50"
          },
          {
            label: { ar: "عدد المعاملات", fr: "Nb de transactions", en: "Transactions" }[lang],
            value: purchases.length.toString(),
            icon: <ShoppingBag className="w-4 h-4 text-black" />,
            bg: "bg-muted/50"
          },
          {
            label: { ar: "متوسط الطلب", fr: "Panier moyen", en: "Avg. order" }[lang],
            value: purchases.length
              ? `${(totalRevenue / purchases.length).toLocaleString("fr-DZ", { maximumFractionDigits: 0 })} DZD`
              : "—",
            icon: <TrendingUp className="w-4 h-4 text-blue-600" />,
            bg: "bg-blue-50/30"
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-border shadow-2xs rounded-xl p-4 flex items-center gap-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${kpi.bg}`}>{kpi.icon}</div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">{kpi.label}</div>
              <div className="text-base font-black text-foreground mt-0.5" style={{ fontFamily: "Cairo, sans-serif" }}>{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search Filter */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={{ ar: "بحث بالاسم، الدورة، الفاتورة...", fr: "Rechercher par nom, cours, facture...", en: "Search by user, course, invoice..." }[lang]}
          className="pl-9 bg-white border-border text-foreground"
        />
      </div>

      {/* Purchases List */}
      {loading ? (
        <div className="space-y-3">
          <div className="h-14 bg-white border border-border rounded-xl animate-pulse" />
          <div className="h-14 bg-white border border-border rounded-xl animate-pulse" />
          <div className="h-14 bg-white border border-border rounded-xl animate-pulse" />
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs font-bold">
                  <th className="p-4">{{ ar: "المستخدم", fr: "Utilisateur", en: "User" }[lang]}</th>
                  <th className="p-4">{{ ar: "الدورة", fr: "Formation", en: "Course" }[lang]}</th>
                  <th className="p-4">{{ ar: "المبلغ", fr: "Montant", en: "Amount" }[lang]}</th>
                  <th className="p-4">{{ ar: "قسيمة", fr: "Coupon", en: "Coupon" }[lang]}</th>
                  <th className="p-4">{{ ar: "التاريخ", fr: "Date", en: "Date" }[lang]}</th>
                  <th className="p-4 text-right">{{ ar: "إجراءات", fr: "Actions", en: "Actions" }[lang]}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs text-foreground">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground font-medium">
                      <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-muted-foreground/35" />
                      {{ ar: "لا توجد مشتريات مطابقة", fr: "Aucun achat trouvé", en: "No purchases found" }[lang]}
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-foreground">{p.userName}</div>
                        <div className="text-muted-foreground text-[10px]">{p.userEmail}</div>
                      </td>
                      <td className="p-4 font-medium max-w-[200px] truncate">{p.courseTitle}</td>
                      <td className="p-4 font-bold text-foreground">
                        {parseFloat(p.amount).toLocaleString("fr-DZ")} {p.currency}
                      </td>
                      <td className="p-4 font-mono font-semibold">
                        {p.couponCode ? (
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {p.couponCode}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">{new Date(p.paidAt).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPurchase(p)}
                          className="h-8 gap-1.5 text-xs font-bold border-border text-foreground hover:bg-muted"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {{ ar: "تفاصيل", fr: "Détails", en: "Details" }[lang]}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction Details Modal Dialog */}
      <Dialog open={!!selectedPurchase} onOpenChange={(open) => { if (!open) setSelectedPurchase(null); }}>
        <DialogContent className="max-w-lg bg-white border border-border p-6 text-foreground">
          <DialogHeader className="border-b border-border pb-4 mb-4">
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-foreground">
              <ShoppingBag className="w-5 h-5" />
              {{ ar: "تفاصيل المعاملة", fr: "Détails de la transaction", en: "Transaction Details" }[lang]}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              ID #{selectedPurchase?.id} · {selectedPurchase && new Date(selectedPurchase.paidAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {selectedPurchase && (
            <div className="space-y-5 text-xs">
              {/* Section 1: Customer Profile */}
              <div className="space-y-2">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  {{ ar: "معلومات الطالبة", fr: "Profil Étudiante", en: "Student Profile" }[lang]}
                </h4>
                <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
                  <div>
                    <span className="text-[10px] text-muted-foreground">{{ ar: "الاسم الكامل", fr: "Nom complet", en: "Full name" }[lang]}</span>
                    <p className="font-bold text-foreground mt-0.5">{selectedPurchase.userName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">{{ ar: "البريد الإلكتروني", fr: "Adresse e-mail", en: "Email" }[lang]}</span>
                    <p className="font-medium text-foreground mt-0.5 truncate">{selectedPurchase.userEmail}</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Course & Coach Details */}
              <div className="space-y-2">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                  {{ ar: "الدورة والمدرب", fr: "Formation & Coach", en: "Course & Coach" }[lang]}
                </h4>
                <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
                  <div>
                    <span className="text-[10px] text-muted-foreground">{{ ar: "اسم الدورة", fr: "Titre de la formation", en: "Course title" }[lang]}</span>
                    <p className="font-bold text-foreground mt-0.5 truncate">{selectedPurchase.courseTitle}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">{{ ar: "المدرب", fr: "Nom du Coach", en: "Coach" }[lang]}</span>
                    <p className="font-bold text-foreground mt-0.5">{selectedPurchase.coachName}</p>
                  </div>
                </div>
              </div>

              {/* Section 3: Financial Details & Coupon code */}
              <div className="space-y-2">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                  {{ ar: "تفاصيل الدفع والخصم", fr: "Paiement & Coupon", en: "Payment & Coupon" }[lang]}
                </h4>
                <div className="grid grid-cols-3 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
                  <div>
                    <span className="text-[10px] text-muted-foreground">{{ ar: "المبلغ المدفوع", fr: "Montant Net", en: "Net amount" }[lang]}</span>
                    <p className="font-black text-emerald-700 mt-0.5">
                      {parseFloat(selectedPurchase.amount).toLocaleString("fr-DZ")} {selectedPurchase.currency}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">{{ ar: "القسيمة المستخدمة", fr: "Coupon utilisé", en: "Coupon code" }[lang]}</span>
                    <p className="font-mono font-bold text-foreground mt-0.5">
                      {selectedPurchase.couponCode ? (
                        <span className="text-violet-700 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded text-[10px]">
                          {selectedPurchase.couponCode}
                        </span>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">{{ ar: "قيمة الخصم", fr: "Remise appliquée", en: "Discount applied" }[lang]}</span>
                    <p className="font-semibold text-foreground mt-0.5">
                      {selectedPurchase.discountApplied ? `${parseFloat(selectedPurchase.discountApplied).toLocaleString("fr-DZ")} DZD` : "0 DZD"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 4: System Interconnections (Invoice & Coach Commission) */}
              <div className="space-y-2">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  {{ ar: "الترابط مع الفواتير والعمولات", fr: "Facture & Commission associées", en: "Linked Invoice & Commission" }[lang]}
                </h4>
                <div className="grid grid-cols-2 gap-4 bg-[#fafafa] p-3 rounded-lg border border-border">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block">{{ ar: "رقم الفاتورة", fr: "Facture Client", en: "Customer Invoice" }[lang]}</span>
                    {selectedPurchase.invoiceNumber ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground">{selectedPurchase.invoiceNumber}</span>
                        <Badge variant={selectedPurchase.invoiceStatus === "paid" ? "success" : "warning"} className="text-[9px] px-1 py-0">
                          {selectedPurchase.invoiceStatus}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/30">—</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block">{{ ar: "عمولة المدرب", fr: "Commission Coach (70%)", en: "Coach Commission" }[lang]}</span>
                    {selectedPurchase.commissionAmount ? (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">
                          {parseFloat(selectedPurchase.commissionAmount).toLocaleString("fr-DZ")} DZD
                        </span>
                        <Badge variant={selectedPurchase.commissionStatus === "paid" ? "success" : "warning"} className="text-[9px] px-1 py-0">
                          {selectedPurchase.commissionStatus}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/30">—</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-border">
                <Button onClick={() => setSelectedPurchase(null)} className="font-bold text-xs bg-black hover:bg-black/90 text-white">
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
