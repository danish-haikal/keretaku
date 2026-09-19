-- supabase/migrations/20260929000000_renewal_and_value_logs.sql
--
-- Two new tables for the Records tab:
--   renewal_logs       — road tax & insurance renewal history (linked: also updates vehicle expiry)
--   vehicle_value_logs — market value tracking over time

create table renewal_logs (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references vehicles(id) on delete cascade,
  kind        text not null check (kind in ('road_tax', 'insurance')),
  renewed_on  date not null,
  amount      numeric(12,2) not null,
  expiry_date date not null,
  notes       text,
  created_at  timestamptz not null default now()
);

create index renewal_logs_vehicle_id on renewal_logs(vehicle_id);

alter table renewal_logs enable row level security;

create policy "Users can do everything with their own renewal logs"
  on renewal_logs for all
  using (can_access_vehicle(vehicle_id))
  with check (can_access_vehicle(vehicle_id));

create table vehicle_value_logs (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references vehicles(id) on delete cascade,
  recorded_on date not null,
  value       numeric(12,2) not null,
  notes       text,
  created_at  timestamptz not null default now()
);

create index vehicle_value_logs_vehicle_id on vehicle_value_logs(vehicle_id);

alter table vehicle_value_logs enable row level security;

create policy "Users can do everything with their own vehicle value logs"
  on vehicle_value_logs for all
  using (can_access_vehicle(vehicle_id))
  with check (can_access_vehicle(vehicle_id));