import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet,
  Plus,
  ArrowUpRight,
  Clock,
  CheckCircle,
  FileText,
  Loader2,
  Calendar,
  DollarSign,
  UserCheck,
  Search,
  AlertCircle,
  X
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";

interface Payout {
  id: number;
  coachId: number;
  coachName: string;
  coachEmail: string;
  amount: string;
  currency: string;
  status: "pending" | "processed" | "rejected";
  paymentMethod: string;
  referenceNumber: string | null;
  notes: string | null;
  processedAt: string | null;
  createdAt: string;
}

interface Commission {
  id: number;
  coachId: number;
  coachName: string;
  amount: string;
  status: string;
  isPaid: boolean;
  createdAt: string;
}

interface Coach {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function AdminPayoutsPage() {
  const { lang } = useI18n();
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ payout: Payout; status: "processed" | "rejected" } | null>(null);

  // Form states
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Searchable coach states
  const [coachSearchQuery, setCoachSearchQuery] = useState("");
  const [showCoachDropdown, setShowCoachDropdown] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch payouts
  const { data: payouts, isLoading: isLoadingPayouts } = useQuery<Payout[]>({
    queryKey: ["admin", "payouts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/payouts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch payouts");
      return res.json();
    },
  });

  // Fetch all commissions (to calculate balances)
  const { data: commissions, isLoading: isLoadingCommissions } = useQuery<Commission[]>({
    queryKey: ["admin", "commissions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/commissions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch commissions");
      return res.json();
    },
  });

  // Fetch coaches
  const { data: coaches, isLoading: isLoadingCoaches } = useQuery<Coach[]>({
    queryKey: ["admin", "coaches"],
    queryFn: async () => {
      const res = await fetch("/api/admin/coaches", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch coaches");
      return res.json();
    },
  });

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCoachDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Create payout mutation
  const createMutation = useMutation({
    mutationFn: async (newPayout: any) => {
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newPayout),
      });
      if (!res.ok) throw new Error("Failed to process payout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payouts"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "commissions"] });
      toast({
        title: {
          ar: "تم تسجيل عملية الدفع بنجاح",
          fr: "Versement enregistré avec succès",
          en: "Payout recorded successfully"
        }[lang],
      });
      resetForm();
      setIsOpen(false);
    },
    onError: (err: any) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  // Update payout status (process/reject a pending payout)
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "processed" | "rejected" }) => {
      const res = await fetch(`/api/admin/payouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update payout");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payouts"] });
      toast({
        title: variables.status === "processed"
          ? { ar: "تم تأكيد التحويل", fr: "Versement confirmé", en: "Payout confirmed" }[lang]
          : { ar: "تم رفض التحويل", fr: "Versement rejeté", en: "Payout rejected" }[lang],
      });
      setPendingAction(null);
    },
    onError: (err: any) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setSelectedCoach(null);
    setCoachSearchQuery("");
    setAmount("");
    setPaymentMethod("bank_transfer");
    setReferenceNumber("");
    setNotes("");
  };

  // Compute pending balances for each coach
  const getPendingBalance = (coachId: number) => {
    if (!commissions) return 0;
    return commissions
      .filter((c) => c.coachId === coachId && !c.isPaid && c.status !== "cancelled")
      .reduce((sum, c) => sum + parseFloat(c.amount), 0);
  };

  const handleSelectCoach = (coach: Coach) => {
    setSelectedCoach(coach);
    setCoachSearchQuery("");
    setShowCoachDropdown(false);
    const balance = getPendingBalance(coach.id);
    setAmount(balance.toFixed(2));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoach) return;

    createMutation.mutate({
      coachId: selectedCoach.id,
      amount,
      paymentMethod,
      referenceNumber: referenceNumber || null,
      notes: notes || null,
    });
  };

  const filteredCoaches = coachSearchQuery && coaches
    ? coaches.filter(
        (c) =>
          c.name.toLowerCase().includes(coachSearchQuery.toLowerCase()) ||
          c.email.toLowerCase().includes(coachSearchQuery.toLowerCase())
      )
    : coaches ?? [];

  const getInitials = (n: string) =>
    n.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();

  const methodLabels = {
    bank_transfer: { ar: "تحويل بنكي", fr: "Virement bancaire", en: "Bank Transfer" },
    ccp: { ar: "حساب بريدي جار (CCP)", fr: "Versement CCP", en: "CCP Transfer" },
    baridimob: { ar: "بريدي موب", fr: "BaridiMob", en: "BaridiMob" },
    cash: { ar: "نقداً", fr: "Espèces / Cash", en: "Cash" }
  };

  const statusLabels = {
    pending: { ar: "قيد الانتظار", fr: "En attente", en: "Pending" },
    processed: { ar: "مكتمل", fr: "Traité", en: "Processed" },
    rejected: { ar: "مرفوض", fr: "Rejeté", en: "Rejected" },
  };

  return (
    <AdminLayout
      title={{ ar: "المدفوعات للمدربين", fr: "Versements coachs", en: "Coach Payouts" }[lang]}
      subtitle={{ ar: "إدارة وتسجيل المدفوعات والتحويلات المالية للمدربين", fr: "Suivi et gestion des versements aux coachs", en: "Track and process payouts to coaches" }[lang]}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* KPI 1 */}
        <div className="bg-white border border-border rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
              {{ ar: "إجمالي المدفوعات", fr: "Total des versements", en: "Total Payouts" }[lang]}
            </span>
            <h3 className="text-xl font-black text-foreground">
              {payouts?.reduce((sum, p) => sum + parseFloat(p.amount), 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DZD
            </h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-border rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
              {{ ar: "العمولات المستحقة", fr: "Commissions en attente", en: "Pending Commissions" }[lang]}
            </span>
            <h3 className="text-xl font-black text-foreground">
              {commissions?.filter(c => !c.isPaid).reduce((sum, c) => sum + parseFloat(c.amount), 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DZD
            </h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Action Button */}
        <div className="bg-white border border-border rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
              {{ ar: "الإجراءات السريعة", fr: "Action rapide", en: "Quick Action" }[lang]}
            </span>
            <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setIsOpen(false); resetForm(); } }}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsOpen(true)} className="mt-1 flex items-center gap-2 bg-black hover:bg-black/90 text-white font-bold shadow-sm">
                  <Plus className="w-4 h-4" />
                  {{ ar: "تسجيل دفعة", fr: "Enregistrer un versement", en: "Record Payout" }[lang]}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white border border-border p-6 text-foreground">
                <DialogHeader>
                  <DialogTitle className="text-foreground font-black">
                    {{ ar: "تسجيل تحويل مالي لمدرب", fr: "Enregistrer un versement coach", en: "Record Coach Payout" }[lang]}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    {{ ar: "تسجيل الدفعات المالية مع تصفية العمولات تلقائياً", fr: "Saisir un virement coach avec calcul automatique du solde dû", en: "Record a manual financial transfer with balance validation" }[lang]}
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4 mt-2 text-xs">
                  
                  {/* Searchable Coach Combobox */}
                  <div className="space-y-1.5 relative" ref={dropdownRef}>
                    <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                      {{ ar: "البحث عن المدرب وتحديده", fr: "Recherche et Sélection de la Coach", en: "Search & Select Coach" }[lang]}
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={{ ar: "ابحث عن المدرب بالاسم أو البريد...", fr: "Chercher la coach par nom ou email...", en: "Search coach by name/email..." }[lang]}
                        value={coachSearchQuery}
                        onChange={(e) => {
                          setCoachSearchQuery(e.target.value);
                          setShowCoachDropdown(true);
                        }}
                        onFocus={() => setShowCoachDropdown(true)}
                        className="pl-9 bg-white border-border text-foreground text-xs"
                      />
                    </div>

                    {/* Suggestions Dropdown */}
                    {showCoachDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto divide-y divide-border">
                        {filteredCoaches.length === 0 ? (
                          <div className="p-3 text-center text-muted-foreground text-[10px]">
                            {{ ar: "لا توجد مدربات مطابقة", fr: "Aucune coach trouvée", en: "No coaches found" }[lang]}
                          </div>
                        ) : (
                          filteredCoaches.map((c) => {
                            const pending = getPendingBalance(c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => handleSelectCoach(c)}
                                className="w-full flex items-center justify-between p-2.5 hover:bg-muted/40 transition-colors text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-neutral-900">
                                    {getInitials(c.name)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-foreground truncate">{c.name}</div>
                                    <div className="text-[10px] text-muted-foreground truncate">{c.email}</div>
                                  </div>
                                </div>
                                <span className={`text-[10px] font-bold ${pending > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                                  {pending.toLocaleString("fr-FR")} DZD
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* Selection preview */}
                    {selectedCoach ? (
                      <div className="flex items-center justify-between p-3 bg-muted/40 border border-border rounded-lg mt-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 bg-purple-600">
                            {getInitials(selectedCoach.name)}
                          </div>
                          <div>
                            <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                              {{ ar: "المدرب المحدد", fr: "Coach sélectionnée", en: "Selected Coach" }[lang]}
                            </div>
                            <p className="font-bold text-foreground mt-0.5">{selectedCoach.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-muted-foreground block font-bold uppercase">{{ ar: "المبلغ المستحق", fr: "Total Dû", en: "Balance Due" }[lang]}</span>
                          <span className="text-xs font-black text-amber-700">
                            {getPendingBalance(selectedCoach.id).toLocaleString("fr-FR")} DZD
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 bg-amber-50/50 border border-amber-100 rounded-lg text-amber-800 mt-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                        <p className="text-[10px] font-semibold leading-relaxed">
                          {{ ar: "يرجى اختيار حساب المدربة للتحقق من الرصيد قبل التسجيل.", fr: "Sélectionnez une coach pour charger et régler son solde en attente.", en: "Select a coach to fetch and settle their outstanding balance." }[lang]}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="space-y-1">
                    <Label htmlFor="amount" className="text-foreground font-bold">{{ ar: "المبلغ (د.ج)", fr: "Montant à verser (DZD)", en: "Payout Amount (DZD)" }[lang]}</Label>
                    <div className="relative">
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        required
                        className="bg-white border-border text-foreground font-bold"
                      />
                      {selectedCoach && (
                        <button
                          type="button"
                          onClick={() => setAmount(getPendingBalance(selectedCoach.id).toFixed(2))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded"
                        >
                          {{ ar: "كامل المبلغ", fr: "Régler totalité", en: "Settle Full" }[lang]}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-1">
                    <Label htmlFor="method" className="text-foreground font-bold">{{ ar: "طريقة الدفع", fr: "Moyen de paiement", en: "Payment Method" }[lang]}</Label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-black"
                    >
                      <option value="bank_transfer">{{ ar: "تحويل بنكي", fr: "Virement bancaire", en: "Bank Transfer" }[lang]}</option>
                      <option value="ccp">{{ ar: "حساب بريدي جار (CCP)", fr: "Versement CCP", en: "CCP Transfer" }[lang]}</option>
                      <option value="baridimob">BaridiMob</option>
                      <option value="cash">{{ ar: "نقداً", fr: "Espèces / Cash", en: "Cash" }[lang]}</option>
                    </select>
                  </div>

                  {/* Reference Number */}
                  <div className="space-y-1">
                    <Label htmlFor="ref" className="text-foreground font-bold">{{ ar: "رقم المرجع", fr: "Référence de transaction", en: "Reference Number" }[lang]}</Label>
                    <Input
                      id="ref"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="N° Virement, CCP Transaction ID..."
                      className="bg-white border-border text-foreground"
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-1">
                    <Label htmlFor="notes" className="text-foreground font-bold">{{ ar: "ملاحظات", fr: "Notes / Remarques", en: "Notes" }[lang]}</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Details..."
                      className="bg-white border-border text-foreground min-h-[60px]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-border">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="border-border text-foreground">
                      {{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} className="bg-black hover:bg-black/90 text-white font-bold">
                      {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                      {{ ar: "تأكيد الدفع", fr: "Confirmer le paiement", en: "Confirm Payout" }[lang]}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="w-10 h-10 rounded-lg bg-neutral-50 text-neutral-800 flex items-center justify-center shrink-0 border">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Payout History List */}
      <div className="bg-white border border-border rounded-xl overflow-hidden shadow-2xs">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-bold text-foreground">
            {{ ar: "سجل عمليات التحويل", fr: "Historique des versements", en: "Payout History" }[lang]}
          </h2>
        </div>

        {isLoadingPayouts ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !payouts || payouts.length === 0 ? (
          <div className="text-center py-16">
            <Wallet className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm font-semibold">
              {{ ar: "لا توجد عمليات تحويل مسجلة", fr: "Aucun versement enregistré pour le moment", en: "No payouts recorded yet" }[lang]}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground font-bold">
                  <th className="p-4">{{ ar: "المدرب", fr: "Coach", en: "Coach" }[lang]}</th>
                  <th className="p-4">{{ ar: "المبلغ", fr: "Montant", en: "Amount" }[lang]}</th>
                  <th className="p-4">{{ ar: "طريقة الدفع", fr: "Moyen", en: "Method" }[lang]}</th>
                  <th className="p-4">{{ ar: "رقم المرجع", fr: "Référence", en: "Reference" }[lang]}</th>
                  <th className="p-4">{{ ar: "الحالة", fr: "Statut", en: "Status" }[lang]}</th>
                  <th className="p-4">{{ ar: "التاريخ", fr: "Date", en: "Date" }[lang]}</th>
                  <th className="p-4">{{ ar: "إجراءات", fr: "Actions", en: "Actions" }[lang]}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <div className="font-bold">{payout.coachName}</div>
                      <div className="text-[10px] text-muted-foreground">{payout.coachEmail}</div>
                    </td>
                    <td className="p-4 font-black">
                      {parseFloat(payout.amount).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {payout.currency}
                    </td>
                    <td className="p-4 font-bold text-muted-foreground">
                      {methodLabels[payout.paymentMethod as keyof typeof methodLabels]?.[lang] ?? payout.paymentMethod}
                    </td>
                    <td className="p-4 font-mono font-semibold text-muted-foreground">
                      {payout.referenceNumber ?? "—"}
                    </td>
                    <td className="p-4">
                      <Badge variant={payout.status === "processed" ? "success" : payout.status === "pending" ? "warning" : "error"} className="text-[10px]">
                        {statusLabels[payout.status]?.[lang] ?? payout.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>{new Date(payout.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {payout.status === "pending" ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm" variant="outline"
                            disabled={statusMutation.isPending}
                            onClick={() => setPendingAction({ payout, status: "processed" })}
                            className="h-7 px-2 text-[10px] border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            {{ ar: "تأكيد", fr: "Traiter", en: "Process" }[lang]}
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            disabled={statusMutation.isPending}
                            onClick={() => setPendingAction({ payout, status: "rejected" })}
                            className="h-7 px-2 text-[10px] border-rose-200 text-rose-700 hover:bg-rose-50 gap-1"
                          >
                            <X className="w-3 h-3" />
                            {{ ar: "رفض", fr: "Rejeter", en: "Reject" }[lang]}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.status === "processed"
                ? { ar: "تأكيد تسديد هذا التحويل؟", fr: "Confirmer le traitement de ce versement ?", en: "Confirm processing this payout?" }[lang]
                : { ar: "رفض هذا التحويل؟", fr: "Rejeter ce versement ?", en: "Reject this payout?" }[lang]}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction && (pendingAction.status === "processed" ? {
                ar: `سيتم تسجيل مبلغ ${parseFloat(pendingAction.payout.amount).toLocaleString("fr-FR")} ${pendingAction.payout.currency} كمدفوع لـ ${pendingAction.payout.coachName}. هذا الإجراء مالي ولا يمكن التراجع عنه.`,
                fr: `Le montant ${parseFloat(pendingAction.payout.amount).toLocaleString("fr-FR")} ${pendingAction.payout.currency} sera marqué comme versé à ${pendingAction.payout.coachName}. Cette action financière est irréversible.`,
                en: `The amount ${parseFloat(pendingAction.payout.amount).toLocaleString("fr-FR")} ${pendingAction.payout.currency} will be marked as paid to ${pendingAction.payout.coachName}. This financial action cannot be undone.`,
              }[lang] : {
                ar: `سيتم رفض تحويل ${pendingAction.payout.coachName} البالغ ${parseFloat(pendingAction.payout.amount).toLocaleString("fr-FR")} ${pendingAction.payout.currency}.`,
                fr: `Le versement de ${parseFloat(pendingAction.payout.amount).toLocaleString("fr-FR")} ${pendingAction.payout.currency} pour ${pendingAction.payout.coachName} sera rejeté.`,
                en: `The payout of ${parseFloat(pendingAction.payout.amount).toLocaleString("fr-FR")} ${pendingAction.payout.currency} for ${pendingAction.payout.coachName} will be rejected.`,
              }[lang])}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusMutation.isPending}>{{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}</AlertDialogCancel>
            <AlertDialogAction
              disabled={statusMutation.isPending}
              onClick={() => pendingAction && statusMutation.mutate({ id: pendingAction.payout.id, status: pendingAction.status })}
              className={pendingAction?.status === "processed" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}
            >
              {statusMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {pendingAction?.status === "processed"
                ? { ar: "تأكيد الدفع", fr: "Confirmer", en: "Confirm" }[lang]
                : { ar: "رفض", fr: "Rejeter", en: "Reject" }[lang]}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
