import { Link } from "react-router";
import GridShape from "../../components/common/GridShape";
import PageMeta from "../../components/common/PageMeta";

export default function Unauthorized() {
  return (
    <>
      <PageMeta
        title="React.js 403 Dashboard | TailAdmin - React.js Admin Dashboard Template"
        description="This is React.js 403 Unauthorized Access page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden z-1 bg-background">
        <GridShape />
        <div className="mx-auto w-full max-w-[242px] text-center sm:max-w-[472px]">
          <h1 className="mb-8 font-bold text-danger text-title-md xl:text-title-2xl">
            403
          </h1>

          <img src="/images/error/403.svg" alt="403" className="dark:hidden" />
          <img src="/images/error/403-dark.svg" alt="403" className="hidden dark:block" />

          <p className="mt-10 mb-2 text-base font-medium text-text sm:text-lg">
            Unauthorized Access
          </p>
          <p className="mb-6 text-sm text-text/70 sm:text-base">
            You don’t have permission to view this page. If you believe this is a mistake,
            please contact your administrator.
          </p>

          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg border border-[#2563eb] bg-[#2563eb] px-5 py-3.5 text-sm font-medium text-white shadow-theme-xs hover:bg-[#1d4ed8] hover:border-[#1d4ed8]"
          >
            Back to Home Page
          </Link>
        </div>
        {/* <!-- Footer --> */}
        <p className="absolute text-sm text-center text-text/70 -translate-x-1/2 bottom-6 left-1/2">
          &copy; {new Date().getFullYear()} - TailAdmin
        </p>
      </div>
    </>
  );
}
