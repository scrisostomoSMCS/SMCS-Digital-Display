import { supabase } from "./supabase";

/*
  Admin-only user management. Both calls go through SECURITY DEFINER RPCs
  (migration 0012) that enforce admin access + guardrails in the database, the
  client can't bypass them.
*/
export type Role = "client" | "employee" | "admin";

export type AdminUser = {
  id: string;
  email: string;
  role: Role;
  full_name: string | null;
  created_at: string;
};

export async function fetchAllUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc("admin_list_users");
  if (error) {
    console.error("Failed to load users:", error.message);
    return [];
  }
  return (data ?? []) as AdminUser[];
}

// Returns null on success, or an error message (e.g. a guardrail rejection).
export async function updateUserRole(
  targetUserId: string,
  newRole: Role,
): Promise<string | null> {
  const { error } = await supabase.rpc("admin_update_user_role", {
    target_user_id: targetUserId,
    new_role: newRole,
  });
  return error ? error.message : null;
}
