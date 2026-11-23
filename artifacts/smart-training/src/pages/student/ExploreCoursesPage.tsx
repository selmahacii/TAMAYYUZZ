import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useGetMarketplace, useGetCategories, useGetMyEnrollments } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { StudentLayout } from "@/components/student/StudentLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Compass, Search, BookOpen, Clock, Award, Star,
  CheckCircle2, ArrowRight, ArrowLeft, Filter, Tag, ShieldCheck, User, Globe
} from "lucide-react";

const COUNTRY_OPTIONS = [
  { id: "all", name: { ar: "جميع الدول", fr: "Tous les pays", en: "All Countries" }, flag: "🌐" },
  { id: "dz", name: { ar: "الجزائر", fr: "Algérie", en: "Algeria" }, flag: "🇩🇿" },
  { id: "sa", name: { ar: "السعودية", fr: "Arabie Saoudite", en: "Saudi Arabia" }, flag: "🇸🇦" },
  { id: "eg", name: { ar: "مصر", fr: "Égypte", en: "Egypt" }, flag: "🇪🇬" },
  { id: "ma", name: { ar: "المغرب", fr: "Maroc", en: "Morocco" }, flag: "🇲🇦" },
  { id: "tn", name: { ar: "تونس", fr: "Tunisie", en: "Tunisia" }, flag: "🇹🇳" },
  { id: "kw", name: { ar: "الكويت", fr: "Koweït", en: "Kuwait" }, flag: "🇰🇼" },
  { id: "jo", name: { ar: "الأردن", fr: "Jordanie", en: "Jordan" }, flag: "🇯🇴" },
];

