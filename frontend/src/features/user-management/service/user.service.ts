import { apiClient } from "../../../lib/api-client";
import type { CreateUserPayload } from "../type/creater-user.type";
import type { UserWithRelationResponse } from "../type/user.type";

export const userService = {
  async create(userData: CreateUserPayload): Promise<UserWithRelationResponse> {
    const { data } = await apiClient.post<UserWithRelationResponse>(
      "/user/new",
      userData,
    );

    return data;
  },

  async findAll(): Promise<UserWithRelationResponse[]> {
    const { data } = await apiClient.get<UserWithRelationResponse[]>("/user");

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
