import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu } from 'lucide-react';
import { logout } from '../../services/auth';
import GoogleCalendarButton from '../GoogleCalendarButton';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/pacientes': 'Pacientes',
  '/citas': 'Citas',
  '/calendario': 'Calendario',
  '/tratamientos': 'Tratamientos',
  '/trabajadores': 'Trabajadores',
  '/facturacion': 'Facturación',
  '/marketing':   'Marketing',
  '/ajustes': 'Ajustes',
};

const PAGE_SUBTITLES = {
  '/': 'Resumen general de la clínica',
  '/pacientes': 'Gestión de pacientes y contactos',
  '/citas': 'Administración de citas',
  '/calendario': 'Vista de calendario y disponibilidad',
  '/tratamientos': 'Catálogo de tratamientos',
  '/trabajadores': 'Gestión de profesionales y horarios',
  '/facturacion': 'Ingresos y cobros por período',
  '/marketing':   'Comunicación con pacientes vía email',
  '/ajustes': 'Configuración de cuenta',
};

export default function Header({ session, onMobileMenuToggle }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const title = PAGE_TITLES[pathname] || 'Indalo';
  const subtitle = PAGE_SUBTITLES[pathname] || '';

  const email = session?.user?.email || '';
  const displayName = email.split('@')[0] || 'admin';
  const initial = displayName[0]?.toUpperCase() || 'A';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger - solo móvil */}
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-600"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-bold text-[#111827] truncate">{title}</h1>
          <p className="text-xs md:text-sm text-gray-500 hidden sm:block">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        {/* Google Calendar - oculto en móvil pequeño */}
        <div className="hidden sm:block">
          <GoogleCalendarButton />
        </div>

        <button className="relative w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-500">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#c9a227] rounded-full"></span>
        </button>

        {/* Avatar - oculto en móvil muy pequeño */}
        <div className="hidden sm:flex items-center gap-2 pl-2 md:pl-3 border-l border-gray-100">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-[#c9a227] flex items-center justify-center shadow font-bold text-white text-sm">
            {initial}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-[#111827] leading-tight">{displayName}</p>
            <p className="text-xs text-gray-400">Administrador</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors text-gray-400"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}