export default function StudentExplorePage() {
  const { lang, isRTL } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedPriceFilter, setSelectedPriceFilter] = useState<string>("all");
  const [enrollingId, setEnrollingId] = useState<number | null>(null);

  const { data: rawCourses, isLoading: loadingCourses, refetch } = useGetMarketplace();
  const courses = Array.isArray(rawCourses) ? rawCourses : [];

  const { data: rawCategories } = useGetCategories();
  const categories = Array.isArray(rawCategories) ? rawCategories : [];

  const { data: rawEnrollments, refetch: refetchEnrollments } = useGetMyEnrollments();
  const enrollments = Array.isArray(rawEnrollments) ? rawEnrollments : [];
  const enrolledCourseIds = useMemo(() => new Set(enrollments.map((e) => e.courseId)), [enrollments]);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

  // One-click enroll for free courses
  const handleEnrollFree = async (courseId: number, courseTitle: string) => {
    setEnrollingId(courseId);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${BASE}/api/enrollments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ courseId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Échec de l'inscription");
      }

      toast({
        title: { ar: "تم التسجيل بنجاح!", fr: "Inscription réussie !", en: "Enrolled successfully!" }[lang],
        description: {
          ar: `لقد تم تسجيلك في دورة: ${courseTitle}`,
          fr: `Vous êtes maintenant inscrit(e) à : ${courseTitle}`,
          en: `You are now enrolled in: ${courseTitle}`,
        }[lang],
      });

      await refetchEnrollments();
      await refetch();
      setLocation(`/student/learn/${courseId}`);
    } catch (err: any) {
      toast({
        title: { ar: "تعذر التسجيل", fr: "Erreur d'inscription", en: "Enrollment error" }[lang],
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setEnrollingId(null);
    }
  };

  // Filter courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // Search
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesTitle = c.title?.toLowerCase().includes(query);
        const matchesDesc = c.description?.toLowerCase().includes(query);
        const matchesCoach = c.coachName?.toLowerCase().includes(query);
        const matchesCat = c.category?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesCoach && !matchesCat) return false;
      }
      // Country
      if (selectedCountry !== "all") {
        const cCountry = (((c as any).country as string) || "dz").toLowerCase();
        if (cCountry !== selectedCountry && cCountry !== "all") {
          return false;
        }
      }
      // Category
      if (selectedCategory !== "all" && c.category !== selectedCategory) {
        return false;
      }
      // Level
      if (selectedLevel !== "all" && c.level !== selectedLevel) {
        return false;
      }
      // Price
      if (selectedPriceFilter === "free" && !c.isFree && parseFloat(c.price || "0") > 0) {
        return false;
      }
      if (selectedPriceFilter === "paid" && (c.isFree || parseFloat(c.price || "0") === 0)) {
        return false;
      }
      return true;
    });
  }, [courses, search, selectedCountry, selectedCategory, selectedLevel, selectedPriceFilter]);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <StudentLayout
      title={{ ar: "الدورات التدريبية المتاحة", fr: "Catalogue des Formations", en: "Explore Courses" }[lang]}
      subtitle={{
        ar: "تصفحي جميع الدورات والمسارات التدريبية المتاحة على المنصة",
        fr: "Explorez toutes les formations certifiantes disponibles pour booster votre carrière",
        en: "Browse all certified courses available to boost your career",
      }[lang]}
    >
      {/* Hero Banner */}
      <div
        className="relative overflow-hidden rounded-2xl mb-8 p-6 sm:p-8 border border-[#1b3d2b] shadow-md bg-gradient-to-r from-[#0d2818] via-[#163824] to-[#1d4730]"
      >
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-emerald-200 text-xs font-semibold mb-3">
            <Award className="w-3.5 h-3.5 text-emerald-300" />
            <span>{{ ar: "دورات أكاديمية وتطبيقية معتمدة", fr: "Formations certifiantes & accompagnement", en: "Certified courses & mentoring" }[lang]}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>
            {{
              ar: "طوّر مهاراتك مع نخبة من الأساتذة والخبراء",
              fr: "Propulsez vos compétences avec les meilleurs formateurs experts",
              en: "Supercharge your skills with top industry instructors",
            }[lang]}
          </h1>

          <p className="text-emerald-100/85 text-xs sm:text-sm leading-relaxed mb-5">
            {{
              ar: "محاضرات فيديو متخصصة، مراجع أكاديمية، تقييمات دقيقة وشهادات تدريبية موثقة.",
              fr: "Vidéos pratiques, supports d'apprentissage téléchargeables, quiz et certificats officiels vérifiables.",
              en: "Practical lessons, downloadable resources, structured quizzes, and verifiable certificates.",
            }[lang]}
          </p>

          {/* Quick Search */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-emerald-200/60 absolute left-3.5 z-10 pointer-events-none" />
            <Input
              type="text"
              placeholder={{
                ar: "ابحث باسم الدورة، الأستاذ أو التخصص الأكاديمي...",
                fr: "Rechercher par titre, formateur ou domaine...",
                en: "Search by course title, instructor or topic...",
              }[lang]}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 h-11 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-emerald-100/50 text-xs sm:text-sm focus:bg-white/15 focus:border-white/40 transition-all shadow-inner"
              style={{ fontFamily: "Cairo, sans-serif" }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 text-xs font-semibold text-white/70 hover:text-white"
              >
                {{ ar: "مسح", fr: "Effacer", en: "Clear" }[lang]}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Country & Category Filters */}
      <div className="space-y-4 mb-8">
        {/* Country Filter Bar */}
        <div className="bg-white border border-neutral-200 rounded-xl p-3 shadow-xs">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Globe className="w-4 h-4 text-emerald-800" />
            <span className="text-xs font-bold text-neutral-800">
              {{ ar: "اختر بلدك لعرض المحتوى المخصص:", fr: "Filtrer selon le pays cible :", en: "Target Country:" }[lang]}
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {COUNTRY_OPTIONS.map((c) => {
              const isSelected = selectedCountry === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCountry(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all border ${
                    isSelected
                      ? "bg-emerald-900 border-emerald-950 text-white shadow-xs font-bold"
                      : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100 hover:border-neutral-300"
                  }`}
                >
                  <span>{c.flag}</span>
                  <span>{c.name[lang]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <Button
            onClick={() => setSelectedCategory("all")}
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            className={`rounded-full px-4 text-xs font-bold shrink-0 transition-all ${
              selectedCategory === "all" ? "bg-neutral-900 text-white hover:bg-neutral-800" : "bg-white text-neutral-700 hover:bg-neutral-100 border-neutral-200"
            }`}
          >
            {{ ar: "جميع التخصصات", fr: "Toutes les catégories", en: "All Categories" }[lang]} ({courses.length})
          </Button>
          {categories.map((cat) => {
            const count = courses.filter((c) => c.category === cat).length;
            return (
              <Button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                className={`rounded-full px-4 text-xs font-bold shrink-0 transition-all ${
                  selectedCategory === cat ? "bg-neutral-900 text-white hover:bg-neutral-800" : "bg-white text-neutral-700 hover:bg-neutral-100 border-neutral-200"
                }`}
              >
                {cat} ({count})
              </Button>
            );
          })}
        </div>

        {/* Secondary filters (Level & Price) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              {{ ar: "المستوى:", fr: "Niveau :", en: "Level:" }[lang]}
            </span>
            {[
              { id: "all", label: { ar: "الكل", fr: "Tous", en: "All" } },
              { id: "beginner", label: { ar: "مبتدئ", fr: "Débutant", en: "Beginner" } },
              { id: "intermediate", label: { ar: "متوسط", fr: "Intermédiaire", en: "Intermediate" } },
              { id: "advanced", label: { ar: "متقدم", fr: "Avancé", en: "Advanced" } },
            ].map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => setSelectedLevel(lvl.id)}
                className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                  selectedLevel === lvl.id
                    ? "bg-neutral-900 text-white font-bold"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {lvl.label[lang]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">
              {{ ar: "السعر:", fr: "Tarif :", en: "Price:" }[lang]}
            </span>
            {[
              { id: "all", label: { ar: "الكل", fr: "Tous", en: "All" } },
              { id: "free", label: { ar: "مجانية", fr: "Gratuites", en: "Free" } },
              { id: "paid", label: { ar: "مدفوعة", fr: "Payantes", en: "Paid" } },
            ].map((pr) => (
              <button
                key={pr.id}
                onClick={() => setSelectedPriceFilter(pr.id)}
                className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                  selectedPriceFilter === pr.id
                    ? "bg-neutral-900 text-white font-bold"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {pr.label[lang]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Courses List */}
      {loadingCourses ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-border rounded-2xl p-4 h-96 animate-pulse" />
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-20 bg-white border border-neutral-200 rounded-2xl p-8">
          <BookOpen className="w-14 h-14 text-neutral-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-neutral-800 mb-1" style={{ fontFamily: "Cairo, sans-serif" }}>
            {{ ar: "لم يتم العثور على دورات مطابقة للخيارات المحددة", fr: "Aucune formation trouvée pour ces critères", en: "No courses found" }[lang]}
          </h3>
          <p className="text-neutral-500 text-xs mb-5 max-w-md mx-auto">
            {{
              ar: "يمكنك تغيير البلد المحدد أو إعادة ضبط تصنيفات الفئات للوصول إلى محتوى إضافي.",
              fr: "Essayez de modifier votre pays de sélection ou de réinitialiser les filtres.",
              en: "Try adjusting your country selection or resetting filters.",
            }[lang]}
          </p>
          <Button
            onClick={() => {
              setSearch("");
              setSelectedCountry("all");
              setSelectedCategory("all");
              setSelectedLevel("all");
              setSelectedPriceFilter("all");
            }}
            variant="outline"
            className="font-bold text-xs border-neutral-300"
          >
            {{ ar: "إعادة ضبط جميع الفلاتر", fr: "Réinitialiser tous les filtres", en: "Reset filters" }[lang]}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const isEnrolled = enrolledCourseIds.has(course.id) || course.isEnrolled;
            const isFree = course.isFree || parseFloat(course.price || "0") === 0;
            const priceFormatted = isFree
              ? { ar: "مجاني", fr: "Gratuit", en: "Free" }[lang]
              : `${parseFloat(course.price).toLocaleString("fr-DZ")} DZD`;

            const courseCountry = (((course as any).country as string) || "dz").toLowerCase();
            const countryMeta = COUNTRY_OPTIONS.find((c) => c.id === courseCountry);

            return (
              <div
                key={course.id}
                className="group flex flex-col bg-white border border-neutral-200 hover:border-neutral-400 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200"
              >
                {/* Course Image & Badges */}
                <div className="relative aspect-video w-full overflow-hidden bg-neutral-100">
                  <img
                    src={course.imageUrl || `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80`}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-white/95 text-neutral-900 shadow-xs">
                        {course.category}
                      </span>
                      {countryMeta && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900/80 text-white backdrop-blur-xs flex items-center gap-1">
                          <span>{countryMeta.flag}</span>
                          <span>{countryMeta.name[lang]}</span>
                        </span>
                      )}
                    </div>
                    {isEnrolled && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-700 text-white shadow-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        {{ ar: "مسجّل", fr: "Inscrit(e)", en: "Enrolled" }[lang]}
                      </span>
                    )}
                  </div>

                  {/* Bottom Image Stats */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-xs font-semibold">
                    <div className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded backdrop-blur-xs">
                      <Clock className="w-3.5 h-3.5 text-amber-300" />
                      <span>{course.durationHours || 12} {{ ar: "ساعة", fr: "heures", en: "hrs" }[lang]}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded backdrop-blur-xs text-amber-300 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                      <span>5.0</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3
                      className="font-bold text-neutral-900 text-sm leading-snug line-clamp-2 mb-1.5"
                      style={{ fontFamily: "Cairo, sans-serif" }}
                    >
                      {course.title}
                    </h3>

                    <p className="text-neutral-500 text-xs line-clamp-2 mb-3 leading-relaxed">
                      {course.subtitle || course.description}
                    </p>

                    {/* Coach Info */}
                    <div className="flex items-center gap-2 mb-3 pt-2.5 border-t border-neutral-100">
                      <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-700 shrink-0">
                        <User className="w-3 h-3" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-neutral-800 truncate">{course.coachName || "Formateur Tamayuz"}</p>
                        <p className="text-[10px] text-neutral-500">{{ ar: "مدرب معتمد", fr: "Formateur certifié", en: "Certified Coach" }[lang]}</p>
                      </div>
                    </div>
                  </div>

                  {/* Price & Action Button */}
                  <div className="pt-2.5 border-t border-neutral-100 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-neutral-400">
                        {{ ar: "الرسوم", fr: "Tarif", en: "Fee" }[lang]}
                      </p>
                      <p className={`text-sm font-bold ${isFree ? "text-emerald-700" : "text-neutral-900"}`}>
                        {priceFormatted}
                      </p>
                    </div>

                    {isEnrolled ? (
                      <Button
                        onClick={() => setLocation(`/student/learn/${course.id}`)}
                        size="sm"
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs gap-1 shadow-xs h-8"
                      >
                        {{ ar: "متابعة", fr: "Continuer", en: "Continue" }[lang]}
                        <ArrowIcon className="w-3.5 h-3.5" />
                      </Button>
                    ) : isFree ? (
                      <Button
                        onClick={() => handleEnrollFree(course.id, course.title)}
                        disabled={enrollingId === course.id}
                        size="sm"
                        className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs gap-1 shadow-xs h-8"
                      >
                        {enrollingId === course.id ? (
                          ({ ar: "جاري...", fr: "En cours...", en: "Enrolling..." }[lang])
                        ) : (
                          <>
                            {{ ar: "تسجيل مجاني", fr: "S'inscrire", en: "Enroll Free" }[lang]}
                            <ArrowIcon className="w-3.5 h-3.5" />
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setLocation(`/course/${course.id}`)}
                        size="sm"
                        variant="outline"
                        className="border-neutral-300 hover:bg-neutral-900 hover:text-white font-bold text-xs gap-1 transition-all h-8"
                      >
                        {{ ar: "التفاصيل", fr: "Détails", en: "Details" }[lang]}
                        <ArrowIcon className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </StudentLayout>
  );
}
