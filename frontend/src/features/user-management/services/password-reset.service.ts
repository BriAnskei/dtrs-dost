import axios from "axios";
import { apiClient } from "../../../lib/api-client";
import type {
  PasswordResetConflictBody,
  PasswordResetRequestResponse,
  PasswordResetTokenSummary,
} from "../types/password-reset.type";

export const passwordResetService = {
  async createResetRequest(userId: string): Promise<PasswordResetRequestResponse> {
    const { data } = await apiClient.post<PasswordResetRequestResponse>(
      `/authentication/password-reset/users/${userId}`,
    );
    return data;
  },

  async getByUserId(userId: string): Promise<PasswordResetTokenSummary | null> {
    const { data } = await apiClient.get<PasswordResetTokenSummary | null>(
      `/authentication/password-reset/user/${userId}`,
    );
    return data ?? null;
  },

  async deletePasswordResetToken(id: string): Promise<void> {
    await apiClient.delete(`/authentication/password-reset/${id}`);
  },
};

export function getConflictBody(err: unknown): PasswordResetConflictBody | null {
  if (
    axios.isAxiosError<PasswordResetConflictBody>(err) &&
    err.response?.status === 409
  ) {
    return err.response.data ?? null;
  }
  return null;
}
