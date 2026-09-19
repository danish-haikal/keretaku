import { useRef, useState, type ChangeEvent } from 'react';
import {
  useDeleteVehicleDocument,
  useUploadVehicleDocument,
  useVehicleDocumentUrl,
  type VehicleDocumentKind,
} from '@/api/vehicleDocuments';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/hooks/useToast';
import type { Vehicle } from '@/types/database';
import styles from './VehicleDocuments.module.css';

const DOC_LABELS: Record<VehicleDocumentKind, string> = {
  road_tax: 'Road tax',
  insurance: 'Insurance',
};

function isPdfPath(path: string | null): boolean {
  return !!path && path.toLowerCase().endsWith('.pdf');
}

function DocumentCard({ vehicle, kind }: { vehicle: Vehicle; kind: VehicleDocumentKind }) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const path = kind === 'road_tax' ? vehicle.road_tax_photo_path : vehicle.insurance_photo_path;
  const { data: url } = useVehicleDocumentUrl(vehicle.id, kind, path);
  const upload = useUploadVehicleDocument();
  const remove = useDeleteVehicleDocument();

  const pdf = isPdfPath(path);

  function handlePick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      await upload.mutateAsync({ vehicleId: vehicle.id, kind, file });
      showToast(`${DOC_LABELS[kind]} photo saved`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save the photo');
    }
  }

  function handleCardClick() {
    if (!path) {
      handlePick();
      return;
    }
    if (pdf) {
      if (url) window.open(url, '_blank', 'noopener');
      return;
    }
    setViewerOpen(true);
  }

  async function handleRemove() {
    if (!path) return;
    await remove.mutateAsync({ vehicleId: vehicle.id, kind, path });
    setMenuOpen(false);
    showToast(`${DOC_LABELS[kind]} photo removed`);
  }

  return (
    <>
      <div className={styles.card}>
        <button type="button" className={styles.thumbButton} onClick={handleCardClick}>
          {path ? (
            pdf ? (
              <span className={styles.pdfThumb}>
                <Icon name="doc" size={24} />
                PDF
              </span>
            ) : url ? (
              <img src={url} alt={`${DOC_LABELS[kind]} photo`} className={styles.thumbImg} />
            ) : (
              <span className={styles.loadingThumb}>Loading…</span>
            )
          ) : (
            <span className={styles.emptyThumb}>
              <Icon name="plus" size={20} />
              Add photo
            </span>
          )}
        </button>
        <div className={styles.cardFooter}>
          <span className={styles.cardLabel}>{DOC_LABELS[kind]}</span>
          {path && (
            <button
              type="button"
              className={styles.menuButton}
              onClick={() => setMenuOpen(true)}
              aria-label={`${DOC_LABELS[kind]} photo options`}
            >
              ⋮
            </button>
          )}
        </div>
        {upload.isPending && <div className={styles.uploadingOverlay}>Saving…</div>}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className={styles.hiddenInput}
        onChange={(e) => void handleFileSelected(e)}
      />

      <Sheet
        open={menuOpen}
        title={`${DOC_LABELS[kind]} photo`}
        hint="Choose what to do with this photo."
        onClose={() => setMenuOpen(false)}
      >
        <Button
          block
          onClick={() => {
            setMenuOpen(false);
            handlePick();
          }}
        >
          Replace photo
        </Button>
        <Button
          type="button"
          variant="danger"
          block
          onClick={() => void handleRemove()}
          disabled={remove.isPending}
        >
          {remove.isPending ? 'Removing…' : 'Remove photo'}
        </Button>
      </Sheet>

      {viewerOpen && url && (
        <div
          className={styles.viewerOverlay}
          role="button"
          tabIndex={0}
          onClick={() => setViewerOpen(false)}
        >
          <img src={url} alt={`${DOC_LABELS[kind]} photo`} className={styles.viewerImg} />
          <button
            type="button"
            className={styles.viewerClose}
            onClick={() => setViewerOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

export function VehicleDocuments({ vehicle }: { vehicle: Vehicle }) {
  return (
    <div className={styles.section}>
      <h2 className={styles.heading}>Documents</h2>
      <p className={styles.hint}>
        Keep a current photo of the road tax and insurance here — quick to pull up at a roadblock.
      </p>
      <div className={styles.grid}>
        <DocumentCard vehicle={vehicle} kind="road_tax" />
        <DocumentCard vehicle={vehicle} kind="insurance" />
      </div>
    </div>
  );
}
