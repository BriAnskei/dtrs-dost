import { apiClient } from "../../../lib/api-client";
import type { Division } from "../types/division.type";

export const divisionService = {
  async findByName(search: string): Promise<Division[] | null> {
    const { data } = await apiClient.get<Division[]>("/division", {
      params: { search },
    });

    return data;
  },
};
