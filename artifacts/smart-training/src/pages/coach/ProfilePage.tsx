import { useRef, useState } from "react";
import { useGetProfile, useUpdateProfile, useGetMyCourses, useUploadFile, useGetCategories, getGetProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/i18n";
import { CoachLayout } from "@/components/coach/CoachLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/coachContent";
import { User, BookOpen, Users, Edit2, Check, X, CheckCircle, AlertCircle, Camera, Loader2, Briefcase, Award, Phone, Plus, Paperclip, CheckCircle2, ShieldCheck, ExternalLink } from "lucide-react";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

interface DiplomaDraft { name: string; documentUrl: string | null; verified: boolean }

function TagListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={item} onChange={(e) => onChange(items.map((it, ii) => (ii === i ? e.target.value : it)))} placeholder={placeholder} className="bg-white text-xs h-9" />
          <button type="button" onClick={() => onChange(items.filter((_, ii) => ii !== i))} className="text-muted-foreground hover:text-rose-500 shrink-0"><X className="w-4 h-4" /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} className="text-[10px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1">
        <Plus className="w-3 h-3" />{placeholder}
      </button>
    </div>
  );
}

// KYC-style diploma editor — same pattern as RegisterPage.tsx: attach a proof
// document per diploma; admin reviews it and marks it verified separately.
function DiplomaListEditor({ items, onChange, lang, uploadMutation }: {
  items: DiplomaDraft[]; onChange: (items: DiplomaDraft[]) => void; lang: "ar" | "fr" | "en";
  uploadMutation: ReturnType<typeof useUploadFile>;
}) {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const handleFile = (idx: number, file: File) => {
    setUploadingIdx(idx);
    uploadMutation.mutate(
      { data: { file } },
      {
        onSuccess: (res) => {
          onChange(items.map((it, ii) => (ii === idx ? { ...it, documentUrl: res.url, verified: false } : it)));
          setUploadingIdx(null);
        },
        onError: () => setUploadingIdx(null),
      }
    );
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const inputId = `coach-diploma-doc-${i}`;
        return (
          <div key={i} className="flex items-center gap-2">
            {item.verified && <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
            <Input
              value={item.name}
              onChange={(e) => onChange(items.map((it, ii) => (ii === i ? { ...it, name: e.target.value } : it)))}
              placeholder={{ ar: "اسم الشهادة", fr: "Nom du diplôme", en: "Diploma name" }[lang]}
              className="bg-white text-xs h-9 flex-1"
            />
            <input id={inputId} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(i, f); e.target.value = ""; }} />
            <label htmlFor={inputId} className={`shrink-0 h-9 px-2.5 rounded-lg border flex items-center gap-1 text-[10px] font-bold cursor-pointer ${item.documentUrl ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border bg-white text-muted-foreground hover:text-foreground"}`}>
              {uploadingIdx === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : item.documentUrl ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Paperclip className="w-3.5 h-3.5" />}
              {item.documentUrl ? { ar: "مرفق", fr: "Joint", en: "Attached" }[lang] : { ar: "إرفاق", fr: "Joindre", en: "Attach" }[lang]}
            </label>
            <button type="button" onClick={() => onChange(items.filter((_, ii) => ii !== i))} className="text-muted-foreground hover:text-rose-500 shrink-0"><X className="w-4 h-4" /></button>
          </div>
        );
      })}
      <button type="button" onClick={() => onChange([...items, { name: "", documentUrl: null, verified: false }])} className="text-[10px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1">
        <Plus className="w-3 h-3" />{{ ar: "إضافة شهادة", fr: "Ajouter un diplôme", en: "Add a diploma" }[lang]}
      </button>
    </div>
  );
}

