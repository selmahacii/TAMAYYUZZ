import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { StudentLayout } from "@/components/student/StudentLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import { ArrowLeft, Award, CheckCircle, XCircle, Circle, Loader2, RotateCcw } from "lucide-react";

interface ExamQuestion { question: string; options: string[]; }
interface ExamPaper { passingScore: number; questions: ExamQuestion[]; }
interface ExamResult {
  score: number; passed: boolean; passingScore: number; correctAnswers: number[];
  certificate: { certificateCode: string } | null;
}

export default function StudentExamPage() {
  const params = useParams<{ id: string }>();
  const courseId = parseInt(params.id ?? "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { lang } = useI18n();

  const [exam, setExam] = useState<ExamPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const token = localStorage.getItem("auth_token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const fetchExam = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${BASE}/api/courses/${courseId}/exam`, { headers });
      const data = await res.json();
      if (!res.ok) { setLoadError(data.error ?? "Erreur"); return; }
      setExam(data);
      setAnswers(new Array(data.questions.length).fill(null));
    } catch {
      setLoadError({ ar: "خطأ في الشبكة", fr: "Erreur réseau", en: "Network error" }[lang]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (courseId) fetchExam(); }, [courseId]);

  const submit = async () => {
    if (answers.some((a) => a === null)) {
      toast({
        title: { ar: "أجيبي عن جميع الأسئلة", fr: "Répondez à toutes les questions", en: "Answer all questions" }[lang],
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/courses/${courseId}/exam/submit`, {
        method: "POST", headers, body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: { ar: "خطأ", fr: "Erreur", en: "Error" }[lang], description: data.error, variant: "destructive" });
        return;
      }
      setResult(data);
    } catch {
      toast({ title: { ar: "خطأ في الشبكة", fr: "Erreur réseau", en: "Network error" }[lang], variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const retake = () => {
    setResult(null);
    fetchExam();
  };

  if (loading) return (
    <StudentLayout>
      <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
    </StudentLayout>
  );

  if (loadError) return (
    <StudentLayout>
      <div className="text-center py-24 bg-white border border-border rounded-2xl">
        <XCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-foreground mb-2">{loadError}</h3>
        <Button onClick={() => setLocation(`/student/learn/${courseId}`)} className="mt-4 bg-black hover:bg-black/90 text-white font-bold">
          {{ ar: "العودة إلى الدورة", fr: "Retour à la formation", en: "Back to course" }[lang]}
        </Button>
      </div>
    </StudentLayout>
  );

  if (result) {
    return (
      <StudentLayout>
        <div className="max-w-xl mx-auto text-center py-12 bg-white border border-border rounded-2xl">
          {result.passed ? (
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          ) : (
            <XCircle className="w-16 h-16 text-rose-400 mx-auto mb-4" />
          )}
          <h2 className="text-2xl font-black text-foreground mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>
            {result.passed
              ? { ar: "مبروك، لقد نجحتِ!", fr: "Félicitations, vous avez réussi !", en: "Congratulations, you passed!" }[lang]
              : { ar: "لم تحصلي على النسبة المطلوبة", fr: "Vous n'avez pas atteint le seuil requis", en: "You didn't reach the required score" }[lang]}
          </h2>
          <p className="text-muted-foreground text-sm mb-1">
            {{ ar: "نتيجتك", fr: "Votre score", en: "Your score" }[lang]} : <span className="font-bold text-foreground">{result.score}/100</span>
            {" "}({{ ar: "الحد الأدنى", fr: "seuil requis", en: "required" }[lang]} : {result.passingScore}/100)
          </p>

          {result.passed && result.certificate ? (
            <Button onClick={() => setLocation(`/certificate/${result.certificate!.certificateCode}`)} className="mt-6 gap-2 font-bold bg-neutral-900 hover:bg-neutral-800 text-white">
              <Award className="w-4 h-4" /> {{ ar: "عرض شهادتي", fr: "Voir mon certificat", en: "View my certificate" }[lang]}
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-3 mt-6">
              <Button onClick={() => setLocation(`/student/learn/${courseId}`)} variant="outline" className="gap-2 font-bold">
                <ArrowLeft className="w-4 h-4" /> {{ ar: "مراجعة الدروس", fr: "Revoir les leçons", en: "Review lessons" }[lang]}
              </Button>
              <Button onClick={retake} className="gap-2 font-bold bg-neutral-900 hover:bg-neutral-800 text-white">
                <RotateCcw className="w-4 h-4" /> {{ ar: "إعادة المحاولة", fr: "Retenter l'examen", en: "Retake the exam" }[lang]}
              </Button>
            </div>
          )}
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto">
        <button onClick={() => setLocation(`/student/learn/${courseId}`)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {{ ar: "رجوع", fr: "Retour", en: "Back" }[lang]}
        </button>

        <div className="bg-white border border-border rounded-2xl p-6 mb-6">
          <h1 className="text-lg font-black text-foreground mb-1" style={{ fontFamily: "Cairo, sans-serif" }}>
            {{ ar: "الامتحان النهائي", fr: "Examen final", en: "Final exam" }[lang]}
          </h1>
          <p className="text-muted-foreground text-xs">
            {{ ar: "أجيبي عن جميع الأسئلة ثم أرسلي إجاباتك. النتيجة المطلوبة", fr: "Répondez à toutes les questions puis soumettez. Score requis", en: "Answer all questions then submit. Required score" }[lang]} : {exam?.passingScore}/100
          </p>
        </div>

        <div className="space-y-4">
          {exam?.questions.map((q, qi) => (
            <div key={qi} className="bg-white border border-border rounded-2xl p-5">
              <h3 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: "Cairo, sans-serif" }}>
                {qi + 1}. {q.question}
              </h3>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const selected = answers[qi] === oi;
                  return (
                    <button key={oi} onClick={() => setAnswers((a) => a.map((v, i) => i === qi ? oi : v))}
                      className={`w-full flex items-center gap-2 text-left px-4 py-3 rounded-xl text-sm transition-all border ${selected ? "border-neutral-900 bg-neutral-50 font-semibold text-foreground" : "border-border bg-white text-foreground/70 hover:bg-muted/40"}`}>
                      {selected ? <CheckCircle className="w-4 h-4 shrink-0" /> : <Circle className="w-4 h-4 shrink-0 text-muted-foreground/40" />}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <Button onClick={submit} disabled={submitting} className="w-full mt-6 py-3 font-bold bg-neutral-900 hover:bg-neutral-800 text-white gap-2">
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {{ ar: "إرسال الامتحان", fr: "Soumettre l'examen", en: "Submit exam" }[lang]}
        </Button>
      </div>
    </StudentLayout>
  );
}
