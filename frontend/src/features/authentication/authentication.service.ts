import { apiClient } from "../../lib/api-client";
import type { LoginDto } from "./authentication.types";

export const authenticationService = {
  async login(dto: LoginDto): Promise<void> {
    await apiClient.post("/authentication/login", dto);
  },

  async refresh(): Promise<void> {
    await apiClient.post("/authentication/refresh");
  },

  async logout(): Promise<void> {
    await apiClient.post("/authentication/logout");
  },
};
