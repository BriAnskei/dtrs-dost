export interface PasswordResetRequestResponse {
  token: string;
  expires_at: string; // ISO string over the wire
}
