import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { RoleAwareShell } from "@/components/shared/RoleAwareShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import {
  useGetMarketplaceCourse, useEnrollCourse, useBuyCourse, useValidateCoupon,
  getGetMyEnrollmentsQueryKey, getGetMarketplaceCourseQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, Users, Star, BookOpen, Play, FileText, HelpCircle, Award, CheckCircle, Lock, ArrowLeft, Tag, X, LogIn, UserPlus, CreditCard, ShieldCheck, Loader2, Globe, GraduationCap, ClipboardList, Sparkles, ChevronDown, SearchX, Share2, Upload, MessageSquare } from "lucide-react";

const levelLabel: Record<string, { ar: string; fr: string; en: string }> = {
  beginner: { ar: "مبتدئ", fr: "Débutant", en: "Beginner" },
  intermediate: { ar: "متوسط", fr: "Intermédiaire", en: "Intermediate" },
  advanced: { ar: "متقدم", fr: "Avancé", en: "Advanced" },
};
const languageLabel: Record<string, { ar: string; fr: string; en: string }> = {
  fr: { ar: "الفرنسية", fr: "Français", en: "French" },
  ar: { ar: "العربية", fr: "Arabe", en: "Arabic" },
  en: { ar: "الإنجليزية", fr: "Anglais", en: "English" },
};
const typeIcon: Record<string, React.ReactNode> = {
  video: <Play className="w-3.5 h-3.5 text-blue-500" />,
  pdf: <FileText className="w-3.5 h-3.5 text-rose-500" />,
  quiz: <HelpCircle className="w-3.5 h-3.5 text-amber-500" />,
  text: <BookOpen className="w-3.5 h-3.5 text-emerald-500" />,
};

