import type React from "react";
import { useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import {
  NotificationItem,
  type NotificationType,
  typeLabel,
} from "../../components/notifications/NotificationItem";
import { useUser } from "../../context/currentUser/use-user";
import { useNotifications } from "../../context/NotificationsContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id: number;
  userName: string;
  role: "super-admin" | "admin" | "receiver";
  description: string;
  time: string;
  date: string;
  type: NotificationType;
  link?: string;
  isRead: boolean;
}

// ─── Role-based visibility ────────────────────────────────────────────────────

// role 1 = super_admin, role 2 = admin, role 3 = receiver
const ALLOWED_TYPES_BY_ROLE: Record<number, NotificationType[]> = {
  1: [
    "INCOMING_DOC_UPLOAD",
    "OUTGOING_DOC_UPLOAD",
    "DOCUMENT_VALIDATION",
    "STATUS_CHANGED",
    "DOCUMENT_UPDATE",
    "DOC_STALE_ALMOST",
    "DOC_STALE_YEAR",
  ],
  2: [
    "INCOMING_DOC_UPLOAD",
    "OUTGOING_DOC_UPLOAD",
    "DOCUMENT_VALIDATION",
    "STATUS_CHANGED",
    "DOCUMENT_UPDATE",
    "DOC_STALE_ALMOST",
    "DOC_STALE_YEAR",
  ],
  3: ["RECEIVED", "ON_QUEUE", "DOCUMENT_REJECTED"],
  4: ["DOCUMENT_ASSIGNED", "STATUS_CHANGED"],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const NotificationPage: React.FC = () => {
  const { currentUser } = useUser();
  const role = currentUser?.role_id;
  const {
    notifications,
    markAsRead,
    removeNotification,
    markAllAsRead,
    clearNotifications,
  } = useNotifications();

  // Filter notifications by role
  const roleNotifications = notifications.filter((n) => {
    if (!role) return false;
    return ALLOWED_TYPES_BY_ROLE[role]?.includes(n.type) ?? false;
  });
  const [filterType, setFilterType] = useState<NotificationType | "All">("All");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Only show type options relevant to the current role
  const availableTypes: NotificationType[] = role
    ? (ALLOWED_TYPES_BY_ROLE[role] ?? [])
    : [];

  function handleMarkAsRead(id: number) {
    markAsRead(id);
  }

  function handleRemove(id: number) {
    removeNotification(id);
  }

  function handleMarkAllAsRead() {
    markAllAsRead();
  }

  function handleRemoveAll() {
    clearNotifications();
  }

  const filtered = roleNotifications.filter((n) => {
    const matchesType = filterType === "All" || n.type === filterType;
    const date = new Date(n.date);
    const matchesFrom = !filterDateFrom || date >= new Date(filterDateFrom);
    const matchesTo = !filterDateTo || date <= new Date(filterDateTo);
    return matchesType && matchesFrom && matchesTo;
  });

  const hasFilters = filterType !== "All" || filterDateFrom || filterDateTo;
  const unreadCount = roleNotifications.filter((n) => !n.isRead).length;

  return (
    <>
      <PageMeta
        title="Notifications | Document Tracking System"
        description="View and manage all system notifications."
      />
      <PageBreadcrumb pageTitle="Notifications" />

      <div className="space-y-6">
        <ComponentCard
          title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          headerRight={
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-theme-xs font-medium text-[#475569] border border-[#e2e8f0] bg-white hover:bg-gray-50 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Mark all as read
                </button>
              )}
              {roleNotifications.length > 0 && (
                <button
                  onClick={handleRemoveAll}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-theme-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] hover:bg-red-50 dark:hover:bg-danger/10 hover:text-danger hover:border-danger/30 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Remove all
                </button>
              )}
            </div>
          }
        >
          {/* ── Filters ── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as NotificationType | "All")}
              className="flex-1 min-w-[180px] px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 transition"
            >
              <option value="All">All Types</option>
              {availableTypes.map((t) => (
                <option key={t} value={t}>
                  {typeLabel[t]}
                </option>
              ))}
            </select>

            <div className="flex flex-col gap-1">
              <label className="text-theme-xs text-gray-500 dark:text-gray-400 font-medium">
                From
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 transition"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-theme-xs text-gray-500 dark:text-gray-400 font-medium">
                To
              </label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 transition"
              />
            </div>

            {hasFilters && (
              <button
                onClick={() => {
                  setFilterType("All");
                  setFilterDateFrom("");
                  setFilterDateTo("");
                }}
                className="px-3 py-2 text-theme-sm text-gray-500 hover:text-danger border border-gray-200 rounded-lg hover:border-danger/40 transition-colors dark:border-white/[0.08] dark:text-gray-400 dark:hover:text-danger whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>

          {/* ── List ── */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] px-5 py-10 text-center text-gray-400 text-theme-sm">
                {roleNotifications.length === 0
                  ? "No notifications."
                  : "No notifications match your filters."}
              </div>
            ) : (
              filtered.map((n) => (
                <NotificationItem
                  key={n.id}
                  {...n}
                  onMarkAsRead={handleMarkAsRead}
                  onRemove={handleRemove}
                />
              ))
            )}
          </div>

          {/* ── Footer count ── */}
          {filtered.length > 0 && (
            <p className="text-theme-xs text-gray-400 dark:text-gray-500 text-right px-1">
              Showing{" "}
              <span className="font-medium text-gray-600 dark:text-gray-300">
                {filtered.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-600 dark:text-gray-300">
                {roleNotifications.length}
              </span>{" "}
              notifications
            </p>
          )}
        </ComponentCard>
      </div>
    </>
  );
};

export default NotificationPage;
