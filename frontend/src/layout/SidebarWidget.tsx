export default function SidebarWidget() {
  return (
    <div
      className={`
        mx-auto mb-10 w-full max-w-60 rounded-2xl bg-background px-4 py-5 text-center dark:bg-white/[0.03]`}
    >
      <h3 className="mb-2 font-semibold text-text dark:text-white">
        #1 Tailwind CSS Dashboard
      </h3>
      <p className="mb-4 text-text/50 text-theme-sm dark:text-gray-400">
        Leading Tailwind CSS Admin Template with 400+ UI Component and Pages.
      </p>
      <a
        href="https://tailadmin.com/pricing"
        target="_blank"
        rel="noopener nofollow"
        className="flex items-center justify-center p-3 font-medium text-white rounded-lg bg-[#2563eb] text-theme-sm hover:bg-[#1d4ed8]"
      >
        Purchase Plan
      </a>
    </div>
  );
}
