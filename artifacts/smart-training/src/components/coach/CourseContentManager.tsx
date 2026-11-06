import { useMemo, useRef, useState } from "react";
import {
  useGetCourseChapters, useCreateChapter, useUpdateChapter, useDeleteChapter,
  useCreateLesson, useUpdateLesson, useDeleteLesson, useUploadFile,
  getGetCourseChaptersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Pencil, Trash2, X, BookOpen, Clock, Play, FileText, HelpCircle,
  ChevronDown, ChevronRight, ChevronUp, GripVertical, Upload, Link as LinkIcon,
  FolderPlus, Folder, Loader2,
} from "lucide-react";
import { MAX_UPLOAD_BYTES, formatBytes } from "@/lib/coachContent";

interface LessonItem {
  id: number; courseId: number; chapterId?: number | null; title: string; description?: string | null;
  order: number; durationMinutes?: number | null; type: string;
  videoUrl?: string | null; pdfUrl?: string | null; quizData?: unknown;
}

interface ChapterItem {
  id: number; courseId: number; title: string; description?: string | null; order: number;
  lessons: LessonItem[];
}

interface QuizQuestion { question: string; options: string[]; answer: number; }

type LessonKind = "text" | "video" | "pdf" | "quiz";

const typeConfig: Record<LessonKind, { icon: React.ReactNode; color: string; bg: string }> = {
  text: { icon: <BookOpen className="w-3.5 h-3.5" />, color: "text-emerald-600", bg: "bg-emerald-50" },
  video: { icon: <Play className="w-3.5 h-3.5" />, color: "text-blue-600", bg: "bg-blue-50" },
  pdf: { icon: <FileText className="w-3.5 h-3.5" />, color: "text-rose-600", bg: "bg-rose-50" },
  quiz: { icon: <HelpCircle className="w-3.5 h-3.5" />, color: "text-amber-600", bg: "bg-amber-50" },
};

const LESSON_TYPE_LABELS: Record<LessonKind, { ar: string; fr: string; en: string }> = {
  text: { ar: "نص", fr: "Texte", en: "Text" },
  video: { ar: "فيديو", fr: "Vidéo", en: "Video" },
  pdf: { ar: "PDF", fr: "PDF", en: "PDF" },
  quiz: { ar: "اختبار", fr: "Quiz", en: "Quiz" },
};

const UNASSIGNED = "__unassigned__";

function emptyQuizQuestion(): QuizQuestion {
  return { question: "", options: ["", ""], answer: 0 };
}

