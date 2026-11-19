import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const LOGO_ICON_SRC = "/logo-icon.svg";
const LOGO_FULL_SRC = "/logo-publivende.png";

const DIMENSIONS = {
  xs: { class: "h-6 w-6 min-w-6 max-w-6 min-h-6 max-h-6", px: 24 },
  sm: { class: "h-8 w-8 min-w-8 max-w-8 min-h-8 max-h-8", px: 32 },
  md: { class: "h-10 w-10 min-w-10 max-w-10 min-h-10 max-h-10", px: 40 },
  lg: { class: "h-12 w-12 min-w-12 max-w-12 min-h-12 max-h-12", px: 48 },
  xl: { class: "h-14 w-14 min-w-14 max-w-14 min-h-14 max-h-14", px: 56 },
} as const;

type LogoSize = keyof typeof DIMENSIONS;

interface PubliVendeMarkProps {
  size?: LogoSize;
  className?: string;
  /** Recorta el PNG completo (con texto) en lugar del icono SVG. */
  variant?: "icon" | "full";
}

/** Icono PubliVende sin esquinas blancas (SVG transparente). */
export function PubliVendeMark({ size = "md", className, variant = "icon" }: PubliVendeMarkProps) {
  const dim = DIMENSIONS[size] ?? DIMENSIONS.md;

  if (variant === "full") {
    return (
      <span
        style={{ width: `${dim.px}px`, height: `${dim.px}px` }}
        className={cn("inline-flex shrink-0 overflow-hidden rounded-[18%] aspect-square", dim.class, className)}
      >
        <img
          src={LOGO_FULL_SRC}
          alt="PubliVende"
          width={dim.px}
          height={dim.px}
          className="h-full w-full object-cover object-top scale-[1.14]"
        />
      </span>
    );
  }

  return (
    <img
      src={LOGO_ICON_SRC}
      alt="PubliVende"
      width={dim.px}
      height={dim.px}
      style={{
        width: `${dim.px}px`,
        height: `${dim.px}px`,
        maxWidth: `${dim.px}px`,
        maxHeight: `${dim.px}px`,
      }}
      className={cn(dim.class, "aspect-square object-contain shrink-0", className)}
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
