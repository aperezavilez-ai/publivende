import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/icon-1024.png";

const SIZES = {
  xs: "w-6 h-6 rounded-md",
  sm: "w-8 h-8 rounded-lg",
  md: "w-9 h-9 rounded-xl",
  lg: "w-10 h-10 rounded-xl",
  xl: "w-12 h-12 rounded-2xl",
} as const;

type LogoSize = keyof typeof SIZES;

interface PubliVendeMarkProps {
  size?: LogoSize;
  className?: string;
}

/** Solo el icono de marca (sin texto). */
export function PubliVendeMark({ size = "md", className }: PubliVendeMarkProps) {
  return (
    <img
      src={LOGO_SRC}
      alt=""
      aria-hidden
      className={cn(SIZES[size], "object-cover shrink-0 shadow-elegant", className)}
    />
  );
}

interface PubliVendeLogoProps {
  size?: LogoSize;
  showText?: boolean;
  textClassName?: string;
  className?: string;
  /** Si se pasa, envuelve en Link hacia esa ruta. */
  to?: "/" | "/dashboard";
}

/** Logo + nombre PubliVende. */
export function PubliVendeLogo({
  size = "md",
  showText = true,
  textClassName,
  className,
  to,
}: PubliVendeLogoProps) {
  const content = (
    <div className={cn("flex items-center gap-2", className)}>
      <PubliVendeMark size={size} />
      {showText && (
        <span className={cn("font-bold text-lg leading-none", textClassName)}>PubliVende</span>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className={cn("flex items-center gap-2", className)}>
        <PubliVendeMark size={size} />
        {showText && (
          <span className={cn("font-bold text-lg leading-none", textClassName)}>PubliVende</span>
        )}
      </Link>
    );
  }

  return content;
}

export const PUBLIVENDE_LOGO_URL = LOGO_SRC;
