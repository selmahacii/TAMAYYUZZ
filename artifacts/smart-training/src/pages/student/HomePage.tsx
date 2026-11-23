import { useState } from "react";
import { useLocation } from "wouter";
import {
  useGetMarketplace,
  getGetMarketplaceQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n";
import { StudentLayout } from "@/components/student/StudentLayout";
import { TamayuzDigitalLogo } from "@/components/shared/TamayuzDigitalLogo";
import {
  FlagDZ, FlagSA, FlagEG, FlagMA, FlagTN, FlagKW, FlagJO,
  EducationalPillarIcon, HumanPillarIcon, ProfessionalPillarIcon, LibraryPillarIcon,
  HeroAcademicGraphic
} from "@/components/student/PortalIllustrations";
import {
  Home, Globe, Users, Briefcase, BookOpen, Star, UserCheck, Headphones,
  GraduationCap, TrendingUp, ChevronRight, CheckCircle2, ArrowLeft, ArrowRight
} from "lucide-react";

interface CountryOption {
  id: string;
  name: { ar: string; fr: string; en: string };
  flag: React.ReactNode;
}

export default function StudentHomePage() {
  const { user } = useAuth();
  const { lang, isRTL } = useI18n();
  const [, setLocation] = useLocation();

  const [selectedCountry, setSelectedCountry] = useState("dz");
  const [activeSidebarKey, setActiveSidebarKey] = useState("home");

  const { data: rawCourses, isLoading } = useGetMarketplace(
    { limit: 20, sortBy: "popular" },
    { query: { queryKey: getGetMarketplaceQueryKey({ limit: 20, sortBy: "popular" }) } }
  );
  const allCourses = Array.isArray(rawCourses) ? rawCourses : [];

  // Countries for selector bar with full i18n support
  const countries: CountryOption[] = [
    { id: "dz", name: { ar: "الجزائر", fr: "Algérie", en: "Algeria" }, flag: <FlagDZ className="w-4 h-3 rounded-[2px]" /> },
    { id: "sa", name: { ar: "السعودية", fr: "Arabie Saoudite", en: "Saudi Arabia" }, flag: <FlagSA className="w-4 h-3 rounded-[2px]" /> },
    { id: "eg", name: { ar: "مصر", fr: "Égypte", en: "Egypt" }, flag: <FlagEG className="w-4 h-3 rounded-[2px]" /> },
    { id: "ma", name: { ar: "المغرب", fr: "Maroc", en: "Morocco" }, flag: <FlagMA className="w-4 h-3 rounded-[2px]" /> },
    { id: "tn", name: { ar: "تونس", fr: "Tunisie", en: "Tunisia" }, flag: <FlagTN className="w-4 h-3 rounded-[2px]" /> },
    { id: "kw", name: { ar: "الكويت", fr: "Koweït", en: "Kuwait" }, flag: <FlagKW className="w-4 h-3 rounded-[2px]" /> },
    { id: "jo", name: { ar: "الأردن", fr: "Jordanie", en: "Jordan" }, flag: <FlagJO className="w-4 h-3 rounded-[2px]" /> },
    { id: "other", name: { ar: "بلد آخر", fr: "Autre pays", en: "Other country" }, flag: <Globe className="w-3.5 h-3.5 text-neutral-500" /> },
  ];

  // Sidebar items matching the exact reference UI
  const sidebarItems = [
    { key: "home", label: { ar: "الرئيسية", fr: "Accueil", en: "Home" }[lang], icon: Home, href: "/student/home" },
    { key: "country_edu", label: { ar: "التعليم حسب البلد", fr: "Enseignement par pays", en: "Education by Country" }[lang], icon: Globe, href: "/student/courses?filter=country" },
    { key: "human_dev", label: { ar: "التنمية البشرية", fr: "Développement personnel", en: "Human Development" }[lang], icon: Users, href: "/student/courses?category=Personal%20Development" },
    { key: "career_dev", label: { ar: "التطوير المهني", fr: "Évolution professionnelle", en: "Career Development" }[lang], icon: Briefcase, href: "/student/courses?category=Entrepreneuriat" },
    { key: "digital_lib", label: { ar: "المكتبة الرقمية", fr: "Bibliothèque numérique", en: "Digital Library" }[lang], icon: BookOpen, href: "/student/courses?type=ebooks" },
    { key: "featured", label: { ar: "الدورات المميزة", fr: "Formations vedettes", en: "Featured Courses" }[lang], icon: Star, href: "/student/courses?filter=featured" },
    { key: "coaches", label: { ar: "الخبراء والمدربون", fr: "Formateurs & Experts", en: "Coaches & Experts" }[lang], icon: UserCheck, href: "/student/courses?view=coaches" },
    { key: "help", label: { ar: "مركز المساعدة", fr: "Centre d'aide", en: "Help Center" }[lang], icon: Headphones, href: "/help" },
  ];

  // The 4 reference courses matching the design and database
  const targetCourses = [
    {
      id: 24,
      title: {
        ar: "أساسيات التربية الحديثة",
        fr: "Fondamentaux de la Pédagogie Moderne",
        en: "Fundamentals of Modern Parenting & Education",
      }[lang],
      badgeText: { ar: "مدفوع", fr: "Payant", en: "Paid" }[lang],
      isPaid: true,
      rating: "4.9",
      subLevel: { ar: "مستوى مبتدئ", fr: "Niveau débutant", en: "Beginner" }[lang],
      imageUrl: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 25,
      title: {
        ar: "مهارات الكتابة الأكاديمية",
        fr: "Méthodologie de la Rédaction Académique",
        en: "Academic Writing & Research Skills",
      }[lang],
      badgeText: { ar: "مجاني", fr: "Gratuit", en: "Free" }[lang],
      isPaid: false,
      rating: "4.8",
      subLevel: { ar: "مستوى متوسط", fr: "Niveau intermédiaire", en: "Intermediate" }[lang],
      imageUrl: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 26,
      title: {
        ar: "مهارات التحليل الإحصائي",
        fr: "Maîtrise de l'Analyse Statistique de Données",
        en: "Statistical Data Analysis Mastery",
      }[lang],
      badgeText: { ar: "مدفوع", fr: "Payant", en: "Paid" }[lang],
      isPaid: true,
      rating: "4.7",
      subLevel: { ar: "مستوى متقدم", fr: "Niveau avancé", en: "Advanced" }[lang],
      imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 27,
      title: {
        ar: "منهجية البحث العلمي",
        fr: "Méthodologie de la Recherche Scientifique",
        en: "Scientific Research Methodology",
      }[lang],
      badgeText: { ar: "مجاني", fr: "Gratuit", en: "Free" }[lang],
      isPaid: false,
      rating: "4.8",
      subLevel: { ar: "لجميع الجامعات", fr: "Toutes universités", en: "All universities" }[lang],
      imageUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80",
    },
  ];

  const handleCourseClick = (id: number) => {
    setLocation(`/course/${id}`);
  };

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* 1. Academic Hero Banner: Dark forest green academic atmosphere */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#07241c] via-[#0c3b2e] to-[#0a2e23] border border-emerald-900/40 shadow-lg text-white">
          {/* Subtle architectural grid */}
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(to right, #ffffff 1px, transparent 1px)`,
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative z-10 px-6 py-6 sm:py-8 lg:py-10 flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
            {/* Academic Cap, Stack of Books & Diploma Certificate Graphic */}
            <div className={`w-full lg:w-auto flex justify-center shrink-0 ${isRTL ? "order-2 lg:order-1" : "order-2 lg:order-1"}`}>
              <div className="relative group transition-transform duration-300 hover:scale-102">
                <HeroAcademicGraphic className="w-64 h-56 sm:w-80 sm:h-64 lg:w-92 lg:h-72 drop-shadow-2xl" />
              </div>
            </div>

            {/* Center: Main Institutional Welcome & CTA */}
            <div className="flex-1 text-center max-w-xl mx-auto order-1 lg:order-2">
              <h1
                className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mb-3"
                style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}
              >
                {{
                  ar: "مرحباً بك في منصة التميز الرقمي",
                  fr: "Bienvenue sur la Plateforme Numérique Tamayuz",
                  en: "Welcome to the Digital Tamayuz Platform",
                }[lang]}
              </h1>
              <p
                className="text-white/85 text-xs sm:text-sm lg:text-base leading-relaxed mb-6 font-medium max-w-lg mx-auto whitespace-pre-line"
                style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}
              >
                {{
                  ar: "منصة عربية رائدة في المعرفة والتعلم والتوجيه،\nلنبني معاً مستقبلاً أكثر تميزاً",
                  fr: "Une plateforme d'excellence dédiée au savoir, à l'apprentissage et au mentorat,\npour bâtir ensemble un avenir plus prometteur.",
                  en: "A leading platform dedicated to knowledge, learning and guidance,\nbuilding a distinguished future together.",
                }[lang]}
              </p>

              <button
                onClick={() => setLocation("/student/courses")}
                className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl bg-[#c59336] hover:bg-[#b5832a] active:bg-[#a07221] text-white font-bold text-sm sm:text-base shadow-md transition-all hover:scale-103 cursor-pointer"
                style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}
              >
                <span>
                  {{
                    ar: "ابدأ رحلتك الآن",
                    fr: "Commencer maintenant",
                    en: "Start your journey",
                  }[lang]}
                </span>
                <span className="text-base font-mono">{isRTL ? "←" : "→"}</span>
              </button>

              {/* 4 Carousel Pagination Indicator Dots */}
              <div className="flex items-center justify-center gap-1.5 mt-6">
                <span className="w-5 h-2 rounded-full bg-white shadow-xs" />
                <span className="w-2 h-2 rounded-full bg-white/40" />
                <span className="w-2 h-2 rounded-full bg-white/40" />
                <span className="w-2 h-2 rounded-full bg-white/40" />
              </div>
            </div>

            {/* Right Side: Institutional Calligraphy Motto */}
            <div className={`hidden xl:flex flex-col items-center justify-center text-center px-6 py-4 rounded-xl bg-black/20 border border-[#d4af37]/30 shrink-0 ${isRTL ? "order-3" : "order-3"}`}>
              <p
                className="text-[#e5b858] font-black text-xl lg:text-2xl leading-relaxed"
                style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}
              >
                {{
                  ar: "معرفة اليوم ..",
                  fr: "Le savoir d'aujourd'hui ..",
                  en: "Today's knowledge ..",
                }[lang]}
              </p>
              <p
                className="text-[#e5b858] font-black text-xl lg:text-2xl leading-relaxed mt-0.5"
                style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}
              >
                {{
                  ar: "تصنع نجاح الغد",
                  fr: "forge le succès de demain",
                  en: "shapes tomorrow's success",
                }[lang]}
              </p>
              {/* Elegant curve divider */}
              <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-[#d4af37]/60 to-transparent my-3" />
              <div className="w-12 h-12 rounded-full bg-white/10 border border-[#d4af37]/40 flex items-center justify-center p-1.5 shadow-inner">
                <TamayuzDigitalLogo showText={false} light={true} className="w-8 h-8" />
              </div>
            </div>
          </div>
        </section>

        {/* 2. Country Selector Bar */}
        <section className="bg-white border border-neutral-200/90 rounded-2xl p-2.5 sm:p-3.5 shadow-2xs">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Title with Globe Icon */}
            <div className="flex items-center gap-2 text-neutral-800 font-bold text-xs sm:text-sm shrink-0">
              <Globe className="w-4 h-4 text-[#0c3b2e]" />
              <span style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}>
                {{
                  ar: "اختر بلدك لعرض المحتوى المناسب",
                  fr: "Sélectionnez votre pays pour afficher le contenu adapté",
                  en: "Select your country to view tailored content",
                }[lang]}
              </span>
            </div>

            {/* Country Pills List */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none justify-start md:justify-end">
              {countries.map((c) => {
                const isActive = selectedCountry === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCountry(c.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-[#0c3b2e] text-white shadow-xs border border-[#0c3b2e]"
                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200/70 border border-neutral-200/60"
                    }`}
                    style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}
                  >
                    <span>{c.name[lang]}</span>
                    {c.flag}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3. Main 2-Column Section (RTL: Right Sidebar, Left Content / LTR: Left Sidebar, Right Content) */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Main Area: 4 Pillar Cards + Featured Courses Grid */}
          <main className={`flex-1 w-full space-y-6 ${isRTL ? "order-2 lg:order-1" : "order-2 lg:order-2"}`}>
            {/* Top 4 3D Pillar Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Card 1: التميز التعليمي (Sky Blue Gradient) */}
              <div className="bg-gradient-to-b from-[#eaf4ff] to-[#d6ebff] border border-[#bfe0fc] rounded-2xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-md transition-shadow relative overflow-hidden group">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#1c75c8] text-white flex items-center justify-center shadow-xs">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="font-extrabold text-[#0c3b2e] text-base mb-1" style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}>
                    {{ ar: "التميز التعليمي", fr: "Excellence Académique", en: "Educational Excellence" }[lang]}
                  </h3>
                  <p className="text-neutral-600 text-xs font-medium mb-3" style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}>
                    {{ ar: "دروس ومحاضرات حسب بلدك", fr: "Cours et conférences selon votre pays", en: "Lectures tailored to your country" }[lang]}
                  </p>
                </div>

                <div className="flex items-end justify-between mt-2 pt-2 border-t border-[#bfe0fc]/60">
                  <button
                    onClick={() => setLocation("/student/courses?category=Technology")}
                    className="px-3 py-1.5 rounded-xl bg-[#1c75c8] hover:bg-[#165ea3] text-white text-xs font-bold shadow-2xs transition-transform hover:scale-102 flex items-center gap-1 cursor-pointer"
                    style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}
                  >
                    <span>{{ ar: "استكشف الدورات", fr: "Explorer les cours", en: "Explore courses" }[lang]}</span>
                    <span>{isRTL ? "←" : "→"}</span>
                  </button>
                  <EducationalPillarIcon className="w-16 h-12 shrink-0 drop-shadow-xs" />
                </div>
              </div>

              {/* Card 2: التميز الإنساني (Warm Amber Gradient) */}
              <div className="bg-gradient-to-b from-[#fff7ed] to-[#fde8c8] border border-[#fbd398] rounded-2xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-md transition-shadow relative overflow-hidden group">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#b06f24] text-white flex items-center justify-center shadow-xs">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="font-extrabold text-[#5c3710] text-base mb-1" style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}>
                    {{ ar: "التميز الإنساني", fr: "Excellence Humaine", en: "Human Excellence" }[lang]}
                  </h3>
                  <p className="text-neutral-600 text-xs font-medium mb-3" style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}>
                    {{ ar: "تطوير الذات وبناء علاقات أفضل", fr: "Développement personnel et relations", en: "Self-growth & better relations" }[lang]}
                  </p>
                </div>

                <div className="flex items-end justify-between mt-2 pt-2 border-t border-[#fbd398]/60">
                  <button
                    onClick={() => setLocation("/student/courses?category=Personal%20Development")}
                    className="px-3 py-1.5 rounded-xl bg-[#b06f24] hover:bg-[#945c1c] text-white text-xs font-bold shadow-2xs transition-transform hover:scale-102 flex items-center gap-1 cursor-pointer"
                    style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}
                  >
                    <span>{{ ar: "استكشف الدورات", fr: "Explorer les cours", en: "Explore courses" }[lang]}</span>
                    <span>{isRTL ? "←" : "→"}</span>
                  </button>
                  <HumanPillarIcon className="w-16 h-12 shrink-0 drop-shadow-xs" />
                </div>
              </div>

              {/* Card 3: التميز المهني (Sage Green Gradient) */}
              <div className="bg-gradient-to-b from-[#effcf6] to-[#d8f5e7] border border-[#b4eed2] rounded-2xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-md transition-shadow relative overflow-hidden group">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#1a7f4f] text-white flex items-center justify-center shadow-xs">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="font-extrabold text-[#0c3b2e] text-base mb-1" style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}>
                    {{ ar: "التميز المهني", fr: "Excellence Professionnelle", en: "Career Excellence" }[lang]}
                  </h3>
                  <p className="text-neutral-600 text-xs font-medium mb-3" style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}>
                    {{ ar: "مهارات مهنية وتطوير مسار حياتك", fr: "Compétences et évolution de carrière", en: "Professional skills & career path" }[lang]}
                  </p>
                </div>

                <div className="flex items-end justify-between mt-2 pt-2 border-t border-[#b4eed2]/60">
                  <button
                    onClick={() => setLocation("/student/courses?category=Entrepreneuriat")}
                    className="px-3 py-1.5 rounded-xl bg-[#1a7f4f] hover:bg-[#156a42] text-white text-xs font-bold shadow-2xs transition-transform hover:scale-102 flex items-center gap-1 cursor-pointer"
                    style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}
                  >
                    <span>{{ ar: "استكشف الدورات", fr: "Explorer les cours", en: "Explore courses" }[lang]}</span>
                    <span>{isRTL ? "←" : "→"}</span>
                  </button>
                  <ProfessionalPillarIcon className="w-16 h-12 shrink-0 drop-shadow-xs" />
                </div>
              </div>

              {/* Card 4: المكتبة الرقمية (Soft Violet Gradient) */}
              <div className="bg-gradient-to-b from-[#fbf5ff] to-[#f1e2ff] border border-[#e4ccfc] rounded-2xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-md transition-shadow relative overflow-hidden group">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#6b3ca5] text-white flex items-center justify-center shadow-xs">
                      <BookOpen className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="font-extrabold text-[#3f1969] text-base mb-1" style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}>
                    {{ ar: "المكتبة الرقمية", fr: "Bibliothèque Numérique", en: "Digital Library" }[lang]}
                  </h3>
                  <p className="text-neutral-600 text-xs font-medium mb-3" style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}>
                    {{ ar: "كتب ومصادر معرفية مختارة", fr: "Livres et ressources sélectionnées", en: "Selected books & knowledge resources" }[lang]}
                  </p>
                </div>

                <div className="flex items-end justify-between mt-2 pt-2 border-t border-[#e4ccfc]/60">
                  <button
                    onClick={() => setLocation("/student/courses?type=ebooks")}
                    className="px-3 py-1.5 rounded-xl bg-[#6b3ca5] hover:bg-[#582f8a] text-white text-xs font-bold shadow-2xs transition-transform hover:scale-102 flex items-center gap-1 cursor-pointer"
                    style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}
                  >
                    <span>{{ ar: "تصفح المكتبة", fr: "Parcourir la bibliothèque", en: "Browse library" }[lang]}</span>
                    <span>{isRTL ? "←" : "→"}</span>
                  </button>
                  <LibraryPillarIcon className="w-16 h-12 shrink-0 drop-shadow-xs" />
                </div>
              </div>
            </section>

            {/* Bottom Section: "محتوى مميز حسب بلدك" (Featured Content by Country) */}
            <section className="space-y-4">
              {/* Header row with Star & View All button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-[#d4af37] fill-[#d4af37]" />
                  <h2
                    className="text-base sm:text-lg font-black text-neutral-900"
                    style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}
                  >
                    {{
                      ar: "محتوى مميز حسب بلدك",
                      fr: "Contenu recommandé selon votre pays",
                      en: "Featured Content for Your Country",
                    }[lang]}
                  </h2>
                </div>

                <button
                  onClick={() => setLocation("/student/courses")}
                  className="px-3.5 py-1 rounded-full bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}
                >
                  <span>{{ ar: "عرض الكل", fr: "Voir tout", en: "View all" }[lang]}</span>
                  <span>{isRTL ? "←" : "→"}</span>
                </button>
              </div>

              {/* 4 Course Cards Grid matching the exact reference UI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {targetCourses.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleCourseClick(item.id)}
                    className="bg-white border border-neutral-200/90 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col"
                  >
                    {/* Course Thumbnail with Tag Badge */}
                    <div className="relative aspect-video w-full overflow-hidden bg-neutral-100">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      {/* Paid / Free badge */}
                      <div className={`absolute top-2.5 z-10 ${isRTL ? "right-2.5" : "left-2.5"}`}>
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-black shadow-xs ${
                            item.isPaid
                              ? "bg-[#c59336] text-white"
                              : "bg-[#1b7348] text-white"
                          }`}
                          style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}
                        >
                          {item.badgeText}
                        </span>
                      </div>
                    </div>

                    {/* Course Information */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <h4
                        className="font-bold text-neutral-900 text-xs sm:text-sm line-clamp-2 leading-snug mb-3 group-hover:text-[#0c3b2e] transition-colors"
                        style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}
                      >
                        {item.title}
                      </h4>

                      {/* Bottom Row: Rating, Level & Country Flag */}
                      <div className="flex items-center justify-between text-xs text-neutral-600 pt-2 border-t border-neutral-100">
                        {/* Rating */}
                        <div className="flex items-center gap-1 font-bold text-neutral-800">
                          <span className="text-[#d4af37] font-black">★</span>
                          <span>{item.rating}</span>
                        </div>

                        {/* Country Flag & Level Sub-badge */}
                        <div className="flex items-center gap-1.5 font-medium text-neutral-500 text-[11px]">
                          <span>{item.subLevel}</span>
                          <FlagDZ className="w-3.5 h-2.5 rounded-[1px]" />
                          <span className="text-neutral-700 font-bold">
                            {{ ar: "الجزائر", fr: "Algérie", en: "Algeria" }[lang]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </main>

          {/* Institutional Sidebar: Dark Green Container + Support Card */}
          <aside className={`w-full lg:w-64 shrink-0 flex flex-col gap-4 ${isRTL ? "order-1 lg:order-2" : "order-1 lg:order-1"}`}>
            {/* Dark Green Institutional Navigation Card */}
            <div className="bg-[#0c3b2e] text-white rounded-2xl p-2.5 shadow-md flex flex-col gap-1">
              {sidebarItems.map((item) => {
                const active = activeSidebarKey === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setActiveSidebarKey(item.key);
                      if (item.href) setLocation(item.href);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? "bg-[#144f3e] text-white shadow-2xs border border-emerald-500/20"
                        : "text-white/80 hover:bg-[#144f3e]/60 hover:text-white"
                    } ${isRTL ? "text-right" : "text-left"}`}
                    style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}
                  >
                    <span className="truncate">{item.label}</span>
                    <item.icon className="w-4 h-4 shrink-0 text-white/90" />
                  </button>
                );
              })}
            </div>

            {/* Support Callout Card */}
            <div className="bg-gradient-to-b from-[#0e4839] to-[#072a21] border border-emerald-500/20 rounded-2xl p-4 text-center text-white shadow-md flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-2.5 shadow-inner">
                <Headphones className="w-6 h-6 text-[#e5b858]" />
              </div>
              <h4 className="font-bold text-sm mb-0.5 text-white" style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}>
                {{ ar: "هل تحتاج إلى مساعدة؟", fr: "Besoin d'aide ?", en: "Need help?" }[lang]}
              </h4>
              <p className="text-white/70 text-xs mb-3 font-medium" style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}>
                {{ ar: "فريق الدعم في خدمتكم", fr: "Notre équipe est à votre écoute", en: "Support team at your service" }[lang]}
              </p>
              <button
                onClick={() => setLocation("/student/support")}
                className="w-full py-2 px-3 rounded-xl bg-[#c59336] hover:bg-[#b5832a] active:bg-[#a07221] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                style={{ fontFamily: isRTL ? "Cairo, sans-serif" : "inherit" }}
              >
                <span>{{ ar: "تواصل معنا", fr: "Nous contacter", en: "Contact us" }[lang]}</span>
                <span>{isRTL ? "←" : "→"}</span>
              </button>
            </div>
          </aside>
        </div>
      </div>
    </StudentLayout>
  );
}
