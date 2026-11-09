import { useState } from "react";
import { useGetAdminCoaches, useApproveCoach, useRejectCoach, useVerifyCoachDiploma, useGetAdminStats, getGetAdminCoachesQueryKey, type AdminStats } from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

      {/* Full Institutional Coach Profile Modal */}
      <Dialog open={!!inspectCoach} onOpenChange={(open) => !open && setInspectCoach(null)}>
        <DialogContent className="max-w-3xl bg-white border border-border p-0 overflow-hidden shadow-2xl rounded-2xl">
          {inspectCoach && (
            <div>
              {/* Header */}
              <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-200 border border-neutral-700">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {{ ar: "الملف الأكاديمي والمهني", fr: "Dossier Pédagogique Officiel", en: "Academic Dossier" }[lang]}
                    </span>
                    <span className="font-mono text-xs text-neutral-400">ID #{inspectCoach.id}</span>
                  </div>
                  <Badge variant={inspectCoach.isApproved ? "success" : "warning"} className="text-xs">
                    {inspectCoach.isApproved
                      ? { ar: "معتمد ومفعل", fr: "Formatrice Agréée", en: "Approved" }[lang]
                      : { ar: "قيد فحص الملف", fr: "En cours d'agrément", en: "Pending Approval" }[lang]}
                  </Badge>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {inspectCoach.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold tracking-tight text-white">
                      {inspectCoach.name}
                    </DialogTitle>
                    <div className="flex items-center gap-4 mt-1 text-xs text-neutral-300 flex-wrap">
                      <span className="flex items-center gap-1 font-mono text-neutral-300">
                        <Mail className="w-3.5 h-3.5" /> {inspectCoach.email}
                      </span>
                      {inspectCoach.phone && (
                        <span className="font-mono text-neutral-300">Tél : {inspectCoach.phone}</span>
                      )}
                      {inspectCoach.domain && (
                        <span className="text-neutral-300 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                          {inspectCoach.domain}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto text-xs">
                {/* Teaching Performance KPI */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-neutral-50 border border-border p-3.5 rounded-xl">
                    <span className="text-muted-foreground font-semibold text-[10px] uppercase block">Formations Actives</span>
                    <p className="text-base font-black text-neutral-900 font-mono mt-0.5">{inspectCoach.totalCourses ?? 0}</p>
                  </div>
                  <div className="bg-neutral-50 border border-border p-3.5 rounded-xl">
                    <span className="text-muted-foreground font-semibold text-[10px] uppercase block">Étudiantes Formées</span>
                    <p className="text-base font-black text-neutral-900 font-mono mt-0.5">{inspectCoach.totalStudents ?? 0}</p>
                  </div>
                  <div className="bg-neutral-50 border border-border p-3.5 rounded-xl">
                    <span className="text-muted-foreground font-semibold text-[10px] uppercase block">Commissions Générées</span>
                    <p className="text-base font-black text-neutral-900 font-mono mt-0.5">
                      {parseFloat(String(inspectCoach.totalCommissions ?? 0)).toLocaleString("fr-DZ")} DZD
                    </p>
                  </div>
                  <div className="bg-neutral-50 border border-border p-3.5 rounded-xl">
                    <span className="text-muted-foreground font-semibold text-[10px] uppercase block">Solde en Attente</span>
                    <p className={`text-base font-black font-mono mt-0.5 ${parseFloat(String(inspectCoach.pendingCommissions ?? 0)) > 0 ? "text-amber-800" : "text-neutral-900"}`}>
                      {parseFloat(String(inspectCoach.pendingCommissions ?? 0)).toLocaleString("fr-DZ")} DZD
                    </p>
                  </div>
                </div>

                {/* Biography & Vision */}
                <div className="space-y-1.5">
                  <h4 className="font-bold text-neutral-900 text-xs flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-neutral-600" />
                    Biographie et parcours professionnel :
                  </h4>
                  <div className="p-3.5 bg-neutral-50 border border-border rounded-xl text-neutral-700 leading-relaxed italic">
                    "{inspectCoach.bio || "Aucune biographie rédigée pour le moment."}"
                  </div>
                </div>

                {/* Diplomas & KYC Certifications */}
                <div className="space-y-2">
                  <h4 className="font-bold text-neutral-900 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-neutral-600" />
                    Titres universitaires et accréditations professionnelles (Vérification KYC) :
                  </h4>

                  {inspectCoach.diplomas && inspectCoach.diplomas.length > 0 ? (
                    <ul className="space-y-2">
                      {inspectCoach.diplomas.map((d: any, idx: number) => (
                        <li key={idx} className="flex items-center justify-between p-3 bg-white border border-border rounded-xl">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <GraduationCap className="w-4 h-4 text-neutral-600 shrink-0" />
                            <span className="font-medium text-neutral-900 truncate">{d.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {d.documentUrl && (
                              <button
                                type="button"
                                onClick={() => setPreviewDoc({ url: d.documentUrl, title: d.name })}
                                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded border border-border hover:bg-neutral-50 text-neutral-700"
                              >
                                <Eye className="w-3 h-3" /> Visualiser
                              </button>
                            )}
                            <Badge variant={d.verified ? "success" : "warning"} className="text-[10px]">
                              {d.verified ? "Authentifié" : "En cours d'audit"}
                            </Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground p-3 bg-neutral-50 rounded-xl border border-border">
                      Aucun diplôme ou justificatif joint au dossier d'inscription.
                    </p>
                  )}
                </div>

                {/* Teaching Plan */}
                {inspectCoach.teachingPlan && (
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-neutral-900 text-xs">Plan de déploiement et méthodologie :</h4>
                    <p className="p-3 bg-neutral-50 border border-border rounded-xl text-neutral-700 leading-relaxed">
                      {inspectCoach.teachingPlan}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border bg-neutral-50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <a
                    href={`/coach/students`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-900 underline"
                  >
                    Voir ses cohortes d'étudiantes
                  </a>
                  <span className="text-neutral-300">·</span>
                  <a
                    href={`/admin/payouts`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-900 underline"
                  >
                    Gérer ses versements
                  </a>
                </div>
                <Button onClick={() => setInspectCoach(null)} size="sm" variant="outline" className="text-xs">
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
