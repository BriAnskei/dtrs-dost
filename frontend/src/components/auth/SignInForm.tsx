import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { userUser } from "../../context/UserContext";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Checkbox from "../form/input/Checkbox";
import Input from "../form/input/InputField";
import Label from "../form/Label";

const ROLES = [
  { value: "division", label: "Division" },
  { value: "receiver", label: "Receiver" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
] as const;

const selectClasses =
  "h-11 w-full appearance-none rounded-lg border border-[#e2e8f0] bg-transparent bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22 viewBox=%220 0 20 20%22 fill=%22none%22><path d=%22M5 7.5L10 12.5L15 7.5%22 stroke=%22%23475569%22 stroke-width=%221.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>')] bg-no-repeat bg-[right_1rem_center] px-4 py-2.5 pr-10 text-sm text-text shadow-theme-xs focus:border-[#2563eb] focus:outline-hidden focus:ring-3 focus:ring-[#2563eb]/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-secondary";

export default function SignInForm() {
  const navigate = useNavigate();
  const { setCurrUser } = userUser();

  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [role, setRole] = useState("");

  const handleSignin = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCurrUser(role);

    navigate("/");
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
              Select your role and enter your credentials to continue.
            </p>
          </div>

          <form onSubmit={handleSignin}>
            <div className="space-y-6">
              <div>
                <Label>
                  Role <span className="text-danger">*</span>
                </Label>
                <select
                  className={selectClasses}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="" disabled>
                    Select your role
                  </option>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              {/*
              <div>
                <Label>
                  Username <span className="text-danger">*</span>
                </Label>
                <Input placeholder="Enter your username" />
              </div>

              <div>
                <Label>
                  Password <span className="text-danger">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                    )}
                  </span>
                </div>
              </div> */}
              {/*
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox checked={isChecked} onChange={setIsChecked} />
                  <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                    Keep me logged in
                  </span>
                </div>
                <span className="text-sm text-secondary cursor-default">
                  Forgot password?
                </span>
              </div> */}

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
