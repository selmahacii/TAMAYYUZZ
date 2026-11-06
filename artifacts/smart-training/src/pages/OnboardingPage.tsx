import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n";
import { ArrowRight, ArrowLeft, GraduationCap, Users, TrendingUp } from "lucide-react";
import { LogoMark } from "@/components/shared/LogoMark";

const slides = [
  {
    icon: GraduationCap,
    title: { ar: "تعلّمي من الخبراء", fr: "Apprenez des experts", en: "Expert-led courses" },
    description: {
      ar: "دورات تدريبية احترافية بإشراف مدربات معتمدات من الجزائر وخارجها. طوّري مهاراتك بالسرعة التي تناسبك، أينما كنتِ في الجزائر.",
      fr: "Accédez à des formations de qualité animées par des coachs certifiés. Développez vos compétences à votre rythme, où que vous soyez en Algérie.",
      en: "Access quality courses led by certified coaches. Develop your skills at your own pace, wherever you are in Algeria.",
    },
    features: {
      ar: ["دورات مرنة على مدار الساعة", "شهادات معتمدة", "محتوى بالعربية والفرنسية"],
      fr: ["Formations flexibles 24/7", "Certificats reconnus", "Contenus en Arabe & Français"],
      en: ["Flexible 24/7 courses", "Recognized certificates", "Content in Arabic & French"],
    },
  },
  {
    icon: Users,
    title: { ar: "مجتمع يدعمك", fr: "Une communauté soudée", en: "Built for Algerian women" },
    description: {
      ar: "انضمي إلى مجتمع من النساء الجزائريات الطموحات. شاركي وتواصلي وتطوّري معاً في مسيرتك المهنية.",
      fr: "Rejoignez une communauté de femmes algériennes ambitieuses. Partagez, connectez-vous et grandissez ensemble dans votre parcours professionnel.",
      en: "Join a community of ambitious Algerian women. Share, connect, and grow together in your professional journey.",
    },
    features: {
      ar: ["مجتمع داعم", "إرشاد شخصي", "شبكة مهنية قوية"],
      fr: ["Communauté solidaire", "Mentorat personnalisé", "Réseau professionnel fort"],
      en: ["Supportive community", "Personalized mentorship", "Strong professional network"],
    },
  },
  {
    icon: TrendingUp,
    title: { ar: "طوّري مسيرتك", fr: "Boostez votre carrière", en: "Track & grow" },
    description: {
      ar: "تابعي تقدّمك، أدري دوراتك المسجّلة، واحتفلي بكل خطوة تحقّقينها. نجاحك هو مهمتنا.",
      fr: "Suivez votre progression, gérez vos formations inscrites et célébrez chaque étape franchie. Votre réussite est notre mission.",
      en: "Track your progress, manage your enrolled courses, and celebrate every milestone. Your success is our mission.",
    },
    features: {
      ar: ["متابعة تفصيلية", "شهادات قابلة للتحميل", "تحليل الأداء"],
      fr: ["Suivi détaillé", "Certificats téléchargeables", "Analyse de performance"],
      en: ["Detailed tracking", "Downloadable certificates", "Performance analytics"],
    },
  },
];

export default function OnboardingPage() {
  const [current, setCurrent] = useState(0);
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { lang, setLang, isRTL } = useI18n();
  const slide = slides[current];
  const isLast = current === slides.length - 1;

  useEffect(() => {
    if (isLoading || !user) return;
    if (user.role === "admin") setLocation("/admin/dashboard");
    else if (user.role === "coach") setLocation("/coach/dashboard");
    else setLocation("/student/home");
  }, [user, isLoading, setLocation]);

  return (
    <div className="min-h-screen flex flex-col bg-white" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-border shadow-xs p-1">
                <LogoMark className="w-full h-full object-contain" />
              </div>
              <span className="text-lg font-black text-foreground" style={{ fontFamily: "Cairo, sans-serif" }}>Tamayyuz</span>
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

          <div className="flex items-center justify-between mb-8">
            {!isLast ? (
              <button
                onClick={() => setLocation("/register")}
                className="text-muted-foreground text-xs font-semibold hover:text-foreground transition-colors"
                data-testid="link-skip-onboarding"
              >
                {{ ar: "تخطي", fr: "Passer", en: "Skip" }[lang]}
              </button>
            ) : <span />}
            <button
              onClick={() => setLocation("/login")}
              className="text-foreground text-xs font-semibold hover:underline transition-colors"
              data-testid="link-already-have-account"
            >
              {{ ar: "تسجيل الدخول", fr: "Se connecter", en: "Log in" }[lang]}
            </button>
          </div>

          <div key={current} className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 mx-auto bg-black">
              <slide.icon className="w-7 h-7 text-white" />
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>{slide.title[lang]}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{slide.description[lang]}</p>
            </div>

            <div className="space-y-2 mb-8">
              {slide.features[lang].map((f) => (
                <div key={f} className="flex items-center gap-3 rounded-lg border border-border px-4 py-2.5">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-black" />
                  <span className="text-foreground text-sm" style={{ fontFamily: "Cairo, sans-serif" }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-1.5 mb-6">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: i === current ? "2.5rem" : "0.5rem", background: i === current ? "#000" : "hsl(var(--border))" }}
                data-testid={`onboarding-dot-${i}`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {current > 0 && (
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-lg border-border text-foreground bg-white hover:bg-muted"
                onClick={() => setCurrent((c) => c - 1)}
                data-testid="button-onboarding-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {{ ar: "السابق", fr: "Précédent", en: "Back" }[lang]}
              </Button>
            )}
            <Button
              className="flex-1 h-11 rounded-lg font-bold text-sm bg-black hover:bg-black/90 text-white transition-all shadow-sm"
              onClick={() => isLast ? setLocation("/register") : setCurrent((c) => c + 1)}
              data-testid="button-onboarding-next"
            >
              {isLast ? { ar: "ابدأي الآن", fr: "Commencer", en: "Get started" }[lang] : { ar: "التالي", fr: "Suivant", en: "Next" }[lang]}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
