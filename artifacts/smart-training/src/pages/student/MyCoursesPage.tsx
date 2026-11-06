import { useGetMyEnrollments } from "@workspace/api-client-react";
import { useI18n } from "@/i18n";
import { StudentLayout } from "@/components/student/StudentLayout";
import { CourseCard } from "@/components/shared/CourseCard";
import { BookOpen, Trophy } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function MyCoursesPage() {
  const { lang } = useI18n();
  const { data: enrollments, isLoading } = useGetMyEnrollments();

  return (
    <StudentLayout
      title={{ ar: "مسيرتي التعليمية", fr: "Mes formations", en: "My Courses" }[lang]}
      subtitle={{ ar: "الدورات المسجّلة بها", fr: "Vos formations en cours", en: "Your enrolled courses" }[lang]}
    >
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-80 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : enrollments && enrollments.length > 0 ? (
        <>
          <div className="flex items-center gap-2 mb-5">
            <Trophy className="w-4 h-4 text-amber-500" />
            <p className="text-muted-foreground text-sm">
              <span className="font-bold text-foreground">{enrollments.length}</span> {{ ar: "دورة مسجّلة", fr: `formation${enrollments.length > 1 ? "s" : ""}`, en: `course${enrollments.length > 1 ? "s" : ""}` }[lang]}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {enrollments.map((enrollment) => (
              <CourseCard
                key={enrollment.id}
                course={{ ...enrollment.course, isEnrolled: true }}
                href={`/student/learn/${enrollment.courseId}`}
                showPurchaseState
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-24 bg-white border border-border rounded-2xl">
          <BookOpen className="w-14 h-14 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>
            {{ ar: "لم تسجّلي بعد في أي دورة", fr: "Vous n'êtes inscrite à aucune formation", en: "You're not enrolled in any course yet" }[lang]}
          </h3>
          <p className="text-muted-foreground mb-6 text-sm">{{ ar: "ابدئي رحلتك التعليمية اليوم", fr: "Commencez votre parcours d'apprentissage dès aujourd'hui", en: "Start your learning journey today" }[lang]}</p>
          <Link href="/marketplace">
            <Button className="bg-black hover:bg-black/90 text-white font-bold px-8 gap-2">
              <BookOpen className="w-4 h-4" />
              {{ ar: "تصفّحي الدورات", fr: "Parcourir les formations", en: "Browse courses" }[lang]}
            </Button>
          </Link>
        </div>
      )}
    </StudentLayout>
  );
}
