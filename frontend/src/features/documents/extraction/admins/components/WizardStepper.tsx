type StepStatus = "warning" | "error";

interface Props {
  steps: readonly { label: string }[];
  current: number;
  /** Which completed steps can be clicked to go back */
  canNavigate: (index: number) => boolean;
  onStepClick: (index: number) => void;
  /** Optional validation state shown on a step (icon + color, never color alone) */
  status?: Partial<Record<number, StepStatus>>;
}

const Check = () => (
  <svg
    className="w-3 h-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={3}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const Alert = () => (
  <svg
    className="w-3 h-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={3}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5m0 4h.01" />
  </svg>
);

export default function WizardStepper({
  steps,
  current,
  canNavigate,
  onStepClick,
  status = {},
}: Props) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          const st = status[i];
          const clickable = canNavigate(i);

          const circle =
            st === "error"
              ? "border-danger bg-danger text-white"
              : st === "warning"
                ? "border-accent bg-accent text-white"
                : done
                  ? "border-primary bg-primary text-white"
                  : active
                    ? "border-secondary bg-secondary/10 text-secondary"
                    : "border-gray-300 text-gray-400 dark:border-white/15 dark:text-gray-500";

          return (
            <li
              key={s.label}
              className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`}
            >
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onStepClick(i)}
                aria-current={active ? "step" : undefined}
                aria-label={`Step ${i + 1}: ${s.label}${done ? " (completed)" : ""}`}
                className={`group flex items-center gap-1.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 ${
                  clickable ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition ${circle}`}
                >
                  {st ? <Alert /> : done ? <Check /> : i + 1}
                </span>
                <span
                  className={`hidden sm:block text-theme-xs whitespace-nowrap ${
                    active
                      ? "font-semibold text-gray-800 dark:text-white/90"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {s.label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`mx-2 h-px flex-1 ${done ? "bg-primary" : "bg-gray-200 dark:bg-white/10"}`}
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400 sm:hidden">
        Step {current + 1} of {steps.length} · {steps[current].label}
      </p>
    </nav>
  );
}
