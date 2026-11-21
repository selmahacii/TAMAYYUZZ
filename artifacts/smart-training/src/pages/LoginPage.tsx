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
import {
  Eye, EyeOff, Star, GraduationCap, Award, ShieldCheck, KeyRound,
  Clock, Mail, Lock, ArrowLeft, ArrowRight, BookOpen, Users, CheckCircle2,
  Building2, FileCheck
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TamayuzDigitalLogo } from "@/components/shared/TamayuzDigitalLogo";

const schema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(6, "Au moins 6 caractères"),
});

type FormValues = z.infer<typeof schema>;

const testimonials = [
  {
    name: { ar: "أمينة بوزيد", fr: "Amina Bouzid", en: "Amina Bouzid" },
    role: { ar: "رئيسة مشروع، الجزائر العاصمة", fr: "Cheffe de projet, Alger", en: "Project Lead, Algiers" },
    text: {
      ar: "منصة التميز مكّنتني من صقل مهاراتي القيادية والإدارية بمنهجية تدريب أكاديمية راقية ومتابعة مهنية دقيقة.",
      fr: "Tamayuz m'a permis de développer mes compétences managériales avec une rigueur pédagogique remarquable.",
      en: "Tamayuz enabled me to sharpen my management skills with outstanding academic rigor."
    },
    stars: 5,
  },
  {
    name: { ar: "سارة مزراق", fr: "Sara Mezraq", en: "Sara Mezraq" },
    role: { ar: "رائدة أعمال، وهران", fr: "Entrepreneuse, Oran", en: "Entrepreneur, Oran" },
    text: {
      ar: "المحتوى الأكاديمي والمدربون على أعلى مستوى من الاحترافية. دورات عملية تخدم سوق العمل بامتياز.",
      fr: "Le contenu académique et les formateurs sont de tout premier ordre. Des formations pratiques et reconnues.",
      en: "The academic content and trainers are highly professional, directly meeting market requirements."
    },
    stars: 5,
  },
  {
    name: { ar: "د. هدى بلحاج", fr: "Dr. Houda Belhadj", en: "Dr. Houda Belhadj" },
    role: { ar: "باحثة جامعية، قسنطينة", fr: "Chercheuse universitaire, Constantine", en: "Academic Researcher, Constantine" },
    text: {
      ar: "برامج تدريبية متقنة تلتزم بأحدث معايير التعليم العالي وتتيح مسارات واضحة للتطور المعرفي والمهني.",
      fr: "Des programmes structurés selon les standards académiques, offrant des parcours clairs d'évolution.",
      en: "Structured curricula aligned with higher education standards, offering clear pathways for advancement."
    },
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
        if (!user.isApproved) return;
        setLocation("/coach/dashboard");
      } else {
        setLocation(redirectTo || "/student/home");
      }
    }
  }, [user, setLocation, redirectTo]);

  useEffect(() => {
    const timer = setInterval(() => setTestimonialIdx((i) => (i + 1) % testimonials.length), 5000);
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
        onError: () =>
          toast({
            title: { ar: "فشل تسجيل الدخول", fr: "Échec de connexion", en: "Login failed" }[lang],
            description: {
              ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
              fr: "Email ou mot de passe incorrect",
              en: "Incorrect email or password",
            }[lang],
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
        toast({
          title: { ar: "تم التغيير بنجاح", fr: "Mot de passe réinitialisé", en: "Password reset" }[lang],
          description: data.message,
        });
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
    <div className={`flex items-center gap-0.5 rounded-lg p-1 bg-white/10 border border-white/20 text-xs font-bold ${className ?? ""}`}>
      {(["ar", "fr", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase transition-all cursor-pointer ${
            lang === l
              ? "bg-white text-[#0c3b2e] shadow-xs font-black"
              : "text-white/70 hover:text-white"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-white" dir={isRTL ? "rtl" : "ltr"}>
      {/* 1. Left Hero Branding Panel (Sober Institutional Academic Atmosphere) */}
      <div className="hidden lg:flex lg:col-span-7 flex-col justify-between px-12 xl:px-16 py-12 relative bg-[#0c3b2e] text-white border-e border-neutral-200">
        {/* Subtle geometric academic background pattern (clean architectural grid, zero blurry lights) */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(to right, #ffffff 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />

        {/* Top Header in Left Panel */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/student/home">
            <div className="cursor-pointer">
              <TamayuzDigitalLogo light={true} className="w-11 h-11" />
            </div>
          </Link>
          <LangSwitcher />
        </div>

        {/* Center Institutional Pitch */}
        <div className="relative z-10 my-auto py-8">
          {/* Institutional Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-white/10 border border-[#d4af37]/40 text-[#f3cf7a] text-xs font-bold mb-6">
            <Building2 className="w-3.5 h-3.5 text-[#d4af37]" />
            <span style={{ fontFamily: "Cairo, sans-serif" }}>
              {{
                ar: "المؤسسة الأكاديمية للتدريب والتأهيل المهني",
                fr: "Institution académique de formation et de certification",
                en: "Academic Institution for Training & Professional Qualification",
              }[lang]}
            </span>
          </div>

          <h1
            className="text-3xl xl:text-4xl font-black text-white leading-tight mb-4 tracking-tight"
            style={{ fontFamily: "Cairo, sans-serif" }}
          >
            {{
              ar: "بوابتكِ نحو التميّز المعرفي والمهني",
              fr: "Votre passerelle vers l'excellence académique et professionnelle",
              en: "Your Gateway to Academic & Career Excellence",
            }[lang]}
          </h1>

          <p
            className="text-white/80 text-sm xl:text-base leading-relaxed max-w-xl mb-8 font-medium"
            style={{ fontFamily: "Cairo, sans-serif" }}
          >
            {{
              ar: "انضمي إلى بيئة تعليمية وأكاديمية متكاملة مصممة لتأهيل الكفاءات، تعميق المعرفة، وبناء مسار مهني معتمد وفق أحدث المناهج الجامعية والميدانية.",
              fr: "Rejoignez un cadre académique structuré, pensé pour former les talents, approfondir les compétences et bâtir des parcours certifiés aux standards internationaux.",
              en: "Join a structured academic framework designed to qualify talents, enhance skills, and build certified pathways.",
            }[lang]}
          </p>

          {/* 3 Real Academic Stat Pillars */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              {
                value: "+500",
                label: { ar: "دورة معتمدة", fr: "Formations", en: "Accredited Courses" },
                icon: BookOpen,
              },
              {
                value: "+15 000",
                label: { ar: "طالبة ومستفيدة", fr: "Étudiantes formées", en: "Enrolled Students" },
                icon: Users,
              },
              {
                value: "+250",
                label: { ar: "أستاذ وخبير", fr: "Enseignants & Experts", en: "Professors & Experts" },
                icon: Award,
              },
            ].map(({ value, label, icon: Icon }) => (
              <div
                key={label.en}
                className="bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:bg-white/10 transition-colors shadow-2xs"
              >
                <div className="flex justify-center mb-1.5 text-[#d4af37]">
                  <Icon className="w-5 h-5 opacity-90" />
                </div>
                <div className="text-xl xl:text-2xl font-black text-white mb-0.5">{value}</div>
                <div className="text-white/70 text-xs font-semibold" style={{ fontFamily: "Cairo, sans-serif" }}>
                  {label[lang]}
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial Box */}
          <div className="bg-black/25 border border-white/15 rounded-xl p-5 relative">
            <div className="flex gap-1 mb-2.5">
              {Array.from({ length: testimonial.stars }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-[#d4af37] text-[#d4af37]" />
              ))}
            </div>
            <p className="text-white/90 text-xs sm:text-sm leading-relaxed mb-3 font-normal">
              « {testimonial.text[lang]} »
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#1b5e43] border border-[#d4af37]/40 text-[#d4af37] flex items-center justify-center font-bold text-xs shadow-xs">
                  {testimonial.name[lang].charAt(0)}
                </div>
                <div>
                  <p className="text-white font-bold text-xs" style={{ fontFamily: "Cairo, sans-serif" }}>
                    {testimonial.name[lang]}
                  </p>
                  <p className="text-white/60 text-[11px]">{testimonial.role[lang]}</p>
                </div>
              </div>
              {/* Pagination Dots */}
              <div className="flex gap-1.5">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setTestimonialIdx(i)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      i === testimonialIdx ? "w-5 bg-[#d4af37]" : "w-1.5 bg-white/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust Indicators */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-white/70">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-[#d4af37]" />
            <span>{{ ar: "شهادات تدريبية رسمية برمز توثيق فريد", fr: "Attestations officielles avec identifiant unique", en: "Official certificates with unique verification code" }[lang]}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{{ ar: "نظام تدريب خاضع للمراجعة والتقييم الدوري", fr: "Système de formation sous contrôle pédagogique", en: "Monitored pedagogical platform" }[lang]}</span>
          </div>
        </div>
      </div>

      {/* 2. Right Form Panel (Clean, sober, institutional login) */}
      <div className="lg:col-span-5 flex flex-col justify-between px-6 sm:px-12 py-10 sm:py-12 bg-white">
        {/* Mobile Header */}
        <div className="flex items-center justify-between mb-8 lg:hidden">
          <TamayuzDigitalLogo className="w-9 h-9" />
          <div className="flex items-center gap-1 rounded-lg p-0.5 bg-neutral-100 border border-neutral-200 text-xs font-bold">
            {(["ar", "fr", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase transition-all ${
                  lang === l ? "bg-[#0c3b2e] text-white shadow-2xs" : "text-neutral-600"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full max-w-md mx-auto my-auto">
          {/* Form Header */}
          <div className="mb-8">
            <h2
              className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight mb-2"
              style={{ fontFamily: "Cairo, sans-serif" }}
            >
              {{ ar: "تسجيل الدخول", fr: "Connexion à votre espace", en: "Sign In" }[lang]}
            </h2>
            <p className="text-neutral-600 text-xs sm:text-sm" style={{ fontFamily: "Cairo, sans-serif" }}>
              {{
                ar: "أدخلي بيانات اعتمادكِ للمتابعة إلى منصة التميز الرقمي",
                fr: "Saisissez vos identifiants pour accéder à vos formations",
                en: "Enter your credentials to access the digital platform",
              }[lang]}
            </p>
          </div>

          {/* Coach Pending Approval Banner */}
          {user && user.role === "coach" && !user.isApproved && (
            <div className="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 text-xs space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2 font-black text-amber-900">
                <Clock className="w-4 h-4 text-amber-700" />
                <span style={{ fontFamily: "Cairo, sans-serif" }}>
                  {{ ar: "ملف الاعتماد قيد التدقيق الأكاديمي", fr: "Dossier en cours d'audit pédagogique", en: "Profile under pedagogical audit" }[lang]}
                </span>
              </div>
              <p className="leading-relaxed font-medium">
                {{
                  ar: "مرحباً بكِ. ملفكِ التدريبي والشهادات المرفقة قيد التدقيق من قِبل إدارة المنصة (خلال 24 إلى 48 ساعة). ستصلكِ رسالة التفعيل فور اعتماد الحساب.",
                  fr: "Votre dossier de formatrice et vos justificatifs sont en cours d'audit par la direction pédagogique sous 24-48h.",
                  en: "Your coaching dossier and credentials are being audited by our pedagogical committee within 24-48h.",
                }[lang]}
              </p>
              <Button
                onClick={() => logout()}
                variant="outline"
                size="sm"
                className="w-full h-8.5 text-xs font-bold border-amber-300 bg-white hover:bg-amber-100/60 text-amber-900"
              >
                {{ ar: "تسجيل الخروج", fr: "Se déconnecter", en: "Log out" }[lang]}
              </Button>
            </div>
          )}

          {/* Login Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
                          autoComplete="email"
                          autoFocus
                          className="h-11 rounded-lg bg-white border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-1 focus-visible:ring-[#0c3b2e] focus-visible:border-[#0c3b2e] text-xs sm:text-sm pl-10 pr-4 shadow-2xs"
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

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between mb-1">
                      <FormLabel className="text-neutral-800 font-bold text-xs" style={{ fontFamily: "Cairo, sans-serif" }}>
                        {{ ar: "كلمة المرور", fr: "Mot de passe", en: "Password" }[lang]}
                      </FormLabel>
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(true)}
                        className="text-xs font-bold text-[#0c3b2e] hover:text-[#144f3e] hover:underline cursor-pointer"
                        style={{ fontFamily: "Cairo, sans-serif" }}
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
                          className="h-11 rounded-lg bg-white border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-1 focus-visible:ring-[#0c3b2e] focus-visible:border-[#0c3b2e] text-xs sm:text-sm pl-10 pr-10 shadow-2xs"
                          data-testid="input-password"
                          {...field}
                        />
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <button
                          type="button"
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11 rounded-lg font-bold text-sm bg-[#0c3b2e] hover:bg-[#144f3e] active:bg-[#08281d] text-white transition-all shadow-sm hover:shadow-md disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 mt-2"
                disabled={loginMutation.isPending}
                style={{ fontFamily: "Cairo, sans-serif" }}
                data-testid="button-login"
              >
                {loginMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {{ ar: "جارٍ التحقق والدخول...", fr: "Connexion en cours...", en: "Signing in..." }[lang]}
                  </span>
                ) : (
                  <>
                    <span>{{ ar: "تسجيل الدخول", fr: "Se connecter", en: "Sign In" }[lang]}</span>
                    {isRTL ? <ArrowLeft className="w-4 h-4 text-[#d4af37]" /> : <ArrowRight className="w-4 h-4 text-[#d4af37]" />}
                  </>
                )}
              </Button>
            </form>
          </Form>

          {/* Link to Register */}
          <div className="mt-8 pt-6 border-t border-neutral-100 text-center">
            <p className="text-xs sm:text-sm text-neutral-600" style={{ fontFamily: "Cairo, sans-serif" }}>
              {{ ar: "ليس لديكِ حساب بعد؟", fr: "Pas encore de compte ?", en: "Don't have an account yet?" }[lang]}{" "}
              <Link
                href={redirectTo ? `/register?redirect=${encodeURIComponent(redirectTo)}` : "/register"}
                className="font-black text-[#0c3b2e] hover:text-[#144f3e] hover:underline inline-flex items-center gap-1"
                data-testid="link-register"
              >
                <span>{{ ar: "إنشاء حساب جديد", fr: "Créer un compte", en: "Create an account" }[lang]}</span>
                <span>←</span>
              </Link>
            </p>
          </div>
        </div>

        {/* Modal: Forgot Password */}
        <Dialog open={showForgotModal} onOpenChange={setShowForgotModal}>
          <DialogContent className="max-w-md bg-white border border-neutral-200 rounded-xl shadow-xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-neutral-900" style={{ fontFamily: "Cairo, sans-serif" }}>
                <KeyRound className="w-5 h-5 text-[#0c3b2e]" />
                {{ ar: "استعادة كلمة المرور", fr: "Réinitialisation du mot de passe", en: "Reset password" }[lang]}
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500" style={{ fontFamily: "Cairo, sans-serif" }}>
                {{
                  ar: "أدخلي بريدكِ الإلكتروني المسجل لتعيين كلمة مرور جديدة لحسابكِ فوراً.",
                  fr: "Entrez votre adresse email enregistrée pour définir un nouveau mot de passe sécurisé.",
                  en: "Enter your registered email to set a new password immediately.",
                }[lang]}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleForgotPassword} className="space-y-4 pt-3">
              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-1.5" style={{ fontFamily: "Cairo, sans-serif" }}>
                  {{ ar: "البريد الإلكتروني", fr: "Adresse email", en: "Email address" }[lang]}
                </label>
                <Input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="votre.email@domaine.com"
                  required
                  disabled={forgotStep === 2}
                  className="text-xs h-10 rounded-lg bg-white border-neutral-300 focus-visible:ring-[#0c3b2e]"
                />
              </div>

              {forgotStep === 2 && (
                <div>
                  <label className="text-xs font-bold text-neutral-800 block mb-1.5" style={{ fontFamily: "Cairo, sans-serif" }}>
                    {{ ar: "كلمة المرور الجديدة (6 أحرف على الأقل)", fr: "Nouveau mot de passe (6 car. min.)", en: "New password (min 6 chars)" }[lang]}
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoFocus
                    className="text-xs h-10 rounded-lg bg-white border-neutral-300 focus-visible:ring-[#0c3b2e]"
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmittingForgot}
                className="w-full bg-[#0c3b2e] hover:bg-[#144f3e] text-white font-bold text-xs h-10 rounded-lg shadow-xs"
                style={{ fontFamily: "Cairo, sans-serif" }}
              >
                {isSubmittingForgot ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Traitement...
                  </span>
                ) : forgotStep === 1 ? (
                  ({ ar: "متابعة والتحقق", fr: "Vérifier le compte", en: "Continue" }[lang])
                ) : (
                  ({ ar: "حفظ كلمة المرور الجديدة", fr: "Enregistrer le mot de passe", en: "Save new password" }[lang])
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Footer info */}
        <div className="text-center text-[11px] text-neutral-500 mt-6">
          © {new Date().getFullYear()} منصة التميز الرقمي · Digital Tamayuz Platform
        </div>
      </div>
    </div>
  );
}
