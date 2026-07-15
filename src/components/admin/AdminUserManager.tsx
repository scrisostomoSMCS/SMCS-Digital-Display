"use client";

import { useEffect, useMemo, useState } from "react";
import { User } from "lucide-react";
import {
  fetchAllUsers,
  updateUserRole,
  type AdminUser,
  type Role,
} from "@/lib/adminUsers";
import { STAFF_EMAIL_DOMAIN } from "@/lib/staffSignup";

/*
  Admin panel: stat cards + two columns (Staff/employees and Administrators),
  styled to the mockup. The database RPCs remain the source of truth for the
  safety rules (admin-only, valid role, no self-demote, keep at least one
  admin); the UI mirrors them (no Remove on your own or the last admin row,
  confirmation prompts). Actions optimistically update local state; a failed
  write shows an error and the list stays truthful on next load.
*/
const ROLE_LABEL: Record<Role, string> = {
  client: "Client",
  employee: "Employee",
  admin: "Administrator",
};

// Prefer a real name; otherwise make a friendly one from the email local part.
function displayName(u: AdminUser): string {
  if (u.full_name && u.full_name.trim()) return u.full_name.trim();
  const local = u.email.split("@")[0] ?? u.email;
  const pretty = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
  return pretty || u.email;
}

function Avatar() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
      <User size={20} aria-hidden="true" />
    </span>
  );
}

