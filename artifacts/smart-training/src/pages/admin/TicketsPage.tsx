import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LifeBuoy, Search, Clock, AlertTriangle, CheckCircle2, XCircle,
  User, Tag, ChevronDown, ChevronUp, Scale, MessageSquare, ShieldAlert,
  Loader2, Check
} from "lucide-react";

interface TicketItem {
  id: number;
  userId: number;
  userName: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

const statusConfig: Record<string, { label: Record<string, string>; color: string; icon: React.ReactNode }> = {
  open: { label: { ar: "مفتوح", fr: "Ouvert", en: "Open" }, color: "bg-blue-50 text-blue-800 border-blue-200/80", icon: <Clock className="w-3.5 h-3.5 text-blue-700" /> },
  in_progress: { label: { ar: "قيد المراجعة والتحقيق", fr: "En cours d'instruction", en: "In Progress" }, color: "bg-amber-50 text-amber-800 border-amber-200/80", icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> },
  resolved: { label: { ar: "محلول ومغلق", fr: "Litige Résolu", en: "Resolved" }, color: "bg-emerald-50 text-emerald-800 border-emerald-200/80", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> },
  closed: { label: { ar: "مغلق نهائيًا", fr: "Dossier Clôturé", en: "Closed" }, color: "bg-neutral-100 text-neutral-700 border-neutral-200", icon: <XCircle className="w-3.5 h-3.5 text-neutral-500" /> },
};

const priorityConfig: Record<string, { label: Record<string, string>; color: string }> = {
  low: { label: { ar: "عادي", fr: "Priorité Standard", en: "Standard" }, color: "bg-neutral-50 text-neutral-700 border-neutral-200" },
  medium: { label: { ar: "متوسط", fr: "Priorité Moyenne", en: "Medium" }, color: "bg-blue-50 text-blue-700 border-blue-200" },
  high: { label: { ar: "مرتفع", fr: "Priorité Élevée", en: "High" }, color: "bg-amber-50 text-amber-800 border-amber-200" },
  urgent: { label: { ar: "طارئ جدا", fr: "Litige Urgent", en: "Urgent" }, color: "bg-red-50 text-red-800 border-red-200 font-bold" },
};

export default function AdminTicketsPage() {
  const { lang } = useI18n();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const getHeaders = () => {
    const token = localStorage.getItem("auth_token") || localStorage.getItem("tamayuz_token") || localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/admin/tickets`, { headers: getHeaders() });
      const data = await r.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const updateTicket = async (id: number, body: Record<string, unknown>) => {
    setSaving(id);
    try {
      const r = await fetch(`${BASE}/api/admin/tickets/${id}`, { method: "PATCH", headers: getHeaders(), body: JSON.stringify(body) });
      if (r.ok) {
        toast({
          title: {
            ar: "تم تسجيل قرار حل التذكرة / النزاع",
            fr: "Décision enregistrée et dossier mis à jour",
            en: "Decision recorded and ticket updated"
          }[lang]
        });
        await fetchTickets();
        setExpandedId(null);
      } else {
        toast({ title: "Erreur lors de la mise à jour", variant: "destructive" });
      }
    } finally {
      setSaving(null);
    }
  };

  const toggleExpand = (id: number) => setExpandedId((cur) => (cur === id ? null : id));
  const ticketList = Array.isArray(tickets) ? tickets : [];

  const isDispute = (tk: TicketItem) => {
    const s = (tk.subject + " " + tk.description + " " + tk.category).toLowerCase();
    return s.includes("litig") || s.includes("rembours") || s.includes("contest") || s.includes("paiement") || s.includes("bloqu") || tk.priority === "urgent";
  };

  const filtered = useMemo(() => {
    return ticketList.filter((tk) => {
      const matchSearch =
        !search ||
        (tk.subject && tk.subject.toLowerCase().includes(search.toLowerCase())) ||
        (tk.userName && tk.userName.toLowerCase().includes(search.toLowerCase())) ||
        (tk.description && tk.description.toLowerCase().includes(search.toLowerCase()));

      let matchTab = true;
      if (activeTab === "disputes") matchTab = isDispute(tk);
      else if (activeTab === "open") matchTab = tk.status === "open";
      else if (activeTab === "in_progress") matchTab = tk.status === "in_progress";
      else if (activeTab === "resolved") matchTab = tk.status === "resolved";

      return matchSearch && matchTab;
    });
  }, [ticketList, search, activeTab]);

  const counts = {
    all: ticketList.length,
    disputes: ticketList.filter(isDispute).length,
    open: ticketList.filter(t => t.status === "open").length,
    in_progress: ticketList.filter(t => t.status === "in_progress").length,
    resolved: ticketList.filter(t => t.status === "resolved").length
  };

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(lang === "ar" ? "ar-DZ" : "fr-DZ", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

  return (
    <AdminLayout
      title={{ ar: "إدارة التذاكر والمنازعات", fr: "Support Client & Gestion des Litiges", en: "Customer Support & Disputes" }[lang]}
      subtitle={{ ar: "متابعة الشكاوى والتحكيم في طلبات الاسترجاع والدعم الفني", fr: "Médiation des réclamations, demandes de remboursement et assistance aux usagers", en: "Claim mediation, refund request arbitrations and user support" }[lang]}
    >
      {/* Search and Navigation Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 justify-between items-start sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={{ ar: "بحث في التذاكر والنزاعات...", fr: "Rechercher par objet, usager...", en: "Search tickets and claims..." }[lang]}
            className="pl-9 bg-white border-border text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: "all", label: { ar: "جميع الطلبات", fr: "Tous les dossiers", en: "All" }[lang], count: counts.all },
            { id: "disputes", label: { ar: "النزاعات والاسترجاع", fr: "Litiges & Réclamations", en: "Disputes" }[lang], count: counts.disputes, isDisputeTab: true },
            { id: "open", label: { ar: "قيد الانتظار", fr: "En attente", en: "Open" }[lang], count: counts.open },
            { id: "in_progress", label: { ar: "قيد المعالجة", fr: "En instruction", en: "In Progress" }[lang], count: counts.in_progress },
            { id: "resolved", label: { ar: "تم الحل", fr: "Résolus", en: "Resolved" }[lang], count: counts.resolved },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                activeTab === tab.id
                  ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                  : tab.isDisputeTab && tab.count > 0
                  ? "bg-red-50 text-red-800 border-red-200/80 hover:bg-red-100/50"
                  : "bg-white text-muted-foreground border-border hover:bg-neutral-50"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeTab === tab.id ? "bg-neutral-800 text-neutral-300" : "bg-neutral-100 text-neutral-600"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Ticket / Dispute List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-white border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white border border-border rounded-xl">
          <LifeBuoy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm font-medium">
            {{ ar: "لا توجد تذاكر أو نزاعات مسجلة", fr: "Aucun dossier de support ou litige en cours", en: "No open tickets or disputes" }[lang]}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tk) => {
            const sc = statusConfig[tk.status] ?? statusConfig.open;
            const pc = priorityConfig[tk.priority] ?? priorityConfig.medium;
            const isExpanded = expandedId === tk.id;
            const draft = resolutionDrafts[tk.id] ?? tk.resolution ?? "";
            const isClaim = isDispute(tk);

            return (
              <div
                key={tk.id}
                className={`bg-white border rounded-xl overflow-hidden shadow-2xs transition-all ${
                  isClaim ? "border-amber-300/80" : "border-border hover:border-neutral-300"
                }`}
              >
                <div
                  className="flex items-start gap-4 p-4 cursor-pointer select-none"
                  onClick={() => toggleExpand(tk.id)}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${isClaim ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-neutral-100 border-neutral-200 text-neutral-800"}`}>
                    {isClaim ? <Scale className="w-5 h-5" /> : <LifeBuoy className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground text-sm tracking-tight">{tk.subject}</span>
                      <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${sc.color}`}>
                        {sc.icon}
                        {sc.label[lang]}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${pc.color}`}>
                        {pc.label[lang]}
                      </span>
                      {isClaim && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100/70 text-amber-900 border border-amber-300 px-2 py-0.2 rounded">
                          Litige Actif
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1 text-neutral-700 font-medium">
                        <User className="w-3.5 h-3.5 text-neutral-400" />
                        {tk.userName}
                      </span>
                      <span className="font-mono text-[11px] bg-neutral-100 px-1.5 py-0.2 rounded border border-neutral-200/60 text-neutral-600">
                        Catégorie : {tk.category}
                      </span>
                      <span className="font-mono text-[11px]">Dossier #{tk.id} · {formatDateTime(tk.createdAt)}</span>
                      {tk.resolvedAt && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Résolu le {formatDateTime(tk.resolvedAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-muted-foreground mt-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-border pt-4 space-y-4 bg-neutral-50/50">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        Exposé de la demande / litige :
                      </span>
                      <div className="rounded-xl p-3.5 text-xs text-neutral-800 whitespace-pre-wrap bg-white border border-border leading-relaxed">
                        {tk.description}
                      </div>
                    </div>

                    {tk.resolution && (
                      <div className="rounded-xl p-3.5 bg-emerald-50 border border-emerald-200/80 text-xs">
                        <div className="font-bold text-emerald-900 flex items-center gap-1.5 mb-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          Décision & Résolution formelle enregistrée :
                        </div>
                        <p className="text-emerald-800 leading-relaxed">{tk.resolution}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-xs font-bold text-neutral-800 mb-1 block">Statut du dossier</label>
                        <select
                          value={tk.status}
                          onChange={(e) => updateTicket(tk.id, { status: e.target.value })}
                          disabled={saving === tk.id}
                          className="w-full px-3 py-2 rounded-lg text-xs font-medium text-foreground bg-white border border-border outline-none"
                        >
                          {["open", "in_progress", "resolved", "closed"].map((s) => (
                            <option key={s} value={s}>{statusConfig[s]?.label[lang] ?? s}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-neutral-800 mb-1 block">Niveau de priorité</label>
                        <select
                          value={tk.priority}
                          onChange={(e) => updateTicket(tk.id, { priority: e.target.value })}
                          disabled={saving === tk.id}
                          className="w-full px-3 py-2 rounded-lg text-xs font-medium text-foreground bg-white border border-border outline-none"
                        >
                          {["low", "medium", "high", "urgent"].map((p) => (
                            <option key={p} value={p}>{priorityConfig[p]?.label[lang] ?? p}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-800 block">
                        Résolution officielle ou réponse transmise à l'usager :
                      </label>
                      <textarea
                        value={draft}
                        onChange={(e) => setResolutionDrafts((d) => ({ ...d, [tk.id]: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-white border border-border resize-none outline-none focus:ring-1 focus:ring-neutral-900"
                        placeholder="Rédigez la décision administrative (ex: remboursement accordé, réactivation de cours, rejet motivé)..."
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-1">
                      <Button
                        onClick={() => updateTicket(tk.id, { resolution: draft, status: "resolved" })}
                        disabled={saving === tk.id || !draft.trim()}
                        size="sm"
                        className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs"
                      >
                        {saving === tk.id && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                        <Check className="w-3.5 h-3.5 mr-1" />
                        {{ ar: "حل وإغلاق النزاع", fr: "Résoudre et clôturer le litige", en: "Resolve & Close" }[lang]}
                      </Button>
                      <Button
                        onClick={() => updateTicket(tk.id, { resolution: draft })}
                        disabled={saving === tk.id}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        {{ ar: "حفظ المسودة", fr: "Enregistrer la note", en: "Save Note" }[lang]}
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
