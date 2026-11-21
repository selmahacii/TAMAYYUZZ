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
  GraduationCap, TrendingUp, ChevronRight, CheckCircle2
} from "lucide-react";

interface CountryOption {
  id: string;
  name: string;
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

  const levelLabels: Record<string, string> = {
    beginner: "مستوى مبتدئ",
    intermediate: "مستوى متوسط",
    advanced: "مستوى متقدم",
  };

  // Countries for selector bar
  const countries: CountryOption[] = [
    { id: "dz", name: "الجزائر", flag: <FlagDZ className="w-4 h-3 rounded-[2px]" /> },
    { id: "sa", name: "السعودية", flag: <FlagSA className="w-4 h-3 rounded-[2px]" /> },
    { id: "eg", name: "مصر", flag: <FlagEG className="w-4 h-3 rounded-[2px]" /> },
    { id: "ma", name: "المغرب", flag: <FlagMA className="w-4 h-3 rounded-[2px]" /> },
    { id: "tn", name: "تونس", flag: <FlagTN className="w-4 h-3 rounded-[2px]" /> },
    { id: "kw", name: "الكويت", flag: <FlagKW className="w-4 h-3 rounded-[2px]" /> },
    { id: "jo", name: "الأردن", flag: <FlagJO className="w-4 h-3 rounded-[2px]" /> },
    { id: "other", name: "بلد آخر", flag: <Globe className="w-3.5 h-3.5 text-neutral-500" /> },
  ];

  // Sidebar items matching the exact reference UI
  const sidebarItems = [
    { key: "home", label: "الرئيسية", icon: Home, href: "/student/home" },
    { key: "country_edu", label: "التعليم حسب البلد", icon: Globe, href: "/student/courses?filter=country" },
    { key: "human_dev", label: "التنمية البشرية", icon: Users, href: "/student/courses?category=Personal%20Development" },
    { key: "career_dev", label: "التطوير المهني", icon: Briefcase, href: "/student/courses?category=Entrepreneuriat" },
    { key: "digital_lib", label: "المكتبة الرقمية", icon: BookOpen, href: "/student/courses?type=ebooks" },
    { key: "featured", label: "الدورات المميزة", icon: Star, href: "/student/courses?filter=featured" },
    { key: "coaches", label: "الخبراء والمدربون", icon: UserCheck, href: "/student/courses?view=coaches" },
    { key: "help", label: "مركز المساعدة", icon: Headphones, href: "/help" },
  ];

  // Top 4 courses actually in the catalog, ranked by real rating then popularity —
  // no fixed IDs and no placeholder titles/images/ratings.
  const featuredCourses = [...allCourses]
    .sort((a, b) => {
      const ratingDiff = (b.avgRating ?? -1) - (a.avgRating ?? -1);
      if (ratingDiff !== 0) return ratingDiff;
      return (b.enrollmentCount ?? 0) - (a.enrollmentCount ?? 0);
    })
    .slice(0, 4);

