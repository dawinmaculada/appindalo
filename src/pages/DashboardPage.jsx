import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CalendarDays,
  TrendingUp,
  Clock,
  ArrowRight,
  Activity,
  Euro,
} from 'lucide-react';
import { getPatients, getAppointments } from '../services/storage';
import { TREATMENTS } from '../data/treatments';
import { format, isToday, isFuture, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

function StatCard({ label, value, icon: Icon, color, bg, trend, to }) {
  const card = (
    <div
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold mt-1" style={{ color }}>
            {value}
          </p>
          {trend && (
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <TrendingUp size={12} className="text-[#00af38]" />
              {trend}
            </p>
          )}
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: bg }}
        >
          <Icon size={22} style={{ color }} />
        </div>
      </div>
      {to && (
        <div className="mt-4 flex items-center text-xs font-medium text-gray-400 group-hover:text-[#00af38] transition-colors">
          Ver todo <ArrowRight size={12} className="ml-1" />
        </div>
      )}
    </div>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}

export default function DashboardPage() {
  const [patients, setPatients]         = useState([]);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    getPatients().then(setPatients);
    getAppointments().then(setAppointments);
  }, []);

  const today = useMemo(
    () => appointments.filter((a) => a.date && isToday(parseISO(a.date))),
    [appointments]
  );
  const upcoming = useMemo(
    () =>
      appointments
        .filter((a) => a.date && isFuture(parseISO(a.date)))
        .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time))
        .slice(0, 5),
    [appointments]
  );

  const treatmentCount = useMemo(() => {
    const counts = {};
    appointments.forEach((a) => {
      counts[a.treatmentId] = (counts[a.treatmentId] || 0) + 1;
    });
    return counts;
  }, [appointments]);

  const monthRevenue = useMemo(() => {
    const start = startOfMonth(new Date());
    const end   = endOfMonth(new Date());
    return appointments
      .filter((a) => a.billing?.paidAt && isWithinInterval(parseISO(a.billing.paidAt), { start, end }))
      .reduce((s, a) => s + (a.billing.total || 0), 0);
  }, [appointments]);

  const topTreatment = Object.entries(treatmentCount).sort(
    (a, b) => b[1] - a[1]
  )[0];
  const topTreatmentName =
    TREATMENTS.find((t) => t.id === topTreatment?.[0])?.name || '-';

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
      <div className="bg-gradient-to-r from-[#00af38] to-[#00c944] rounded-2xl p-6 text-white shadow-lg shadow-[#00af38]/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              Bienvenido a Osteopatía Indalo
            </h2>
            <p className="text-white/80 mt-1 text-sm">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>
          <Activity size={48} className="text-white/20 hidden md:block" />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2">
            <p className="text-xs text-white/70">Citas hoy</p>
            <p className="text-xl font-bold">{today.length}</p>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2">
            <p className="text-xs text-white/70">Próximas citas</p>
            <p className="text-xl font-bold">{upcoming.length}</p>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2">
            <p className="text-xs text-white/70">Total pacientes</p>
            <p className="text-xl font-bold">{patients.length}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Pacientes"
          value={patients.length}
          icon={Users}
          color="#00af38"
          bg="#e6f9ed"
          to="/pacientes"
        />
        <StatCard
          label="Total Citas"
          value={appointments.length}
          icon={CalendarDays}
          color="#0088cc"
          bg="#e6f3ff"
          to="/citas"
        />
        <StatCard
          label="Citas Hoy"
          value={today.length}
          icon={Clock}
          color="#e67e22"
          bg="#fef3e6"
        />
        <StatCard
          label="Ingresos este mes"
          value={`${monthRevenue % 1 === 0 ? monthRevenue : monthRevenue.toFixed(2)}€`}
          icon={Euro}
          color="#9b59b6"
          bg="#f5eeff"
          trend={topTreatmentName}
          to="/facturacion"
        />
      </div>

      {/* Próximas citas + Tratamientos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximas citas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#1a2332]">Próximas Citas</h3>
            <Link
              to="/citas"
              className="text-xs text-[#00af38] font-medium flex items-center gap-1 hover:underline"
            >
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CalendarDays size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay citas programadas</p>
              <Link
                to="/citas"
                className="mt-2 text-xs text-[#00af38] hover:underline inline-block"
              >
                Crear primera cita
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((apt) => {
                const patient = patients.find((p) => p.id === apt.patientId);
                const treatment = TREATMENTS.find((t) => t.id === apt.treatmentId);
                return (
                  <li
                    key={apt.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-[#e6f9ed] transition-colors"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: treatment?.color + '20' }}
                    >
                      {treatment?.icon || '📅'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1a2332] truncate">
                        {patient?.name || 'Paciente eliminado'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {treatment?.name} ·{' '}
                        {apt.date
                          ? format(parseISO(apt.date), "d MMM", { locale: es })
                          : ''}{' '}
                        {apt.time}
                      </p>
                    </div>
                    <span
                      className="text-xs px-2 py-1 rounded-lg font-medium"
                      style={{
                        color: treatment?.color || '#00af38',
                        backgroundColor: (treatment?.color || '#00af38') + '15',
                      }}
                    >
                      {apt.time}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Tratamientos populares */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#1a2332]">Tratamientos</h3>
            <Link
              to="/tratamientos"
              className="text-xs text-[#00af38] font-medium flex items-center gap-1 hover:underline"
            >
              Ver catálogo <ArrowRight size={12} />
            </Link>
          </div>
          <ul className="space-y-3">
            {TREATMENTS.map((t) => {
              const count = treatmentCount[t.id] || 0;
              const max = Math.max(...Object.values(treatmentCount), 1);
              const pct = Math.round((count / max) * 100);
              return (
                <li key={t.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-[#1a2332]">
                      <span>{t.icon}</span> {t.name}
                    </span>
                    <span className="text-gray-400 text-xs">{count} citas</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: t.color,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
