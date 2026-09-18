-- supabase/migrations/20260924000000_reminder_dismissal.sql

-- =====================================================================
-- "Mark complete" for reminders, without forcing a log/renewal right away.
--
-- Service reminders: service_logs.reminder_dismissed_at. The
-- maintenance_reminders view already picks the single latest visit per
-- vehicle — dismissing that visit's reminder just adds one more filter
-- condition. Logging a NEW visit naturally supersedes the dismissal
-- (the view moves on to the new latest row), so nothing needs clearing
-- there.
--
-- Road tax / insurance: vehicles.road_tax_reminder_dismissed_at and
-- insurance_reminder_dismissed_at. These need an explicit clear when the
-- underlying expiry date changes — otherwise a dismissal from last year
-- would silently hide next year's real deadline. A trigger handles that
-- regardless of which screen updates the date.
-- =====================================================================

alter table public.service_logs
  add column reminder_dismissed_at timestamptz;

alter table public.vehicles
  add column road_tax_reminder_dismissed_at timestamptz,
  add column insurance_reminder_dismissed_at timestamptz;

-- Same column list/order as before, so `create or replace` is valid —
-- reminder_dismissed_at is used for filtering only, not exposed.
create or replace view public.maintenance_reminders
with (security_invoker = true) as
select
  service_log_id, vehicle_id, item, last_serviced_on, last_odometer_km, next_due_km, next_due_date
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
    s.next_due_date,
    s.reminder_dismissed_at
  from public.service_logs s
  order by s.vehicle_id, s.serviced_on desc, s.created_at desc
) latest
where (latest.next_due_km is not null or latest.next_due_date is not null)
  and latest.reminder_dismissed_at is null;

create or replace function public.clear_renewal_reminder_dismissal()
returns trigger
language plpgsql
as $$
begin
  if new.road_tax_expiry is distinct from old.road_tax_expiry then
    new.road_tax_reminder_dismissed_at := null;
  end if;
  if new.insurance_expiry is distinct from old.insurance_expiry then
    new.insurance_reminder_dismissed_at := null;
  end if;
  return new;
end;
$$;

create trigger vehicles_clear_renewal_dismissal
  before update on public.vehicles
  for each row
  execute function public.clear_renewal_reminder_dismissal();