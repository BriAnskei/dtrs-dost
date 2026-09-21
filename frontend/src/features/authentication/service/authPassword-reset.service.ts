import { apiClient } from "../../../lib/api-client";
import type {
  ResetPasswordPayload,
  VerifyResetTokenResponse,
} from "../type/authPassword-reset.type";

export const authPasswordResetService = {
  async verifyToken(token: string): Promise<VerifyResetTokenResponse> {
    const { data } = await apiClient.get<VerifyResetTokenResponse>(
      "/authentication/password-reset/verify",
      { params: { token } },
    );
    return data;
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    await apiClient.post("/authentication/password-reset", payload);
  },
};