function RolePill({ role }: { role: Role }) {
  const cls =
    role === "admin"
      ? "bg-blue text-paper"
      : role === "employee"
        ? "bg-teal text-paper"
        : "bg-ink/10 text-ink/70";
  return (
    <span
      className={`inline-block shrink-0 rounded-sm px-2.5 py-1 text-sm font-semibold ${cls}`}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="border-2 border-placeholder bg-paper px-5 py-4">
      <p className="text-sm font-semibold uppercase tracking-wide text-ink/60">
        {label}
      </p>
      <p className={`mt-1 text-4xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

// Small inline picker revealed by a "+ Add" button.
function AddPanel({
  title,
  candidates,
  emptyText,
  onPick,
}: {
  title: string;
  candidates: AdminUser[];
  emptyText: string;
  onPick: (u: AdminUser) => void;
}) {
  return (
    <div className="mt-3 border-2 border-blue/40 bg-blue/5 p-3">
      <p className="mb-2 text-sm font-semibold text-ink/70">{title}</p>
      {candidates.length === 0 ? (
        <p className="text-sm text-ink/50">{emptyText}</p>
      ) : (
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {candidates.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => onPick(u)}
                className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm hover:bg-blue/10"
              >
                <span className="min-w-0 truncate">
                  {displayName(u)}{" "}
                  <span className="text-ink/50">· {u.email}</span>
                </span>
                <span className="shrink-0 font-semibold text-blue">Select</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const grantBtn =
  "shrink-0 border-2 border-green-600 bg-green-600 px-4 py-1.5 text-sm font-semibold text-paper hover:bg-paper hover:text-green-600 disabled:opacity-60";
const removeBtn =
  "shrink-0 border-2 border-red-600 bg-red-600 px-4 py-1.5 text-sm font-semibold text-paper hover:bg-paper hover:text-red-600 disabled:opacity-60";

export default function AdminUserManager({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [addingStaff, setAddingStaff] = useState(false);
  const [addingAdmin, setAddingAdmin] = useState(false);

  async function load() {
    setLoading(true);
    setUsers(await fetchAllUsers());
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const admins = users.filter((u) => u.role === "admin");
  const staff = users.filter((u) => u.role !== "admin"); // clients + employees
  const adminCount = admins.length;
  const employeeCount = users.filter((u) => u.role === "employee").length;
  const clientCount = users.filter((u) => u.role === "client").length;

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        displayName(u).toLowerCase().includes(q),
    );
  }, [staff, search]);

  const clientCandidates = users.filter((u) => u.role === "client");
  const adminCandidates = users.filter((u) => u.role !== "admin");

  // All role changes flow through here so the confirm + RPC + guardrails and
  // feedback stay consistent. `verb` phrases the confirmation for each action.
  async function changeRole(user: AdminUser, newRole: Role, verb: string) {
    if (newRole === user.role) return;
    if (!window.confirm(`${verb} ${displayName(user)} (${user.email})?`)) return;
    setSavingId(user.id);
    setNotice(null);
    const err = await updateUserRole(user.id, newRole);
    setSavingId(null);
    if (err) {
      setNotice({ ok: false, text: `Couldn’t update ${user.email}: ${err}` });
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)),
    );
    setNotice({
      ok: true,
      text: `${displayName(user)} is now ${ROLE_LABEL[newRole]}.`,
    });
  }

  if (loading) return <p className="text-lg text-ink/70">Loading users…</p>;

  return (
    <div>
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Administrators" value={adminCount} accent="text-blue" />
        <StatCard label="Employees" value={employeeCount} accent="text-teal" />
        <StatCard label="Clients" value={clientCount} accent="text-ink" />
      </div>

      {notice && (
        <p
          role="status"
          className={`mt-6 border-l-4 py-2 pl-3 text-base ${
            notice.ok ? "border-teal bg-teal/10" : "border-red-600 bg-red-600/5"
          }`}
        >
          {notice.text}
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Staff / employees */}
        <section className="border-2 border-placeholder bg-paper">
          <div className="flex items-center justify-between gap-3 border-b border-placeholder px-4 py-3">
            <h2 className="text-xl font-bold">Staff – employee</h2>
            <button
              type="button"
              onClick={() => setAddingStaff((v) => !v)}
              className="border-2 border-teal px-3 py-1.5 text-sm font-semibold text-teal hover:bg-teal hover:text-paper"
            >
              + Add
            </button>
          </div>
          <div className="p-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee name or email"
              className="w-full border-2 border-ink/30 px-3 py-2 text-base focus:border-blue focus:outline-none"
            />

            {addingStaff && (
              <AddPanel
                title="Grant Employee access to a client"
                candidates={clientCandidates}
                emptyText="No clients available to grant access."
                onPick={(u) => {
                  setAddingStaff(false);
                  changeRole(u, "employee", "Grant Employee access to");
                }}
              />
            )}

            <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto">
              {filteredStaff.map((u) => {
                const needsReview =
                  u.email.toLowerCase().endsWith(`@${STAFF_EMAIL_DOMAIN}`) &&
                  u.role === "client";
                return (
                  <li
                    key={u.id}
                    className="flex items-center gap-3 border border-placeholder px-3 py-2"
                  >
                    <Avatar />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{displayName(u)}</p>
                      <p className="truncate text-sm text-ink/60">{u.email}</p>
                      {needsReview && (
                        <span className="mt-1 inline-block border border-teal px-1.5 py-0.5 text-xs font-semibold text-ink">
                          Needs review
                        </span>
                      )}
                    </div>
                    <RolePill role={u.role} />
                    {u.role === "client" ? (
                      <button
                        type="button"
                        disabled={savingId === u.id}
                        onClick={() =>
                          changeRole(u, "employee", "Grant Employee access to")
                        }
                        className={grantBtn}
                      >
                        Grant
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={savingId === u.id}
                        onClick={() =>
                          changeRole(u, "client", "Remove Employee access from")
                        }
                        className={removeBtn}
                      >
                        Remove
                      </button>
                    )}
                  </li>
                );
              })}
              {filteredStaff.length === 0 && (
                <li className="text-base text-ink/50">No matching people.</li>
              )}
            </ul>
          </div>
        </section>

        {/* Administrators */}
        <section className="border-2 border-placeholder bg-paper">
          <div className="flex items-center justify-between gap-3 border-b border-placeholder px-4 py-3">
            <h2 className="text-xl font-bold">Administrators</h2>
            <button
              type="button"
              onClick={() => setAddingAdmin((v) => !v)}
              className="border-2 border-teal px-3 py-1.5 text-sm font-semibold text-teal hover:bg-teal hover:text-paper"
            >
              + Add
            </button>
          </div>
          <div className="p-4">
            <p className="text-sm font-semibold text-red-600">
              Note: Administrators can add or remove other administrators.
            </p>

            {addingAdmin && (
              <AddPanel
                title="Grant Administrator access"
                candidates={adminCandidates}
                emptyText="No one available to promote."
                onPick={(u) => {
                  setAddingAdmin(false);
                  changeRole(u, "admin", "Grant Administrator access to");
                }}
              />
            )}

            <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto">
              {admins.map((u) => {
                const isSelf = u.id === currentUserId;
                const lastAdmin = adminCount <= 1;
                return (
                  <li
                    key={u.id}
                    className="flex items-center gap-3 border border-placeholder px-3 py-2"
                  >
                    <Avatar />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {displayName(u)}
                        {isSelf && (
                          <span className="ml-2 text-sm font-normal text-ink/50">
                            (You)
                          </span>
                        )}
                      </p>
                      <p className="truncate text-sm text-ink/60">{u.email}</p>
                    </div>
                    <RolePill role="admin" />
                    {isSelf ? (
                      // You can't remove your own admin access.
                      <span className="shrink-0 text-sm font-semibold text-ink/40">
                        You
                      </span>
                    ) : lastAdmin ? (
                      // Never remove the last remaining admin.
                      <span className="shrink-0 text-sm text-ink/40">
                        Last admin
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={savingId === u.id}
                        onClick={() =>
                          changeRole(
                            u,
                            "employee",
                            "Remove Administrator access from",
                          )
                        }
                        className={removeBtn}
                      >
                        Remove
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
