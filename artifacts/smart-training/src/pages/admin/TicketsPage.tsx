import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ticket, Search, Clock, AlertCircle, CheckCircle, XCircle, User, Tag, ChevronDown, ChevronUp, Zap } from "lucide-react";

interface TicketItem {
  id: number; userId: number; userName: string; subject: string; description: string;
  status: string; priority: string; category: string; resolution: string | null;
  createdAt: string; updatedAt: string; resolvedAt: string | null;
}

const statusConfig: Record<string, { label: Record<string, string>; color: string; icon: React.ReactNode }> = {
  open: { label: { ar: "مفتوح", fr: "Ouvert", en: "Open" }, color: "bg-blue-50 text-blue-600 border border-blue-200", icon: <Clock className="w-3 h-3" /> },
  in_progress: { label: { ar: "قيد المعالجة", fr: "En cours", en: "In Progress" }, color: "bg-amber-50 text-amber-600 border border-amber-200", icon: <AlertCircle className="w-3 h-3" /> },
  resolved: { label: { ar: "محلول", fr: "Résolu", en: "Resolved" }, color: "bg-emerald-50 text-emerald-600 border border-emerald-200", icon: <CheckCircle className="w-3 h-3" /> },
  closed: { label: { ar: "مغلق", fr: "Fermé", en: "Closed" }, color: "bg-muted text-muted-foreground border border-border", icon: <XCircle className="w-3 h-3" /> },
};

const priorityConfig: Record<string, { label: Record<string, string>; color: string }> = {
  low: { label: { ar: "منخفض", fr: "Faible", en: "Low" }, color: "text-muted-foreground" },
  medium: { label: { ar: "متوسط", fr: "Moyen", en: "Medium" }, color: "text-blue-600" },
  high: { label: { ar: "عالي", fr: "Élevé", en: "High" }, color: "text-amber-600" },
  urgent: { label: { ar: "عاجل", fr: "Urgent", en: "Urgent" }, color: "text-red-600 font-bold" },
};

