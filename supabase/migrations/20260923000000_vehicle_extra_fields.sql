-- supabase/migrations/20260923000000_vehicle_extra_fields.sql

-- Tyre pressure
alter table vehicles
  add column rim_type text not null default 'default'
    check (rim_type in ('default', 'aftermarket')),
  add column tyre_pressure_unit text not null default 'psi'
    check (tyre_pressure_unit in ('psi', 'kpa')),
  add column tyre_pressure_front numeric
    check (tyre_pressure_front is null or tyre_pressure_front > 0),
  add column tyre_pressure_rear numeric
    check (tyre_pressure_rear is null or tyre_pressure_rear > 0);

-- Insurance No-Claim Discount
alter table vehicles
  add column ncd_rate numeric
    check (ncd_rate is null or (ncd_rate >= 0 and ncd_rate <= 100));

-- Fuel tank capacity — used only for the fill-up sanity-check warning
alter table vehicles
  add column tank_capacity_liters numeric
    check (tank_capacity_liters is null or tank_capacity_liters > 0);

-- Hire purchase
alter table vehicles
  add column hire_purchase_loan_amount numeric
    check (hire_purchase_loan_amount is null or hire_purchase_loan_amount >= 0),
  add column hire_purchase_monthly_payment numeric
    check (hire_purchase_monthly_payment is null or hire_purchase_monthly_payment >= 0),
  add column hire_purchase_tenure_months integer
    check (hire_purchase_tenure_months is null or hire_purchase_tenure_months >= 0),
  add column hire_purchase_start_date date,
  add column hire_purchase_last_payment_date date;

comment on column vehicles.rim_type is
  'default = stock rim, refer to door-sticker pressure; aftermarket = custom pressure fields matter';
comment on column vehicles.ncd_rate is
  'No-Claim Discount percentage on insurance premium, informational only';
comment on column vehicles.tank_capacity_liters is
  'Used only as a soft warning if a fuel log''s litres exceed this value';
comment on column vehicles.hire_purchase_start_date is
  'Source of truth for remaining balance/months: elapsed = months since this date, capped at tenure';