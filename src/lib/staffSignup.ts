/*
  Staff self-registration is limited to this email domain. Keep this the single
  source of truth for the allowed domain (change here if SMCS's domain differs).
  The SAME rule is enforced in the database (migration 0011) so it can't be
  bypassed by calling the auth API directly, this constant is the UI half.
*/
export const STAFF_EMAIL_DOMAIN = "smcs.org";

export function isStaffEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${STAFF_EMAIL_DOMAIN}`);
}
