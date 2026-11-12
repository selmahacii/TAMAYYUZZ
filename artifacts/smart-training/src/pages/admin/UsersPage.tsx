import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users, Trash2, Shield, GraduationCap, User, Search, Copy, Check, Clock,
  CreditCard, Award, BookOpen, FileText, AlertCircle, MessageSquare, ChevronRight,
  ExternalLink, X, Filter, Activity, Eye, Phone, MapPin, Building2, CheckCircle2,
  XCircle, AlertTriangle, Scale, RefreshCw, Loader2, DollarSign, Calendar, EyeOff
} from "lucide-react";

interface AppUser {
  id: number;
  name: string;
  email: string;
  role: string;
  isApproved: boolean;
  createdAt: string;
  bio?: string | null;
  avatarUrl?: string | null;
}

const roleConfig: Record<string, { label: Record<string, string>; color: string; icon: React.ReactNode }> = {
  admin: { label: { ar: "مديرة", fr: "Admin", en: "Admin" }, color: "bg-red-50 text-red-600 border border-red-200", icon: <Shield className="w-3 h-3" /> },
  coach: { label: { ar: "مدربة", fr: "Coach", en: "Coach" }, color: "bg-violet-50 text-violet-600 border border-violet-200", icon: <GraduationCap className="w-3 h-3" /> },
  student: { label: { ar: "طالبة", fr: "Étudiante", en: "Student" }, color: "bg-amber-50 text-amber-600 border border-amber-200", icon: <User className="w-3 h-3" /> },
};

