import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { StudentLayout } from "@/components/student/StudentLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import { CheckCircle, Circle, Play, FileText, HelpCircle, BookOpen, ChevronLeft, ChevronRight, Award, ArrowLeft, PartyPopper, Lock } from "lucide-react";

interface Lesson {
  id: number; courseId: number; title: string; description?: string | null;
  order: number; durationMinutes?: number | null; type: string;
  videoUrl?: string | null; pdfUrl?: string | null; quizData?: unknown;
}

interface CourseDetail {
  id: number; title: string; description: string; coachName: string;
  lessons: Lesson[]; isFree: boolean; price: string; currency: string;
  hasFinalExam: boolean;
}

interface Progress {
  totalLessons: number; completedLessons: number; progressPercent: number;
  completedLessonIds: number[]; isCompleted: boolean;
}

import { useRef } from "react";
import { MessageSquare, Send, FastForward, RotateCcw } from "lucide-react";

interface QuizQuestion { question: string; options: string[]; answer: number; }

function VideoPlayer({ url, lessonId, lang }: { url: string; lessonId: number; lang: "ar" | "fr" | "en" }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const storageKey = `tamayuz_video_pos_${lessonId}`;

  // Restore saved timestamp
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const time = parseFloat(saved);
      if (!isNaN(time) && time > 0) {
        video.currentTime = time;
      }
    }

    let lastSent = 0;
    const handleTimeUpdate = () => {
      const current = video.currentTime;
      if (current > 2) {
        localStorage.setItem(storageKey, String(current));
        const now = Date.now();
        if (now - lastSent > 5000) {
          lastSent = now;
          const token = localStorage.getItem("tamayuz_token") || localStorage.getItem("token");
          if (token) {
            fetch(`/api/progress/lesson/${lessonId}/timestamp`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ seconds: Math.floor(current) }),
            }).catch(() => {});
          }
        }
      }
    };

    // Keyboard shortcuts: Space = play/pause, Left = -10s, Right = +10s
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in textarea / input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (video.paused) video.play(); else video.pause();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 10);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        video.currentTime = Math.min(video.duration || 99999, video.currentTime + 10);
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lessonId, storageKey]);

  const changeSpeed = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const isYoutube = url.includes("youtube.com") || url.includes("youtu.be");
  if (isYoutube) {
    const id = url.includes("youtu.be/") ? url.split("youtu.be/")[1]?.split("?")[0] : new URL(url).searchParams.get("v");
    return (
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          src={`https://www.youtube.com/embed/${id}`}
          className="absolute inset-0 w-full h-full rounded-xl"
          allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <video
        ref={videoRef}
        src={url}
        controls
        className="w-full rounded-xl max-h-96 shadow-sm"
        style={{ background: "#000" }}
      >
        {{ ar: "متصفحك لا يدعم تشغيل الفيديو.", fr: "Votre navigateur ne supporte pas la lecture vidéo.", en: "Your browser doesn't support video playback." }[lang]}
      </video>

      {/* Video Toolbar: Speed Controls and Shortcuts hint */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-[11px]">{{ ar: "السرعة:", fr: "Vitesse :", en: "Speed:" }[lang]}</span>
          {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => changeSpeed(spd)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${playbackRate === spd ? "bg-black text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              {spd}x
            </button>
          ))}
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted-foreground/70">
          <span>[Espace] Pause</span>
          <span>[← / →] ±10s</span>
        </div>
      </div>
    </div>
  );
}

