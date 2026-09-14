import { apiClient } from "../../lib/api-client";
import type { User } from "../userManagement/type/user.type";
import type { LoginDto, LoginResponse } from "./authentication.types";

export const authenticationService = {
  async login(dto: LoginDto): Promise<User> {
    const res = await apiClient.post<LoginResponse>("/authentication/login", dto);
    return res.data.user_data;
  },

  async refresh(): Promise<void> {
    await apiClient.post("/authentication/refresh");
  },

  async logout(): Promise<void> {
    await apiClient.post("/authentication/logout");
  },
};
