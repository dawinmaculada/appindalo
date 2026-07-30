import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut } from 'lucide-react';
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

export default function Header({ session, onLogout }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const title = PAGE_TITLES[pathname] || 'Indalo';
  const subtitle = PAGE_SUBTITLES[pathname] || '';

  const handleLogout = () => {
    logout();
    onLogout?.();
    navigate('/login', { replace: true });
  };

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div>
        <h1 className="text-xl font-bold text-[#1a2332]">{title}</h1>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <GoogleCalendarButton />

        <button className="relative w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-500">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#00af38] rounded-full"></span>
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-[#00af38] flex items-center justify-center shadow font-bold text-white text-sm">
            {session?.username?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-[#1a2332] leading-tight">
              {session?.username || 'admin'}
            </p>
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
