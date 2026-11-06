import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  useCreateCourse, useUpdateCourse, useGetCourse, useGetCategories, useUploadFile, useGetCertificateTemplates,
  getGetMyCoursesQueryKey, getGetCourseQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/i18n";
import { CoachLayout } from "@/components/coach/CoachLayout";
import { CourseContentManager } from "@/components/coach/CourseContentManager";
import { CertificateDocument } from "@/components/shared/CertificateDocument";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/coachContent";
import { Tag, Plus, X, Upload, Link as LinkIcon, Loader2, CheckCircle2, FileEdit, ListChecks, Hash, Award, GraduationCap } from "lucide-react";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

interface ExamQuestionDraft { question: string; options: string[]; answer: number }
function emptyExamQuestion(): ExamQuestionDraft { return { question: "", options: ["", ""], answer: 0 }; }

function BulletListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  const { lang } = useI18n();
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={item} onChange={(e) => onChange(items.map((it, ii) => (ii === i ? e.target.value : it)))} placeholder={placeholder} className="bg-white text-xs h-9" />
          <button type="button" onClick={() => onChange(items.filter((_, ii) => ii !== i))} className="text-muted-foreground hover:text-rose-500 shrink-0"><X className="w-4 h-4" /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} className="text-[10px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1">
        <Plus className="w-3 h-3" />{{ ar: "إضافة عنصر", fr: "Ajouter un élément", en: "Add item" }[lang]}
      </button>
    </div>
  );
}

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (tags: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const v = draft.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setDraft("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-white border border-border text-foreground/80">
            {t}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} className="text-muted-foreground hover:text-rose-500"><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } }}
        onBlur={commit}
        placeholder={placeholder}
        className="bg-white text-xs h-9"
      />
    </div>
  );
}

