import { useState } from "react";
import { useLocation } from "wouter";
import {
  useGetMarketplace,
  useGetCategories,
  useGetRecommendedCourses,
  getGetMarketplaceQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n";
import { StudentLayout } from "@/components/student/StudentLayout";
import { CourseCard } from "@/components/shared/CourseCard";
import { Input } from "@/components/ui/input";
import { Search, Sparkles, BookOpen, TrendingUp, Award, Briefcase, Megaphone, Wallet, Laptop, MessageCircle, Rocket, BarChart3, type LucideIcon } from "lucide-react";

const categoryIcons: Record<string, LucideIcon> = {
  Business: Briefcase, Marketing: Megaphone, Finance: Wallet, Technology: Laptop,
  Communication: MessageCircle, Entrepreneuriat: Rocket, Management: BarChart3,
};

function greeting(name: string, lang: "ar" | "fr" | "en") {
  const hour = new Date().getHours();
  const period = hour < 12 ? 0 : hour < 18 ? 1 : 2;
  const templates = {
    ar: ["صباح الخير", "مساء النور", "مساء الخير"],
    fr: ["Bonjour", "Bon après-midi", "Bonsoir"],
    en: ["Good morning", "Good afternoon", "Good evening"],
  };
  return `${templates[lang][period]}, ${name}`;
}

export default function StudentHomePage() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const marketplaceParams = { search: search || undefined, category: activeCategory || undefined };
  const { data: rawCourses, isLoading } = useGetMarketplace(marketplaceParams, {
    query: { queryKey: getGetMarketplaceQueryKey(marketplaceParams) },
  });
  const courses = Array.isArray(rawCourses) ? rawCourses : [];

  const { data: rawCategories } = useGetCategories();
  const categories = Array.isArray(rawCategories) ? rawCategories : [
    "Business", "Marketing", "Finance", "Technology", 
    "Communication", "Personal Development", "Design", 
    "Entrepreneuriat", "Management", "Other"
  ];

  const { data: rawRecommended } = useGetRecommendedCourses();
  const recommended = Array.isArray(rawRecommended) ? rawRecommended : [];

  const goToCourse = (course: { id: number; isEnrolled?: boolean; isPurchased?: boolean }) => {
    setLocation(course.isEnrolled || course.isPurchased ? `/student/learn/${course.id}` : `/course/${course.id}`);
  };

  const firstName = user?.name?.split(" ")[0] ?? { ar: "طالبتنا", fr: "vous", en: "there" }[lang];

  return (
    <StudentLayout>
      <div className="relative overflow-hidden rounded-2xl mb-8" style={{ background: "linear-gradient(135deg, hsl(258,75%,22%) 0%, hsl(258,60%,30%) 60%, hsl(280,60%,25%) 100%)" }}>
        <div className="bg-grid-pattern absolute inset-0 opacity-20" />
        <div className="absolute right-0 top-0 w-64 h-64 rounded-full opacity-10" style={{ background: "radial-gradient(circle, hsl(38,95%,60%), transparent)", filter: "blur(60px)" }} />
        <div className="px-6 py-8 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-white/50 text-xs font-medium uppercase tracking-widest mb-1">{{ ar: "لوحة القيادة", fr: "Tableau de bord", en: "Dashboard" }[lang]}</p>
              <h1 className="text-2xl font-black text-white" style={{ fontFamily: "Cairo, sans-serif" }}>
                {greeting(firstName, lang)}
              </h1>
              <p className="text-white/60 text-sm mt-0.5">{{ ar: "اكتشفي دورات ستغيّر مستقبلك", fr: "Découvrez des formations qui transformeront votre avenir", en: "Discover courses that will transform your future" }[lang]}</p>
            </div>

            {courses && (
              <div className="flex items-center gap-3">
                {[
                  { icon: <BookOpen className="w-4 h-4" />, value: courses.length, label: { ar: "دورات متاحة", fr: "Formations", en: "Courses" }[lang] },
                  { icon: <TrendingUp className="w-4 h-4" />, value: recommended?.length ?? 0, label: { ar: "موصى بها", fr: "Recommandées", en: "Recommended" }[lang] },
                ].map(({ icon, value, label }) => (
                  <div key={label} className="bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 text-white/60 mb-0.5">{icon}</div>
                    <div className="text-xl font-black text-white">{value}</div>
                    <div className="text-white/50 text-xs" style={{ fontFamily: "Cairo, sans-serif" }}>{label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 z-10" />
            <Input
              type="search"
              placeholder={{ ar: "ابحثي عن دورة...", fr: "Rechercher une formation...", en: "Search a course..." }[lang]}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-12 rounded-xl text-base bg-white/10 border-white/20 text-white placeholder:text-white/35 focus:bg-white/15 focus:border-white/40"
              style={{ fontFamily: "Cairo, sans-serif" }}
            />
          </div>
        </div>
      </div>

      {categories && categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-none">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm ${
              !activeCategory
                ? "bg-black text-white shadow-md"
                : "bg-white border border-border text-foreground hover:border-black"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />{{ ar: "الكل", fr: "Toutes", en: "All" }[lang]}
          </button>
          {categories.map((cat) => {
            const CatIcon = categoryIcons[cat] ?? BookOpen;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm ${
                  activeCategory === cat
                    ? "bg-black text-white shadow-md"
                    : "bg-white border border-border text-foreground hover:border-black"
                }`}
              >
                <CatIcon className="w-3.5 h-3.5" />
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {!search && !activeCategory && recommended && recommended.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "Cairo, sans-serif" }}>{{ ar: "موصى بها لك", fr: "Recommandées pour vous", en: "Recommended for you" }[lang]}</h2>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-200">
              <Award className="w-3 h-3" />
              Top Picks
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recommended.slice(0, 3).map((course) => (
              <CourseCard key={course.id} course={course} href={`/course/${course.id}`} showPurchaseState />
            ))}
          </div>
        </section>
      )}

      <section className="pb-4">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "Cairo, sans-serif" }}>
              {search || activeCategory ? { ar: "نتائج البحث", fr: "Résultats de recherche", en: "Search results" }[lang] : { ar: "جميع الدورات", fr: "Toutes les formations", en: "All courses" }[lang]}
            </h2>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-80 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : courses && courses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((course) => (
              <div key={course.id} onClick={() => goToCourse(course)} className="cursor-pointer">
                <CourseCard course={course} showPurchaseState />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white border border-border rounded-2xl">
            <Search className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>{{ ar: "لم نجد نتائج", fr: "Aucune formation trouvée", en: "No courses found" }[lang]}</h3>
            <p className="text-muted-foreground text-sm">{{ ar: "جربي كلمة بحث مختلفة", fr: "Essayez une recherche différente", en: "Try a different search" }[lang]}</p>
          </div>
        )}
      </section>
    </StudentLayout>
  );
}