export default function CoachProfilePage() {
  const { lang } = useI18n();
  const { data: profile, isLoading } = useGetProfile();
  const { data: courses } = useGetMyCourses();
  const { data: categories } = useGetCategories();
  const updateMutation = useUpdateProfile();
  const uploadMutation = useUploadFile();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", bio: "", avatarUrl: "" });
  const [phone, setPhone] = useState("");
  const [domain, setDomain] = useState("");
  const [diplomas, setDiplomas] = useState<DiplomaDraft[]>([]);
  const [priorTrainings, setPriorTrainings] = useState<string[]>([]);
  const [teachingPlan, setTeachingPlan] = useState("");

  const startEdit = () => {
    setForm({ name: profile?.name ?? "", bio: profile?.bio ?? "", avatarUrl: profile?.avatarUrl ?? "" });
    setPhone(profile?.phone ?? "");
    setDomain(profile?.domain ?? "");
    setDiplomas(profile?.diplomas ?? []);
    setPriorTrainings(profile?.priorTrainings ?? []);
    setTeachingPlan(profile?.teachingPlan ?? "");
    setEditing(true);
  };

  const save = () => {
    updateMutation.mutate(
      {
        data: {
          name: form.name, bio: form.bio, avatarUrl: form.avatarUrl || null,
          phone: phone.trim() || null, domain: domain || null,
          diplomas: diplomas.filter((d) => d.name.trim()).map((d) => ({ ...d, name: d.name.trim() })),
          priorTrainings: priorTrainings.map((t) => t.trim()).filter(Boolean),
          teachingPlan: teachingPlan.trim() || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
          setEditing(false);
          toast({ title: { ar: "تم تحديث الملف الشخصي", fr: "Profil mis à jour", en: "Profile updated" }[lang] });
        },
        onError: () => {
          toast({ title: { ar: "فشل التحديث", fr: "Échec de la mise à jour", en: "Update failed" }[lang], variant: "destructive" });
        },
      }
    );
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      toast({
        title: { ar: "الصورة كبيرة جدًا", fr: "Image trop volumineuse", en: "Image too large" }[lang],
        description: `${{ ar: "الحد الأقصى", fr: "Maximum", en: "Max" }[lang]} ${formatBytes(MAX_AVATAR_BYTES)}`,
        variant: "destructive",
      });
      return;
    }
    uploadMutation.mutate(
      { data: { file } },
      {
        onSuccess: (res) => setForm((f) => ({ ...f, avatarUrl: res.url })),
        onError: () => toast({ title: { ar: "فشل الرفع", fr: "Échec du téléversement", en: "Upload failed" }[lang], variant: "destructive" }),
      }
    );
  };

  const totalEnrollments = courses?.reduce((sum, c) => sum + c.enrollmentCount, 0) ?? 0;
  const publishedCount = courses?.filter((c) => c.isPublished).length ?? 0;

  return (
    <CoachLayout
      title={{ ar: "الملف الشخصي", fr: "Profil Coach", en: "Coach Profile" }[lang]}
      subtitle={{ ar: "إدارة معلوماتك الشخصية والمهنية", fr: "Gérer vos informations personnelles et professionnelles", en: "Manage your personal and professional information" }[lang]}
    >
      {isLoading ? (
        <div className="h-40 bg-white border border-border rounded-xl animate-pulse max-w-2xl" />
      ) : (
        <div className="max-w-2xl">
          <div className="bg-white border border-border rounded-2xl p-6 md:p-8 mb-6 shadow-sm">
            <div className="flex items-start gap-6">
              <div className="relative shrink-0">
                {(editing ? form.avatarUrl : profile?.avatarUrl) ? (
                  <img src={editing ? form.avatarUrl : profile!.avatarUrl!} alt="" className="w-20 h-20 rounded-2xl object-cover border border-border" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-black flex items-center justify-center">
                    <User className="w-10 h-10 text-white" />
                  </div>
                )}
                {editing && (
                  <>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
                    <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={uploadMutation.isPending}
                      className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-black text-white flex items-center justify-center border-2 border-white shadow-sm">
                      {uploadMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                    </button>
                  </>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {editing ? (
                  <div className="space-y-3">
                    <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={{ ar: "الاسم", fr: "Votre nom", en: "Your name" }[lang]} />
                    <Textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder={{ ar: "صفي خبرتك...", fr: "Décrivez votre expertise...", en: "Describe your expertise..." }[lang]} rows={3} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={save} disabled={updateMutation.isPending} className="bg-black hover:bg-black/90 text-white font-bold">
                        <Check className="w-4 h-4 mr-1" />{{ ar: "حفظ", fr: "Enregistrer", en: "Save" }[lang]}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                        <X className="w-4 h-4 mr-1" />{{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="text-xl font-bold text-foreground">{profile?.name}</h2>
                      <Button variant="ghost" size="sm" onClick={startEdit}><Edit2 className="w-4 h-4" /></Button>
                    </div>
                    <p className="text-muted-foreground text-sm mb-2">{profile?.email}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 bg-muted text-foreground rounded-full capitalize font-semibold">{{ ar: "مدربة", fr: "Coach", en: "Coach" }[lang]}</span>
                      {profile?.isApproved ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full font-semibold">
                          <CheckCircle className="w-3 h-3" />{{ ar: "معتمدة", fr: "Approuvée", en: "Approved" }[lang]}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full font-semibold">
                          <AlertCircle className="w-3 h-3" />{{ ar: "قيد الانتظار", fr: "En attente d'approbation", en: "Pending Approval" }[lang]}
                        </span>
                      )}
                    </div>
                    {profile?.bio && <p className="mt-3 text-sm text-foreground/80 leading-relaxed">{profile.bio}</p>}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-5 h-5 text-foreground" />
              <h3 className="font-bold text-foreground text-sm">{{ ar: "المعلومات المهنية", fr: "Informations professionnelles", en: "Professional information" }[lang]}</h3>
            </div>
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-foreground font-semibold text-xs flex items-center gap-1.5 mb-1.5"><Phone className="w-3.5 h-3.5" />{{ ar: "رقم الهاتف", fr: "Téléphone", en: "Phone" }[lang]}</label>
                    <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+213 5XX XX XX XX" className="bg-white h-10" />
                  </div>
                  <div>
                    <label className="text-foreground font-semibold text-xs block mb-1.5">{{ ar: "مجال التخصص", fr: "Domaine de spécialité", en: "Area of specialty" }[lang]}</label>
                    <select value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full h-10 px-3 bg-white border border-border rounded-lg text-foreground text-sm">
                      <option value="">{{ ar: "غير محدد", fr: "Non précisé", en: "Not specified" }[lang]}</option>
                      {(categories ?? []).map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-foreground font-semibold text-xs block mb-1.5">{{ ar: "الشهادات والدبلومات", fr: "Diplômes et certifications", en: "Diplomas and certifications" }[lang]}</label>
                  <p className="text-[10px] text-muted-foreground mb-1.5">
                    {{ ar: "أرفقي نسخة من الشهادة للتحقق منها من طرف الإدارة", fr: "Joignez une copie du diplôme — elle sera vérifiée par l'équipe admin", en: "Attach a copy of the diploma — it will be reviewed by the admin team" }[lang]}
                  </p>
                  <DiplomaListEditor items={diplomas} onChange={setDiplomas} lang={lang} uploadMutation={uploadMutation} />
                </div>
                <div>
                  <label className="text-foreground font-semibold text-xs block mb-1.5">{{ ar: "التكوينات والخبرات السابقة", fr: "Formations et expériences antérieures", en: "Prior trainings and experience" }[lang]}</label>
                  <TagListEditor items={priorTrainings} onChange={setPriorTrainings} placeholder={{ ar: "إضافة تكوين", fr: "Ajouter une formation", en: "Add a training" }[lang]} />
                </div>
                <div>
                  <label className="text-foreground font-semibold text-xs block mb-1.5">{{ ar: "ماذا تنوين نشره؟", fr: "Que comptez-vous publier ?", en: "What do you plan to publish?" }[lang]}</label>
                  <Textarea value={teachingPlan} onChange={(e) => setTeachingPlan(e.target.value)} rows={3} placeholder={{ ar: "صفي الدورات التي تخططين لتقديمها...", fr: "Décrivez les formations que vous prévoyez de proposer...", en: "Describe the courses you plan to offer..." }[lang]} />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">{{ ar: "الهاتف", fr: "Téléphone", en: "Phone" }[lang]}</span>
                    <p className="text-sm text-foreground">{profile?.phone || { ar: "غير محدد", fr: "Non précisé", en: "Not set" }[lang]}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">{{ ar: "مجال التخصص", fr: "Spécialité", en: "Specialty" }[lang]}</span>
                    <p className="text-sm text-foreground">{profile?.domain || { ar: "غير محدد", fr: "Non précisé", en: "Not set" }[lang]}</p>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5 flex items-center gap-1"><Award className="w-3 h-3" />{{ ar: "الشهادات", fr: "Diplômes", en: "Diplomas" }[lang]}</span>
                  {profile?.diplomas && profile.diplomas.length > 0 ? (
                    <ul className="space-y-1.5">
                      {profile.diplomas.map((d, i) => (
                        <li key={i} className="text-sm text-foreground/80 flex items-center gap-1.5">
                          {d.verified ? (
                            <span title={{ ar: "تم التحقق", fr: "Vérifié", en: "Verified" }[lang]}><ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" /></span>
                          ) : (
                            <span className="w-1 h-1 rounded-full bg-foreground/40 shrink-0" />
                          )}
                          {d.name}
                          {d.documentUrl && (
                            <a href={d.documentUrl} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:text-violet-700 inline-flex items-center gap-0.5 text-xs shrink-0">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {!d.verified && (
                            <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full shrink-0">
                              {{ ar: "قيد المراجعة", fr: "En vérification", en: "Pending review" }[lang]}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-muted-foreground">{{ ar: "لم تُضف بعد", fr: "Aucun renseigné", en: "None added yet" }[lang]}</p>}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">{{ ar: "التكوينات السابقة", fr: "Formations antérieures", en: "Prior trainings" }[lang]}</span>
                  {profile?.priorTrainings && profile.priorTrainings.length > 0 ? (
                    <ul className="space-y-1">
                      {profile.priorTrainings.map((t, i) => <li key={i} className="text-sm text-foreground/80 flex items-start gap-1.5"><span className="w-1 h-1 rounded-full bg-foreground/40 mt-2 shrink-0" />{t}</li>)}
                    </ul>
                  ) : <p className="text-sm text-muted-foreground">{{ ar: "لم تُضف بعد", fr: "Aucune renseignée", en: "None added yet" }[lang]}</p>}
                </div>
                {profile?.teachingPlan && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">{{ ar: "خطة النشر", fr: "Plan de publication", en: "Publishing plan" }[lang]}</span>
                    <p className="text-sm text-foreground/80 leading-relaxed">{profile.teachingPlan}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-foreground" />
              <h3 className="font-bold text-foreground text-sm">{{ ar: "إحصائيات التدريس", fr: "Statistiques pédagogiques", en: "Teaching Stats" }[lang]}</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-foreground">{courses?.length ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">{{ ar: "دورات", fr: "Formations", en: "Courses" }[lang]}</div>
              </div>
              <div className="bg-muted rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-foreground">{publishedCount}</div>
                <div className="text-xs text-muted-foreground mt-1">{{ ar: "منشورة", fr: "Publiées", en: "Published" }[lang]}</div>
              </div>
              <div className="bg-muted rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-foreground">{totalEnrollments}</div>
                <div className="text-xs text-muted-foreground mt-1">{{ ar: "طالبات", fr: "Étudiantes", en: "Students" }[lang]}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </CoachLayout>
  );
}