function QuizPlayer({ quizData, onComplete, lang }: { quizData: QuizQuestion[]; onComplete: () => void; lang: "ar" | "fr" | "en" }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState<boolean[]>(new Array(quizData.length).fill(false));
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  const q = quizData[current];

  const handleAnswer = (idx: number) => {
    if (answered[current]) return;
    const correct = idx === q.answer;
    setSelected(idx);
    const newAnswered = [...answered];
    newAnswered[current] = true;
    setAnswered(newAnswered);
    if (correct) {
      setScore((s) => s + 1);
      toast({ title: { ar: "إجابة صحيحة!", fr: "Bonne réponse !", en: "Correct answer!" }[lang] });
    } else {
      toast({
        title: { ar: "إجابة خاطئة", fr: "Mauvaise réponse", en: "Wrong answer" }[lang],
        description: `${{ ar: "الإجابة الصحيحة هي", fr: "La bonne réponse est", en: "The correct answer is" }[lang]} : ${q.options[q.answer]}`,
        variant: "destructive",
      });
    }
  };

  const handleNext = () => {
    if (current < quizData.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
    } else {
      setDone(true);
    }
  };

  if (done) {
    const pct = Math.round((score / quizData.length) * 100);
    return (
      <div className="text-center py-8">
        {pct >= 70 ? <PartyPopper className="w-14 h-14 text-amber-500 mx-auto mb-4" /> : <BookOpen className="w-14 h-14 text-muted-foreground/40 mx-auto mb-4" />}
        <h3 className="text-xl font-black text-foreground mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>
          {pct >= 70 ? { ar: "مبروك!", fr: "Bravo !", en: "Congratulations!" }[lang] : { ar: "حاولي مرة أخرى", fr: "Essayez encore", en: "Try again" }[lang]}
        </h3>
        <p className="text-muted-foreground mb-1">Score : {score}/{quizData.length}</p>
        <p className="text-2xl font-black text-foreground mb-6">{pct}%</p>
        {pct >= 70 && (
          <Button onClick={onComplete} className="font-bold bg-black hover:bg-black/90 text-white shadow-sm border border-black">
            {{ ar: "وضع علامة مكتمل", fr: "Marquer comme complété", en: "Mark as complete" }[lang]}
          </Button>
        )}
        {pct < 70 && (
          <Button onClick={() => { setCurrent(0); setSelected(null); setAnswered(new Array(quizData.length).fill(false)); setScore(0); setDone(false); }} variant="outline" className="font-bold">
            {{ ar: "إعادة المحاولة", fr: "Recommencer", en: "Restart" }[lang]}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{{ ar: "سؤال", fr: "Question", en: "Question" }[lang]} {current + 1} / {quizData.length}</span>
        <div className="flex gap-1">
          {quizData.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${i === current ? "bg-violet-500" : answered[i] ? "bg-emerald-500" : "bg-muted"}`} />
          ))}
        </div>
      </div>
      <h3 className="text-base font-bold text-foreground" style={{ fontFamily: "Cairo, sans-serif" }}>{q?.question}</h3>
      <div className="space-y-2">
        {q?.options.map((option, idx) => {
          let style = "border border-border bg-muted/30 text-foreground/70 hover:bg-muted hover:text-foreground";
          if (answered[current]) {
            if (idx === q.answer) style = "border border-emerald-500 bg-emerald-50 text-emerald-700 font-bold";
            else if (idx === selected) style = "border border-red-500 bg-red-50 text-red-600";
            else style = "border border-border/50 bg-muted/10 text-muted-foreground/50";
          }
          return (
            <button key={idx} onClick={() => handleAnswer(idx)} disabled={answered[current]}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${style}`}>
              <span className="font-semibold mr-2">{String.fromCharCode(65 + idx)}.</span>{option}
            </button>
          );
        })}
      </div>
      {answered[current] && (
        <Button onClick={handleNext} className="w-full font-bold mt-2 bg-black hover:bg-black/90 text-white shadow-sm border border-black">
          {current < quizData.length - 1 ? { ar: "السؤال التالي", fr: "Question suivante", en: "Next question" }[lang] : { ar: "عرض النتائج", fr: "Voir résultats", en: "View results" }[lang]}
        </Button>
      )}
    </div>
  );
}