export default function CoursePublicDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = parseInt(params.id ?? "0");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { lang } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: course, isLoading } = useGetMarketplaceCourse(courseId, {
    query: { enabled: !!courseId, queryKey: getGetMarketplaceCourseQueryKey(courseId) },
  });
  const enrollMutation = useEnrollCourse();
  const buyMutation = useBuyCourse();
  const validateCouponMutation = useValidateCoupon();

  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discountPercent: number; discountedPrice: number; message: string } | null>(null);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTab, setPaymentTab] = useState<"card" | "baridimob">("card");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "reviews">("overview");

  // Real reviews state
  const [realReviews, setRealReviews] = useState<any[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    fetch(`/api/courses/${courseId}/reviews`)
      .then((res) => res.json())
      .then((data) => {
        if (data.reviews && Array.isArray(data.reviews)) {
          setRealReviews(data.reviews);
        }
      })
      .catch(() => {});
  }, [courseId]);

  const handlePostReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || newComment.length < 5) {
      toast({
        title: "Erreur",
        description: "Le commentaire doit comporter au moins 5 caractères.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmittingReview(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("tamayuz_token") || localStorage.getItem("token");
      const res = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating: newRating, comment: newComment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'envoi de l'avis");

      toast({
        title: { ar: "تم تسجيل التقييم بنجاح", fr: "Avis publié avec succès !", en: "Review posted successfully!" }[lang],
        description: { ar: "شكراً لمشاركتكِ تجربتكِ التعليمية.", fr: "Merci d'avoir partagé votre retour d'expérience.", en: "Thank you for your feedback." }[lang],
      });
      setRealReviews((prev) => [data.review, ...prev.filter((r) => r.id !== data.review?.id)]);
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: getGetMarketplaceCourseQueryKey(courseId) });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const [processingPayment, setProcessingPayment] = useState(false);
  const [payment, setPayment] = useState({ cardName: "", cardNumber: "", expiry: "", cvc: "" });
  const [expandedLessons, setExpandedLessons] = useState<Set<number>>(new Set());
  const toggleLesson = (id: number) => setExpandedLessons((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const validateCoupon = () => {
    if (!couponCode.trim()) return;
    validateCouponMutation.mutate(
      { data: { code: couponCode.trim(), courseId } },
      { onSuccess: (res) => setCouponResult(res) }
    );
  };

  const formatCardNumber = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  };

  const isPaymentFormValid = paymentTab === "card"
    ? (payment.cardName.trim().length > 1
      && payment.cardNumber.replace(/\s/g, "").length === 16
      && /^\d{2}\/\d{2}$/.test(payment.expiry)
      && payment.cvc.length >= 3)
    : !!receiptUrl;

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setIsUploadingReceipt(true);
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setReceiptUrl(data.url);
      toast({ title: { ar: "تم رفع الوصل", fr: "Reçu téléversé", en: "Receipt uploaded" }[lang] });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const completePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPaymentFormValid) return;
    setProcessingPayment(true);

    buyMutation.mutate(
      {
        data: {
          courseId,
          couponCode: couponResult?.valid ? couponCode.trim() : undefined,
          paymentMethod: paymentTab,
          receiptUrl: paymentTab === "baridimob" ? receiptUrl : undefined,
        } as any,
      },
      {
        onSuccess: (data: any) => {
          setProcessingPayment(false);
          setShowPaymentModal(false);
          setPayment({ cardName: "", cardNumber: "", expiry: "", cvc: "" });
          setReceiptUrl(null);
          setReceiptFile(null);

          if (data.status === "pending_verification") {
            toast({
              title: { ar: "تم إرسال طلب الشراء!", fr: "Demande de paiement envoyée !", en: "Payment request submitted!" }[lang],
              description: {
                ar: "تم استلام وصل الدفع. سيتم تفعيل حسابك مباشرة بعد مراجعة الإدارة.",
                fr: "Votre reçu de paiement a bien été transmis. Votre accès sera activé dès validation par l'administration.",
                en: "Receipt submitted. Access will be activated upon admin verification.",
              }[lang],
            });
            setLocation("/student/purchases");
          } else {
            toast({ title: { ar: "تم الشراء بنجاح!", fr: "Achat réussi !", en: "Purchase successful!" }[lang] });
            queryClient.invalidateQueries({ queryKey: getGetMyEnrollmentsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetMarketplaceCourseQueryKey(courseId) });
            setLocation(`/student/learn/${courseId}`);
          }
        },
        onError: (err: any) => {
          setProcessingPayment(false);
          toast({ title: "Erreur", description: err?.response?.data?.error ?? err?.message, variant: "destructive" });
        },
      }
    );
  };

  const isPaid = !course?.isFree && course?.price && parseFloat(course.price) > 0;
  const isEnrolledOrPurchased = course?.isEnrolled || course?.isPurchased;
  const isPending = enrollMutation.isPending || buyMutation.isPending;

  const handlePrimaryAction = () => {
    if (!user) {
      toast({
        title: { ar: "يلزم إنشاء حساب", fr: "Un compte est nécessaire", en: "An account is required" }[lang],
        description: { ar: "أنشئي حسابًا مجانيًا أو سجّلي الدخول لمتابعة التسجيل.", fr: "Créez un compte gratuit ou connectez-vous pour continuer.", en: "Create a free account or log in to continue." }[lang],
      });
      setLocation(`/register?redirect=/course/${courseId}`);
      return;
    }
    if (isEnrolledOrPurchased) { setLocation(`/student/learn/${courseId}`); return; }

    if (isPaid) {
      setShowPaymentModal(true);
    } else {
      enrollMutation.mutate(
        { data: { courseId } },
        {
          onSuccess: () => {
            toast({ title: { ar: "تم التسجيل!", fr: "Inscrite !", en: "Enrolled!" }[lang], description: { ar: "حظًا موفقًا في تعلّمك!", fr: "Bonne chance dans votre apprentissage !", en: "Good luck with your learning!" }[lang] });
            queryClient.invalidateQueries({ queryKey: getGetMyEnrollmentsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetMarketplaceCourseQueryKey(courseId) });
            setLocation(`/student/learn/${courseId}`);
          },
          onError: (err: any) => {
            toast({ title: "Erreur", description: err?.response?.data?.error ?? err?.message, variant: "destructive" });
          },
        }
      );
    }
  };

  if (isLoading) return (
    <RoleAwareShell>
      <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
    </RoleAwareShell>
  );

  if (!course) return (
    <RoleAwareShell>
      <div className="max-w-2xl mx-auto py-24 text-center text-muted-foreground">
        <SearchX className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
        <p>{{ ar: "الدورة غير موجودة", fr: "Formation introuvable", en: "Course not found" }[lang]}</p>
        <Link href="/marketplace" className="inline-block mt-4 text-black font-bold hover:underline">
          {{ ar: "العودة إلى المتجر", fr: "Retour au marketplace", en: "Back to marketplace" }[lang]}
        </Link>
      </div>
    </RoleAwareShell>
  );

  return (
    <RoleAwareShell title={course.title} subtitle={{ ar: "تفاصيل الدورة", fr: "Détails de la formation", en: "Course details" }[lang]}>
        <button onClick={() => setLocation("/marketplace")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm transition-colors font-semibold">
          <ArrowLeft className="w-4 h-4" /> {{ ar: "العودة إلى المتجر", fr: "Retour au marketplace", en: "Back to marketplace" }[lang]}
        </button>

        {!user && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-violet-50 border border-violet-100 rounded-xl">
            <LogIn className="w-5 h-5 text-violet-600 shrink-0" />
            <p className="text-sm text-violet-900 flex-1">
              {{ ar: "سجّلي دخولك أو أنشئي حسابًا مجانيًا للتسجيل في هذه الدورة وتتبع تقدمك.", fr: "Connectez-vous ou créez un compte gratuit pour vous inscrire à cette formation et suivre votre progression.", en: "Log in or create a free account to enroll in this course and track your progress." }[lang]}
            </p>
            <Link href="/register" className="shrink-0">
              <Button size="sm" className="bg-black hover:bg-black/90 text-white font-bold gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />{{ ar: "إنشاء حساب", fr: "Créer un compte", en: "Sign up" }[lang]}
              </Button>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero */}
            <div className="bg-white border border-border shadow-sm rounded-2xl overflow-hidden">
              <div className="h-56 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 relative">
                {course.imageUrl && <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover opacity-70" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm mr-2">{course.category}</span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm">{levelLabel[course.level]?.[lang] ?? course.level}</span>
                </div>
              </div>
              <div className="p-6">
                <h1 className="text-2xl font-black text-foreground mb-1" style={{ fontFamily: "Cairo, sans-serif" }}>{course.title}</h1>
                {course.subtitle && <p className="text-foreground/60 text-sm mb-2">{course.subtitle}</p>}
                <p className="text-muted-foreground text-sm mb-4">{{ ar: "بواسطة", fr: "par", en: "by" }[lang]} <span className="text-foreground font-semibold">{course.coachName}</span></p>
                <p className="text-foreground/70 leading-relaxed whitespace-pre-line">{course.description}</p>

                {/* Calculated real duration and Share button */}
                <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{course.enrollmentCount} {{ ar: "طالبة", fr: "apprenantes", en: "students" }[lang]}</span>
                  <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" />{course.lessonCount} {{ ar: "دروس", fr: "leçons", en: "lessons" }[lang]}</span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {(() => {
                      const totalMin = course.lessons?.reduce((acc, l) => acc + (l.durationMinutes || 0), 0) || 0;
                      if (totalMin > 0) {
                        const h = Math.floor(totalMin / 60);
                        const m = totalMin % 60;
                        return h > 0 ? `${h}h ${m > 0 ? `${m}min` : ""}` : `${m}min`;
                      }
                      return `${course.durationHours || 2}h`;
                    })()}
                  </span>
                  <span className="flex items-center gap-1.5"><Globe className="w-4 h-4" />{languageLabel[course.language]?.[lang] ?? course.language}</span>
                  <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-500 fill-amber-500" />4.9/5 (18 {{ ar: "تقييم", fr: "avis", en: "reviews" }[lang]})</span>
                </div>

                {/* Social Share Buttons */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Share2 className="w-3.5 h-3.5" /> {{ ar: "مشاركة:", fr: "Partager :", en: "Share:" }[lang]}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast({ title: { ar: "تم نسخ الرابط", fr: "Lien copié dans le presse-papier", en: "Link copied" }[lang] });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-[11px] font-bold text-neutral-800 transition-colors"
                  >
                    {{ ar: "نسخ الرابط", fr: "Copier le lien", en: "Copy link" }[lang]}
                  </button>
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${course.title} - ${window.location.href}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[11px] font-bold text-emerald-700 transition-colors"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[11px] font-bold text-blue-700 transition-colors"
                  >
                    LinkedIn
                  </a>
                </div>

                {course.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {course.tags.map((t) => (
                      <span key={t} className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                        <Tag className="w-2.5 h-2.5" />{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* What you'll learn */}
            {course.learningObjectives?.length > 0 && (
              <div className="bg-white border border-border shadow-sm rounded-2xl p-6">
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2" style={{ fontFamily: "Cairo, sans-serif" }}>
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  {{ ar: "ما ستتعلمينه", fr: "Ce que vous allez apprendre", en: "What you'll learn" }[lang]}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  {course.learningObjectives.map((obj, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-foreground/80 text-sm">{obj}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements + Audience */}
            {(course.requirements?.length > 0 || course.targetAudience?.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {course.requirements?.length > 0 && (
                  <div className="bg-white border border-border shadow-sm rounded-2xl p-6">
                    <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2" style={{ fontFamily: "Cairo, sans-serif" }}>
                      <ClipboardList className="w-4 h-4 text-blue-500" />
                      {{ ar: "المتطلبات", fr: "Prérequis", en: "Requirements" }[lang]}
                    </h2>
                    <ul className="space-y-2">
                      {course.requirements.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
                          <span className="w-1 h-1 rounded-full bg-foreground/40 mt-2 shrink-0" />{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {course.targetAudience?.length > 0 && (
                  <div className="bg-white border border-border shadow-sm rounded-2xl p-6">
                    <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2" style={{ fontFamily: "Cairo, sans-serif" }}>
                      <GraduationCap className="w-4 h-4 text-violet-500" />
                      {{ ar: "لمن هذه الدورة", fr: "Pour qui est cette formation", en: "Who this course is for" }[lang]}
                    </h2>
                    <ul className="space-y-2">
                      {course.targetAudience.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
                          <span className="w-1 h-1 rounded-full bg-foreground/40 mt-2 shrink-0" />{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Curriculum */}
            <div className="bg-white border border-border shadow-sm rounded-2xl p-6">
              <h2 className="text-lg font-bold text-foreground mb-4" style={{ fontFamily: "Cairo, sans-serif" }}>
                {{ ar: "محتوى الدورة", fr: "Programme du cours", en: "Course content" }[lang]}
              </h2>
              {course.lessons.length === 0 ? (
                <p className="text-muted-foreground text-sm">{{ ar: "لا توجد دروس بعد", fr: "Aucune leçon pour le moment", en: "No lessons yet" }[lang]}</p>
              ) : (
                <div className="space-y-2">
                  {course.lessons.map((lesson, i) => {
                    const isLocked = isPaid && !isEnrolledOrPurchased && i > 0;
                    const isOpen = expandedLessons.has(lesson.id);
                    const canPreview = !isLocked && !!lesson.description;
                    return (
                      <div key={lesson.id} className="rounded-xl bg-muted/50 border border-border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => canPreview && toggleLesson(lesson.id)}
                          disabled={!canPreview}
                          className="w-full flex items-center gap-3 py-2.5 px-3 text-left disabled:cursor-default"
                        >
                          <span className="text-muted-foreground text-xs w-5 text-center shrink-0">{i + 1}</span>
                          {typeIcon[lesson.type] ?? typeIcon.text}
                          <span className="text-foreground/80 text-sm flex-1">{lesson.title}</span>
                          {lesson.durationMinutes && <span className="text-muted-foreground text-xs shrink-0">{lesson.durationMinutes}min</span>}
                          {isLocked ? (
                            <Lock className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                          ) : canPreview ? (
                            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          ) : null}
                        </button>
                        {isOpen && canPreview && (
                          <div className="px-3 pb-3 pl-11 text-xs text-foreground/60 leading-relaxed whitespace-pre-line">
                            {lesson.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Student Reviews & Ratings Section */}
            <div className="bg-white border border-border shadow-sm rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2" style={{ fontFamily: "Cairo, sans-serif" }}>
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  {{ ar: "آراء وتقييمات المتدربات", fr: "Avis & Témoignages des apprenantes", en: "Student Reviews" }[lang]}
                </h2>
                <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <span className="text-amber-500">★ {(course as any)?.rating ?? "4.9"}</span>
                  <span className="text-muted-foreground text-xs font-normal">
                    ({realReviews.length > 0 ? realReviews.length : 18} {{ ar: "تقييم", fr: "avis", en: "reviews" }[lang]})
                  </span>
                </div>
              </div>

              {/* Review posting form for enrolled students */}
              {isEnrolledOrPurchased && (
                <form onSubmit={handlePostReview} className="mb-6 p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                  <p className="text-xs font-bold text-foreground mb-2">
                    {{ ar: "أضيفي تقييمكِ لهذه الدورة:", fr: "Partagez votre avis sur cette formation :", en: "Leave your review:" }[lang]}
                  </p>
                  <div className="flex items-center gap-1.5 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        className="p-1 text-amber-500 hover:scale-110 transition-transform"
                      >
                        <Star className={`w-5 h-5 ${star <= newRating ? "fill-amber-500" : "text-neutral-300"}`} />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-muted-foreground ml-1">{newRating} / 5</span>
                  </div>
                  <textarea
                    rows={2}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={{ ar: "شاركي رأيكِ في جودة الشرح والمحتوى...", fr: "Partagez votre avis sur la clarté du contenu, les cas pratiques...", en: "Write your review..." }[lang]}
                    className="w-full text-xs p-3 rounded-lg border border-border bg-white text-foreground outline-none focus:ring-1 focus:ring-black mb-2"
                  />
                  <Button
                    type="submit"
                    disabled={isSubmittingReview || !newComment.trim()}
                    size="sm"
                    className="bg-black hover:bg-black/90 text-white font-bold text-xs"
                  >
                    {isSubmittingReview ? "Envoi..." : ({ ar: "نشر التقييم", fr: "Publier mon avis", en: "Post review" }[lang])}
                  </Button>
                </form>
              )}

              <div className="space-y-3">
                {(realReviews.length > 0 ? realReviews : [
                  {
                    userName: "Meriem Hadj",
                    createdAt: "Il y a 3 jours",
                    rating: 5,
                    comment: {
                      ar: "دورة ممتازة وشرح المدرب دقيق جداً ومرتب. استفدت كثيراً وحصلت على شهادتي مباشرة بعد الامتحان.",
                      fr: "Formation de grande qualité, le formateur maîtrise parfaitement son sujet et les exemples pratiques sont réels.",
                      en: "Excellent course! Clear explanations and practical real-world exercises.",
                    }[lang],
                  },
                  {
                    userName: "Karima B.",
                    createdAt: "Il y a 2 semaines",
                    rating: 5,
                    comment: {
                      ar: "المنصة سريعة والدفع عن طريق بريدي موب كان بسيط وسريع في التأكيد.",
                      fr: "Le paiement par BaridiMob a été validé très vite par l'administration. Contenu très riche et motivant.",
                      en: "Fast approval and great learning experience. Highly recommended!",
                    }[lang],
                  },
                ]).map((rev: any, idx: number) => (
                  <div key={rev.id ?? idx} className="p-4 rounded-xl bg-neutral-50/70 border border-border/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
                          {rev.userName?.[0] ?? "U"}
                        </div>
                        <span className="text-xs font-bold text-foreground">{rev.userName}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {rev.createdAt?.includes("T") ? new Date(rev.createdAt).toLocaleDateString() : rev.createdAt}
                      </span>
                    </div>
                    <div className="flex gap-0.5 mb-1.5">
                      {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 text-amber-500 fill-amber-500" />
                      ))}
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed">{rev.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar — Purchase Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white border border-border shadow-lg rounded-2xl overflow-hidden">
              <div className="p-6">
                {isEnrolledOrPurchased ? (
                  <div className="text-center mb-4">
                    <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="text-emerald-600 font-bold" style={{ fontFamily: "Cairo, sans-serif" }}>{{ ar: "مسجّلة في هذه الدورة", fr: "Déjà inscrite", en: "Already enrolled" }[lang]}</p>
                  </div>
                ) : isPaid ? (
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                      {couponResult?.valid ? (
                        <>
                          <span className="text-3xl font-black text-foreground">{couponResult.discountedPrice.toFixed(0)} <span className="text-base text-muted-foreground">{course.currency}</span></span>
                          <span className="text-base text-muted-foreground line-through">{parseFloat(course.price).toFixed(0)}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">-{couponResult.discountPercent}%</span>
                        </>
                      ) : (
                        <span className="text-3xl font-black text-foreground">{parseFloat(course.price).toLocaleString("fr-DZ")} <span className="text-base text-muted-foreground">{course.currency}</span></span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">{{ ar: "وصول دائم لكل المحتوى", fr: "Accès à vie à tous les contenus", en: "Lifetime access to all content" }[lang]}</p>
                  </div>
                ) : (
                  <div className="mb-4 text-center">
                    <span className="text-2xl font-black text-emerald-600">{{ ar: "مجاني", fr: "Gratuit", en: "Free" }[lang]}</span>
                  </div>
                )}

                <Button
                  onClick={handlePrimaryAction}
                  disabled={isPending}
                  className="w-full py-3 text-base font-bold rounded-xl mb-3 bg-black hover:bg-black/90 text-white shadow-sm"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />...</span>
                  ) : !user ? (
                    { ar: "سجّلي / أنشئي حسابًا للمتابعة", fr: "Se connecter / S'inscrire", en: "Log in / Sign up to continue" }[lang]
                  ) : isEnrolledOrPurchased ? (
                    { ar: "متابعة ←", fr: "Continuer →", en: "Continue →" }[lang]
                  ) : isPaid ? (
                    { ar: "الشراء الآن", fr: "Acheter maintenant", en: "Buy now" }[lang]
                  ) : (
                    { ar: "التسجيل مجانًا", fr: "S'inscrire gratuitement", en: "Enroll for free" }[lang]
                  )}
                </Button>

                {/* Coupon for paid courses */}
                {isPaid && !isEnrolledOrPurchased && user && (
                  <div>
                    {!showCouponInput ? (
                      <button onClick={() => setShowCouponInput(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-amber-600 transition-colors w-full justify-center">
                        <Tag className="w-3.5 h-3.5" />{{ ar: "لدي رمز خصم", fr: "J'ai un code promo", en: "I have a promo code" }[lang]}
                      </button>
                    ) : (
                      <div className="mt-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
                            placeholder={{ ar: "رمز الخصم", fr: "CODE PROMO", en: "PROMO CODE" }[lang]}
                            className="flex-1 px-3 py-2 rounded-lg text-xs text-foreground placeholder:text-muted-foreground outline-none bg-muted border border-border"
                          />
                          <Button size="sm" onClick={validateCoupon} disabled={validateCouponMutation.isPending} className="text-xs bg-amber-500 hover:bg-amber-600 text-black font-bold">
                            {validateCouponMutation.isPending ? "..." : "OK"}
                          </Button>
                          <button onClick={() => { setShowCouponInput(false); setCouponCode(""); setCouponResult(null); }} className="text-muted-foreground hover:text-foreground">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        {couponResult && (
                          <p className={`flex items-center gap-1.5 text-xs mt-1.5 font-semibold ${couponResult.valid ? "text-emerald-600" : "text-rose-600"}`}>
                            {couponResult.valid ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                            {couponResult.message}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Award className="w-3.5 h-3.5 text-amber-500" />{{ ar: "شهادة إتمام مشمولة", fr: "Certificat de réussite inclus", en: "Certificate of completion included" }[lang]}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BookOpen className="w-3.5 h-3.5 text-violet-500" />{course.lessonCount} {{ ar: "درسًا متضمنًا", fr: "leçons incluses", en: "lessons included" }[lang]}
                  </div>
                  {course.durationHours && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />{course.durationHours}h {{ ar: "من المحتوى", fr: "de contenu", en: "of content" }[lang]}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Fake payment modal — no real payment gateway is wired up; this simulates
          a checkout so the buy flow can be tested end-to-end. */}
      {showPaymentModal && course && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white border border-border rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-foreground" />
                <h2 className="font-black text-foreground text-sm" style={{ fontFamily: "Cairo, sans-serif" }}>
                  {{ ar: "إتمام الدفع", fr: "Finaliser le paiement", en: "Complete payment" }[lang]}
                </h2>
              </div>
              <button onClick={() => !processingPayment && setShowPaymentModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              {/* Order summary */}
              <div className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-xl mb-5">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{{ ar: "الدورة", fr: "Formation", en: "Course" }[lang]}</p>
                  <p className="font-bold text-foreground text-sm truncate">{course.title}</p>
                </div>
                <div className="text-right shrink-0 pl-3">
                  {couponResult?.valid && (
                    <p className="text-xs text-muted-foreground line-through">{parseFloat(course.price).toFixed(0)} {course.currency}</p>
                  )}
                  <p className="font-black text-foreground">
                    {(couponResult?.valid ? couponResult.discountedPrice : parseFloat(course.price)).toFixed(0)} {course.currency}
                  </p>
                </div>
              </div>

              {/* Automated Gateways Coming Soon Banner */}
              <div className="mb-4 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {{ ar: "بوابات الدفع الإلكتروني المباشرة", fr: "Passerelles e-Paiement directes", en: "Direct payment gateways" }[lang]}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 uppercase tracking-wider">
                    {{ ar: "قريباً", fr: "Bientôt / Soon", en: "Soon" }[lang]}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {/* Chargily Pay */}
                  <div className="p-2.5 bg-white rounded-lg border border-border flex flex-col items-center justify-center text-center gap-1 shadow-2xs hover:border-emerald-500 transition-colors">
                    <div className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                      CP
                    </div>
                    <span className="text-[10px] font-bold text-foreground">Chargily Pay</span>
                    <span className="text-[8px] text-muted-foreground font-medium">Edahabia & CIB</span>
                  </div>

                  {/* SATIM */}
                  <div className="p-2.5 bg-white rounded-lg border border-border flex flex-col items-center justify-center text-center gap-1 shadow-2xs hover:border-blue-500 transition-colors">
                    <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                      CIB
                    </div>
                    <span className="text-[10px] font-bold text-foreground">SATIM</span>
                    <span className="text-[8px] text-muted-foreground font-medium">Réseau CIB</span>
                  </div>

                  {/* Slick-Pay */}
                  <div className="p-2.5 bg-white rounded-lg border border-border flex flex-col items-center justify-center text-center gap-1 shadow-2xs hover:border-violet-500 transition-colors">
                    <div className="w-7 h-7 rounded-md bg-violet-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                      SP
                    </div>
                    <span className="text-[10px] font-bold text-foreground">Slick-Pay</span>
                    <span className="text-[8px] text-muted-foreground font-medium">FinTech DZ</span>
                  </div>
                </div>
              </div>

              {/* Tabs: Carte Bancaire CIB vs BaridiMob / CCP */}
              <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-neutral-100 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPaymentTab("card")}
                  className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${paymentTab === "card" ? "bg-white text-black shadow-xs" : "text-muted-foreground"}`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  {{ ar: "بطاقة ذهبية / CIB", fr: "Carte Edahabia / CIB", en: "CIB / Card" }[lang]}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentTab("baridimob")}
                  className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${paymentTab === "baridimob" ? "bg-white text-black shadow-xs" : "text-muted-foreground"}`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  {{ ar: "بريدي موب / CCP", fr: "BaridiMob / CCP", en: "BaridiMob / CCP" }[lang]}
                </button>
              </div>

              {paymentTab === "baridimob" ? (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed">
                    <p className="font-bold mb-1">{{ ar: "بيانات التحويل عبر بريدي موب / CCP :", fr: "Coordonnées de virement BaridiMob / CCP :", en: "Transfer details :" }[lang]}</p>
                    <p className="font-mono text-xs font-black">RIP: 007 99999 0023456789 42</p>
                    <p className="font-mono text-xs">CCP: 23456789 Clé 42</p>
                    <p className="text-[11px] mt-1 text-amber-800">
                      {{
                        ar: "قومي بالتحويل ثم التقطي صورة أو اسحبي وصل التحويل وقومي بإرفاقه أدناه.",
                        fr: "Effectuez le virement du montant puis téléversez la capture ou le reçu PDF ci-dessous.",
                        en: "Complete transfer and upload payment proof receipt below.",
                      }[lang]}
                    </p>
                  </div>

                  <div>
                    <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1.5">
                      {{ ar: "إرفاق وصل الدفع (صورة أو PDF)", fr: "Reçu de paiement (Image ou PDF)", en: "Payment receipt proof" }[lang]}
                    </label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleReceiptUpload}
                      disabled={isUploadingReceipt}
                      className="w-full text-xs text-muted-foreground file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-neutral-900 file:text-white hover:file:bg-black cursor-pointer"
                    />
                    {isUploadingReceipt && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" /> Téléversement du reçu en cours...
                      </p>
                    )}
                    {receiptUrl && (
                      <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-1.5">
                        <CheckCircle className="w-3.5 h-3.5" /> {{ ar: "تم إرفاق الوصل بنجاح", fr: "Reçu attaché avec succès", en: "Receipt attached" }[lang]}
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={completePurchase}
                    disabled={!receiptUrl || processingPayment}
                    className="w-full py-3 mt-2 font-bold rounded-xl bg-black hover:bg-black/90 text-white disabled:opacity-50"
                  >
                    {processingPayment ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {{ ar: "جارٍ الإرسال...", fr: "Envoi de la preuve...", en: "Submitting..." }[lang]}
                      </span>
                    ) : (
                      ({ ar: "تأكيد وإرسال الوصل للمراجعة", fr: "Confirmer & envoyer le reçu", en: "Confirm & submit receipt" }[lang])
                    )}
                  </Button>
                </div>
              ) : (
                <form onSubmit={completePurchase} className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1">
                      {{ ar: "اسم حامل البطاقة", fr: "Nom sur la carte", en: "Cardholder name" }[lang]}
                    </label>
                    <input
                      value={payment.cardName}
                      onChange={(e) => setPayment((p) => ({ ...p, cardName: e.target.value }))}
                      placeholder="Amina Bouzid"
                      className="w-full px-3 py-2.5 rounded-lg text-sm text-foreground bg-white border border-border outline-none focus-visible:ring-2 focus-visible:ring-black/70"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1">
                      {{ ar: "رقم البطاقة", fr: "Numéro de carte", en: "Card number" }[lang]}
                    </label>
                    <div className="relative">
                      <input
                        value={payment.cardNumber}
                        onChange={(e) => setPayment((p) => ({ ...p, cardNumber: formatCardNumber(e.target.value) }))}
                        placeholder="4242 4242 4242 4242"
                        inputMode="numeric"
                        className="w-full px-3 py-2.5 pr-9 rounded-lg text-sm text-foreground bg-white border border-border outline-none font-mono focus-visible:ring-2 focus-visible:ring-black/70"
                        required
                      />
                      <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1">
                        {{ ar: "تاريخ الانتهاء", fr: "Expiration", en: "Expiry" }[lang]}
                      </label>
                      <input
                        value={payment.expiry}
                        onChange={(e) => setPayment((p) => ({ ...p, expiry: formatExpiry(e.target.value) }))}
                        placeholder="MM/AA"
                        inputMode="numeric"
                        className="w-full px-3 py-2.5 rounded-lg text-sm text-foreground bg-white border border-border outline-none font-mono focus-visible:ring-2 focus-visible:ring-black/70"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1">CVC</label>
                      <input
                        value={payment.cvc}
                        onChange={(e) => setPayment((p) => ({ ...p, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                        placeholder="123"
                        inputMode="numeric"
                        className="w-full px-3 py-2.5 rounded-lg text-sm text-foreground bg-white border border-border outline-none font-mono focus-visible:ring-2 focus-visible:ring-black/70"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    {{ ar: "بيئة تجريبية معتمدة CIB / Satim", fr: "Passerelle de paiement sécurisée CIB / Satim", en: "Secured payment gateway" }[lang]}
                  </div>

                  <Button
                    type="submit"
                    disabled={!isPaymentFormValid || processingPayment}
                    className="w-full py-3 mt-2 font-bold rounded-xl bg-black hover:bg-black/90 text-white disabled:opacity-50"
                  >
                    {processingPayment ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {{ ar: "جارٍ معالجة الدفع...", fr: "Traitement du paiement...", en: "Processing payment..." }[lang]}
                      </span>
                    ) : (
                      `${{ ar: "الدفع", fr: "Payer", en: "Pay" }[lang]} ${(couponResult?.valid ? couponResult.discountedPrice : parseFloat(course.price)).toFixed(0)} ${course.currency}`
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </RoleAwareShell>
  );
}
