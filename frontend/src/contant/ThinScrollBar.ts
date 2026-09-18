// Slim, low-profile scrollbar (WebKit via arbitrary variants + Firefox via scrollbar-width)
export const THIN_SCROLLBAR =
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent " +
  "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 " +
  "dark:[&::-webkit-scrollbar-thumb]:bg-white/10 " +
  "hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-white/20 " +
  "[scrollbar-width:thin]";
