export interface LoginDto {
  email: string;
  password: string;
  remember_me: boolean;
}

export interface RefreshTokenDto {
  refresh_token: string;
}

export interface AuthenticationResponse {
  access_token: string;
  refresh_token: string;
}
