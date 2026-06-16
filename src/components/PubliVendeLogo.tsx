import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const LOGO_ICON_SRC = "/logo-icon.svg";
const LOGO_FULL_SRC = "/logo-publivende.png";

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
  /** Recorta el PNG completo (con texto) en lugar del icono SVG. */
  variant?: "icon" | "full";
}

/** Icono PubliVende sin esquinas blancas (SVG transparente). */
export function PubliVendeMark({ size = "md", className, variant = "icon" }: PubliVendeMarkProps) {
  if (variant === "full") {
    return (
      <span className={cn("inline-flex shrink-0 overflow-hidden rounded-[18%]", HEIGHTS[size], "aspect-square", className)}>
        <img
          src={LOGO_FULL_SRC}
          alt="PubliVende"
          className="h-full w-full object-cover object-top scale-[1.14]"
        />
      </span>
    );
  }

  return (
    <img
      src={LOGO_ICON_SRC}
      alt="PubliVende"
      className={cn(HEIGHTS[size], "w-auto aspect-square object-contain shrink-0", className)}
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

export const PUBLIVENDE_LOGO_URL = LOGO_ICON_SRC;
