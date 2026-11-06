import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetMarketplace, useGetCategories, getGetMarketplaceQueryKey } from "@workspace/api-client-react";
import { useI18n } from "@/i18n";
import { t } from "@/i18n/translations";
import { useAuth } from "@/context/AuthContext";
import { RoleAwareShell } from "@/components/shared/RoleAwareShell";
import { CourseCard } from "@/components/shared/CourseCard";
import { Button } from "@/components/ui/button";
import { Search, X, Users, BookOpen, Award, Megaphone, UserPlus, GraduationCap } from "lucide-react";

interface Announcement {
  id: number; authorId: number; authorName: string; title: string;
  content: string; imageUrl: string | null; type: string;
  isPublished: boolean; isPinned: boolean; isApproved: boolean;
  expiresAt: string | null; createdAt: string;
}

const LEVELS = ["beginner", "intermediate", "advanced"] as const;

export default function MarketplacePage() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [, setLocation] = useLocation();
  const [ads, setAds] = useState<Announcement[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [level, setLevel] = useState<string>("");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "price_asc" | "price_desc">("newest");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data: categories } = useGetCategories();

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAds(data.filter((a: Announcement) => a.type === "ad" && a.isApproved)); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const params = {
    search: debouncedSearch || undefined,
    category: category || undefined,
    level: (level || undefined) as "beginner" | "intermediate" | "advanced" | undefined,
    isFree: priceFilter === "all" ? undefined : priceFilter === "free",
    sortBy,
  };
  const { data: courses, isLoading } = useGetMarketplace(params, {
    query: { queryKey: getGetMarketplaceQueryKey(params) },
  });

  const handleCourseClick = (course: { id: number; isEnrolled?: boolean; isPurchased?: boolean }) => {
    if (user?.role === "student" && (course.isEnrolled || course.isPurchased)) {
      setLocation(`/student/learn/${course.id}`);
    } else {
      setLocation(`/course/${course.id}`);
    }
  };

  const hasActiveFilters = search || category || level || priceFilter !== "all";
  const resetFilters = () => { setSearch(""); setCategory(null); setLevel(""); setPriceFilter("all"); };

  const stats = [
    { label: { ar: "متعلّمات", fr: "Apprenantes", en: "Learners" }[lang], value: "2,400+", icon: <Users className="w-4 h-4" /> },
    { label: { ar: "دورات", fr: "Formations", en: "Courses" }[lang], value: `${courses?.length ?? 0}+`, icon: <BookOpen className="w-4 h-4" /> },
    { label: { ar: "معتمدة", fr: "Certifiées", en: "Certified" }[lang], value: "850+", icon: <Award className="w-4 h-4" /> },
  ];

  return (
    <RoleAwareShell
      title={{ ar: "المتجر", fr: "Marketplace", en: "Marketplace" }[lang]}
      subtitle={{ ar: "استكشفي الدورات المتاحة", fr: "Explorez les formations disponibles", en: "Explore available courses" }[lang]}
    >
      {/* Hero — minimal, airy, mostly whitespace */}
      <section className="max-w-3xl mx-auto px-6 pt-8 pb-14 text-center">
        <h1 className="text-4xl md:text-6xl font-black text-foreground mb-4 leading-[1.1] tracking-tight" style={{ fontFamily: "Cairo, sans-serif" }}>
          {{ ar: "طوّري مهاراتك", fr: "Développez vos compétences", en: "Grow your skills" }[lang]}
        </h1>
        <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-xl mx-auto">{t("marketplace.subtitle", lang)}</p>

        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={{ ar: "ابحثي عن دورة...", fr: "Rechercher une formation...", en: "Search a course..." }[lang]}
            className="w-full pl-11 pr-4 py-3.5 rounded-full text-sm outline-none bg-white text-foreground placeholder:text-muted-foreground border border-border focus:border-foreground transition-colors shadow-sm"
          />
        </div>

        <div className="flex items-center justify-center gap-8 mt-10">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-muted-foreground">{s.icon}</span>
              <span className="font-black text-foreground text-sm">{s.value}</span>
              <span className="text-muted-foreground text-xs">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Coach Ads Section */}
      {ads.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-10">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="w-3.5 h-3.5 text-muted-foreground" />
            <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              {{ ar: "إعلانات المدربات", fr: "Annonces des coachs", en: "Coach announcements" }[lang]}
            </h2>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
            {ads.map((ad) => (
              <div key={ad.id} className="shrink-0 w-64 bg-white border border-border rounded-2xl overflow-hidden hover:border-foreground/20 transition-colors">
                {ad.imageUrl && (
                  <div className="h-24 relative overflow-hidden">
                    <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <p className="text-[10px] text-muted-foreground font-semibold mb-1 uppercase tracking-wider">{ad.authorName}</p>
                  <h3 className="font-bold text-foreground text-sm mb-1 leading-snug">{ad.title}</h3>
                  <p className="text-muted-foreground text-xs line-clamp-2">{ad.content}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filters — light, minimal toolbar */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto flex-1 pb-0.5">
              <button onClick={() => setCategory(null)}
                className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all border ${!category ? "bg-black text-white border-black" : "bg-white text-muted-foreground border-border hover:border-foreground/30"}`}>
                {{ ar: "الكل", fr: "Toutes", en: "All" }[lang]}
              </button>
              {(categories ?? []).map((cat) => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all border ${category === cat ? "bg-black text-white border-black" : "bg-white text-muted-foreground border-border hover:border-foreground/30"}`}>
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select value={level} onChange={(e) => setLevel(e.target.value)}
                className="text-xs font-medium px-3 py-1.5 rounded-full outline-none text-foreground bg-white border border-border">
                <option value="">{{ ar: "كل المستويات", fr: "Tous niveaux", en: "All levels" }[lang]}</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {{ beginner: { ar: "مبتدئ", fr: "Débutant", en: "Beginner" }, intermediate: { ar: "متوسط", fr: "Intermédiaire", en: "Intermediate" }, advanced: { ar: "متقدم", fr: "Avancé", en: "Advanced" } }[l][lang]}
                  </option>
                ))}
              </select>

              <div className="flex rounded-full overflow-hidden border border-border">
                {([
                  { v: "all", l: { ar: "الكل", fr: "Tous", en: "All" }[lang] },
                  { v: "free", l: { ar: "مجاني", fr: "Gratuit", en: "Free" }[lang] },
                  { v: "paid", l: { ar: "مدفوع", fr: "Payant", en: "Paid" }[lang] },
                ] as const).map((p) => (
                  <button key={p.v} onClick={() => setPriceFilter(p.v)}
                    className={`text-xs font-semibold px-3 py-1.5 transition-all ${priceFilter === p.v ? "bg-black text-white" : "bg-white text-muted-foreground hover:text-foreground"}`}>
                    {p.l}
                  </button>
                ))}
              </div>

              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="text-xs font-medium px-3 py-1.5 rounded-full outline-none text-foreground bg-white border border-border">
                <option value="newest">{{ ar: "الأحدث", fr: "Plus récent", en: "Newest" }[lang]}</option>
                <option value="popular">{{ ar: "الأكثر شعبية", fr: "Plus populaire", en: "Most popular" }[lang]}</option>
                <option value="price_asc">{{ ar: "السعر تصاعديًا", fr: "Prix croissant", en: "Price: low to high" }[lang]}</option>
                <option value="price_desc">{{ ar: "السعر تنازليًا", fr: "Prix décroissant", en: "Price: high to low" }[lang]}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <p className="text-muted-foreground text-sm">
            {isLoading
              ? { ar: "جاري التحميل...", fr: "Chargement...", en: "Loading..." }[lang]
              : `${courses?.length ?? 0} ${{ ar: "دورة", fr: `formation${(courses?.length ?? 0) !== 1 ? "s" : ""}`, en: `course${(courses?.length ?? 0) !== 1 ? "s" : ""}` }[lang]}`}
          </p>
          {hasActiveFilters && (
            <button onClick={resetFilters}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3.5 h-3.5" /> {{ ar: "إعادة تعيين", fr: "Réinitialiser", en: "Reset" }[lang]}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-muted/60 rounded-2xl h-72 animate-pulse" />
            ))}
          </div>
        ) : !courses || courses.length === 0 ? (
          <div className="text-center py-24">
            <Search className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>{{ ar: "لا توجد دورات", fr: "Aucune formation trouvée", en: "No courses found" }[lang]}</h3>
            <p className="text-muted-foreground text-sm">{{ ar: "لا توجد دورات مطابقة لمعاييرك", fr: "Aucune formation ne correspond à vos critères", en: "No courses match your criteria" }[lang]}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => (
              <div key={course.id} onClick={() => handleCourseClick(course)} className="cursor-pointer">
                <CourseCard course={course} showPurchaseState />
              </div>
            ))}
          </div>
        )}

        {/* Signup CTA — minimal, still the strongest conversion point on the page */}
        {!user && !isLoading && courses && courses.length > 0 && (
          <div className="mt-16 py-14 text-center border-t border-border">
            <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center mx-auto mb-5">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>
              {{ ar: "ابدئي رحلة التعلم اليوم", fr: "Commencez votre parcours dès aujourd'hui", en: "Start your learning journey today" }[lang]}
            </h3>
            <p className="text-muted-foreground text-sm mb-7 max-w-md mx-auto">{t("marketplace.signup_cta_body", lang)}</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button className="font-bold px-6 bg-black hover:bg-black/90 text-white gap-2 rounded-full"
                onClick={() => setLocation("/register")}>
                <UserPlus className="w-4 h-4" />
                {{ ar: "إنشاء حساب مجاني", fr: "Créer un compte gratuit", en: "Create a free account" }[lang]}
              </Button>
              <Button variant="outline" className="border-border text-foreground hover:bg-muted rounded-full"
                onClick={() => setLocation("/login")}>
                {{ ar: "تسجيل الدخول", fr: "Se connecter", en: "Log in" }[lang]}
              </Button>
            </div>
          </div>
        )}
      </main>
    </RoleAwareShell>
  );
}
