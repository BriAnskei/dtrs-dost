// ─── Main Component ───────────────────────────────────────────────────────────

import { useState } from "react";
import Badge from "../../../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { ALL_ROLES, THIN_SCROLLBAR } from "../constant";
import { getRoleBadgeColor, getStatusStyles } from "../helpers";
import { mockUsers } from "../mockData";
import {
  type AccountStatus,
  EMPTY_FORM,
  type SystemUser,
  type UserFormState,
  type UserManagementTableProps,
  type UserRole,
} from "../type/mock.types";
import ConfirmDisableModal from "./ConfirmDisableModal";
import KebabMenu from "./kebebMenu";
import MobileCard from "./MobileCard";
import UserFormModal from "./UserFormModal";

export default function UserManagementTable({
  maxTableHeight = "560px",
  maxMobileHeight = "520px",
}: UserManagementTableProps = {}) {
  const [users, setUsers] = useState<SystemUser[]>(mockUsers);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "All">("All");
  const [filterStatus, setFilterStatus] = useState<AccountStatus | "All">("All");

  // Modal state
  const [addModal, setAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<SystemUser | null>(null);
  const [disableTarget, setDisableTarget] = useState<SystemUser | null>(null);

  // ── Handlers ──

  function handleAdd(data: UserFormState) {
    const newUser: SystemUser = {
      id: Date.now(),
      ...data,
      status: "Active",
    };
    setUsers((prev) => [newUser, ...prev]);
    setAddModal(false);
  }

  function handleEdit(data: UserFormState) {
    if (!editTarget) return;
    setUsers((prev) => prev.map((u) => (u.id === editTarget.id ? { ...u, ...data } : u)));
    setEditTarget(null);
  }

  function handleToggleStatus() {
    if (!disableTarget) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === disableTarget.id
          ? { ...u, status: u.status === "Active" ? "Disabled" : "Active" }
          : u,
      ),
    );
    setDisableTarget(null);
  }

  // ── Filtered list ──

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.title.toLowerCase().includes(q);
    const matchesRole = filterRole === "All" || u.role === filterRole;
    const matchesStatus = filterStatus === "All" || u.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const hasFilters = search || filterRole !== "All" || filterStatus !== "All";

  return (
    <>
      <div className="space-y-4">
        {/* ── Toolbar ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          {/* Left: search + filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end flex-1">
            {/* Search */}
            <div className="relative w-full sm:flex-1 sm:min-w-50">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
                  />
                </svg>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or position…"
                className="w-full pl-9 pr-4 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 dark:placeholder-gray-500 transition"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap items-center">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as UserRole | "All")}
                className="flex-1 min-w-32.5 px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 transition"
              >
                <option value="All">All Roles</option>
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as AccountStatus | "All")}
                className="flex-1 min-w-32.5 px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 transition"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Disabled">Disabled</option>
              </select>

              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilterRole("All");
                    setFilterStatus("All");
                  }}
                  className="px-3 py-2 text-theme-sm text-gray-500 hover:text-danger border border-gray-200 rounded-lg hover:border-danger/40 transition-colors dark:border-white/8 dark:text-gray-400 dark:hover:text-danger whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Right: Add User button */}
          <button
            type="button"
            onClick={() => setAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-theme-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors whitespace-nowrap"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        </div>

        {/* ── Mobile Cards (< md) ── */}
        <div className="md:hidden space-y-3">
          <div
            className={`overflow-y-auto space-y-3 pr-1 ${THIN_SCROLLBAR}`}
            style={{ maxHeight: maxMobileHeight }}
          >
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] px-5 py-10 text-center text-gray-400 text-theme-sm">
                No users match your filters.
              </div>
            ) : (
              filtered.map((user) => (
                <MobileCard
                  key={user.id}
                  user={user}
                  onEdit={() => setEditTarget(user)}
                  onToggleStatus={() => setDisableTarget(user)}
                />
              ))
            )}
          </div>
          {filtered.length > 0 && (
            <p className="text-theme-xs text-gray-400 dark:text-gray-500 text-right px-1">
              Showing{" "}
              <span className="font-medium text-gray-600 dark:text-gray-300">
                {filtered.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-600 dark:text-gray-300">
                {users.length}
              </span>{" "}
              users
            </p>
          )}
        </div>

        {/* ── Desktop Table (≥ md) ── */}
        <div className="hidden md:block rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] overflow-hidden">
          {/* Horizontal scroll only */}
          <div className="w-full overflow-x-auto">
            {/* Vertical scroll only — separated from the horizontal axis so its own
                scrollbar gutter doesn't get counted into maxHeight and force an
                unwanted vertical scrollbar when the content actually fits. */}
            <div
              className={`overflow-y-auto ${THIN_SCROLLBAR}`}
              style={{ maxHeight: maxTableHeight }}
            >
              <Table>
                <TableHeader className="dark:border-white/[0.05] sticky top-0 z-10 bg-white dark:bg-gray-900">
                  <TableRow>
                    {[
                      "Name / Position",
                      "Role",
                      "Email",
                      "Contact",
                      "Account Status",
                      "Action",
                    ].map((col) => (
                      <TableCell
                        key={col}
                        isHeader
                        className="px-4 py-3 font-semibold text-primary text-start text-theme-xs dark:text-gray-300 whitespace-nowrap"
                      >
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody className="dark:divide-white/[0.05]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-10 text-center text-gray-400 text-theme-sm"
                      >
                        No users match your filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((user) => (
                      <TableRow
                        key={user.id}
                        className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        {/* Name / Position */}
                        <TableCell className="px-4 py-3">
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {user.name}
                          </span>
                          <span className="block text-gray-400 text-theme-xs dark:text-gray-500 mt-0.5">
                            {user.title}
                          </span>
                        </TableCell>

                        {/* Role */}
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          <Badge size="sm" color={getRoleBadgeColor(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>

                        {/* Email */}
                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                          <span
                            className="block truncate max-w-[200px]"
                            title={user.email}
                          >
                            {user.email}
                          </span>
                        </TableCell>

                        {/* Contact */}
                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">
                          {user.contact}
                        </TableCell>

                        {/* Account Status - with explicit red for Disabled */}
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`text-theme-sm font-medium ${getStatusStyles(user.status)}`}
                          >
                            {user.status}
                          </span>
                        </TableCell>

                        {/* Action */}
                        <TableCell className="px-4 py-3">
                          <KebabMenu
                            user={user}
                            onEdit={() => setEditTarget(user)}
                            onToggleStatus={() => setDisableTarget(user)}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Footer */}
          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-white/[0.05]">
              <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                Showing{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {filtered.length}
                </span>{" "}
                of{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {users.length}
                </span>{" "}
                users
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {addModal && (
        <UserFormModal
          mode="add"
          initial={EMPTY_FORM}
          onSave={handleAdd}
          onClose={() => setAddModal(false)}
        />
      )}

      {editTarget && (
        <UserFormModal
          mode="edit"
          initial={{
            name: editTarget.name,
            title: editTarget.title,
            role: editTarget.role,
            email: editTarget.email,
            contact: editTarget.contact,
          }}
          onSave={handleEdit}
          onClose={() => setEditTarget(null)}
        />
      )}

      {disableTarget && (
        <ConfirmDisableModal
          user={disableTarget}
          onConfirm={handleToggleStatus}
          onClose={() => setDisableTarget(null)}
        />
      )}
    </>
  );
}
