import type React from "react";
import { createContext, useCallback, useContext, useState } from "react";
import {
  type NotificationType,
  typeLabel,
  typeStyles,
} from "../components/notifications/NotificationItem";

// ─── Types ────────────────────────────────────────────────────────────

export interface AppNotification {
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

interface NotificationsContextValue {
  notifications: AppNotification[];
  addNotification: (n: Omit<AppNotification, "id">) => void;
  removeNotification: (id: number) => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

// ─── Mock Data ────────────────────────────────────────────────────────

const initialNotifications: AppNotification[] = [
  {
    id: 1,
    userName: "Terry Franci",
    role: "super-admin",
    description: "uploaded a new incoming document.",
    time: "5 min ago",
    date: "2024-02-01",
    type: "INCOMING_DOC_UPLOAD",
    link: "/incoming",
    isRead: false,
  },
  {
    id: 2,
    userName: "Alena Franci",
    role: "admin",
    description: "uploaded a new outgoing document.",
    time: "12 min ago",
    date: "2024-02-01",
    type: "OUTGOING_DOC_UPLOAD",
    link: "/outgoing",
    isRead: false,
  },
  {
    id: 3,
    userName: "Alena Franci",
    role: "admin",
    description: "approved your submitted document.",
    time: "30 min ago",
    date: "2024-02-01",
    type: "DOCUMENT_APPROVED",
    isRead: false,
  },
  {
    id: 4,
    userName: "Carlos Mendoza",
    role: "admin",
    description: "changed the status of INC-2024-004 to On-Going.",
    time: "1 hr ago",
    date: "2024-01-31",
    type: "STATUS_CHANGED",
    isRead: true,
  },
  {
    id: 5,
    userName: "Jocelyn Kenter",
    role: "admin",
    description: "rejected your submitted document.",
    time: "2 hrs ago",
    date: "2024-01-31",
    type: "DOCUMENT_REJECTED",
    isRead: false,
  },
  {
    id: 6,
    userName: "Maria Santos",
    role: "super-admin",
    description: "flagged INC-2024-006 for validation.",
    time: "3 hrs ago",
    date: "2024-01-31",
    type: "DOCUMENT_VALIDATION",
    isRead: true,
  },
  {
    id: 7,
    userName: "Ramon Garcia",
    role: "admin",
    description: "updated the details of document 2024-30-006.",
    time: "Yesterday",
    date: "2024-01-30",
    type: "DOCUMENT_UPDATE",
    isRead: false,
  },
  {
    id: 8,
    userName: "Ana Cruz",
    role: "admin",
    description: "approved the procurement of office supplies request.",
    time: "2 days ago",
    date: "2024-01-29",
    type: "DOCUMENT_APPROVED",
    isRead: true,
  },
  {
    id: 9,
    userName: "Carlos Mendoza",
    role: "admin",
    description: "placed a new document on the queue for your processing.",
    time: "8 min ago",
    date: "2024-02-01",
    type: "ON_QUEUE",
    link: "/incoming",
    isRead: false,
  },
  {
    id: 10,
    userName: "Maria Santos",
    role: "super-admin",
    description: "marked document INC-2024-010 as received.",
    time: "25 min ago",
    date: "2024-02-01",
    type: "RECEIVED",
    link: "/incoming",
    isRead: false,
  },
  {
    id: 11,
    userName: "Ramon Garcia",
    role: "admin",
    description: "received a new incoming document for processing.",
    time: "1 hr ago",
    date: "2024-02-01",
    type: "RECEIVED",
    link: "/incoming",
    isRead: true,
  },
  {
    id: 12,
    userName: "Maria Santos",
    role: "super-admin",
    description: "assigned document INC-2024-012 to your division for processing.",
    time: "4 min ago",
    date: "2024-02-01",
    type: "DOCUMENT_ASSIGNED",
    link: "/incoming",
    isRead: false,
  },
  {
    id: 13,
    userName: "Carlos Mendoza",
    role: "admin",
    description: "changed the status of INC-2024-012 to On-Going.",
    time: "20 min ago",
    date: "2024-02-01",
    type: "STATUS_CHANGED",
    link: "/incoming",
    isRead: false,
  },
  {
    id: 14,
    userName: "System",
    role: "admin",
    description: "Document ABC-001 has not changed status for almost one year.",
    time: "2 days ago",
    date: "2024-01-29",
    type: "DOC_STALE_ALMOST",
    link: "/incoming",
    isRead: false,
  },
  {
    id: 15,
    userName: "System",
    role: "admin",
    description: "Document XYZ-010 has remained in the same status for one year.",
    time: "5 days ago",
    date: "2024-01-26",
    type: "DOC_STALE_YEAR",
    link: "/incoming",
    isRead: false,
  },
];

// ─── Context ──────────────────────────────────────────────────────────

const NotificationsContext = createContext<NotificationsContextValue | undefined>(
  undefined,
);

// ─── Provider ─────────────────────────────────────────────────────────

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] =
    useState<AppNotification[]>(initialNotifications);

  const addNotification = useCallback((n: Omit<AppNotification, "id">) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [{ ...n, id }, ...prev]);
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markAsRead = useCallback((id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (ctx === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return ctx;
}
