import type { RawAxiosRequestConfig } from "axios";
import type { User } from "../../context/currentUser/curr-user.type";

export interface LoginDto {
  email: string;
  password: string;
  remember_me: boolean;
}

export type LoginResponse = {
  user_data: User;
};

export type AuthenticationRequestConfig = RawAxiosRequestConfig & {
  _retry?: boolean;
};