export default function CourseFormPage() {
  const params = useParams<{ id?: string }>();
  const courseId = params.id ? parseInt(params.id, 10) : null;
  const isEditing = !!courseId;
  const [, setLocation] = useLocation();
  const { lang } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [createdId, setCreatedId] = useState<number | null>(null);
  const activeCourseId = courseId ?? createdId;
  const [tab, setTab] = useState<"details" | "content" | "certification">("details");

  const { data: existingCourse } = useGetCourse(activeCourseId ?? 0, {
    query: { enabled: !!activeCourseId, queryKey: getGetCourseQueryKey(activeCourseId ?? 0) },
  });
  const { data: categories } = useGetCategories();
  const { data: templates } = useGetCertificateTemplates();

  const createMutation = useCreateCourse();
  const updateMutation = useUpdateCourse();
  const uploadMutation = useUploadFile();
  const certMutation = useUpdateCourse();

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [overview, setOverview] = useState("");
  const [objectives, setObjectives] = useState<string[]>([]);
  const [requirements, setRequirements] = useState<string[]>([]);
  const [audience, setAudience] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [language, setLanguage] = useState("fr");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [durationHours, setDurationHours] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageMode, setImageMode] = useState<"link" | "upload">("link");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("0");
  const [currency, setCurrency] = useState("DZD");

  const [certificateTemplateId, setCertificateTemplateId] = useState<number | null>(null);
  const [examEnabled, setExamEnabled] = useState(false);
  const [passingScore, setPassingScore] = useState(50);
  const [examQuestions, setExamQuestions] = useState<ExamQuestionDraft[]>([emptyExamQuestion()]);

  useEffect(() => {
    if (existingCourse && isEditing) {
      setTitle(existingCourse.title);
      setSubtitle(existingCourse.subtitle ?? "");
      setOverview(existingCourse.description);
      setObjectives(existingCourse.learningObjectives ?? []);
      setRequirements(existingCourse.requirements ?? []);
      setAudience(existingCourse.targetAudience ?? []);
      setTags(existingCourse.tags ?? []);
      setLanguage(existingCourse.language ?? "fr");
      setCategory(existingCourse.category);
      setLevel(existingCourse.level as any);
      setDurationHours(existingCourse.durationHours ?? null);
      setImageUrl(existingCourse.imageUrl ?? "");
      setIsFree(existingCourse.isFree ?? true);
      setPrice(existingCourse.price ?? "0");
      setCurrency(existingCourse.currency ?? "DZD");
    }
  }, [existingCourse, isEditing]);

  useEffect(() => {
    if (existingCourse) {
      setCertificateTemplateId(existingCourse.certificateTemplateId ?? null);
      if (existingCourse.finalExam) {
        setExamEnabled(true);
        setPassingScore(existingCourse.finalExam.passingScore);
        setExamQuestions(existingCourse.finalExam.questions.length ? existingCourse.finalExam.questions : [emptyExamQuestion()]);
      }
    }
  }, [existingCourse]);

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast({
        title: { ar: "الصورة كبيرة جدًا", fr: "Image trop volumineuse", en: "Image too large" }[lang],
        description: `${{ ar: "الحد الأقصى", fr: "Maximum", en: "Max" }[lang]} ${formatBytes(MAX_IMAGE_BYTES)}`,
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    uploadMutation.mutate(
      { data: { file } },
      {
        onSuccess: (res) => setImageUrl(res.url),
        onError: () => toast({ title: { ar: "فشل الرفع", fr: "Échec du téléversement", en: "Upload failed" }[lang], variant: "destructive" }),
      }
    );
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const buildPayload = () => ({
    title: title.trim(),
    subtitle: subtitle.trim() || null,
    description: overview.trim(),
    category: category === "__custom__" ? customCategory.trim() : category,
    imageUrl: imageUrl || null,
    durationHours,
    level,
    isFree,
    price: isFree ? "0" : (price || "0"),
    currency: currency || "DZD",
    language,
    tags: tags.map((t) => t.trim()).filter(Boolean),
    learningObjectives: objectives.map((o) => o.trim()).filter(Boolean),
    requirements: requirements.map((r) => r.trim()).filter(Boolean),
    targetAudience: audience.map((a) => a.trim()).filter(Boolean),
  });

  const validate = () => {
    if (!title.trim() || title.trim().length < 3) {
      toast({ title: { ar: "العنوان قصير جدًا", fr: "Titre trop court", en: "Title too short" }[lang], variant: "destructive" });
      return false;
    }
    if (!overview.trim() || overview.trim().length < 10) {
      toast({ title: { ar: "الوصف قصير جدًا", fr: "Description trop courte", en: "Description too short" }[lang], variant: "destructive" });
      return false;
    }
    const finalCategory = category === "__custom__" ? customCategory.trim() : category;
    if (!finalCategory) {
      toast({ title: { ar: "الفئة مطلوبة", fr: "Catégorie requise", en: "Category required" }[lang], variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const data = buildPayload();

    if (isEditing && courseId) {
      updateMutation.mutate(
        { id: courseId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetMyCoursesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
            toast({ title: { ar: "تم تحديث الدورة", fr: "Formation mise à jour", en: "Course updated" }[lang] });
          },
          onError: (err: any) => toast({ title: "Erreur", description: err?.response?.data?.error, variant: "destructive" }),
        }
      );
    } else if (createdId) {
      updateMutation.mutate(
        { id: createdId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetMyCoursesQueryKey() });
            toast({ title: { ar: "تم الحفظ", fr: "Enregistré", en: "Saved" }[lang] });
          },
        }
      );
    } else {
      createMutation.mutate(
        { data },
        {
          onSuccess: (course: any) => {
            queryClient.invalidateQueries({ queryKey: getGetMyCoursesQueryKey() });
            setCreatedId(course.id);
            toast({ title: { ar: "تم إنشاء الدورة! يمكنك الآن إضافة المحتوى", fr: "Formation créée ! Vous pouvez maintenant ajouter le contenu", en: "Course created! You can now add content" }[lang] });
            setTab("content");
          },
          onError: (err: any) => toast({ title: "Erreur", description: err?.response?.data?.error, variant: "destructive" }),
        }
      );
    }
  };

  const goToDashboard = () => setLocation("/coach/courses");

  const addExamQuestion = () => setExamQuestions((qs) => [...qs, emptyExamQuestion()]);
  const removeExamQuestion = (qIdx: number) => setExamQuestions((qs) => qs.filter((_, i) => i !== qIdx));
  const addExamOption = (qIdx: number) => setExamQuestions((qs) => qs.map((q, i) => (i === qIdx && q.options.length < 6 ? { ...q, options: [...q.options, ""] } : q)));
  const removeExamOption = (qIdx: number, oIdx: number) => setExamQuestions((qs) => qs.map((q, i) => {
    if (i !== qIdx || q.options.length <= 2) return q;
    const options = q.options.filter((_, o) => o !== oIdx);
    const answer = q.answer >= options.length ? 0 : q.answer;
    return { ...q, options, answer };
  }));

  const handleSaveCertification = () => {
    if (!activeCourseId) return;
    if (examEnabled) {
      if (passingScore < 0 || passingScore > 100) {
        toast({ title: { ar: "النسبة يجب أن تكون بين 0 و100", fr: "Le seuil doit être entre 0 et 100", en: "Threshold must be between 0 and 100" }[lang], variant: "destructive" });
        return;
      }
      const invalid = examQuestions.some((q) => !q.question.trim() || q.options.filter((o) => o.trim()).length < 2);
      if (invalid) {
        toast({
          title: { ar: "أكملي جميع الأسئلة", fr: "Complétez toutes les questions", en: "Complete all questions" }[lang],
          description: { ar: "كل سؤال يحتاج نصًا وخيارين على الأقل.", fr: "Chaque question nécessite un texte et au moins 2 options.", en: "Each question needs text and at least 2 options." }[lang],
          variant: "destructive",
        });
        return;
      }
    }

    certMutation.mutate(
      {
        id: activeCourseId,
        data: {
          certificateTemplateId,
          finalExam: examEnabled ? {
            passingScore,
            questions: examQuestions.map((q) => {
              const selectedText = q.options[q.answer];
              const filteredOptions = q.options.filter((o) => o.trim());
              const newAnswer = filteredOptions.indexOf(selectedText);
              return { question: q.question.trim(), options: filteredOptions, answer: newAnswer >= 0 ? newAnswer : 0 };
            }),
          } : null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(activeCourseId) });
          toast({ title: { ar: "تم حفظ إعدادات الشهادة", fr: "Certification enregistrée", en: "Certification saved" }[lang] });
        },
        onError: (err: any) => toast({ title: "Erreur", description: err?.response?.data?.error, variant: "destructive" }),
      }
    );
  };

  const previewTemplate = templates?.find((t) => t.id === certificateTemplateId);

  return (
    <CoachLayout
      title={isEditing ? { ar: "تعديل الدورة", fr: "Modifier la formation", en: "Edit Course" }[lang] : { ar: "دورة جديدة", fr: "Nouvelle formation", en: "New Course" }[lang]}
      subtitle={{ ar: "تفاصيل غنية ومحتوى منظم لتجربة تعلم متكاملة", fr: "Détails riches et contenu structuré pour une expérience d'apprentissage complète", en: "Rich details and structured content for a complete learning experience" }[lang]}
    >
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <button type="button" onClick={() => setTab("details")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${tab === "details" ? "text-white" : "text-foreground/60 bg-muted hover:text-foreground"}`}
          style={tab === "details" ? { background: "hsl(258,75%,55%)" } : undefined}>
          <FileEdit className="w-3.5 h-3.5" />
          {{ ar: "التفاصيل", fr: "Détails", en: "Details" }[lang]}
        </button>
        <button type="button" onClick={() => activeCourseId && setTab("content")} disabled={!activeCourseId}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${tab === "content" ? "text-white" : "text-foreground/60 bg-muted hover:text-foreground"}`}
          style={tab === "content" ? { background: "hsl(258,75%,55%)" } : undefined}
          title={!activeCourseId ? { ar: "احفظي التفاصيل أولاً", fr: "Enregistrez d'abord les détails", en: "Save details first" }[lang] : undefined}>
          <ListChecks className="w-3.5 h-3.5" />
          {{ ar: "الفصول والدروس", fr: "Chapitres & leçons", en: "Chapters & Lessons" }[lang]}
        </button>
        <button type="button" onClick={() => activeCourseId && setTab("certification")} disabled={!activeCourseId}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${tab === "certification" ? "text-white" : "text-foreground/60 bg-muted hover:text-foreground"}`}
          style={tab === "certification" ? { background: "hsl(258,75%,55%)" } : undefined}
          title={!activeCourseId ? { ar: "احفظي التفاصيل أولاً", fr: "Enregistrez d'abord les détails", en: "Save details first" }[lang] : undefined}>
          <Award className="w-3.5 h-3.5" />
          {{ ar: "الشهادة", fr: "Certification", en: "Certification" }[lang]}
        </button>
        {activeCourseId && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold ml-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {{ ar: "تم الحفظ كمسودة", fr: "Enregistrée en brouillon", en: "Saved as draft" }[lang]}
          </span>
        )}
      </div>

      {tab === "details" ? (
        <div className="bg-white border border-border shadow-sm rounded-xl p-6 md:p-8 max-w-3xl">
          <form onSubmit={handleSaveDetails} className="space-y-6">
            <div>
              <label className="font-bold text-foreground text-xs uppercase tracking-wider block mb-1.5">{{ ar: "عنوان الدورة", fr: "Titre de la formation", en: "Course Title" }[lang]} *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder={{ ar: "مثال: التسويق الرقمي للمبتدئات", fr: "ex. Marketing Digital pour Débutantes", en: "e.g. Digital Marketing for Beginners" }[lang]} className="bg-white" />
            </div>

            <div>
              <label className="font-bold text-foreground text-xs uppercase tracking-wider block mb-1.5">{{ ar: "عنوان فرعي", fr: "Sous-titre", en: "Subtitle" }[lang]}</label>
              <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder={{ ar: "جملة قصيرة تلخص الدورة", fr: "Une phrase courte qui résume la formation", en: "A short one-liner summarizing the course" }[lang]} className="bg-white" />
            </div>

            <div>
              <label className="font-bold text-foreground text-xs uppercase tracking-wider block mb-1.5">{{ ar: "الوصف العام", fr: "Description générale", en: "Overview" }[lang]} *</label>
              <Textarea value={overview} onChange={(e) => setOverview(e.target.value)} rows={4} required placeholder={{ ar: "صفي ما ستتعلمه المتدربات...", fr: "Décrivez ce que les apprenantes vont apprendre...", en: "Describe what students will learn..." }[lang]} className="bg-white" />
            </div>

            <div>
              <label className="font-bold text-foreground text-xs uppercase tracking-wider block mb-1.5 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" />{{ ar: "الوسوم / المهارات", fr: "Tags / Compétences", en: "Tags / Skills" }[lang]}</label>
              <TagInput tags={tags} onChange={setTags} placeholder={{ ar: "اكتبي واضغطي Enter", fr: "Tapez puis appuyez sur Entrée", en: "Type then press Enter" }[lang]} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-4 bg-[#fafafa] border border-border rounded-xl">
              <div>
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1.5">{{ ar: "ما ستتعلمينه", fr: "Ce que vous allez apprendre", en: "What you'll learn" }[lang]}</label>
                <BulletListEditor items={objectives} onChange={setObjectives} placeholder={{ ar: "مثال: بناء استراتيجية محتوى", fr: "ex. Construire une stratégie de contenu", en: "e.g. Build a content strategy" }[lang]} />
              </div>
              <div>
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1.5">{{ ar: "المتطلبات", fr: "Prérequis", en: "Requirements" }[lang]}</label>
                <BulletListEditor items={requirements} onChange={setRequirements} placeholder={{ ar: "مثال: حاسوب متصل بالإنترنت", fr: "ex. Un ordinateur connecté", en: "e.g. A computer with internet" }[lang]} />
              </div>
              <div>
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1.5">{{ ar: "الفئة المستهدفة", fr: "Public visé", en: "Target audience" }[lang]}</label>
                <BulletListEditor items={audience} onChange={setAudience} placeholder={{ ar: "مثال: المبتدئات في التسويق", fr: "ex. Débutantes en marketing", en: "e.g. Marketing beginners" }[lang]} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-foreground text-xs uppercase tracking-wider block mb-1.5">{{ ar: "الفئة", fr: "Catégorie", en: "Category" }[lang]} *</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-10 px-3 bg-white border border-border rounded-lg text-foreground text-sm">
                  <option value="">{{ ar: "اختاري...", fr: "Choisir...", en: "Choose..." }[lang]}</option>
                  {(categories ?? []).map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  <option value="__custom__">{{ ar: "أخرى (تحديد)", fr: "Autre (préciser)", en: "Other (specify)" }[lang]}</option>
                </select>
                {category === "__custom__" && (
                  <Input value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder={{ ar: "اسم الفئة", fr: "Nom de la catégorie", en: "Category name" }[lang]} className="bg-white mt-2" />
                )}
              </div>
              <div>
                <label className="font-bold text-foreground text-xs uppercase tracking-wider block mb-1.5">{{ ar: "المستوى", fr: "Niveau", en: "Level" }[lang]} *</label>
                <select value={level} onChange={(e) => setLevel(e.target.value as any)} className="w-full h-10 px-3 bg-white border border-border rounded-lg text-foreground text-sm">
                  <option value="beginner">{{ ar: "مبتدئ", fr: "Débutant", en: "Beginner" }[lang]}</option>
                  <option value="intermediate">{{ ar: "متوسط", fr: "Intermédiaire", en: "Intermediate" }[lang]}</option>
                  <option value="advanced">{{ ar: "متقدم", fr: "Avancé", en: "Advanced" }[lang]}</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-foreground text-xs uppercase tracking-wider block mb-1.5">{{ ar: "لغة الدورة", fr: "Langue de la formation", en: "Course language" }[lang]}</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full h-10 px-3 bg-white border border-border rounded-lg text-foreground text-sm">
                  <option value="fr">Français</option>
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-foreground text-xs uppercase tracking-wider block mb-1.5">{{ ar: "المدة (ساعات)", fr: "Durée (heures)", en: "Duration (hours)" }[lang]}</label>
                <Input type="number" min="0" step="0.5" value={durationHours ?? ""} onChange={(e) => setDurationHours(e.target.value ? parseFloat(e.target.value) : null)} placeholder="10" className="bg-white" />
              </div>
              <div>
                <label className="font-bold text-foreground text-xs uppercase tracking-wider block mb-1.5">{{ ar: "صورة الغلاف", fr: "Image de couverture", en: "Cover Image" }[lang]}</label>
                <div className="flex rounded-lg p-0.5 bg-muted w-fit mb-2">
                  <button type="button" onClick={() => setImageMode("link")} className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold transition-all ${imageMode === "link" ? "bg-white text-black shadow-sm" : "text-muted-foreground"}`}>
                    <LinkIcon className="w-3 h-3" />{{ ar: "رابط", fr: "Lien", en: "Link" }[lang]}
                  </button>
                  <button type="button" onClick={() => setImageMode("upload")} className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold transition-all ${imageMode === "upload" ? "bg-white text-black shadow-sm" : "text-muted-foreground"}`}>
                    <Upload className="w-3 h-3" />{{ ar: "رفع", fr: "Téléverser", en: "Upload" }[lang]}
                  </button>
                </div>
                {imageMode === "link" ? (
                  <Input value={imageUrl.startsWith("/api/uploads/") ? "" : imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="bg-white" />
                ) : (
                  <>
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                    <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploadMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-border hover:border-foreground/30 text-muted-foreground hover:text-foreground text-xs font-bold">
                      {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {{ ar: "اختيار صورة", fr: "Choisir une image", en: "Choose image" }[lang]}
                    </button>
                  </>
                )}
                {imageUrl && (
                  <img src={imageUrl} alt="" className="mt-2 w-full h-24 object-cover rounded-lg border border-border" />
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="rounded-xl p-5 bg-[#fafafa] border border-border">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-4 h-4 text-foreground" />
                <h3 className="text-sm font-bold text-foreground">{{ ar: "التسعير", fr: "Tarification", en: "Pricing" }[lang]}</h3>
              </div>
              <div className="flex rounded-lg p-0.5 bg-muted mb-4">
                {[
                  { value: true, label: { ar: "مجاني", fr: "Gratuit", en: "Free" }[lang] },
                  { value: false, label: { ar: "مدفوع", fr: "Payant", en: "Paid" }[lang] },
                ].map((opt) => (
                  <button key={String(opt.value)} type="button" onClick={() => setIsFree(opt.value)}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-md transition-all ${isFree === opt.value ? "bg-white text-black shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {!isFree && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] text-muted-foreground font-bold block mb-1">{{ ar: "السعر", fr: "Prix", en: "Price" }[lang]} *</label>
                    <Input type="number" min="0" step="100" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="5000" className="bg-white" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground font-bold block mb-1">{{ ar: "العملة", fr: "Devise", en: "Currency" }[lang]}</label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full h-10 px-2 bg-white border border-border rounded-lg text-foreground text-sm">
                      <option value="DZD">DZD</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="flex-1 py-3 font-bold bg-black hover:bg-black/90 text-white" disabled={isPending}>
                {isPending
                  ? { ar: "جارٍ الحفظ...", fr: "Enregistrement...", en: "Saving..." }[lang]
                  : isEditing || createdId
                    ? { ar: "حفظ التعديلات", fr: "Mettre à jour", en: "Update" }[lang]
                    : { ar: "إنشاء ومتابعة للمحتوى", fr: "Créer et continuer", en: "Create and continue" }[lang]}
              </Button>
              <Button type="button" variant="outline" onClick={goToDashboard} className="py-3">{{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}</Button>
            </div>
          </form>
        </div>
      ) : tab === "content" ? (
        activeCourseId && <CourseContentManager courseId={activeCourseId} />
      ) : (
        activeCourseId && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
            <div className="bg-white border border-border shadow-sm rounded-xl p-6 md:p-8 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-foreground mb-1">{{ ar: "قالب الشهادة", fr: "Modèle de certificat", en: "Certificate template" }[lang]}</h3>
                <p className="text-xs text-muted-foreground mb-3">{{ ar: "اختاري القالب الذي ستظهر به شهادة المتدربات", fr: "Choisissez le modèle utilisé pour la certification de cette formation", en: "Choose the template used for this course's certificate" }[lang]}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setCertificateTemplateId(null)}
                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-lg border text-xs font-bold h-16 ${certificateTemplateId === null ? "border-black bg-muted" : "border-border text-muted-foreground hover:bg-muted/50"}`}>
                    <Award className="w-4 h-4" />
                    {{ ar: "القالب الافتراضي", fr: "Modèle par défaut", en: "Default template" }[lang]}
                  </button>
                  {(templates ?? []).map((t) => (
                    <button key={t.id} type="button" onClick={() => setCertificateTemplateId(t.id)}
                      className={`flex flex-col items-center justify-center gap-1 p-3 rounded-lg border text-xs font-bold h-16 ${certificateTemplateId === t.id ? "border-black bg-muted" : "border-border text-muted-foreground hover:bg-muted/50"}`}>
                      <div className="flex gap-1"><span className="w-3 h-3 rounded-full border" style={{ backgroundColor: t.primaryColor }} /><span className="w-3 h-3 rounded-full border" style={{ backgroundColor: t.accentColor }} /></div>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-foreground">{{ ar: "امتحان نهائي إجباري", fr: "Examen final obligatoire", en: "Mandatory final exam" }[lang]}</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={examEnabled} onChange={(e) => setExamEnabled(e.target.checked)} className="w-4 h-4 rounded border-border text-black focus:ring-black" />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  {examEnabled
                    ? { ar: "المتدربة يجب أن تجتاز هذا الامتحان بعد إكمال كل الدروس للحصول على الشهادة تلقائيًا.", fr: "L'étudiante doit réussir cet examen après avoir complété toutes les leçons pour obtenir automatiquement son certificat.", en: "The student must pass this exam after completing all lessons to automatically get her certificate." }[lang]
                    : { ar: "بدون امتحان، تحصل المتدربة على الشهادة بمجرد إكمال كل الدروس.", fr: "Sans examen, l'étudiante obtient le certificat dès qu'elle a complété toutes les leçons.", en: "Without an exam, the student gets the certificate as soon as all lessons are completed." }[lang]}
                </p>

                {examEnabled && (
                  <div className="space-y-4">
                    <div>
                      <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1.5">
                        {{ ar: "نسبة النجاح المطلوبة (من 100)", fr: "Seuil de réussite requis (sur 100)", en: "Required passing score (out of 100)" }[lang]}
                      </label>
                      <Input type="number" min="0" max="100" value={passingScore} onChange={(e) => setPassingScore(parseInt(e.target.value) || 0)} className="bg-white w-32" />
                    </div>

                    <div className="space-y-3">
                      {examQuestions.map((q, qi) => (
                        <div key={qi} className="p-3 bg-[#fafafa] border border-border rounded-lg space-y-2">
                          <div className="flex items-center gap-2">
                            <Input value={q.question} onChange={(e) => setExamQuestions((qs) => qs.map((x, i) => i === qi ? { ...x, question: e.target.value } : x))}
                              placeholder={{ ar: `السؤال ${qi + 1}`, fr: `Question ${qi + 1}`, en: `Question ${qi + 1}` }[lang]} className="bg-white text-xs h-9 flex-1" />
                            {examQuestions.length > 1 && (
                              <button type="button" onClick={() => removeExamQuestion(qi)} className="text-rose-500 hover:bg-rose-50 rounded p-1 shrink-0"><X className="w-3.5 h-3.5" /></button>
                            )}
                          </div>
                          <div className="space-y-1.5 pl-1">
                            {q.options.map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-2">
                                <input type="radio" name={`exam-correct-${qi}`} checked={q.answer === oi}
                                  onChange={() => setExamQuestions((qs) => qs.map((x, i) => i === qi ? { ...x, answer: oi } : x))}
                                  className="shrink-0" title={{ ar: "الإجابة الصحيحة", fr: "Bonne réponse", en: "Correct answer" }[lang]} />
                                <Input value={opt} onChange={(e) => setExamQuestions((qs) => qs.map((x, i) => i === qi ? { ...x, options: x.options.map((o, oo) => oo === oi ? e.target.value : o) } : x))}
                                  placeholder={{ ar: `خيار ${oi + 1}`, fr: `Option ${oi + 1}`, en: `Option ${oi + 1}` }[lang]} className="bg-white text-xs h-8 flex-1" />
                                {q.options.length > 2 && (
                                  <button type="button" onClick={() => removeExamOption(qi, oi)} className="text-muted-foreground hover:text-rose-500 shrink-0"><X className="w-3 h-3" /></button>
                                )}
                              </div>
                            ))}
                            {q.options.length < 6 && (
                              <button type="button" onClick={() => addExamOption(qi)} className="text-[10px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1">
                                <Plus className="w-3 h-3" />{{ ar: "إضافة خيار", fr: "Ajouter une option", en: "Add option" }[lang]}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={addExamQuestion} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:text-foreground text-xs font-bold">
                        <Plus className="w-3.5 h-3.5" />{{ ar: "إضافة سؤال", fr: "Ajouter une question", en: "Add question" }[lang]}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <Button type="button" onClick={handleSaveCertification} disabled={certMutation.isPending} className="w-full py-3 font-bold bg-black hover:bg-black/90 text-white">
                {certMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                {{ ar: "حفظ إعدادات الشهادة", fr: "Enregistrer la certification", en: "Save certification settings" }[lang]}
              </Button>
            </div>

            <div className="bg-white border border-border shadow-sm rounded-xl p-6 md:p-8">
              <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                <GraduationCap className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{{ ar: "معاينة الشهادة", fr: "Aperçu du certificat", en: "Certificate preview" }[lang]}</span>
              </div>
              <div className="overflow-hidden origin-top" style={{ transform: "scale(0.78)", marginBottom: "-22%" }}>
                <CertificateDocument
                  studentName={{ ar: "اسم المتدربة", fr: "Nom de l'étudiante", en: "Student name" }[lang]}
                  courseName={title || { ar: "عنوان الدورة", fr: "Titre de la formation", en: "Course title" }[lang]}
                  coachName="—"
                  issuedAt={new Date().toISOString()}
                  code="APERCU"
                  examScore={examEnabled ? passingScore : null}
                  template={previewTemplate ?? { primaryColor: "#1e293b", accentColor: "#1e293b", customTitleText: "", signatureTitle: "", fontFamily: "serif" }}
                  lang={lang}
                />
              </div>
            </div>
          </div>
        )
      )}
    </CoachLayout>
  );
}
