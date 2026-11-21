import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister, useGetCategories, useUploadFile } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  Eye, EyeOff, GraduationCap, Award, Info, Plus, X, Sparkles,
  Paperclip, Loader2, CheckCircle2, User, Mail, Lock, Phone,
  BookOpen, Briefcase, ShieldCheck, ArrowLeft, ArrowRight
} from "lucide-react";
import { TamayuzDigitalLogo } from "@/components/shared/TamayuzDigitalLogo";

const schema = z.object({
  name: z.string().min(2, "Au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Au moins 6 caractères"),
  role: z.enum(["student", "coach"]),
});

type FormValues = z.infer<typeof schema>;

interface DiplomaDraft {
  name: string;
  documentUrl: string | null;
  verified: boolean;
}

function TagListEditor({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={item}
            onChange={(e) => onChange(items.map((it, ii) => (ii === i ? e.target.value : it)))}
            placeholder={placeholder}
            className="bg-white text-xs h-9.5 rounded-xl border-neutral-300"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, ii) => ii !== i))}
            className="text-neutral-400 hover:text-rose-600 p-1 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="text-xs font-bold text-[#0c3b2e] hover:text-[#144f3e] flex items-center gap-1.5 py-1 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>{placeholder}</span>
      </button>
    </div>
  );
}

function DiplomaListEditor({
  items,
  onChange,
  lang,
}: {
  items: DiplomaDraft[];
  onChange: (items: DiplomaDraft[]) => void;
  lang: "ar" | "fr" | "en";
}) {
  const uploadMutation = useUploadFile();
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const handleFile = (idx: number, file: File) => {
    setUploadingIdx(idx);
    uploadMutation.mutate(
      { data: { file } },
      {
        onSuccess: (res) => {
          onChange(items.map((it, ii) => (ii === idx ? { ...it, documentUrl: res.url } : it)));
          setUploadingIdx(null);
        },
        onError: () => setUploadingIdx(null),
      }
    );
  };

  return (
    <div className="space-y-2.5">
      {items.map((item, i) => {
        const inputId = `diploma-doc-${i}`;
        return (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item.name}
              onChange={(e) => onChange(items.map((it, ii) => (ii === i ? { ...it, name: e.target.value } : it)))}
              placeholder={{ ar: "اسم الشهادة أو الدبلوم الجامعي", fr: "Nom du diplôme ou certificat", en: "Diploma or certificate name" }[lang]}
              className="bg-white text-xs h-9.5 rounded-xl border-neutral-300 flex-1"
            />
            <input
              id={inputId}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(i, f);
                e.target.value = "";
              }}
            />
            <label
              htmlFor={inputId}
              className={`shrink-0 h-9.5 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-all ${
                item.documentUrl
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-neutral-300 bg-white text-neutral-600 hover:border-[#0c3b2e] hover:text-[#0c3b2e]"
              }`}
            >
              {uploadingIdx === i ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0c3b2e]" />
              ) : item.documentUrl ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Paperclip className="w-3.5 h-3.5" />
              )}
              <span>
                {item.documentUrl
                  ? { ar: "تم الإرفاق", fr: "Joint", en: "Attached" }[lang]
                  : { ar: "إرفاق الملف", fr: "Joindre", en: "Attach" }[lang]}
              </span>
            </label>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, ii) => ii !== i))}
              className="text-neutral-400 hover:text-rose-600 p-1 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => onChange([...items, { name: "", documentUrl: null, verified: false }])}
        className="text-xs font-bold text-[#0c3b2e] hover:text-[#144f3e] flex items-center gap-1.5 py-1 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>{{ ar: "إضافة شهادة أو اعتماد", fr: "Ajouter un diplôme", en: "Add diploma" }[lang]}</span>
      </button>
    </div>
  );
}

