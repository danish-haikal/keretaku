import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateVehicle, useDeleteVehicle, useUpdateVehicle, useVehicle } from '@/api/vehicles';
import { PageHeader } from '@/components/layout/PageHeader';
import page from '@/components/layout/Page.module.css';
import { Button } from '@/components/ui/Button';
import { ChipSelect, type ChipOption } from '@/components/ui/ChipSelect';
import { Field, FieldRow, TextInput } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { ErrorState, LoadingState } from '@/components/ui/StateMessage';
import { useToast } from '@/hooks/useToast';
import { cleanText, formatRM } from '@/lib/format';
import {
  BODY_TYPES,
  RIM_TYPES,
  TYRE_PRESSURE_UNITS,
  type BodyType,
  type FuelType,
  type RimType,
  type TyrePressureUnit,
  type Vehicle,
} from '@/types/database';
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

const RIM_LABELS: Record<RimType, string> = {
  default: 'Default rim',
  aftermarket: 'Aftermarket rim',
};

// TODO: swap icon for something dedicated (e.g. "tyre") once iconMap.ts is shared.
const RIM_OPTIONS: ChipOption<RimType>[] = RIM_TYPES.map((value) => ({
  value,
  label: RIM_LABELS[value],
  icon: 'tyre' as const,
}));

const PRESSURE_UNIT_LABELS: Record<TyrePressureUnit, string> = {
  psi: 'psi',
  kpa: 'kPa',
};

const PRESSURE_UNIT_OPTIONS: ChipOption<TyrePressureUnit>[] = TYRE_PRESSURE_UNITS.map((value) => ({
  value,
  label: PRESSURE_UNIT_LABELS[value],
  icon: 'gauge' as const,
}));

function toNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function toNullableInt(value: string): number | null {
  const n = toNullableNumber(value);
  return n != null ? Math.max(0, Math.round(n)) : null;
}

/**
 * Months/balance remaining, using Start Date + Tenure as the source of truth
 * (not a manually-typed payment counter, which drifts). Loan amount is
 * informational only — this does not amortize against it, since Malaysian
 * hire purchase uses flat-rate interest we haven't captured.
 */
