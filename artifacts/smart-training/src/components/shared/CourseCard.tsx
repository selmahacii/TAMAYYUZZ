import { Link } from "wouter";
import { useI18n } from "@/i18n";
import { Clock, Users, Star, Lock, Sparkles, Briefcase, Megaphone, Wallet, Laptop, MessageCircle, Rocket, BarChart3, Palette, Sprout, BookOpen, type LucideIcon } from "lucide-react";

interface Course {
  id: number;
  title: string;
  description: string;
  category: string;
  imageUrl?: string | null;
  coachName: string;
  isPublished: boolean;
  enrollmentCount: number;
  durationHours?: number | null;
  level: string;
  isFree?: boolean;
  price?: string | null;
  currency?: string | null;
  isEnrolled?: boolean;
  isPurchased?: boolean;
}

interface CourseCardProps {
  course: Course;
  href?: string;
  showPurchaseState?: boolean;
}

const categoryConfig: Record<string, { color: string; bg: string; icon: LucideIcon }> = {
  Business:             { color: "text-violet-700", bg: "bg-violet-100",  icon: Briefcase },
  Marketing:            { color: "text-pink-700",   bg: "bg-pink-100",    icon: Megaphone },
  Finance:              { color: "text-emerald-700", bg: "bg-emerald-100", icon: Wallet },
  Technology:           { color: "text-blue-700",   bg: "bg-blue-100",    icon: Laptop },
  Communication:        { color: "text-orange-700", bg: "bg-orange-100",  icon: MessageCircle },
  Entrepreneuriat:      { color: "text-amber-700",  bg: "bg-amber-100",   icon: Rocket },
  Management:           { color: "text-teal-700",   bg: "bg-teal-100",    icon: BarChart3 },
  Design:               { color: "text-purple-700", bg: "bg-purple-100",  icon: Palette },
  "Personal Development": { color: "text-rose-700", bg: "bg-rose-100",   icon: Sprout },
};

const levelLabel: Record<string, { ar: string; fr: string; en: string }> = {
  beginner:     { ar: "مبتدئ", fr: "Débutant", en: "Beginner" },
  intermediate: { ar: "متوسط", fr: "Intermédiaire", en: "Intermediate" },
  advanced:     { ar: "متقدم", fr: "Avancé", en: "Advanced" },
};

const levelColors: Record<string, string> = {
  beginner:     "bg-emerald-100 text-emerald-700",
  intermediate: "bg-amber-100 text-amber-700",
  advanced:     "bg-red-100 text-red-700",
};

const gradients = [
  "from-violet-500 via-purple-600 to-indigo-700",
  "from-pink-500 via-rose-600 to-red-700",
  "from-amber-500 via-orange-500 to-red-600",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-blue-500 via-indigo-500 to-violet-600",
];

function getGradient(id: number) { return gradients[id % gradients.length]; }

function PriceBadge({ isFree, price, currency, isEnrolled, isPurchased, lang }: { isFree?: boolean; price?: string | null; currency?: string | null; isEnrolled?: boolean; isPurchased?: boolean; lang: "ar" | "fr" | "en" }) {
  if (isEnrolled || isPurchased) {
    return (
      <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-2xs">
        <Sparkles className="w-3 h-3 text-emerald-600" />
        {{ ar: "مسجّلة", fr: "Inscrite", en: "Enrolled" }[lang]}
      </span>
    );
  }
  if (isFree === false && price && parseFloat(price) > 0) {
    return (
      <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 shadow-2xs">
        <Lock className="w-3 h-3 text-amber-600" />
        {parseFloat(price).toLocaleString("fr-DZ")} {currency ?? "DZD"}
      </span>
    );
  }
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-2xs">
      {{ ar: "مجاني", fr: "Gratuit", en: "Free" }[lang]}
    </span>
  );
}

export function CourseCard({ course, href, showPurchaseState }: CourseCardProps) {
  const { lang } = useI18n();
  const cat = categoryConfig[course.category];
  const CatIcon = cat?.icon ?? BookOpen;

  const cardContent = (
    <div
      className="group bg-card rounded-2xl border border-card-border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col"
      data-testid={`card-course-${course.id}`}
    >
      <div className={`relative h-44 bg-gradient-to-br ${getGradient(course.id)} overflow-hidden`}>
        {course.imageUrl ? (
          <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <CatIcon className="w-12 h-12 text-white/90" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        <div className="absolute top-3 left-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cat?.bg ?? "bg-gray-100"} ${cat?.color ?? "text-gray-700"} shadow-sm`}>
            {course.category}
          </span>
        </div>

        <div className="absolute top-3 right-3">
          <PriceBadge
            isFree={course.isFree}
            price={course.price}
            currency={course.currency}
            isEnrolled={showPurchaseState ? course.isEnrolled : undefined}
            isPurchased={showPurchaseState ? course.isPurchased : undefined}
            lang={lang}
          />
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${levelColors[course.level] ?? "bg-gray-100 text-gray-700"}`}>
            {levelLabel[course.level]?.[lang] ?? course.level}
          </span>
          <div className="flex items-center gap-1 text-amber-300 text-xs">
            <Star className="w-3 h-3 fill-current" />
            <span className="font-semibold">4.{((course.id * 3 + 7) % 10)}</span>
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-foreground line-clamp-2 mb-1.5 group-hover:text-primary transition-colors leading-snug" style={{ fontFamily: "Cairo, sans-serif" }}>
          {course.title}
        </h3>
        <p className="text-muted-foreground text-xs mb-2 font-medium">
          {{ ar: "بواسطة", fr: "par", en: "by" }[lang]} <span className="text-foreground/80">{course.coachName}</span>
        </p>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed flex-1">{course.description}</p>

        <div className="flex items-center justify-between pt-3 border-t border-card-border">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {course.durationHours && (
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{course.durationHours}h</span>
            )}
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {course.enrollmentCount > 0
                ? `${course.enrollmentCount} ${{ ar: "طالبة", fr: course.enrollmentCount > 1 ? "apprenantes" : "apprenante", en: course.enrollmentCount > 1 ? "students" : "student" }[lang]}`
                : { ar: "جديد", fr: "Nouveau", en: "New" }[lang]}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-primary">
            {showPurchaseState && (course.isEnrolled || course.isPurchased) ? (
              <span>{{ ar: "متابعة ←", fr: "Continuer →", en: "Continue →" }[lang]}</span>
            ) : course.isFree === false && course.price && parseFloat(course.price) > 0 ? (
              <span>{{ ar: "شراء ←", fr: "Acheter →", en: "Buy →" }[lang]}</span>
            ) : (
              <span>{{ ar: "التسجيل ←", fr: "S'inscrire →", en: "Enroll →" }[lang]}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (href) return <Link href={href}>{cardContent}</Link>;
  return cardContent;
}
