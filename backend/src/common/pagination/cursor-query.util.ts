import { ObjectLiteral, SelectQueryBuilder } from "typeorm";

type ComparisonOperator = "<" | ">";

type CursorCastType = "date" | "text";

interface CursorConditionOptions {
  column: string;
  alias: string;
  castType: CursorCastType;
  sortValue: string;
  id: string;
  operator: ComparisonOperator;
}

/**
 * Adds a keyset-pagination condition using a composite sort key.
 *
 * The column and alias must be trusted SQL identifiers supplied by
 * application code, never directly by the request.
 */
export function applyCursorCondition<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  options: CursorConditionOptions,
): void {
  const { column, alias, castType, sortValue, id, operator } = options;

  queryBuilder.andWhere(
    `(${column}, ${alias}.id) ${operator} (
      CAST(:cursorValue AS ${castType}),
      CAST(:cursorId AS uuid)
    )`,
    {
      cursorValue: sortValue,
      cursorId: id,
    },
  );
}
