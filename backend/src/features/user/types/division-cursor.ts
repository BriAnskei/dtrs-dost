import { DivisionSortOrder } from "../enums/division-sort-order-enum";

export type DivisionCursor =
  | {
      sort: DivisionSortOrder.NameAsc;
      divisionName: string;
      id: string;
    }
  | {
      sort: DivisionSortOrder.MostUsers;
      userCount: number;
      id: string;
    };
