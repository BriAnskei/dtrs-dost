type BadgeVariant = "light" | "solid";
type BadgeSize = "sm" | "md";
type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";

interface BadgeProps {
  variant?: BadgeVariant; // Light or solid variant
  size?: BadgeSize; // Badge size
  color?: BadgeColor; // Badge color
  startIcon?: React.ReactNode; // Icon at the start
  endIcon?: React.ReactNode; // Icon at the end
  children: React.ReactNode; // Badge content
}

const Badge: React.FC<BadgeProps> = ({
  variant = "light",
  color = "primary",
  size = "md",
  startIcon,
  endIcon,
  children,
}) => {
  const baseStyles = "inline-flex items-center justify-center gap-1 font-medium";

  // Define size styles
  const sizeStyles = {
    sm: "text-theme-xs",
    md: "text-sm",
  };

  // Define color styles — font color only, no background, no border
  const variants = {
    light: {
      primary: "text-brand-500 dark:text-brand-400",
      success: "text-success-600 dark:text-success-500",
      error: "text-error-600 dark:text-error-500",
      warning: "text-warning-600 dark:text-orange-400",
      info: "text-blue-light-500 dark:text-blue-light-500",
      light: "text-gray-700 dark:text-white/80",
      dark: "text-gray-700 dark:text-white",
    },
    solid: {
      primary: "text-brand-500 dark:text-brand-400",
      success: "text-success-600 dark:text-success-500",
      error: "text-error-600 dark:text-error-500",
      warning: "text-warning-600 dark:text-orange-400",
      info: "text-blue-light-500 dark:text-blue-light-500",
      light: "text-gray-700 dark:text-white/80",
      dark: "text-gray-700 dark:text-white",
    },
  };

  const sizeClass = sizeStyles[size];
  const colorStyles = variants[variant][color];

  return (
    <span className={`${baseStyles} ${sizeClass} ${colorStyles}`}>
      {startIcon && <span className="mr-1">{startIcon}</span>}
      {children}
      {endIcon && <span className="ml-1">{endIcon}</span>}
    </span>
  );
};

export default Badge;
