-- SMCS, restrict self sign-up to staff at the DATABASE level, so the domain
-- rule can't be bypassed by calling the auth API directly. The UI checks too,
-- but this trigger is the real enforcement.
--
-- SUPERSEDED: the domain below (@smcs.org) is wrong, migration 0020 replaces
-- this function with '@smcares.org'. Kept for history, don't re-run this after
-- 0020.
--
-- Notes:
--   * BEFORE INSERT only, existing accounts are unaffected.
--   * New sign-ups still default to the powerless 'client' role (via
--     handle_new_user from 0005). The domain gates REGISTRATION, not access:
--     an admin must still elevate someone to employee/admin.
--   * This currently blocks ALL non-staff-domain user creation (incl. the
--     Supabase dashboard). When a separate client self-signup path is added,
--     broaden the condition to also allow verified clients.
--   * If the SMCS domain changes again, add a new migration AND update
--     STAFF_EMAIL_DOMAIN in src/lib/staffSignup.ts.
-- Run in Supabase SQL Editor.

create or replace function public.enforce_staff_signup_domain()
returns trigger
language plpgsql
as $$
begin
  if new.email is null or lower(new.email) not like '%@smcs.org' then
    raise exception 'Sign up is only available for SMCS staff email addresses';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_staff_signup_domain on auth.users;
create trigger enforce_staff_signup_domain
  before insert on auth.users
  for each row execute function public.enforce_staff_signup_domain();
