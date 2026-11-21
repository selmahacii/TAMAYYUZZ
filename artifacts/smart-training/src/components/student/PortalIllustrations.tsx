import React from "react";

// Flag SVGs with official aspect ratios and institutional colors (NO EMOJIS)
export function FlagDZ({ className = "w-4 h-3 inline-block" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 900 600" aria-label="علم الجزائر">
      <rect width="450" height="600" fill="#006233" />
      <rect x="450" width="450" height="600" fill="#ffffff" />
      <circle cx="450" cy="300" r="150" fill="#d21034" />
      <circle cx="485" cy="300" r="120" fill="#ffffff" />
      <polygon
        fill="#d21034"
        points="420,300 472,317 437,342 450,283 450,317"
        transform="rotate(-18 450 300)"
      />
    </svg>
  );
}

export function FlagSA({ className = "w-4 h-3 inline-block" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 900 600" aria-label="علم المملكة العربية السعودية">
      <rect width="900" height="600" fill="#006C35" />
      <path
        d="M200 430 h500 v20 h-500 z"
        fill="#ffffff"
      />
      <circle cx="450" cy="270" r="40" fill="#ffffff" opacity="0.9" />
    </svg>
  );
}

export function FlagEG({ className = "w-4 h-3 inline-block" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 900 600" aria-label="علم جمهورية مصر العربية">
      <rect width="900" height="200" fill="#C8102E" />
      <rect y="200" width="900" height="200" fill="#ffffff" />
      <rect y="400" width="900" height="200" fill="#000000" />
      <circle cx="450" cy="300" r="30" fill="#c5a059" />
    </svg>
  );
}

export function FlagMA({ className = "w-4 h-3 inline-block" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 900 600" aria-label="علم المملكة المغربية">
      <rect width="900" height="600" fill="#C1272D" />
      <polygon
        fill="none"
        stroke="#006233"
        strokeWidth="18"
        points="450,210 478,295 567,295 495,348 523,432 450,380 377,432 405,348 333,295 422,295"
      />
    </svg>
  );
}

export function FlagTN({ className = "w-4 h-3 inline-block" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 900 600" aria-label="علم الجمهورية التونسية">
      <rect width="900" height="600" fill="#E70013" />
      <circle cx="450" cy="300" r="120" fill="#ffffff" />
      <circle cx="460" cy="300" r="90" fill="#E70013" />
      <circle cx="485" cy="300" r="75" fill="#ffffff" />
      <polygon
        fill="#E70013"
        points="480,300 455,310 465,285 465,315 455,290"
        transform="scale(1.4) translate(-110,-60)"
      />
    </svg>
  );
}

export function FlagKW({ className = "w-4 h-3 inline-block" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 900 600" aria-label="علم دولة الكويت">
      <rect width="900" height="200" fill="#007A3D" />
      <rect y="200" width="900" height="200" fill="#ffffff" />
      <rect y="400" width="900" height="200" fill="#CE1126" />
      <polygon points="0,0 225,200 225,400 0,600" fill="#000000" />
    </svg>
  );
}

export function FlagJO({ className = "w-4 h-3 inline-block" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 900 600" aria-label="علم المملكة الأردنية الهاشمية">
      <rect width="900" height="200" fill="#000000" />
      <rect y="200" width="900" height="200" fill="#ffffff" />
      <rect y="400" width="900" height="200" fill="#007A3D" />
      <polygon points="0,0 300,300 0,600" fill="#CE1126" />
      <polygon points="120,300 128,290 140,295 133,306 138,318 126,312 118,322 118,310 106,305 116,295" fill="#ffffff" />
    </svg>
  );
}

// 3D Academic Mortarboard & Diploma Roll Illustration (For Educational Pillar)
export function EducationalPillarIcon({ className = "w-20 h-16" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Diploma Roll */}
      <ellipse cx="40" cy="98" rx="8" ry="14" fill="#E2C99D" transform="rotate(-15 40 98)" />
      <rect x="36" y="80" width="85" height="24" rx="4" fill="url(#diplomaGrad)" transform="rotate(-10 36 80)" />
      <path d="M72 82 L76 102" stroke="#B83232" strokeWidth="6" strokeLinecap="round" />
      <circle cx="74" cy="92" r="5" fill="#D4AF37" />

      {/* Graduation Cap (Mortarboard) */}
      <polygon points="80,18 152,44 80,70 8,44" fill="url(#capGrad)" filter="url(#dropShadow)" />
      {/* Cap Skull Underlayer */}
      <path d="M46 54 Q80 82 114 54 L114 68 Q80 96 46 68 Z" fill="#1E2A38" />
      <ellipse cx="80" cy="44" rx="5" ry="3" fill="#D4AF37" />
      {/* Gold Tassel */}
      <path d="M80 44 C82 56 122 60 126 84" stroke="#F1C40F" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="126" cy="85" r="3" fill="#D4AF37" />
      <path d="M123 88 L129 88 L130 102 L122 102 Z" fill="#E67E22" />

      <defs>
        <linearGradient id="capGrad" x1="8" y1="18" x2="152" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2C3E50" />
          <stop offset="0.5" stopColor="#1B2631" />
          <stop offset="1" stopColor="#17202A" />
        </linearGradient>
        <linearGradient id="diplomaGrad" x1="36" y1="80" x2="120" y2="104" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDFBF7" />
          <stop offset="0.7" stopColor="#F5E8C7" />
          <stop offset="1" stopColor="#E6D3A3" />
        </linearGradient>
        <filter id="dropShadow" x="0" y="14" width="160" height="66" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.25" />
        </filter>
      </defs>
    </svg>
  );
}

