import { apiClient } from "../../../lib/api-client";
import type {
  FindDivisionsParams,
  FindDivisionsResponse,
} from "../type/division-api.type";
import type { UpdateDivisionDto } from "../type/update-divition.type";

export const divisionService = {
  async findAll(params: FindDivisionsParams): Promise<FindDivisionsResponse> {
    const { data } = await apiClient.get<FindDivisionsResponse>("/division", {
      params,
    });

    return data;
  },

  async updateName(id: string, dto: UpdateDivisionDto): Promise<void> {
    await apiClient.patch(`/division/${id}`, dto);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/division/${id}`);
  },
};
