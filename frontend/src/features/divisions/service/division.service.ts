import { apiClient } from "../../../lib/api-client";
import type {
  FindDivisionsParams,
  FindDivisionsResponse,
} from "../type/division-api.type";

export const divisionService = {
  async findAll(params: FindDivisionsParams): Promise<FindDivisionsResponse> {
    const { data } = await apiClient.get<FindDivisionsResponse>("/division", {
      params,
    });

    return data;
  },
};
