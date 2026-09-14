import { Toaster } from "sonner";
import { useTheme } from "../../context/ThemeContext"; // adjust path to your actual file

export default function AppToaster() {
  const { theme } = useTheme();

  return (
    <Toaster
      theme={theme}
      position="top-right"
      richColors={false}
      closeButton
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex items-start gap-3 w-full rounded-lg border p-4 shadow-theme-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-800 dark:text-white/90",
          title: "text-sm font-medium",
          description: "text-xs text-gray-500 dark:text-gray-400",
          success: "border-l-4 border-l-success-500",
          error: "border-l-4 border-l-error-500",
          warning: "border-l-4 border-l-warning-500",
          info: "border-l-4 border-l-primary",
          closeButton:
            "bg-transparent border-none text-gray-400 hover:text-gray-700 dark:hover:text-white",
        },
      }}
    />
  );
}
