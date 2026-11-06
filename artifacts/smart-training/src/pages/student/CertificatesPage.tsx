import { useLocation } from "wouter";
import { useGetMyCertificates } from "@workspace/api-client-react";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { StudentLayout } from "@/components/student/StudentLayout";
import { Award, ExternalLink, Calendar, User, Download, Share2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StudentCertificatesPage() {
  const [, setLocation] = useLocation();
  const { lang } = useI18n();
  const { toast } = useToast();
  const { data: certs, isLoading } = useGetMyCertificates();

  return (
    <StudentLayout
      title={{ ar: "شهاداتي", fr: "Mes certificats", en: "My Certificates" }[lang]}
      subtitle={{ ar: "شهادات إتمام الدورات", fr: "Vos certificats de réussite", en: "Your certificates of completion" }[lang]}
    >
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-border shadow-2xs rounded-2xl h-48 animate-pulse" />
          ))}
        </div>
      ) : !certs || certs.length === 0 ? (
        <div className="text-center py-20 bg-white border border-border rounded-2xl">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 bg-amber-50">
            <Award className="w-10 h-10 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>
            {{ ar: "لا توجد شهادات بعد", fr: "Aucun certificat pour l'instant", en: "No certificates yet" }[lang]}
          </h3>
          <p className="text-muted-foreground mb-6 text-sm">{{ ar: "أكملي دورة للحصول على أول شهادة", fr: "Complétez une formation pour obtenir votre premier certificat", en: "Complete a course to earn your first certificate" }[lang]}</p>
          <Button onClick={() => setLocation("/student/my-courses")} className="bg-black hover:bg-black/90 text-white font-bold">
            {{ ar: "عرض دوراتي", fr: "Voir mes formations", en: "View my courses" }[lang]}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certs.map((cert) => (
            <div key={cert.id} className="bg-white border border-border rounded-2xl overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 bg-neutral-900 p-2">
                    <img src="/favicon.png" alt="Tamayyuz" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-sm leading-snug line-clamp-2" style={{ fontFamily: "Cairo, sans-serif" }}>{cert.courseName}</h3>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />{cert.coachName}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(cert.issuedAt).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-DZ", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground/70">Code :</span>
                    <code className="text-xs font-mono font-bold text-neutral-700">{cert.certificateCode}</code>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Button
                    onClick={() => setLocation(`/certificate/${cert.certificateCode}`)}
                    size="sm" className="gap-1.5 text-xs font-bold bg-black hover:bg-black/90 text-white">
                    <ExternalLink className="w-3.5 h-3.5" /> {{ ar: "عرض الشهادة", fr: "Consulter", en: "View" }[lang]}
                  </Button>
                  <Button
                    onClick={() => {
                      // Navigate to certificate and print directly
                      window.open(`/certificate/${cert.certificateCode}?print=true`, "_blank");
                    }}
                    variant="outline" size="sm" className="gap-1.5 text-xs font-bold border-neutral-300">
                    <Download className="w-3.5 h-3.5 text-neutral-800" /> {{ ar: "تحميل PDF", fr: "Télécharger PDF", en: "Download PDF" }[lang]}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    onClick={() => {
                      const BASE_URL = window.location.origin + (import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "");
                      navigator.clipboard.writeText(`${BASE_URL}/certificate/${cert.certificateCode}`);
                      toast({ title: { ar: "تم نسخ الرابط", fr: "Lien copié", en: "Link copied" }[lang] });
                    }}
                    variant="ghost" size="sm" className="text-[11px] h-8 text-muted-foreground hover:text-foreground">
                    <Share2 className="w-3 h-3" /> {{ ar: "نسخ الرابط", fr: "Copier lien", en: "Copy link" }[lang]}
                  </Button>

                  <a
                    href={`https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(cert.courseName)}&organizationName=Tamayyuz&certUrl=${encodeURIComponent(window.location.origin + `/certificate/${cert.certificateCode}`)}&certId=${encodeURIComponent(cert.certificateCode)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-blue-700 hover:text-blue-800 hover:underline h-8"
                  >
                    + LinkedIn
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </StudentLayout>
  );
}
