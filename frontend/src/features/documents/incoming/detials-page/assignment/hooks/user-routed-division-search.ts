import { useDebounce } from "use-debounce";
import type {
  DivisionOption,
  DivisionSearchState,
} from "../../../../../user-management/components/DivisionCombobox";
import { useSearchRoutedDivisions } from "./api/use-search-routed-division";

// Keep your existing RoutedDivisionOption definition. It needs at least these fields:
export interface RoutedDivisionOption extends DivisionOption {
  routing_id: string;
}

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Adapts `useSearchRoutedDivisions` to the shape DivisionCombobox expects.
 * The underlying query only runs for 2+ characters, so an empty box
 * returns no divisions.
 */
export function useRoutedDivisionSearch(
  query: string,
  incomingDocumentId: string,
): DivisionSearchState<RoutedDivisionOption> {
  const [debounced] = useDebounce(query.trim(), SEARCH_DEBOUNCE_MS);

  const result = useSearchRoutedDivisions({
    incomingDocumentId,
    search: debounced,
  });

  return {
    data: result.data as RoutedDivisionOption[] | undefined,
    isFetching: result.isFetching,
    isDebouncing: query.trim() !== debounced,
    loadError: result.isError,
    retry: () => void result.refetch(),
  };
}
