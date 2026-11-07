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
  CheckCircle2, ArrowRight, ArrowLeft, Filter, Sparkles, Tag, ShieldCheck, User
} from "lucide-react";

export default function StudentExplorePage() {
  const { lang, isRTL } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [search, setSearch] = useState("");
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
  }, [courses, search, selectedCategory, selectedLevel, selectedPriceFilter]);

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
        className="relative overflow-hidden rounded-3xl mb-8 p-6 sm:p-8 border border-neutral-800 shadow-xl"
        style={{
          background: "linear-gradient(135deg, hsl(258, 80%, 15%) 0%, hsl(258, 65%, 28%) 50%, hsl(285, 60%, 20%) 100%)",
        }}
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-400/20 to-purple-500/0 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold mb-4 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{{ ar: "دورات تفاعلية وشهادات معتمدة", fr: "Formations certifiantes & accompagnement", en: "Certified courses & mentoring" }[lang]}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3" style={{ fontFamily: "Cairo, sans-serif" }}>
            {{
              ar: "طوّري مهاراتك مع نخبة من أفضل الخبراء الجزائريين",
              fr: "Propulsez vos compétences avec les meilleurs formateurs experts",
              en: "Supercharge your skills with top industry instructors",
            }[lang]}
          </h1>

          <p className="text-white/80 text-sm sm:text-base leading-relaxed mb-6">
            {{
              ar: "دروس فيديو تطبيقية، ملفات ومراجع قابلة للتحميل، امتحانات نهائية وشهادات رسمية برمز تحقق فوري.",
              fr: "Vidéos pratiques, supports PDF téléchargeables, quiz interactifs et certificats d'excellence vérifiables.",
              en: "Practical video lessons, downloadable PDFs, interactive quizzes, and verifiable certificates.",
            }[lang]}
          </p>

          {/* Quick Search */}
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-white/50 absolute left-4 z-10 pointer-events-none" />
            <Input
              type="text"
              placeholder={{
                ar: "ابحثي باسم الدورة، المدرب أو المجال (React، ذكاء اصطناعي، تجارة إلكترونية...)",
                fr: "Rechercher par titre, formateur ou domaine (React, IA, E-commerce, Design, Comptabilité...)",
                en: "Search by course title, instructor or topic...",
              }[lang]}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 pr-4 h-13 rounded-2xl bg-white/15 border-white/25 text-white placeholder:text-white/50 text-sm sm:text-base focus:bg-white/20 focus:border-white/50 transition-all shadow-inner"
              style={{ fontFamily: "Cairo, sans-serif" }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 text-xs font-bold text-white/70 hover:text-white"
              >
                {{ ar: "مسح", fr: "Effacer", en: "Clear" }[lang]}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Pills & Filters */}
      <div className="space-y-4 mb-8">
        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <Button
            onClick={() => setSelectedCategory("all")}
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            className={`rounded-full px-4 text-xs font-bold shrink-0 transition-all ${
              selectedCategory === "all" ? "bg-black text-white hover:bg-neutral-800" : "bg-white text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            {{ ar: "جميع الفئات", fr: "Toutes les catégories", en: "All Categories" }[lang]} ({courses.length})
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
                  selectedCategory === cat ? "bg-black text-white hover:bg-neutral-800" : "bg-white text-neutral-700 hover:bg-neutral-100"
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
        <div className="text-center py-20 bg-white border border-border rounded-3xl p-8">
          <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>
            {{ ar: "لم يتم العثور على دورات مطابقة", fr: "Aucune formation trouvée", en: "No courses found" }[lang]}
          </h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            {{
              ar: "جربي تغيير خيارات البحث أو تصفية الفئات للعثور على دورات أخرى.",
              fr: "Essayez de modifier votre recherche ou de réinitialiser les filtres.",
              en: "Try adjusting your search criteria or resetting filters.",
            }[lang]}
          </p>
          <Button
            onClick={() => {
              setSearch("");
              setSelectedCategory("all");
              setSelectedLevel("all");
              setSelectedPriceFilter("all");
            }}
            variant="outline"
            className="font-bold text-xs"
          >
            {{ ar: "إعادة ضبط الفلاتر", fr: "Réinitialiser les filtres", en: "Reset filters" }[lang]}
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

            return (
              <div
                key={course.id}
                className="group flex flex-col bg-white border border-border/80 hover:border-black/30 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300"
              >
                {/* Course Image & Badges */}
                <div className="relative aspect-video w-full overflow-hidden bg-neutral-100">
                  <img
                    src={course.imageUrl || `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80`}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white/90 text-neutral-900 backdrop-blur-md shadow-xs">
                      {course.category}
                    </span>
                    {isEnrolled && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-600 text-white shadow-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        {{ ar: "مسجّلة بها", fr: "Inscrit(e)", en: "Enrolled" }[lang]}
                      </span>
                    )}
                  </div>

                  {/* Bottom Image Stats */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-semibold">
                    <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded backdrop-blur-sm">
                      <Clock className="w-3.5 h-3.5 text-amber-300" />
                      <span>{course.durationHours || 12} {{ ar: "ساعة", fr: "heures", en: "hrs" }[lang]}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded backdrop-blur-sm text-amber-300 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                      <span>5.0</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3
                      className="font-bold text-foreground text-base leading-snug line-clamp-2 group-hover:text-neutral-900 transition-colors mb-2"
                      style={{ fontFamily: "Cairo, sans-serif" }}
                    >
                      {course.title}
                    </h3>

                    <p className="text-muted-foreground text-xs line-clamp-2 mb-4 leading-relaxed">
                      {course.subtitle || course.description}
                    </p>

                    {/* Coach Info */}
                    <div className="flex items-center gap-2 mb-4 pt-3 border-t border-border/60">
                      <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-700 shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{course.coachName || "Formateur Tamayuz"}</p>
                        <p className="text-[10px] text-muted-foreground">{{ ar: "مدرب معتمد", fr: "Formateur certifié", en: "Certified Coach" }[lang]}</p>
                      </div>
                    </div>
                  </div>

                  {/* Price & Action Button */}
                  <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">
                        {{ ar: "رسوم الدورة", fr: "Tarif", en: "Fee" }[lang]}
                      </p>
                      <p className={`text-base font-black ${isFree ? "text-emerald-600" : "text-foreground"}`}>
                        {priceFormatted}
                      </p>
                    </div>

                    {isEnrolled ? (
                      <Button
                        onClick={() => setLocation(`/student/learn/${course.id}`)}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs"
                      >
                        {{ ar: "متابعة التعلم", fr: "Continuer", en: "Continue" }[lang]}
                        <ArrowIcon className="w-3.5 h-3.5" />
                      </Button>
                    ) : isFree ? (
                      <Button
                        onClick={() => handleEnrollFree(course.id, course.title)}
                        disabled={enrollingId === course.id}
                        size="sm"
                        className="bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs gap-1.5 shadow-xs"
                      >
                        {enrollingId === course.id ? (
                          ({ ar: "جاري التسجيل...", fr: "Inscription...", en: "Enrolling..." }[lang])
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
                        className="border-neutral-300 hover:bg-neutral-900 hover:text-white font-bold text-xs gap-1.5 transition-all"
                      >
                        {{ ar: "عرض التفاصيل", fr: "Détails & Achat", en: "Details" }[lang]}
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
