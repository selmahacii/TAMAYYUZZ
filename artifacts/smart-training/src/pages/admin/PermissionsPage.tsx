import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/i18n";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, ShieldAlert, Info, Check, X } from "lucide-react";

interface PermissionItem {
  key: string;
  label: Record<string, string>;
  allowed: boolean;
}

interface RoleConfig {
  roleKey: "student" | "coach" | "admin";
  name: Record<string, string>;
  badgeBg: string;
  badgeText: string;
  permissions: PermissionItem[];
}

// This matrix documents the platform's fixed, backend-enforced role capabilities
// (see requireAuth/requireRole middleware + ownership checks in artifacts/api-server/src/routes).
// It is read-only reference documentation, not a live/editable permission engine.
const ROLES: RoleConfig[] = [
  {
    roleKey: "student",
    name: { ar: "طالبة", fr: "Étudiante", en: "Student" },
    badgeBg: "bg-amber-50 border-amber-100",
    badgeText: "text-amber-700",
    permissions: [
      { key: "browse_courses", label: { ar: "تصفح الدورات", fr: "Parcourir les formations", en: "Browse courses" }, allowed: true },
      { key: "enroll_courses", label: { ar: "التسجيل في دورة", fr: "S'inscrire à une formation", en: "Enroll in courses" }, allowed: true },
      { key: "complete_lessons", label: { ar: "إكمال الدروس", fr: "Compléter les leçons", en: "Complete lessons" }, allowed: true },
      { key: "earn_certificates", label: { ar: "الحصول على شهادة", fr: "Obtenir un certificat", en: "Earn certificates" }, allowed: true },
      { key: "create_courses", label: { ar: "إنشاء دورة", fr: "Créer une formation", en: "Create courses" }, allowed: false },
      { key: "manage_users", label: { ar: "إدارة المستخدمين", fr: "Gérer les utilisateurs", en: "Manage users" }, allowed: false },
    ],
  },
  {
    roleKey: "coach",
    name: { ar: "مدربة", fr: "Coach", en: "Coach" },
    badgeBg: "bg-purple-50 border-purple-100",
    badgeText: "text-purple-700",
    permissions: [
      { key: "create_courses", label: { ar: "إنشاء وتحرير الدورات", fr: "Créer et modifier des formations", en: "Create & edit courses" }, allowed: true },
      { key: "manage_lessons", label: { ar: "إدارة الدروس والفصول", fr: "Gérer les leçons et chapitres", en: "Manage lessons & chapters" }, allowed: true },
      { key: "track_progress", label: { ar: "متابعة تقدم الطلاب", fr: "Suivre la progression des étudiantes", en: "Track student progress" }, allowed: true },
      { key: "post_ads", label: { ar: "نشر إعلانات", fr: "Publier des annonces", en: "Post announcements" }, allowed: true },
      { key: "request_prices", label: { ar: "طلب تعديل السعر", fr: "Demander modification de prix", en: "Request price changes" }, allowed: true },
      { key: "manage_users", label: { ar: "إدارة المستخدمين", fr: "Gérer les utilisateurs", en: "Manage users" }, allowed: false },
      { key: "access_admin", label: { ar: "الوصول للوحة الإدارة", fr: "Accéder au panneau admin", en: "Access admin panel" }, allowed: false },
    ],
  },
  {
    roleKey: "admin",
    name: { ar: "مديرة", fr: "Admin", en: "Admin" },
    badgeBg: "bg-rose-50 border-rose-100",
    badgeText: "text-rose-700",
    permissions: [
      { key: "coach_permissions", label: { ar: "جميع صلاحيات المدربة", fr: "Toutes les permissions coach", en: "All coach permissions" }, allowed: true },
      { key: "manage_users", label: { ar: "إدارة المستخدمين", fr: "Gérer les utilisateurs", en: "Manage users" }, allowed: true },
      { key: "approve_coaches", label: { ar: "الموافقة على المدربين", fr: "Approuver les coachs", en: "Approve coaches" }, allowed: true },
      { key: "manage_revenue", label: { ar: "إدارة الإيرادات", fr: "Gérer les revenus", en: "Manage revenue" }, allowed: true },
      { key: "access_admin", label: { ar: "الوصول للوحة الإدارة", fr: "Accéder au panneau admin", en: "Access admin panel" }, allowed: true },
      { key: "view_audit", label: { ar: "عرض سجل المراجعة", fr: "Voir le journal d'audit", en: "View audit log" }, allowed: true },
      { key: "manage_certs", label: { ar: "إدارة قوالب الشهادات", fr: "Gérer les modèles de certificats", en: "Manage cert templates" }, allowed: true },
    ],
  },
];

