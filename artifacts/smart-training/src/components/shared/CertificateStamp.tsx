import { useId } from "react";

const RING_TEXT = "TAMAYYUZ ALGERIA • PLATEFORME DE FORMATION CERTIFIÉE • ";

export function CertificateStamp({ code, size = 128, color = "#1e293b" }: { code: string; size?: number; color?: string }) {
  const ringId = `cert-stamp-ring-${useId()}`;
  return (
    <div style={{ width: size, height: size, transform: "rotate(-7deg)", mixBlendMode: "multiply" }} className="shrink-0">
      <svg viewBox="0 0 160 160" width={size} height={size}>
        <defs>
          <path id={ringId} d="M 80,80 m -62,0 a 62,62 0 1,1 124,0 a 62,62 0 1,1 -124,0" />
        </defs>
        <circle cx="80" cy="80" r="76" fill="none" stroke={color} strokeWidth="1.5" opacity="0.85" />
        <circle cx="80" cy="80" r="68" fill="none" stroke={color} strokeWidth="1" opacity="0.7" />
        <circle cx="80" cy="80" r="46" fill="none" stroke={color} strokeWidth="1" opacity="0.7" />
        <text fill={color} opacity="0.85" fontSize="8.4" fontWeight="700" letterSpacing="2">
          <textPath href={`#${ringId}`} startOffset="0%">{RING_TEXT}</textPath>
        </text>
        <g stroke={color} strokeWidth="1.6" fill="none" opacity="0.85" strokeLinecap="round" strokeLinejoin="round">
          <path d="M80 48 L96 58 L96 74 C96 88 89 98 80 102 C71 98 64 88 64 74 L64 58 Z" />
          <path d="M73 78 L78 84 L89 70" />
        </g>
        <text x="80" y="122" textAnchor="middle" fill={color} opacity="0.85" fontSize="7" fontWeight="700" letterSpacing="1.5">VÉRIFIÉ</text>
        <text x="80" y="132" textAnchor="middle" fill={color} opacity="0.7" fontSize="6" letterSpacing="0.5">{code}</text>
      </svg>
    </div>
  );
}
