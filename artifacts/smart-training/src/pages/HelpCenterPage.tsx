import { useState, useEffect } from "react";
import { RoleAwareShell } from "@/components/shared/RoleAwareShell";
import { useI18n } from "@/i18n";
import { Input } from "@/components/ui/input";
import { HelpCircle, Search, ChevronDown, ChevronUp, Eye, BookOpen, Users, GraduationCap, CreditCard, Wrench } from "lucide-react";

interface Article {
  id: number;
  authorName: string | null;
  title: string;
  content: string;
  category: string;
  viewCount: number;
  createdAt: string;
}

const categoryConfig: Record<string, { label: Record<string, string>; icon: React.ReactNode }> = {
  general: { label: { ar: "عام", fr: "Général", en: "General" }, icon: <BookOpen className="w-3.5 h-3.5" /> },
  students: { label: { ar: "الطالبات", fr: "Étudiantes", en: "Students" }, icon: <GraduationCap className="w-3.5 h-3.5" /> },
  coaches: { label: { ar: "المدربات", fr: "Coachs", en: "Coaches" }, icon: <Users className="w-3.5 h-3.5" /> },
  billing: { label: { ar: "الفواتير", fr: "Facturation", en: "Billing" }, icon: <CreditCard className="w-3.5 h-3.5" /> },
  technical: { label: { ar: "تقني", fr: "Technique", en: "Technical" }, icon: <Wrench className="w-3.5 h-3.5" /> },
};

export default function HelpCenterPage() {
  const { lang } = useI18n();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (search.trim()) params.set("search", search.trim());
    fetch(`${BASE}/api/knowledge-base?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setArticles(data); })
      .finally(() => setLoading(false));
  }, [category, search]);

  const toggleExpand = async (id: number) => {
    const willOpen = expandedId !== id;
    setExpandedId(willOpen ? id : null);
    if (willOpen) {
      // Fetch the single article to increment its real view count server-side
      try {
        const res = await fetch(`${BASE}/api/knowledge-base/${id}`);
        if (res.ok) {
          const updated = await res.json();
          setArticles((prev) => prev.map((a) => (a.id === id ? updated : a)));
        }
      } catch { /* non-critical — view count increment failure shouldn't block reading */ }
    }
  };

  return (
    <RoleAwareShell
      title={{ ar: "مركز المساعدة", fr: "Centre d'aide", en: "Help Center" }[lang]}
      subtitle={{ ar: "إجابات على أسئلتك حول المنصة", fr: "Réponses à vos questions sur la plateforme", en: "Answers to your questions about the platform" }[lang]}
    >
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-7 h-7 text-violet-600" />
          </div>
          <h1 className="text-2xl font-black text-foreground mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>
            {{ ar: "كيف يمكننا مساعدتك؟", fr: "Comment pouvons-nous vous aider ?", en: "How can we help you?" }[lang]}
          </h1>
          <div className="relative max-w-md mx-auto mt-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={{ ar: "ابحثي في الأسئلة الشائعة...", fr: "Rechercher dans l'aide...", en: "Search help articles..." }[lang]}
              className="pl-10 h-11 bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-center mb-6">
          <button
            onClick={() => setCategory("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${category === "all" ? "bg-black text-white" : "bg-white border border-border text-foreground hover:border-black"}`}
          >
            {{ ar: "الكل", fr: "Tous", en: "All" }[lang]}
          </button>
          {Object.keys(categoryConfig).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${category === cat ? "bg-black text-white" : "bg-white border border-border text-foreground hover:border-black"}`}
            >
              {categoryConfig[cat].icon}
              {categoryConfig[cat].label[lang]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-white border border-border rounded-xl animate-pulse" />)}</div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 bg-white border border-border rounded-2xl">
            <HelpCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm font-semibold">
              {{ ar: "لا توجد مقالات مطابقة", fr: "Aucun article trouvé", en: "No articles found" }[lang]}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {articles.map((article) => {
              const isExpanded = expandedId === article.id;
              const cat = categoryConfig[article.category];
              return (
                <div key={article.id} className="bg-white border border-border rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleExpand(article.id)}
                    className="w-full flex items-center gap-3 p-4 text-left"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-foreground font-semibold text-sm truncate">{article.title}</span>
                      {cat && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100 shrink-0">
                          {cat.icon}{cat.label[lang]}
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0"><Eye className="w-3 h-3" />{article.viewCount}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border pt-4">
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{article.content}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </RoleAwareShell>
  );
}
