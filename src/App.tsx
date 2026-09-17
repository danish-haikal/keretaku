import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingState } from '@/components/ui/StateMessage';
import { useAuth } from '@/hooks/useAuth';
import { GaragePage } from '@/pages/GaragePage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { RemindersPage } from '@/pages/RemindersPage';
import { LogChargingPage } from '@/pages/vehicle/LogChargingPage';
import { LogFuelPage } from '@/pages/vehicle/LogFuelPage';
import { LogServicePage } from '@/pages/vehicle/LogServicePage';
import { VehicleDetailPage } from '@/pages/vehicle/VehicleDetailPage';
import { VehicleFormPage } from '@/pages/vehicle/VehicleFormPage';

export function App() {
  const { session, loading } = useAuth();

  if (loading) return <LoadingState label="Starting KeretaKu…" />;
  if (!session) return <LoginPage />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/garage" element={<GaragePage />} />
        <Route path="/reminders" element={<RemindersPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="/vehicles/new" element={<VehicleFormPage />} />
      <Route path="/vehicles/:vehicleId" element={<VehicleDetailPage />} />
      <Route path="/vehicles/:vehicleId/edit" element={<VehicleFormPage />} />
      <Route path="/vehicles/:vehicleId/log/fuel" element={<LogFuelPage />} />
      <Route path="/vehicles/:vehicleId/log/charging" element={<LogChargingPage />} />
      <Route path="/vehicles/:vehicleId/log/service" element={<LogServicePage />} />

      <Route path="/" element={<Navigate to="/garage" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