export default function AdminUsersPage() {
  const { lang } = useI18n();
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [changingRole, setChangingRole] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AppUser | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // User Activity Dossier states
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userActivities, setUserActivities] = useState<any | null>(null);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [activityTab, setActivityTab] = useState<"timeline" | "purchases" | "courses" | "certificates" | "audit" | "coach">("timeline");
  const [timelineFilter, setTimelineFilter] = useState<string>("all");
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const token = localStorage.getItem("auth_token") || localStorage.getItem("tamayuz_token") || localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/users`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const loadUserActivities = async (userId: number) => {
    setSelectedUserId(userId);
    setLoadingActivities(true);
    try {
      const res = await fetch(`${BASE}/api/admin/users/${userId}/activities`, { headers });
      const data = await res.json();
      if (res.ok) {
        setUserActivities(data);
        setActivityTab("timeline");
        setTimelineFilter("all");
      } else {
        toast({ title: "Erreur", description: data.error || "Impossible de charger les activités de l'utilisateur.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erreur réseau", description: err.message, variant: "destructive" });
    } finally {
      setLoadingActivities(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(pendingDelete.id);
    try {
      const res = await fetch(`${BASE}/api/admin/users/${pendingDelete.id}`, { method: "DELETE", headers });
      if (res.ok) {
        toast({ title: `${pendingDelete.name} ${{ ar: "محذوف", fr: "supprimé(e)", en: "deleted" }[lang]}` });
        setUsers((prev) => prev.filter((u) => u.id !== pendingDelete.id));
        if (selectedUserId === pendingDelete.id) {
          setSelectedUserId(null);
          setUserActivities(null);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Erreur", description: err.error, variant: "destructive" });
      }
    } finally {
      setDeleting(null);
      setPendingDelete(null);
    }
  };

  const handleRoleChange = async (user: AppUser, newRole: string) => {
    if (newRole === user.role) return;
    setChangingRole(user.id);
    try {
      const res = await fetch(`${BASE}/api/admin/users/${user.id}/role`, {
        method: "PATCH", headers, body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        toast({ title: `${user.name} → ${roleConfig[newRole]?.label[lang] ?? newRole}` });
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
        if (userActivities && userActivities.user.id === user.id) {
          setUserActivities({ ...userActivities, user: { ...userActivities.user, role: newRole } });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: err.error ?? "Erreur", variant: "destructive" });
      }
    } finally {
      setChangingRole(null);
    }
  };

  const copyEmail = async (email: string, id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(email);
      setCopiedId(id);
      setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 1500);
    } catch {}
  };

  const filtered = useMemo(() => users.filter((u) => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  }), [users, search, roleFilter]);

  const counts = {
    all: users.length,
    student: users.filter((u) => u.role === "student").length,
    coach: users.filter((u) => u.role === "coach").length,
    admin: users.filter((u) => u.role === "admin").length,
  };

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString(lang === "ar" ? "ar-DZ" : "fr-DZ", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
      });
    } catch {
      return iso;
    }
  };

  const formatDateOnly = (iso?: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-DZ", {
        day: "2-digit", month: "short", year: "numeric"
      });
    } catch {
      return iso;
    }
  };

  // Filtered timeline
  const filteredTimeline = useMemo(() => {
    if (!userActivities?.timeline) return [];
    if (timelineFilter === "all") return userActivities.timeline;
    return userActivities.timeline.filter((item: any) => item.type === timelineFilter);
  }, [userActivities, timelineFilter]);

  return (
    <AdminLayout
      title={{ ar: "إدارة المستخدمات والنشاط", fr: "Gestion des utilisateurs & Activités", en: "User Management & Activities" }[lang]}
      subtitle={{ ar: "سجل كامل وتتبع شامل لجميع أنشطة المستخدمات بدون استثناء", fr: "Traçabilité intégrale et historique d'activités sans exception pour chaque utilisateur", en: "Comprehensive activity history and audit trail for every user" }[lang]}
    >
      {/* Role tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {[
          { value: "all", label: { ar: "الكل", fr: "Toutes", en: "All" }[lang], count: counts.all },
          { value: "student", label: { ar: "الطالبات", fr: "Étudiantes", en: "Students" }[lang], count: counts.student },
          { value: "coach", label: { ar: "المدربات", fr: "Coachs", en: "Coaches" }[lang], count: counts.coach },
          { value: "admin", label: { ar: "المديرات", fr: "Admins", en: "Admins" }[lang], count: counts.admin },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setRoleFilter(tab.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${roleFilter === tab.value ? "text-white" : "text-foreground/60 hover:text-foreground bg-muted"}`}
            style={roleFilter === tab.value ? { background: "hsl(258,75%,55%)" } : undefined}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${roleFilter === tab.value ? "bg-white/20" : "bg-black/5"}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={{ ar: "بحث بالاسم أو البريد...", fr: "Rechercher par nom ou email...", en: "Search by name or email..." }[lang]}
          className="pl-9 bg-white"
        />
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-muted shadow-2xs rounded-2xl h-16 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-border">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{{ ar: "لا توجد مستخدمات", fr: "Aucun utilisateur trouvé", en: "No users found" }[lang]}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((user) => {
            const rc = roleConfig[user.role] ?? roleConfig.student;
            return (
              <div
                key={user.id}
                onClick={() => loadUserActivities(user.id)}
                className="group flex items-center gap-4 p-4 bg-white border border-border shadow-sm rounded-2xl hover:shadow-md hover:border-neutral-400 transition-all cursor-pointer"
              >
                {/* Avatar */}
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-11 h-11 rounded-full object-cover shrink-0 border border-border" />
                ) : (
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-xs"
                    style={{ background: user.role === "admin" ? "linear-gradient(135deg, #ef4444, #dc2626)" : user.role === "coach" ? "linear-gradient(135deg, hsl(258,75%,55%), hsl(270,70%,55%))" : "linear-gradient(135deg, #f59e0b, #d97706)" }}
                  >
                    {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground text-sm group-hover:text-neutral-900 transition-colors">{user.name}</span>
                    <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${rc.color}`}>
                      {rc.icon}{rc.label[lang]}
                    </span>
                    {user.role === "coach" && !user.isApproved && (
                      <span className="text-[11px] text-amber-700 font-semibold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
                        {{ ar: "في انتظار الاعتماد", fr: "En attente de validation", en: "Pending approval" }[lang]}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-muted-foreground text-xs truncate font-mono">{user.email}</p>
                    <button
                      onClick={(e) => copyEmail(user.email, user.id, e)}
                      title={{ ar: "نسخ البريد", fr: "Copier l'email", en: "Copy email" }[lang]}
                      className="text-muted-foreground/60 hover:text-foreground transition-colors shrink-0 p-0.5"
                    >
                      {copiedId === user.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Registration Date */}
                <div className="text-xs text-muted-foreground hidden md:flex items-center gap-1.5 shrink-0" title="Identifiant et date d'inscription">
                  <Clock className="w-3.5 h-3.5" />
                  <span>#{user.id} · {formatDateOnly(user.createdAt)}</span>
                </div>

                {/* Inspect Action Badge */}
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 group-hover:bg-black group-hover:text-white text-neutral-800 text-xs font-bold transition-colors shrink-0">
                  <Activity className="w-3.5 h-3.5" />
                  <span>{{ ar: "سجل النشاط", fr: "Dossier & Activités", en: "Activity Dossier" }[lang]}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>

                {/* Role change dropdown */}
                {user.role !== "admin" && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user, e.target.value)}
                      disabled={changingRole === user.id}
                      className="text-xs px-2.5 py-1.5 rounded-lg text-foreground bg-muted border border-border outline-none shrink-0 disabled:opacity-50 font-medium"
                      title={{ ar: "تغيير الدور", fr: "Changer le rôle", en: "Change role" }[lang]}
                    >
                      {["student", "coach", "admin"].map((r) => (
                        <option key={r} value={r}>
                          {roleConfig[r]?.label[lang] ?? r}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Delete button */}
                {user.role !== "admin" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setPendingDelete(user); }}
                    disabled={deleting === user.id}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500/60 hover:text-red-600 hover:bg-red-50 transition-all shrink-0 disabled:opacity-50"
                    title={{ ar: "حذف", fr: "Supprimer l'utilisateur", en: "Delete user" }[lang]}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FULL USER ACTIVITY & AUDIT DOSSIER MODAL */}
      {selectedUserId !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-border w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {loadingActivities || !userActivities ? (
              <div className="p-16 flex flex-col items-center justify-center text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-neutral-800" />
                <p className="text-sm font-bold text-foreground">
                  {{ ar: "جارٍ استخراج وتجميع سجل الأنشطة الشامل...", fr: "Extraction et agrégation de l'historique intégral...", en: "Extracting comprehensive activity history..." }[lang]}
                </p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  {{ ar: "جلب المعاملات، التسجيلات، نتائج الامتحانات، الشهادات، وسجلات الأمان.", fr: "Interrogation des transactions, formations, résultats d'examens, certificats et journal d'audit.", en: "Querying transactions, courses, exam attempts, certificates and audit logs." }[lang]}
                </p>
              </div>
            ) : (
              <>
                {/* Dossier Header */}
                <div className="p-5 border-b border-border bg-neutral-50/70 shrink-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      {userActivities.user.avatarUrl ? (
                        <img src={userActivities.user.avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" />
                      ) : (
                        <div
                          className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-sm"
                          style={{ background: userActivities.user.role === "admin" ? "linear-gradient(135deg, #ef4444, #dc2626)" : userActivities.user.role === "coach" ? "linear-gradient(135deg, hsl(258,75%,55%), hsl(270,70%,55%))" : "linear-gradient(135deg, #f59e0b, #d97706)" }}
                        >
                          {userActivities.user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-lg font-bold text-foreground">{userActivities.user.name}</h2>
                          <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${roleConfig[userActivities.user.role]?.color || "bg-neutral-100"}`}>
                            {roleConfig[userActivities.user.role]?.icon}{roleConfig[userActivities.user.role]?.label[lang] || userActivities.user.role}
                          </span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-neutral-200/70 text-neutral-800 font-semibold">
                            ID #{userActivities.user.id}
                          </span>
                          {userActivities.user.isApproved ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />{{ ar: "حساب معتمد", fr: "Compte vérifié", en: "Verified account" }[lang]}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" />{{ ar: "قيد المراجعة", fr: "En attente d'approbation", en: "Pending review" }[lang]}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1 font-mono text-neutral-700">
                            {userActivities.user.email}
                            <button
                              type="button"
                              onClick={(e) => copyEmail(userActivities.user.email, userActivities.user.id, e)}
                              className="text-muted-foreground hover:text-foreground p-0.5"
                              title="Copier l'email"
                            >
                              {copiedId === userActivities.user.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </span>
                          {userActivities.user.phone && (
                            <span className="flex items-center gap-1 text-neutral-700">
                              <Phone className="w-3.5 h-3.5 text-neutral-400" />{userActivities.user.phone}
                            </span>
                          )}
                          {userActivities.user.centerName && (
                            <span className="flex items-center gap-1 text-neutral-700">
                              <Building2 className="w-3.5 h-3.5 text-neutral-400" />{userActivities.user.centerName}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-neutral-400" />{{ ar: "مسجل منذ :", fr: "Inscrit le :", en: "Member since:" }[lang]} {formatDateOnly(userActivities.user.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => loadUserActivities(selectedUserId)}
                        disabled={loadingActivities}
                        className="text-xs h-8"
                        title="Actualiser les données"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingActivities ? "animate-spin" : ""}`} />
                      </Button>
                      <button
                        type="button"
                        onClick={() => setSelectedUserId(null)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-neutral-200/60 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* KPI Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
                    <div className="bg-white p-3 rounded-xl border border-border shadow-xs">
                      <div className="text-[11px] font-bold text-muted-foreground uppercase flex items-center justify-between">
                        <span>{{ ar: "إجمالي المدفوعات", fr: "Transactions & Paiements", en: "Purchases" }[lang]}</span>
                        <CreditCard className="w-3.5 h-3.5 text-neutral-500" />
                      </div>
                      <div className="text-base font-black text-foreground mt-1">
                        {Number(userActivities.stats.totalSpent).toLocaleString("fr-FR")} DZD
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {userActivities.stats.approvedPurchases} validé(s) sur {userActivities.stats.totalPurchases} achat(s)
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-border shadow-xs">
                      <div className="text-[11px] font-bold text-muted-foreground uppercase flex items-center justify-between">
                        <span>{{ ar: "الدورات والدروس", fr: "Formations & Suivi", en: "Enrollments" }[lang]}</span>
                        <BookOpen className="w-3.5 h-3.5 text-neutral-500" />
                      </div>
                      <div className="text-base font-black text-foreground mt-1">
                        {userActivities.stats.totalEnrollments} formation(s)
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {userActivities.stats.completedLessons} leçon(s) achevée(s)
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-border shadow-xs">
                      <div className="text-[11px] font-bold text-muted-foreground uppercase flex items-center justify-between">
                        <span>{{ ar: "الشهادات والامتحانات", fr: "Diplômes & Examens", en: "Certificates" }[lang]}</span>
                        <Award className="w-3.5 h-3.5 text-neutral-500" />
                      </div>
                      <div className="text-base font-black text-foreground mt-1">
                        {userActivities.stats.certificatesEarned} certificat(s)
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {userActivities.stats.totalExamAttempts} tentative(s) d'examen
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-border shadow-xs">
                      <div className="text-[11px] font-bold text-muted-foreground uppercase flex items-center justify-between">
                        <span>{{ ar: "سجل التدقيق والنزاعات", fr: "Audit Système & Litiges", en: "System Audit" }[lang]}</span>
                        <Scale className="w-3.5 h-3.5 text-neutral-500" />
                      </div>
                      <div className="text-base font-black text-foreground mt-1">
                        {userActivities.stats.auditLogsCount} logs système
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {userActivities.stats.ticketsCount} réclamation(s) / ticket(s)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dossier Tabs Header */}
                <div className="px-5 pt-3 pb-2 border-b border-border bg-white flex items-center gap-1.5 overflow-x-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setActivityTab("timeline")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${activityTab === "timeline" ? "bg-black text-white" : "text-foreground/70 hover:bg-neutral-100"}`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    {{ ar: "التسلسل الزمني الكامل", fr: "Chronologie Complète", en: "Full Timeline" }[lang]}
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activityTab === "timeline" ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-700"}`}>
                      {userActivities.timeline.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivityTab("purchases")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${activityTab === "purchases" ? "bg-black text-white" : "text-foreground/70 hover:bg-neutral-100"}`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    {{ ar: "المدفوعات والإيصالات", fr: "Paiements & Reçus", en: "Payments" }[lang]}
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activityTab === "purchases" ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-700"}`}>
                      {userActivities.purchases.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivityTab("courses")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${activityTab === "courses" ? "bg-black text-white" : "text-foreground/70 hover:bg-neutral-100"}`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    {{ ar: "الدورات المسجلة", fr: "Formations & Suivi", en: "Courses" }[lang]}
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activityTab === "courses" ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-700"}`}>
                      {userActivities.enrollments.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivityTab("certificates")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${activityTab === "certificates" ? "bg-black text-white" : "text-foreground/70 hover:bg-neutral-100"}`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    {{ ar: "الشهادات والامتحانات", fr: "Examens & Certificats", en: "Exams & Certs" }[lang]}
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activityTab === "certificates" ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-700"}`}>
                      {userActivities.certificates.length + userActivities.examAttempts.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivityTab("audit")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${activityTab === "audit" ? "bg-black text-white" : "text-foreground/70 hover:bg-neutral-100"}`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    {{ ar: "سجل التدقيق الأمني", fr: "Audit Système", en: "Audit Logs" }[lang]}
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activityTab === "audit" ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-700"}`}>
                      {userActivities.auditLogs.length}
                    </span>
                  </button>

                  {userActivities.user.role === "coach" && (
                    <button
                      type="button"
                      onClick={() => setActivityTab("coach")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${activityTab === "coach" ? "bg-black text-white" : "text-foreground/70 hover:bg-neutral-100"}`}
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      {{ ar: "نشاط المدربة", fr: "Activité Formateur", en: "Coach Activity" }[lang]}
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activityTab === "coach" ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-700"}`}>
                        {userActivities.coachData.courses.length}
                      </span>
                    </button>
                  )}
                </div>

                {/* Dossier Content Area */}
                <div className="flex-1 overflow-y-auto p-5 bg-[#fafafa]">
                  {/* TAB 1: TIMELINE */}
                  {activityTab === "timeline" && (
                    <div className="space-y-4">
                      {/* Timeline filter pills */}
                      <div className="flex items-center gap-1.5 flex-wrap pb-2 border-b border-border">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase mr-1">Filtre :</span>
                        {[
                          { id: "all", label: "Tous" },
                          { id: "PURCHASE", label: "Paiements" },
                          { id: "ENROLLMENT", label: "Inscriptions" },
                          { id: "EXAM", label: "Examens" },
                          { id: "CERTIFICATE", label: "Certificats" },
                          { id: "TICKET", label: "Litiges / Support" },
                          { id: "AUDIT", label: "Audit Système" },
                        ].map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setTimelineFilter(f.id)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${timelineFilter === f.id ? "bg-neutral-800 text-white" : "bg-white border border-border text-foreground/70 hover:bg-neutral-100"}`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>

                      {filteredTimeline.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-border">
                          <Activity className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">Aucun événement ne correspond à ce filtre.</p>
                        </div>
                      ) : (
                        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-neutral-200">
                          {filteredTimeline.map((ev: any) => {
                            const isPurchase = ev.type === "PURCHASE";
                            const isExam = ev.type === "EXAM";
                            const isCert = ev.type === "CERTIFICATE";
                            const isTicket = ev.type === "TICKET";
                            const isAudit = ev.type === "AUDIT";

                            return (
                              <div key={ev.id} className="relative group">
                                {/* Timeline bullet */}
                                <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] ${ev.status === "success" ? "bg-emerald-600" : ev.status === "error" ? "bg-rose-600" : ev.status === "warning" ? "bg-amber-600" : "bg-neutral-700"}`}>
                                  {isPurchase ? <CreditCard className="w-2.5 h-2.5" /> : isCert ? <Award className="w-2.5 h-2.5" /> : isExam ? <FileText className="w-2.5 h-2.5" /> : isTicket ? <Scale className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                                </div>

                                <div className="p-3.5 bg-white border border-border rounded-xl shadow-xs group-hover:border-neutral-400 transition-colors">
                                  <div className="flex items-start justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800">
                                        {ev.badge}
                                      </span>
                                      <h4 className="text-xs font-bold text-foreground">{ev.title}</h4>
                                    </div>
                                    <span className="text-[11px] font-mono text-muted-foreground">
                                      {formatDateTime(ev.timestamp)}
                                    </span>
                                  </div>

                                  <p className="text-xs text-foreground/80 mt-1.5 leading-relaxed">
                                    {ev.description}
                                  </p>

                                  {/* Quick Receipt preview if purchase */}
                                  {ev.metadata?.receiptUrl && (
                                    <div className="mt-2.5 pt-2 border-t border-border flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setPreviewReceiptUrl(ev.metadata.receiptUrl)}
                                        className="text-[11px] font-bold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors"
                                      >
                                        <Eye className="w-3 h-3" />
                                        Examiner le reçu bancaire / CCP
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: PURCHASES */}
                  {activityTab === "purchases" && (
                    <div className="space-y-3">
                      {userActivities.purchases.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-border">
                          <CreditCard className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">Aucune transaction enregistrée pour cet utilisateur.</p>
                        </div>
                      ) : (
                        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-neutral-100/70 border-b border-border text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                              <tr>
                                <th className="p-3">Réf / Date</th>
                                <th className="p-3">Formation</th>
                                <th className="p-3">Montant</th>
                                <th className="p-3">Mode de paiement</th>
                                <th className="p-3">Statut</th>
                                <th className="p-3 text-right">Reçu</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {userActivities.purchases.map((p: any) => (
                                <tr key={p.id} className="hover:bg-neutral-50/70">
                                  <td className="p-3 font-mono">
                                    <div className="font-bold text-foreground">#{p.id}</div>
                                    <div className="text-[10px] text-muted-foreground">{formatDateTime(p.paid_at)}</div>
                                  </td>
                                  <td className="p-3 font-medium text-foreground">
                                    {p.course_title || "Formation"}
                                  </td>
                                  <td className="p-3 font-bold text-foreground font-mono">
                                    {Number(p.amount).toLocaleString("fr-FR")} {p.currency || "DZD"}
                                    {p.discount_applied && (
                                      <span className="block text-[10px] font-normal text-emerald-600">
                                        -{p.discount_applied}% ({p.coupon_code || "Code promo"})
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 uppercase text-[11px] font-bold">
                                    {p.payment_method || "DIRECT"}
                                  </td>
                                  <td className="p-3">
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === "approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : p.status === "rejected" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                                      {p.status === "approved" ? "Validé" : p.status === "rejected" ? "Rejeté" : "En attente"}
                                    </span>
                                    {p.rejection_reason && (
                                      <div className="text-[10px] text-rose-600 mt-1 max-w-xs">{p.rejection_reason}</div>
                                    )}
                                  </td>
                                  <td className="p-3 text-right">
                                    {p.receipt_url ? (
                                      <button
                                        type="button"
                                        onClick={() => setPreviewReceiptUrl(p.receipt_url)}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors"
                                      >
                                        <Eye className="w-3 h-3" />
                                        Voir reçu
                                      </button>
                                    ) : (
                                      <span className="text-muted-foreground text-[10px]">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: ENROLLMENTS & PROGRESS */}
                  {activityTab === "courses" && (
                    <div className="space-y-3">
                      {userActivities.enrollments.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-border">
                          <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">Aucune formation suivie actuellement.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {userActivities.enrollments.map((en: any) => {
                            const percent = en.total_lessons > 0 ? Math.round((en.completed_lessons / en.total_lessons) * 100) : 0;
                            return (
                              <div key={en.id} className="p-4 bg-white border border-border rounded-xl shadow-xs space-y-2.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                      {en.category || "Formation"} · {en.level || "Tous niveaux"}
                                    </span>
                                    <h4 className="text-xs font-bold text-foreground mt-0.5">{en.course_title}</h4>
                                  </div>
                                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                    {formatDateOnly(en.enrolled_at)}
                                  </span>
                                </div>

                                <div>
                                  <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                                    <span className="text-foreground/80">Progression globale</span>
                                    <span className="font-mono">{percent}% ({en.completed_lessons}/{en.total_lessons} leçons)</span>
                                  </div>
                                  <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
                                    <div
                                      className="h-full bg-neutral-800 rounded-full transition-all duration-300"
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: EXAMS & CERTIFICATES */}
                  {activityTab === "certificates" && (
                    <div className="space-y-5">
                      {/* Section Certificats */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-neutral-800" />
                          Certificats Officiels Délivrés ({userActivities.certificates.length})
                        </h4>
                        {userActivities.certificates.length === 0 ? (
                          <div className="p-6 bg-white border border-border rounded-xl text-center text-xs text-muted-foreground">
                            Aucun certificat officiel n'a encore été généré pour ce compte.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {userActivities.certificates.map((cert: any) => (
                              <div key={cert.id} className="p-4 bg-white border border-border rounded-xl shadow-xs space-y-2">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                                      <Award className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <h5 className="text-xs font-bold text-foreground">{cert.course_name}</h5>
                                      <p className="text-[10px] text-muted-foreground">Délivré le {formatDateOnly(cert.issued_at)}</p>
                                    </div>
                                  </div>
                                  {cert.exam_score && (
                                    <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                      {cert.exam_score}%
                                    </span>
                                  )}
                                </div>

                                <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-mono">
                                  <span className="text-muted-foreground text-[10px]">Code d'authentification :</span>
                                  <span className="font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">
                                    {cert.certificate_code}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Section Examens */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-neutral-800" />
                          Historique des Tentatives d'Examens ({userActivities.examAttempts.length})
                        </h4>
                        {userActivities.examAttempts.length === 0 ? (
                          <div className="p-6 bg-white border border-border rounded-xl text-center text-xs text-muted-foreground">
                            Aucun examen final tenté pour le moment.
                          </div>
                        ) : (
                          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-xs">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-neutral-100/70 border-b border-border text-muted-foreground uppercase text-[10px] font-bold">
                                <tr>
                                  <th className="p-3">Date</th>
                                  <th className="p-3">Formation</th>
                                  <th className="p-3">Note obtenue</th>
                                  <th className="p-3">Résultat</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {userActivities.examAttempts.map((ea: any) => (
                                  <tr key={ea.id} className="hover:bg-neutral-50/70">
                                    <td className="p-3 font-mono text-muted-foreground">{formatDateTime(ea.attempted_at)}</td>
                                    <td className="p-3 font-medium text-foreground">{ea.course_title}</td>
                                    <td className="p-3 font-bold font-mono">{ea.score}%</td>
                                    <td className="p-3">
                                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${ea.passed ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                                        {ea.passed ? "Admis(e)" : "Ajourné(e)"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 5: AUDIT LOGS */}
                  {activityTab === "audit" && (
                    <div className="space-y-3">
                      {userActivities.auditLogs.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-border">
                          <Shield className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">Aucun enregistrement d'audit pour cet utilisateur.</p>
                        </div>
                      ) : (
                        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-neutral-100/70 border-b border-border text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                              <tr>
                                <th className="p-3">Date & Heure</th>
                                <th className="p-3">Action exécutée</th>
                                <th className="p-3">Cible / Entité</th>
                                <th className="p-3">Acteur</th>
                                <th className="p-3">Adresse IP</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {userActivities.auditLogs.map((log: any) => (
                                <tr key={log.id} className="hover:bg-neutral-50/70">
                                  <td className="p-3 font-mono text-muted-foreground text-[11px] whitespace-nowrap">
                                    {formatDateTime(log.created_at)}
                                  </td>
                                  <td className="p-3">
                                    <span className="font-mono font-bold text-foreground text-[11px] px-2 py-0.5 rounded bg-neutral-100">
                                      {log.action}
                                    </span>
                                  </td>
                                  <td className="p-3 text-[11px] font-mono">
                                    {log.entity} {log.entity_id ? `#${log.entity_id}` : ""}
                                  </td>
                                  <td className="p-3 text-[11px]">
                                    {log.actor_name ? `${log.actor_name} (${log.actor_email})` : `Utilisateur #${log.user_id}`}
                                  </td>
                                  <td className="p-3 font-mono text-[11px] text-muted-foreground">
                                    {log.ip_address || "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 6: COACH SPECIFIC DATA */}
                  {activityTab === "coach" && userActivities.user.role === "coach" && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-neutral-800" />
                          Formations Conçues & Publiées ({userActivities.coachData.courses.length})
                        </h4>
                        {userActivities.coachData.courses.length === 0 ? (
                          <div className="p-6 bg-white border border-border rounded-xl text-center text-xs text-muted-foreground">
                            Aucune formation créée par cette formatrice.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {userActivities.coachData.courses.map((c: any) => (
                              <div key={c.id} className="p-4 bg-white border border-border rounded-xl shadow-xs space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground">{c.category}</span>
                                    <h5 className="text-xs font-bold text-foreground mt-0.5">{c.title}</h5>
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.is_published ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-neutral-100 text-neutral-600"}`}>
                                    {c.is_published ? "Publié" : "Brouillon"}
                                  </span>
                                </div>
                                <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-mono">
                                  <span>{Number(c.price).toLocaleString("fr-FR")} DZD</span>
                                  <span className="font-bold text-neutral-700">{c.student_count} apprenante(s)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Versements / Payouts */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-neutral-800" />
                          Historique des Versements Financiers ({userActivities.coachData.payouts.length})
                        </h4>
                        {userActivities.coachData.payouts.length === 0 ? (
                          <div className="p-6 bg-white border border-border rounded-xl text-center text-xs text-muted-foreground">
                            Aucun versement effectué pour le moment.
                          </div>
                        ) : (
                          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-xs">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-neutral-100/70 border-b border-border text-muted-foreground uppercase text-[10px] font-bold">
                                <tr>
                                  <th className="p-3">Réf / Date</th>
                                  <th className="p-3">Montant</th>
                                  <th className="p-3">Numéro de virement</th>
                                  <th className="p-3">Statut</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {userActivities.coachData.payouts.map((po: any) => (
                                  <tr key={po.id} className="hover:bg-neutral-50/70">
                                    <td className="p-3 font-mono">
                                      #{po.id} · {formatDateOnly(po.created_at)}
                                    </td>
                                    <td className="p-3 font-bold font-mono">
                                      {Number(po.amount).toLocaleString("fr-FR")} {po.currency || "DZD"}
                                    </td>
                                    <td className="p-3 font-mono text-[11px]">{po.reference_number || "—"}</td>
                                    <td className="p-3">
                                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${po.status === "completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : po.status === "rejected" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                                        {po.status === "completed" ? "Versé" : po.status === "rejected" ? "Rejeté" : "En cours"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dossier Footer */}
                <div className="p-4 bg-white border-t border-border flex items-center justify-between shrink-0">
                  <div className="text-xs text-muted-foreground">
                    Dossier utilisateur audité conformément aux exigences de traçabilité institutionnelle.
                  </div>
                  <Button
                    type="button"
                    onClick={() => setSelectedUserId(null)}
                    className="bg-black hover:bg-neutral-800 text-white font-bold text-xs"
                  >
                    Fermer le dossier
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* RECEIPT PREVIEW MODAL */}
      {previewReceiptUrl && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl border border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-neutral-800" />
                Preuve de virement bancaire / reçu CCP
              </h3>
              <button
                type="button"
                onClick={() => setPreviewReceiptUrl(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-neutral-100 border border-border max-h-[70vh] flex items-center justify-center">
              {previewReceiptUrl.endsWith(".pdf") || previewReceiptUrl.includes("application/pdf") ? (
                <iframe src={previewReceiptUrl} className="w-full h-[60vh]" title="Receipt PDF" />
              ) : (
                <img src={previewReceiptUrl} alt="Reçu de paiement" className="max-h-[65vh] w-auto object-contain" />
              )}
            </div>
            <div className="flex justify-between items-center pt-2">
              <a
                href={previewReceiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-neutral-800 hover:underline flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ouvrir en plein écran
              </a>
              <Button type="button" size="sm" onClick={() => setPreviewReceiptUrl(null)} className="bg-black text-white">
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {{ ar: "تأكيد الحذف", fr: "Confirmer la suppression", en: "Confirm deletion" }[lang]}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {{
                ar: `سيتم حذف حساب ${pendingDelete?.name ?? ""} (${pendingDelete?.email ?? ""}) نهائيًا. لا يمكن التراجع عن هذا الإجراء.`,
                fr: `Le compte de ${pendingDelete?.name ?? ""} (${pendingDelete?.email ?? ""}) sera supprimé définitivement. Cette action est irréversible.`,
                en: `The account for ${pendingDelete?.name ?? ""} (${pendingDelete?.email ?? ""}) will be permanently deleted. This action cannot be undone.`,
              }[lang]}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!pendingDelete && deleting === pendingDelete.id}>{{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={!!pendingDelete && deleting === pendingDelete.id} className="bg-red-600 hover:bg-red-700 text-white">
              {{ ar: "حذف", fr: "Supprimer", en: "Delete" }[lang]}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