// 3D Golden Hands & Family/Self Figures (For Human Excellence Pillar)
export function HumanPillarIcon({ className = "w-20 h-16" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background soft glow */}
      <circle cx="80" cy="60" r="42" fill="#FCEAD2" opacity="0.6" />
      {/* People Silhouettes */}
      {/* Center Figure (Father/Mentor) */}
      <circle cx="80" cy="38" r="9" fill="#9C6B2F" />
      <path d="M70 54 Q80 48 90 54 L92 70 Q80 72 68 70 Z" fill="#B27E3B" />

      {/* Left Figure */}
      <circle cx="62" cy="46" r="7" fill="#C5934F" />
      <path d="M54 60 Q62 55 70 60 L71 74 Q62 76 53 74 Z" fill="#C5934F" />

      {/* Right Figure */}
      <circle cx="98" cy="46" r="7" fill="#C5934F" />
      <path d="M90 60 Q98 55 106 60 L107 74 Q98 76 89 74 Z" fill="#C5934F" />

      {/* Supporting Golden Hands */}
      <path
        d="M36 88 C48 78 72 82 80 84 C88 82 112 78 124 88 C116 100 88 104 80 102 C72 104 44 100 36 88 Z"
        fill="url(#goldHandsGrad)"
      />
      <path
        d="M44 86 C58 92 74 92 80 93 C86 92 102 92 116 86"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />

      <defs>
        <linearGradient id="goldHandsGrad" x1="36" y1="80" x2="124" y2="104" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F39C12" />
          <stop offset="0.5" stopColor="#D4AF37" />
          <stop offset="1" stopColor="#B78727" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// 3D Leather Briefcase (For Professional Pillar)
export function ProfessionalPillarIcon({ className = "w-20 h-16" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Handle */}
      <path d="M64 42 C64 30 96 30 96 42" stroke="#1D2A22" strokeWidth="5" strokeLinecap="round" fill="none" />
      <rect x="62" y="40" width="6" height="5" rx="1" fill="#D4AF37" />
      <rect x="92" y="40" width="6" height="5" rx="1" fill="#D4AF37" />

      {/* Main Bag Body */}
      <rect x="34" y="44" width="92" height="60" rx="7" fill="url(#leatherGrad)" />
      {/* Flap */}
      <path d="M34 44 L126 44 L120 74 C100 80 60 80 40 74 Z" fill="url(#flapGrad)" />

      {/* Metallic Clasps */}
      <rect x="52" y="70" width="8" height="12" rx="1.5" fill="#F1C40F" stroke="#B78727" strokeWidth="1" />
      <circle cx="56" cy="76" r="1.5" fill="#4A3414" />
      <rect x="100" y="70" width="8" height="12" rx="1.5" fill="#F1C40F" stroke="#B78727" strokeWidth="1" />
      <circle cx="104" cy="76" r="1.5" fill="#4A3414" />

      {/* Stitching details */}
      <path d="M38 48 L122 48" stroke="#3D5A47" strokeWidth="1" strokeDasharray="3 2" />
      <path d="M38 100 L122 100" stroke="#3D5A47" strokeWidth="1" strokeDasharray="3 2" />

      <defs>
        <linearGradient id="leatherGrad" x1="34" y1="44" x2="126" y2="104" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2D4436" />
          <stop offset="0.6" stopColor="#1B2E23" />
          <stop offset="1" stopColor="#122018" />
        </linearGradient>
        <linearGradient id="flapGrad" x1="34" y1="44" x2="126" y2="78" gradientUnits="userSpaceOnUse">
          <stop stopColor="#375543" />
          <stop offset="1" stopColor="#24382B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// 3D Books Stack (For Digital Library Pillar)
export function LibraryPillarIcon({ className = "w-20 h-16" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Book 1 (Bottom - Violet) */}
      <rect x="30" y="88" width="100" height="18" rx="3" fill="#5E338C" />
      <rect x="42" y="91" width="84" height="12" fill="#FBF8F3" />
      <line x1="36" y1="90" x2="36" y2="104" stroke="#D4AF37" strokeWidth="2" />

      {/* Book 2 (Middle - Plum) */}
      <rect x="36" y="72" width="90" height="16" rx="3" fill="#7D42B0" />
      <rect x="46" y="75" width="76" height="10" fill="#F5EFE6" />
      <line x1="42" y1="74" x2="42" y2="86" stroke="#D4AF37" strokeWidth="2" />

      {/* Book 3 (Top - Light Amethyst) */}
      <rect x="42" y="58" width="80" height="14" rx="2.5" fill="#995DD4" />
      <rect x="50" y="60" width="68" height="10" fill="#FFFFFF" />
      <line x1="47" y1="60" x2="47" y2="70" stroke="#F1C40F" strokeWidth="1.5" />

      {/* Bookmark Ribbon */}
      <path d="M100 58 L100 76 L105 72 L110 76 L110 58 Z" fill="#E74C3C" />
    </svg>
  );
}

// Hero Academic Mortarboard, Books & Diploma Ribbon Graphic
export function HeroAcademicGraphic({ className = "w-72 h-64" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 340 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Bottom Book (Large leather bound) */}
      <rect x="40" y="190" width="220" height="42" rx="5" fill="#3D2314" />
      <rect x="65" y="196" width="190" height="30" fill="#FDF7EA" />
      {/* Book pages lines */}
      <line x1="70" y1="202" x2="250" y2="202" stroke="#E3D5BA" strokeWidth="1" />
      <line x1="70" y1="211" x2="250" y2="211" stroke="#E3D5BA" strokeWidth="1" />
      <line x1="70" y1="220" x2="250" y2="220" stroke="#E3D5BA" strokeWidth="1" />
      <rect x="40" y="190" width="25" height="42" rx="3" fill="#2B180C" />
      <line x1="52" y1="194" x2="52" y2="228" stroke="#D4AF37" strokeWidth="2" />

      {/* Middle Book */}
      <rect x="55" y="150" width="200" height="38" rx="4" fill="#0E3728" />
      <rect x="75" y="155" width="175" height="28" fill="#FFFDF8" />
      <rect x="55" y="150" width="20" height="38" rx="2" fill="#082218" />
      <line x1="65" y1="154" x2="65" y2="184" stroke="#D4AF37" strokeWidth="1.5" />

      {/* Top Book */}
      <rect x="68" y="115" width="180" height="34" rx="4" fill="#4B2020" />
      <rect x="85" y="119" width="158" height="26" fill="#FDF9F0" />
      <rect x="68" y="115" width="18" height="34" rx="2" fill="#331414" />

      {/* Rolled Diploma Scroll in Foreground */}
      <g filter="url(#diplomaShadow)">
        <ellipse cx="140" cy="245" rx="14" ry="22" fill="#E6D3A3" transform="rotate(-12 140 245)" />
        <rect x="135" y="222" width="160" height="42" rx="6" fill="url(#scrollGrad)" transform="rotate(-8 135 222)" />
        {/* Ribbon Bow */}
        <rect x="210" y="214" width="18" height="48" rx="3" fill="#C59336" transform="rotate(-8 210 214)" />
        <circle cx="225" cy="235" r="9" fill="#E5B858" />
        <circle cx="225" cy="235" r="5" fill="#8C651E" />
        {/* Ribbon Tails */}
        <path d="M225 240 Q215 270 205 285 L215 285 Q225 265 230 242 Z" fill="#C59336" />
        <path d="M228 240 Q240 270 250 282 L240 282 Q232 265 228 242 Z" fill="#B38025" />
      </g>

      {/* Academic Cap / Mortarboard */}
      <g filter="url(#capShadow)">
        {/* Skull Cap base */}
        <path d="M105 75 Q160 115 215 75 L215 95 Q160 135 105 95 Z" fill="#141D26" />
        {/* Top Diamond */}
        <polygon points="160,20 275,58 160,96 45,58" fill="url(#mortarCapGrad)" />
        {/* Button on top */}
        <ellipse cx="160" cy="58" rx="8" ry="5" fill="#D4AF37" />
        {/* Golden Tassel */}
        <path d="M160 58 C165 75 110 85 96 120" stroke="#F1C40F" strokeWidth="4" strokeLinecap="round" fill="none" />
        <circle cx="96" cy="122" r="5" fill="#D4AF37" />
        <path d="M91 126 L101 126 L103 158 L89 158 Z" fill="#E67E22" />
        <line x1="93" y1="134" x2="99" y2="134" stroke="#F1C40F" strokeWidth="1.5" />
      </g>

      <defs>
        <linearGradient id="mortarCapGrad" x1="45" y1="20" x2="275" y2="96" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2C3E50" />
          <stop offset="0.45" stopColor="#1E2B37" />
          <stop offset="1" stopColor="#0F171E" />
        </linearGradient>
        <linearGradient id="scrollGrad" x1="135" y1="222" x2="295" y2="264" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFDF7" />
          <stop offset="0.6" stopColor="#F9F1DC" />
          <stop offset="1" stopColor="#ECD9B0" />
        </linearGradient>
        <filter id="capShadow" x="35" y="15" width="250" height="160" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodOpacity="0.4" />
        </filter>
        <filter id="diplomaShadow" x="120" y="200" width="200" height="95" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodOpacity="0.3" />
        </filter>
        <filter id="glow" x="20" y="0" width="300" height="300" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="25" />
        </filter>
      </defs>
    </svg>
  );
}
