import { apiClient } from "../../../lib/api-client";
import type { PaginatedResponse } from "../../../type/paginated-response.type";
import type {
  FindUsersParams,
  UserWithRelationResponse,
} from "../../user-management/types/user.type";

export const DeactivatedUserService = {
  async findAllDeactivated(
    params: FindUsersParams,
  ): Promise<PaginatedResponse<UserWithRelationResponse>> {
    const { data } = await apiClient.get<PaginatedResponse<UserWithRelationResponse>>(
      "/user/deactivated",
      {
        params,
      },
    );

    return data;
  },
};
