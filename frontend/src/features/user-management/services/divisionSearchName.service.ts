import { apiClient } from "../../../lib/api-client";
import type { DivisionName } from "../types/division-name.type";
export const divisionSearchNameService = {
  async find(search: string): Promise<DivisionName[] | null> {
    const { data } = await apiClient.get<DivisionName[]>("/division/search", {
      params: { search },
    });

    return data;
  },
};
