import { useState } from "react";
import { useGetAdminCoaches, useApproveCoach, useRejectCoach, useVerifyCoachDiploma, useGetAdminStats, getGetAdminCoachesQueryKey, type AdminStats } from "@workspace/api-client-react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  GraduationCap,
  Mail,
  Calendar,
  Loader2,
  Plus,
  BookOpen,
  Users,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  ExternalLink,
  Eye,
  FileText,
  Clock,
  ArrowUpRight,
  Activity,
  Check,
  X,
  ChevronRight,
  RefreshCw,
  CreditCard,
  Layers,
  Phone,
  CheckCircle2,
  Award,
  Search,
  Lock,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AdminStatsExt extends AdminStats {
  openTickets?: number;
  pendingAds?: number;
}

export default function AdminCoachesPage() {
  const { lang } = useI18n();
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingReject, setPendingReject] = useState<{ id: number; name: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);
  const [inspectCoach, setInspectCoach] = useState<any | null>(null);
  const [dossierTab, setDossierTab] = useState<"courses" | "activities" | "experience" | "cohorts" | "finances">("courses");
  const [activityFilter, setActivityFilter] = useState<string>("all");

  const authToken = token || localStorage.getItem("auth_token") || localStorage.getItem("tamayuz_token") || localStorage.getItem("token");

  // Fetch deep coach dossier
  const {
    data: coachDossier,
    isLoading: isLoadingDossier,
    refetch: refetchDossier
  } = useQuery({
    queryKey: ["admin", "coach", inspectCoach?.id, "dossier"],
    queryFn: async () => {
      if (!inspectCoach?.id) return null;
      const res = await fetch(`/api/admin/coaches/${inspectCoach.id}/dossier`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!res.ok) throw new Error("Erreur de chargement du dossier formateur");
      return res.json();
    },
    enabled: !!inspectCoach?.id,
  });

  // Form states for creating coach
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");

  const { data: coaches, isLoading } = useGetAdminCoaches();
  const { data: statsRaw } = useGetAdminStats();
  const stats = statsRaw as AdminStatsExt | undefined;
  const approveMutation = useApproveCoach();
  const rejectMutation = useRejectCoach();
  const verifyDiplomaMutation = useVerifyCoachDiploma();

  const toggleDiplomaVerified = (coachId: number, index: number, verified: boolean) => {
    verifyDiplomaMutation.mutate(
      { id: coachId, index, data: { verified } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAdminCoachesQueryKey() });
          toast({
            title: verified
              ? { ar: "تم التحقق من الشهادة", fr: "Diplôme vérifié", en: "Diploma verified" }[lang]
              : { ar: "تم إلغاء التحقق", fr: "Vérification retirée", en: "Verification removed" }[lang],
          });
        },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      }
    );
  };

  // Create Coach mutation
  const createCoachMutation = useMutation({
    mutationFn: async (newCoach: any) => {
      const res = await fetch("/api/admin/coaches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newCoach),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create coach");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetAdminCoachesQueryKey() });
      toast({
        title: {
          ar: "تم إنشاء حساب المدرب بنجاح",
          fr: "Compte coach créé avec succès",
          en: "Coach account created successfully"
        }[lang],
      });
      resetForm();
      setIsOpen(false);
    },
    onError: (err: any) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setBio("");
  };

  const handleApprove = (id: number, name: string) => {
    approveMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminCoachesQueryKey() });
        toast({ title: `${name} ${{ ar: "تمت الموافقة عليه", fr: "approuvée", en: "approved" }[lang]}` });
      },
      onError: () => toast({ title: "Erreur", variant: "destructive" }),
    });
  };

  const handleReject = (id: number, name: string) => {
    rejectMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminCoachesQueryKey() });
        toast({ title: `${name} ${{ ar: "تم رفضه", fr: "rejetée", en: "rejected" }[lang]}` });
        setPendingReject(null);
      },
      onError: () => {
        toast({ title: "Erreur", variant: "destructive" });
        setPendingReject(null);
      },
    });
  };

  const pending = coaches?.filter((c) => !c.isApproved) ?? [];
  const approved = coaches?.filter((c) => c.isApproved) ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCoachMutation.mutate({
      name,
      email,
      password,
      bio: bio || null,
    });
  };

  const CoachCard = ({ coach, showActions }: { coach: any; showActions: boolean }) => (
    <div className="flex flex-col gap-4 p-5 bg-white border border-border shadow-2xs rounded-xl hover:shadow-xs transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 bg-black">
            {coach.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-foreground text-sm">{coach.name}</span>
              {showActions ? (
                <Badge variant="warning">
                  {{ ar: "في انتظار الموافقة", fr: "En attente", en: "Pending" }[lang]}
                </Badge>
              ) : (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {{ ar: "موافق عليه", fr: "Approuvée", en: "Approved" }[lang]}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{coach.email}</span>
              {coach.createdAt && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(coach.createdAt).toLocaleDateString()}</span>}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setInspectCoach(coach)}
            className="h-8 gap-1.5 text-xs font-semibold border-border text-foreground hover:bg-neutral-100"
          >
            <Eye className="w-3.5 h-3.5 text-neutral-600" />
            {{ ar: "الملف الكامل", fr: "Consulter le dossier", en: "Full Dossier" }[lang]}
          </Button>

          {showActions && (
            <>
              <Button size="sm" className="gap-1.5 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white"
                onClick={() => handleApprove(coach.id, coach.name)}
                disabled={approveMutation.isPending}>
                <CheckCircle className="w-3.5 h-3.5" />
                {{ ar: "موافقة", fr: "Approuver", en: "Approve" }[lang]}
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs border-red-200 text-red-700 hover:bg-red-50 bg-red-50/30"
                onClick={() => setPendingReject({ id: coach.id, name: coach.name })}
                disabled={rejectMutation.isPending}>
                <XCircle className="w-3.5 h-3.5" />
                {{ ar: "رفض", fr: "Rejeter", en: "Reject" }[lang]}
              </Button>
            </>
          )}
        </div>
      </div>

      {coach.bio && (
        <p className="text-xs text-muted-foreground border-t border-border pt-3 mt-1 italic">
          "{coach.bio}"
        </p>
      )}

      {/* QUALIFICATIONS SUBMITTED AT REGISTRATION — shown for pending review, and kept visible after approval since a coach can add diplomas later */}
      {(coach.phone || coach.domain || (coach.diplomas?.length ?? 0) > 0 || (coach.priorTrainings?.length ?? 0) > 0 || coach.teachingPlan) && (
        <div className="border-t border-border pt-3 mt-1 space-y-2.5 bg-[#fafafa] p-3 rounded-lg">
          <div className="grid grid-cols-2 gap-3">
            {coach.phone && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">{{ ar: "الهاتف", fr: "Téléphone", en: "Phone" }[lang]}</span>
                <p className="text-xs text-foreground">{coach.phone}</p>
              </div>
            )}
            {coach.domain && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">{{ ar: "مجال التخصص", fr: "Spécialité", en: "Specialty" }[lang]}</span>
                <p className="text-xs text-foreground">{coach.domain}</p>
              </div>
            )}
          </div>
          {coach.diplomas?.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">{{ ar: "الشهادات (تحقق KYC)", fr: "Diplômes (vérification KYC)", en: "Diplomas (KYC verification)" }[lang]}</span>
              <ul className="space-y-1.5">
                {coach.diplomas.map((d: { name: string; documentUrl: string | null; verified: boolean }, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-foreground/80 bg-white border border-border rounded-lg px-2.5 py-1.5">
                    <span className="flex-1 truncate">{d.name}</span>
                    {d.documentUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewDoc({ url: d.documentUrl!, title: d.name })}
                        className="flex items-center gap-1 text-violet-600 hover:text-violet-700 font-semibold shrink-0"
                      >
                        <Eye className="w-3 h-3" />{{ ar: "معاينة", fr: "Aperçu", en: "Preview" }[lang]}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleDiplomaVerified(coach.id, i, !d.verified)}
                      disabled={verifyDiplomaMutation.isPending}
                      className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full shrink-0 transition-all disabled:opacity-50 ${
                        d.verified ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      {d.verified ? { ar: "تم التحقق", fr: "Vérifié", en: "Verified" }[lang] : { ar: "التحقق", fr: "Vérifier", en: "Verify" }[lang]}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {coach.priorTrainings?.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">{{ ar: "التكوينات السابقة", fr: "Formations antérieures", en: "Prior trainings" }[lang]}</span>
              <ul className="space-y-0.5">
                {coach.priorTrainings.map((t: string, i: number) => <li key={i} className="text-xs text-foreground/80">• {t}</li>)}
              </ul>
            </div>
          )}
          {coach.teachingPlan && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">{{ ar: "خطة النشر", fr: "Plan de publication", en: "Publishing plan" }[lang]}</span>
              <p className="text-xs text-foreground/80 leading-relaxed">{coach.teachingPlan}</p>
            </div>
          )}
        </div>
      )}

      {/* STATISTICS FOR EACH COACH */}
      {!showActions && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 border-t border-border pt-4 bg-[#fafafa] p-3 rounded-lg">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
              {{ ar: "الدورات", fr: "Cours", en: "Courses" }[lang]}
            </span>
            <p className="text-sm font-bold text-foreground">{coach.totalCourses ?? 0}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              {{ ar: "الطالبات", fr: "Étudiantes", en: "Students" }[lang]}
            </span>
            <p className="text-sm font-bold text-foreground">{coach.totalStudents ?? 0}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
              {{ ar: "إجمالي الأرباح", fr: "Gains Totaux", en: "Total Earnings" }[lang]}
            </span>
            <p className="text-sm font-bold text-foreground">
              {parseFloat(String(coach.totalCommissions ?? 0)).toLocaleString("fr-FR")} DZD
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
              {{ ar: "مستحقات غير مدفوعة", fr: "En attente versement", en: "Pending payout" }[lang]}
            </span>
            <p className={`text-sm font-bold ${parseFloat(String(coach.pendingCommissions ?? 0)) > 0 ? "text-amber-600" : "text-foreground"}`}>
              {parseFloat(String(coach.pendingCommissions ?? 0)).toLocaleString("fr-FR")} DZD
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout
      title={{ ar: "إدارة المدربات", fr: "Gestion des coaches", en: "Coach Management" }[lang]}
      subtitle={{ ar: "مراجعة وإدارة طلبات التسجيل كمدربة", fr: "Examiner et gérer les demandes de coaching", en: "Review and manage coach applications" }[lang]}
      stats={{ pendingCoaches: pending.length, openTickets: stats?.openTickets ?? 0, pendingAds: stats?.pendingAds ?? 0 }}
    >
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-bold text-foreground">
          {{ ar: "المدربات", fr: "Coaches", en: "Coaches" }[lang]}
        </h2>
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setIsOpen(false); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsOpen(true)} className="flex items-center gap-2 bg-black hover:bg-black/90 text-white font-bold">
              <Plus className="w-4 h-4" />
              {{ ar: "إضافة مدربة", fr: "Créer une coach", en: "Create Coach" }[lang]}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-white border border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {{ ar: "إنشاء حساب مدربة جديد", fr: "Créer un nouveau compte coach", en: "Create New Coach Account" }[lang]}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-foreground">{{ ar: "الاسم الكامل", fr: "Nom complet", en: "Full name" }[lang]}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Fatima Zohra"
                  required
                  className="bg-white border-border text-foreground"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email" className="text-foreground">{{ ar: "البريد الإلكتروني", fr: "Adresse e-mail", en: "Email address" }[lang]}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="fatima@tamayuz.com"
                  required
                  className="bg-white border-border text-foreground"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pass" className="text-foreground">{{ ar: "كلمة المرور", fr: "Mot de passe", en: "Password" }[lang]}</Label>
                <Input
                  id="pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-white border-border text-foreground"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bio" className="text-foreground">{{ ar: "السيرة الذاتية", fr: "Biographie / Bio", en: "Biography" }[lang]}</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Description..."
                  className="bg-white border-border text-foreground"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="border-border text-foreground">
                  {{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}
                </Button>
                <Button type="submit" disabled={createCoachMutation.isPending}>
                  {createCoachMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {{ ar: "إنشاء الحساب", fr: "Créer le compte", en: "Create Account" }[lang]}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
            <AlertCircle className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-foreground text-base">
            {{ ar: "في انتظار الموافقة", fr: "En attente d'approbation", en: "Pending Approval" }[lang]}
            <span className="ml-2 text-amber-600">({pending.length})</span>
          </h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : pending.length === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold">{{ ar: "لا توجد طلبات في انتظار", fr: "Aucune demande en attente", en: "No pending applications" }[lang]}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((coach) => <CoachCard key={coach.id} coach={coach} showActions />)}
          </div>
        )}
      </section>

      {/* Approved */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
            <GraduationCap className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-foreground text-base">
            {{ ar: "المدربات الموافق عليهن", fr: "Coaches approuvées", en: "Approved Coaches" }[lang]}
            <span className="ml-2 text-muted-foreground">({approved.length})</span>
          </h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : approved.length === 0 ? (
          <div className="text-center py-10 bg-white border border-border shadow-2xs rounded-xl">
            <User className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm font-medium">{{ ar: "لا توجد مدربات موافق عليهن", fr: "Aucune coach approuvée", en: "No approved coaches yet" }[lang]}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {approved.map((coach) => <CoachCard key={coach.id} coach={coach} showActions={false} />)}
          </div>
        )}
      </section>

      <AlertDialog open={!!pendingReject} onOpenChange={(open) => !open && setPendingReject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {{ ar: "رفض طلب هذه المدربة؟", fr: "Rejeter cette candidature ?", en: "Reject this coach application?" }[lang]}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {{
                ar: `سيتم رفض طلب انضمام ${pendingReject?.name ?? ""}. يمكنكِ كتابة سبب الرفض ليتم إرساله للمدربة.`,
                fr: `La candidature de ${pendingReject?.name ?? ""} sera refusée. Précisez le motif du rejet ci-dessous.`,
                en: `${pendingReject?.name ?? ""}'s application will be rejected. Specify the reason below.`,
              }[lang]}
            </AlertDialogDescription>
            <div className="pt-2">
              <label className="text-xs font-semibold text-foreground block mb-1">
                {{ ar: "سبب الرفض الموجه للمدربة", fr: "Motif du refus", en: "Rejection reason" }[lang]}
              </label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={{ ar: "مثال: يرجى إرفاق نسخة أوضح من الشهادة الجامعية...", fr: "Ex: Justificatif de diplôme illisible ou incomplet...", en: "Reason for rejection..." }[lang]}
                className="text-xs h-20 bg-white"
              />
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rejectMutation.isPending}>{{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingReject) {
                  handleReject(pendingReject.id, pendingReject.name);
                  setRejectionReason("");
                }
              }}
              disabled={rejectMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {rejectMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {{ ar: "تأكيد الرفض وإرسال التوضيح", fr: "Confirmer le rejet", en: "Confirm Rejection" }[lang]}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Integrated Diploma/Proof Viewer Modal */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold truncate" style={{ fontFamily: "Cairo, sans-serif" }}>
              <FileText className="w-4 h-4 text-violet-600" />
              {previewDoc?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full min-h-[400px] border border-border rounded-xl overflow-hidden bg-neutral-900 flex items-center justify-center p-2">
            {previewDoc?.url.endsWith(".pdf") ? (
              <iframe src={previewDoc.url} className="w-full h-full min-h-[450px] rounded-lg" style={{ border: "none" }} />
            ) : (
              <img src={previewDoc?.url} alt={previewDoc?.title} className="max-w-full max-h-[500px] object-contain rounded-lg" />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <a href={previewDoc?.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-foreground">
              <ExternalLink className="w-3.5 h-3.5" /> {{ ar: "فتح في نافذة جديدة", fr: "Ouvrir dans un nouvel onglet", en: "Open in new tab" }[lang]}
            </a>
            <Button onClick={() => setPreviewDoc(null)} size="sm" className="bg-black hover:bg-black/90 text-white text-xs">
              {{ ar: "إغلاق", fr: "Fermer", en: "Close" }[lang]}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Institutional Coach Profile & Activities Dossier Modal */}
      <Dialog open={!!inspectCoach} onOpenChange={(open) => { if (!open) { setInspectCoach(null); setDossierTab("courses"); } }}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] bg-white border border-border p-0 overflow-hidden shadow-2xl rounded-2xl flex flex-col">
          {inspectCoach && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800 shrink-0">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-200 border border-neutral-700">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {{ ar: "الملف الأكاديمي والمهني للمدرب", fr: "Dossier Pédagogique & Activités", en: "Academic & Activity Dossier" }[lang]}
                    </span>
                    <span className="font-mono text-xs text-neutral-400">ID #{inspectCoach.id}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchDossier()}
                      className="bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700 hover:text-white h-7.5 w-7.5 p-0 rounded-lg"
                      title="Actualiser les données"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>

                    <Badge variant={inspectCoach.isApproved ? "success" : "warning"} className="text-xs">
                      {inspectCoach.isApproved
                        ? { ar: "معتمد ومفعل", fr: "Formatrice Agréée", en: "Approved" }[lang]
                        : { ar: "قيد فحص الملف", fr: "En cours d'agrément", en: "Pending Approval" }[lang]}
                    </Badge>

                    {inspectCoach.isApproved ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPendingReject({ id: inspectCoach.id, name: inspectCoach.name });
                        }}
                        className="h-7.5 text-xs font-bold border-rose-900/60 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 rounded-lg"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        {{ ar: "تعليق الاعتماد", fr: "Suspendre l'agrément", en: "Suspend" }[lang]}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          handleApprove(inspectCoach.id, inspectCoach.name);
                          setInspectCoach({ ...inspectCoach, isApproved: true });
                        }}
                        disabled={approveMutation.isPending}
                        className="h-7.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-2xs"
                      >
                        {approveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3.5 h-3.5 mr-1" />}
                        {{ ar: "اعتماد المدرب رسميًا", fr: "Valider l'agrément", en: "Approve Coach" }[lang]}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {inspectCoach.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-xl font-bold tracking-tight text-white truncate">
                      {inspectCoach.name}
                    </DialogTitle>
                    <div className="flex items-center gap-4 mt-1 text-xs text-neutral-300 flex-wrap">
                      <span className="flex items-center gap-1 font-mono text-neutral-300">
                        <Mail className="w-3.5 h-3.5" /> {inspectCoach.email}
                      </span>
                      {inspectCoach.phone && (
                        <span className="font-mono text-neutral-300 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-neutral-400" /> {inspectCoach.phone}
                        </span>
                      )}
                      {inspectCoach.domain && (
                        <span className="text-neutral-300 bg-neutral-800 px-2.5 py-0.5 rounded-full border border-neutral-700 font-semibold">
                          {inspectCoach.domain}
                        </span>
                      )}
                      <span className="text-neutral-400 text-[11px]">
                        Inscrit(e) le {inspectCoach.createdAt ? new Date(inspectCoach.createdAt).toLocaleDateString("fr-FR") : "Date inconnue"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="bg-neutral-50 border-b border-border px-6 py-2.5 flex items-center gap-2 shrink-0 overflow-x-auto">
                {[
                  {
                    id: "courses",
                    label: "Formations & Sujets Déposés",
                    icon: BookOpen,
                    count: coachDossier?.courses?.length ?? inspectCoach.totalCourses ?? 0
                  },
                  {
                    id: "activities",
                    label: "Traçabilité & Activités",
                    icon: Activity,
                    count: coachDossier?.activities?.length ?? 0
                  },
                  {
                    id: "experience",
                    label: "Expérience, Titres & KYC",
                    icon: ShieldCheck,
                    count: coachDossier?.coach?.diplomas?.length ?? inspectCoach.diplomas?.length ?? 0
                  },
                  {
                    id: "cohorts",
                    label: "Cohortes d'Étudiantes",
                    icon: Users,
                    count: coachDossier?.cohorts?.length ?? inspectCoach.totalStudents ?? 0
                  },
                  {
                    id: "finances",
                    label: "Rémunération & Versements",
                    icon: DollarSign,
                    count: coachDossier?.payouts?.length ?? 0
                  },
                ].map((t) => {
                  const IconComp = t.icon;
                  const isActive = dossierTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setDossierTab(t.id as any)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                        isActive
                          ? "bg-white text-neutral-900 border border-neutral-300 shadow-2xs"
                          : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border border-transparent"
                      }`}
                    >
                      <IconComp className={`w-3.5 h-3.5 ${isActive ? "text-neutral-900" : "text-neutral-500"}`} />
                      <span>{t.label}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        isActive ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-700"
                      }`}>
                        {t.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Body */}
              <div className="p-6 space-y-6 flex-1 overflow-y-auto text-xs">
                {isLoadingDossier ? (
                  <div className="flex flex-col items-center justify-center py-24 space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-neutral-700" />
                    <p className="text-xs text-muted-foreground font-semibold">
                      Chargement de l'historique complet et des sujets déposés...
                    </p>
                  </div>
                ) : (
                  <>
                    {/* TAB 1: COURSES & SUBJECTS UPLOADED */}
                    {dossierTab === "courses" && (
                      <div className="space-y-6">
                        {/* KPI Bar */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-neutral-50 border border-border p-3.5 rounded-xl shadow-2xs">
                            <span className="text-muted-foreground font-bold text-[10px] uppercase block">
                              Formations Déposées
                            </span>
                            <div className="text-xl font-black text-foreground mt-1">
                              {coachDossier?.stats?.totalCourses ?? inspectCoach.totalCourses ?? 0}
                            </div>
                          </div>

                          <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-xl shadow-2xs">
                            <span className="text-emerald-800 font-bold text-[10px] uppercase block">
                              Formations Publiées
                            </span>
                            <div className="text-xl font-black text-emerald-950 mt-1">
                              {coachDossier?.stats?.publishedCourses ?? 0}
                            </div>
                          </div>

                          <div className="bg-blue-50/70 border border-blue-200/80 p-3.5 rounded-xl shadow-2xs">
                            <span className="text-blue-800 font-bold text-[10px] uppercase block">
                              Modules & Leçons Déposées
                            </span>
                            <div className="text-xl font-black text-blue-950 mt-1">
                              {coachDossier?.stats?.totalLessons ?? 0} leçons
                            </div>
                          </div>

                          <div className="bg-neutral-900 text-white p-3.5 rounded-xl shadow-2xs">
                            <span className="text-neutral-400 font-bold text-[10px] uppercase block">
                              Chiffre d'Affaires Généré
                            </span>
                            <div className="text-xl font-black text-white mt-1">
                              {parseFloat(String(coachDossier?.courses?.reduce((acc: number, c: any) => acc + (c.revenueGenerated || 0), 0) || 0)).toLocaleString("fr-DZ")} DZD
                            </div>
                          </div>
                        </div>

                        {/* Courses list */}
                        <div className="space-y-3">
                          <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center justify-between">
                            <span>Catalogue des sujets et cours enseignés par {inspectCoach.name}</span>
                            <span className="text-muted-foreground font-normal">
                              {coachDossier?.courses?.length ?? 0} formation(s) enregistrée(s)
                            </span>
                          </h4>

                          {!coachDossier?.courses || coachDossier.courses.length === 0 ? (
                            <div className="p-10 text-center bg-neutral-50 border border-border rounded-xl space-y-2">
                              <BookOpen className="w-9 h-9 text-muted-foreground/30 mx-auto" />
                              <p className="text-xs font-bold text-foreground">
                                Aucun sujet ou cours déposé pour le moment.
                              </p>
                              <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
                                Ce formateur n'a pas encore soumis de formation. Dès qu'un cours est créé ou soumis pour validation, ses détails apparaîtront automatiquement ici.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {coachDossier.courses.map((course: any) => (
                                <div
                                  key={course.id}
                                  className="p-4 bg-white border border-border rounded-xl shadow-2xs hover:border-neutral-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                                >
                                  <div className="flex items-start gap-3.5 min-w-0">
                                    <div className="w-11 h-11 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 text-neutral-800">
                                      <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <h5 className="font-bold text-foreground text-sm truncate">
                                          {course.title}
                                        </h5>
                                        <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                          course.isPublished
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-amber-50 text-amber-700 border-amber-200"
                                        }`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${course.isPublished ? "bg-emerald-500" : "bg-amber-500"}`} />
                                          {course.isPublished ? "Publiée au catalogue" : "Brouillon"}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-3 text-muted-foreground text-[11px] flex-wrap">
                                        <span className="font-semibold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200/60">
                                          {course.category}
                                        </span>
                                        {course.level && <span>Niveau : {course.level}</span>}
                                        <span className="flex items-center gap-1 font-semibold text-neutral-700">
                                          <Users className="w-3 h-3" />
                                          {course.enrollmentCount} inscrite(s)
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Layers className="w-3 h-3" />
                                          {course.lessonsCount} leçon(s) · {course.chaptersCount} chapitre(s)
                                        </span>
                                        {course.durationHours && (
                                          <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {course.durationHours}h
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                    <div className="text-right">
                                      <div className="font-bold text-foreground text-xs">
                                        {course.isFree ? "Gratuit" : `${parseFloat(String(course.price)).toLocaleString("fr-DZ")} ${course.currency}`}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground font-mono">
                                        Total : {parseFloat(String(course.revenueGenerated || 0)).toLocaleString("fr-DZ")} DZD
                                      </div>
                                    </div>
                                    <a
                                      href="/admin/courses"
                                      className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800"
                                    >
                                      Inspecter <ArrowUpRight className="w-3 h-3" />
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Price requests if any */}
                        {coachDossier?.priceRequests && coachDossier.priceRequests.length > 0 && (
                          <div className="space-y-3 pt-4 border-t border-border">
                            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <DollarSign className="w-3.5 h-3.5 text-neutral-600" />
                                Demandes de révision tarifaire ({coachDossier.priceRequests.length})
                              </span>
                              <span className="text-[11px] text-muted-foreground font-normal">Arbitrage Superadmin</span>
                            </h4>
                            <div className="space-y-2">
                              {coachDossier.priceRequests.map((pr: any) => (
                                <div key={pr.id} className="p-3.5 bg-neutral-50 border border-border rounded-xl flex items-start justify-between gap-3 text-xs">
                                  <div>
                                    <div className="font-bold text-foreground">{pr.courseTitle}</div>
                                    <div className="flex items-center gap-2 mt-1 text-muted-foreground text-[11px]">
                                      <span>Tarif actuel : <strong className="text-foreground">{pr.currentPrice} {pr.currency}</strong></span>
                                      <span>→</span>
                                      <span>Tarif sollicité : <strong className="text-foreground">{pr.requestedPrice} {pr.currency}</strong></span>
                                    </div>
                                    {pr.justification && (
                                      <p className="mt-1.5 text-[11px] text-neutral-700 italic bg-white p-2 rounded border border-border/80">
                                        "{pr.justification}"
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      pr.status === "approved"
                                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                        : pr.status === "rejected"
                                        ? "bg-rose-50 text-rose-800 border border-rose-200"
                                        : "bg-amber-50 text-amber-800 border border-amber-200"
                                    }`}>
                                      {pr.status === "approved" ? "Approuvé" : pr.status === "rejected" ? "Refusé" : "En cours d'examen"}
                                    </span>
                                    <div className="text-[10px] text-muted-foreground mt-1">
                                      {pr.createdAt ? new Date(pr.createdAt).toLocaleDateString("fr-FR") : ""}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Announcements if any */}
                        {coachDossier?.announcements && coachDossier.announcements.length > 0 && (
                          <div className="space-y-3 pt-4 border-t border-border">
                            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-neutral-600" />
                              Annonces pédagogiques publiées par le formateur ({coachDossier.announcements.length})
                            </h4>
                            <div className="space-y-2">
                              {coachDossier.announcements.map((an: any) => (
                                <div key={an.id} className="p-3.5 bg-neutral-50 border border-border rounded-xl text-xs space-y-1">
                                  <div className="flex items-center justify-between">
                                    <div className="font-bold text-foreground">{an.title}</div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {an.createdAt ? new Date(an.createdAt).toLocaleDateString("fr-FR") : ""}
                                    </div>
                                  </div>
                                  <p className="text-muted-foreground text-xs leading-relaxed">{an.content}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 2: AUDIT TRAIL & ACTIVITIES */}
                    {dossierTab === "activities" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
                            <Activity className="w-4 h-4 text-neutral-700" />
                            Historique chronologique des actions et opérations
                          </h4>
                          <span className="text-muted-foreground text-xs">
                            {coachDossier?.activities?.length || 0} événement(s) tracés
                          </span>
                        </div>

                        {!coachDossier?.activities || coachDossier.activities.length === 0 ? (
                          <div className="p-8 text-center bg-neutral-50 border border-border rounded-xl">
                            <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">Aucune activité enregistrée pour ce compte.</p>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {coachDossier.activities.map((act: any) => (
                              <div
                                key={act.id}
                                className="p-3.5 bg-white border border-border rounded-xl shadow-2xs flex items-start justify-between gap-3"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 mt-0.5">
                                    <Activity className="w-3.5 h-3.5 text-neutral-700" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200/70">
                                        {act.action}
                                      </span>
                                      <span className="font-bold text-foreground text-xs">
                                        {act.action === "PUBLISH_COURSE" && "Publication officielle d'une formation"}
                                        {act.action === "CREATE_COURSE" && "Création d'un nouveau cours"}
                                        {act.action === "LOGIN" && "Connexion sécurisée à la plateforme"}
                                        {act.action === "REGISTER" && "Inscription initiale sur Tamayuz"}
                                        {act.action === "APPROVE_COACH" && "Validation officielle de l'agrément coach"}
                                        {act.action === "REJECT_COACH" && "Suspension ou demande de compléments de dossier"}
                                        {act.action === "COACH_PORTFOLIO_INITIALIZED" && "Initialisation du portfolio pédagogique"}
                                        {!["PUBLISH_COURSE", "CREATE_COURSE", "LOGIN", "REGISTER", "APPROVE_COACH", "REJECT_COACH", "COACH_PORTFOLIO_INITIALIZED"].includes(act.action) && act.action}
                                      </span>
                                    </div>

                                    {act.details && (
                                      <div className="mt-1 text-xs text-muted-foreground">
                                        {typeof act.details === "object" ? (
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {act.details.title && <span className="font-medium text-foreground">"{act.details.title}"</span>}
                                            {act.details.category && <span>· Catégorie : {act.details.category}</span>}
                                            {act.details.price && <span>· Tarif : {act.details.price}</span>}
                                            {act.details.reason && <span className="italic text-rose-700">· Motif : {act.details.reason}</span>}
                                          </div>
                                        ) : (
                                          <span>{String(act.details)}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right shrink-0 text-muted-foreground font-mono text-[11px]">
                                  <div>{new Date(act.timestamp).toLocaleDateString("fr-FR")}</div>
                                  <div className="text-[10px] text-neutral-400">
                                    {new Date(act.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 3: BACKGROUND, DIPLOMAS & KYC */}
                    {dossierTab === "experience" && (
                      <div className="space-y-6">
                        {/* Biography */}
                        <div className="space-y-1.5">
                          <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5 uppercase tracking-wider">
                            <BookOpen className="w-3.5 h-3.5 text-neutral-600" />
                            Biographie et parcours professionnel :
                          </h4>
                          <div className="p-4 bg-neutral-50 border border-border rounded-xl text-neutral-700 leading-relaxed italic text-xs">
                            "{coachDossier?.coach?.bio || inspectCoach.bio || "Aucune biographie rédigée pour le moment."}"
                          </div>
                        </div>

                        {/* Diplomas & KYC Certifications */}
                        <div className="space-y-3">
                          <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5 uppercase tracking-wider">
                            <ShieldCheck className="w-3.5 h-3.5 text-neutral-600" />
                            Titres universitaires et accréditations professionnelles (Vérification KYC) :
                          </h4>

                          {((coachDossier?.coach?.diplomas || inspectCoach.diplomas) && (coachDossier?.coach?.diplomas || inspectCoach.diplomas).length > 0) ? (
                            <ul className="space-y-2.5">
                              {(coachDossier?.coach?.diplomas || inspectCoach.diplomas).map((d: any, idx: number) => (
                                <li key={idx} className="flex items-center justify-between p-3.5 bg-white border border-border rounded-xl shadow-2xs">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
                                      <GraduationCap className="w-4 h-4 text-neutral-700" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-bold text-foreground truncate">{d.name}</div>
                                      <div className="text-[11px] text-muted-foreground">
                                        {d.school || d.institution || "Établissement académique certifié"} {d.year ? `· Promotion ${d.year}` : ""}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {d.documentUrl && (
                                      <button
                                        type="button"
                                        onClick={() => setPreviewDoc({ url: d.documentUrl, title: d.name })}
                                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-border hover:bg-neutral-50 text-neutral-700"
                                      >
                                        <Eye className="w-3 h-3" /> Visualiser
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => toggleDiplomaVerified(inspectCoach.id, idx, !d.verified)}
                                      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${
                                        d.verified
                                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                                          : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                                      }`}
                                    >
                                      {d.verified ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-amber-600" />}
                                      {d.verified ? "Authentifié" : "En cours d'audit (Valider)"}
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-muted-foreground p-4 bg-neutral-50 rounded-xl border border-border">
                              Aucun diplôme ou justificatif joint au dossier d'inscription.
                            </p>
                          )}
                        </div>

                        {/* Teaching Plan */}
                        {(coachDossier?.coach?.teachingPlan || inspectCoach.teachingPlan) && (
                          <div className="space-y-1.5">
                            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">
                              Plan de déploiement et méthodologie pédagogique :
                            </h4>
                            <p className="p-4 bg-neutral-50 border border-border rounded-xl text-neutral-700 leading-relaxed text-xs">
                              {coachDossier?.coach?.teachingPlan || inspectCoach.teachingPlan}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 4: COHORTS & STUDENTS TAUGHT */}
                    {dossierTab === "cohorts" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
                            <Users className="w-4 h-4 text-neutral-700" />
                            Étudiantes inscrites aux formations de {inspectCoach.name}
                          </h4>
                          <span className="text-muted-foreground text-xs">
                            {coachDossier?.cohorts?.length || 0} inscription(s) globale(s)
                          </span>
                        </div>

                        {!coachDossier?.cohorts || coachDossier.cohorts.length === 0 ? (
                          <div className="p-10 text-center bg-neutral-50 border border-border rounded-xl space-y-2">
                            <Users className="w-9 h-9 text-muted-foreground/30 mx-auto" />
                            <p className="text-xs font-bold text-foreground">
                              Aucune étudiante inscrite pour le moment.
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Les inscriptions et assiduités apparaîtront dès que les cours du formateur recevront des étudiantes.
                            </p>
                          </div>
                        ) : (
                          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-2xs">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-neutral-50 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                  <tr>
                                    <th className="p-3">Apprenante</th>
                                    <th className="p-3">Formation Suivie</th>
                                    <th className="p-3">Date Inscription</th>
                                    <th className="p-3">Progression</th>
                                    <th className="p-3">Statut</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {coachDossier.cohorts.map((s: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-neutral-50/60 transition-colors">
                                      <td className="p-3">
                                        <div className="flex items-center gap-2">
                                          {s.avatarUrl ? (
                                            <img src={s.avatarUrl} alt={s.name} className="w-7 h-7 rounded-full object-cover border" />
                                          ) : (
                                            <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
                                              {s.name?.charAt(0)}
                                            </div>
                                          )}
                                          <div>
                                            <div className="font-bold text-foreground">{s.name}</div>
                                            <div className="text-[10px] text-muted-foreground">{s.email}</div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="p-3 font-medium text-foreground">{s.courseTitle}</td>
                                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                                        {s.enrolledAt ? new Date(s.enrolledAt).toLocaleDateString("fr-FR") : "N/A"}
                                      </td>
                                      <td className="p-3 min-w-32">
                                        <div className="space-y-1">
                                          <div className="flex justify-between text-[10px] font-bold">
                                            <span>{s.progressPercent}%</span>
                                            <span className="text-muted-foreground">{s.completedLessons}/{s.totalLessons}</span>
                                          </div>
                                          <Progress value={s.progressPercent} className="h-1.5" />
                                        </div>
                                      </td>
                                      <td className="p-3 whitespace-nowrap">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          s.isCompleted
                                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                            : s.progressPercent > 0
                                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                                            : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                                        }`}>
                                          {s.isCompleted ? "Terminé" : s.progressPercent > 0 ? "En cours" : "Non débuté"}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 5: FINANCIALS & PAYOUTS */}
                    {dossierTab === "finances" && (
                      <div className="space-y-6">
                        {/* Financial KPIs */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-neutral-50 border border-border p-4 rounded-xl shadow-2xs">
                            <span className="text-muted-foreground font-bold text-[10px] uppercase block">
                              Commissions Totales Cumulées
                            </span>
                            <div className="text-xl font-black text-foreground mt-1 font-mono">
                              {parseFloat(String(coachDossier?.stats?.totalCommissions ?? inspectCoach.totalCommissions ?? 0)).toLocaleString("fr-DZ")} DZD
                            </div>
                          </div>

                          <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-xl shadow-2xs">
                            <span className="text-emerald-800 font-bold text-[10px] uppercase block">
                              Versements Effectués (Payés)
                            </span>
                            <div className="text-xl font-black text-emerald-950 mt-1 font-mono">
                              {parseFloat(String(coachDossier?.stats?.paidCommissions ?? inspectCoach.paidCommissions ?? 0)).toLocaleString("fr-DZ")} DZD
                            </div>
                          </div>

                          <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-xl shadow-2xs">
                            <span className="text-amber-800 font-bold text-[10px] uppercase block">
                              Solde Disponible en Attente
                            </span>
                            <div className="text-xl font-black text-amber-950 mt-1 font-mono">
                              {parseFloat(String(coachDossier?.stats?.pendingCommissions ?? inspectCoach.pendingCommissions ?? 0)).toLocaleString("fr-DZ")} DZD
                            </div>
                          </div>
                        </div>

                        {/* Payout records */}
                        <div className="space-y-3">
                          <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center justify-between">
                            <span>Historique des demandes de versements</span>
                            <a href="/admin/payouts" className="text-xs font-bold text-neutral-800 hover:underline inline-flex items-center gap-1">
                              Accéder au module versements <ArrowUpRight className="w-3 h-3" />
                            </a>
                          </h4>

                          {!coachDossier?.payouts || coachDossier.payouts.length === 0 ? (
                            <div className="p-8 text-center bg-neutral-50 border border-border rounded-xl">
                              <DollarSign className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                              <p className="text-xs text-muted-foreground">Aucun versement ou demande de retrait pour ce formateur.</p>
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              {coachDossier.payouts.map((p: any) => (
                                <div key={p.id} className="p-3.5 bg-white border border-border rounded-xl shadow-2xs flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center font-bold text-xs">
                                      <CreditCard className="w-4 h-4 text-neutral-700" />
                                    </div>
                                    <div>
                                      <div className="font-bold text-foreground text-sm font-mono">
                                        {parseFloat(String(p.amount)).toLocaleString("fr-DZ")} {p.currency}
                                      </div>
                                      <div className="text-[11px] text-muted-foreground">
                                        Méthode : <span className="uppercase font-semibold">{p.paymentMethod || "BaridiMob / CCP"}</span> · Réf : {p.referenceNumber || "En attente"}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                      p.status === "processed" || p.status === "completed"
                                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                        : "bg-amber-50 text-amber-800 border border-amber-200"
                                    }`}>
                                      {p.status === "processed" || p.status === "completed" ? "Traité avec succès" : "En attente de traitement"}
                                    </span>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString("fr-FR") : ""}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Granular Commissions Ledger */}
                        {coachDossier?.commissionsList && coachDossier.commissionsList.length > 0 && (
                          <div className="space-y-3 pt-4 border-t border-border">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                                <DollarSign className="w-3.5 h-3.5 text-neutral-600" />
                                Relevé granulaire des commissions par inscription ({coachDossier.commissionsList.length})
                              </h4>
                              <span className="text-[11px] text-muted-foreground font-mono">
                                Total généré : {parseFloat(String(coachDossier.stats?.totalCommissions || 0)).toLocaleString("fr-DZ")} DZD
                              </span>
                            </div>

                            <div className="bg-white border border-border rounded-xl overflow-hidden shadow-2xs">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-neutral-50 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                    <tr>
                                      <th className="p-3">Formation</th>
                                      <th className="p-3">Apprenante</th>
                                      <th className="p-3">Date</th>
                                      <th className="p-3">Taux appliqué</th>
                                      <th className="p-3">Montant perçu</th>
                                      <th className="p-3">Statut versement</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {coachDossier.commissionsList.map((cm: any) => (
                                      <tr key={cm.id} className="hover:bg-neutral-50/60 transition-colors">
                                        <td className="p-3 font-semibold text-foreground">{cm.courseTitle}</td>
                                        <td className="p-3 text-muted-foreground">
                                          <div className="font-medium text-foreground">{cm.studentName || "Étudiante"}</div>
                                          <div className="text-[10px] text-neutral-400">{cm.studentEmail}</div>
                                        </td>
                                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                                          {cm.createdAt ? new Date(cm.createdAt).toLocaleDateString("fr-FR") : "N/A"}
                                        </td>
                                        <td className="p-3 font-mono font-bold text-neutral-700">{cm.ratePercent}%</td>
                                        <td className="p-3 font-mono font-bold text-emerald-800">
                                          +{parseFloat(String(cm.amount)).toLocaleString("fr-DZ")} {cm.currency}
                                        </td>
                                        <td className="p-3 whitespace-nowrap">
                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            cm.isPaid
                                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                              : "bg-amber-50 text-amber-800 border border-amber-200"
                                          }`}>
                                            {cm.isPaid ? "Payé (Versé)" : "En attente de versement"}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border bg-neutral-50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Dossier formateur certifié Tamayuz</span>
                </div>
                <Button onClick={() => setInspectCoach(null)} size="sm" variant="outline" className="text-xs font-semibold bg-white">
                  {{ ar: "إغلاق", fr: "Fermer le dossier", en: "Close" }[lang]}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
