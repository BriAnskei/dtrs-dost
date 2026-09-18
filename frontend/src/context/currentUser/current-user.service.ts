import { apiClient } from "../../lib/api-client";
import type { User } from "./curr-user.type";

export const currentUserService = {
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>("/user/me");

    return response.data;
  },
};
