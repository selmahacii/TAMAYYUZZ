import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Percent,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  User,
  Plus,
  Trash2,
  Search,
  AlertCircle,
  Loader2,
  UserCheck
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Commission {
  id: number;
  coachId: number;
  coachName: string;
  courseId: number | null;
  courseName: string | null;
  amount: string;
  currency: string;
  ratePercent: string;
  status: "pending" | "approved" | "paid" | "cancelled";
  isPaid: boolean;
  paidAt: string | null;
  createdAt: string;
}

interface AppUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function AdminCommissionsPage() {
  const { lang } = useI18n();
  const { toast } = useToast();
  
  // List states
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [coaches, setCoaches] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  
  // Dialog visibility states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Commission | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Creation form states
  const [newAmount, setNewAmount] = useState("");
  const [newRatePercent, setNewRatePercent] = useState("70");
  const [newIsPaid, setNewIsPaid] = useState(false);
  const [newNotes, setNewNotes] = useState("");
  const [creating, setCreating] = useState(false);

  // Searchable coach dropdown states
  const [coachSearchQuery, setCoachSearchQuery] = useState("");
  const [showCoachDropdown, setShowCoachDropdown] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<AppUser | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const token = localStorage.getItem("auth_token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/admin/commissions`, { headers });
      setCommissions(await r.json());
    } finally {
      setLoading(false);
    }
  };

  const fetchCoaches = () => {
    fetch(`${BASE}/api/admin/users`, { headers })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setCoaches(d.filter((u) => u.role === "coach"));
        }
      })
      .catch((err) => console.error("Error fetching coaches", err));
  };

  useEffect(() => {
    fetchCommissions();
    fetchCoaches();

    // Close dropdown on outside click
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCoachDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handlePayCommission = async (id: number) => {
    const r = await fetch(`${BASE}/api/admin/commissions/${id}/pay`, { method: "PATCH", headers });
    if (r.ok) {
      toast({ title: "Commission versée" });
      fetchCommissions();
    } else {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const confirmDeleteCommission = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const r = await fetch(`${BASE}/api/admin/commissions/${pendingDelete.id}`, { method: "DELETE", headers });
      if (r.ok) {
        toast({
          title: {
            ar: "تم حذف العمولة بنجاح",
            fr: "Commission supprimée avec succès",
            en: "Commission deleted successfully"
          }[lang]
        });
        setCommissions((prev) => prev.filter((item) => item.id !== pendingDelete.id));
      } else {
        toast({ title: "Erreur lors de la suppression", variant: "destructive" });
      }
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  const handleCreateCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoach || !newAmount) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une coach et saisir le montant", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${BASE}/api/admin/commissions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          coachId: selectedCoach.id,
          amount: parseFloat(newAmount),
          ratePercent: parseFloat(newRatePercent),
          isPaid: newIsPaid,
          notes: newNotes || null
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create commission");
      }
      const data = await res.json();
      toast({
        title: {
          ar: "تم تسجيل العمولات بنجاح",
          fr: "Commission enregistrée avec succès",
          en: "Commission recorded successfully"
        }[lang]
      });
      setCommissions((prev) => [data, ...prev]);
      setIsAddOpen(false);
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleOpenAdd = () => {
    setSelectedCoach(null);
    setCoachSearchQuery("");
    setNewAmount("");
    setNewRatePercent("70");
    setNewIsPaid(false);
    setNewNotes("");
    setIsAddOpen(true);
  };

  const filtered = commissions.filter((c) =>
    filter === "all" ? true : filter === "paid" ? c.isPaid : !c.isPaid
  );

  const filteredCoaches = coachSearchQuery
    ? coaches.filter(
        (u) =>
          u.name.toLowerCase().includes(coachSearchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(coachSearchQuery.toLowerCase())
      )
    : coaches;

  const totalPending = commissions.filter((c) => !c.isPaid).reduce((s, c) => s + parseFloat(c.amount), 0);
  const totalPaid = commissions.filter((c) => c.isPaid).reduce((s, c) => s + parseFloat(c.amount), 0);

  const getInitials = (n: string) =>
    n.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();

  return (
    <AdminLayout
      title={{ ar: "العمولات", fr: "Commissions coachs", en: "Coach Commissions" }[lang]}
      subtitle={{ ar: "إدارة عمولات المدربين وتحويلاتهم", fr: "Gérer les commissions et versements des coachs", en: "Manage coach commissions and payouts" }[lang]}
    >
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          {
            label: { ar: "في انتظار الدفع", fr: "En attente de versement", en: "Pending Payout" }[lang],
            value: `${totalPending.toLocaleString("fr-DZ")} DZD`,
            icon: <Clock className="w-5 h-5 text-amber-600" />,
            bg: "bg-amber-50/50"
          },
          {
            label: { ar: "تم الدفع", fr: "Total versé", en: "Total Paid" }[lang],
            value: `${totalPaid.toLocaleString("fr-DZ")} DZD`,
            icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
            bg: "bg-emerald-50/50"
          },
          {
            label: { ar: "عدد العمولات", fr: "Nb de commissions", en: "Commission count" }[lang],
            value: commissions.length.toString(),
            icon: <Percent className="w-5 h-5 text-black" />,
            bg: "bg-muted/50"
          },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-border shadow-2xs rounded-xl p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${c.bg}`}>{c.icon}</div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">{c.label}</div>
              <div className="text-base font-black text-foreground mt-0.5" style={{ fontFamily: "Cairo, sans-serif" }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Add Action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        {/* Filter tabs segment controller */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border">
          {[
            { key: "all", label: { ar: "الكل", fr: "Toutes", en: "All" }[lang] },
            { key: "pending", label: { ar: "في انتظار", fr: "En attente", en: "Pending" }[lang] },
            { key: "paid", label: { ar: "مدفوعة", fr: "Versées", en: "Paid" }[lang] },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                filter === tab.key
                  ? "bg-white text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Dialog open={isAddOpen} onOpenChange={(open) => { if (!open) setIsAddOpen(false); }}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenAdd} className="flex items-center gap-2 bg-black hover:bg-black/90 text-white font-bold self-stretch sm:self-auto shadow-sm">
              <Plus className="w-4 h-4" />
              {{ ar: "إضافة عمولة", fr: "Créer une commission", en: "Record Commission" }[lang]}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-white border border-border p-6 text-foreground">
            <DialogHeader>
              <DialogTitle className="text-foreground font-black">
                {{ ar: "إضافة عمولة يدوية للمدربة", fr: "Enregistrer une commission manuelle", en: "Record Manual Commission" }[lang]}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {{ ar: "تسجيل مستحقات إضافية أو مكافأة لأحد المدربين", fr: "Attribuer un gain manuel ou ajustement financier pour une coach", en: "Manually credit a financial adjustment or reward to a coach" }[lang]}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateCommission} className="space-y-4 mt-2 text-xs">
              
              {/* Searchable Coach Selection */}
              <div className="space-y-1.5 relative" ref={dropdownRef}>
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                  {{ ar: "اختر المدرب", fr: "Sélectionner la Coach", en: "Select Coach" }[lang]}
                </label>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={{ ar: "بحث بالاسم أو البريد...", fr: "Rechercher par nom ou email...", en: "Search by coach name/email..." }[lang]}
                    value={coachSearchQuery}
                    onChange={(e) => {
                      setCoachSearchQuery(e.target.value);
                      setShowCoachDropdown(true);
                    }}
                    onFocus={() => setShowCoachDropdown(true)}
                    className="pl-9 bg-white border-border text-foreground text-xs"
                  />
                </div>

                {/* Dropdown list */}
                {showCoachDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto divide-y divide-border">
                    {filteredCoaches.length === 0 ? (
                      <div className="p-3 text-center text-muted-foreground text-[10px]">
                        {{ ar: "لا توجد مدربات مطابقة", fr: "Aucune coach trouvée", en: "No coaches found" }[lang]}
                      </div>
                    ) : (
                      filteredCoaches.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCoach(c);
                            setCoachSearchQuery("");
                            setShowCoachDropdown(false);
                          }}
                          className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-muted/40 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-neutral-900">
                            {getInitials(c.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-foreground truncate">{c.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{c.email}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Selected coach preview */}
                {selectedCoach ? (
                  <div className="flex items-center gap-3 p-3 bg-muted/40 border border-border rounded-lg mt-2">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 bg-purple-600">
                      {getInitials(selectedCoach.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                        {{ ar: "المدرب المحدد", fr: "Coach sélectionnée", en: "Selected Coach" }[lang]}
                      </div>
                      <p className="font-bold text-foreground mt-0.5">{selectedCoach.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{selectedCoach.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-amber-50/50 border border-amber-100 rounded-lg text-amber-800 mt-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <p className="text-[10px] font-semibold leading-relaxed">
                      {{ ar: "يرجى البحث واختيار مدربة لتسجيل هذه العمولات في رصيدها.", fr: "Veuillez rechercher et sélectionner une coach pour lui attribuer ces gains.", en: "Please search and select a coach to credit these earnings." }[lang]}
                    </p>
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                  {{ ar: "مبلغ العمولة بالدينار", fr: "Montant Commission (DZD)", en: "Commission Amount (DZD)" }[lang]}
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="e.g. 3500"
                  required
                  className="bg-white border-border text-foreground font-bold"
                />
              </div>

              {/* Rate Percent */}
              <div className="space-y-1">
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                  {{ ar: "نسبة العمولة (%)", fr: "Taux de répartition (%)", en: "Rate percentage (%)" }[lang]}
                </label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={newRatePercent}
                  onChange={(e) => setNewRatePercent(e.target.value)}
                  placeholder="70"
                  className="bg-white border-border text-foreground"
                />
              </div>

              {/* Payment status direct toggle */}
              <div className="space-y-1.5">
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                  {{ ar: "حالة الدفع الفورية", fr: "Statut de versement", en: "Payout Status" }[lang]}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: false, label: { ar: "غير مدفوعة (في الانتظار)", fr: "En attente (Non payée)", en: "Pending Payout" }[lang], color: "bg-amber-50 border-amber-500 text-amber-700" },
                    { key: true, label: { ar: "مدفوعة فوراً", fr: "Déjà Versée (Payée)", en: "Paid Immediately" }[lang], color: "bg-emerald-50 border-emerald-500 text-emerald-700" },
                  ].map((opt) => (
                    <button
                      key={String(opt.key)}
                      type="button"
                      onClick={() => setNewIsPaid(opt.key)}
                      className={`py-2 px-1 text-center font-bold border rounded-lg transition-all ${
                        newIsPaid === opt.key
                          ? opt.color
                          : "bg-white border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                  {{ ar: "السبب / تفاصيل إضافية", fr: "Justification / Notes", en: "Justification / Notes" }[lang]}
                </label>
                <Textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Notes..."
                  className="bg-white border-border text-foreground text-xs min-h-[60px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="border-border text-foreground">
                  {{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}
                </Button>
                <Button type="submit" disabled={creating} className="bg-black hover:bg-black/90 text-white font-bold">
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  {{ ar: "إضافة", fr: "Ajouter", en: "Add" }[lang]}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Commissions table */}
      {loading ? (
        <div className="space-y-3">
          <div className="h-14 bg-white border border-border rounded-xl animate-pulse" />
          <div className="h-14 bg-white border border-border rounded-xl animate-pulse" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white border border-border rounded-xl shadow-2xs">
          <Percent className="w-10 h-10 mx-auto mb-2 text-muted-foreground/35" />
          {{ ar: "لا توجد عمولات مطابقة", fr: "Aucune commission trouvée", en: "No commissions found" }[lang]}
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs font-bold">
                  <th className="p-4">{{ ar: "المدرب", fr: "Coach", en: "Coach" }[lang]}</th>
                  <th className="p-4">{{ ar: "الدورة", fr: "Formation", en: "Course" }[lang]}</th>
                  <th className="p-4">{{ ar: "المبلغ", fr: "Montant", en: "Amount" }[lang]}</th>
                  <th className="p-4">{{ ar: "النسبة", fr: "Taux", en: "Rate" }[lang]}</th>
                  <th className="p-4">{{ ar: "الحالة", fr: "Statut", en: "Status" }[lang]}</th>
                  <th className="p-4 text-right">{{ ar: "إجراءات", fr: "Actions", en: "Actions" }[lang]}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs text-foreground">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-neutral-900">
                          {getInitials(c.coachName)}
                        </div>
                        <div>
                          <div className="font-bold text-foreground">{c.coachName}</div>
                          <div className="text-muted-foreground text-[10px]">{new Date(c.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-medium max-w-[200px] truncate">{c.courseName ?? <span className="text-muted-foreground/30">—</span>}</td>
                    <td className="p-4 font-black text-foreground">
                      {parseFloat(c.amount).toLocaleString("fr-DZ")} {c.currency}
                    </td>
                    <td className="p-4 font-bold text-muted-foreground">{parseFloat(c.ratePercent).toFixed(0)}%</td>
                    <td className="p-4">
                      <Badge variant={c.isPaid ? "success" : "warning"}>
                        {c.isPaid ? { ar: "تم الدفع", fr: "Versée", en: "Paid" }[lang] : { ar: "قيد الانتظار", fr: "En attente", en: "Pending" }[lang]}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {!c.isPaid && (
                          <Button
                            onClick={() => handlePayCommission(c.id)}
                            size="sm"
                            className="h-8 gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            {{ ar: "دفع", fr: "Verser", en: "Pay" }[lang]}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPendingDelete(c)}
                          className="h-8 border-rose-100 text-rose-700 hover:bg-rose-50/50 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {{ ar: "تأكيد الحذف", fr: "Confirmer la suppression", en: "Confirm deletion" }[lang]}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {{
                ar: `سيتم حذف عمولة ${pendingDelete?.coachName ?? ""} بمبلغ ${pendingDelete ? parseFloat(pendingDelete.amount).toLocaleString("fr-DZ") : ""} ${pendingDelete?.currency ?? ""} نهائيًا.`,
                fr: `La commission de ${pendingDelete?.coachName ?? ""} (${pendingDelete ? parseFloat(pendingDelete.amount).toLocaleString("fr-DZ") : ""} ${pendingDelete?.currency ?? ""}) sera supprimée définitivement.`,
                en: `The commission for ${pendingDelete?.coachName ?? ""} (${pendingDelete ? parseFloat(pendingDelete.amount).toLocaleString("fr-DZ") : ""} ${pendingDelete?.currency ?? ""}) will be permanently deleted.`,
              }[lang]}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCommission} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {{ ar: "حذف", fr: "Supprimer", en: "Delete" }[lang]}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
