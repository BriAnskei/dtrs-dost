import { FullLogo, LogoMark } from "../../icons";

interface CompanyLogoProps {
  className?: string;
  size?: number;
  forceLight?: boolean;
  variant?: "full" | "mark" | "auto";
}

const AUTO_SIZE_THRESHOLD = 48;

export default function CompanyLogo({
  className = "",
  size = 180,
  forceLight = false,
  variant = "auto",
}: CompanyLogoProps) {
  const useMark =
    variant === "mark" || (variant === "auto" && size <= AUTO_SIZE_THRESHOLD);

  const Logo = useMark ? LogoMark : FullLogo;

  const colourClass = forceLight ? "text-white" : "text-gray-800 dark:text-white";

  return (
    <Logo
      width={size}
      height={size}
      className={`${colourClass} ${className}`}
      aria-label="Company logo"
      role="img"
    />
  );
}
