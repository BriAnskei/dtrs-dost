import type { User } from "../../../context/currentUser/curr-user.type";
import { apiClient } from "../../../lib/api-client";
import type { LoginDto, LoginResponse } from "../type/authentication.type";

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

  async verifyPassword(password: string): Promise<{ verified: boolean }> {
    const { data } = await apiClient.post<{ verified: boolean }>(
      "/authentication/verify-password",
      { password },
    );
    return data;
  },
};
