"use client";

import { useEffect, useState } from "react";
import {
  fetchAllUsers,
  updateUserRole,
  type AdminUser,
  type Role,
} from "@/lib/adminUsers";
import { STAFF_EMAIL_DOMAIN } from "@/lib/staffSignup";

const ROLES: Role[] = ["client", "employee", "admin"];
const ROLE_LABEL: Record<Role, string> = {
  client: "Client",
  employee: "Employee",
  admin: "Admin",
};

/*
  Lists all users and lets an admin change each user's role. The database RPCs
  are the source of truth for the safety rules (admin-only, valid role, no
  self-demote, keep at least one admin); the UI mirrors them (disabled options,
  confirmation) for a good experience. The role <select> is controlled by state,
  so a cancelled/failed change simply reverts.
*/
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

  async function load() {
    setLoading(true);
    setUsers(await fetchAllUsers());
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const adminCount = users.filter((u) => u.role === "admin").length;

  async function changeRole(user: AdminUser, newRole: Role) {
    if (newRole === user.role) return;
    if (
      !window.confirm(
        `Change access for ${user.email} to ${ROLE_LABEL[newRole]}?`,
      )
    )
      return;
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
    setNotice({ ok: true, text: `${user.email} is now ${ROLE_LABEL[newRole]}.` });
  }

  if (loading) return <p className="text-lg text-ink/70">Loading users…</p>;

  return (
    <div>
      {notice && (
        <p
          role="status"
          className={`mb-4 border-l-4 py-2 pl-3 text-base ${
            notice.ok ? "border-teal bg-teal/10" : "border-blue"
          }`}
        >
          {notice.text}
        </p>
      )}

      <div className="overflow-x-auto border-2 border-placeholder">
        <table className="w-full text-left">
          <thead className="bg-ink/5 text-base">
            <tr>
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Joined</th>
              <th className="px-4 py-3 font-semibold">Access level</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              // Admin role locked (can't switch away) if it's you or the last admin.
              const lockAdmin =
                u.role === "admin" && (isSelf || adminCount <= 1);
              const needsReview =
                u.email.toLowerCase().endsWith(`@${STAFF_EMAIL_DOMAIN}`) &&
                u.role === "client";
              return (
                <tr key={u.id} className="border-t border-placeholder align-top">
                  <td className="px-4 py-3">
                    <span className="block text-lg font-semibold">
                      {u.email}
                      {isSelf && (
                        <span className="ml-2 text-sm font-normal text-ink/50">
                          (you)
                        </span>
                      )}
                    </span>
                    {u.full_name && (
                      <span className="block text-base text-ink/60">
                        {u.full_name}
                      </span>
                    )}
                    {needsReview && (
                      <span className="mt-1 inline-block border-2 border-teal px-2 py-0.5 text-sm font-semibold text-ink">
                        Staff: needs review
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-base text-ink/70">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <select
                        value={u.role}
                        disabled={savingId === u.id}
                        onChange={(e) => changeRole(u, e.target.value as Role)}
                        aria-label={`Access level for ${u.email}`}
                        className="border-2 border-ink/30 px-3 py-2 text-base focus:border-blue focus:outline-none disabled:opacity-60"
                      >
                        {ROLES.map((r) => (
                          <option
                            key={r}
                            value={r}
                            disabled={lockAdmin && r !== "admin"}
                          >
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                      {savingId === u.id && (
                        <span className="text-base text-ink/60">Saving…</span>
                      )}
                    </div>
                    {lockAdmin && (
                      <p className="mt-1 text-sm text-ink/50">
                        {isSelf
                          ? "You can’t remove your own admin access."
                          : "The last admin can’t be demoted."}
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
