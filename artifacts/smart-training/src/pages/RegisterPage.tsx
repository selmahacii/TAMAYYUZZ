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
import { Eye, EyeOff, GraduationCap, Mic, Info, Plus, X, Sparkles, Paperclip, Loader2, CheckCircle2 } from "lucide-react";
import { LogoMark } from "@/components/shared/LogoMark";

const schema = z.object({
  name: z.string().min(2, "Au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Au moins 6 caractères"),
  role: z.enum(["student", "coach"]),
});

type FormValues = z.infer<typeof schema>;

interface DiplomaDraft { name: string; documentUrl: string | null; verified: boolean }

function TagListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={item}
            onChange={(e) => onChange(items.map((it, ii) => (ii === i ? e.target.value : it)))}
            placeholder={placeholder}
            className="bg-white text-xs h-9"
          />
          <button type="button" onClick={() => onChange(items.filter((_, ii) => ii !== i))} className="text-muted-foreground hover:text-rose-500 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} className="text-[10px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1">
        <Plus className="w-3 h-3" />
        {placeholder}
      </button>
    </div>
  );
}

// KYC-style diploma editor: each entry can attach a proof document (scan/PDF) that
// an admin later reviews and marks verified — see admin/CoachesPage.tsx.
function DiplomaListEditor({ items, onChange, lang }: { items: DiplomaDraft[]; onChange: (items: DiplomaDraft[]) => void; lang: "ar" | "fr" | "en" }) {
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
    <div className="space-y-2">
      {items.map((item, i) => {
        const inputId = `diploma-doc-${i}`;
        return (
          <div key={i} className="flex items-center gap-2">
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
            <button type="button" onClick={() => onChange(items.filter((_, ii) => ii !== i))} className="text-muted-foreground hover:text-rose-500 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
      <button type="button" onClick={() => onChange([...items, { name: "", documentUrl: null, verified: false }])} className="text-[10px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1">
        <Plus className="w-3 h-3" />
        {{ ar: "إضافة شهادة", fr: "Ajouter un diplôme", en: "Add a diploma" }[lang]}
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
  const categories = Array.isArray(rawCategories) ? rawCategories : [
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
          diplomas: values.role === "coach" ? diplomas.filter((d) => d.name.trim()).map((d) => ({ ...d, name: d.name.trim() })) : [],
          priorTrainings: values.role === "coach" ? priorTrainings.map((t) => t.trim()).filter(Boolean) : [],
          teachingPlan: values.role === "coach" ? (teachingPlan.trim() || null) : null,
          interests: values.role === "student" ? interests : [],
        },
      },
      {
        onSuccess: (data) => {
          setToken(data.token);
          toast({
            title: { ar: "مرحباً بك!", fr: "Bienvenue !", en: "Welcome!" }[lang],
            description: { ar: "تم إنشاء حسابك بنجاح.", fr: "Votre compte a été créé avec succès.", en: "Your account has been created successfully." }[lang],
          });
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error ?? { ar: "فشل التسجيل", fr: "Inscription échouée", en: "Registration failed" }[lang];
          toast({ title: { ar: "خطأ", fr: "Erreur", en: "Error" }[lang], description: msg, variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden bg-[#fafafa]" dir={isRTL ? "rtl" : "ltr"}>
      <div className="bg-grid-pattern absolute inset-0 opacity-5" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white border border-border rounded-xl p-8 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-border shadow-xs p-1">
                <LogoMark className="w-full h-full object-contain" />
              </div>
              <span className="text-base font-black text-foreground" style={{ fontFamily: "Cairo, sans-serif" }}>Tamayyuz</span>
            </div>
            <div className="flex items-center gap-1 rounded-lg p-0.5 bg-muted">
              {(["ar", "fr", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${lang === l ? "bg-white text-black shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <h2 className="text-2xl font-black text-foreground text-center mb-1" style={{ fontFamily: "Cairo, sans-serif" }}>
            {{ ar: "إنشاء حساب جديد", fr: "S'inscrire", en: "Create an account" }[lang]}
          </h2>
          <p className="text-muted-foreground text-center text-xs mb-6">
            {{ ar: "الانضمام مجاناً", fr: "Créer un compte gratuitement", en: "Join for free" }[lang]}
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { role: "student" as const, icon: <GraduationCap className="w-5 h-5" />, label: { ar: "طالبة", fr: "Étudiante", en: "Student" }, desc: { ar: "تعلّمي وتطوّري", fr: "Apprenez et évoluez", en: "Learn and grow" } },
              { role: "coach" as const, icon: <Mic className="w-5 h-5" />, label: { ar: "مدرّبة", fr: "Coach", en: "Coach" }, desc: { ar: "درّسي واكسبي", fr: "Enseignez et gagnez", en: "Teach and earn" } },
            ].map(({ role, icon, label, desc }) => (
              <button
                key={role}
                type="button"
                onClick={() => form.setValue("role", role)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 text-center ${
                  selectedRole === role
                    ? "border-black bg-black text-white"
                    : "border-border bg-white text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                data-testid={`role-${role}`}
              >
                {icon}
                <div>
                  <p className="text-xs font-bold" style={{ fontFamily: "Cairo, sans-serif" }}>{label[lang]}</p>
                  <p className="text-[10px] opacity-75 mt-0.5" style={{ fontFamily: "Cairo, sans-serif" }}>{desc[lang]}</p>
                </div>
              </button>
            ))}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-semibold">{{ ar: "الاسم الكامل", fr: "Nom complet", en: "Full name" }[lang]}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={{ ar: "اسمك", fr: "Votre nom", en: "Your name" }[lang]}
                        className="h-11 rounded-lg bg-white border-border text-foreground"
                        data-testid="input-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-semibold">{{ ar: "البريد الإلكتروني", fr: "Email", en: "Email" }[lang]}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="vous@exemple.com"
                        className="h-11 rounded-lg bg-white border-border text-foreground"
                        data-testid="input-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-semibold">{{ ar: "كلمة المرور", fr: "Mot de passe", en: "Password" }[lang]}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="h-11 rounded-lg bg-white border-border text-foreground pr-10"
                          data-testid="input-password"
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowPassword((v) => !v)}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Domain / field — shared by both roles, drives course recommendations */}
              <div>
                <label className="text-foreground font-semibold text-sm block mb-1.5">
                  {selectedRole === "coach"
                    ? { ar: "مجال التخصص", fr: "Domaine de spécialité", en: "Area of specialty" }[lang]
                    : { ar: "مجال الدراسة", fr: "Domaine d'études", en: "Field of study" }[lang]}
                </label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full h-11 px-3 bg-white border border-border rounded-lg text-foreground text-sm"
                >
                  <option value="">{{ ar: "اختاري...", fr: "Choisir...", en: "Choose..." }[lang]}</option>
                  {(categories ?? []).map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  <option value="__custom__">{{ ar: "أخرى (تحديد)", fr: "Autre (préciser)", en: "Other (specify)" }[lang]}</option>
                </select>
                {domain === "__custom__" && (
                  <Input
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder={{ ar: "اسم المجال", fr: "Nom du domaine", en: "Domain name" }[lang]}
                    className="bg-white mt-2 h-10"
                  />
                )}
              </div>

              {selectedRole === "coach" && (
                <>
                  <div>
                    <label className="text-foreground font-semibold text-sm block mb-1.5">{{ ar: "رقم الهاتف", fr: "Numéro de téléphone", en: "Phone number" }[lang]}</label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+213 5XX XX XX XX"
                      className="h-11 rounded-lg bg-white border-border text-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-foreground font-semibold text-sm block mb-1.5">
                      {{ ar: "الشهادات والدبلومات", fr: "Diplômes et certifications", en: "Diplomas and certifications" }[lang]}
                    </label>
                    <p className="text-[10px] text-muted-foreground mb-1.5">
                      {{ ar: "أرفقي نسخة من الشهادة للتحقق منها من طرف الإدارة", fr: "Joignez une copie du diplôme — elle sera vérifiée par l'équipe admin", en: "Attach a copy of the diploma — it will be reviewed by the admin team" }[lang]}
                    </p>
                    <DiplomaListEditor items={diplomas} onChange={setDiplomas} lang={lang} />
                  </div>

                  <div>
                    <label className="text-foreground font-semibold text-sm block mb-1.5">
                      {{ ar: "التكوينات والخبرات السابقة", fr: "Formations et expériences antérieures", en: "Prior trainings and experience" }[lang]}
                    </label>
                    <TagListEditor items={priorTrainings} onChange={setPriorTrainings} placeholder={{ ar: "إضافة تكوين", fr: "Ajouter une formation", en: "Add a training" }[lang]} />
                  </div>

                  <div>
                    <label className="text-foreground font-semibold text-sm block mb-1.5">{{ ar: "ماذا تنوين نشره؟", fr: "Que comptez-vous publier ?", en: "What do you plan to publish?" }[lang]}</label>
                    <textarea
                      value={teachingPlan}
                      onChange={(e) => setTeachingPlan(e.target.value)}
                      rows={3}
                      placeholder={{ ar: "صفي الدورات التي تخططين لتقديمها...", fr: "Décrivez les formations que vous prévoyez de proposer...", en: "Describe the courses you plan to offer..." }[lang]}
                      className="w-full px-3 py-2.5 rounded-lg text-sm text-foreground bg-white border border-border outline-none resize-none focus-visible:ring-2 focus-visible:ring-black/70"
                    />
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold leading-relaxed" style={{ fontFamily: "Cairo, sans-serif" }}>
                      {{
                        ar: "حسابات المدرّبات تحتاج موافقة المشرف قبل نشر الدورات.",
                        fr: "Les comptes coachs nécessitent une approbation admin avant de publier des formations.",
                        en: "Coach accounts require admin approval before publishing courses.",
                      }[lang]}
                    </p>
                  </div>
                </>
              )}

              {selectedRole === "student" && (
                <div>
                  <label className="text-foreground font-semibold text-sm flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {{ ar: "اهتماماتك (لاقتراح دورات مناسبة)", fr: "Vos centres d'intérêt (pour des suggestions adaptées)", en: "Your interests (for tailored suggestions)" }[lang]}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(categories ?? []).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleInterest(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                          interests.includes(cat)
                            ? "bg-black text-white border-black"
                            : "bg-white text-foreground border-border hover:border-black"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 rounded-lg font-bold text-sm bg-black hover:bg-black/90 text-white transition-all shadow-sm"
                disabled={registerMutation.isPending}
                data-testid="button-register"
              >
                {registerMutation.isPending
                  ? { ar: "جارٍ الإنشاء...", fr: "Création...", en: "Creating..." }[lang]
                  : { ar: "إنشاء الحساب", fr: "Créer mon compte", en: "Create my account" }[lang]}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {{ ar: "لديك حساب بالفعل؟", fr: "Déjà inscrite ?", en: "Already have an account?" }[lang]}{" "}
            <Link href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login"} className="font-bold text-black hover:underline" data-testid="link-login">
              {{ ar: "تسجيل الدخول", fr: "Se connecter", en: "Log in" }[lang]}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
