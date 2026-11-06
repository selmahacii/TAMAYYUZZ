import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Trash2, Shield, GraduationCap, User, Search, Copy, Check, Clock } from "lucide-react";

interface AppUser {
  id: number; name: string; email: string; role: string;
  isApproved: boolean; createdAt: string; bio?: string | null; avatarUrl?: string | null;
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

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const token = localStorage.getItem("auth_token");
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

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(pendingDelete.id);
    try {
      const res = await fetch(`${BASE}/api/admin/users/${pendingDelete.id}`, { method: "DELETE", headers });
      if (res.ok) {
        toast({ title: `${pendingDelete.name} ${{ ar: "محذوف", fr: "supprimé(e)", en: "deleted" }[lang]}` });
        setUsers((prev) => prev.filter((u) => u.id !== pendingDelete.id));
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
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: err.error ?? "Erreur", variant: "destructive" });
      }
    } finally {
      setChangingRole(null);
    }
  };

  const copyEmail = async (user: AppUser) => {
    try {
      await navigator.clipboard.writeText(user.email);
      setCopiedId(user.id);
      setTimeout(() => setCopiedId((id) => (id === user.id ? null : id)), 1500);
    } catch {
      // clipboard unavailable — silently ignore
    }
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

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(lang === "ar" ? "ar-DZ" : "fr-DZ", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <AdminLayout
      title={{ ar: "إدارة المستخدمات", fr: "Gestion des utilisateurs", en: "User Management" }[lang]}
      subtitle={{ ar: "إدارة جميع حسابات المستخدمات على المنصة", fr: "Gérer tous les comptes utilisateurs, avec traçabilité et actions précises", en: "Manage all user accounts on the platform" }[lang]}
    >
      {/* Role tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {[
          { value: "all", label: { ar: "الكل", fr: "Toutes", en: "All" }[lang], count: counts.all },
          { value: "student", label: { ar: "الطالبات", fr: "Étudiantes", en: "Students" }[lang], count: counts.student },
          { value: "coach", label: { ar: "المدربات", fr: "Coachs", en: "Coaches" }[lang], count: counts.coach },
          { value: "admin", label: { ar: "المديرات", fr: "Admins", en: "Admins" }[lang], count: counts.admin },
        ].map((tab) => (
          <button key={tab.value} onClick={() => setRoleFilter(tab.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${roleFilter === tab.value ? "text-white" : "text-foreground/60 hover:text-foreground bg-muted"}`}
            style={roleFilter === tab.value ? { background: "hsl(258,75%,55%)" } : undefined}>
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${roleFilter === tab.value ? "bg-white/20" : "bg-black/5"}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={{ ar: "بحث بالاسم أو البريد...", fr: "Rechercher par nom ou email...", en: "Search by name or email..." }[lang]}
          className="pl-9" />
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="bg-muted shadow-2xs rounded-2xl h-16 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{{ ar: "لا توجد مستخدمات", fr: "Aucun utilisateur", en: "No users found" }[lang]}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((user) => {
            const rc = roleConfig[user.role] ?? roleConfig.student;
            return (
              <div key={user.id} className="flex items-center gap-4 p-4 bg-white border border-border shadow-sm rounded-2xl hover:shadow-md transition-shadow">
                {/* Avatar */}
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover shrink-0 border border-border" />
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: user.role === "admin" ? "linear-gradient(135deg, #ef4444, #dc2626)" : user.role === "coach" ? "linear-gradient(135deg, hsl(258,75%,55%), hsl(270,70%,55%))" : "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                    {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-sm">{user.name}</span>
                    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${rc.color}`}>
                      {rc.icon}{rc.label[lang]}
                    </span>
                    {user.role === "coach" && !user.isApproved && (
                      <span className="text-xs text-amber-600 font-semibold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
                        {{ ar: "في انتظار", fr: "En attente", en: "Pending" }[lang]}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-muted-foreground text-xs truncate">{user.email}</p>
                    <button
                      onClick={() => copyEmail(user)}
                      title={{ ar: "نسخ البريد", fr: "Copier l'email", en: "Copy email" }[lang]}
                      className="text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
                    >
                      {copiedId === user.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Traceability: creation timestamp */}
                <div className="text-xs text-muted-foreground hidden md:flex items-center gap-1.5 shrink-0" title={{ ar: "تاريخ الإنشاء", fr: "Date de création", en: "Created at" }[lang]}>
                  <Clock className="w-3 h-3" />
                  <span>#{user.id} · {formatDateTime(user.createdAt)}</span>
                </div>

                {/* Role change dropdown */}
                {user.role !== "admin" && (
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user, e.target.value)}
                    disabled={changingRole === user.id}
                    className="text-xs px-2 py-1.5 rounded-lg text-foreground bg-muted border border-border outline-none shrink-0 disabled:opacity-50"
                    title={{ ar: "تغيير الدور", fr: "Changer le rôle", en: "Change role" }[lang]}
                  >
                    {["student", "coach", "admin"].map((r) => (
                      <option key={r} value={r}>
                        {roleConfig[r]?.label[lang] ?? r}
                      </option>
                    ))}
                  </select>
                )}

                {user.role !== "admin" && (
                  <button
                    onClick={() => setPendingDelete(user)}
                    disabled={deleting === user.id}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500/60 hover:text-red-600 hover:bg-red-50 transition-all shrink-0 disabled:opacity-50"
                    title={{ ar: "حذف", fr: "Supprimer", en: "Delete" }[lang]}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
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
