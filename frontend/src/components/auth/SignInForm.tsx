import { type SubmitEventHandler, useState } from "react";
import { useNavigate } from "react-router";
import { type RoleName, userUser } from "../../context/UserContext";
import Label from "../form/Label";

export default function SignInForm() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [identifier, setIdentifier] = useState(""); // username or email
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignin: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    if (!identifier.trim() || !password) {
      setError("Please enter your username/email and password.");
      return;
    }

    setError("");

    // TODO: replace with real auth call; identifier can be a username or an email

    if (rememberMe) {
      localStorage.setItem("dtrs_remember_identifier", identifier);
    } else {
      localStorage.removeItem("dtrs_remember_identifier");
    }

    navigate("/");
  };

  const handleForgotPassword = () => {
    navigate("/forgot-password");
  };

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

          <form onSubmit={handleSignin} noValidate>
            <div className="space-y-6">
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-2.5 text-sm text-danger"
                >
                  {error}
                </div>
              )}

              <div>
                <Label>
                  Username or Email <span className="text-danger">*</span>
                </Label>
                <Input
                  type="text"
                  name="identifier"
                  autoComplete="username"
                  placeholder="Enter your username or email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
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

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox checked={rememberMe} onChange={setRememberMe} />
                  <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                    Remember me
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-secondary hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <div>
                <button
                  type="submit"
                  className="bg-primary hover:bg-secondary w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors"
                >
                  Sign In
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
