import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { initAuth, isAuthenticated } from './services/auth';
import Layout from './components/layout/Layout';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import CalendarPage from './pages/CalendarPage';
import TreatmentsPage from './pages/TreatmentsPage';
import WorkersPage from './pages/WorkersPage';
import SettingsPage from './pages/SettingsPage';
import BillingPage from './pages/BillingPage';
import MarketingPage from './pages/MarketingPage';

function App() {
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    initAuth().then(() => {
      setAuthReady(true);
      if (isAuthenticated()) {
        const raw = sessionStorage.getItem('indalo_session');
        setSession(raw ? JSON.parse(raw) : null);
      }
    });
  }, []);

  if (!authReady) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            session ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage onLogin={(s) => setSession(s)} />
            )
          }
        />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout session={session} onLogout={() => setSession(null)} />
            </PrivateRoute>
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
