interface LogoMarkProps {
  className?: string;
  stroke?: string;
  alt?: string;
}

/** Official Tamayyuz mark using favicon.png */
export function LogoMark({ className, alt = "Tamayyuz Logo" }: LogoMarkProps) {
  return (
    <img
      src="/favicon.png"
      alt={alt}
      className={`object-contain ${className ?? "w-6 h-6"}`}
    />
  );
}