export default function AdminPermissionsPage() {
  const { lang } = useI18n();

  return (
    <AdminLayout
      title={{ ar: "صلاحيات الأدوار", fr: "Permissions par rôle", en: "Role Permissions" }[lang]}
      subtitle={{ ar: "نظرة عامة مرجعية على صلاحيات كل دور", fr: "Référence des droits appliqués par rôle", en: "Reference overview of permissions by role" }[lang]}
    >
      <div className="flex items-center gap-2 mb-6 bg-white border border-border p-4 rounded-xl shadow-2xs">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <span className="text-xs text-muted-foreground font-semibold">
          {{
            ar: "هذه الصلاحيات مطبّقة فعليًا على مستوى الخادم (لا يمكن تعديلها من هنا)",
            fr: "Ces permissions sont appliquées côté serveur pour chaque requête (non modifiables ici)",
            en: "These permissions are actively enforced server-side on every request (not editable here)",
          }[lang]}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ROLES.map((role) => {
          const allowedCount = role.permissions.filter((p) => p.allowed).length;
          const totalCount = role.permissions.length;

          return (
            <div key={role.roleKey} className="bg-white border border-border rounded-xl overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
              <div>
                <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-foreground shrink-0" />
                    <h3 className="font-bold text-foreground text-sm" style={{ fontFamily: "Cairo, sans-serif" }}>
                      {role.name[lang]}
                    </h3>
                  </div>
                  <Badge variant="outline" className={`${role.badgeBg} ${role.badgeText} text-[10px] py-0`}>
                    {allowedCount}/{totalCount}
                  </Badge>
                </div>

                <div className="p-4 space-y-3.5">
                  {role.permissions.map((perm) => (
                    <div key={perm.key} className="flex items-center justify-between gap-3">
                      <span className={`text-xs font-medium leading-normal ${perm.allowed ? "text-foreground" : "text-muted-foreground/60"}`}>
                        {perm.label[lang]}
                      </span>
                      {perm.allowed ? (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-[#fafafa] border-t border-border flex items-center gap-2 text-[10px] text-muted-foreground font-semibold">
                {allowedCount === totalCount ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{{ ar: "صلاحيات كاملة لهذا الدور", fr: "Accès complet accordé", en: "Full administrative access" }[lang]}</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{totalCount - allowedCount} {{ ar: "صلاحيات مقيدة", fr: "permissions restreintes", en: "restricted permissions" }[lang]}</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-[#fafafa] border border-border rounded-xl shadow-2xs flex items-center gap-3">
        <Info className="w-5 h-5 text-muted-foreground shrink-0" />
        <p className="text-muted-foreground text-xs font-semibold leading-relaxed">
          {{
            ar: "هذا الجدول مرجعي للاطلاع فقط. الأدوار الثلاثة (طالبة، مدربة، مديرة) وصلاحياتها محددة ومطبّقة في كود الخادم، وليست قابلة للتخصيص من الواجهة حاليًا.",
            fr: "Ce tableau est fourni à titre de référence. Les trois rôles (étudiante, coach, admin) et leurs permissions sont définis et appliqués dans le code serveur — ils ne sont pas personnalisables depuis cette interface pour le moment.",
            en: "This table is provided for reference only. The three roles (student, coach, admin) and their permissions are defined and enforced in the server code — they are not customizable from this interface at this time.",
          }[lang]}
        </p>
      </div>
    </AdminLayout>
  );
}
