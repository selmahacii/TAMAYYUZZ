import { useState, useEffect } from "react";
import { StudentLayout } from "@/components/student/StudentLayout";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LifeBuoy, Plus, X, Clock, AlertCircle, CheckCircle, XCircle,
  Tag, ChevronDown, ChevronUp, Zap, Loader2,
} from "lucide-react";

interface TicketItem {
  id: number; subject: string; description: string;
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

const categoryConfig: Record<string, Record<string, string>> = {
  technical: { ar: "مشكلة تقنية", fr: "Problème technique", en: "Technical issue" },
  billing: { ar: "الفوترة والدفع", fr: "Facturation & paiement", en: "Billing & payment" },
  course: { ar: "محتوى الدورة", fr: "Contenu de formation", en: "Course content" },
  account: { ar: "الحساب", fr: "Compte", en: "Account" },
  other: { ar: "أخرى", fr: "Autre", en: "Other" },
};

export default function StudentSupportPage() {
  const { lang } = useI18n();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [priority, setPriority] = useState("medium");

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const token = localStorage.getItem("auth_token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/tickets/my`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : []);
      }
    } catch {
      toast({ title: { ar: "خطأ في الشبكة", fr: "Erreur réseau", en: "Network error" }[lang], variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, []);

  const resetForm = () => {
    setSubject("");
    setDescription("");
    setCategory("other");
    setPriority("medium");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/tickets`, {
        method: "POST",
        headers,
        body: JSON.stringify({ subject: subject.trim(), description: description.trim(), category, priority }),
      });
      if (res.ok) {
        toast({ title: { ar: "تم إرسال التذكرة", fr: "Ticket envoyé", en: "Ticket submitted" }[lang], description: { ar: "سيتواصل معك فريق الدعم قريبًا", fr: "Notre équipe support vous répondra bientôt", en: "Our support team will respond soon" }[lang] });
        resetForm();
        setShowForm(false);
        fetchTickets();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: { ar: "خطأ", fr: "Erreur", en: "Error" }[lang], description: err.error, variant: "destructive" });
      }
    } catch {
      toast({ title: { ar: "خطأ في الشبكة", fr: "Erreur réseau", en: "Network error" }[lang], variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(lang === "ar" ? "ar-DZ" : lang === "en" ? "en-US" : "fr-DZ", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <StudentLayout
      title={{ ar: "الدعم الفني", fr: "Support", en: "Support" }[lang]}
      subtitle={{ ar: "تذاكر الدعم الخاصة بك ومركز المساعدة", fr: "Vos tickets de support et centre d'aide", en: "Your support tickets and help center" }[lang]}
    >
      <div className="flex justify-end mb-6">
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-black hover:bg-black/90 text-white font-bold shadow-sm">
          <Plus className="w-4 h-4" />
          {{ ar: "تذكرة جديدة", fr: "Nouveau ticket", en: "New ticket" }[lang]}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-white border border-border rounded-2xl h-20 animate-pulse" />)}</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-24 bg-white border border-border rounded-2xl">
          <LifeBuoy className="w-14 h-14 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>
            {{ ar: "لا توجد تذاكر بعد", fr: "Aucun ticket pour l'instant", en: "No tickets yet" }[lang]}
          </h3>
          <p className="text-muted-foreground text-sm">
            {{ ar: "لديك سؤال أو مشكلة؟ أرسلي تذكرة وسيتواصل معك فريق الدعم", fr: "Une question ou un problème ? Envoyez un ticket et notre équipe vous répondra", en: "Have a question or issue? Send a ticket and our team will respond" }[lang]}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((tk) => {
            const sc = statusConfig[tk.status] ?? statusConfig.open;
            const pc = priorityConfig[tk.priority] ?? priorityConfig.medium;
            const isExpanded = expandedId === tk.id;
            return (
              <div key={tk.id} className="bg-white border border-border shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                <button
                  type="button"
                  onClick={() => setExpandedId((cur) => (cur === tk.id ? null : tk.id))}
                  className="w-full flex items-start gap-4 p-4 text-left"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-violet-50 border border-violet-100">
                    <LifeBuoy className="w-4 h-4 text-violet-500" />
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
                      <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{categoryConfig[tk.category]?.[lang] ?? tk.category}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />#{tk.id} · {formatDateTime(tk.createdAt)}</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-4 space-y-3">
                    <div className="rounded-xl p-3 text-sm text-foreground/80 whitespace-pre-wrap bg-muted/60">
                      {tk.description}
                    </div>
                    {tk.resolution ? (
                      <div className="rounded-xl p-3 bg-emerald-50 border border-emerald-200">
                        <p className="text-xs text-emerald-700 font-semibold mb-1">{{ ar: "رد فريق الدعم", fr: "Réponse du support", en: "Support response" }[lang]}</p>
                        <p className="text-sm text-emerald-900/80">{tk.resolution}</p>
                        {tk.resolvedAt && (
                          <p className="text-[10px] text-emerald-700/70 mt-1.5">{formatDateTime(tk.resolvedAt)}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        {{ ar: "بانتظار رد فريق الدعم...", fr: "En attente d'une réponse du support...", en: "Waiting for a support response..." }[lang]}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New ticket modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white border border-border rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-black text-foreground text-sm flex items-center gap-2" style={{ fontFamily: "Cairo, sans-serif" }}>
                <LifeBuoy className="w-4 h-4" />
                {{ ar: "إنشاء تذكرة دعم", fr: "Créer un ticket de support", en: "Create support ticket" }[lang]}
              </h2>
              <button type="button" onClick={() => !submitting && setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1">
                  {{ ar: "الموضوع", fr: "Sujet", en: "Subject" }[lang]} *
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={{ ar: "مثال: لا يمكنني مشاهدة الفيديو", fr: "ex. Impossible de voir la vidéo", en: "e.g. Can't view the video" }[lang]}
                  className="bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1">
                    {{ ar: "الفئة", fr: "Catégorie", en: "Category" }[lang]}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-border rounded-lg text-foreground text-xs"
                  >
                    {Object.keys(categoryConfig).map((c) => (
                      <option key={c} value={c}>{categoryConfig[c][lang]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1">
                    {{ ar: "الأولوية", fr: "Priorité", en: "Priority" }[lang]}
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-border rounded-lg text-foreground text-xs"
                  >
                    {Object.keys(priorityConfig).map((p) => (
                      <option key={p} value={p}>{priorityConfig[p].label[lang]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1">
                  {{ ar: "الوصف", fr: "Description", en: "Description" }[lang]} *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder={{ ar: "صفي المشكلة بالتفصيل...", fr: "Décrivez le problème en détail...", en: "Describe the issue in detail..." }[lang]}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-foreground bg-white border border-border outline-none resize-none focus-visible:ring-2 focus-visible:ring-black/70"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={submitting} className="flex-1">
                  {{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}
                </Button>
                <Button type="submit" disabled={submitting || !subject.trim() || !description.trim()} className="flex-1 bg-black hover:bg-black/90 text-white font-bold">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : { ar: "إرسال", fr: "Envoyer", en: "Send" }[lang]}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
