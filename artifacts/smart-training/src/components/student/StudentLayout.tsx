import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n";
import {
  Home, Compass, GraduationCap, Award, Wallet,
  UserCircle, ChevronDown, ChevronRight, LogOut, Menu, X, LifeBuoy, HelpCircle,
  Search, Bell, User, BookOpen, Layers, Users, Headphones
} from "lucide-react";
import { TamayuzDigitalLogo } from "@/components/shared/TamayuzDigitalLogo";
import { NotificationBell } from "@/components/shared/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

interface StudentLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  hideSidebar?: boolean;
}

export function StudentLayout({ children, title, subtitle, hideSidebar = false }: StudentLayoutProps) {
  const { user, logout } = useAuth();
  const { lang, setLang, isRTL } = useI18n();
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/student/courses?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinks = [
    { key: "home", label: { ar: "الرئيسية", fr: "Accueil", en: "Home" }[lang], href: "/student/home" },
    { key: "sections", label: { ar: "الأقسام", fr: "Sections", en: "Categories" }[lang], href: "/student/courses" },
    { key: "coaches", label: { ar: "المدربون والخبراء", fr: "Formateurs & Experts", en: "Coaches & Experts" }[lang], href: "/student/courses" },
    { key: "ebooks", label: { ar: "الكتب الرقمية", fr: "Livres Numériques", en: "E-Books" }[lang], href: "/student/courses" },
    { key: "library", label: { ar: "المكتبة", fr: "Bibliothèque", en: "Library" }[lang], href: "/student/courses" },
    { key: "about", label: { ar: "عن المنصة", fr: "À propos", en: "About Us" }[lang], href: "/help" },
    { key: "support", label: { ar: "الدعم والمساعدة", fr: "Support & Aide", en: "Support" }[lang], href: "/student/support" },
  ];

  const isLinkActive = (href: string) => {
    if (href === "/student/home") return location === "/student/home";
    return location === href || location.startsWith(href + "?");
  };

  return (
    <div className="min-h-screen bg-[#f8faf8] text-foreground flex flex-col font-sans" dir={isRTL ? "rtl" : "ltr"}>
      {/* Top Navigation Bar: Matching the exact Digital Tamayuz brand */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-3 sm:gap-6">
          {/* Right side: Logo & Brand + Desktop Nav links */}
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/student/home">
              <div className="cursor-pointer shrink-0">
                <TamayuzDigitalLogo />
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex items-center gap-1 shrink-0">
              {navLinks.map((link) => {
                const active = isLinkActive(link.href);
                return (
                  <Link key={link.key} href={link.href}>
                    <span
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        active
                          ? "text-[#0c3b2e] bg-[#0c3b2e]/5 border-b-2 border-[#0c3b2e] rounded-b-none"
                          : "text-neutral-600 hover:text-[#0c3b2e] hover:bg-neutral-50"
                      }`}
                      style={{ fontFamily: "Cairo, sans-serif" }}
                    >
                      {link.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Center/Left Search Bar */}
          <div className="flex-1 max-w-xs sm:max-w-sm hidden md:block">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={{ ar: "ابحث عن دورة، كتاب، أو خبير...", fr: "Rechercher une formation, livre...", en: "Search courses, books, experts..." }[lang]}
                className="pr-10 pl-4 h-9.5 rounded-full text-xs bg-neutral-100/80 border-neutral-200 text-foreground placeholder:text-neutral-400 focus:bg-white focus:border-[#0c3b2e] shadow-2xs"
                style={{ fontFamily: "Cairo, sans-serif" }}
              />
            </form>
          </div>

          {/* Left side: Notification bell, User avatar & Language switcher */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            {/* Language Switcher */}
            <div className="flex items-center gap-0.5 bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/60 text-[11px] font-bold">
              {(["ar", "fr", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2 py-0.5 rounded-md uppercase transition-all ${
                    lang === l
                      ? "bg-white text-[#0c3b2e] shadow-2xs font-extrabold"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Notification Bell */}
            <NotificationBell />

            {/* User Profile Avatar & Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-full hover:bg-neutral-100 transition-colors focus:outline-none">
                  <div className="w-9 h-9 rounded-full bg-[#0c3b2e] text-[#d4af37] border-2 border-[#d4af37]/40 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start" className="w-56 bg-white border border-border p-1.5 shadow-xl rounded-xl text-xs">
                <DropdownMenuLabel className="p-2 border-b border-border">
                  <div className="font-bold text-foreground text-sm truncate">{user?.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate">{user?.email}</div>
                  <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {{ ar: "فضاء الطالبة المعتمد", fr: "Espace Étudiante", en: "Student Space" }[lang]}
                  </span>
                </DropdownMenuLabel>

                <div className="py-1">
                  <DropdownMenuItem asChild>
                    <Link href="/student/profile" className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-neutral-50 font-medium">
                      <UserCircle className="w-4 h-4 text-neutral-600" />
                      {{ ar: "الملف الشخصي", fr: "Mon Profil", en: "My Profile" }[lang]}
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link href="/student/my-courses" className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-neutral-50 font-medium">
                      <GraduationCap className="w-4 h-4 text-neutral-600" />
                      {{ ar: "دوراتي التعليمية", fr: "Mes Formations", en: "My Courses" }[lang]}
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link href="/student/certificates" className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-neutral-50 font-medium">
                      <Award className="w-4 h-4 text-neutral-600" />
                      {{ ar: "شهاداتي المعتمدة", fr: "Mes Certificats", en: "My Certificates" }[lang]}
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link href="/student/purchases" className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-neutral-50 font-medium">
                      <Wallet className="w-4 h-4 text-neutral-600" />
                      {{ ar: "سجل المدفوعات والفواتير", fr: "Mes Achats & Reçus", en: "My Purchases" }[lang]}
                    </Link>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={logout} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer text-rose-600 hover:bg-rose-50 font-bold">
                  <LogOut className="w-4 h-4" />
                  {{ ar: "تسجيل الخروج", fr: "Se Déconnecter", en: "Sign Out" }[lang]}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-border bg-white px-4 py-3 space-y-2 shadow-lg animate-in slide-in-from-top-2">
            <form onSubmit={handleSearchSubmit} className="mb-3">
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={{ ar: "ابحث عن دورة، كتاب، أو خبير...", fr: "Rechercher...", en: "Search..." }[lang]}
                className="h-9 text-xs rounded-lg bg-neutral-50"
              />
            </form>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {navLinks.map((link) => (
                <Link key={link.key} href={link.href} onClick={() => setMobileMenuOpen(false)}>
                  <div className={`p-2.5 rounded-lg font-bold cursor-pointer ${
                    isLinkActive(link.href) ? "bg-[#0c3b2e] text-white" : "text-neutral-700 hover:bg-neutral-50"
                  }`}>
                    {link.label}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {children}
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-border bg-white mt-12 py-8 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TamayuzDigitalLogo className="w-7 h-7" showText={false} />
            <span className="font-bold text-[#0c3b2e]" style={{ fontFamily: "Cairo, sans-serif" }}>
              منصة التميز الرقمي © 2026 — جميع الحقوق محفوظة
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-semibold">
            <Link href="/help" className="hover:text-[#0c3b2e]">مركز المساعدة</Link>
            <span>·</span>
            <Link href="/student/support" className="hover:text-[#0c3b2e]">الدعم الفني</Link>
            <span>·</span>
            <Link href="/student/courses" className="hover:text-[#0c3b2e]">دليل التخصصات</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
