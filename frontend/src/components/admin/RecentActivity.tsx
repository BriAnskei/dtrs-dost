// components/admin/RecentActivity.tsx
import { useNavigate } from "react-router";

interface ActivityItem {
  title: string;
  meta: string;
  time: string;
  tone: "upload" | "route" | "complete";
}

const activity: ActivityItem[] = [
  {
    title: "Road Widening Proposal uploaded",
    meta: "DOC-2024-087 · J. Reyes",
    time: "12m ago",
    tone: "upload",
  },
  {
    title: "Bridge Inspection Report routed",
    meta: "DOC-2024-086 · → Roads Division",
    time: "38m ago",
    tone: "route",
  },
  {
    title: "Equipment Request completed",
    meta: "DOC-2024-085 · M. Santos",
    time: "1h ago",
    tone: "complete",
  },
  {
    title: "Drainage Repair uploaded",
    meta: "DOC-2024-084 · L. Cruz",
    time: "2h ago",
    tone: "upload",
  },
  {
    title: "Right-of-Way Clearance routed",
    meta: "DOC-2024-083 · → Planning Division",
    time: "4h ago",
    tone: "route",
  },
];

const toneStyles = {
  upload: {
    dot: "bg-secondary",
    icon: "M12 16V4m0 0L7 9m5-5l5 5M5 20h14",
    ring: "bg-secondary/10",
  },
  route: {
    dot: "bg-primary",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    ring: "bg-primary/10",
  },
  complete: {
    dot: "bg-success",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    ring: "bg-success/10",
  },
};

export default function RecentActivity() {
  const navigate = useNavigate();

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Recent Activity
          </h3>
          <p className="text-theme-sm mt-1 text-gray-500 dark:text-gray-400">
            Latest uploads &amp; routing
          </p>
        </div>
        <button
          onClick={() => navigate("/upload-queue")}
          className="text-theme-sm font-medium text-primary hover:underline dark:text-secondary"
        >
          View all
        </button>
      </div>

      <ul className="space-y-1">
        {activity.map((item, i) => {
          const t = toneStyles[item.tone];
          return (
            <li
              key={i}
              className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-gray-50 dark:hover:bg-white/[0.03]"
            >
              <span
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${t.ring}`}
              >
                <svg
                  className="size-4.5 text-current"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke={t.dot}
                  strokeWidth={1.8}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-theme-sm truncate font-medium text-gray-800 dark:text-white/90">
                  {item.title}
                </p>
                <p className="text-theme-xs mt-0.5 truncate text-gray-400 dark:text-gray-500">
                  {item.meta}
                </p>
              </div>
              <span className="text-theme-xs flex-shrink-0 text-gray-400 dark:text-gray-500">
                {item.time}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
