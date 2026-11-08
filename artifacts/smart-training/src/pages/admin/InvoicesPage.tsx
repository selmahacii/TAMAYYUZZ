import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Search,
  Eye,
  Calendar,
  Mail,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Edit2,
  DollarSign,
  Plus,
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

interface Invoice {
  id: number;
  invoiceNumber: string;
  userId: number;
  userName: string;
  userEmail: string;
  amount: string;
  currency: string;
  status: "draft" | "issued" | "paid" | "cancelled";
  issuedAt: string;
  dueAt: string | null;
  paidAt: string | null;
  notes: string | null;
}

interface AppUser {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
}

export default function AdminInvoicesPage() {
  const { lang } = useI18n();
  const { toast } = useToast();
  
  // List states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Dialog visibility states
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Edit form states
  const [editStatus, setEditStatus] = useState<Invoice["status"]>("issued");
  const [editNotes, setEditNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  // Creation form states
  const [newAmount, setNewAmount] = useState("");
  const [newStatus, setNewStatus] = useState<Invoice["status"]>("issued");
  const [newInvoiceNumber, setNewInvoiceNumber] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [creating, setCreating] = useState(false);

  // Searchable combobox states for User selection
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const token = localStorage.getItem("auth_token");

  const fetchInvoices = () => {
    fetch(`${BASE}/api/admin/invoices`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setInvoices(d);
      })
      .finally(() => setLoading(false));
  };

  const fetchUsers = () => {
    fetch(`${BASE}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setUsers(d);
      })
      .catch((err) => console.error("Error fetching users for manual invoice", err));
  };

  useEffect(() => {
    fetchInvoices();
    fetchUsers();

    // Close dropdown on outside click
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const generateRandomInvoiceNumber = () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    setNewInvoiceNumber(`INV-${Date.now().toString().slice(-6)}-${rand}`);
  };

  const handleOpenAdd = () => {
    generateRandomInvoiceNumber();
    setSelectedUser(null);
    setUserSearchQuery("");
    setNewAmount("");
    setNewStatus("issued");
    setNewNotes("");
    setIsAddOpen(true);
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newAmount) {
      toast({
        title: "Erreur",
        description: { ar: "يرجى تحديد المستخدم والمبلغ", fr: "L'utilisateur et le montant sont requis", en: "User and amount are required" }[lang],
        variant: "destructive"
      });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${BASE}/api/admin/invoices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount: parseFloat(newAmount),
          invoiceNumber: newInvoiceNumber,
          status: newStatus,
          notes: newNotes || null
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create invoice");
      }
      const data = await res.json();
      toast({
        title: {
          ar: "تم إنشاء الفاتورة بنجاح",
          fr: "Facture créée avec succès",
          en: "Invoice created successfully"
        }[lang]
      });
      setInvoices((prev) => [data, ...prev]);
      setIsAddOpen(false);
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const filteredInvoices = search
    ? invoices.filter(
        (inv) =>
          (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(search.toLowerCase())) ||
          (inv.userName && inv.userName.toLowerCase().includes(search.toLowerCase())) ||
          (inv.userEmail && inv.userEmail.toLowerCase().includes(search.toLowerCase()))
      )
    : invoices;

  // Filtered users for manual selection combobox
  const filteredUsers = userSearchQuery
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
      )
    : users;

  const statusLabels = {
    issued: { ar: "صادرة", fr: "Émise", en: "Issued" },
    paid: { ar: "مدفوعة", fr: "Payée", en: "Paid" },
    cancelled: { ar: "ملغاة", fr: "Annulée", en: "Cancelled" },
    draft: { ar: "مسودة", fr: "Brouillon", en: "Draft" }
  };

  const handleOpenDetails = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setEditStatus(inv.status);
    setEditNotes(inv.notes ?? "");
  };

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setUpdating(true);
    try {
      const res = await fetch(`${BASE}/api/admin/invoices/${selectedInvoice.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: editStatus,
          notes: editNotes
        })
      });
      if (!res.ok) throw new Error("Failed to update invoice");
      const data = await res.json();
      toast({
        title: {
          ar: "تم تحديث الفاتورة بنجاح",
          fr: "Facture mise à jour avec succès",
          en: "Invoice updated successfully"
        }[lang]
      });
      setInvoices((prev) => prev.map((item) => (item.id === data.id ? data : item)));
      setSelectedInvoice(null);
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const getInitials = (n: string) =>
    n.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();

  return (
    <AdminLayout
      title={{ ar: "الفواتير", fr: "Factures", en: "Invoices" }[lang]}
      subtitle={{ ar: "إدارة فواتير منصة التدريب الذكي", fr: "Gestion des factures de la plateforme", en: "Manage platform invoices" }[lang]}
    >
      {/* Top Filter and Add Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={{ ar: "بحث بالاسم، البريد أو رقم الفاتورة...", fr: "Rechercher par nom, email ou facture...", en: "Search by user, email or invoice..." }[lang]}
            className="pl-9 bg-white border-border text-foreground"
          />
        </div>

        <Dialog open={isAddOpen} onOpenChange={(open) => { if (!open) setIsAddOpen(false); }}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenAdd} className="flex items-center gap-2 bg-black hover:bg-black/90 text-white font-bold self-stretch sm:self-auto shadow-sm">
              <Plus className="w-4 h-4" />
              {{ ar: "إنشاء فاتورة", fr: "Créer une facture", en: "Create Invoice" }[lang]}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-white border border-border p-6 text-foreground">
            <DialogHeader>
              <DialogTitle className="text-foreground font-black">
                {{ ar: "إنشاء فاتورة جديدة", fr: "Créer une nouvelle facture", en: "Create New Invoice" }[lang]}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {{ ar: "إصدار فاتورة يدوية لمستخدم محدد مع التحقق الدقيق من الحساب", fr: "Émettre une facture manuelle avec prévisualisation et ciblage de compte", en: "Manually issue an invoice with user lookup and profile preview" }[lang]}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateInvoice} className="space-y-4 mt-2 text-xs">
              
              {/* Micro-detailed Searchable User Selection Combobox */}
              <div className="space-y-1.5 relative" ref={dropdownRef}>
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                  {{ ar: "البحث عن المستخدم وتحديده", fr: "Recherche et Sélection de l'utilisateur", en: "Search & Select User" }[lang]}
                </label>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={{ ar: "اكتب الاسم أو البريد الإلكتروني للبحث...", fr: "Tapez le nom ou l'e-mail pour rechercher...", en: "Type name or email to search..." }[lang]}
                    value={userSearchQuery}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      setShowUserDropdown(true);
                    }}
                    onFocus={() => setShowUserDropdown(true)}
                    className="pl-9 bg-white border-border text-foreground text-xs"
                  />
                </div>

                {/* Dropdown list of matching users */}
                {showUserDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto divide-y divide-border">
                    {filteredUsers.length === 0 ? (
                      <div className="p-3 text-center text-muted-foreground text-[10px]">
                        {{ ar: "لا يوجد مستخدمين بهذا الاسم", fr: "Aucun utilisateur trouvé", en: "No users found" }[lang]}
                      </div>
                    ) : (
                      filteredUsers.slice(0, 10).map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setSelectedUser(u);
                            setUserSearchQuery("");
                            setShowUserDropdown(false);
                          }}
                          className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-muted/40 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-neutral-900">
                            {getInitials(u.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-foreground truncate">{u.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{u.email}</div>
                          </div>
                          <Badge
                            variant={
                              u.role === "student"
                                ? "success"
                                : u.role === "coach"
                                ? "purple"
                                : "secondary"
                            }
                            className="text-[9px] px-1 py-0 capitalize"
                          >
                            {u.role}
                          </Badge>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* User selection preview card */}
                {selectedUser ? (
                  <div className="flex items-center gap-3 p-3 bg-muted/40 border border-border rounded-lg mt-2">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 bg-emerald-600">
                      {getInitials(selectedUser.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        {{ ar: "المستخدم المحدد", fr: "Compte sélectionné", en: "Selected account" }[lang]}
                      </div>
                      <p className="font-bold text-foreground mt-0.5">{selectedUser.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{selectedUser.email}</p>
                    </div>
                    <Badge variant={selectedUser.role === "student" ? "success" : "purple"} className="text-[9px] uppercase">
                      {selectedUser.role}
                    </Badge>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-amber-50/50 border border-amber-100 rounded-lg text-amber-800 mt-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <p className="text-[10px] font-semibold leading-relaxed">
                      {{ ar: "يرجى البحث واختيار حساب المستخدم لإرفاقه بهذه الفاتورة.", fr: "Veuillez rechercher et sélectionner un compte utilisateur à attacher à cette facture.", en: "Please search and select a user account to attach to this invoice." }[lang]}
                    </p>
                  </div>
                )}
              </div>

              {/* Invoice Number */}
              <div className="space-y-1">
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                  {{ ar: "رقم الفاتورة", fr: "Numéro de facture", en: "Invoice number" }[lang]}
                </label>
                <div className="flex gap-2">
                  <Input
                    value={newInvoiceNumber}
                    onChange={(e) => setNewInvoiceNumber(e.target.value)}
                    required
                    className="bg-white border-border text-foreground flex-1 font-mono font-bold"
                  />
                  <Button type="button" variant="outline" onClick={generateRandomInvoiceNumber} className="border-border text-foreground">
                    {{ ar: "توليد", fr: "Générer", en: "Regen" }[lang]}
                  </Button>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                  {{ ar: "المبلغ بالدينار", fr: "Montant (DZD)", en: "Amount (DZD)" }[lang]}
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  required
                  className="bg-white border-border text-foreground font-bold"
                />
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                  {{ ar: "حالة الفاتورة المبدئية", fr: "Statut initial", en: "Initial Status" }[lang]}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["draft", "issued", "paid", "cancelled"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewStatus(st)}
                      className={`py-2 px-1 text-center font-bold border rounded-lg transition-all ${
                        newStatus === st
                          ? st === "paid"
                            ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                            : st === "cancelled"
                            ? "bg-rose-50 border-rose-500 text-rose-700"
                            : st === "issued"
                            ? "bg-sky-50 border-sky-500 text-sky-700"
                            : "bg-neutral-100 border-neutral-600 text-neutral-800"
                          : "bg-white border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {statusLabels[st]?.[lang] ?? st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                  {{ ar: "ملاحظات إدارية", fr: "Notes internes", en: "Internal Notes" }[lang]}
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
                  {{ ar: "إنشاء الفاتورة", fr: "Créer", en: "Create" }[lang]}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invoices List Table */}
      {loading ? (
        <div className="space-y-3">
          <div className="h-14 bg-white border border-border rounded-xl animate-pulse" />
          <div className="h-14 bg-white border border-border rounded-xl animate-pulse" />
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs font-bold">
                  <th className="p-4">{{ ar: "رقم الفاتورة", fr: "N° Facture", en: "Invoice #" }[lang]}</th>
                  <th className="p-4">{{ ar: "المستخدم", fr: "Utilisateur", en: "User" }[lang]}</th>
                  <th className="p-4">{{ ar: "المبلغ", fr: "Montant", en: "Amount" }[lang]}</th>
                  <th className="p-4">{{ ar: "الحالة", fr: "Statut", en: "Status" }[lang]}</th>
                  <th className="p-4">{{ ar: "التاريخ", fr: "Date", en: "Date" }[lang]}</th>
                  <th className="p-4 text-right">{{ ar: "إجراءات", fr: "Actions", en: "Actions" }[lang]}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs text-foreground">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground font-medium">
                      <FileText className="w-10 h-10 mx-auto mb-2 text-muted-foreground/35" />
                      {{ ar: "لا توجد فواتير مطابقة", fr: "Aucune facture trouvée", en: "No invoices found" }[lang]}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-mono font-bold text-foreground">{inv.invoiceNumber}</td>
                      <td className="p-4">
                        <div className="font-bold text-foreground">{inv.userName}</div>
                        <div className="text-muted-foreground text-[10px]">{inv.userEmail}</div>
                      </td>
                      <td className="p-4 font-bold text-foreground">
                        {parseFloat(inv.amount).toLocaleString("fr-DZ")} {inv.currency}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            inv.status === "paid"
                              ? "success"
                              : inv.status === "issued"
                              ? "info"
                              : inv.status === "cancelled"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {statusLabels[inv.status]?.[lang] ?? inv.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">{new Date(inv.issuedAt).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetails(inv)}
                          className="h-8 gap-1.5 text-xs font-bold border-border text-foreground hover:bg-muted"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          {{ ar: "تعديل وإدارة", fr: "Gérer", en: "Manage" }[lang]}
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

      {/* Invoice Update Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => { if (!open) setSelectedInvoice(null); }}>
        <DialogContent className="max-w-md bg-white border border-border p-6 text-foreground">
          <DialogHeader className="border-b border-border pb-4 mb-4">
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-foreground">
              <FileText className="w-5 h-5" />
              {{ ar: "تعديل وإدارة الفاتورة", fr: "Gérer la facture", en: "Manage Invoice" }[lang]}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedInvoice?.invoiceNumber} · {{ ar: "تعديل حالة الدفع والملاحظات الداخلية", fr: "Modifier le statut de paiement et notes internes", en: "Modify payment status and internal notes" }[lang]}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <form onSubmit={handleUpdateInvoice} className="space-y-4 text-xs">
              {/* Summary details */}
              <div className="grid grid-cols-2 gap-4 bg-muted/40 p-3 rounded-lg border border-border">
                <div>
                  <span className="text-[10px] text-muted-foreground block">{{ ar: "الطالبة", fr: "Client", en: "Client" }[lang]}</span>
                  <span className="font-bold text-foreground text-xs">{selectedInvoice.userName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">{{ ar: "المبلغ الإجمالي", fr: "Montant total", en: "Total amount" }[lang]}</span>
                  <span className="font-black text-emerald-700 text-xs">
                    {parseFloat(selectedInvoice.amount).toLocaleString("fr-DZ")} {selectedInvoice.currency}
                  </span>
                </div>
              </div>

              {/* Status Select */}
              <div className="space-y-1.5">
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                  {{ ar: "حالة الفاتورة", fr: "Statut de la facture", en: "Invoice Status" }[lang]}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["draft", "issued", "paid", "cancelled"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditStatus(st)}
                      className={`py-2 px-1 text-center font-bold border rounded-lg transition-all ${
                        editStatus === st
                          ? st === "paid"
                            ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                            : st === "cancelled"
                            ? "bg-rose-50 border-rose-500 text-rose-700"
                            : st === "issued"
                            ? "bg-sky-50 border-sky-500 text-sky-700"
                            : "bg-neutral-100 border-neutral-600 text-neutral-800"
                          : "bg-white border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {statusLabels[st]?.[lang] ?? st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Internal Notes textarea */}
              <div className="space-y-1.5">
                <label htmlFor="notes" className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                  {{ ar: "ملاحظات داخلية / إدارية", fr: "Notes administratives", en: "Administrative Notes" }[lang]}
                </label>
                <Textarea
                  id="notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder={{ ar: "ملاحظات إضافية حول الدفع أو حالة المعاملة...", fr: "Ajouter des détails sur le paiement, retard, etc...", en: "Add internal payment details..." }[lang]}
                  className="bg-white border-border text-foreground text-xs min-h-[80px]"
                />
              </div>

              {/* Dates info */}
              <div className="border-t border-border pt-3 mt-1 space-y-1 text-muted-foreground text-[10px]">
                <div className="flex justify-between">
                  <span>{{ ar: "تاريخ الإصدار:", fr: "Émise le :", en: "Issued on:" }[lang]}</span>
                  <span className="font-mono">{new Date(selectedInvoice.issuedAt).toLocaleString()}</span>
                </div>
                {selectedInvoice.paidAt && (
                  <div className="flex justify-between">
                    <span>{{ ar: "تاريخ الدفع الفعلي:", fr: "Payée le :", en: "Paid on:" }[lang]}</span>
                    <span className="font-mono text-emerald-700 font-semibold">{new Date(selectedInvoice.paidAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setSelectedInvoice(null)} className="border-border text-foreground text-xs">
                  {{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}
                </Button>
                <Button type="submit" disabled={updating} className="font-bold text-xs bg-black hover:bg-black/90 text-white">
                  {updating && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  {{ ar: "حفظ التغييرات", fr: "Enregistrer", en: "Save Changes" }[lang]}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
