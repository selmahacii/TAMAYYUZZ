import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  Search,
  User,
  Calendar,
  Tag,
  Info,
  ArrowLeft,
  ArrowRight,
  Eye,
  FileCode,
  Globe,
  Monitor
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";

interface AuditEntry {
  id: number;
  action: string;
  entity: string;
  entityId: number | null;
  details: unknown;
  userId: number | null;
  userName: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  UPDATE: "bg-blue-50 text-blue-700 border-blue-200",
  DELETE: "bg-rose-50 text-rose-700 border-rose-200",
  APPROVE: "bg-purple-50 text-purple-700 border-purple-200",
  REJECT: "bg-amber-50 text-amber-700 border-amber-200",
  PUBLISH: "bg-teal-50 text-teal-700 border-teal-200",
  UNPUBLISH: "bg-neutral-100 text-neutral-800 border-neutral-300",
  PAY: "bg-amber-50 text-amber-700 border-amber-200",
  RESOLVE: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

function getActionColor(action: string) {
  const prefix = Object.keys(ACTION_COLORS).find((k) => action.startsWith(k));
  return prefix ? ACTION_COLORS[prefix] : "bg-neutral-50 text-neutral-700 border-neutral-200";
}

export default function AdminAuditLogPage() {
  const { lang } = useI18n();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditEntry | null>(null);
  const [page, setPage] = useState(0);
  const PER_PAGE = 50;

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const token = localStorage.getItem("auth_token");

  const fetchLogs = async (offset = 0) => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/admin/audit-logs?limit=${PER_PAGE}&offset=${offset}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      setLogs(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page * PER_PAGE);
  }, [page]);

  const uniqueActions = ["all", ...new Set(logs.map((l) => l.action.split("_")[0]))];
  const uniqueEntities = ["all", ...new Set(logs.map((l) => l.entity))];

  const filtered = logs.filter((l) => {
    const matchesSearch =
      !search ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.entity.toLowerCase().includes(search.toLowerCase()) ||
      l.userName.toLowerCase().includes(search.toLowerCase());

    const matchesAction = actionFilter === "all" || l.action.startsWith(actionFilter);
    const matchesEntity = entityFilter === "all" || l.entity === entityFilter;

    return matchesSearch && matchesAction && matchesEntity;
  });

  const getInitials = (n: string) =>
    n.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();

  return (
    <AdminLayout
      title={{ ar: "سجل المراجعة", fr: "Journal d'audit", en: "Audit Log" }[lang]}
      subtitle={{ ar: "سجل كامل لجميع الإجراءات على المنصة", fr: "Traçabilité complète de toutes les actions", en: "Full traceability of all platform actions" }[lang]}
    >
      {/* Filters Bar */}
      <div className="bg-white border border-border p-4 rounded-xl shadow-2xs mb-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={{ ar: "البحث في السجل...", fr: "Filtrer les actions...", en: "Filter actions..." }[lang]}
              className="pl-9 bg-white border-border text-foreground text-xs"
            />
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">Action:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-black text-xs capitalize"
            >
              {uniqueActions.map((act) => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>

          {/* Entity Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">Entity:</span>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-black text-xs capitalize"
            >
              {uniqueEntities.map((ent) => (
                <option key={ent} value={ent}>{ent}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold pt-1 border-t">
          <span>{filtered.length} / {logs.length} {{ ar: "إجراء معروض", fr: "actions affichées", en: "actions shown" }[lang]}</span>
          <span>Page {page + 1}</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-white border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white border border-border rounded-xl shadow-2xs">
          <ClipboardList className="w-12 h-12 text-muted-foreground/35 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm font-semibold">{{ ar: "لا توجد إجراءات مطابقة", fr: "Aucune action correspondante", en: "No matching actions recorded" }[lang]}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-muted-foreground font-bold">
                    <th className="p-4">{{ ar: "الإجراء", fr: "Action", en: "Action" }[lang]}</th>
                    <th className="p-4">{{ ar: "الكيان", fr: "Entité", en: "Entity" }[lang]}</th>
                    <th className="p-4">{{ ar: "المستخدم", fr: "Utilisateur", en: "User" }[lang]}</th>
                    <th className="p-4">{{ ar: "التاريخ", fr: "Date", en: "Date" }[lang]}</th>
                    <th className="p-4 text-right">{{ ar: "تفاصيل", fr: "Détails", en: "Details" }[lang]}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4">
                        <Badge variant="outline" className={`font-mono text-[9px] uppercase ${getActionColor(log.action)}`}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="p-4 font-semibold text-muted-foreground">
                        {log.entity}
                        {log.entityId && <span className="text-[10px] text-muted-foreground/45 ml-1">#{log.entityId}</span>}
                      </td>
                      <td className="p-4 font-bold">{log.userName}</td>
                      <td className="p-4 text-muted-foreground font-semibold">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          className="h-8 gap-1.5 text-xs font-bold border-border text-foreground hover:bg-muted"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {{ ar: "عرض", fr: "Inspecter", en: "Inspect" }[lang]}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center bg-white border border-border rounded-xl p-4 shadow-2xs">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="gap-1 border-border text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Précédent
            </Button>
            <span className="text-xs font-bold text-muted-foreground">Page {page + 1}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={logs.length < PER_PAGE}
              className="gap-1 border-border text-foreground"
            >
              Suivant
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Audit Log Inspect Dialog Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => { if (!open) setSelectedLog(null); }}>
        <DialogContent className="max-w-xl bg-white border border-border p-6 text-foreground">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-foreground font-black flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              {{ ar: "تفاصيل سجل التدقيق", fr: "Inspecter le log d'audit", en: "Inspect Audit Log" }[lang]}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Log ID: #{selectedLog?.id} · Action tracée sur la plateforme
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 mt-2 text-xs">
              
              {/* Row 1: Who & When */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-neutral-50 rounded-lg border">
                  <span className="text-[9px] text-muted-foreground block uppercase font-bold">{{ ar: "المستخدم المبادر", fr: "Auteur de l'action", en: "Triggered By" }[lang]}</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-[9px]">
                      {getInitials(selectedLog.userName)}
                    </div>
                    <span className="font-bold text-foreground">{selectedLog.userName}</span>
                  </div>
                </div>

                <div className="p-3 bg-neutral-50 rounded-lg border">
                  <span className="text-[9px] text-muted-foreground block uppercase font-bold">{{ ar: "التوقيت", fr: "Date & Heure", en: "Timestamp" }[lang]}</span>
                  <div className="flex items-center gap-2 mt-2 text-foreground font-bold">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{new Date(selectedLog.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Action details */}
              <div className="p-3 bg-neutral-50 rounded-lg border space-y-2">
                <span className="text-[9px] text-muted-foreground block uppercase font-bold">{{ ar: "تفاصيل العملية", fr: "Caractéristiques", en: "Attributes" }[lang]}</span>
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <span className="text-muted-foreground block text-[9px] font-bold">ACTION</span>
                    <Badge variant="outline" className={`font-mono text-[9px] mt-1 ${getActionColor(selectedLog.action)}`}>
                      {selectedLog.action}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px] font-bold">ENTITY</span>
                    <span className="text-foreground font-bold text-xs mt-1 block">{selectedLog.entity}</span>
                  </div>
                  {selectedLog.entityId && (
                    <div>
                      <span className="text-muted-foreground block text-[9px] font-bold">ENTITY ID</span>
                      <span className="text-foreground font-mono font-bold text-xs mt-1 block">#{selectedLog.entityId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Client info IP & User Agent */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-neutral-50 rounded-lg border">
                  <span className="text-[9px] text-muted-foreground block uppercase font-bold flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                    IP Address
                  </span>
                  <span className="font-mono font-bold text-foreground text-xs block mt-1.5">{selectedLog.ipAddress ?? "127.0.0.1"}</span>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg border">
                  <span className="text-[9px] text-muted-foreground block uppercase font-bold flex items-center gap-1">
                    <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                    User Agent
                  </span>
                  <span className="text-muted-foreground font-semibold text-[10px] block mt-1.5 truncate" title={selectedLog.userAgent ?? "N/A"}>
                    {selectedLog.userAgent ?? "System Process"}
                  </span>
                </div>
              </div>

              {/* Row 4: JSON metadata payload codeblock */}
              <div className="space-y-1.5">
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block flex items-center gap-1">
                  <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
                  {{ ar: "البيانات الوصفية", fr: "Métadonnées de l'action (JSON)", en: "Action Metadata (JSON)" }[lang]}
                </label>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 overflow-x-auto max-h-40 font-mono text-[9px] text-emerald-500 leading-normal whitespace-pre">
                  {selectedLog.details ? JSON.stringify(selectedLog.details, null, 2) : "{\n  \"message\": \"No detailed payload recorded\"\n}"}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button type="button" onClick={() => setSelectedLog(null)} className="bg-black hover:bg-black/90 text-white font-bold">
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
