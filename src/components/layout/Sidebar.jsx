import { NavLink } from 'react-router-dom';
import { useClinic } from '../../contexts/ClinicContext';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Stethoscope,
  Calendar,
  ChevronLeft,
  ChevronRight,
  UserCog,
  Settings,
  Receipt,
  Megaphone,
} from 'lucide-react';
import VelsyLogo from '../VelsyLogo';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/pacientes', label: 'Pacientes', icon: Users },
  { to: '/citas', label: 'Citas', icon: CalendarDays },
  { to: '/calendario', label: 'Calendario', icon: Calendar },
  { to: '/tratamientos', label: 'Tratamientos', icon: Stethoscope },
  { to: '/trabajadores', label: 'Trabajadores', icon: UserCog },
  { to: '/facturacion', label: 'Facturación', icon: Receipt },
  { to: '/marketing',  label: 'Marketing',   icon: Megaphone },
];

const BOTTOM_ITEMS = [
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { clinicName } = useClinic();
  const handleNavClick = () => {
    onMobileClose?.();
  };

  return (
    <>
      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{ width: collapsed ? 72 : 240, minWidth: collapsed ? 72 : 240 }}
        className={`
          fixed md:relative inset-y-0 left-0 z-40
          flex flex-col h-screen bg-[#111827] text-white shadow-2xl
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <VelsyLogo size={36} className="flex-shrink-0" />
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-[#c9a227] font-extrabold text-base leading-tight">velsy</p>
              {clinicName && (
                <p className="text-white/50 text-xs leading-tight truncate">{clinicName}</p>
              )}
            </div>
          )}
        </div>

        {/* Navegación */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                      isActive
                        ? 'bg-[#c9a227] text-white shadow-lg shadow-[#c9a227]/30'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    }`
                  }
                  title={collapsed ? label : undefined}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom nav (Ajustes) */}
        <div className="py-2 px-2 border-t border-white/10">
          <ul className="space-y-1">
            {BOTTOM_ITEMS.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-[#c9a227] text-white shadow-lg shadow-[#c9a227]/30'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    }`
                  }
                  title={collapsed ? label : undefined}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        {!collapsed && (
          <div className="px-4 py-3 border-t border-white/10">
            <p className="text-xs text-white/30 text-center">v2.0.0 · velsy</p>
          </div>
        )}

        {/* Toggle button (solo desktop) */}
        <button
          onClick={onToggle}
          className="hidden md:flex absolute -right-3 top-7 w-6 h-6 bg-[#c9a227] rounded-full items-center justify-center shadow-lg hover:bg-[#a8851e] transition-colors z-10"
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? (
            <ChevronRight size={14} className="text-white" />
          ) : (
            <ChevronLeft size={14} className="text-white" />
          )}
        </button>
      </aside>
    </>
  );
}
