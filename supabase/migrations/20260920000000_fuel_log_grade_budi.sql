-- =====================================================================
-- Fuel log additions: grade (RON95 / RON97 / Diesel) and a BUDI Madani
-- flag (Malaysia's targeted RON95 subsidy programme). Both are new,
-- nullable/defaulted columns, so existing fuel_logs rows are unaffected.
-- Station stays a free-text column — the app now offers Shell / Petronas
-- / BHP / Petron as quick picks plus "Other" for anything else, but that
-- is a UI-only change and needs no schema change.
-- =====================================================================

alter table public.fuel_logs
  add column grade text check (grade in ('RON95', 'RON97', 'Diesel')),
  add column budi_madani boolean not null default false;