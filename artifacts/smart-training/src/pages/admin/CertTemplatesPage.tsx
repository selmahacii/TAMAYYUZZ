import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CertificateDocument } from "@/components/shared/CertificateDocument";
import { Award, Plus, Trash2, Pencil, Star, Eye, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CertTemplate {
  id: number;
  name: string;
  description: string | null;
  primaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  customTitleText: string | null;
  signatureTitle: string | null;
  fontFamily: "serif" | "sans" | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

const SAMPLE = {
  studentName: "Amine Mansour",
  courseName: "Marketing Digital Avancé",
  coachName: "Sofia Bensalem",
  issuedAt: new Date(2026, 0, 15).toISOString(),
  code: "APERCU-0001",
  examScore: 82,
};

export default function AdminCertTemplatesPage() {
  const { lang } = useI18n();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<CertTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<CertTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1e293b");
  const [accentColor, setAccentColor] = useState("#1e293b");
  const [logoUrl, setLogoUrl] = useState("");
  const [customTitleText, setCustomTitleText] = useState("");
  const [signatureTitle, setSignatureTitle] = useState("");
  const [fontFamily, setFontFamily] = useState<"serif" | "sans">("serif");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const token = localStorage.getItem("auth_token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/admin/certificate-templates`, { headers });
      setTemplates(await r.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrimaryColor("#1e293b");
    setAccentColor("#1e293b");
    setLogoUrl("");
    setCustomTitleText("");
    setSignatureTitle("");
    setFontFamily("serif");
    setIsDefault(false);
    setIsActive(true);
  };

  const handleOpenAdd = () => {
    setEditId(null);
    resetForm();
    setIsOpen(true);
  };

  const handleOpenEdit = (t: CertTemplate) => {
    setEditId(t.id);
    setName(t.name);
    setDescription(t.description ?? "");
    setPrimaryColor(t.primaryColor);
    setAccentColor(t.accentColor);
    setLogoUrl(t.logoUrl ?? "");
    setCustomTitleText(t.customTitleText ?? "");
    setSignatureTitle(t.signatureTitle ?? "");
    setFontFamily(t.fontFamily ?? "serif");
    setIsDefault(t.isDefault);
    setIsActive(t.isActive);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    const url = editId !== null ? `${BASE}/api/admin/certificate-templates/${editId}` : `${BASE}/api/admin/certificate-templates`;
    const method = editId !== null ? "PUT" : "POST";

    try {
      const r = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          primaryColor,
          accentColor,
          logoUrl: logoUrl || null,
          customTitleText: customTitleText.trim() || null,
          signatureTitle: signatureTitle.trim() || null,
          fontFamily,
          isDefault,
          isActive,
        })
      });
      if (r.ok) {
        toast({
          title: editId !== null
            ? { ar: "تم حفظ التعديلات", fr: "Modèle mis à jour", en: "Template updated" }[lang]
            : { ar: "تم إنشاء النموذج بنجاح", fr: "Modèle créé avec succès", en: "Template created successfully" }[lang]
        });
        setIsOpen(false);
        fetchTemplates();
      } else {
        throw new Error("Failed to save template");
      }
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      const res = await fetch(`${BASE}/api/admin/certificate-templates/${id}`, { method: "DELETE", headers });
      if (res.ok) {
        toast({ title: { ar: "تم الحذف", fr: "Modèle supprimé", en: "Deleted" }[lang] });
        setTemplates((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  return (
    <AdminLayout
      title={{ ar: "قوالب الشهادات", fr: "Modèles de certificats", en: "Certificate Templates" }[lang]}
      subtitle={{ ar: "المدربون يختارون أحد هذه القوالب عند إنشاء دوراتهم", fr: "Les coachs choisissent un de ces modèles à la création de leur formation", en: "Coaches pick one of these templates when creating their course" }[lang]}
    >
      <div className="flex justify-end mb-6">
        <Button onClick={handleOpenAdd} className="flex items-center gap-2 bg-black hover:bg-black/90 text-white font-bold shadow-sm">
          <Plus className="w-4 h-4" />
          {{ ar: "نموذج جديد", fr: "Nouveau modèle", en: "New Template" }[lang]}
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-56 bg-white border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-border rounded-xl overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              style={t.isDefault ? { border: `2px solid ${t.accentColor}` } : undefined}
            >
              <div className="h-32 p-3 bg-muted/20 border-b border-border flex items-center justify-center overflow-hidden">
                <div className="w-[300%] shrink-0 origin-center" style={{ transform: "scale(0.28)" }}>
                  <CertificateDocument
                    studentName={SAMPLE.studentName} courseName={SAMPLE.courseName} coachName={SAMPLE.coachName}
                    issuedAt={SAMPLE.issuedAt} code={SAMPLE.code} examScore={SAMPLE.examScore}
                    template={t} lang={lang}
                  />
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">{t.name}</span>
                      {t.isDefault && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
                    </div>
                    {t.description && (
                      <p className="text-muted-foreground text-[10px] mt-0.5 line-clamp-1 leading-relaxed">{t.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(t)} className="w-7 h-7 p-0 border-border text-foreground hover:bg-muted">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPendingDelete(t)} className="w-7 h-7 p-0 border-rose-100 text-rose-700 hover:bg-rose-50/50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3 mt-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full border border-border shadow-2xs" style={{ backgroundColor: t.primaryColor }} title="Primary" />
                    <div className="w-4 h-4 rounded-full border border-border shadow-2xs" style={{ backgroundColor: t.accentColor }} title="Accent" />
                  </div>
                  <div className="flex items-center gap-2">
                    {!t.isActive && (
                      <Badge variant="outline" className="border-rose-100 text-rose-700 bg-rose-50/50 text-[10px] py-0">
                        {{ ar: "غير نشط", fr: "Inactif", en: "Inactive" }[lang]}
                      </Badge>
                    )}
                    {t.isDefault && (
                      <span className="text-[10px] font-bold text-amber-700">{{ ar: "افتراضي", fr: "Par défaut", en: "Default" }[lang]}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={handleOpenAdd}
            className="border-2 border-dashed border-border hover:border-black/35 rounded-xl bg-white hover:bg-muted/10 p-5 h-64 flex flex-col items-center justify-center gap-3 transition-colors text-center shrink-0"
          >
            <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center text-muted-foreground border">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-foreground text-sm block">{{ ar: "إنشاء نموذج جديد", fr: "Créer un modèle", en: "Create Template" }[lang]}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5 block px-4">
                {{ ar: "تصميم مظهر جديد للشهادات التقديرية", fr: "Créer un nouveau style pour les attestations", en: "Design a new style for certificates" }[lang]}
              </span>
            </div>
          </button>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) setIsOpen(false); }}>
        <DialogContent className="max-w-5xl bg-white border border-border p-6 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground font-black">
              {editId !== null
                ? { ar: "تعديل نموذج الشهادة", fr: "Modifier le modèle de certificat", en: "Edit Certificate Template" }[lang]
                : { ar: "إنشاء نموذج شهادة جديد", fr: "Créer un modèle de certificat", en: "Create Certificate Template" }[lang]}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {{ ar: "تخصيص الألوان والشعار والنصوص لتصميم شهادة موحّد وبسيط", fr: "Personnalisez couleurs, logo et textes pour un design de certificat sobre et unifié", en: "Customize colors, logo and text for a unified, minimalist certificate design" }[lang]}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
            <form onSubmit={handleSubmit} className="space-y-4 text-xs max-h-[65vh] overflow-y-auto pr-2">
              <div className="space-y-1">
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                  {{ ar: "اسم النموذج", fr: "Nom du modèle", en: "Template Name" }[lang]} *
                </label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Modèle Standard" required className="bg-white border-border text-foreground font-semibold" />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                  {{ ar: "ملاحظة داخلية (اختياري)", fr: "Note interne (optionnel)", en: "Internal note (optional)" }[lang]}
                </label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Utilisé pour les cours professionnels" className="bg-white border-border text-foreground" />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                  {{ ar: "عنوان الشهادة", fr: "Titre affiché sur le certificat", en: "Certificate title text" }[lang]}
                </label>
                <Input value={customTitleText} onChange={(e) => setCustomTitleText(e.target.value)} placeholder="Certificat de réussite" className="bg-white border-border text-foreground font-bold" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">{{ ar: "اللون الأساسي", fr: "Couleur principale", en: "Primary Color" }[lang]}</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-transparent p-0 shrink-0" />
                    <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono text-xs text-foreground bg-white border-border font-bold uppercase" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">{{ ar: "لون التمييز", fr: "Couleur d'accentuation", en: "Accent Color" }[lang]}</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-transparent p-0 shrink-0" />
                    <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="font-mono text-xs text-foreground bg-white border-border font-bold uppercase" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">{{ ar: "نوع خط اسم الطالب", fr: "Police du nom", en: "Name Font" }[lang]}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["serif", "sans"] as const).map((font) => (
                    <button key={font} type="button" onClick={() => setFontFamily(font)}
                      className={`py-2 px-1 text-center font-bold border rounded-lg transition-all capitalize ${fontFamily === font ? "bg-black border-black text-white" : "bg-white border-border text-muted-foreground hover:bg-muted"}`}>
                      {font}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                  {{ ar: "توقيع الجهة المصدرة", fr: "Titre de signature", en: "Signature Title" }[lang]}
                </label>
                <Input value={signatureTitle} onChange={(e) => setSignatureTitle(e.target.value)} placeholder="Direction Tamayyuz" className="bg-white border-border text-foreground" />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                  {{ ar: "رابط شعار المؤسسة (اختياري)", fr: "URL du Logo (optionnel)", en: "Logo URL (optional)" }[lang]}
                </label>
                <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className="bg-white border-border text-foreground" />
              </div>

              <div className="flex gap-6 py-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="w-4 h-4 rounded border-border text-black focus:ring-black" />
                  <span className="text-xs text-foreground font-semibold">{{ ar: "تعيين كقالب افتراضي", fr: "Définir par défaut", en: "Set as default template" }[lang]}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded border-border text-black focus:ring-black" />
                  <span className="text-xs text-foreground font-semibold">{{ ar: "النموذج نشط", fr: "Modèle actif", en: "Template is active" }[lang]}</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1 border-border text-foreground">
                  {{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}
                </Button>
                <Button type="submit" disabled={saving} className="flex-1 bg-black hover:bg-black/90 text-white font-bold">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  {{ ar: "حفظ", fr: "Enregistrer", en: "Save" }[lang]}
                </Button>
              </div>
            </form>

            <div className="border border-border rounded-xl p-4 bg-muted/20 flex flex-col justify-between overflow-hidden">
              <div>
                <div className="flex items-center gap-2 border-b border-border pb-3 mb-3">
                  <Eye className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {{ ar: "معاينة حية لتصميم الشهادة", fr: "Aperçu en direct (identique au résultat réel)", en: "Live preview (identical to the real output)" }[lang]}
                  </span>
                </div>
                <div className="w-full overflow-hidden origin-top" style={{ transform: "scale(0.62)", marginBottom: "-30%" }}>
                  <CertificateDocument
                    studentName={SAMPLE.studentName} courseName={SAMPLE.courseName} coachName={SAMPLE.coachName}
                    issuedAt={SAMPLE.issuedAt} code={SAMPLE.code} examScore={SAMPLE.examScore}
                    template={{ primaryColor, accentColor, logoUrl, customTitleText, signatureTitle, fontFamily }}
                    lang={lang}
                  />
                </div>
              </div>

              <div className="mt-4 p-3 bg-neutral-50 rounded-lg border flex items-center gap-3">
                <Award className="w-5 h-5 text-neutral-500 shrink-0" />
                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                  {{ ar: "هذه المعاينة هي بالضبط نفس مكوّن عرض الشهادة الحقيقية.", fr: "Cet aperçu utilise exactement le même composant que le certificat réel.", en: "This preview uses the exact same component as the real certificate." }[lang]}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{{ ar: "حذف هذا القالب؟", fr: "Supprimer ce modèle ?", en: "Delete this template?" }[lang]}</AlertDialogTitle>
            <AlertDialogDescription>
              {{
                ar: `سيتم حذف "${pendingDelete?.name}" نهائيًا. الدورات المرتبطة به ستستخدم القالب الافتراضي بدلاً منه.`,
                fr: `"${pendingDelete?.name}" sera supprimé définitivement. Les formations qui l'utilisaient basculeront sur le modèle par défaut.`,
                en: `"${pendingDelete?.name}" will be permanently deleted. Courses using it will fall back to the default template.`,
              }[lang]}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{{ ar: "إلغاء", fr: "Annuler", en: "Cancel" }[lang]}</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingDelete && handleDelete(pendingDelete.id)} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {{ ar: "حذف", fr: "Supprimer", en: "Delete" }[lang]}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
