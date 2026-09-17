-- =====================================================================
-- Default household name no longer derives from the user's name/email.
-- New sign-ups get a neutral "My Garage" they can rename any time from
-- Profile — the rename itself was already possible (see the "Owners can
-- rename their household" policy in the initial migration); this only
-- changes what a brand-new household is called before anyone touches it.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_household_id uuid;
begin
  insert into public.households (name)
    values ('My Garage')
    returning id into new_household_id;

  insert into public.household_members (household_id, user_id, role)
    values (new_household_id, new.id, 'owner');

  return new;
end;
$$;