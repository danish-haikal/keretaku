-- supabase/migrations/20260928000000_owner_and_document_photos.sql
--
-- Adds:
--   vehicles.owner_name           — free-text name of who the vehicle belongs to
--   vehicles.road_tax_photo_path  — storage path to the current road tax photo
--   vehicles.insurance_photo_path — storage path to the current insurance photo
--
-- Also creates a private storage bucket "vehicle-documents" with RLS scoped
-- to household members via the existing can_access_vehicle() function.
-- Path convention: {vehicle_id}/road_tax.<ext> and {vehicle_id}/insurance.<ext>

alter table vehicles
  add column owner_name text,
  add column road_tax_photo_path text,
  add column insurance_photo_path text;

-- Private bucket for road tax / insurance photos
insert into storage.buckets (id, name, public)
values ('vehicle-documents', 'vehicle-documents', false)
on conflict (id) do nothing;

create policy "Users can manage their own vehicle documents"
on storage.objects for all
using (
  bucket_id = 'vehicle-documents'
  and can_access_vehicle((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id = 'vehicle-documents'
  and can_access_vehicle((storage.foldername(name))[1]::uuid)
);