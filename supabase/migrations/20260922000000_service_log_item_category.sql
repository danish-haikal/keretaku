-- =====================================================================
-- Service log items become grouped by category.
--
-- Previously the "Basic Service" / "Major Service" / "Brake Service" /
-- "Tyre & Battery" / "Aircond Service" presets each quick-added a single
-- item literally named after the package. Danish pointed out that's
-- wrong: those five are meant to be CATEGORIES you add several items
-- under (e.g. pick "Aircond Service", then add "Compressor" and
-- "Refrigerant gas" items inside it), not items themselves.
--
-- This just adds a nullable category label to each item row — no
-- separate categories table, since the category set is a fixed list of
-- five presets chosen in the UI, not user-defined. Existing item rows
-- (all created before this feature existed) get category = null, which
-- the app displays as a fallback "Other" group.
-- =====================================================================

alter table public.service_log_items
  add column category text check (char_length(category) <= 40);