export default function RegisterPage() {
  const { user, setToken } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const redirectTo = new URLSearchParams(search).get("redirect");
  const { toast } = useToast();
  const { lang, setLang, isRTL } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const registerMutation = useRegister();
  const { data: rawCategories } = useGetCategories();
  const categories = Array.isArray(rawCategories)
    ? rawCategories
    : [
        "Business", "Marketing", "Finance", "Technology",
        "Communication", "Personal Development", "Design",
        "Entrepreneuriat", "Management", "Other"
      ];

  // Coach-only fields
  const [phone, setPhone] = useState("");
  const [domain, setDomain] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [diplomas, setDiplomas] = useState<DiplomaDraft[]>([]);
  const [priorTrainings, setPriorTrainings] = useState<string[]>([]);
  const [teachingPlan, setTeachingPlan] = useState("");

  // Student-only field
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      if (user.role === "admin") setLocation("/admin/dashboard");
      else if (user.role === "coach") setLocation("/coach/dashboard");
      else setLocation(redirectTo || "/student/home");
    }
  }, [user, setLocation, redirectTo]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", role: "student" },
  });

  const selectedRole = form.watch("role");

  const toggleInterest = (cat: string) => {
    setInterests((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const onSubmit = (values: FormValues) => {
    const finalDomain = domain === "__custom__" ? customDomain.trim() : domain;
    registerMutation.mutate(
      {
        data: {
          ...values,
          phone: phone.trim() || null,
          domain: finalDomain || null,
          diplomas:
            values.role === "coach"
              ? diplomas.filter((d) => d.name.trim()).map((d) => ({ ...d, name: d.name.trim() }))
              : [],
          priorTrainings: values.role === "coach" ? priorTrainings.map((t) => t.trim()).filter(Boolean) : [],
          teachingPlan: values.role === "coach" ? teachingPlan.trim() || null : null,
          interests: values.role === "student" ? interests : [],
        },
      },
      {
        onSuccess: (data) => {
          setToken(data.token);
          toast({
            title: { ar: "مرحباً بكِ في منصة التميز!", fr: "Bienvenue sur Tamayuz !", en: "Welcome to Tamayuz!" }[lang],
            description: {
              ar: "تم إنشاء حسابكِ بنجاح.",
              fr: "Votre compte a été créé avec succès.",
              en: "Your account has been created successfully.",
            }[lang],
          });
        },
        onError: (err: any) => {
          const msg =
            err?.response?.data?.error ??
            { ar: "فشل إنشاء الحساب", fr: "Inscription échouée", en: "Registration failed" }[lang];
          toast({ title: { ar: "خطأ", fr: "Erreur", en: "Error" }[lang], description: msg, variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#f8faf8] py-8 sm:py-12 px-4 sm:px-6 flex flex-col justify-between" dir={isRTL ? "rtl" : "ltr"}>
      <div className="w-full max-w-2xl mx-auto">
        {/* Top Institutional Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/student/home">
            <div className="cursor-pointer">
              <TamayuzDigitalLogo className="w-10 h-10" />
            </div>
          </Link>
          <div className="flex items-center gap-1 rounded-lg p-0.5 bg-neutral-100 border border-neutral-200/80 text-xs font-bold shadow-2xs">
            {(["ar", "fr", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase transition-all cursor-pointer ${
                  lang === l ? "bg-[#0c3b2e] text-white shadow-2xs font-black" : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Card Container */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 sm:p-10 shadow-sm">
          {/* Card Title */}
          <div className="text-center mb-8">
            <h1
              className="text-2xl sm:text-3xl font-black text-neutral-900 mb-2"
              style={{ fontFamily: "Cairo, sans-serif" }}
            >
              {{ ar: "إنشاء حساب جديد", fr: "Créer un compte", en: "Create an Account" }[lang]}
            </h1>
            <p className="text-neutral-500 text-xs sm:text-sm font-medium" style={{ fontFamily: "Cairo, sans-serif" }}>
              {{
                ar: "انضمي إلى المنصة الأكاديمية الرائدة وابدئي مسار التميز",
                fr: "Rejoignez la plateforme académique d'excellence pour débuter votre parcours",
                en: "Join the leading digital academy and start your path of excellence",
              }[lang]}
            </p>
          </div>

          {/* Role Selector: Student vs Coach */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-8">
            {[
              {
                role: "student" as const,
                icon: GraduationCap,
                label: { ar: "طالبة / متعلمة", fr: "Étudiante / Apprenante", en: "Student / Learner" },
                desc: {
                  ar: "متابعة الدورات، اجتياز الاختبارات ونيل الشهادات المعتمدة",
                  fr: "Suivre des cours, passer les examens et obtenir des certifications",
                  en: "Access courses, take exams and earn certified diplomas",
                },
              },
              {
                role: "coach" as const,
                icon: Award,
                label: { ar: "أستاذة / مدرّبة", fr: "Formatrice / Coach", en: "Coach / Instructor" },
                desc: {
                  ar: "نشر البرامج التدريبية، إدارة الأفواج وتحقيق العوائد",
                  fr: "Publier des formations, encadrer des cohortes et monétiser vos cours",
                  en: "Publish training courses, mentor student cohorts and earn revenue",
                },
              },
            ].map(({ role, icon: Icon, label, desc }) => {
              const isActive = selectedRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => form.setValue("role", role)}
                  className={`p-4 rounded-xl border text-right transition-all flex items-start gap-3.5 cursor-pointer ${
                    isActive
                      ? "border-[#0c3b2e] bg-[#0c3b2e]/5 ring-1 ring-[#0c3b2e] shadow-2xs"
                      : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                  data-testid={`role-${role}`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                      isActive ? "bg-[#0c3b2e] text-[#d4af37]" : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3
                      className={`font-black text-xs sm:text-sm mb-0.5 ${
                        isActive ? "text-[#0c3b2e]" : "text-neutral-900"
                      }`}
                      style={{ fontFamily: "Cairo, sans-serif" }}
                    >
                      {label[lang]}
                    </h3>
                    <p className="text-neutral-500 text-[11px] leading-relaxed font-medium">
                      {desc[lang]}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Registration Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-neutral-800 font-bold text-xs" style={{ fontFamily: "Cairo, sans-serif" }}>
                      {{ ar: "الاسم واللقب الكامل", fr: "Nom complet", en: "Full name" }[lang]}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder={{ ar: "مثال: مريم بن علي", fr: "Ex: Meriem Benali", en: "Ex: Meriem Benali" }[lang]}
                          className="h-11 rounded-xl bg-white border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-[#0c3b2e] pl-10 pr-4 text-xs sm:text-sm"
                          data-testid="input-name"
                          {...field}
                        />
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-neutral-800 font-bold text-xs" style={{ fontFamily: "Cairo, sans-serif" }}>
                      {{ ar: "البريد الإلكتروني", fr: "Adresse email", en: "Email address" }[lang]}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="email"
                          placeholder="votre.email@domaine.com"
                          className="h-11 rounded-xl bg-white border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-[#0c3b2e] pl-10 pr-4 text-xs sm:text-sm"
                          data-testid="input-email"
                          {...field}
                        />
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-neutral-800 font-bold text-xs" style={{ fontFamily: "Cairo, sans-serif" }}>
                      {{ ar: "كلمة المرور (6 أحرف كحد أدنى)", fr: "Mot de passe (6 car. min.)", en: "Password (min 6 chars)" }[lang]}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="h-11 rounded-xl bg-white border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-[#0c3b2e] pl-10 pr-10 text-xs sm:text-sm"
                          data-testid="input-password"
                          {...field}
                        />
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <button
                          type="button"
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
                          onClick={() => setShowPassword((v) => !v)}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Domain / Field of Study / Specialty */}
              <div>
                <label className="text-neutral-800 font-bold text-xs block mb-1.5" style={{ fontFamily: "Cairo, sans-serif" }}>
                  {selectedRole === "coach"
                    ? { ar: "مجال التخصص الأكاديمي والتدريبي", fr: "Domaine de spécialité", en: "Area of specialty" }[lang]
                    : { ar: "مجال الدراسة أو الاهتمام الرئيسي", fr: "Domaine d'études ou d'intérêt", en: "Field of study" }[lang]}
                </label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-neutral-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0c3b2e]"
                >
                  <option value="">{{ ar: "اختاري المجال...", fr: "Sélectionnez un domaine...", en: "Select a field..." }[lang]}</option>
                  {(categories ?? []).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__custom__">{{ ar: "مجال آخر (تحديد)", fr: "Autre (spécifier)", en: "Other (specify)" }[lang]}</option>
                </select>
                {domain === "__custom__" && (
                  <Input
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder={{ ar: "اسم المجال الأكاديمي", fr: "Précisez votre domaine", en: "Specify domain" }[lang]}
                    className="bg-white mt-2 h-10 rounded-xl border-neutral-300 text-xs"
                  />
                )}
              </div>

              {/* Coach Specific KYC Dossier */}
              {selectedRole === "coach" && (
                <div className="space-y-4 pt-3 border-t border-neutral-200">
                  <div>
                    <label className="text-neutral-800 font-bold text-xs block mb-1.5" style={{ fontFamily: "Cairo, sans-serif" }}>
                      {{ ar: "رقم الهاتف للتواصل الإداري", fr: "Numéro de téléphone", en: "Phone number" }[lang]}
                    </label>
                    <div className="relative">
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+213 5XX XX XX XX"
                        className="h-11 rounded-xl bg-white border-neutral-300 pl-10 pr-4 text-xs sm:text-sm"
                      />
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    </div>
                  </div>

                  <div>
                    <label className="text-neutral-800 font-bold text-xs block mb-1" style={{ fontFamily: "Cairo, sans-serif" }}>
                      {{ ar: "الشهادات الأكاديمية والاعتمادات (KYC)", fr: "Diplômes et certifications professionnelles", en: "Academic diplomas & credentials" }[lang]}
                    </label>
                    <p className="text-[11px] text-neutral-500 mb-2 font-medium">
                      {{
                        ar: "أرفقي نسخاً واضحة من الشهادات ليتم تدقيقها واعتماد ملفكِ من طرف الإدارة الأكاديمية.",
                        fr: "Joignez les copies de vos diplômes pour audit et validation par le comité pédagogique.",
                        en: "Attach copies of your credentials for review by our academic board.",
                      }[lang]}
                    </p>
                    <DiplomaListEditor items={diplomas} onChange={setDiplomas} lang={lang} />
                  </div>

                  <div>
                    <label className="text-neutral-800 font-bold text-xs block mb-1.5" style={{ fontFamily: "Cairo, sans-serif" }}>
                      {{ ar: "التكوينات والخبرات الميدانية السابقة", fr: "Formations et expériences antérieures", en: "Prior training & field experience" }[lang]}
                    </label>
                    <TagListEditor
                      items={priorTrainings}
                      onChange={setPriorTrainings}
                      placeholder={{ ar: "إضافة خبرة أو تكوين سابق", fr: "Ajouter une expérience", en: "Add training" }[lang]}
                    />
                  </div>

                  <div>
                    <label className="text-neutral-800 font-bold text-xs block mb-1.5" style={{ fontFamily: "Cairo, sans-serif" }}>
                      {{ ar: "مخطط النشر والبرنامج التدريبي المقترح", fr: "Plan pédagogique et formations envisagées", en: "Proposed training curriculum" }[lang]}
                    </label>
                    <textarea
                      value={teachingPlan}
                      onChange={(e) => setTeachingPlan(e.target.value)}
                      rows={3}
                      placeholder={{
                        ar: "صفي بإيجاز الدورات والمحاور التي ترغبين في تدريسها للجمهور المستهدف...",
                        fr: "Décrivez les formations que vous souhaitez animer et vos objectifs...",
                        en: "Briefly outline the courses and topics you plan to offer...",
                      }[lang]}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm text-neutral-900 bg-white border border-neutral-300 outline-none resize-none focus:ring-2 focus:ring-[#0c3b2e]"
                    />
                  </div>

                  {/* Verification Notice */}
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <p className="leading-relaxed font-medium" style={{ fontFamily: "Cairo, sans-serif" }}>
                      {{
                        ar: "يخضع حساب المدربة للمراجعة والتدقيق الأكاديمي خلال 24 إلى 48 ساعة قبل نشر الدورات وبدء التدريب.",
                        fr: "Les profils de formatrices sont audités par notre direction pédagogique sous 24-48h avant publication.",
                        en: "Coach profiles undergo academic review within 24-48h before publishing courses.",
                      }[lang]}
                    </p>
                  </div>
                </div>
              )}

              {/* Student Interests Badges */}
              {selectedRole === "student" && (
                <div className="pt-2">
                  <label className="text-neutral-800 font-bold text-xs flex items-center gap-1.5 mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>
                    <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
                    {{
                      ar: "مجالات اهتمامكِ (لتخصيص الاقتراحات ومحتوى بلدكِ)",
                      fr: "Centres d'intérêt (pour adapter vos recommandations)",
                      en: "Areas of interest (for tailored recommendations)",
                    }[lang]}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(categories ?? []).map((cat) => {
                      const isSelected = interests.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleInterest(cat)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            isSelected
                              ? "bg-[#0c3b2e] text-white border-[#0c3b2e] shadow-2xs"
                              : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100"
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11.5 rounded-xl font-bold text-sm bg-[#0c3b2e] hover:bg-[#144f3e] active:bg-[#08281d] text-white transition-all shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 mt-4"
                disabled={registerMutation.isPending}
                style={{ fontFamily: "Cairo, sans-serif" }}
                data-testid="button-register"
              >
                {registerMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {{ ar: "جارٍ إنشاء الحساب...", fr: "Création en cours...", en: "Creating account..." }[lang]}
                  </span>
                ) : (
                  <>
                    <span>{{ ar: "إنشاء الحساب والبدء الآن", fr: "Créer mon compte", en: "Create Account" }[lang]}</span>
                    {isRTL ? <ArrowLeft className="w-4 h-4 text-[#e5b858]" /> : <ArrowRight className="w-4 h-4 text-[#e5b858]" />}
                  </>
                )}
              </Button>
            </form>
          </Form>

          {/* Login Link */}
          <div className="mt-8 pt-6 border-t border-neutral-100 text-center">
            <p className="text-xs sm:text-sm text-neutral-600" style={{ fontFamily: "Cairo, sans-serif" }}>
              {{ ar: "لديكِ حساب بالفعل؟", fr: "Déjà inscrite ?", en: "Already have an account?" }[lang]}{" "}
              <Link
                href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login"}
                className="font-black text-[#0c3b2e] hover:text-[#144f3e] hover:underline inline-flex items-center gap-1"
                data-testid="link-login"
              >
                <span>{{ ar: "تسجيل الدخول", fr: "Se connecter", en: "Sign In" }[lang]}</span>
                <span>←</span>
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-neutral-400 mt-6">
          © {new Date().getFullYear()} منصة التميز الرقمي · Digital Tamayuz Platform
        </div>
      </div>
    </div>
  );
}
