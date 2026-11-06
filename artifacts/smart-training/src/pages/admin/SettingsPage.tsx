import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Settings, Globe, Shield, Percent, Save, AlertTriangle, Loader2 } from "lucide-react";

interface PlatformSettings {
  id: number;
  platformName: string;
  platformEmail: string;
  defaultCurrency: string;
  defaultCommissionRate: string;
  maxCoursesPerCoach: string;
  requireCoachApproval: boolean;
  requireAdApproval: boolean;
  allowFreeCoachRegistration: boolean;
  maintenanceMode: boolean;
}

export default function AdminSettingsPage() {
  const { lang } = useI18n();
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: saved, isLoading } = useQuery<PlatformSettings>({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  useEffect(() => { if (saved && !settings) setSettings(saved); }, [saved]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<PlatformSettings>) => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: (updated: PlatformSettings) => {
      setSettings(updated);
      queryClient.setQueryData(["admin", "settings"], updated);
      toast({ title: { ar: "تم الحفظ", fr: "Paramètres enregistrés", en: "Settings saved" }[lang] });
    },
    onError: (err: any) => {
      toast({ title: { ar: "خطأ", fr: "Erreur", en: "Error" }[lang], description: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!settings) return;
    const { id, ...payload } = settings;
    saveMutation.mutate(payload);
  };

  const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="bg-white border border-border shadow-sm rounded-2xl p-6">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-5">
        <span className="text-violet-600">{icon}</span>
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="text-xs text-muted-foreground mb-1.5 block font-medium">{label}</label>
      {children}
    </div>
  );

  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-foreground/80">{label}</span>
      <button onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-all duration-200 ${checked ? "bg-violet-600" : "bg-muted"}`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${checked ? "left-5.5" : "left-0.5"}`}
          style={{ left: checked ? "calc(100% - 1.375rem)" : "0.125rem" }} />
      </button>
    </div>
  );

  if (isLoading || !settings) {
    return (
      <AdminLayout
        title={{ ar: "إعدادات المنصة", fr: "Paramètres de la plateforme", en: "Platform Settings" }[lang]}
        subtitle={{ ar: "تكوين وإعداد منصة تميّز", fr: "Configurer la plateforme Tamayyuz", en: "Configure the Tamayyuz platform" }[lang]}
      >
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={{ ar: "إعدادات المنصة", fr: "Paramètres de la plateforme", en: "Platform Settings" }[lang]}
      subtitle={{ ar: "تكوين وإعداد منصة التدريب الذكي", fr: "Configurer la plateforme Tamayyuz", en: "Configure the Tamayyuz platform" }[lang]}
    >
      <div className="max-w-2xl space-y-6">
        {/* General */}
        <Section title={{ ar: "الإعدادات العامة", fr: "Paramètres généraux", en: "General Settings" }[lang]} icon={<Globe className="w-4 h-4" />}>
          <Field label={{ ar: "اسم المنصة", fr: "Nom de la plateforme", en: "Platform name" }[lang]}>
            <Input value={settings.platformName} onChange={(e) => setSettings((s) => s && ({ ...s, platformName: e.target.value }))} />
          </Field>
          <Field label={{ ar: "البريد الإلكتروني", fr: "Email de contact", en: "Contact email" }[lang]}>
            <Input type="email" value={settings.platformEmail} onChange={(e) => setSettings((s) => s && ({ ...s, platformEmail: e.target.value }))} />
          </Field>
          <Field label={{ ar: "العملة الافتراضية", fr: "Devise par défaut", en: "Default currency" }[lang]}>
            <select value={settings.defaultCurrency} onChange={(e) => setSettings((s) => s && ({ ...s, defaultCurrency: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm text-foreground bg-white border border-border outline-none">
              <option value="DZD">DZD — Dinar Algérien</option>
              <option value="EUR">EUR — Euro</option>
              <option value="USD">USD — Dollar américain</option>
            </select>
          </Field>
        </Section>

        {/* Finances */}
        <Section title={{ ar: "الإعدادات المالية", fr: "Paramètres financiers", en: "Financial Settings" }[lang]} icon={<Percent className="w-4 h-4" />}>
          <Field label={{ ar: "نسبة عمولة المدرب (%) افتراضية", fr: "Taux de commission coach (%) par défaut", en: "Default coach commission rate (%)" }[lang]}>
            <Input type="number" min="0" max="100" value={settings.defaultCommissionRate}
              onChange={(e) => setSettings((s) => s && ({ ...s, defaultCommissionRate: e.target.value }))} />
          </Field>
          <Field label={{ ar: "الحد الأقصى للدورات لكل مدرب", fr: "Nb max de formations par coach", en: "Max courses per coach" }[lang]}>
            <Input type="number" min="1" value={settings.maxCoursesPerCoach}
              onChange={(e) => setSettings((s) => s && ({ ...s, maxCoursesPerCoach: e.target.value }))} />
          </Field>
        </Section>

        {/* Moderation */}
        <Section title={{ ar: "الإشراف والموافقة", fr: "Modération & Approbation", en: "Moderation & Approval" }[lang]} icon={<Shield className="w-4 h-4" />}>
          <Toggle checked={settings.requireCoachApproval} onChange={(v) => setSettings((s) => s && ({ ...s, requireCoachApproval: v }))}
            label={{ ar: "تتطلب المدربين الجدد الموافقة", fr: "Approbation manuelle des nouveaux coachs", en: "Require manual coach approval" }[lang]} />
          <Toggle checked={settings.requireAdApproval} onChange={(v) => setSettings((s) => s && ({ ...s, requireAdApproval: v }))}
            label={{ ar: "تتطلب الإعلانات الموافقة", fr: "Approbation manuelle des publicités", en: "Require ad approval" }[lang]} />
          <Toggle checked={settings.allowFreeCoachRegistration} onChange={(v) => setSettings((s) => s && ({ ...s, allowFreeCoachRegistration: v }))}
            label={{ ar: "السماح بتسجيل المدربين مجاناً", fr: "Permettre inscription gratuite des coachs", en: "Allow free coach registration" }[lang]} />
        </Section>

        {/* Maintenance */}
        <Section title={{ ar: "الصيانة", fr: "Maintenance", en: "Maintenance" }[lang]} icon={<Settings className="w-4 h-4" />}>
          <Toggle checked={settings.maintenanceMode} onChange={(v) => setSettings((s) => s && ({ ...s, maintenanceMode: v }))}
            label={{ ar: "وضع الصيانة (يُعطّل المنصة للزوار)", fr: "Mode maintenance (désactive la plateforme)", en: "Maintenance mode (disables platform)" }[lang]} />
          {settings.maintenanceMode && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {{ ar: "تحذير: المنصة ستكون غير متاحة للمستخدمين", fr: "Attention : la plateforme sera inaccessible aux utilisateurs", en: "Warning: platform will be inaccessible to users" }[lang]}
            </div>
          )}
        </Section>

        <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full gap-2 font-bold text-sm h-11 bg-black hover:bg-black/90 text-white shadow-sm border border-black">
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {{ ar: "حفظ الإعدادات", fr: "Enregistrer les paramètres", en: "Save Settings" }[lang]}
        </Button>
      </div>
    </AdminLayout>
  );
}