export function CourseContentManager({ courseId }: { courseId: number }) {
  const { lang } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: chapters, isLoading } = useGetCourseChapters(courseId, {
    query: { enabled: !!courseId, queryKey: getGetCourseChaptersQueryKey(courseId) },
  });
  const createChapterMutation = useCreateChapter();
  const updateChapterMutation = useUpdateChapter();
  const deleteChapterMutation = useDeleteChapter();
  const createLessonMutation = useCreateLesson();
  const updateLessonMutation = useUpdateLesson();
  const deleteLessonMutation = useDeleteLesson();
  const uploadMutation = useUploadFile();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetCourseChaptersQueryKey(courseId) });

  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [newChapterName, setNewChapterName] = useState("");
  const [pendingDeleteChapter, setPendingDeleteChapter] = useState<ChapterItem | null>(null);
  const [pendingDeleteLesson, setPendingDeleteLesson] = useState<LessonItem | null>(null);

  const realChapters = useMemo(() => (chapters as ChapterItem[] | undefined)?.filter((c) => c.id !== 0) ?? [], [chapters]);
  const unassignedGroup = useMemo(() => (chapters as ChapterItem[] | undefined)?.find((c) => c.id === 0) ?? null, [chapters]);

  const addChapter = () => {
    if (!newChapterName.trim()) return;
    createChapterMutation.mutate(
      { id: courseId, data: { title: newChapterName.trim(), order: realChapters.length + 1 } },
      {
        onSuccess: (ch) => {
          invalidate();
          setExpanded((e) => ({ ...e, [ch.id]: true }));
          setNewChapterName("");
        },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      }
    );
  };

  const renameChapter = (chapterId: number, title: string) => {
    updateChapterMutation.mutate({ id: courseId, chapterId, data: { title } }, { onSuccess: invalidate });
  };

  const confirmDeleteChapter = () => {
    if (!pendingDeleteChapter) return;
    deleteChapterMutation.mutate(
      { id: courseId, chapterId: pendingDeleteChapter.id },
      {
        onSuccess: () => {
          invalidate();
          setPendingDeleteChapter(null);
          toast({ title: { ar: "تم حذف الفصل", fr: "Chapitre supprimé", en: "Chapter deleted" }[lang] });
        },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      }
    );
  };

  const moveChapter = (chapterId: number, dir: -1 | 1) => {
    const idx = realChapters.findIndex((c) => c.id === chapterId);
    const swapIdx = idx + dir;
    if (idx === -1 || swapIdx < 0 || swapIdx >= realChapters.length) return;
    const a = realChapters[idx], b = realChapters[swapIdx];
    updateChapterMutation.mutate({ id: courseId, chapterId: a.id, data: { order: b.order } });
    updateChapterMutation.mutate({ id: courseId, chapterId: b.id, data: { order: a.order } }, { onSuccess: invalidate });
  };

  const assignLessonToChapter = (lessonId: number, chapterId: string) => {
    const data = chapterId === UNASSIGNED ? { chapterId: null } : { chapterId: parseInt(chapterId, 10) };
    updateLessonMutation.mutate({ id: courseId, lessonId, data }, { onSuccess: invalidate });
  };

  const moveLessonWithinChapter = (group: LessonItem[], lessonId: number, dir: -1 | 1) => {
    const idx = group.findIndex((l) => l.id === lessonId);
    const swapIdx = idx + dir;
    if (idx === -1 || swapIdx < 0 || swapIdx >= group.length) return;
    const a = group[idx], b = group[swapIdx];
    updateLessonMutation.mutate({ id: courseId, lessonId: a.id, data: { order: b.order } });
    updateLessonMutation.mutate({ id: courseId, lessonId: b.id, data: { order: a.order } }, { onSuccess: invalidate });
  };

  // Lesson create/edit modal state
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonItem | null>(null);
  const [formChapterId, setFormChapterId] = useState<string>(UNASSIGNED);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [type, setType] = useState<LessonKind>("text");
  const [mediaUrl, setMediaUrl] = useState("");
  const [urlMode, setUrlMode] = useState<"upload" | "link">("link");
  const [uploadInfo, setUploadInfo] = useState<{ name: string; size: number } | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([emptyQuizQuestion()]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCreate = (chapterId: number | 0) => {
    setEditingLesson(null);
    setFormChapterId(chapterId === 0 ? UNASSIGNED : String(chapterId));
    setTitle(""); setDescription(""); setDurationMinutes(null); setType("text");
    setMediaUrl(""); setUrlMode("link"); setUploadInfo(null);
    setQuizQuestions([emptyQuizQuestion()]);
    setShowForm(true);
  };

  const openEdit = (lesson: LessonItem, chapterId: number | 0) => {
    setEditingLesson(lesson);
    setFormChapterId(chapterId === 0 ? UNASSIGNED : String(chapterId));
    setTitle(lesson.title);
    setDescription(lesson.description ?? "");
    setDurationMinutes(lesson.durationMinutes ?? null);
    setType((lesson.type as LessonKind) ?? "text");
    const url = lesson.type === "video" ? lesson.videoUrl : lesson.type === "pdf" ? lesson.pdfUrl : "";
    setMediaUrl(url ?? "");
    setUrlMode("link");
    setUploadInfo(null);
    const existingQuestions = (lesson.quizData as { questions?: QuizQuestion[] } | null)?.questions;
    if (lesson.type === "quiz" && Array.isArray(existingQuestions) && existingQuestions.length) {
      setQuizQuestions(existingQuestions);
    } else {
      setQuizQuestions([emptyQuizQuestion()]);
    }
    setShowForm(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const limit = type === "video" ? MAX_UPLOAD_BYTES.video : MAX_UPLOAD_BYTES.pdf;
    if (file.size > limit) {
      toast({
        title: { ar: "الملف كبير جدًا", fr: "Fichier trop volumineux", en: "File too large" }[lang],
        description: `${{ ar: "الحد الأقصى", fr: "Maximum", en: "Max" }[lang]} ${formatBytes(limit)}`,
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    uploadMutation.mutate(
      { data: { file } },
      {
        onSuccess: (res) => {
          setMediaUrl(res.url);
          setUploadInfo({ name: file.name, size: file.size });
        },
        onError: () => toast({ title: { ar: "فشل الرفع", fr: "Échec du téléversement", en: "Upload failed" }[lang], variant: "destructive" }),
      }
    );
  };

  const addOption = (qIdx: number) => {
    setQuizQuestions((qs) => qs.map((q, i) => (i === qIdx && q.options.length < 6 ? { ...q, options: [...q.options, ""] } : q)));
  };
  const removeOption = (qIdx: number, oIdx: number) => {
    setQuizQuestions((qs) => qs.map((q, i) => {
      if (i !== qIdx || q.options.length <= 2) return q;
      const options = q.options.filter((_, o) => o !== oIdx);
      const answer = q.answer >= options.length ? 0 : q.answer;
      return { ...q, options, answer };
    }));
  };

  const isPending = createLessonMutation.isPending || updateLessonMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (type === "quiz") {
      const invalid = quizQuestions.some((q) => !q.question.trim() || q.options.filter((o) => o.trim()).length < 2);
      if (!quizQuestions.length || invalid) {
        toast({
          title: { ar: "أكملي أسئلة الاختبار", fr: "Complétez les questions du quiz", en: "Complete the quiz questions" }[lang],
          description: { ar: "كل سؤال يحتاج نصًا وخيارين على الأقل.", fr: "Chaque question nécessite un texte et au moins 2 options.", en: "Each question needs text and at least 2 options." }[lang],
          variant: "destructive",
        });
        return;
      }
    }

    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description || null,
      chapterId: formChapterId === UNASSIGNED ? null : parseInt(formChapterId, 10),
      durationMinutes,
      type,
      videoUrl: type === "video" ? (mediaUrl || null) : null,
      pdfUrl: type === "pdf" ? (mediaUrl || null) : null,
      // Backend validates quizData as an object, not a bare array — the actual
      // questions live under the `questions` key (see LearningPage.tsx QuizPlayer).
      // The correct-answer index is reclamped against the filtered options list —
      // stripping empty options before the selected one would otherwise shift it.
      quizData: type === "quiz" ? { questions: quizQuestions.map((q) => {
        const selectedText = q.options[q.answer];
        const filteredOptions = q.options.filter((o) => o.trim());
        const newAnswer = filteredOptions.indexOf(selectedText);
        return { ...q, options: filteredOptions, answer: newAnswer >= 0 ? newAnswer : 0 };
      }) } : null,
    };

    const onOk = () => {
      invalidate();
      toast({ title: editingLesson ? { ar: "تم تحديث الدرس", fr: "Leçon mise à jour", en: "Lesson updated" }[lang] : { ar: "تم إنشاء الدرس", fr: "Leçon créée", en: "Lesson created" }[lang] });
      setShowForm(false);
    };

    if (editingLesson) {
      updateLessonMutation.mutate(
        { id: courseId, lessonId: editingLesson.id, data: payload as any },
        { onSuccess: onOk, onError: () => toast({ title: "Erreur", variant: "destructive" }) }
      );
    } else {
      createLessonMutation.mutate(
        { id: courseId, data: payload as any },
        { onSuccess: onOk, onError: () => toast({ title: "Erreur", variant: "destructive" }) }
      );
    }
  };

  const confirmDeleteLesson = () => {
    if (!pendingDeleteLesson) return;
    deleteLessonMutation.mutate(
      { id: courseId, lessonId: pendingDeleteLesson.id },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: { ar: "تم حذف الدرس", fr: "Leçon supprimée", en: "Lesson deleted" }[lang] });
          setPendingDeleteLesson(null);
        },
      }
    );
  };

  const displayGroups: { key: number; title: string; lessons: LessonItem[]; isUnassigned: boolean }[] = [
    ...realChapters.map((c) => ({ key: c.id, title: c.title, lessons: [...c.lessons].sort((a, b) => a.order - b.order), isUnassigned: false })),
    ...(unassignedGroup && unassignedGroup.lessons.length > 0
      ? [{ key: 0, title: { ar: "دروس غير مصنفة", fr: "Leçons sans chapitre", en: "Unassigned lessons" }[lang], lessons: [...unassignedGroup.lessons].sort((a, b) => a.order - b.order), isUnassigned: true }]
      : []),
  ];

  const totalLessons = displayGroups.reduce((s, g) => s + g.lessons.length, 0);

  return (
    <div>
      {/* Add chapter bar */}
      <div className="flex items-center gap-2 mb-5">
        <Input
          value={newChapterName}
          onChange={(e) => setNewChapterName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChapter(); } }}
          placeholder={{ ar: "اسم الفصل الجديد...", fr: "Nom du nouveau chapitre...", en: "New chapter name..." }[lang]}
          className="bg-white max-w-sm"
        />
        <Button type="button" onClick={addChapter} disabled={!newChapterName.trim() || createChapterMutation.isPending} variant="outline" className="gap-2 font-bold text-xs shrink-0">
          <FolderPlus className="w-4 h-4" />
          {{ ar: "إضافة فصل", fr: "Ajouter un chapitre", en: "Add Chapter" }[lang]}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-white border border-border rounded-xl animate-pulse" />)}</div>
      ) : totalLessons === 0 && realChapters.length === 0 ? (
        <div className="text-center py-16 bg-white border-2 border-dashed border-border rounded-xl">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <h3 className="font-bold text-foreground mb-1 text-sm">{{ ar: "لا يوجد محتوى بعد", fr: "Aucun contenu pour l'instant", en: "No content yet" }[lang]}</h3>
          <p className="text-muted-foreground text-xs mb-4">{{ ar: "ابدئي بإنشاء فصل ثم أضيفي الدروس إليه", fr: "Commencez par créer un chapitre puis ajoutez-y des leçons", en: "Start by creating a chapter, then add lessons to it" }[lang]}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayGroups.map((group, gi) => {
            const isExpanded = expanded[group.key] ?? true;
            return (
              <div key={group.key} className="bg-white border border-border rounded-xl overflow-hidden shadow-2xs">
                <div className="flex items-center gap-2 p-3 bg-muted/30">
                  <button type="button" onClick={() => setExpanded((e) => ({ ...e, [group.key]: !isExpanded }))} className="text-muted-foreground hover:text-foreground shrink-0">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <Folder className={`w-4 h-4 shrink-0 ${group.isUnassigned ? "text-muted-foreground" : "text-violet-600"}`} />
                  {!group.isUnassigned ? (
                    <input
                      defaultValue={group.title}
                      onBlur={(e) => e.target.value.trim() && e.target.value !== group.title && renameChapter(group.key, e.target.value.trim())}
                      className="flex-1 bg-transparent text-sm font-bold text-foreground outline-none focus:underline min-w-0"
                    />
                  ) : (
                    <span className="flex-1 text-sm font-bold text-muted-foreground italic">{group.title}</span>
                  )}
                  <span className="text-[10px] font-bold text-muted-foreground shrink-0">{group.lessons.length} {{ ar: "درس", fr: "leçon(s)", en: "lesson(s)" }[lang]}</span>
                  {!group.isUnassigned && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button type="button" onClick={() => moveChapter(group.key, -1)} disabled={gi === 0} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30">
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => moveChapter(group.key, 1)} disabled={gi === realChapters.length - 1} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => setPendingDeleteChapter({ id: group.key, courseId, title: group.title, order: gi, lessons: group.lessons })} className="w-6 h-6 rounded flex items-center justify-center text-rose-500 hover:bg-rose-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="p-3 space-y-2">
                    {group.lessons.map((lesson, li) => {
                      const tc = typeConfig[lesson.type as LessonKind] ?? typeConfig.text;
                      return (
                        <div key={lesson.id} className="flex items-center gap-3 p-3 bg-[#fafafa] border border-border rounded-lg">
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tc.bg} ${tc.color}`}>{tc.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-foreground truncate">{lesson.title}</div>
                            {lesson.durationMinutes && (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                <Clock className="w-3 h-3" />{lesson.durationMinutes}min
                              </span>
                            )}
                          </div>
                          {realChapters.length > 0 && (
                            <select
                              value={lesson.chapterId ? String(lesson.chapterId) : UNASSIGNED}
                              onChange={(e) => assignLessonToChapter(lesson.id, e.target.value)}
                              className="text-[10px] px-2 py-1 rounded-md border border-border bg-white text-foreground shrink-0"
                            >
                              <option value={UNASSIGNED}>{{ ar: "بدون فصل", fr: "Sans chapitre", en: "No chapter" }[lang]}</option>
                              {realChapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                          )}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button type="button" onClick={() => moveLessonWithinChapter(group.lessons, lesson.id, -1)} disabled={li === 0} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30">
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => moveLessonWithinChapter(group.lessons, lesson.id, 1)} disabled={li === group.lessons.length - 1} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30">
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => openEdit(lesson, group.key)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => setPendingDeleteLesson(lesson)} className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-50">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <button type="button" onClick={() => openCreate(group.key)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all text-xs font-bold">
                      <Plus className="w-3.5 h-3.5" />
                      {{ ar: "إضافة درس", fr: "Ajouter une leçon", en: "Add Lesson" }[lang]}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {realChapters.length === 0 && totalLessons === 0 && null}
        </div>
      )}

      {/* Lesson create/edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-white border border-border shadow-lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "Cairo, sans-serif" }}>
                {editingLesson ? { ar: "تعديل الدرس", fr: "Modifier la leçon", en: "Edit Lesson" }[lang] : { ar: "درس جديد", fr: "Nouvelle leçon", en: "New Lesson" }[lang]}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Type selector */}
              <div>
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1.5">{{ ar: "نوع الدرس", fr: "Type de leçon", en: "Lesson Type" }[lang]}</label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(typeConfig) as LessonKind[]).map((key) => (
                    <button key={key} type="button" onClick={() => setType(key)}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-lg text-[10px] font-bold transition-all border ${type === key ? "border-black bg-black text-white" : "border-border bg-white text-muted-foreground hover:bg-muted"}`}>
                      <span className={type === key ? "text-white" : typeConfig[key].color}>{typeConfig[key].icon}</span>
                      {LESSON_TYPE_LABELS[key]?.[lang] ?? key}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1">{{ ar: "العنوان", fr: "Titre", en: "Title" }[lang]} *</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder={{ ar: "عنوان الدرس", fr: "Titre de la leçon", en: "Lesson title" }[lang]} className="bg-white" />
              </div>

              <div>
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1">
                  {type === "text" ? { ar: "المحتوى النصي", fr: "Contenu texte", en: "Text content" }[lang] : { ar: "وصف (اختياري)", fr: "Description (optionnel)", en: "Description (optional)" }[lang]}
                </label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={type === "text" ? 5 : 2} className="bg-white" />
              </div>

              {(type === "video" || type === "pdf") && (
                <div className="space-y-2">
                  <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                    {type === "video" ? { ar: "مصدر الفيديو", fr: "Source vidéo", en: "Video source" }[lang] : { ar: "ملف PDF", fr: "Fichier PDF", en: "PDF file" }[lang]}
                  </label>
                  <div className="flex rounded-lg p-0.5 bg-muted w-fit">
                    <button type="button" onClick={() => setUrlMode("link")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${urlMode === "link" ? "bg-white text-black shadow-sm" : "text-muted-foreground"}`}>
                      <LinkIcon className="w-3 h-3" />{{ ar: "رابط", fr: "Lien", en: "Link" }[lang]}
                    </button>
                    <button type="button" onClick={() => setUrlMode("upload")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${urlMode === "upload" ? "bg-white text-black shadow-sm" : "text-muted-foreground"}`}>
                      <Upload className="w-3 h-3" />{{ ar: "رفع ملف", fr: "Téléverser", en: "Upload" }[lang]}
                    </button>
                  </div>

                  {urlMode === "link" ? (
                    <Input
                      value={mediaUrl.startsWith("/api/uploads/") ? "" : mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder={type === "video" ? "https://youtube.com/watch?v=..." : "https://example.com/document.pdf"}
                      className="bg-white"
                    />
                  ) : (
                    <div>
                      <input ref={fileInputRef} type="file" accept={type === "video" ? "video/*" : "application/pdf"} className="hidden" onChange={handleFileChange} />
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-border hover:border-foreground/30 text-muted-foreground hover:text-foreground transition-all text-xs font-bold">
                        {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploadInfo ? uploadInfo.name : { ar: "اختيار ملف من الجهاز", fr: "Choisir un fichier", en: "Choose a file" }[lang]}
                      </button>
                      {uploadInfo && <p className="text-[10px] text-muted-foreground mt-1">{formatBytes(uploadInfo.size)} · {{ ar: "تم الرفع", fr: "Téléversé", en: "Uploaded" }[lang]}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                        {{
                          ar: `الحد الأقصى ${formatBytes(type === "video" ? MAX_UPLOAD_BYTES.video : MAX_UPLOAD_BYTES.pdf)}. للملفات الأكبر استخدمي رابط يوتيوب أو استضافة خارجية.`,
                          fr: `Max ${formatBytes(type === "video" ? MAX_UPLOAD_BYTES.video : MAX_UPLOAD_BYTES.pdf)}. Pour un fichier plus lourd, utilisez un lien YouTube ou un hébergement externe.`,
                          en: `Max ${formatBytes(type === "video" ? MAX_UPLOAD_BYTES.video : MAX_UPLOAD_BYTES.pdf)}. For larger files, use a YouTube link or external hosting.`,
                        }[lang]}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {type === "quiz" && (
                <div className="space-y-3">
                  <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">{{ ar: "أسئلة الاختبار", fr: "Questions du quiz", en: "Quiz Questions" }[lang]}</label>
                  {quizQuestions.map((q, qi) => (
                    <div key={qi} className="p-3 bg-[#fafafa] border border-border rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground shrink-0">Q{qi + 1}</span>
                        <Input value={q.question} onChange={(e) => setQuizQuestions((qs) => qs.map((x, i) => i === qi ? { ...x, question: e.target.value } : x))}
                          placeholder={{ ar: "نص السؤال", fr: "Texte de la question", en: "Question text" }[lang]} className="bg-white flex-1" />
                        {quizQuestions.length > 1 && (
                          <button type="button" onClick={() => setQuizQuestions((qs) => qs.filter((_, i) => i !== qi))} className="text-rose-500 hover:bg-rose-50 rounded p-1 shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-1.5 pl-5">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input type="radio" name={`correct-${qi}`} checked={q.answer === oi}
                              onChange={() => setQuizQuestions((qs) => qs.map((x, i) => i === qi ? { ...x, answer: oi } : x))}
                              className="shrink-0" title={{ ar: "الإجابة الصحيحة", fr: "Bonne réponse", en: "Correct answer" }[lang]} />
                            <Input value={opt} onChange={(e) => setQuizQuestions((qs) => qs.map((x, i) => i === qi ? { ...x, options: x.options.map((o, oo) => oo === oi ? e.target.value : o) } : x))}
                              placeholder={`${{ ar: "خيار", fr: "Option", en: "Option" }[lang]} ${oi + 1}`} className="bg-white flex-1 h-8 text-xs" />
                            {q.options.length > 2 && (
                              <button type="button" onClick={() => removeOption(qi, oi)} className="text-muted-foreground hover:text-rose-500 shrink-0"><X className="w-3.5 h-3.5" /></button>
                            )}
                          </div>
                        ))}
                        {q.options.length < 6 && (
                          <button type="button" onClick={() => addOption(qi)} className="text-[10px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1">
                            <Plus className="w-3 h-3" />{{ ar: "إضافة خيار", fr: "Ajouter une option", en: "Add option" }[lang]}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => setQuizQuestions((qs) => [...qs, emptyQuizQuestion()])} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:text-foreground text-xs font-bold">
                    <Plus className="w-3.5 h-3.5" />{{ ar: "إضافة سؤال", fr: "Ajouter une question", en: "Add Question" }[lang]}
                  </button>
                </div>
              )}

              <div>
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1">{{ ar: "المدة (دقائق، اختياري)", fr: "Durée (minutes, optionnel)", en: "Duration (minutes, optional)" }[lang]}</label>
                <Input type="number" min="1" value={durationMinutes ?? ""} onChange={(e) => setDurationMinutes(e.target.value ? parseInt(e.target.value) : null)} className="bg-white" />
              </div>

              {realChapters.length > 0 && (
                <div>
                  <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block mb-1">{{ ar: "الفصل", fr: "Chapitre", en: "Chapter" }[lang]}</label>
                  <select value={formChapterId} onChange={(e) => setFormChapterId(e.target.value)} className="w-full h-10 px-3 bg-white border border-border rounded-lg text-foreground text-xs">
                    <option value={UNASSIGNED}>{{ ar: "بدون فصل", fr: "Sans chapitre", en: "No chapter" }[lang]}</option>
                    {realChapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-border">
                <Button type="submit" disabled={isPending || uploadMutation.isPending} className="flex-1 font-bold bg-black hover:bg-black/90 text-white">
                  {isPending ? { ar: "جارٍ الحفظ...", fr: "Enregistrement...", en: "Saving..." }[lang] : editingLesson ? { ar: "حفظ", fr: "Enregistrer", en: "Save" }[lang] : { ar: "إنشاء", fr: "Créer", en: "Create" }[lang]}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">{{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AlertDialog open={!!pendingDeleteChapter} onOpenChange={(open) => !open && setPendingDeleteChapter(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{{ ar: "حذف الفصل", fr: "Supprimer le chapitre", en: "Delete chapter" }[lang]}</AlertDialogTitle>
            <AlertDialogDescription>
              {{
                ar: `سيتم حذف الفصل "${pendingDeleteChapter?.title ?? ""}". دروسه لن تُحذف وستصبح غير مصنفة.`,
                fr: `Le chapitre "${pendingDeleteChapter?.title ?? ""}" sera supprimé. Ses leçons ne seront pas supprimées, elles deviendront non classées.`,
                en: `Chapter "${pendingDeleteChapter?.title ?? ""}" will be deleted. Its lessons are not deleted — they become unassigned.`,
              }[lang]}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteChapterMutation.isPending}>{{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteChapter} disabled={deleteChapterMutation.isPending} className="bg-red-600 hover:bg-red-700 text-white">{{ ar: "حذف", fr: "Supprimer", en: "Delete" }[lang]}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingDeleteLesson} onOpenChange={(open) => !open && setPendingDeleteLesson(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{{ ar: "حذف الدرس", fr: "Supprimer la leçon", en: "Delete lesson" }[lang]}</AlertDialogTitle>
            <AlertDialogDescription>
              {{
                ar: `سيتم حذف "${pendingDeleteLesson?.title ?? ""}" نهائيًا.`,
                fr: `"${pendingDeleteLesson?.title ?? ""}" sera supprimée définitivement.`,
                en: `"${pendingDeleteLesson?.title ?? ""}" will be permanently deleted.`,
              }[lang]}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLessonMutation.isPending}>{{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteLesson} disabled={deleteLessonMutation.isPending} className="bg-red-600 hover:bg-red-700 text-white">{{ ar: "حذف", fr: "Supprimer", en: "Delete" }[lang]}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
