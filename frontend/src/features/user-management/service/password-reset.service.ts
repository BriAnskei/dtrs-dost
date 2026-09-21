import { apiClient } from "../../../lib/api-client";
import type { PasswordResetRequestResponse } from "../type/password-reset.type";

export const passwordResetService = {
  async createResetRequest(userId: string): Promise<PasswordResetRequestResponse> {
    const { data } = await apiClient.post<PasswordResetRequestResponse>(
      `/authentication/password-reset/users/${userId}`,
    );
    return data;
  },
};