function hirePurchaseSummary(
  monthlyPayment: number | null,
  tenureMonths: number | null,
  startDate: string,
): string | null {
  if (!monthlyPayment || !tenureMonths || !startDate) return null;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();
  let elapsed =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) elapsed -= 1;
  elapsed = Math.max(0, Math.min(tenureMonths, elapsed));
  const remainingMonths = tenureMonths - elapsed;
  if (remainingMonths <= 0) return 'Fully paid off, based on start date and tenure.';
  const remainingBalance = remainingMonths * monthlyPayment;
  const monthsLabel = remainingMonths === 1 ? '1 month' : `${remainingMonths} months`;
  return `${monthsLabel} left · est. ${formatRM(remainingBalance)} remaining (at current monthly rate)`;
}

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
  const [ncdRate, setNcdRate] = useState(vehicle?.ncd_rate != null ? String(vehicle.ncd_rate) : '');
  const [odometer, setOdometer] = useState(String(vehicle?.odometer_km ?? 0));
  const [tankCapacity, setTankCapacity] = useState(
    vehicle?.tank_capacity_liters != null ? String(vehicle.tank_capacity_liters) : '',
  );
  const [rimType, setRimType] = useState<RimType>(vehicle?.rim_type ?? 'default');
  const [pressureUnit, setPressureUnit] = useState<TyrePressureUnit>(
    vehicle?.tyre_pressure_unit ?? 'psi',
  );
  const [pressureFront, setPressureFront] = useState(
    vehicle?.tyre_pressure_front != null ? String(vehicle.tyre_pressure_front) : '',
  );
  const [pressureRear, setPressureRear] = useState(
    vehicle?.tyre_pressure_rear != null ? String(vehicle.tyre_pressure_rear) : '',
  );
  const [hpLoanAmount, setHpLoanAmount] = useState(
    vehicle?.hire_purchase_loan_amount != null ? String(vehicle.hire_purchase_loan_amount) : '',
  );
  const [hpMonthlyPayment, setHpMonthlyPayment] = useState(
    vehicle?.hire_purchase_monthly_payment != null
      ? String(vehicle.hire_purchase_monthly_payment)
      : '',
  );
  const [hpTenureMonths, setHpTenureMonths] = useState(
    vehicle?.hire_purchase_tenure_months != null ? String(vehicle.hire_purchase_tenure_months) : '',
  );
  const [hpStartDate, setHpStartDate] = useState(vehicle?.hire_purchase_start_date ?? '');
  const [hpLastPaymentDate, setHpLastPaymentDate] = useState(
    vehicle?.hire_purchase_last_payment_date ?? '',
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const hpSummary = hirePurchaseSummary(
    toNullableNumber(hpMonthlyPayment),
    toNullableInt(hpTenureMonths),
    hpStartDate,
  );

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
      ncd_rate: toNullableNumber(ncdRate),
      tank_capacity_liters: toNullableNumber(tankCapacity),
      rim_type: rimType,
      tyre_pressure_unit: pressureUnit,
      tyre_pressure_front: toNullableNumber(pressureFront),
      tyre_pressure_rear: toNullableNumber(pressureRear),
      hire_purchase_loan_amount: toNullableNumber(hpLoanAmount),
      hire_purchase_monthly_payment: toNullableNumber(hpMonthlyPayment),
      hire_purchase_tenure_months: toNullableInt(hpTenureMonths),
      hire_purchase_start_date: hpStartDate || null,
      hire_purchase_last_payment_date: hpLastPaymentDate || null,
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

        <Field
          label="NCD rate (%)"
          hint="No-Claim Discount on your insurance premium. Informational only."
        >
          {(id) => (
            <TextInput
              id={id}
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              max={100}
              placeholder="e.g. 25"
              value={ncdRate}
              onChange={(e) => setNcdRate(e.target.value)}
            />
          )}
        </Field>

        <FieldRow>
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
          <Field label="Tank capacity (L)" hint="Used to flag a fill-up that looks too large.">
            {(id) => (
              <TextInput
                id={id}
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="e.g. 42"
                value={tankCapacity}
                onChange={(e) => setTankCapacity(e.target.value)}
              />
            )}
          </Field>
        </FieldRow>

        <div className={page.sectionHead}>
          <h2>Tyre pressure</h2>
        </div>

        <Field
          label="Rim type"
          hint="Aftermarket rims can take different tyres/pressure than stock — this is where that matters."
        >
          {() => (
            <ChipSelect
              label="Rim type"
              options={RIM_OPTIONS}
              value={rimType}
              onChange={setRimType}
            />
          )}
        </Field>

        <Field label="Pressure unit">
          {() => (
            <ChipSelect
              label="Pressure unit"
              options={PRESSURE_UNIT_OPTIONS}
              value={pressureUnit}
              onChange={setPressureUnit}
            />
          )}
        </Field>

        <FieldRow>
          <Field label={`Front (${PRESSURE_UNIT_LABELS[pressureUnit]})`}>
            {(id) => (
              <TextInput
                id={id}
                type="number"
                inputMode="decimal"
                step="0.1"
                value={pressureFront}
                onChange={(e) => setPressureFront(e.target.value)}
              />
            )}
          </Field>
          <Field label={`Rear (${PRESSURE_UNIT_LABELS[pressureUnit]})`}>
            {(id) => (
              <TextInput
                id={id}
                type="number"
                inputMode="decimal"
                step="0.1"
                value={pressureRear}
                onChange={(e) => setPressureRear(e.target.value)}
              />
            )}
          </Field>
        </FieldRow>

        <div className={page.sectionHead}>
          <h2>Hire purchase (optional)</h2>
        </div>

        <FieldRow>
          <Field label="Loan amount (RM)">
            {(id) => (
              <TextInput
                id={id}
                type="number"
                inputMode="decimal"
                step="0.01"
                value={hpLoanAmount}
                onChange={(e) => setHpLoanAmount(e.target.value)}
              />
            )}
          </Field>
          <Field label="Monthly payment (RM)">
            {(id) => (
              <TextInput
                id={id}
                type="number"
                inputMode="decimal"
                step="0.01"
                value={hpMonthlyPayment}
                onChange={(e) => setHpMonthlyPayment(e.target.value)}
              />
            )}
          </Field>
        </FieldRow>

        <FieldRow>
          <Field label="Tenure (months)">
            {(id) => (
              <TextInput
                id={id}
                type="number"
                inputMode="numeric"
                value={hpTenureMonths}
                onChange={(e) => setHpTenureMonths(e.target.value)}
              />
            )}
          </Field>
          <Field label="Loan start date">
            {(id) => (
              <TextInput
                id={id}
                type="date"
                value={hpStartDate}
                onChange={(e) => setHpStartDate(e.target.value)}
              />
            )}
          </Field>
        </FieldRow>

        <Field
          label="Last payment date"
          hint={
            hpSummary ??
            'Add a start date, tenure and monthly payment to see months/balance remaining.'
          }
        >
          {(id) => (
            <TextInput
              id={id}
              type="date"
              value={hpLastPaymentDate}
              onChange={(e) => setHpLastPaymentDate(e.target.value)}
            />
          )}
        </Field>

        {formError && <p className={styles.error}>{formError}</p>}

        <Button type="submit" block disabled={saving}>
          {saving ? 'Saving…' : 'Save vehicle'}
        </Button>

        {vehicle && (
          <div className={styles.deleteWrap}>
            <Button type="button" variant="danger" block onClick={() => setConfirmingDelete(true)}>
              Delete vehicle
            </Button>
          </div>
        )}
      </form>

      {vehicle && (
        <Sheet
          open={confirmingDelete}
          title="Delete this vehicle?"
          hint="This can't be undone. Its fuel, charging and service records will be deleted too."
          onClose={() => setConfirmingDelete(false)}
        >
          <Button
            type="button"
            variant="danger"
            block
            onClick={() => void handleDelete()}
            disabled={deleteVehicle.isPending}
          >
            {deleteVehicle.isPending ? 'Deleting…' : 'Delete vehicle'}
          </Button>
        </Sheet>
      )}
    </div>
  );
}
