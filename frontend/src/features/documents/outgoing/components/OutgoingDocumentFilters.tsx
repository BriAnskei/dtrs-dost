import { Search } from "lucide-react";
import Input from "../../../../components/form/input/InputField";
import DateRangeFilter from "../../../../components/ui/date/DateRangeFilter";
import type { DateRange } from "../../../../components/ui/date/date-constants";
import { DATE_FIELD_OPTIONS, SORT_OPTIONS } from "../constants";
import type {
  OutgoingDocumentDateField,
  OutgoingDocumentSort,
} from "../types/outgoing-document.type";

interface OutgoingDocumentsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  dateField: OutgoingDocumentDateField;
  onDateFieldChange: (value: OutgoingDocumentDateField) => void;
  dateRange: DateRange;
  onDateRangeChange: (value: DateRange) => void;
  sort: OutgoingDocumentSort;
  onSortChange: (value: OutgoingDocumentSort) => void;
  hasFilters: boolean;
  onClear: () => void;
}

export default function OutgoingDocumentsFilters({
  search,
  onSearchChange,
  dateField,
  onDateFieldChange,
  dateRange,
  onDateRangeChange,
  sort,
  onSortChange,
  hasFilters,
  onClear,
}: OutgoingDocumentsFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="relative w-full sm:flex-1 sm:min-w-50 sm:max-w-md">
        <Input
          type="text"
          size="sm"
          leadingIcon={<Search className="w-4 h-4" />}
          value={search}
          name="outgoing-search-no-autofill"
          data-form-type="other"
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tracking no., subject, recipient..."
          autoComplete="new-password"
        />
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <DateRangeFilter<OutgoingDocumentDateField>
          value={dateRange}
          onChange={onDateRangeChange}
          fieldOptions={DATE_FIELD_OPTIONS}
          field={dateField}
          onFieldChange={onDateFieldChange}
        />

        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as OutgoingDocumentSort)}
          aria-label="Sort by"
          className="flex-1 sm:flex-none min-w-40 px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/8 dark:bg-white/3 dark:text-gray-200 dark:scheme-dark transition"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            className="px-3 py-2 text-theme-sm text-gray-500 hover:text-danger border border-gray-200 rounded-lg hover:border-danger/40 transition-colors dark:border-white/8 dark:text-gray-400 dark:hover:text-danger whitespace-nowrap"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
