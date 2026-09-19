alter table vehicles
  drop column tyre_fl_year,
  add column tyre_fl_brand text,
  add column tyre_fl_dot_code text,
  drop column tyre_fr_year,
  add column tyre_fr_brand text,
  add column tyre_fr_dot_code text,
  drop column tyre_rl_year,
  add column tyre_rl_brand text,
  add column tyre_rl_dot_code text,
  drop column tyre_rr_year,
  add column tyre_rr_brand text,
  add column tyre_rr_dot_code text;