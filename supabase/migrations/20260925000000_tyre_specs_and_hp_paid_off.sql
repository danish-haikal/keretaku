alter table vehicles
  add column tyre_fl_spec text,
  add column tyre_fl_year integer,
  add column tyre_fr_spec text,
  add column tyre_fr_year integer,
  add column tyre_rl_spec text,
  add column tyre_rl_year integer,
  add column tyre_rr_spec text,
  add column tyre_rr_year integer,
  add column hire_purchase_paid_off boolean not null default false;