function LessonQAThread({ lessonId, lang }: { lessonId: number; lang: "ar" | "fr" | "en" }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newText, setNewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const loadComments = async () => {
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("tamayuz_token") || localStorage.getItem("token");
      const res = await fetch(`/api/lessons/${lessonId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadComments();
  }, [lessonId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("tamayuz_token") || localStorage.getItem("token");
      const res = await fetch(`/api/lessons/${lessonId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: newText.trim() }),
      });
      if (!res.ok) throw new Error("Erreur");
      const saved = await res.json();
      setComments((prev) => [saved, ...prev]);
      setNewText("");
      toast({
        title: { ar: "تم إرسال السؤال", fr: "Question envoyée", en: "Question submitted" }[lang],
        description: { ar: "سيصل إشعار إلى المدرب للإجابة عليكِ قريباً.", fr: "Le formateur a été notifié et vous répondra sous peu.", en: "Coach has been notified." }[lang],
      });
    } catch {
      toast({ title: "Erreur", description: "Impossible d'envoyer la question", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <h3 className="font-bold text-sm text-foreground mb-3 flex items-center justify-between" style={{ fontFamily: "Cairo, sans-serif" }}>
        <span className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-neutral-800" />
          {{ ar: "أسئلة ونقاش حول هذا الدرس", fr: "Questions & Échanges sur cette leçon", en: "Questions & Discussion" }[lang]}
        </span>
        <span className="text-xs font-normal text-muted-foreground">({comments.length} {{ ar: "سؤال", fr: "messages", en: "posts" }[lang]})</span>
      </h3>

      <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100 text-xs text-muted-foreground mb-4">
        {{
          ar: "اطرحي أي استفسار أو نقطة غير واضحة ليتفاعل معكِ المدرب وباقي الطالبات.",
          fr: "Posez vos questions ou partagez vos remarques. Le formateur et la communauté vous répondront.",
          en: "Ask questions or share feedback. The coach and peers will assist you.",
        }[lang]}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder={{ ar: "اكتبي سؤالكِ هنا...", fr: "Écrivez votre question ici...", en: "Type your question here..." }[lang]}
          className="flex-1 h-10 px-3 rounded-lg border border-border bg-white text-xs outline-none focus:ring-1 focus:ring-black"
        />
        <Button
          type="submit"
          disabled={submitting || !newText.trim()}
          size="sm"
          className="bg-black hover:bg-black/90 text-white font-bold h-10 px-4 text-xs gap-1.5 disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          {{ ar: "إرسال", fr: "Envoyer", en: "Send" }[lang]}
        </Button>
      </form>

      {/* Thread list */}
      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="p-3 bg-white rounded-xl border border-border/80 shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-[10px]">
                  {c.userName?.[0] ?? "U"}
                </div>
                <span className="text-xs font-bold text-foreground">{c.userName}</span>
                {c.userRole === "coach" && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    {{ ar: "مدرب", fr: "Coach", en: "Coach" }[lang]}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {new Date(c.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-xs text-foreground/90 pl-8">{c.content}</p>

            {/* Replies */}
            {c.replies?.length > 0 && (
              <div className="mt-2.5 pl-8 space-y-2 border-l-2 border-neutral-100">
                {c.replies.map((reply: any) => (
                  <div key={reply.id} className="bg-neutral-50 p-2.5 rounded-lg text-xs">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-bold text-foreground text-[11px]">{reply.userName}</span>
                      {reply.userRole === "coach" && (
                        <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                          Coach
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground">{reply.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudentLearningPage() {
  const params = useParams<{ id: string }>();
  const courseId = parseInt(params.id ?? "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { lang } = useI18n();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
  const [loadingCourse, setLoadingCourse] = useState(true);
  const [generatingCert, setGeneratingCert] = useState(false);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const token = localStorage.getItem("auth_token");
  const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

  const fetchCourse = async () => {
    try {
      const [courseRes, progressRes] = await Promise.all([
        fetch(`${BASE}/api/courses/${courseId}`, { headers }),
        fetch(`${BASE}/api/progress/course/${courseId}`, { headers }),
      ]);
      if (!courseRes.ok || !progressRes.ok) {
        toast({ title: { ar: "خطأ", fr: "Erreur", en: "Error" }[lang], description: { ar: "تعذّر تحميل الدورة", fr: "Impossible de charger la formation", en: "Couldn't load the course" }[lang], variant: "destructive" });
        return;
      }
      const courseData = await courseRes.json();
      const progressData = await progressRes.json();
      setCourse(courseData);
      setProgress(progressData);
      if (courseData.lessons?.length > 0 && !activeLessonId) {
        setActiveLessonId(courseData.lessons[0].id);
      }
    } catch {
      toast({ title: { ar: "خطأ في الشبكة", fr: "Erreur réseau", en: "Network error" }[lang], description: { ar: "تعذّر تحميل الدورة", fr: "Impossible de charger la formation", en: "Couldn't load the course" }[lang], variant: "destructive" });
    } finally { setLoadingCourse(false); }
  };

  useEffect(() => { if (courseId) fetchCourse(); }, [courseId]);

  const markComplete = async (lessonId: number) => {
    try {
      const completeRes = await fetch(`${BASE}/api/progress/lesson/${lessonId}/complete`, { method: "POST", headers });
      if (!completeRes.ok) {
        const err = await completeRes.json().catch(() => null);
        toast({
          title: { ar: "خطأ", fr: "Erreur", en: "Error" }[lang],
          description: err?.error ?? { ar: "تعذّر تسجيل إتمام الدرس", fr: "Impossible d'enregistrer la complétion", en: "Couldn't record lesson completion" }[lang],
          variant: "destructive",
        });
        return;
      }
      const progressRes = await fetch(`${BASE}/api/progress/course/${courseId}`, { headers });
      if (!progressRes.ok) throw new Error("failed");
      const progressData = await progressRes.json();
      setProgress(progressData);
      toast({ title: { ar: "تم إتمام الدرس!", fr: "Leçon complétée !", en: "Lesson completed!" }[lang] });
      if (progressData.isCompleted) {
        toast({
          title: { ar: "تم إتمام الدورة!", fr: "Cours terminé !", en: "Course completed!" }[lang],
          description: { ar: "يمكنك الآن توليد شهادتك!", fr: "Vous pouvez maintenant générer votre certificat !", en: "You can now generate your certificate!" }[lang],
        });
      }
    } catch {
      toast({ title: { ar: "خطأ", fr: "Erreur", en: "Error" }[lang], description: { ar: "تعذّر تسجيل إتمام الدرس", fr: "Impossible d'enregistrer la complétion", en: "Couldn't record lesson completion" }[lang], variant: "destructive" });
    }
  };

  const generateCert = async () => {
    setGeneratingCert(true);
    try {
      const res = await fetch(`${BASE}/api/certificates/generate`, { method: "POST", headers, body: JSON.stringify({ courseId }) });
      if (res.ok) {
        const cert = await res.json();
        toast({ title: { ar: "تم توليد الشهادة!", fr: "Certificat généré !", en: "Certificate generated!" }[lang], description: `Code : ${cert.certificateCode}` });
        setLocation("/student/certificates");
      } else {
        const err = await res.json();
        toast({ title: { ar: "خطأ", fr: "Erreur", en: "Error" }[lang], description: err.error, variant: "destructive" });
      }
    } finally { setGeneratingCert(false); }
  };

  if (loadingCourse) return (
    <StudentLayout>
      <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
    </StudentLayout>
  );

  const activeLesson = course?.lessons.find((l) => l.id === activeLessonId) ?? course?.lessons[0];
  const isCompleted = progress?.completedLessonIds.includes(activeLessonId ?? 0) ?? false;
  const lessonIndex = course?.lessons.findIndex((l) => l.id === activeLessonId) ?? 0;

  // A lesson unlocks only once every lesson before it (in curriculum order) is completed.
  const isLessonLocked = (index: number) => {
    if (!course || index === 0) return false;
    const prev = course.lessons[index - 1];
    return !progress?.completedLessonIds.includes(prev.id);
  };

  const selectLesson = (lesson: Lesson, index: number) => {
    if (isLessonLocked(index)) {
      toast({
        title: { ar: "الدرس مقفل", fr: "Leçon verrouillée", en: "Lesson locked" }[lang],
        description: { ar: "أكملي الدرس السابق أولاً للوصول إلى هذا الدرس", fr: "Complétez la leçon précédente pour y accéder", en: "Complete the previous lesson first to unlock this one" }[lang],
      });
      return;
    }
    setActiveLessonId(lesson.id);
  };

  const goNext = () => {
    if (!course) return;
    const next = course.lessons[lessonIndex + 1];
    if (next && !isLessonLocked(lessonIndex + 1)) setActiveLessonId(next.id);
  };
  const goPrev = () => {
    if (!course) return;
    const prev = course.lessons[lessonIndex - 1];
    if (prev) setActiveLessonId(prev.id);
  };

  return (
    <StudentLayout>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setLocation("/student/my-courses")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-foreground truncate" style={{ fontFamily: "Cairo, sans-serif" }}>{course?.title}</h1>
            <p className="text-muted-foreground text-xs">{course?.coachName}</p>
          </div>
          {/* Progress pill */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-24 h-2 rounded-full bg-muted">
              <div className="h-full rounded-full transition-all" style={{ width: `${progress?.progressPercent ?? 0}%`, background: progress?.isCompleted ? "hsl(160,60%,50%)" : "hsl(258,75%,65%)" }} />
            </div>
            <span className="text-xs text-foreground/70 font-semibold">{progress?.progressPercent ?? 0}%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Lesson list (sidebar) */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white border border-border shadow-sm rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <p className="text-xs font-bold text-muted-foreground">
                  {progress?.completedLessons ?? 0}/{progress?.totalLessons ?? 0} {{ ar: "دروس", fr: "leçons", en: "lessons" }[lang]}
                </p>
              </div>
              <div className="divide-y divide-border">
                {course?.lessons.map((lesson, i) => {
                  const done = progress?.completedLessonIds.includes(lesson.id);
                  const active = lesson.id === activeLessonId;
                  const locked = isLessonLocked(i);
                  const typeIcons: Record<string, React.ReactNode> = {
                    video: <Play className="w-3.5 h-3.5 text-blue-500" />,
                    pdf: <FileText className="w-3.5 h-3.5 text-rose-500" />,
                    quiz: <HelpCircle className="w-3.5 h-3.5 text-amber-500" />,
                    text: <BookOpen className="w-3.5 h-3.5 text-emerald-500" />,
                  };
                  return (
                    <button key={lesson.id} onClick={() => selectLesson(lesson, i)}
                      aria-disabled={locked}
                      title={locked ? { ar: "أكملي الدرس السابق للوصول", fr: "Complétez la leçon précédente pour y accéder", en: "Complete the previous lesson to unlock" }[lang] : undefined}
                      className={`w-full flex items-center gap-3 p-3 text-left transition-all ${active ? "bg-muted" : locked ? "opacity-50 hover:bg-transparent cursor-not-allowed" : "hover:bg-muted/50"}`}>
                      <div className="shrink-0">
                        {done ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : locked ? <Lock className="w-3.5 h-3.5 text-muted-foreground/50" /> : <Circle className="w-4 h-4 text-muted-foreground/40" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          {typeIcons[lesson.type]}
                          <span className={`text-xs font-semibold truncate ${active ? "text-foreground" : done ? "text-foreground/70" : "text-foreground/60"}`}>
                            {i + 1}. {lesson.title}
                          </span>
                        </div>
                        {lesson.durationMinutes && <span className="text-xs text-muted-foreground">{lesson.durationMinutes}min</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Certificate / final exam entry point */}
              {progress?.isCompleted && (
                <div className="p-4 border-t border-border">
                  {course?.hasFinalExam ? (
                    <Button onClick={() => setLocation(`/student/learn/${courseId}/exam`)} className="w-full gap-2 font-bold text-sm bg-neutral-900 hover:bg-neutral-800 text-white">
                      <Award className="w-4 h-4" />
                      {{ ar: "اجتياز الامتحان النهائي", fr: "Passer l'examen final", en: "Take the final exam" }[lang]}
                    </Button>
                  ) : (
                    <Button onClick={generateCert} disabled={generatingCert} className="w-full gap-2 font-bold text-sm bg-neutral-900 hover:bg-neutral-800 text-white">
                      <Award className="w-4 h-4" />
                      {generatingCert ? { ar: "جارٍ التوليد...", fr: "Génération...", en: "Generating..." }[lang] : { ar: "الحصول على شهادتي", fr: "Obtenir mon certificat", en: "Get my certificate" }[lang]}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Content area */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <div className="bg-white border border-border shadow-sm rounded-2xl overflow-hidden">
              {activeLesson ? (
                <>
                  <div className="p-6 border-b border-border">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-black text-foreground" style={{ fontFamily: "Cairo, sans-serif" }}>{activeLesson.title}</h2>
                        {activeLesson.description && <p className="text-muted-foreground text-sm mt-1">{activeLesson.description}</p>}
                      </div>
                      {isCompleted && (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 shrink-0">
                          <CheckCircle className="w-4 h-4" /> {{ ar: "مكتملة", fr: "Complétée", en: "Completed" }[lang]}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Video */}
                    {activeLesson.type === "video" && (
                      <div>
                        {activeLesson.videoUrl ? (
                          <VideoPlayer url={activeLesson.videoUrl} lessonId={activeLesson.id} lang={lang} />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-48 rounded-xl text-white/30" style={{ background: "rgba(0,0,0,0.3)" }}>
                            <Play className="w-12 h-12 mb-2" />
                            <p className="text-sm">{{ ar: "لا يوجد فيديو متاح", fr: "Aucune vidéo disponible", en: "No video available" }[lang]}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* PDF */}
                    {activeLesson.type === "pdf" && (
                      <div>
                        {activeLesson.pdfUrl ? (
                          <div>
                            <iframe src={activeLesson.pdfUrl} className="w-full rounded-xl" style={{ height: 500, border: "none" }} />
                            <a href={activeLesson.pdfUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300">
                              <FileText className="w-4 h-4" /> {{ ar: "فتح الملف بالحجم الكامل", fr: "Ouvrir le PDF en plein écran", en: "Open PDF fullscreen" }[lang]}
                            </a>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-48 rounded-xl text-white/30" style={{ background: "rgba(0,0,0,0.3)" }}>
                            <FileText className="w-12 h-12 mb-2" />
                            <p className="text-sm">{{ ar: "لا يوجد ملف PDF متاح", fr: "Aucun PDF disponible", en: "No PDF available" }[lang]}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quiz */}
                    {activeLesson.type === "quiz" && (
                      <div>
                        {(() => {
                          // Backend stores quizData as an object ({ questions: [...] }), not a bare array.
                          const quizData = activeLesson.quizData as { questions?: QuizQuestion[] } | QuizQuestion[] | null | undefined;
                          const questions = Array.isArray(quizData) ? quizData : quizData?.questions;
                          return Array.isArray(questions) && questions.length > 0;
                        })() ? (
                          <QuizPlayer
                            quizData={(() => {
                              const quizData = activeLesson.quizData as { questions?: QuizQuestion[] } | QuizQuestion[] | null | undefined;
                              return (Array.isArray(quizData) ? quizData : quizData?.questions) ?? [];
                            })()}
                            onComplete={() => markComplete(activeLesson.id)}
                            lang={lang}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-48 rounded-xl text-white/30" style={{ background: "rgba(0,0,0,0.3)" }}>
                            <HelpCircle className="w-12 h-12 mb-2" />
                            <p className="text-sm">{{ ar: "الاختبار غير متاح", fr: "Quiz non disponible", en: "Quiz not available" }[lang]}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Text */}
                    {activeLesson.type === "text" && (
                      <div className="prose max-w-none">
                        <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
                          {activeLesson.description ?? { ar: "محتوى الدرس متاح حضورياً.", fr: "Contenu de la leçon disponible en présentiel.", en: "Lesson content available in person." }[lang]}
                        </p>
                      </div>
                    )}

                    {/* Navigation + complete button */}
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
                      <Button onClick={goPrev} disabled={lessonIndex === 0} variant="outline" className="gap-2 text-sm">
                        <ChevronLeft className="w-4 h-4" /> {{ ar: "السابقة", fr: "Précédente", en: "Previous" }[lang]}
                      </Button>

                      {!isCompleted && activeLesson.type !== "quiz" && (
                        <Button onClick={() => markComplete(activeLesson.id)} className="gap-2 text-sm font-bold bg-black hover:bg-black/90 text-white shadow-sm border border-black">
                          <CheckCircle className="w-4 h-4" /> {{ ar: "وضع علامة مكتملة", fr: "Marquer complétée", en: "Mark complete" }[lang]}
                        </Button>
                      )}

                      <Button onClick={goNext} disabled={lessonIndex === (course?.lessons.length ?? 1) - 1 || isLessonLocked(lessonIndex + 1)} variant="outline" className="gap-2 text-sm">
                        {{ ar: "التالية", fr: "Suivante", en: "Next" }[lang]} <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Lesson Q&A Discussion Forum */}
                    <LessonQAThread lessonId={activeLesson.id} lang={lang} />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground/50">
                  <BookOpen className="w-12 h-12 mb-2" />
                  <p>{{ ar: "اختاري درساً", fr: "Sélectionnez une leçon", en: "Select a lesson" }[lang]}</p>
                </div>
              )}
            </div>
          </div>
        </div>
    </StudentLayout>
  );
}
