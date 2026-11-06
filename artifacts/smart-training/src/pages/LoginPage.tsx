import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Star, GraduationCap, Briefcase, ShieldAlert, KeyRound, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LogoMark } from "@/components/shared/LogoMark";

const schema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(6, "Au moins 6 caractères"),
});

type FormValues = z.infer<typeof schema>;

const testimonials = [
  {
    name: { ar: "أمينة بوزيد", fr: "Amina Bouzid", en: "Amina Bouzid" },
    role: { ar: "رئيسة مشروع، الجزائر العاصمة", fr: "Cheffe de projet, Alger", en: "Project Lead, Algiers" },
    text: { ar: "منصة تميّز مكّنتني من تطوير مهاراتي في الإدارة خلال ٣ أشهر فقط.", fr: "Tamayyuz m'a permis de développer mes compétences en management en seulement 3 mois.", en: "Tamayyuz helped me develop my management skills in just 3 months." },
    stars: 5,
  },
  {
    name: { ar: "سارة مزراق", fr: "Sara Mezraq", en: "Sara Mezraq" },
    role: { ar: "رائدة أعمال، وهران", fr: "Entrepreneuse, Oran", en: "Entrepreneur, Oran" },
    text: { ar: "الدورات ملائمة للسوق الجزائري. استثمار ممتاز!", fr: "Les formations sont adaptées au marché algérien. Excellent investissement!", en: "The courses are tailored to the Algerian market. Excellent investment!" },
    stars: 5,
  },
];

