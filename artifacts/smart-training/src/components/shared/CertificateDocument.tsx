import { Calendar, GraduationCap } from "lucide-react";
import { CertificateStamp } from "./CertificateStamp";

export interface CertificateTemplateStyle {
  primaryColor: string;
  accentColor: string;
  logoUrl?: string | null;
  customTitleText?: string | null;
  signatureTitle?: string | null;
  fontFamily?: string | null;
}

interface CertificateDocumentProps {
  studentName: string;
  courseName: string;
  coachName: string;
  issuedAt: string;
  code: string;
  examScore?: number | null;
  template: CertificateTemplateStyle;
  lang: "ar" | "fr" | "en";
}

export function CertificateDocument({ studentName, courseName, coachName, issuedAt, code, examScore, template, lang }: CertificateDocumentProps) {
  const nameFont = template.fontFamily === "sans" ? "inherit" : "Georgia, 'Times New Roman', serif";
  const eyebrow = template.customTitleText?.trim() || { ar: "شهادة إتمام", fr: "Certificat de réussite", en: "Certificate of completion" }[lang];
  const signatureLabel = template.signatureTitle?.trim() || { ar: "إدارة تميّز", fr: "Direction Tamayyuz", en: "Tamayyuz Board" }[lang];
  const localeMap = { ar: "ar-DZ", fr: "fr-DZ", en: "en-US" } as const;
  const issuedDate = new Date(issuedAt).toLocaleDateString(localeMap[lang], { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="bg-white border border-neutral-900 p-1.5 relative overflow-hidden">
      <div className="border border-neutral-300 px-10 py-12 sm:px-16 sm:py-16 relative">
        {/* Subtle official watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] select-none">
          <img src="/favicon.png" alt="" className="w-80 h-80 object-contain grayscale" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-neutral-200 relative z-10">
          <div className="flex items-center gap-3.5">
            {template.logoUrl ? (
              <img src={template.logoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-contain" />
            ) : (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white border border-neutral-200 shadow-xs p-1.5">
                <img src="/favicon.png" alt="Tamayyuz Logo" className="w-full h-full object-contain" />
              </div>
            )}
            <div>
              <span className="text-lg font-black tracking-tight text-neutral-900" style={{ fontFamily: "Cairo, sans-serif" }}>Tamayyuz</span>
              <p className="text-[10px] text-neutral-500 font-bold tracking-wider uppercase">Plateforme de formation certifiée</p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-neutral-400 tracking-wide">N° {code}</span>
        </div>

        {/* Body */}
        <div className="text-center py-10">
          <p className="text-[11px] font-bold tracking-[0.25em] text-neutral-400 uppercase mb-8">{eyebrow}</p>

          <p className="text-sm text-neutral-500 mb-3">{{ ar: "تُمنح هذه الشهادة إلى", fr: "Décerné à", en: "Awarded to" }[lang]}</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-neutral-900 mb-3" style={{ fontFamily: nameFont }}>{studentName}</h2>
          <div className="w-16 h-px mx-auto mb-8" style={{ backgroundColor: template.accentColor }} />

          <p className="text-sm text-neutral-500 max-w-md mx-auto leading-relaxed">
            {{ ar: "لإتمامها بنجاح الدورة التدريبية", fr: "pour avoir complété avec succès la formation", en: "for successfully completing the course" }[lang]}
          </p>
          <h3 className="text-xl font-bold text-neutral-900 mt-2">{courseName}</h3>
          <p className="text-sm text-neutral-500 mt-1">
            {{ ar: "بإشراف", fr: "Animée par", en: "Led by" }[lang]} <span className="text-neutral-700 font-medium">{coachName}</span>
          </p>
          {typeof examScore === "number" && (
            <p className="text-xs text-neutral-400 mt-3">
              {{ ar: "نتيجة الامتحان النهائي", fr: "Examen final", en: "Final exam" }[lang]} : <span className="font-bold text-neutral-600">{examScore}/100</span>
            </p>
          )}
        </div>

        {/* Footer: signature block + concrete platform seal */}
        <div className="flex items-end justify-between pt-8 border-t border-neutral-200">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-4">
              <Calendar className="w-3.5 h-3.5" />
              {issuedDate}
            </div>
            <div className="w-36 border-t border-neutral-400 pt-1.5">
              <p className="text-xs font-semibold text-neutral-700">{signatureLabel}</p>
              <p className="text-[10px] text-neutral-400">{{ ar: "توقيع معتمد", fr: "Signature autorisée", en: "Authorized signature" }[lang]}</p>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <CertificateStamp code={code} size={112} color={template.primaryColor} />
          </div>
        </div>
      </div>
    </div>
  );
}
