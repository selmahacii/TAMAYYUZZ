import { useParams, useLocation } from "wouter";
import { useGetCourse, getGetCourseQueryKey } from "@workspace/api-client-react";
import { useI18n } from "@/i18n";
import { CoachLayout } from "@/components/coach/CoachLayout";
import { CourseContentManager } from "@/components/coach/CourseContentManager";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function LessonsPage() {
  const params = useParams<{ id: string }>();
  const courseId = parseInt(params.id ?? "0", 10);
  const [, setLocation] = useLocation();
  const { lang } = useI18n();

  const { data: course } = useGetCourse(courseId, {
    query: { enabled: !!courseId, queryKey: getGetCourseQueryKey(courseId) },
  });

  return (
    <CoachLayout
      title={course?.title ?? { ar: "المحتوى", fr: "Contenu", en: "Content" }[lang]}
      subtitle={{ ar: "إدارة الفصول والدروس: فيديو، PDF، اختبارات", fr: "Gérer les chapitres et leçons : vidéo, PDF, quiz", en: "Manage chapters and lessons: video, PDF, quizzes" }[lang]}
    >
      <Button variant="ghost" size="sm" onClick={() => setLocation("/coach/courses")} className="gap-2 text-xs font-bold text-muted-foreground hover:text-foreground mb-4 -ml-2">
        <ArrowLeft className="w-3.5 h-3.5" />
        {{ ar: "العودة إلى دوراتي", fr: "Retour à mes formations", en: "Back to my courses" }[lang]}
      </Button>
      <CourseContentManager courseId={courseId} />
    </CoachLayout>
  );
}
