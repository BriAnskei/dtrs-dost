import { useEffect, useRef } from "react";

interface UseInfiniteScrollSentinelOptions {
  onIntersect: () => void;
  enabled: boolean;
  rootMargin?: string;
}

/**
 * Observes a sentinel element inside a scrollable container and calls
 * `onIntersect` once it becomes visible — used to trigger `fetchNextPage`
 * without wiring a scroll event handler.
 *
 * `rootRef` goes on the scrollable container (the one with overflow-y-auto).
 * `sentinelRef` goes on a small element placed at the end of the list.
 */
export function useInfiniteScrollSentinel<
  TRoot extends HTMLElement = HTMLDivElement,
  TSentinel extends HTMLElement = HTMLDivElement,
>({ onIntersect, enabled, rootMargin = "150px" }: UseInfiniteScrollSentinelOptions) {
  const rootRef = useRef<TRoot | null>(null);
  const sentinelRef = useRef<TSentinel | null>(null);

  const onIntersectRef = useRef(onIntersect);
  onIntersectRef.current = onIntersect;

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onIntersectRef.current();
        }
      },
      {
        root: rootRef.current,
        rootMargin,
        threshold: 0,
      },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return { rootRef, sentinelRef };
}
