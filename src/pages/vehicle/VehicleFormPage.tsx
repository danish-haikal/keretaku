import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateVehicle, useDeleteVehicle, useUpdateVehicle, useVehicle } from '@/api/vehicles';
import { PageHeader } from '@/components/layout/PageHeader';
import page from '@/components/layout/Page.module.css';
import { Button } from '@/components/ui/Button';
import { ChipSelect, type ChipOption } from '@/components/ui/ChipSelect';
import { Field, FieldRow, TextInput } from '@/components/ui/Field';
import { ErrorState, LoadingState } from '@/components/ui/StateMessage';
import { useToast } from '@/hooks/useToast';
import { cleanText } from '@/lib/format';
import { BODY_TYPES, type BodyType, type FuelType, type Vehicle } from '@/types/database';
import styles from './VehicleFormPage.module.css';

const BODY_LABELS: Record<BodyType, string> = {
  compact: 'Compact',
  sedan: 'Sedan',
  suv: 'SUV',
  mpv: 'MPV',
  motorcycle: 'Motorcycle',
};

const BODY_OPTIONS: ChipOption<BodyType>[] = BODY_TYPES.map((value) => ({
  value,
  label: BODY_LABELS[value],
  icon: `body-${value}` as const,
}));

const FUEL_OPTIONS: ChipOption<FuelType>[] = [
  { value: 'petrol', label: 'Petrol', icon: 'fuel' },
  { value: 'diesel', label: 'Diesel', icon: 'fuel' },
  { value: 'electric', label: 'Electric', icon: 'bolt' },
  { value: 'hybrid', label: 'Hybrid', icon: 'hybrid' },
];

/** Loads the vehicle when editing, then renders the form with real initial values. */
export function VehicleFormPage() {
  const { vehicleId } = useParams();
  const existing = useVehicle(vehicleId);

  if (!vehicleId) return <VehicleForm />;
  if (existing.isPending) return <LoadingState />;
  if (existing.error) return <ErrorState error={existing.error} />;
  if (!existing.data) return <ErrorState error={new Error('Vehicle not found')} />;

  return <VehicleForm key={existing.data.id} vehicle={existing.data} />;
}

function VehicleForm({ vehicle }: { vehicle?: Vehicle }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEdit = Boolean(vehicle);

  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle(vehicle?.id ?? '');
  const deleteVehicle = useDeleteVehicle();

  const [bodyType, setBodyType] = useState<BodyType>(vehicle?.body_type ?? 'compact');
  const [fuelType, setFuelType] = useState<FuelType>(vehicle?.fuel_type ?? 'petrol');
  const [make, setMake] = useState(vehicle?.make ?? '');
  const [model, setModel] = useState(vehicle?.model ?? '');
  const [variant, setVariant] = useState(vehicle?.variant ?? '');
  const [year, setYear] = useState(String(vehicle?.year ?? new Date().getFullYear()));
  const [plate, setPlate] = useState(vehicle?.plate_number ?? '');
  const [roadTax, setRoadTax] = useState(vehicle?.road_tax_expiry ?? '');
  const [insurance, setInsurance] = useState(vehicle?.insurance_expiry ?? '');
  const [odometer, setOdometer] = useState(String(vehicle?.odometer_km ?? 0));
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const yearNumber = Number(year);
    if (!make.trim() || !model.trim()) {
      setFormError('Make and model are required.');
      return;
    }
    if (!Number.isInteger(yearNumber) || yearNumber < 1950 || yearNumber > 2100) {
      setFormError('Enter a valid year.');
      return;
    }

    const input = {
      body_type: bodyType,
      fuel_type: fuelType,
      make: make.trim(),
      model: model.trim(),
      variant: cleanText(variant),
      year: yearNumber,
      plate_number: cleanText(plate),
      road_tax_expiry: roadTax || null,
      insurance_expiry: insurance || null,
      odometer_km: Math.max(0, Math.round(Number(odometer) || 0)),
    };

    try {
      if (vehicle) {
        await updateVehicle.mutateAsync(input);
        showToast('Vehicle updated');
        navigate(`/vehicles/${vehicle.id}`);
      } else {
        const created = await createVehicle.mutateAsync(input);
        showToast('Vehicle added');
        navigate(`/vehicles/${created.id}`);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the vehicle.');
    }
  }

  async function handleDelete() {
    if (!vehicle) return;
    const confirmed = window.confirm(
      'Delete this vehicle? Its fuel, charging and service records will be deleted too.',
    );
    if (!confirmed) return;
    await deleteVehicle.mutateAsync(vehicle.id);
    showToast('Vehicle deleted');
    navigate('/garage');
  }

  const saving = createVehicle.isPending || updateVehicle.isPending;

  return (
    <div className={styles.page}>
      <PageHeader title={isEdit ? 'Edit vehicle' : 'Add vehicle'} backTo={-1} />
      <form className={page.body} onSubmit={handleSubmit}>
        <Field label="Body type">
          {() => (
            <ChipSelect
              label="Body type"
              options={BODY_OPTIONS}
              value={bodyType}
              onChange={setBodyType}
            />
          )}
        </Field>

        <Field label="Fuel type" hint="Hybrid gets both a fuel log and a charging log.">
          {() => (
            <ChipSelect
              label="Fuel type"
              options={FUEL_OPTIONS}
              value={fuelType}
              onChange={setFuelType}
            />
          )}
        </Field>

        <Field label="Make *">
          {(id) => (
            <TextInput
              id={id}
              required
              placeholder="e.g. Perodua"
              value={make}
              onChange={(e) => setMake(e.target.value)}
            />
          )}
        </Field>

        <Field label="Model *">
          {(id) => (
            <TextInput
              id={id}
              required
              placeholder="e.g. Axia"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          )}
        </Field>

        <FieldRow>
          <Field label="Variant">
            {(id) => (
              <TextInput
                id={id}
                placeholder="e.g. 1.0G"
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
              />
            )}
          </Field>
          <Field label="Year *">
            {(id) => (
              <TextInput
                id={id}
                type="number"
                inputMode="numeric"
                required
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            )}
          </Field>
        </FieldRow>

        <Field label="Plate number">
          {(id) => (
            <TextInput
              id={id}
              placeholder="e.g. WXY 1234"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
            />
          )}
        </Field>

        <FieldRow>
          <Field label="Road tax expiry">
            {(id) => (
              <TextInput
                id={id}
                type="date"
                value={roadTax}
                onChange={(e) => setRoadTax(e.target.value)}
              />
            )}
          </Field>
          <Field label="Insurance expiry">
            {(id) => (
              <TextInput
                id={id}
                type="date"
                value={insurance}
                onChange={(e) => setInsurance(e.target.value)}
              />
            )}
          </Field>
        </FieldRow>

        <Field label="Current odometer (km)">
          {(id) => (
            <TextInput
              id={id}
              type="number"
              inputMode="numeric"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
            />
          )}
        </Field>

        {formError && <p className={styles.error}>{formError}</p>}

        <Button type="submit" block disabled={saving}>
          {saving ? 'Saving…' : 'Save vehicle'}
        </Button>

        {vehicle && (
          <div className={styles.deleteWrap}>
            <Button type="button" variant="danger" block onClick={() => void handleDelete()}>
              Delete vehicle
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