export default function AdminTicketsPage() {
  const { lang } = useI18n();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const token = localStorage.getItem("auth_token");
  const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/admin/tickets`, { headers });
      setTickets(await r.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchTickets(); }, []);

  const updateTicket = async (id: number, body: Record<string, unknown>) => {
    setSaving(id);
    try {
      const r = await fetch(`${BASE}/api/admin/tickets/${id}`, { method: "PATCH", headers, body: JSON.stringify(body) });
      if (r.ok) {
        toast({ title: { ar: "تم تحديث التذكرة", fr: "Ticket mis à jour", en: "Ticket updated" }[lang] });
        await fetchTickets();
        setExpandedId(null);
      } else {
        toast({ title: "Erreur", variant: "destructive" });
      }
    } finally {
      setSaving(null);
    }
  };

  const toggleExpand = (id: number) => setExpandedId((cur) => (cur === id ? null : id));

  const filtered = useMemo(() => tickets.filter((tk) => {
    const matchSearch = !search || (tk.subject && tk.subject.toLowerCase().includes(search.toLowerCase())) || (tk.userName && tk.userName.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "all" || tk.status === statusFilter;
    return matchSearch && matchStatus;
  }), [tickets, search, statusFilter]);

  const counts = { all: tickets.length, open: tickets.filter(t => t.status === "open").length, in_progress: tickets.filter(t => t.status === "in_progress").length, resolved: tickets.filter(t => t.status === "resolved").length };

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(lang === "ar" ? "ar-DZ" : "fr-DZ", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <AdminLayout
      title={{ ar: "إدارة التذاكر", fr: "Gestion des tickets", en: "Ticket Management" }[lang]}
      subtitle={{ ar: "متابعة وحل طلبات الدعم", fr: "Suivi et résolution des demandes de support", en: "Track and resolve support requests" }[lang]}
    >
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={{ ar: "بحث...", fr: "Rechercher...", en: "Search..." }[lang]} className="pl-9" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { key: "all", label: { ar: "الكل", fr: "Tous", en: "All" }[lang], count: counts.all },
            { key: "open", label: { ar: "مفتوح", fr: "Ouverts", en: "Open" }[lang], count: counts.open },
            { key: "in_progress", label: { ar: "قيد المعالجة", fr: "En cours", en: "In Progress" }[lang], count: counts.in_progress },
            { key: "resolved", label: { ar: "محلول", fr: "Résolus", en: "Resolved" }[lang], count: counts.resolved },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${statusFilter === tab.key ? "text-white" : "text-foreground/60 hover:text-foreground bg-muted"}`}
              style={statusFilter === tab.key ? { background: "hsl(258,75%,55%)" } : undefined}>
              {tab.label} <span className="opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="bg-muted shadow-2xs rounded-2xl h-20 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Ticket className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{{ ar: "لا توجد تذاكر", fr: "Aucun ticket", en: "No tickets" }[lang]}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tk) => {
            const sc = statusConfig[tk.status] ?? statusConfig.open;
            const pc = priorityConfig[tk.priority] ?? priorityConfig.medium;
            const isExpanded = expandedId === tk.id;
            const draft = resolutionDrafts[tk.id] ?? tk.resolution ?? "";
            return (
              <div key={tk.id} className="bg-white border border-border shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 p-4 cursor-pointer" onClick={() => toggleExpand(tk.id)}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-violet-50 border border-violet-100">
                    <Ticket className="w-4 h-4 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-foreground text-sm">{tk.subject}</span>
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${sc.color}`}>
                        {sc.icon}{sc.label[lang]}
                      </span>
                      <span className={`flex items-center gap-1 text-xs font-semibold ${pc.color}`}><Zap className="w-3 h-3" />{pc.label[lang]}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{tk.userName}</span>
                      <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{tk.category}</span>
                      <span className="flex items-center gap-1" title={{ ar: "أُنشئت", fr: "Créé le", en: "Created" }[lang]}>
                        <Clock className="w-3 h-3" />#{tk.id} · {formatDateTime(tk.createdAt)}
                      </span>
                      {tk.resolvedAt && (
                        <span className="flex items-center gap-1 text-emerald-600" title={{ ar: "تم الحل في", fr: "Résolu le", en: "Resolved at" }[lang]}>
                          <CheckCircle className="w-3 h-3" />{formatDateTime(tk.resolvedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
                    <div className="rounded-xl p-3 text-sm text-foreground/80 whitespace-pre-wrap bg-muted/60">
                      {tk.description}
                    </div>

                    {tk.updatedAt && tk.updatedAt !== tk.createdAt && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {{ ar: "آخر تحديث", fr: "Dernière mise à jour", en: "Last updated" }[lang]}: {formatDateTime(tk.updatedAt)}
                      </p>
                    )}

                    {tk.resolution && (
                      <div className="rounded-xl p-3 bg-emerald-50 border border-emerald-200">
                        <p className="text-xs text-emerald-700 font-semibold mb-1">{{ ar: "الحل", fr: "Résolution", en: "Resolution" }[lang]}</p>
                        <p className="text-sm text-emerald-900/80">{tk.resolution}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      {/* Status */}
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">{{ ar: "الحالة", fr: "Statut", en: "Status" }[lang]}</label>
                        <select value={tk.status}
                          onChange={(e) => updateTicket(tk.id, { status: e.target.value })}
                          disabled={saving === tk.id}
                          className="w-full px-3 py-2 rounded-lg text-sm text-foreground bg-muted border border-border outline-none disabled:opacity-50">
                          {["open", "in_progress", "resolved", "closed"].map((s) => (
                            <option key={s} value={s}>{statusConfig[s]?.label[lang] ?? s}</option>
                          ))}
                        </select>
                      </div>
                      {/* Priority */}
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">{{ ar: "الأولوية", fr: "Priorité", en: "Priority" }[lang]}</label>
                        <select value={tk.priority}
                          onChange={(e) => updateTicket(tk.id, { priority: e.target.value })}
                          disabled={saving === tk.id}
                          className="w-full px-3 py-2 rounded-lg text-sm text-foreground bg-muted border border-border outline-none disabled:opacity-50">
                          {["low", "medium", "high", "urgent"].map((p) => (
                            <option key={p} value={p}>{priorityConfig[p]?.label[lang] ?? p}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{{ ar: "الحل / الرد", fr: "Résolution / Réponse", en: "Resolution / Response" }[lang]}</label>
                      <textarea
                        value={draft}
                        onChange={(e) => setResolutionDrafts((d) => ({ ...d, [tk.id]: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl text-sm text-foreground bg-muted border border-border resize-none outline-none focus-visible:ring-2 focus-visible:ring-black/70"
                        placeholder={{ ar: "اكتب حلاً...", fr: "Écrire une résolution...", en: "Write a resolution..." }[lang]}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => updateTicket(tk.id, { resolution: draft, status: "resolved" })}
                        disabled={saving === tk.id || !draft.trim()}
                        size="sm" className="gap-2 text-xs font-bold" style={{ background: "hsl(160,60%,40%)" }}>
                        <CheckCircle className="w-3.5 h-3.5" />
                        {{ ar: "حل وإغلاق", fr: "Résoudre & fermer", en: "Resolve & Close" }[lang]}
                      </Button>
                      <Button onClick={() => updateTicket(tk.id, { resolution: draft })} disabled={saving === tk.id} size="sm" variant="outline" className="gap-2 text-xs">
                        {{ ar: "حفظ", fr: "Enregistrer", en: "Save" }[lang]}
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
