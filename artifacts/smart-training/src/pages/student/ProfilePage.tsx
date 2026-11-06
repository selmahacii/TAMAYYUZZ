import { useRef, useState } from "react";
import { useGetProfile, useUpdateProfile, useGetMyEnrollments, useGetMyCertificates, useUploadFile, useGetCategories, getGetProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/i18n";
import { StudentLayout } from "@/components/student/StudentLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/coachContent";
import { User, BookOpen, Award, Edit2, Check, X, Camera, Loader2, Sparkles, GraduationCap } from "lucide-react";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export default function StudentProfilePage() {
  const { lang } = useI18n();
  const { data: profile, isLoading } = useGetProfile();
  const { data: enrollments } = useGetMyEnrollments();
  const { data: certificates } = useGetMyCertificates();
  const { data: categories } = useGetCategories();
  const updateMutation = useUpdateProfile();
  const uploadMutation = useUploadFile();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", bio: "", avatarUrl: "" });
  const [domain, setDomain] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  const startEdit = () => {
    setForm({ name: profile?.name ?? "", bio: profile?.bio ?? "", avatarUrl: profile?.avatarUrl ?? "" });
    setDomain(profile?.domain ?? "");
    setInterests(profile?.interests ?? []);
    setEditing(true);
  };

  const toggleInterest = (cat: string) => {
    setInterests((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const save = () => {
    updateMutation.mutate(
      { data: { name: form.name, bio: form.bio, avatarUrl: form.avatarUrl || null, domain: domain || null, interests } },
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

  return (
    <StudentLayout
      title={{ ar: "الملف الشخصي", fr: "Mon profil", en: "My Profile" }[lang]}
      subtitle={{ ar: "إدارة معلوماتك الشخصية", fr: "Gérer vos informations personnelles", en: "Manage your personal information" }[lang]}
    >
      {isLoading ? (
        <div className="max-w-2xl animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-xl" />
          <div className="h-8 bg-muted rounded w-1/3" />
        </div>
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
                    <Textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder={{ ar: "أخبرينا عن نفسك...", fr: "Parlez-nous de vous...", en: "Tell us about yourself..." }[lang]} rows={3} />
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
                    <span className="inline-block text-xs px-2 py-1 bg-muted text-foreground rounded-full font-semibold">
                      {{ ar: "طالبة", fr: "Étudiante", en: "Student" }[lang]}
                    </span>
                    {profile?.bio && (
                      <p className="mt-3 text-sm text-foreground/80 leading-relaxed">{profile.bio}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-5 h-5 text-foreground" />
              <h3 className="font-bold text-foreground text-sm">{{ ar: "المجال والاهتمامات", fr: "Domaine et centres d'intérêt", en: "Domain and interests" }[lang]}</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {{ ar: "تساعدنا هذه المعلومات على اقتراح الدورات الأنسب لك", fr: "Ces informations nous aident à vous suggérer les formations les plus pertinentes", en: "This helps us suggest the most relevant courses for you" }[lang]}
            </p>
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-foreground font-semibold text-xs block mb-1.5">
                    {{ ar: "مجال الدراسة", fr: "Domaine d'études", en: "Field of study" }[lang]}
                  </label>
                  <select value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full h-10 px-3 bg-white border border-border rounded-lg text-foreground text-sm">
                    <option value="">{{ ar: "غير محدد", fr: "Non précisé", en: "Not specified" }[lang]}</option>
                    {(categories ?? []).map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-foreground font-semibold text-xs flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {{ ar: "الاهتمامات", fr: "Centres d'intérêt", en: "Interests" }[lang]}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(categories ?? []).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleInterest(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                          interests.includes(cat) ? "bg-black text-white border-black" : "bg-white text-foreground border-border hover:border-black"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">{{ ar: "مجال الدراسة", fr: "Domaine d'études", en: "Field of study" }[lang]}</span>
                  <p className="text-sm text-foreground">{profile?.domain || { ar: "غير محدد بعد", fr: "Non précisé", en: "Not set yet" }[lang]}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">{{ ar: "الاهتمامات", fr: "Centres d'intérêt", en: "Interests" }[lang]}</span>
                  {profile?.interests && profile.interests.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.interests.map((cat) => (
                        <span key={cat} className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100">{cat}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{{ ar: "لم تحددي اهتماماتك بعد", fr: "Aucun centre d'intérêt renseigné", en: "No interests set yet" }[lang]}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-foreground" />
              <h3 className="font-bold text-foreground text-sm">{{ ar: "إحصائيات التعلّم", fr: "Statistiques d'apprentissage", en: "Learning Stats" }[lang]}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-foreground">{enrollments?.length ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">{{ ar: "دورات مسجّلة", fr: "Formations suivies", en: "Courses Enrolled" }[lang]}</div>
              </div>
              <div className="bg-muted rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-foreground flex items-center justify-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" />{certificates?.length ?? 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{{ ar: "دورات مكتملة", fr: "Formations terminées", en: "Completed" }[lang]}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
