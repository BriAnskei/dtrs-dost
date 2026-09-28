export interface PasswordResetTokenEntity {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
}

export interface VerifyResetTokenResponse {
  valid: boolean;
  resetToken: PasswordResetTokenEntity;
}

export interface ResetPasswordPayload {
  token: string;
  new_password: string;
}
