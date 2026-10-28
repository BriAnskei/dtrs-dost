import { cardClass } from "../constant";

export default function TabPlaceholder({ label }: { label: string }) {
  return (
    <div className={`${cardClass} text-center`}>
      <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
        {label}
      </h2>
      <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
        This section is coming soon.
      </p>
    </div>
  );
}
