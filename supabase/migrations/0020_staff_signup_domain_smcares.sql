-- SMCS: the staff email domain is smcares.org, not smcs.org. Migration 0011
-- created the sign-up trigger with the wrong domain, this replaces the function
-- body so registration is gated on '@smcares.org'.
--
-- Notes:
--   * Only the function changes, the trigger from 0011 stays as-is and picks up
--     the new body automatically.
--   * Existing accounts are unaffected (BEFORE INSERT only). If any staff signed
--     up under the old domain, their logins keep working.
--   * The UI half is STAFF_EMAIL_DOMAIN in src/lib/staffSignup.ts, keep the two
--     in sync.
--
-- Run this in the Supabase SQL Editor after 0019.

create or replace function public.enforce_staff_signup_domain()
returns trigger
language plpgsql
as $$
begin
  if new.email is null or lower(new.email) not like '%@smcares.org' then
    raise exception 'Sign up is only available for SMCS staff email addresses';
  end if;
  return new;
end;
$$;
