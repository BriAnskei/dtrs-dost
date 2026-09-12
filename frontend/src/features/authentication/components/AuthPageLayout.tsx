import type React from "react";
import { Link } from "react-router";
import GridShape from "../../../components/common/GridShape";
import CompanyLogo from "../../../components/logo/CompanyLogo";

export default function AuthLayout({
  children,
  forceLightLogo = false,
}: {
  children: React.ReactNode;
  forceLightLogo?: boolean;
}) {
  return (
    <div className="bg-background relative z-1 p-6 sm:p-0 dark:bg-gray-900">
      <div className="relative flex h-screen w-full flex-col justify-center sm:p-0 lg:flex-row dark:bg-gray-900">
        {children}
        <div className="bg-primary dark:bg-primary hidden h-full w-full items-center lg:grid lg:w-1/2">
          <div className="relative z-1 flex items-center justify-center">
            <GridShape />
            <div className="flex max-w-xs flex-col items-center">
              <Link to="/" className="mb-5 block">
                <CompanyLogo size={176} forceLight={forceLightLogo} />
              </Link>
              <h2 className="mb-2 text-center text-lg font-semibold text-white">
                Document Tracking System
              </h2>
              <p className="text-center text-sm text-white/70">
                Provincial Engineering Office — internal records and document routing
                portal
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
