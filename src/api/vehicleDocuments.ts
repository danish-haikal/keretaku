import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type VehicleDocumentKind = 'road_tax' | 'insurance';

const BUCKET = 'vehicle-documents';

const PHOTO_COLUMN: Record<VehicleDocumentKind, 'road_tax_photo_path' | 'insurance_photo_path'> = {
  road_tax: 'road_tax_photo_path',
  insurance: 'insurance_photo_path',
};

function extensionFor(file: File): string {
  const fromName = file.name.split('.').pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type === 'image/png') return 'png';
  return 'jpg';
}

/**
 * Uploads a road tax / insurance photo for a vehicle, replacing whatever is
 * currently stored for that document kind, and points the vehicle's
 * road_tax_photo_path / insurance_photo_path column at the new file.
 */
export function useUploadVehicleDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      vehicleId,
      kind,
      file,
    }: {
      vehicleId: string;
      kind: VehicleDocumentKind;
      file: File;
    }) => {
      // 1. Clear out any existing file(s) for this document kind (handles
      //    the case where the extension changes between uploads, e.g. jpg -> pdf).
      const { data: existing } = await supabase.storage.from(BUCKET).list(vehicleId);
      const stale = (existing ?? [])
        .filter((f) => f.name.startsWith(`${kind}.`))
        .map((f) => `${vehicleId}/${f.name}`);
      if (stale.length > 0) {
        await supabase.storage.from(BUCKET).remove(stale);
      }

      // 2. Upload the new file
      const path = `${vehicleId}/${kind}.${extensionFor(file)}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type || undefined,
      });
      if (uploadError) throw uploadError;

      // 3. Point the vehicle record at the new path
      const column = PHOTO_COLUMN[kind];
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ [column]: path })
        .eq('id', vehicleId);
      if (updateError) throw updateError;

      return path;
    },
    onSuccess: (_path, variables) => {
      void qc.invalidateQueries({ queryKey: ['vehicle', variables.vehicleId] });
      void qc.invalidateQueries({
        queryKey: ['vehicle-document-url', variables.vehicleId, variables.kind],
      });
    },
  });
}

export function useDeleteVehicleDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      vehicleId,
      kind,
      path,
    }: {
      vehicleId: string;
      kind: VehicleDocumentKind;
      path: string;
    }) => {
      await supabase.storage.from(BUCKET).remove([path]);

      const column = PHOTO_COLUMN[kind];
      const { error } = await supabase
        .from('vehicles')
        .update({ [column]: null })
        .eq('id', vehicleId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['vehicle', variables.vehicleId] });
    },
  });
}

/**
 * Gets a short-lived signed URL for viewing a stored document photo.
 * Pass the vehicle's road_tax_photo_path / insurance_photo_path (or undefined
 * if none is set yet — the query stays disabled).
 */
export function useVehicleDocumentUrl(
  vehicleId: string | undefined,
  kind: VehicleDocumentKind,
  path: string | null | undefined,
) {
  return useQuery({
    queryKey: ['vehicle-document-url', vehicleId, kind, path],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!path,
    staleTime: 55 * 60 * 1000, // signed URL is valid 1hr, refresh a bit early
  });
}
