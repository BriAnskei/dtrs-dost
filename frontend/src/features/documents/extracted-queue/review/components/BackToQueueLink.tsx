import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

const BACK_PATH = "/extracted-queues";

export default function BackToQueueLink() {
  return (
    <Link
      to={BACK_PATH}
      className="inline-flex items-center gap-1.5 text-theme-sm text-gray-600 transition hover:text-secondary dark:text-gray-300"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to queue
    </Link>
  );
}
