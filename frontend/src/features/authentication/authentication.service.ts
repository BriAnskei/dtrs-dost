import type { User } from "../../context/currentUser/curr-user.type";
import { apiClient } from "../../lib/api-client";
import type { LoginDto, LoginResponse } from "./authentication.types";

export const authenticationService = {
  async signIn(dto: LoginDto): Promise<User> {
    const res = await apiClient.post<LoginResponse>("/authentication/login", dto);
    return res.data.user_data;
  },

  async refresh(): Promise<void> {
    await apiClient.post("/authentication/refresh");
  },

  async signOut(): Promise<void> {
    await apiClient.post("/authentication/logout");
  },
};
