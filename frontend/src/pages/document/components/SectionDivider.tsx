import React from "react";

interface Props {
  label: string;
}

export default function SectionDivider({ label }: Props) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-primary/50 dark:text-secondary/40">
        {label}
      </span>
      <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}
