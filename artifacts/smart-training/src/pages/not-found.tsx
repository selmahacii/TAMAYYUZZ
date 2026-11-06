import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { lang, isRTL } = useI18n();

  const homeHref = !user
    ? "/marketplace"
    : user.role === "admin"
      ? "/admin/dashboard"
      : user.role === "coach"
        ? "/coach/dashboard"
        : "/student/home";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#fafafa] px-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="text-center max-w-sm">
        <SearchX className="w-14 h-14 text-muted-foreground/40 mx-auto mb-5" />
        <h1 className="text-2xl font-black text-foreground mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>
          {{ ar: "الصفحة غير موجودة", fr: "Page introuvable", en: "Page not found" }[lang]}
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          {{ ar: "الصفحة التي تبحثين عنها غير موجودة أو تم نقلها.", fr: "La page que vous recherchez n'existe pas ou a été déplacée.", en: "The page you're looking for doesn't exist or has been moved." }[lang]}
        </p>
        <Button onClick={() => setLocation(homeHref)} className="bg-black hover:bg-black/90 text-white font-bold shadow-sm border border-black">
          {{ ar: "العودة إلى الرئيسية", fr: "Retour à l'accueil", en: "Back to home" }[lang]}
        </Button>
      </div>
    </div>
  );
}
