import type { User } from "../../features/userManagement/type/user.type";
import { apiClient } from "../../lib/api-client";

export const currentUserService = {
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>("/user/me");

    return response.data;
  },
};
