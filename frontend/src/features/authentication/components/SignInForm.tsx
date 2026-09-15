import { useState } from "react";
import Checkbox from "../../../components/form/input/Checkbox";
import Input from "../../../components/form/input/InputField";
import Label from "../../../components/form/Label";
import { EyeCloseIcon, EyeIcon } from "../../../icons";
import { useSignin } from "../hooks/useSignin";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminContact, setShowAdminContact] = useState(false);

  const {
    email,
    password,
    rememberMe,
    error,
    setEmail,
    setPassword,
    setRememberMe,
    handleLogin,
    isPending,
  } = useSignin();

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="text-text text-title-sm sm:text-title-md mb-2 font-semibold dark:text-white/90">
              Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your username or email and password to continue.
            </p>
          </div>

          <form onSubmit={handleLogin} noValidate>
            <div className="space-y-6">
              {error && (
                <div
                  role="alert"
                  className="flex items-center gap-1.5 text-sm text-danger"
                >
                  <svg
                    aria-hidden="true"
                    className="size-4 shrink-0"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 6.5v4M10 13.5h.01M17.5 10a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <Label>
                  Email <span className="text-danger">*</span>
                </Label>
                <Input
                  type="text"
                  name="email"
                  autoComplete="username"
                  placeholder="Enter your username or email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <Label>
                  Password <span className="text-danger">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute z-30 -translate-y-1/2 right-4 top-1/2"
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={rememberMe} onChange={setRememberMe} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      Remember me
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAdminContact(true)}
                    className="text-sm text-secondary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                {showAdminContact && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Please contact your system administrator to reset your password.
                  </p>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-primary hover:bg-secondary w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "Signing in..." : "Sign In"}
                </button>
              </div>
            </div>
          </form>

          <div className="mt-5">
            <p className="text-center text-sm font-normal text-gray-500 dark:text-gray-400">
              Need access? Contact your system administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
