import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabase';
import { TreatmentsProvider } from './contexts/TreatmentsContext';
import { ClinicProvider, useClinic } from './contexts/ClinicContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PaymentPage from './pages/PaymentPage';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import CalendarPage from './pages/CalendarPage';
import TreatmentsPage from './pages/TreatmentsPage';
import WorkersPage from './pages/WorkersPage';
import SettingsPage from './pages/SettingsPage';
import BillingPage from './pages/BillingPage';
import MarketingPage from './pages/MarketingPage';

function SubscriptionGuard({ children }) {
  const { isActive, subscription } = useClinic();
  if (subscription.status === 'active') return children;
  if (!isActive) return <Navigate to="/payment" replace />;
  return children;
}

function App() {
  const [session, setSession] = useState(undefined); // undefined = cargando

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={session ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={session ? <Navigate to="/" replace /> : <RegisterPage />}
        />
        <Route
          path="/payment"
          element={
            session
              ? <ClinicProvider><PaymentPage /></ClinicProvider>
              : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/"
          element={
            session
              ? <ClinicProvider><TreatmentsProvider><SubscriptionGuard><Layout session={session} /></SubscriptionGuard></TreatmentsProvider></ClinicProvider>
              : <Navigate to="/login" replace />
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="pacientes" element={<PatientsPage />} />
          <Route path="citas" element={<AppointmentsPage />} />
          <Route path="calendario" element={<CalendarPage />} />
          <Route path="tratamientos" element={<TreatmentsPage />} />
          <Route path="trabajadores" element={<WorkersPage />} />
          <Route path="facturacion" element={<BillingPage />} />
          <Route path="marketing" element={<MarketingPage />} />
          <Route path="ajustes" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
