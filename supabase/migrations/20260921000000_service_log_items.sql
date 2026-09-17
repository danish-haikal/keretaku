-- =====================================================================
-- Multi-item service visits.
--
-- A single workshop visit ("service log") can now itemise several
-- things done at once (engine oil, oil filter, brake pads, …) instead
-- of one item per row. Line items live in a new child table,
-- service_log_items, each with its own name and price; service_logs
-- keeps the visit-level fields (date, odometer, workshop, notes, cost
-- total, next-due reminder).
--
-- Reminders stay a SHARED, per-visit thing (not per item): a vehicle
-- has at most one upcoming "next service" reminder, taken from its
-- most recently logged visit that set a next-due km and/or date. This
-- is a deliberate simplification over per-item reminders.
-- =====================================================================

create table public.service_log_items (
  id              uuid primary key default gen_random_uuid(),
  service_log_id  uuid not null references public.service_logs (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 80),
  price           numeric(10, 2) not null default 0 check (price >= 0),
  position        int not null default 0,
  created_at      timestamptz not null default now()
);
create index service_log_items_log_idx on public.service_log_items (service_log_id, position);

-- Backfill: every existing service_logs row becomes a one-item visit.
insert into public.service_log_items (service_log_id, name, price, position)
select id, item, cost, 0 from public.service_logs;

alter table public.service_log_items enable row level security;

create policy "Members can manage service log items"
  on public.service_log_items for all to authenticated
  using (exists (
    select 1 from public.service_logs s
    where s.id = service_log_id and public.can_access_vehicle(s.vehicle_id)
  ))
  with check (exists (
    select 1 from public.service_logs s
    where s.id = service_log_id and public.can_access_vehicle(s.vehicle_id)
  ));

-- =====================================================================
-- Reminders view rewrite: one reminder per VEHICLE (the latest logged
-- visit), not one per item. The "item" column becomes a display label
-- built by joining that visit's item names.
--
-- The old view reads service_logs.item, so it must be dropped BEFORE
-- that column is dropped below — otherwise Postgres refuses with
-- "cannot drop column item ... other objects depend on it".
-- =====================================================================
drop view public.maintenance_reminders;

alter table public.service_logs drop column item;

create view public.maintenance_reminders
with (security_invoker = true) as
select *
from (
  select distinct on (s.vehicle_id)
    s.id            as service_log_id,
    s.vehicle_id,
    coalesce(
      (select string_agg(i.name, ', ' order by i.position)
       from public.service_log_items i
       where i.service_log_id = s.id),
      'Service'
    )               as item,
    s.serviced_on   as last_serviced_on,
    s.odometer_km   as last_odometer_km,
    s.next_due_km,
    s.next_due_date
  from public.service_logs s
  order by s.vehicle_id, s.serviced_on desc, s.created_at desc
) latest
where latest.next_due_km is not null or latest.next_due_date is not null;