  const handleCourseClick = (id: number) => {
    setLocation(`/course/${id}`);
  };

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* 1. Academic Hero Banner: Dark forest green academic atmosphere */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#07241c] via-[#0c3b2e] to-[#0a2e23] border border-emerald-900/40 shadow-lg text-white">
          {/* Subtle background ambient glow & academic texture */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(212,175,55,0.08),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(27,94,67,0.25),transparent_60%)]" />

          <div className="relative z-10 px-6 py-6 sm:py-8 lg:py-10 flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
            {/* Left Column (in LTR) / Right Column (in RTL): Academic Cap, Stack of Books & Diploma Certificate */}
            <div className="w-full lg:w-auto flex justify-center shrink-0 order-2 lg:order-1">
              <div className="relative group transition-transform duration-300 hover:scale-102">
                <HeroAcademicGraphic className="w-64 h-56 sm:w-80 sm:h-64 lg:w-92 lg:h-72 drop-shadow-2xl" />
              </div>
            </div>

            {/* Center: Main Institutional Welcome & CTA */}
            <div className="flex-1 text-center max-w-xl mx-auto order-1 lg:order-2">
              <h1
                className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mb-3"
                style={{ fontFamily: "Cairo, sans-serif" }}
              >
                مرحباً بك في منصة التميز الرقمي
              </h1>
              <p
                className="text-white/85 text-xs sm:text-sm lg:text-base leading-relaxed mb-6 font-medium max-w-lg mx-auto"
                style={{ fontFamily: "Cairo, sans-serif" }}
              >
                منصة عربية رائدة في المعرفة والتعلم والتوجيه،
                <br className="hidden sm:inline" />
                لنبني معاً مستقبلاً أكثر تميزاً
              </p>

              <button
                onClick={() => setLocation("/student/courses")}
                className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl bg-[#c59336] hover:bg-[#b5832a] active:bg-[#a07221] text-white font-bold text-sm sm:text-base shadow-md transition-all hover:scale-103 cursor-pointer"
                style={{ fontFamily: "Cairo, sans-serif" }}
              >
                <span>ابدأ رحلتك الآن</span>
                <span className="text-base font-mono">←</span>
              </button>

              {/* 4 Carousel Pagination Indicator Dots */}
              <div className="flex items-center justify-center gap-1.5 mt-6">
                <span className="w-5 h-2 rounded-full bg-white shadow-xs" />
                <span className="w-2 h-2 rounded-full bg-white/40" />
                <span className="w-2 h-2 rounded-full bg-white/40" />
                <span className="w-2 h-2 rounded-full bg-white/40" />
              </div>
            </div>

            {/* Right Column (in LTR) / Left Column (in RTL): Golden Calligraphy Callout */}
            <div className="hidden xl:flex flex-col items-center justify-center text-center px-6 py-4 rounded-xl bg-black/15 border border-[#d4af37]/20 backdrop-blur-xs shrink-0 order-3">
              <p
                className="text-[#e5b858] font-black text-xl lg:text-2xl leading-relaxed"
                style={{ fontFamily: "Cairo, sans-serif" }}
              >
                معرفة اليوم ..
              </p>
              <p
                className="text-[#e5b858] font-black text-xl lg:text-2xl leading-relaxed mt-0.5"
                style={{ fontFamily: "Cairo, sans-serif" }}
              >
                تصنع نجاح الغد
              </p>
              {/* Elegant curve divider */}
              <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-[#d4af37]/60 to-transparent my-3" />
              <div className="w-12 h-12 rounded-full bg-white/10 border border-[#d4af37]/30 flex items-center justify-center p-1.5 shadow-inner">
                <TamayuzDigitalLogo />
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
              <span style={{ fontFamily: "Cairo, sans-serif" }}>اختر بلدك لعرض المحتوى المناسب</span>
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
                    style={{ fontFamily: "Cairo, sans-serif" }}
                  >
                    <span>{c.name}</span>
                    {c.flag}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3. Main 2-Column Section (RTL: Right Sidebar, Left Content) */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Main Area: 4 Pillar Cards + Featured Courses Grid */}
          <main className="flex-1 w-full space-y-6 order-2 lg:order-1">
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
                  <h3 className="font-extrabold text-[#0c3b2e] text-base mb-1" style={{ fontFamily: "Cairo, sans-serif" }}>
                    التميز التعليمي
                  </h3>
                  <p className="text-neutral-600 text-xs font-medium mb-3" style={{ fontFamily: "Cairo, sans-serif" }}>
                    دروس ومحاضرات حسب بلدك
                  </p>
                </div>

                <div className="flex items-end justify-between mt-2 pt-2 border-t border-[#bfe0fc]/60">
                  <button
                    onClick={() => setLocation("/student/courses?category=Technology")}
                    className="px-3 py-1.5 rounded-xl bg-[#1c75c8] hover:bg-[#165ea3] text-white text-xs font-bold shadow-2xs transition-transform hover:scale-102 flex items-center gap-1 cursor-pointer"
                    style={{ fontFamily: "Cairo, sans-serif" }}
                  >
                    <span>استكشف الدورات</span>
                    <span>←</span>
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
                  <h3 className="font-extrabold text-[#5c3710] text-base mb-1" style={{ fontFamily: "Cairo, sans-serif" }}>
                    التميز الإنساني
                  </h3>
                  <p className="text-neutral-600 text-xs font-medium mb-3" style={{ fontFamily: "Cairo, sans-serif" }}>
                    تطوير الذات وبناء علاقات أفضل
                  </p>
                </div>

                <div className="flex items-end justify-between mt-2 pt-2 border-t border-[#fbd398]/60">
                  <button
                    onClick={() => setLocation("/student/courses?category=Personal%20Development")}
                    className="px-3 py-1.5 rounded-xl bg-[#b06f24] hover:bg-[#945c1c] text-white text-xs font-bold shadow-2xs transition-transform hover:scale-102 flex items-center gap-1 cursor-pointer"
                    style={{ fontFamily: "Cairo, sans-serif" }}
                  >
                    <span>استكشف الدورات</span>
                    <span>←</span>
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
                  <h3 className="font-extrabold text-[#0c3b2e] text-base mb-1" style={{ fontFamily: "Cairo, sans-serif" }}>
                    التميز المهني
                  </h3>
                  <p className="text-neutral-600 text-xs font-medium mb-3" style={{ fontFamily: "Cairo, sans-serif" }}>
                    مهارات مهنية وتطوير مسار حياتك
                  </p>
                </div>

                <div className="flex items-end justify-between mt-2 pt-2 border-t border-[#b4eed2]/60">
                  <button
                    onClick={() => setLocation("/student/courses?category=Entrepreneuriat")}
                    className="px-3 py-1.5 rounded-xl bg-[#1a7f4f] hover:bg-[#156a42] text-white text-xs font-bold shadow-2xs transition-transform hover:scale-102 flex items-center gap-1 cursor-pointer"
                    style={{ fontFamily: "Cairo, sans-serif" }}
                  >
                    <span>استكشف الدورات</span>
                    <span>←</span>
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
                  <h3 className="font-extrabold text-[#3f1969] text-base mb-1" style={{ fontFamily: "Cairo, sans-serif" }}>
                    المكتبة الرقمية
                  </h3>
                  <p className="text-neutral-600 text-xs font-medium mb-3" style={{ fontFamily: "Cairo, sans-serif" }}>
                    كتب ومصادر معرفية مختارة
                  </p>
                </div>

                <div className="flex items-end justify-between mt-2 pt-2 border-t border-[#e4ccfc]/60">
                  <button
                    onClick={() => setLocation("/student/courses?type=ebooks")}
                    className="px-3 py-1.5 rounded-xl bg-[#6b3ca5] hover:bg-[#582f8a] text-white text-xs font-bold shadow-2xs transition-transform hover:scale-102 flex items-center gap-1 cursor-pointer"
                    style={{ fontFamily: "Cairo, sans-serif" }}
                  >
                    <span>تصفح المكتبة</span>
                    <span>←</span>
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
                    style={{ fontFamily: "Cairo, sans-serif" }}
                  >
                    محتوى مميز حسب بلدك
                  </h2>
                </div>

                <button
                  onClick={() => setLocation("/student/courses")}
                  className="px-3.5 py-1 rounded-full bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  style={{ fontFamily: "Cairo, sans-serif" }}
                >
                  <span>عرض الكل</span>
                  <span>←</span>
                </button>
              </div>

              {/* 4 Course Cards Grid, populated from real catalog data */}
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white border border-neutral-200/90 rounded-2xl overflow-hidden shadow-2xs animate-pulse">
                      <div className="aspect-video w-full bg-neutral-100" />
                      <div className="p-3.5 space-y-3">
                        <div className="h-3 bg-neutral-100 rounded w-5/6" />
                        <div className="h-3 bg-neutral-100 rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : featuredCourses.length === 0 ? (
                <div className="bg-white border border-neutral-200/90 rounded-2xl p-8 text-center text-neutral-500 text-sm" style={{ fontFamily: "Cairo, sans-serif" }}>
                  لا توجد دورات منشورة حالياً
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {featuredCourses.map((course) => {
                    const isPaid = !course.isFree;

                    return (
                      <div
                        key={course.id}
                        onClick={() => handleCourseClick(course.id)}
                        className="bg-white border border-neutral-200/90 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col"
                      >
                        {/* Course Thumbnail with Tag Badge */}
                        <div className="relative aspect-video w-full overflow-hidden bg-neutral-100">
                          {course.imageUrl ? (
                            <img
                              src={course.imageUrl}
                              alt={course.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0c3b2e] to-[#144f3e]">
                              <GraduationCap className="w-10 h-10 text-white/40" />
                            </div>
                          )}
                          {/* Paid / Free badge on top right (or top left in RTL) */}
                          <div className="absolute top-2.5 right-2.5 z-10">
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[11px] font-black shadow-xs ${
                                isPaid
                                  ? "bg-[#c59336] text-white"
                                  : "bg-[#1b7348] text-white"
                              }`}
                              style={{ fontFamily: "Cairo, sans-serif" }}
                            >
                              {isPaid ? "مدفوع" : "مجاني"}
                            </span>
                          </div>
                        </div>

                        {/* Course Information */}
                        <div className="p-3.5 flex-1 flex flex-col justify-between">
                          <h4
                            className="font-bold text-neutral-900 text-xs sm:text-sm line-clamp-2 leading-snug mb-3 group-hover:text-[#0c3b2e] transition-colors"
                            style={{ fontFamily: "Cairo, sans-serif" }}
                          >
                            {course.title}
                          </h4>

                          {/* Bottom Row: Rating (real, or "new") on left, Level on right */}
                          <div className="flex items-center justify-between text-xs text-neutral-600 pt-2 border-t border-neutral-100">
                            <div className="flex items-center gap-1 font-bold text-neutral-800">
                              {course.avgRating != null ? (
                                <>
                                  <span className="text-[#d4af37] font-black">★</span>
                                  <span>{course.avgRating.toFixed(1)}</span>
                                  <span className="text-neutral-400 font-medium">({course.reviewCount})</span>
                                </>
                              ) : (
                                <span className="text-[#1a7f4f] font-bold" style={{ fontFamily: "Cairo, sans-serif" }}>جديد</span>
                              )}
                            </div>

                            <span className="font-medium text-neutral-500 text-[11px]" style={{ fontFamily: "Cairo, sans-serif" }}>
                              {levelLabels[course.level] ?? course.level}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </main>

          {/* Right Sidebar (in RTL): Dark Green Navigation Container + Support Card */}
          <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-4 order-1 lg:order-2">
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
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-right cursor-pointer ${
                      active
                        ? "bg-[#144f3e] text-white shadow-2xs border border-emerald-500/20"
                        : "text-white/80 hover:bg-[#144f3e]/60 hover:text-white"
                    }`}
                    style={{ fontFamily: "Cairo, sans-serif" }}
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
              <h4 className="font-bold text-sm mb-0.5 text-white" style={{ fontFamily: "Cairo, sans-serif" }}>
                هل تحتاج إلى مساعدة؟
              </h4>
              <p className="text-white/70 text-xs mb-3 font-medium" style={{ fontFamily: "Cairo, sans-serif" }}>
                فريق الدعم في خدمتكم
              </p>
              <button
                onClick={() => setLocation("/student/support")}
                className="w-full py-2 px-3 rounded-xl bg-[#c59336] hover:bg-[#b5832a] active:bg-[#a07221] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                style={{ fontFamily: "Cairo, sans-serif" }}
              >
                <span>تواصل معنا</span>
                <span>←</span>
              </button>
            </div>
          </aside>
        </div>
      </div>
    </StudentLayout>
  );
}
