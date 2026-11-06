import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Plus, Edit2, Trash2, Mail, Phone, MapPin, Loader2,
  ChevronDown, ChevronUp, Users, BookOpen, GraduationCap, Wallet,
  UserPlus, UserMinus, BarChart3,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";

interface CenterStats {
  coachCount: number;
  courseCount: number;
  publishedCourseCount: number;
  studentCount: number;
  totalRevenue: string;
}

interface Center {
  id: number;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  stats: CenterStats;
}

interface CoachDetail {
  id: number; name: string; email: string; isApproved: boolean; avatarUrl: string | null;
  courseCount: number; studentCount: number; revenue: string;
}

interface CenterAnalysis {
  center: Center;
  stats: CenterStats;
  coaches: CoachDetail[];
}

interface Coach { id: number; name: string; email: string; centerId: number | null; }

export default function AdminCentersPage() {
  const { lang } = useI18n();
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<Center | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Center | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [assignCoachId, setAssignCoachId] = useState<Record<number, string>>({});

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isActive, setIsActive] = useState(true);

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // Fetch centers (with aggregated stats)
  const { data: centers, isLoading } = useQuery<Center[]>({
    queryKey: ["admin", "centers"],
    queryFn: async () => {
      const res = await fetch("/api/centers", { headers });
      if (!res.ok) throw new Error("Failed to fetch centers");
      return res.json();
    },
  });

  // All coaches (for the assign dropdown)
  const { data: allCoaches } = useQuery<Coach[]>({
    queryKey: ["admin", "coaches", "raw"],
    queryFn: async () => {
      const res = await fetch("/api/admin/coaches", { headers });
      if (!res.ok) throw new Error("Failed to fetch coaches");
      return res.json();
    },
  });

  // Detailed per-center analysis, lazy-loaded when expanded
  const { data: analysis, isLoading: analysisLoading } = useQuery<CenterAnalysis>({
    queryKey: ["admin", "centers", expandedId, "analysis"],
    enabled: expandedId !== null,
    queryFn: async () => {
      const res = await fetch(`/api/centers/${expandedId}/analysis`, { headers });
      if (!res.ok) throw new Error("Failed to fetch center analysis");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newCenter: Omit<Center, "id" | "createdAt" | "stats">) => {
      const res = await fetch("/api/centers", { method: "POST", headers, body: JSON.stringify(newCenter) });
      if (!res.ok) throw new Error("Failed to create center");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "centers"] });
      toast({ title: { ar: "تم إنشاء المركز بنجاح", fr: "Centre créé avec succès", en: "Center created successfully" }[lang] });
      resetForm();
      setIsOpen(false);
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (updated: Center) => {
      const res = await fetch(`/api/centers/${updated.id}`, { method: "PUT", headers, body: JSON.stringify(updated) });
      if (!res.ok) throw new Error("Failed to update center");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "centers"] });
      toast({ title: { ar: "تم تعديل المركز بنجاح", fr: "Centre mis à jour avec succès", en: "Center updated successfully" }[lang] });
      resetForm();
      setEditingCenter(null);
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/centers/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error("Failed to delete center");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "centers"] });
      toast({ title: { ar: "تم حذف المركز بنجاح", fr: "Centre supprimé avec succès", en: "Center deleted successfully" }[lang] });
      setPendingDelete(null);
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  // Assign / unassign a coach to a center
  const assignMutation = useMutation({
    mutationFn: async ({ coachId, centerId }: { coachId: number; centerId: number | null }) => {
      const res = await fetch(`/api/centers/coaches/${coachId}/assign`, { method: "PATCH", headers, body: JSON.stringify({ centerId }) });
      if (!res.ok) throw new Error("Failed to assign coach");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "centers"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "coaches", "raw"] });
      toast({ title: { ar: "تم تحديث الانتساب", fr: "Affiliation mise à jour", en: "Affiliation updated" }[lang] });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setName(""); setDescription(""); setAddress(""); setPhone(""); setEmail(""); setIsActive(true);
  };

  const handleEditOpen = (center: Center) => {
    setEditingCenter(center);
    setName(center.name);
    setDescription(center.description ?? "");
    setAddress(center.address ?? "");
    setPhone(center.phone ?? "");
    setEmail(center.email ?? "");
    setIsActive(center.isActive);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, description: description || null, address: address || null, phone: phone || null, email: email || null, isActive };
    if (editingCenter) updateMutation.mutate({ ...editingCenter, ...payload });
    else createMutation.mutate(payload);
  };

  const fmtMoney = (v: string) => `${parseFloat(v).toLocaleString("fr-DZ")} DZD`;

  return (
    <AdminLayout
      title={{ ar: "مراكز التدريب", fr: "Centres de formation", en: "Training Centers" }[lang]}
      subtitle={{ ar: "إدارة مراكز التدريب والمؤسسات الشريكة وتحليل أدائها", fr: "Gérer les centres partenaires et analyser leur performance", en: "Manage partner training centers and analyze their performance" }[lang]}
    >
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          {{ ar: "قائمة المراكز", fr: "Liste des centres", en: "Centers List" }[lang]}
        </h2>
        <Dialog open={isOpen || !!editingCenter} onOpenChange={(open) => { if (!open) { setIsOpen(false); setEditingCenter(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsOpen(true); }} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {{ ar: "إضافة مركز", fr: "Ajouter un centre", en: "Add Center" }[lang]}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-white border border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editingCenter
                  ? { ar: "تعديل مركز", fr: "Modifier le centre", en: "Edit Center" }[lang]
                  : { ar: "إضافة مركز جديد", fr: "Ajouter un nouveau centre", en: "Add New Center" }[lang]}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-foreground">{{ ar: "الاسم", fr: "Nom", en: "Name" }[lang]}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Centre de Formation El-Nadjah" required className="bg-white border-border text-foreground" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="description" className="text-foreground">{{ ar: "الوصف", fr: "Description", en: "Description" }[lang]}</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details..." className="bg-white border-border text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-foreground">{{ ar: "البريد الإلكتروني", fr: "Email", en: "Email" }[lang]}</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@centre.com" className="bg-white border-border text-foreground" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-foreground">{{ ar: "الهاتف", fr: "Téléphone", en: "Phone" }[lang]}</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+213..." className="bg-white border-border text-foreground" />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="address" className="text-foreground">{{ ar: "العنوان", fr: "Adresse", en: "Address" }[lang]}</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Alger, Algérie" className="bg-white border-border text-foreground" />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded border-border" />
                <Label htmlFor="isActive" className="text-foreground cursor-pointer select-none">{{ ar: "نشط", fr: "Actif / Opérationnel", en: "Active" }[lang]}</Label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsOpen(false); setEditingCenter(null); }} className="border-border text-foreground">
                  {{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {{ ar: "حفظ", fr: "Enregistrer", en: "Save" }[lang]}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : !centers || centers.length === 0 ? (
        <div className="text-center py-20 bg-white border border-border rounded-xl">
          <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-foreground text-lg font-medium mb-1">
            {{ ar: "لا توجد مراكز", fr: "Aucun centre de formation", en: "No Training Centers" }[lang]}
          </h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            {{ ar: "قم بإضافة أول مركز تدريب لإدارته وربط الكفاءات به", fr: "Créez votre premier centre de formation pour commencer la gestion.", en: "Add your first training center to start managing." }[lang]}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {centers.map((center) => {
            const isExpanded = expandedId === center.id;
            const unassignedCoaches = (allCoaches ?? []).filter((c) => c.centerId !== center.id);
            return (
              <div key={center.id} className="bg-white border border-border rounded-xl overflow-hidden hover:shadow-md transition-all">
                <div className="p-5">
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div>
                      <h3 className="font-bold text-foreground text-lg">{center.name}</h3>
                      {center.description && <p className="text-sm text-muted-foreground mt-0.5">{center.description}</p>}
                    </div>
                    <Badge variant={center.isActive ? "success" : "error"}>
                      {center.isActive ? { ar: "نشط", fr: "Actif", en: "Active" }[lang] : { ar: "غير نشط", fr: "Inactif", en: "Inactive" }[lang]}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap mb-4">
                    {center.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 shrink-0" />{center.email}</span>}
                    {center.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 shrink-0" />{center.phone}</span>}
                    {center.address && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" />{center.address}</span>}
                  </div>

                  {/* Aggregated stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="rounded-lg bg-violet-50 border border-violet-100 p-3">
                      <div className="flex items-center gap-1.5 text-violet-600 text-[10px] font-bold uppercase tracking-wider mb-1"><Users className="w-3 h-3" />{{ ar: "مدربات", fr: "Coaches", en: "Coaches" }[lang]}</div>
                      <div className="text-lg font-black text-foreground">{center.stats.coachCount}</div>
                    </div>
                    <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                      <div className="flex items-center gap-1.5 text-blue-600 text-[10px] font-bold uppercase tracking-wider mb-1"><BookOpen className="w-3 h-3" />{{ ar: "دورات", fr: "Formations", en: "Courses" }[lang]}</div>
                      <div className="text-lg font-black text-foreground">{center.stats.courseCount}<span className="text-xs text-muted-foreground font-medium"> / {center.stats.publishedCourseCount} {{ ar: "منشورة", fr: "publiées", en: "published" }[lang]}</span></div>
                    </div>
                    <div className="rounded-lg bg-cyan-50 border border-cyan-100 p-3">
                      <div className="flex items-center gap-1.5 text-cyan-600 text-[10px] font-bold uppercase tracking-wider mb-1"><GraduationCap className="w-3 h-3" />{{ ar: "طالبات", fr: "Étudiantes", en: "Students" }[lang]}</div>
                      <div className="text-lg font-black text-foreground">{center.stats.studentCount}</div>
                    </div>
                    <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                      <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold uppercase tracking-wider mb-1"><Wallet className="w-3 h-3" />{{ ar: "الإيرادات", fr: "Revenus", en: "Revenue" }[lang]}</div>
                      <div className="text-lg font-black text-foreground">{fmtMoney(center.stats.totalRevenue)}</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-border">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : center.id)}
                      className="flex items-center gap-1.5 text-xs font-bold text-violet-700 hover:text-violet-800"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      {{ ar: "تحليل مفصل", fr: "Analyse détaillée", en: "Detailed analysis" }[lang]}
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditOpen(center)} className="border-border text-foreground flex items-center gap-1.5">
                        <Edit2 className="w-3 h-3" />
                        {{ ar: "تعديل", fr: "Modifier", en: "Edit" }[lang]}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setPendingDelete(center)} className="border-destructive-border hover:bg-destructive/10 text-destructive flex items-center gap-1.5">
                        <Trash2 className="w-3 h-3" />
                        {{ ar: "حذف", fr: "Supprimer", en: "Delete" }[lang]}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Detailed analysis panel */}
                {isExpanded && (
                  <div className="border-t border-border bg-[#fafafa] p-5">
                    {analysisLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                    ) : (
                      <>
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
                          {{ ar: "المدربات المنتسبات", fr: "Coaches affiliées", en: "Affiliated coaches" }[lang]}
                        </h4>
                        {analysis && analysis.coaches.length > 0 ? (
                          <div className="space-y-2 mb-4">
                            {analysis.coaches.map((coach) => (
                              <div key={coach.id} className="flex items-center justify-between gap-3 p-3 bg-white border border-border rounded-lg">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 bg-violet-600">
                                    {coach.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-foreground truncate">{coach.name}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{coach.email}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] text-muted-foreground shrink-0">
                                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{coach.courseCount}</span>
                                  <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{coach.studentCount}</span>
                                  <span className="font-bold text-emerald-700">{fmtMoney(coach.revenue)}</span>
                                  <button
                                    onClick={() => assignMutation.mutate({ coachId: coach.id, centerId: null })}
                                    disabled={assignMutation.isPending}
                                    className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-bold disabled:opacity-50"
                                    title={{ ar: "إزالة من المركز", fr: "Retirer du centre", en: "Remove from center" }[lang]}
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground mb-4">
                            {{ ar: "لا توجد مدربات منتسبات لهذا المركز بعد", fr: "Aucune coach affiliée à ce centre pour l'instant", en: "No coaches affiliated with this center yet" }[lang]}
                          </p>
                        )}

                        {unassignedCoaches.length > 0 && (
                          <div className="flex items-center gap-2 pt-3 border-t border-border">
                            <select
                              value={assignCoachId[center.id] ?? ""}
                              onChange={(e) => setAssignCoachId((s) => ({ ...s, [center.id]: e.target.value }))}
                              className="flex-1 h-9 px-3 bg-white border border-border rounded-lg text-foreground text-xs"
                            >
                              <option value="">{{ ar: "اختاري مدربة لإضافتها...", fr: "Choisir une coach à affilier...", en: "Choose a coach to affiliate..." }[lang]}</option>
                              {unassignedCoaches.map((c) => (
                                <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
                              ))}
                            </select>
                            <Button
                              size="sm"
                              disabled={!assignCoachId[center.id] || assignMutation.isPending}
                              onClick={() => {
                                const coachId = Number(assignCoachId[center.id]);
                                assignMutation.mutate({ coachId, centerId: center.id });
                                setAssignCoachId((s) => ({ ...s, [center.id]: "" }));
                              }}
                              className="gap-1.5 bg-black hover:bg-black/90 text-white text-xs font-bold"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              {{ ar: "إضافة", fr: "Affilier", en: "Affiliate" }[lang]}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
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
              {{ ar: "حذف المركز؟", fr: "Supprimer ce centre ?", en: "Delete this center?" }[lang]}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {{
                ar: `سيتم حذف "${pendingDelete?.name}" نهائيًا. المدربات المنتسبات سيتم فك ارتباطهن تلقائيًا. هذا الإجراء لا يمكن التراجع عنه.`,
                fr: `"${pendingDelete?.name}" sera supprimé définitivement. Les coaches affiliées seront automatiquement dissociées. Cette action est irréversible.`,
                en: `"${pendingDelete?.name}" will be permanently deleted. Affiliated coaches will be automatically unlinked. This action cannot be undone.`,
              }[lang]}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>{{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {{ ar: "حذف", fr: "Supprimer", en: "Delete" }[lang]}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
