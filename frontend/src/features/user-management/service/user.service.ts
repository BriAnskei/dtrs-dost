import { apiClient } from "../../../lib/api-client";
import type { PaginatedResponse } from "../../../type/paginated-response.type";
import type { CreateUserPayload } from "../type/creater-user.type";
import type { FindUsersParams, UserWithRelationResponse } from "../type/user.type";

export const userService = {
  async create(userData: CreateUserPayload): Promise<UserWithRelationResponse> {
    const { data } = await apiClient.post<UserWithRelationResponse>(
      "/user/new",
      userData,
    );

    return data;
  },

  async findAll(
    params: FindUsersParams,
  ): Promise<PaginatedResponse<UserWithRelationResponse>> {
    const { data } = await apiClient.get<PaginatedResponse<UserWithRelationResponse>>(
      "/user",
      {
        params,
      },
    );

    return data;
  },

  async searchByName(name: string): Promise<UserWithRelationResponse[]> {
    const { data } = await apiClient.get<UserWithRelationResponse[]>("/user/search", {
      params: {
        name,
      },
    });
    return data;
  },

  // async update(id: string, data: UpdateUserPayload): Promise<any> {},
};
