import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/logo-publivende.png";

const HEIGHTS = {
  xs: "h-6",
  sm: "h-8",
  md: "h-10",
  lg: "h-12",
  xl: "h-14",
} as const;

type LogoSize = keyof typeof HEIGHTS;

interface PubliVendeMarkProps {
  size?: LogoSize;
  className?: string;
}

/** Logo PubliVende (imagen completa con nombre). */
export function PubliVendeMark({ size = "md", className }: PubliVendeMarkProps) {
  return (
    <img
      src={LOGO_SRC}
      alt="PubliVende"
      className={cn(HEIGHTS[size], "w-auto object-contain shrink-0", className)}
    />
  );
}

interface PubliVendeLogoProps {
  size?: LogoSize;
  /** Legacy: el logo ya trae el texto; por defecto no se duplica. */
  showText?: boolean;
  textClassName?: string;
  className?: string;
  to?: "/" | "/dashboard";
}

export function PubliVendeLogo({
  size = "md",
  showText = false,
  textClassName,
  className,
  to,
}: PubliVendeLogoProps) {
  const img = <PubliVendeMark size={size} />;
  const content = (
    <div className={cn("flex items-center gap-2", className)}>
      {img}
      {showText && (
        <span className={cn("font-bold text-lg leading-none", textClassName)}>PubliVende</span>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className={cn("flex items-center gap-2", className)}>
        {img}
        {showText && (
          <span className={cn("font-bold text-lg leading-none", textClassName)}>PubliVende</span>
        )}
      </Link>
    );
  }

  return content;
}

export const PUBLIVENDE_LOGO_URL = LOGO_SRC;
