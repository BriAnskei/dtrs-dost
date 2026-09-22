export interface PasswordResetRequestResponse {
  id: string;
  token: string;
  expires_at: string; // ISO string over the wire
}

export interface PasswordResetTokenSummary {
  id: string;
  user_id: string;
  expires_at: string;
}

export interface PasswordResetConflictBody {
  message: string;
  error: "PASSWORD_RESET_ALREADY_EXISTS";
  id: string;
  expires_at: string;
}
