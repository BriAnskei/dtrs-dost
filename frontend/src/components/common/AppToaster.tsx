import { Toaster } from "sonner";
import { useTheme } from "../../context/ThemeContext"; // adjust path to your actual file

export default function AppToaster() {
  const { theme } = useTheme();

  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      richColors={false}
      closeButton
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex items-start gap-3 w-full rounded-xl border p-4 shadow-theme-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-800 dark:text-white/90",
          title: "text-theme-sm font-medium",
          description: "text-theme-xs text-gray-500 dark:text-gray-400",
          success: "border-l-4 border-l-success-500",
          error: "border-l-4 border-l-error-500",
          warning: "border-l-4 border-l-warning-500",
          info: "border-l-4 border-l-brand-500",
          closeButton:
            "bg-transparent border-none text-gray-400 hover:text-brand-500 dark:hover:text-white",
        },
      }}
    />
  );
}
