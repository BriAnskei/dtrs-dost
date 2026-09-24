import type { ReactNode } from "react";

/**
 * Joins class name fragments, dropping any that are falsy.
 * Prevents the "undefined" leaking into className when a prop is omitted.
 */
function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

// ── Table ───────────────────────────────────────────────────────────────────

interface TableProps {
  children: ReactNode;
  className?: string;
}

const Table: React.FC<TableProps> = ({ children, className }) => {
  return <table className={cx("min-w-full", className)}>{children}</table>;
};

// ── TableHeader ─────────────────────────────────────────────────────────────

interface TableHeaderProps {
  children: ReactNode;
  className?: string;
}

const TableHeader: React.FC<TableHeaderProps> = ({ children, className }) => {
  return <thead className={cx("bg-[#f1f5f9]", className)}>{children}</thead>;
};

// ── TableBody ───────────────────────────────────────────────────────────────

interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

const TableBody: React.FC<TableBodyProps> = ({ children, className }) => {
  return <tbody className={cx("divide-y divide-[#f1f5f9]", className)}>{children}</tbody>;
};

// ── TableRow ────────────────────────────────────────────────────────────────

interface TableRowProps {
  children: ReactNode;
  className?: string;
  /**
   * Background color/tint for the whole row, e.g. "bg-red-50/40 dark:bg-red-900/5".
   * Kept separate from `className` so row-state styling (status, selection, etc.)
   * doesn't need to be hand-spliced into a template literal every time it's used.
   */
  bgColor?: string;
}

const TableRow: React.FC<TableRowProps> = ({ children, className, bgColor }) => {
  return <tr className={cx(bgColor, className)}>{children}</tr>;
};

// ── TableCell ───────────────────────────────────────────────────────────────

interface TableCellProps {
  children: ReactNode;
  isHeader?: boolean;
  className?: string;
  /** Background color/tint for this specific cell, e.g. "bg-amber-50/50". */
  bgColor?: string;
}

const TableCell: React.FC<TableCellProps> = ({
  children,
  isHeader = false,
  className,
  bgColor,
}) => {
  const CellTag = isHeader ? "th" : "td";
  return <CellTag className={cx(bgColor, className)}>{children}</CellTag>;
};

export { Table, TableBody, TableCell, TableHeader, TableRow };
