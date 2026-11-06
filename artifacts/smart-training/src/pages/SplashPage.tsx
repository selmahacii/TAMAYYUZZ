import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n";
import { LogoMark } from "@/components/shared/LogoMark";

export default function SplashPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { lang, isRTL } = useI18n();

  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(() => {
      if (user) {
        if (user.role === "admin") setLocation("/admin/dashboard");
        else if (user.role === "coach") setLocation("/coach/dashboard");
        else setLocation("/student/home");
      } else {
        setLocation("/onboarding");
      }
    }, 2200);
    return () => clearTimeout(timer);
  }, [user, isLoading, setLocation]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center overflow-hidden relative" style={{ background: "linear-gradient(135deg, hsl(258,75%,22%) 0%, hsl(258,60%,32%) 40%, hsl(280,65%,28%) 100%)" }} dir={isRTL ? "rtl" : "ltr"}>
      <div className="bg-grid-pattern absolute inset-0 opacity-20" />

      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10" style={{ background: "radial-gradient(circle, hsl(38,95%,60%), transparent)", filter: "blur(60px)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10" style={{ background: "radial-gradient(circle, hsl(258,75%,70%), transparent)", filter: "blur(80px)" }} />

      <div className="relative z-10 flex flex-col items-center gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="relative">
          <div className="w-28 h-28 rounded-3xl flex items-center justify-center shadow-2xl relative overflow-hidden bg-white p-3.5">
            <LogoMark className="w-full h-full object-contain relative z-10" />
          </div>
          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent animate-pulse" />
        </div>

        <div className="text-center">
          <h1 className="text-5xl font-black text-white tracking-tight mb-1" style={{ fontFamily: "Cairo, sans-serif" }}>
            Tamayyuz
          </h1>
          <p className="text-2xl font-bold mt-1" style={{ fontFamily: "Cairo, sans-serif", color: "hsl(38,95%,70%)" }}>
            {{ ar: "منصة التدريب الذكي", fr: "Plateforme de formation intelligente", en: "Intelligent Training Platform" }[lang]}
          </p>
          <p className="text-foreground/50 mt-2 text-sm tracking-widest uppercase font-medium">
            {{ ar: "تكوين مهني عبر الإنترنت", fr: "Formation Professionnelle en Ligne", en: "Professional Training Online" }[lang]}
          </p>
        </div>

        <div className="flex gap-2 mt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 rounded-full animate-pulse"
              style={{
                width: i === 1 ? "2rem" : "0.5rem",
                background: i === 1 ? "hsl(38,95%,60%)" : "rgba(255,255,255,0.3)",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <p className="text-foreground/30 text-xs">الجزائر · Algérie</p>
      </div>
    </div>
  );
}
