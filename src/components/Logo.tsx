import Image from "next/image";

/**
 * Approved logo files only (extracted from the brand guidelines).
 * Never redraw or recolour: the guidelines forbid it.
 * Compact lockup: 96px minimum digital width.
 */
const FILES = {
  primary: { src: "/brand/logo-primary.png", w: 1073, h: 257 },
  compact: { src: "/brand/logo-compact.png", w: 363, h: 254 },
  icon: { src: "/brand/logo-icon.png", w: 262, h: 212 },
} as const;

export function Logo({
  variant = "primary",
  height = 36,
  className,
  priority = false,
  plate = true,
}: {
  variant?: keyof typeof FILES;
  height?: number;
  className?: string;
  priority?: boolean;
  /** In dark mode the coloured lockup sits on a white plate (approved treatment). */
  plate?: boolean;
}) {
  const f = FILES[variant];
  const width = Math.round((f.w / f.h) * height);
  const img = (
    <Image
      src={f.src}
      alt="AccountTech أكاونت تك"
      width={width}
      height={height}
      priority={priority}
      className={className}
      style={{ width, height, objectFit: "contain" }}
    />
  );
  return plate ? <span className="logo-frame inline-flex">{img}</span> : img;
}

/** Icon-only mark on a white plate, as shown on navy surfaces in the guidelines. */
export function LogoPlate({ size = 40 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        background: "#fff",
        borderRadius: Math.round(size * 0.24),
      }}
    >
      <Logo variant="icon" height={Math.round(size * 0.62)} plate={false} />
    </span>
  );
}

/** Approved primary lockup on a white plate, for use on navy surfaces. */
export function LockupPlate({ height = 34 }: { height?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center"
      style={{ background: "#fff", borderRadius: 12, padding: "10px 14px" }}
    >
      <Logo variant="primary" height={height} plate={false} />
    </span>
  );
}
