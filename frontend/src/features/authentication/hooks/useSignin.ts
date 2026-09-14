import { useMutation } from "@tanstack/react-query";
import { type SubmitEventHandler, useState } from "react";
import { useNavigate } from "react-router";
import { useUser } from "../../../context/currentUser/user-user";
import { getApiErrorMessage } from "../../../lib/api-error";
import { authenticationService } from "../authentication.service";
import { markAuthenticated } from "../authentication.session";
import type { LoginDto } from "../authentication.types";

export function useSignin() {
  const navigate = useNavigate();
  const { setCurrentUser } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  const loginMutation = useMutation({
    mutationFn: (dto: LoginDto) => authenticationService.login(dto),

    onSuccess: (userData) => {
      navigate("/", { replace: true });
      setCurrentUser(userData);
      markAuthenticated();
    },

    onError: (error) => {
      console.log(error);
      setError(getApiErrorMessage(error, "Login failed."));
    },
  });

  const handleLogin: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setError("");

    loginMutation.mutate({
      email: email.trim(),
      password,
      remember_me: rememberMe,
    });
  };

  return {
    email,
    password,
    rememberMe,
    error,

    setEmail,
    setPassword,
    setRememberMe,

    handleLogin,

    isPending: loginMutation.isPending,
    isSuccess: loginMutation.isSuccess,
    isError: loginMutation.isError,
  };
}
