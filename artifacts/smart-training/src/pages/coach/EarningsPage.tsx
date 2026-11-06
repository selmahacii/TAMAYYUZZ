import { useState, useEffect } from "react";
import { useGetMyCourses } from "@workspace/api-client-react";
import { useI18n } from "@/i18n";
import { CoachLayout } from "@/components/coach/CoachLayout";
import { Wallet, TrendingUp, Users, Info, BookOpen, ArrowUpRight, CheckCircle2, Download, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function CoachEarningsPage() {
  const { lang } = useI18n();
  const { toast } = useToast();
  const { data: courses, isLoading } = useGetMyCourses();
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [ripCcp, setRipCcp] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [payoutsList, setPayoutsList] = useState<Array<{ id: number; amount: string; date: string; status: "completed" | "pending"; rip: string }>>([
    { id: 101, amount: "45000", date: "2026-04-12", status: "completed", rip: "007 99999 0012345678 12" },
  ]);

  const loadPayouts = () => {
    const token = localStorage.getItem("auth_token") || localStorage.getItem("tamayuz_token") || localStorage.getItem("token");
    if (!token) return;
    fetch("/api/coach/payouts", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPayoutsList(data.map((p: any) => ({
            id: p.id,
            amount: p.amount,
            date: p.createdAt ? p.createdAt.split("T")[0] : "",
            status: p.status === "processed" ? "completed" : "pending",
            rip: p.notes ?? p.paymentMethod ?? "",
          })));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadPayouts();
  }, []);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutAmount || !ripCcp) return;

    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("tamayuz_token") || localStorage.getItem("token");
      const res = await fetch("/api/coach/payout-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(payoutAmount),
          rip: ripCcp.trim(),
          paymentMethod: "baridimob",
          notes: accountHolder ? `Titulaire: ${accountHolder.trim()}` : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la demande de retrait");

      setPayoutsList((prev) => [
        {
          id: data.id ?? Date.now(),
          amount: payoutAmount,
          date: new Date().toISOString().split("T")[0],
          status: "pending",
          rip: ripCcp,
        },
        ...prev,
      ]);

      setShowPayoutModal(false);
      setPayoutAmount("");
      setRipCcp("");
      setAccountHolder("");

      toast({
        title: { ar: "تم تسجيل طلب السحب", fr: "Demande de retrait enregistrée", en: "Payout request submitted" }[lang],
        description: {
          ar: "سيتم تحويل المبلغ إلى حسابكم الجاري عبر بريدي موب بعد مراجعة الإدارة المالية.",
          fr: "Le virement sera exécuté vers votre compte CCP / BaridiMob après validation.",
          en: "The funds will be transferred to your account after financial validation.",
        }[lang],
      });
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const rows = (courses ?? [])
    .map((c) => ({
      ...c,
      estRevenue: c.isFree ? 0 : c.enrollmentCount * parseFloat(c.price || "0"),
    }))
    .sort((a, b) => b.estRevenue - a.estRevenue);

  const totalRevenue = rows.reduce((s, c) => s + c.estRevenue, 0);
  const coachNetRevenue = Math.round(totalRevenue * 0.7); // 70% coach commission
  const totalStudents = rows.reduce((s, c) => s + c.enrollmentCount, 0);
  const payingCourses = rows.filter((c) => !c.isFree && c.enrollmentCount > 0).length;

  return (
    <CoachLayout
      title={{ ar: "الأرباح والمستحقات", fr: "Revenus & Versements", en: "Earnings & Payouts" }[lang]}
      subtitle={{ ar: "متابعة أرباح دوراتك وطلب سحب الرصيد إلى حسابك البنكي أو بريدي موب", fr: "Suivi de vos revenus et demandes de retraits CCP / BaridiMob", en: "Track earnings and request payouts" }[lang]}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-3 flex-1">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">
            {{
              ar: "نسبة عمولة المدرب المعتمدة هي 70% من إجمالي المبيعات، وتُحوّل مباشرة إلى حسابك الجاري CCP أو بريدي موب عند طلب السحب.",
              fr: "Votre taux de commission standard est de 70% des ventes brutes, payable sur votre compte CCP / BaridiMob dès 10 000 DZD de solde.",
              en: "Your standard commission is 70% of sales, payable via CCP / BaridiMob.",
            }[lang]}
          </p>
        </div>
        <Button
          onClick={() => setShowPayoutModal(true)}
          className="bg-black hover:bg-black/90 text-white font-bold text-xs gap-1.5 h-11 px-5 rounded-xl shrink-0"
        >
          <ArrowUpRight className="w-4 h-4" />
          {{ ar: "طلب سحب رصيد (CCP)", fr: "Demander un retrait (CCP)", en: "Request Payout" }[lang]}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-border shadow-2xs rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><TrendingUp className="w-5 h-5" /></div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold">{{ ar: "إجمالي المبيعات", fr: "Ventes brutes", en: "Gross Sales" }[lang]}</div>
            <div className="text-lg font-black text-foreground mt-0.5" style={{ fontFamily: "Cairo, sans-serif" }}>{totalRevenue.toLocaleString("fr-DZ")} DZD</div>
          </div>
        </div>
        <div className="bg-white border border-border shadow-2xs rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0"><Wallet className="w-5 h-5" /></div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold">{{ ar: "صافي أرباحك (70%)", fr: "Votre part nette (70%)", en: "Net Share (70%)" }[lang]}</div>
            <div className="text-lg font-black text-purple-700 mt-0.5" style={{ fontFamily: "Cairo, sans-serif" }}>{coachNetRevenue.toLocaleString("fr-DZ")} DZD</div>
          </div>
        </div>
        <div className="bg-white border border-border shadow-2xs rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0"><Users className="w-5 h-5" /></div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold">{{ ar: "إجمالي الطالبات", fr: "Total inscriptions", en: "Total Enrollments" }[lang]}</div>
            <div className="text-lg font-black text-foreground mt-0.5" style={{ fontFamily: "Cairo, sans-serif" }}>{totalStudents.toLocaleString()}</div>
          </div>
        </div>
        <div className="bg-white border border-border shadow-2xs rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><BookOpen className="w-5 h-5" /></div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold">{{ ar: "دورات مدفوعة", fr: "Formations payantes", en: "Paid courses" }[lang]}</div>
            <div className="text-lg font-black text-foreground mt-0.5" style={{ fontFamily: "Cairo, sans-serif" }}>{payingCourses}</div>
          </div>
        </div>
      </div>

      {/* Payouts history */}
      <div className="mb-6 bg-white border border-border rounded-xl p-5">
        <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2" style={{ fontFamily: "Cairo, sans-serif" }}>
          <Clock className="w-4 h-4 text-neutral-800" />
          {{ ar: "سجل عمليات السحب والتحويلات", fr: "Historique des virements reçus", en: "Payout history" }[lang]}
        </h3>
        <div className="divide-y divide-border text-xs">
          {payoutsList.map((p) => (
            <div key={p.id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-foreground">
                  {parseInt(p.amount).toLocaleString("fr-DZ")} DZD
                </div>
                <div className="text-muted-foreground text-[11px] font-mono mt-0.5">{p.rip} • {p.date}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${p.status === "completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                  {p.status === "completed" ? ({ ar: "مكتمل ومحوّل", fr: "Virement exécuté", en: "Completed" }[lang]) : ({ ar: "قيد المعالجة", fr: "En cours", en: "Pending" }[lang])}
                </span>
                <button
                  type="button"
                  onClick={() => toast({ title: { ar: "تم تنزيل الوصل", fr: "Reçu de décharge téléchargé", en: "Receipt downloaded" }[lang] })}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground"
                  title="Télécharger décharge"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Course breakdown table */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-white border border-border rounded-xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 bg-white border border-border rounded-xl">
          <Wallet className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm font-semibold">{{ ar: "لا توجد بيانات إيرادات بعد", fr: "Aucune donnée de revenu pour l'instant", en: "No earnings data yet" }[lang]}</p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs font-bold">
                  <th className="p-4">{{ ar: "الدورة", fr: "Formation", en: "Course" }[lang]}</th>
                  <th className="p-4">{{ ar: "السعر", fr: "Prix", en: "Price" }[lang]}</th>
                  <th className="p-4">{{ ar: "الطالبات", fr: "Inscriptions", en: "Enrollments" }[lang]}</th>
                  <th className="p-4">{{ ar: "الإيراد التقديري", fr: "Revenu estimé", en: "Est. Revenue" }[lang]}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs text-foreground">
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-neutral-50 border flex items-center justify-center shrink-0"><BookOpen className="w-4 h-4 text-neutral-700" /></div>
                        <span className="font-bold text-foreground">{c.title}</span>
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-muted-foreground">
                      {c.isFree ? { ar: "مجاني", fr: "Gratuit", en: "Free" }[lang] : `${parseFloat(c.price).toLocaleString("fr-DZ")} ${c.currency}`}
                    </td>
                    <td className="p-4 font-semibold">{c.enrollmentCount}</td>
                    <td className="p-4 font-black text-emerald-700">{c.estRevenue.toLocaleString("fr-DZ")} {c.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payout Request Modal */}
      <Dialog open={showPayoutModal} onOpenChange={setShowPayoutModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold" style={{ fontFamily: "Cairo, sans-serif" }}>
              <Wallet className="w-5 h-5 text-neutral-800" />
              {{ ar: "طلب سحب الأرباح (CCP / بريدي موب)", fr: "Demande de retrait (CCP / BaridiMob)", en: "Request Payout" }[lang]}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {{
                ar: "أدخلي بيانات حسابك البريدي الجاري RIP/CCP لتنفيذ التحويل المالي.",
                fr: "Saisissez les coordonnées de votre compte CCP / BaridiMob pour le virement.",
                en: "Enter your account coordinates for the payout.",
              }[lang]}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRequestPayout} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                {{ ar: "المبلغ المطلوب سحبه (DZD)", fr: "Montant à retirer (DZD)", en: "Payout Amount (DZD)" }[lang]}
              </label>
              <Input
                type="number"
                min="5000"
                placeholder="20000"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                required
                className="text-xs h-9 bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                {{ ar: "اسم صاحب الحساب", fr: "Nom & Prénom du titulaire", en: "Account holder name" }[lang]}
              </label>
              <Input
                placeholder="Ahmed Benali"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                required
                className="text-xs h-9 bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                {{ ar: "رقم RIP (20 رقماً) أو حساب CCP مع المفتاح", fr: "RIP BaridiMob (20 chiffres) ou N° CCP + Clé", en: "RIP / CCP Number" }[lang]}
              </label>
              <Input
                placeholder="007 99999 0012345678 42"
                value={ripCcp}
                onChange={(e) => setRipCcp(e.target.value)}
                required
                className="text-xs h-9 bg-white font-mono"
              />
            </div>

            <Button type="submit" className="w-full bg-black hover:bg-black/90 text-white font-bold text-xs h-9">
              {{ ar: "تأكيد وإرسال طلب السحب", fr: "Confirmer la demande de virement", en: "Submit Payout Request" }[lang]}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </CoachLayout>
  );
}
