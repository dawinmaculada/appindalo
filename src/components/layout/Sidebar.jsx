import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Stethoscope,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Leaf,
  UserCog,
  Settings,
  Receipt,
  Megaphone,
} from 'lucide-react';

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

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <aside
      style={{ width: collapsed ? 72 : 240, minWidth: collapsed ? 72 : 240 }}
      className="relative flex flex-col h-screen bg-[#1a2332] text-white transition-all duration-300 shadow-2xl"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#00af38] flex items-center justify-center shadow-lg">
          <Leaf size={20} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-sm leading-tight text-white">
              Osteopatía
            </p>
            <p className="text-[#00af38] font-extrabold text-base leading-tight">
              Indalo
            </p>
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
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                    isActive
                      ? 'bg-[#00af38] text-white shadow-lg shadow-[#00af38]/30'
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
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[#00af38] text-white shadow-lg shadow-[#00af38]/30'
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
          <p className="text-xs text-white/30 text-center">v1.0.0 · Indalo</p>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-7 w-6 h-6 bg-[#00af38] rounded-full flex items-center justify-center shadow-lg hover:bg-[#008a2c] transition-colors z-10"
        aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
      >
        {collapsed ? (
          <ChevronRight size={14} className="text-white" />
        ) : (
          <ChevronLeft size={14} className="text-white" />
        )}
      </button>
    </aside>
  );
}
