import React from "react";

export default function FieldSkeleton() {
  return (
    <div className="grid grid-cols-[180px_1fr] items-center gap-4">
      <div className="h-4 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-9 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}
