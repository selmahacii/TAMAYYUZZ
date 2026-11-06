import { useState } from "react";
import { useGetMyPurchases } from "@workspace/api-client-react";
import { useI18n } from "@/i18n";
import { StudentLayout } from "@/components/student/StudentLayout";
import { Wallet, Tag, Calendar, BookOpen, Receipt, ChevronRight, Printer, GraduationCap, Clock, Layers, FileCheck2, User } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Purchase {
  id: number; courseId: number; amount: string; currency: string;
  couponCode?: string | null; discountApplied: string; paidAt: string;
  invoiceNumber?: string | null; invoiceStatus?: string | null;
  course: {
    title: string; imageUrl?: string | null; coachName: string;
    level?: string | null; durationHours?: number | null;
  };
}

const levelLabels: Record<string, Record<"ar" | "fr" | "en", string>> = {
  beginner: { ar: "مبتدئ", fr: "Débutant", en: "Beginner" },
  intermediate: { ar: "متوسط", fr: "Intermédiaire", en: "Intermediate" },
  advanced: { ar: "متقدم", fr: "Avancé", en: "Advanced" },
};

function InvoiceDialog({ purchase, lang, onClose }: { purchase: Purchase; lang: "ar" | "fr" | "en"; onClose: () => void }) {
  const originalPrice = parseFloat(purchase.amount) + parseFloat(purchase.discountApplied);
  const discount = parseFloat(purchase.discountApplied);
  const total = parseFloat(purchase.amount);
  const level = purchase.course.level ? levelLabels[purchase.course.level]?.[lang] ?? purchase.course.level : null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg print:shadow-none print:border-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ fontFamily: "Cairo, sans-serif" }}>
            <FileCheck2 className="w-5 h-5 text-emerald-600" />
            {{ ar: "تفاصيل الفاتورة", fr: "Détails de la facture", en: "Invoice details" }[lang]}
          </DialogTitle>
        </DialogHeader>

        <div id="invoice-print-area" className="space-y-5">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
            <div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                {{ ar: "رقم الفاتورة", fr: "N° de facture", en: "Invoice #" }[lang]}
              </div>
              <div className="font-mono font-bold text-foreground text-sm mt-0.5">{purchase.invoiceNumber ?? `PUR-${purchase.id}`}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                {{ ar: "الحالة", fr: "Statut", en: "Status" }[lang]}
              </div>
              <span className="inline-flex items-center gap-1 mt-0.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                {{ ar: "مدفوعة", fr: "Payée", en: "Paid" }[lang]}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0 border border-border">
              {purchase.course.imageUrl ? (
                <img src={purchase.course.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-6 h-6 text-muted-foreground/40" /></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-foreground text-sm">{purchase.course.title}</div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{purchase.course.coachName}</span>
                {level && <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{level}</span>}
                {purchase.course.durationHours && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{purchase.course.durationHours}h</span>}
              </div>
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{{ ar: "السعر الأصلي", fr: "Prix initial", en: "Original price" }[lang]}</span>
              <span className="text-foreground font-semibold">{originalPrice.toLocaleString("fr-DZ")} {purchase.currency}</span>
            </div>
            {discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-600 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {{ ar: "الخصم", fr: "Remise", en: "Discount" }[lang]}{purchase.couponCode ? ` (${purchase.couponCode})` : ""}
                </span>
                <span className="text-emerald-600 font-semibold">-{discount.toLocaleString("fr-DZ")} {purchase.currency}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-base pt-2 border-t border-border">
              <span className="font-bold text-foreground">{{ ar: "الإجمالي المدفوع", fr: "Total payé", en: "Total paid" }[lang]}</span>
              <span className="font-black text-foreground">{total.toLocaleString("fr-DZ")} {purchase.currency}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            {{ ar: "تاريخ الشراء", fr: "Date d'achat", en: "Purchase date" }[lang]} : {new Date(purchase.paidAt).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-DZ", { day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 print:hidden">
          <Button onClick={() => window.print()} variant="outline" className="flex-1 gap-2 text-sm font-semibold">
            <Printer className="w-4 h-4" />
            {{ ar: "طباعة", fr: "Imprimer", en: "Print" }[lang]}
          </Button>
          <Link href={`/student/learn/${purchase.courseId}`} className="flex-1">
            <Button className="w-full gap-2 text-sm font-bold bg-black hover:bg-black/90 text-white">
              <BookOpen className="w-4 h-4" />
              {{ ar: "الذهاب إلى الدورة", fr: "Aller à la formation", en: "Go to course" }[lang]}
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function StudentPurchasesPage() {
  const { lang } = useI18n();
  const { data: purchases, isLoading } = useGetMyPurchases();
  const [selected, setSelected] = useState<Purchase | null>(null);

  const total = purchases?.reduce((s, p) => s + parseFloat(p.amount), 0) ?? 0;
  const totalSaved = purchases?.reduce((s, p) => s + parseFloat(p.discountApplied), 0) ?? 0;
  const coursesCount = purchases?.length ?? 0;

  return (
    <StudentLayout
      title={{ ar: "مشترياتي", fr: "Mes achats", en: "My Purchases" }[lang]}
      subtitle={{ ar: "سجل جميع مدفوعاتك على المنصة مع فواتير تفصيلية", fr: "Historique de tous vos paiements avec factures détaillées", en: "History of all your payments with detailed invoices" }[lang]}
    >
      {!isLoading && purchases && purchases.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-border shadow-2xs rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">{{ ar: "إجمالي المدفوعات", fr: "Total dépensé", en: "Total spent" }[lang]}</div>
              <div className="text-lg font-black text-foreground mt-0.5" style={{ fontFamily: "Cairo, sans-serif" }}>{total.toLocaleString("fr-DZ")} DZD</div>
            </div>
          </div>
          <div className="bg-white border border-border shadow-2xs rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">{{ ar: "عدد الدورات المشتراة", fr: "Formations achetées", en: "Courses purchased" }[lang]}</div>
              <div className="text-lg font-black text-foreground mt-0.5" style={{ fontFamily: "Cairo, sans-serif" }}>{coursesCount}</div>
            </div>
          </div>
          <div className="bg-white border border-border shadow-2xs rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">{{ ar: "إجمالي التوفير", fr: "Total économisé", en: "Total saved" }[lang]}</div>
              <div className="text-lg font-black text-foreground mt-0.5" style={{ fontFamily: "Cairo, sans-serif" }}>{totalSaved.toLocaleString("fr-DZ")} DZD</div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-white border border-border rounded-xl animate-pulse" />)}</div>
      ) : !purchases || purchases.length === 0 ? (
        <div className="text-center py-24 bg-white border border-border rounded-2xl">
          <Receipt className="w-14 h-14 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>
            {{ ar: "لا توجد مشتريات بعد", fr: "Aucun achat pour l'instant", en: "No purchases yet" }[lang]}
          </h3>
          <p className="text-muted-foreground mb-6 text-sm">{{ ar: "دورات مدفوعة ستظهر هنا بعد الشراء", fr: "Les formations payantes apparaîtront ici après achat", en: "Paid courses will appear here after purchase" }[lang]}</p>
          <Link href="/student/home">
            <Button className="bg-black hover:bg-black/90 text-white font-bold px-8 gap-2">
              <BookOpen className="w-4 h-4" />
              {{ ar: "تصفّحي الدورات", fr: "Parcourir les formations", en: "Browse courses" }[lang]}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {purchases.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className="w-full flex items-center gap-4 p-4 bg-white border border-border shadow-2xs rounded-xl hover:border-black/30 hover:shadow-sm transition-all text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-neutral-50 border overflow-hidden shrink-0 flex items-center justify-center">
                {p.course.imageUrl ? <img src={p.course.imageUrl} alt="" className="w-full h-full object-cover" /> : <BookOpen className="w-5 h-5 text-neutral-700" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-foreground text-sm truncate">{p.course.title}</div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(p.paidAt).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-DZ")}</span>
                  {p.couponCode && <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{p.couponCode}</span>}
                  <span className="font-mono text-[10px] text-muted-foreground/70">{p.invoiceNumber ?? `PUR-${p.id}`}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-black text-foreground text-sm">{parseFloat(p.amount).toLocaleString("fr-DZ")} {p.currency}</div>
                {parseFloat(p.discountApplied) > 0 && (
                  <div className="text-[10px] text-emerald-600 font-semibold">-{parseFloat(p.discountApplied).toLocaleString("fr-DZ")} {p.currency}</div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {selected && <InvoiceDialog purchase={selected} lang={lang} onClose={() => setSelected(null)} />}
    </StudentLayout>
  );
}
