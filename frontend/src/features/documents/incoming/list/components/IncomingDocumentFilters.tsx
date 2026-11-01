import { Search } from "lucide-react";
import Input from "../../../../../components/form/input/InputField";
import DateRangeFilter from "../../../../../components/ui/date/DateRangeFilter";
import type { DateRange } from "../../../../../components/ui/date/date-constants";
import {
  DATE_FIELD_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  type StatusFilter,
} from "../../constants";
import type {
  IncomingDocumentDateField,
  IncomingDocumentSortOrder,
} from "../../types/incoming-document.type";

interface IncomingDocumentsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  dateField: IncomingDocumentDateField;
  onDateFieldChange: (value: IncomingDocumentDateField) => void;
  dateRange: DateRange;
  onDateRangeChange: (value: DateRange) => void;
  sort: IncomingDocumentSortOrder;
  onSortChange: (value: IncomingDocumentSortOrder) => void;
  hasFilters: boolean;
  onClear: () => void;
}

const SELECT_CLASS =
  "flex-1 sm:flex-none min-w-40 px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/8 dark:bg-white/3 dark:text-gray-200 dark:scheme-dark transition";

export default function IncomingDocumentsFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  dateField,
  onDateFieldChange,
  dateRange,
  onDateRangeChange,
  sort,
  onSortChange,
  hasFilters,
  onClear,
}: IncomingDocumentsFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="relative w-full sm:flex-1 sm:min-w-50 sm:max-w-md">
        <Input
          type="text"
          size="sm"
          leadingIcon={<Search className="w-4 h-4" />}
          value={search}
          name="incoming-search-no-autofill"
          data-form-type="other"
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tracking no. or subject..."
          autoComplete="new-password"
        />
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <DateRangeFilter<IncomingDocumentDateField>
          value={dateRange}
          onChange={onDateRangeChange}
          fieldOptions={DATE_FIELD_OPTIONS}
          field={dateField}
          onFieldChange={onDateFieldChange}
        />

        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
          aria-label="Filter by status"
          className={SELECT_CLASS}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as IncomingDocumentSortOrder)}
          aria-label="Sort by"
          className={SELECT_CLASS}
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
