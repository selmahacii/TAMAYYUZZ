import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { RoleAwareShell } from "@/components/shared/RoleAwareShell";
import { CertificateDocument, type CertificateTemplateStyle } from "@/components/shared/CertificateDocument";
import { useI18n } from "@/i18n";
import { CheckCircle, ArrowLeft, XCircle, Printer, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Certificate {
  id: number; certificateCode: string; issuedAt: string;
  studentName: string; courseName: string; coachName: string;
  examScore?: number | null; template: CertificateTemplateStyle;
}

export default function CertificatePublicPage() {
  const params = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { lang } = useI18n();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

  useEffect(() => {
    if (!params.code) return;
    fetch(`${BASE}/api/certificates/${params.code}`)
      .then((r) => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then((data) => {
        if (data) {
          setCert(data);
          // Check if print query param is present
          if (new URLSearchParams(window.location.search).get("print") === "true") {
            setTimeout(() => window.print(), 600);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [params.code]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
      <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
    </div>
  );

  if (notFound || !cert) return (
    <RoleAwareShell>
      <div className="flex flex-col items-center justify-center py-24">
        <XCircle className="w-16 h-16 text-rose-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">{{ ar: "الشهادة غير موجودة", fr: "Certificat non trouvé", en: "Certificate not found" }[lang]}</h2>
        <p className="text-muted-foreground text-sm mb-6">{{ ar: "هذه الشهادة غير موجودة أو غير صالحة", fr: "Ce certificat n'existe pas ou est invalide", en: "This certificate doesn't exist or is invalid" }[lang]}</p>
        <Button onClick={() => setLocation("/marketplace")} className="bg-black hover:bg-black/90 text-white font-bold shadow-sm border border-black">
          {{ ar: "العودة", fr: "Retour", en: "Back" }[lang]}
        </Button>
      </div>
    </RoleAwareShell>
  );

  return (
    <RoleAwareShell title={{ ar: "الشهادة", fr: "Certificat", en: "Certificate" }[lang]}>
      <div className="max-w-3xl mx-auto">
        <button onClick={() => window.history.back()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors print:hidden">
          <ArrowLeft className="w-4 h-4" /> {{ ar: "رجوع", fr: "Retour", en: "Back" }[lang]}
        </button>

        <div className="flex items-center gap-2 justify-center mb-6 print:hidden">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span className="text-emerald-700 text-xs font-bold tracking-wide">{{ ar: "شهادة موثّقة وأصلية", fr: "Certificat vérifié et authentique", en: "Verified and authentic certificate" }[lang]}</span>
        </div>

        <CertificateDocument
          studentName={cert.studentName}
          courseName={cert.courseName}
          coachName={cert.coachName}
          issuedAt={cert.issuedAt}
          code={cert.certificateCode}
          examScore={cert.examScore}
          template={cert.template}
          lang={lang}
        />

        {/* Share / Print */}
        <div className="flex gap-3 mt-6 justify-center print:hidden">
          <Button onClick={() => window.print()} variant="outline" className="gap-2 text-sm">
            <Printer className="w-4 h-4" /> {{ ar: "طباعة", fr: "Imprimer", en: "Print" }[lang]}
          </Button>
          <Button onClick={() => {
            navigator.clipboard.writeText(window.location.href);
          }} variant="outline" className="gap-2 text-sm">
            <Link2 className="w-4 h-4" /> {{ ar: "نسخ الرابط", fr: "Copier le lien", en: "Copy link" }[lang]}
          </Button>
        </div>
      </div>
    </RoleAwareShell>
  );
}
