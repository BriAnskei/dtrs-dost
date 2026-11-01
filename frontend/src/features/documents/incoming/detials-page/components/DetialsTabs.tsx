import { type KeyboardEvent, useRef } from "react";
import { panelDomId, tabDomId } from "../constant";
import {
  DETAIL_TABS,
  type DetailTabId,
} from "../hooks/use-incoming-document-details-page";

interface DetailsTabsProps {
  activeTab: DetailTabId;
  onChange: (tab: DetailTabId) => void;
}

export default function DetailsTabs({ activeTab, onChange }: DetailsTabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow keys move focus between tabs; Enter/Space (native button) activates.
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = DETAIL_TABS.length - 1;
    let next: number;

    if (e.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (e.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    else return;

    e.preventDefault();
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="border-b border-gray-200 dark:border-white/8">
      <div
        role="tablist"
        aria-label="Document sections"
        className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {DETAIL_TABS.map((tab, index) => {
          const active = tab.id === activeTab;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={tabDomId(tab.id)}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={panelDomId(tab.id)}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-1.5 text-theme-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary/40 ${
                active
                  ? "border-primary text-primary dark:border-secondary dark:text-secondary"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
