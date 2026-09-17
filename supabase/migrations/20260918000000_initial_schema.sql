-- =====================================================================
-- KeretaKu — initial schema
-- Households own vehicles; users belong to households. v1 has one user
-- per household, but sharing later is just another household_members row.
-- =====================================================================

-- ---------- Households ----------
create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  created_at  timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         text not null default 'owner' check (role in ('owner', 'member')),
  created_at   timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index household_members_user_idx on public.household_members (user_id);

-- ---------- Vehicles ----------
create table public.vehicles (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references public.households (id) on delete cascade,
  body_type         text not null default 'compact'
                    check (body_type in ('compact', 'sedan', 'suv', 'mpv', 'motorcycle')),
  fuel_type         text not null default 'petrol'
                    check (fuel_type in ('petrol', 'diesel', 'electric', 'hybrid')),
  make              text not null check (char_length(make) between 1 and 40),
  model             text not null check (char_length(model) between 1 and 60),
  variant           text check (char_length(variant) <= 40),
  year              int  not null check (year between 1950 and 2100),
  plate_number      text check (char_length(plate_number) <= 20),
  road_tax_expiry   date,
  insurance_expiry  date,
  odometer_km       int  not null default 0 check (odometer_km >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index vehicles_household_idx on public.vehicles (household_id);

-- ---------- Logs ----------
create table public.fuel_logs (
  id            uuid primary key default gen_random_uuid(),
  vehicle_id    uuid not null references public.vehicles (id) on delete cascade,
  logged_on     date not null default current_date,
  odometer_km   int check (odometer_km >= 0),
  litres        numeric(6, 2) not null check (litres > 0),
  total_cost    numeric(10, 2) not null check (total_cost >= 0),
  station       text check (char_length(station) <= 80),
  is_full_tank  boolean not null default true,
  notes         text check (char_length(notes) <= 500),
  created_at    timestamptz not null default now()
);
create index fuel_logs_vehicle_idx on public.fuel_logs (vehicle_id, logged_on desc);

create table public.charging_logs (
  id                uuid primary key default gen_random_uuid(),
  vehicle_id        uuid not null references public.vehicles (id) on delete cascade,
  logged_on         date not null default current_date,
  odometer_km       int check (odometer_km >= 0),
  energy_kwh        numeric(6, 2) not null check (energy_kwh > 0),
  total_cost        numeric(10, 2) not null check (total_cost >= 0),
  charger_location  text check (char_length(charger_location) <= 80),
  current_type      text not null default 'AC' check (current_type in ('AC', 'DC')),
  is_full_charge    boolean not null default true,
  notes             text check (char_length(notes) <= 500),
  created_at        timestamptz not null default now()
);
create index charging_logs_vehicle_idx on public.charging_logs (vehicle_id, logged_on desc);

create table public.service_logs (
  id              uuid primary key default gen_random_uuid(),
  vehicle_id      uuid not null references public.vehicles (id) on delete cascade,
  serviced_on     date not null default current_date,
  odometer_km     int check (odometer_km >= 0),
  item            text not null check (char_length(item) between 1 and 80),
  workshop        text check (char_length(workshop) <= 80),
  cost            numeric(10, 2) not null default 0 check (cost >= 0),
  notes           text check (char_length(notes) <= 500),
  next_due_km     int check (next_due_km >= 0),
  next_due_date   date,
  created_at      timestamptz not null default now()
);
create index service_logs_vehicle_idx on public.service_logs (vehicle_id, serviced_on desc);

-- =====================================================================
-- Reminders: the latest service log per (vehicle, item) decides the
-- reminder. Logging the same item again replaces the old reminder; a
-- latest log with no next-due values means "no reminder".
-- security_invoker makes the view respect the caller's RLS.
-- =====================================================================
create view public.maintenance_reminders
with (security_invoker = true) as
select *
from (
  select distinct on (s.vehicle_id, lower(s.item))
    s.id            as service_log_id,
    s.vehicle_id,
    s.item,
    s.serviced_on   as last_serviced_on,
    s.odometer_km   as last_odometer_km,
    s.next_due_km,
    s.next_due_date
  from public.service_logs s
  order by s.vehicle_id, lower(s.item), s.serviced_on desc, s.created_at desc
) latest
where latest.next_due_km is not null or latest.next_due_date is not null;

-- =====================================================================
-- Helper functions for RLS
-- security definer avoids recursive RLS checks on household_members.
-- =====================================================================
create function public.is_household_member(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = target_household
      and m.user_id = (select auth.uid())
  );
$$;

create function public.can_access_vehicle(target_vehicle uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.vehicles v
    join public.household_members m on m.household_id = v.household_id
    where v.id = target_vehicle
      and m.user_id = (select auth.uid())
  );
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.vehicles          enable row level security;
alter table public.fuel_logs         enable row level security;
alter table public.charging_logs     enable row level security;
alter table public.service_logs      enable row level security;

-- Households
create policy "Members can view their household"
  on public.households for select to authenticated
  using (public.is_household_member(id));

create policy "Owners can rename their household"
  on public.households for update to authenticated
  using (exists (
    select 1 from public.household_members m
    where m.household_id = id and m.user_id = (select auth.uid()) and m.role = 'owner'
  ));

-- Household members (read-only from the app in v1)
create policy "Members can view members of their household"
  on public.household_members for select to authenticated
  using (public.is_household_member(household_id));

-- Vehicles
create policy "Members can view vehicles"
  on public.vehicles for select to authenticated
  using (public.is_household_member(household_id));
create policy "Members can add vehicles"
  on public.vehicles for insert to authenticated
  with check (public.is_household_member(household_id));
create policy "Members can update vehicles"
  on public.vehicles for update to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
create policy "Members can delete vehicles"
  on public.vehicles for delete to authenticated
  using (public.is_household_member(household_id));

-- Logs (same rule for all three tables)
create policy "Access fuel logs of own vehicles"
  on public.fuel_logs for all to authenticated
  using (public.can_access_vehicle(vehicle_id))
  with check (public.can_access_vehicle(vehicle_id));

create policy "Access charging logs of own vehicles"
  on public.charging_logs for all to authenticated
  using (public.can_access_vehicle(vehicle_id))
  with check (public.can_access_vehicle(vehicle_id));

create policy "Access service logs of own vehicles"
  on public.service_logs for all to authenticated
  using (public.can_access_vehicle(vehicle_id))
  with check (public.can_access_vehicle(vehicle_id));

-- =====================================================================
-- Triggers
-- =====================================================================

-- Keep vehicles.updated_at fresh
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger vehicles_touch_updated_at
  before update on public.vehicles
  for each row execute function public.touch_updated_at();

-- A log with a higher odometer reading moves the vehicle's odometer forward
create function public.bump_vehicle_odometer()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.odometer_km is not null then
    update public.vehicles
      set odometer_km = new.odometer_km
      where id = new.vehicle_id
        and odometer_km < new.odometer_km;
  end if;
  return new;
end;
$$;

create trigger fuel_logs_bump_odometer
  after insert or update of odometer_km on public.fuel_logs
  for each row execute function public.bump_vehicle_odometer();
create trigger charging_logs_bump_odometer
  after insert or update of odometer_km on public.charging_logs
  for each row execute function public.bump_vehicle_odometer();
create trigger service_logs_bump_odometer
  after insert or update of odometer_km on public.service_logs
  for each row execute function public.bump_vehicle_odometer();

-- Every new user gets their own household ("<name>'s Garage")
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_household_id uuid;
  display_name text;
begin
  display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    split_part(new.email, '@', 1)
  );

  insert into public.households (name)
    values (left(display_name, 70) || '''s Garage')
    returning id into new_household_id;

  insert into public.household_members (household_id, user_id, role)
    values (new_household_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Grants for the API roles (tables are protected by RLS above)
grant select on public.maintenance_reminders to authenticated;