export default function LoginPage() {
  const { user, setToken, logout } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const redirectTo = new URLSearchParams(search).get("redirect");
  const { toast } = useToast();
  const { lang, setLang, isRTL } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"student" | "coach" | "admin">("student");
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);

  const loginMutation = useLogin();

  useEffect(() => {
    if (user) {
      if (user.role === "admin") setLocation("/admin/dashboard");
      else if (user.role === "coach") {
        if (!user.isApproved) {
          // Stay on page to show pedagogical pending message
          return;
        }
        setLocation("/coach/dashboard");
      }
      else setLocation(redirectTo || "/student/home");
    }
  }, [user, setLocation, redirectTo]);

  useEffect(() => {
    const timer = setInterval(() => setTestimonialIdx((i) => (i + 1) % testimonials.length), 4000);
    return () => clearInterval(timer);
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: FormValues) => {
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => setToken(data.token),
        onError: () => toast({
          title: { ar: "فشل تسجيل الدخول", fr: "Échec de connexion", en: "Login failed" }[lang],
          description: { ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة", fr: "Email ou mot de passe incorrect", en: "Incorrect email or password" }[lang],
          variant: "destructive",
        }),
      }
    );
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingForgot(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, newPassword: forgotStep === 2 ? newPassword : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");

      if (forgotStep === 1) {
        setForgotStep(2);
        toast({ title: { ar: "تم التحقق", fr: "Email vérifié", en: "Email verified" }[lang], description: data.message });
      } else {
        toast({ title: { ar: "تم التغيير بنجاح", fr: "Mot de passe réinitialisé", en: "Password reset" }[lang], description: data.message });
        setShowForgotModal(false);
        setForgotStep(1);
        setForgotEmail("");
        setNewPassword("");
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  const testimonial = testimonials[testimonialIdx];

  const LangSwitcher = ({ className }: { className?: string }) => (
    <div className={`flex items-center gap-1 rounded-lg p-0.5 bg-white/10 border border-white/10 ${className ?? ""}`}>
      {(["ar", "fr", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${lang === l ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen grid lg:grid-cols-2" dir={isRTL ? "rtl" : "ltr"}>
      {/* Left panel: Vivid animated hero */}
      <div className="hidden lg:flex flex-col justify-between px-14 py-12 relative overflow-hidden" style={{ background: "linear-gradient(160deg, #000000 0%, #171717 60%, #0a0a0a 100%)" }}>
        <div className="bg-grid-pattern absolute inset-0 opacity-10" />

        {/* Floating gradient orbs for a "vivante" feel */}
        <div
          className="absolute -top-24 -right-16 w-80 h-80 rounded-full blur-3xl opacity-30 animate-[float1_9s_ease-in-out_infinite]"
          style={{ background: "radial-gradient(circle, hsl(258,85%,60%), transparent 70%)" }}
        />
        <div
          className="absolute bottom-10 -left-20 w-72 h-72 rounded-full blur-3xl opacity-25 animate-[float2_11s_ease-in-out_infinite]"
          style={{ background: "radial-gradient(circle, hsl(35,90%,55%), transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 right-1/4 w-56 h-56 rounded-full blur-3xl opacity-20 animate-[float1_13s_ease-in-out_infinite_reverse]"
          style={{ background: "radial-gradient(circle, hsl(330,80%,55%), transparent 70%)" }}
        />
        <style>{`
          @keyframes float1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-24px,30px) scale(1.08); } }
          @keyframes float2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(28px,-24px) scale(1.1); } }
          @keyframes pulseGlow { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
        `}</style>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-14">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white shadow-[0_0_24px_rgba(255,255,255,0.25)] p-1.5">
                <LogoMark className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-black text-white" style={{ fontFamily: "Cairo, sans-serif" }}>Tamayyuz</span>
            </div>
            <LangSwitcher />
          </div>

          <div className="mb-10">
            <p className="text-white/50 text-xs uppercase tracking-widest font-bold mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: "pulseGlow 2s ease-in-out infinite" }} />
              {{ ar: "منصة التدريب الذكي", fr: "Plateforme de formation intelligente", en: "Intelligent Training Platform" }[lang]}
            </p>
            <h1 className="text-4xl font-black text-white leading-tight mb-4" style={{ fontFamily: "Cairo, sans-serif" }}>
              {{ ar: "طوّري مسيرتك", fr: "Boostez votre", en: "Grow your" }[lang]}<br />
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg, hsl(258,85%,70%), hsl(35,90%,65%))" }}>
                {{ ar: "المهنية اليوم", fr: "carrière dès aujourd'hui", en: "career today" }[lang]}
              </span>
            </h1>
            <p className="text-white/75 text-sm leading-relaxed">
              {{
                ar: "انضمي إلى آلاف النساء الجزائريات اللواتي يطوّرن مهاراتهن ويحوّلن مسيرتهن المهنية بفضل دوراتنا الاحترافية.",
                fr: "Rejoignez des milliers de femmes algériennes qui développent leurs compétences et transforment leurs carrières grâce à nos formations expertes.",
                en: "Join thousands of Algerian women developing their skills and transforming their careers with our expert-led courses.",
              }[lang]}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-12">
            {[
              { value: "+500", label: { ar: "دورة", fr: "Formations", en: "Courses" } },
              { value: "+10K", label: { ar: "طالبة", fr: "Étudiantes", en: "Students" } },
              { value: "+200", label: { ar: "مدرّبة", fr: "Coachs", en: "Coaches" } },
            ].map(({ value, label }) => (
              <div key={label.en} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center hover:bg-white/10 hover:-translate-y-0.5 hover:border-white/20 transition-all duration-300">
                <div className="text-2xl font-black text-white mb-0.5">{value}</div>
                <div className="text-white/65 text-xs" style={{ fontFamily: "Cairo, sans-serif" }}>{label[lang]}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div key={testimonialIdx} className="bg-white/5 border border-white/10 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex gap-1 mb-3">
              {Array.from({ length: testimonial.stars }).map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
            </div>
            <p className="text-white/85 text-sm leading-relaxed mb-4 italic">"{testimonial.text[lang]}"</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-black shrink-0" style={{ background: "linear-gradient(135deg, hsl(258,85%,75%), hsl(35,90%,70%))" }}>
                {testimonial.name[lang].charAt(0)}
              </div>
              <div>
                <p className="text-white font-semibold text-sm" style={{ fontFamily: "Cairo, sans-serif" }}>{testimonial.name[lang]}</p>
                <p className="text-white/55 text-xs">{testimonial.role[lang]}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 justify-center mt-3">
            {testimonials.map((_, i) => (
              <button key={i} onClick={() => setTestimonialIdx(i)} className="h-1 rounded-full transition-all duration-300" style={{ width: i === testimonialIdx ? "1.5rem" : "0.375rem", background: i === testimonialIdx ? "#ffffff" : "rgba(255,255,255,0.2)" }} />
            ))}
          </div>
        </div>
      </div>

      {/* Right panel: Minimalist White Login Form */}
      <div className="flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-border shadow-xs p-1">
                <LogoMark className="w-full h-full object-contain" />
              </div>
              <span className="text-lg font-black text-foreground" style={{ fontFamily: "Cairo, sans-serif" }}>Tamayyuz</span>
            </div>
            <div className="flex items-center gap-1 rounded-lg p-0.5 bg-muted lg:ml-auto">
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

          {/* Coach Pending Approval Banner */}
          {user && user.role === "coach" && !user.isApproved && (
            <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                {{ ar: "الملف قيد المراجعة", fr: "Profil en cours de validation", en: "Profile under review" }[lang]}
              </div>
              <p className="leading-relaxed">
                {{
                  ar: "مرحباً بك! ملف تدريبك والشهادات المرفقة قيد المراجعة والتحقق من قبل إدارتنا (خلال 24 إلى 48 ساعة). ستصلك الموافقة قريباً.",
                  fr: "Votre profil de coach et vos justificatifs sont en cours de validation par notre équipe pédagogique sous 24-48h.",
                  en: "Your coach profile and credentials are being reviewed by our team within 24-48 hours.",
                }[lang]}
              </p>
              <Button onClick={() => logout()} variant="outline" size="sm" className="w-full h-8 text-[11px] border-amber-300 bg-white">
                {{ ar: "تسجيل الخروج", fr: "Se déconnecter", en: "Log out" }[lang]}
              </Button>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: "Cairo, sans-serif" }}>
              {{ ar: "أهلاً بكِ مجدداً", fr: "Bon retour", en: "Welcome back" }[lang]}
            </h2>
            <p className="text-muted-foreground text-sm">
              {{ ar: "أدخلي بياناتك لمتابعة تعلّمك", fr: "Connectez-vous à votre espace", en: "Log in to your space" }[lang]}
            </p>
          </div>

          {/* Explicit Role Selector Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-neutral-100 mb-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedRole("student")}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${selectedRole === "student" ? "bg-white text-black shadow-xs" : "text-muted-foreground hover:text-black"}`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{{ ar: "طالب", fr: "Étudiant", en: "Student" }[lang]}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole("coach")}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${selectedRole === "coach" ? "bg-white text-black shadow-xs" : "text-muted-foreground hover:text-black"}`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>{{ ar: "مدرب", fr: "Coach", en: "Coach" }[lang]}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole("admin")}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${selectedRole === "admin" ? "bg-white text-black shadow-xs" : "text-muted-foreground hover:text-black"}`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">{{ ar: "البريد الإلكتروني", fr: "Adresse email", en: "Email address" }[lang]}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="vous@exemple.com"
                        autoComplete="email"
                        autoFocus
                        className="h-11 rounded-lg bg-white border-border text-foreground focus-visible:ring-2 focus-visible:ring-black/80 transition-shadow"
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
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-foreground font-medium">{{ ar: "كلمة المرور", fr: "Mot de passe", en: "Password" }[lang]}</FormLabel>
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(true)}
                        className="text-xs font-semibold text-neutral-600 hover:text-black hover:underline"
                      >
                        {{ ar: "نسيت كلمة المرور؟", fr: "Mot de passe oublié ?", en: "Forgot password?" }[lang]}
                      </button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete="current-password"
                          className="h-11 rounded-lg pr-10 bg-white border-border text-foreground focus-visible:ring-2 focus-visible:ring-black/80 transition-shadow"
                          data-testid="input-password"
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-md p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/80 transition-colors"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? { ar: "إخفاء كلمة المرور", fr: "Masquer le mot de passe", en: "Hide password" }[lang] : { ar: "إظهار كلمة المرور", fr: "Afficher le mot de passe", en: "Show password" }[lang]}
                          aria-pressed={showPassword}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full h-11 rounded-lg font-bold text-sm bg-black hover:bg-black/90 text-white transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {{ ar: "جارٍ الدخول...", fr: "Connexion...", en: "Logging in..." }[lang]}
                  </span>
                ) : (
                  { ar: "تسجيل الدخول", fr: "Se connecter", en: "Log in" }[lang]
                )}
              </Button>
            </form>
          </Form>

          {/* Forgot Password Modal */}
          <Dialog open={showForgotModal} onOpenChange={setShowForgotModal}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base font-bold" style={{ fontFamily: "Cairo, sans-serif" }}>
                  <KeyRound className="w-5 h-5 text-neutral-800" />
                  {{ ar: "استعادة كلمة المرور", fr: "Réinitialisation du mot de passe", en: "Reset password" }[lang]}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {{
                    ar: "أدخلي بريدكِ الإلكتروني المسجل لتعيين كلمة مرور جديدة لحسابكِ فوراً.",
                    fr: "Entrez votre adresse email enregistrée pour définir un nouveau mot de passe sécurisé.",
                    en: "Enter your registered email to set a new password immediately.",
                  }[lang]}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleForgotPassword} className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    {{ ar: "البريد الإلكتروني", fr: "Adresse email", en: "Email address" }[lang]}
                  </label>
                  <Input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    required
                    disabled={forgotStep === 2}
                    className="text-xs h-9 bg-white"
                  />
                </div>

                {forgotStep === 2 && (
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      {{ ar: "كلمة المرور الجديدة (6 أحرف على الأقل)", fr: "Nouveau mot de passe (6 caractères min.)", en: "New password (min 6 chars)" }[lang]}
                    </label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      autoFocus
                      className="text-xs h-9 bg-white"
                    />
                  </div>
                )}

                <Button type="submit" disabled={isSubmittingForgot} className="w-full bg-black hover:bg-black/90 text-white font-bold text-xs h-9">
                  {isSubmittingForgot ? (
                    <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Traitement...</span>
                  ) : forgotStep === 1 ? (
                    ({ ar: "متابعة", fr: "Vérifier le compte", en: "Continue" }[lang])
                  ) : (
                    ({ ar: "حفظ كلمة المرور الجديدة", fr: "Enregistrer le mot de passe", en: "Save new password" }[lang])
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {{ ar: "ليس لديكِ حساب؟", fr: "Pas encore de compte ?", en: "Don't have an account yet?" }[lang]}{" "}
            <Link href={redirectTo ? `/register?redirect=${encodeURIComponent(redirectTo)}` : "/register"} className="text-black hover:underline font-bold" data-testid="link-register">
              {{ ar: "إنشاء حساب", fr: "Créer un compte", en: "Create an account" }[lang]}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
