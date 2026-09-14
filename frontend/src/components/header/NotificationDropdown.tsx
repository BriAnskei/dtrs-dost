// components/header/NotificationDropdown.tsx
import { useState } from "react";
import { Link } from "react-router";
import { useNotifications } from "../../context/NotificationsContext";
import { useUser } from "../../context/currentUser/user-user";
import {
  type NotificationType,
  typeLabel,
  typeStyles,
} from "../notifications/NotificationItem";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

// ─── Role-based visibility ────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationDropdown() {
  const { currentUser } = useUser();
  const role = currentUser?.role_id;
  const { notifications, markAsRead, removeNotification, markAllAsRead } =
    useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const roleNotifications = notifications.filter((n) => {
    if (!role) return false;
    return ALLOWED_TYPES_BY_ROLE[role]?.includes(n.type) ?? false;
  });

  const unreadCount = roleNotifications.filter((n) => !n.isRead).length;

  function toggleDropdown() {
    setIsOpen((v) => !v);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  function handleMarkAsRead(id: number) {
    markAsRead(id);
  }

  function handleRemove(id: number) {
    removeNotification(id);
  }

  function handleMarkAllAsRead() {
    markAllAsRead();
  }

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-8 w-8 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
      >
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-orange-400 text-[9px] font-bold text-white">
            <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping" />
            <span className="relative">{unreadCount > 9 ? "9+" : unreadCount}</span>
          </span>
        )}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-400 text-white">
                {unreadCount}
              </span>
            )}
          </h5>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                title="Mark all as read"
                className="p-1.5 rounded-lg text-gray-400 hover:text-primary dark:hover:text-secondary hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
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
              </button>
            )}
            <button
              onClick={closeDropdown}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/[0.05] dark:hover:text-gray-200 transition-colors"
            >
              <svg
                className="fill-current w-5 h-5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* ── List ── */}
        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar gap-1">
          {notifications.length === 0 ? (
            <li className="flex items-center justify-center py-10 text-theme-sm text-gray-400 dark:text-gray-500">
              No notifications.
            </li>
          ) : (
            notifications.map((n) => (
              <li key={n.id}>
                <DropdownItem
                  onItemClick={closeDropdown}
                  className={`flex gap-3 px-3 py-2.5 transition-colors ${
                    !n.isRead ? "bg-primary/[0.03] dark:bg-secondary/[0.04]" : ""
                  }`}
                >
                  {/* Unread dot */}
                  <div className="mt-1 flex-shrink-0">
                    <span
                      className={`block w-2 h-2 rounded-full ${
                        !n.isRead ? "bg-primary dark:bg-secondary" : "bg-transparent"
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <span className="flex-1 min-w-0 block">
                    <span className="mb-1.5 block text-theme-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium text-gray-800 dark:text-white/90">
                        {n.userName}
                      </span>{" "}
                      <span>{n.description}</span>
                    </span>
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className={`text-theme-xs font-medium ${typeStyles[n.type]}`}>
                        {typeLabel[n.type]}
                      </span>
                      <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                      <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                        {n.time}
                      </span>
                    </span>
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {!n.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(n.id);
                        }}
                        title="Mark as read"
                        className="p-1 rounded-lg text-gray-400 hover:text-primary dark:hover:text-secondary transition-colors"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.8}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(n.id);
                      }}
                      title="Remove"
                      className="p-1 rounded-lg text-gray-400 hover:text-danger transition-colors"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.8}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </DropdownItem>
              </li>
            ))
          )}
        </ul>

        {/* ── Footer ── */}
        <Link
          to="/notification"
          onClick={closeDropdown}
          className="block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
        >
          View All Notifications
        </Link>
      </Dropdown>
    </div>
  );
}
