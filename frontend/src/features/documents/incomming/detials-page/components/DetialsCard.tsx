import type { ReactNode } from "react";
import { cardClass, eyebrowClass } from "../constant";

interface DetailsCardProps {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
}

export default function DetailsCard({ title, eyebrow, children }: DetailsCardProps) {
  return (
    <section className={cardClass}>
      {(eyebrow || title) && (
        <header className="mb-4">
          {eyebrow && <h2 className={eyebrowClass}>{eyebrow}</h2>}
          {title && (
            <h2 className="mt-0.5 text-base font-semibold text-gray-800 dark:text-white/90">
              {title}
            </h2>
          )}
        </header>
      )}
      {children}
    </section>
  );
}
