import { useMutation } from "@tanstack/react-query";
import { type SubmitEventHandler, useState } from "react";
import { useNavigate } from "react-router";
import { useUser } from "../../../context/currentUser/use-user";
import { getApiErrorMessage, isNetworkError } from "../../../lib/api-error";
import { markAuthenticated } from "../authentication.session";
import { authenticationService } from "../service/authentication.service";
import type { LoginDto } from "../type/authentication.type";

export function useSignin() {
  const navigate = useNavigate();
  const { setCurrentUser } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  const loginMutation = useMutation({
    mutationFn: (dto: LoginDto) => authenticationService.signIn(dto),

    onSuccess: (userData) => {
      navigate("/", { replace: true });
      setCurrentUser(userData);
      markAuthenticated();
    },

    onError: (error) => {
      console.log(error);
      const message = isNetworkError(error)
        ? "Could not connect to the server. Check your connection."
        : getApiErrorMessage(error, "Login failed.");
      setError(message);
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
