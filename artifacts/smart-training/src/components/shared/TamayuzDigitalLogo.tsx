interface LogoProps {
  className?: string;
  showText?: boolean;
  light?: boolean;
}

export function TamayuzDigitalLogo({ className = "h-10", showText = true, light = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${light ? "text-white" : "text-[#0c3b2e]"}`}>
      {/* Official Emblem: Book with sprouting wisdom branches */}
      <svg
        viewBox="0 0 100 100"
        className={`w-10 h-10 shrink-0 ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Book base */}
        <path
          d="M50 78C38 72 20 72 12 76V32C22 28 38 28 50 34C62 28 78 28 88 32V76C80 72 62 72 50 78Z"
          fill={light ? "#1b5e43" : "#0c3b2e"}
          stroke={light ? "#d4af37" : "#c5a059"}
          strokeWidth="2.5"
        />
        {/* Book pages spine */}
        <path
          d="M50 34V78"
          stroke={light ? "#d4af37" : "#c5a059"}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Central rising golden sprout / sun / knowledge flame */}
        <path
          d="M50 20C50 20 46 26 46 30C46 32.2 47.8 34 50 34C52.2 34 54 32.2 54 30C54 26 50 20 50 20Z"
          fill="#d4af37"
        />
        {/* Leaves branches */}
        <path
          d="M44 26C40 22 34 22 34 22C34 22 36 28 40 30C42.5 31.2 44 29 44 26Z"
          fill={light ? "#4ade80" : "#166534"}
        />
        <path
          d="M56 26C60 22 66 22 66 22C66 22 64 28 60 30C57.5 31.2 56 29 56 26Z"
          fill={light ? "#4ade80" : "#166534"}
        />
        <circle cx="50" cy="16" r="3" fill="#d4af37" />
      </svg>

      {showText && (
        <div className="flex flex-col text-right leading-tight">
          <span
            className="text-base font-black tracking-tight"
            style={{ fontFamily: "Cairo, sans-serif" }}
          >
            منصة التميز الرقمي
          </span>
          <span
            className={`text-[10px] font-semibold tracking-wider ${
              light ? "text-neutral-300" : "text-[#1b5e43]"
            }`}
            style={{ fontFamily: "Cairo, sans-serif" }}
          >
            معرفة · تقدم · توجيه
          </span>
        </div>
      )}
    </div>
  );
}
