import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useClinic } from '../../contexts/ClinicContext';

export default function Layout({ session }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { subscription, daysLeft } = useClinic();

  const showTrialBanner = subscription.status === 'trial' && daysLeft !== null && daysLeft > 0;

  return (
    <div className="flex h-screen overflow-hidden bg-[#fafaf9]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {showTrialBanner && (
          <div className="bg-[#c9a227] px-4 py-2 flex items-center justify-center gap-3 text-white text-xs font-medium flex-shrink-0">
            <span>
              Periodo de prueba: <strong>{daysLeft} {daysLeft === 1 ? 'día' : 'días'} restante{daysLeft !== 1 ? 's' : ''}</strong>
            </span>
            <span className="opacity-50">·</span>
            <Link to="/payment" className="underline underline-offset-2 hover:opacity-80 transition-opacity">
              Activar suscripción
            </Link>
          </div>
        )}
        <Header
          session={session}
          onMobileMenuToggle={() => setMobileMenuOpen((v) => !v)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
