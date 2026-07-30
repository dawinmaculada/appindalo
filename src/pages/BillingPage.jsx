import { useMemo, useState, useEffect } from 'react';
import {
  Euro,
  Banknote,
  CreditCard,
  TrendingUp,
  Receipt,
  UserCog,
  X,
} from 'lucide-react';
import { getAppointments, getPatients, getWorkers } from '../services/storage';
import {
  format, parseISO, isWithinInterval,
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  subDays, subWeeks, subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';

const PAYMENT_LABELS = { session: 'Sesión', bono5: 'Bono 5', bono10: 'Bono 10' };
const TYPE_COLORS    = ['#c9a227', '#0088cc', '#e67e22'];

const fmt = (n) => (n % 1 === 0 ? `${n}€` : `${n.toFixed(2)}€`);

// ── Construye las opciones de período ──────────────────────────────────
function buildPeriods() {
  const now = new Date();
  const periods = [];

  // Días: hoy + últimos 6
  for (let i = 0; i < 7; i++) {
    const d = subDays(now, i);
    periods.push({
      group: 'Días',
      value: `day-${i}`,
      label: i === 0 ? 'Hoy' : i === 1 ? 'Ayer' : format(d, "EEEE d MMM", { locale: es }),
      start: startOfDay(d),
      end:   endOfDay(d),
    });
  }

  // Semanas: esta + últimas 7
  for (let i = 0; i < 8; i++) {
    const d = subWeeks(now, i);
    const s = startOfWeek(d, { weekStartsOn: 1 });
    const e = endOfWeek(d,   { weekStartsOn: 1 });
    periods.push({
      group: 'Semanas',
      value: `week-${i}`,
      label: i === 0
        ? 'Esta semana'
        : `Sem. ${format(s, "d MMM", { locale: es })} – ${format(e, "d MMM", { locale: es })}`,
      start: s,
      end:   e,
    });
  }

  // Meses: este + últimos 11
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    periods.push({
      group: 'Meses',
      value: `month-${i}`,
      label: i === 0 ? 'Este mes' : format(d, "MMMM yyyy", { locale: es }),
      start: startOfMonth(d),
      end:   endOfMonth(d),
    });
  }

  return periods;
}

export default function BillingPage() {
  const PERIODS = useMemo(buildPeriods, []);

  const [periodKey,     setPeriodKey]     = useState('month-0');
  const [customFrom,    setCustomFrom]    = useState('');
  const [customTo,      setCustomTo]      = useState('');
  const [filterWorker,  setFilterWorker]  = useState('all');
  const [filterMethod,  setFilterMethod]  = useState('all');

  const [allAppointments, setAllAppointments] = useState([]);
  const [patients, setPatients]               = useState([]);
  const [workers, setWorkers]                 = useState([]);

  useEffect(() => {
    getAppointments().then(setAllAppointments);
    getPatients().then(setPatients);
    getWorkers().then(setWorkers);
  }, []);

  const isCustom = periodKey === 'custom';

  // Rango activo: personalizado o predefinido
  const { start, end } = useMemo(() => {
    if (isCustom && customFrom && customTo) {
      return {
        start: startOfDay(parseISO(customFrom)),
        end:   endOfDay(parseISO(customTo)),
      };
    }
    if (isCustom) return { start: null, end: null };
    return PERIODS.find((p) => p.value === periodKey);
  }, [periodKey, customFrom, customTo, isCustom, PERIODS]);

  // ── Filtrado base: sólo citas cobradas en el período ──────────────────
  const inPeriod = useMemo(() => {
    if (!start || !end) return [];
    return allAppointments.filter((a) => {
      if (!a.billing?.paidAt) return false;
      return isWithinInterval(parseISO(a.billing.paidAt), { start, end });
    });
  }, [allAppointments, start, end]);

  // ── Aplicar filtros adicionales ────────────────────────────────────────
  const billed = useMemo(() => {
    return inPeriod
      .filter((a) => filterWorker === 'all' || a.workerId === filterWorker)
      .filter((a) => filterMethod === 'all' || a.billing.paymentMethod === filterMethod)
      .sort((a, b) => new Date(b.billing.paidAt) - new Date(a.billing.paidAt));
  }, [inPeriod, filterWorker, filterMethod]);

  // ── KPIs (sobre los registros filtrados) ─────────────────────────────
  const totalRevenue = billed.reduce((s, a) => s + (a.billing.total || 0), 0);
  const cashRevenue  = billed.filter((a) => a.billing.paymentMethod === 'efectivo')
                             .reduce((s, a) => s + a.billing.total, 0);
  const cardRevenue  = billed.filter((a) => a.billing.paymentMethod === 'tarjeta')
                             .reduce((s, a) => s + a.billing.total, 0);

  // ── Desglose por tipo ─────────────────────────────────────────────────
  const byType = useMemo(() => {
    const map = {};
    billed.forEach((a) => {
      const k = a.billing.paymentType || 'session';
      map[k] = (map[k] || 0) + a.billing.total;
    });
    return map;
  }, [billed]);

  const activeFilters = (filterWorker !== 'all' ? 1 : 0) + (filterMethod !== 'all' ? 1 : 0);

  const clearFilters = () => {
    setFilterWorker('all');
    setFilterMethod('all');
  };

  // Grupos para el select agrupado
  const groups = ['Días', 'Semanas', 'Meses'];

  return (
    <div className="space-y-5">

      {/* ── Barra de filtros ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">

          {/* Período */}
          <div className="flex-1 min-w-[180px]">
            <p className="text-xs font-medium text-gray-500 mb-1.5">Período</p>
            <select
              value={periodKey}
              onChange={(e) => setPeriodKey(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] capitalize"
            >
              <option value="custom">📅 Personalizado</option>
              {groups.map((g) => (
                <optgroup key={g} label={g}>
                  {PERIODS.filter((p) => p.group === g).map((p) => (
                    <option key={p.value} value={p.value} className="capitalize">
                      {p.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Fechas personalizadas */}
          {isCustom && (
            <>
              <div className="min-w-[140px]">
                <p className="text-xs font-medium text-gray-500 mb-1.5">Desde</p>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || undefined}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227]"
                />
              </div>
              <div className="min-w-[140px]">
                <p className="text-xs font-medium text-gray-500 mb-1.5">Hasta</p>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227]"
                />
              </div>
            </>
          )}

          {/* Trabajador */}
          <div className="flex-1 min-w-[160px]">
            <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
              <UserCog size={12} /> Profesional
            </p>
            <select
              value={filterWorker}
              onChange={(e) => setFilterWorker(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227]"
            >
              <option value="all">Todos</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Método de pago */}
          <div className="flex-1 min-w-[140px]">
            <p className="text-xs font-medium text-gray-500 mb-1.5">Método de pago</p>
            <div className="flex gap-2">
              {[
                { value: 'all',      label: 'Todos' },
                { value: 'efectivo', label: 'Efectivo', icon: Banknote },
                { value: 'tarjeta',  label: 'Tarjeta',  icon: CreditCard },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setFilterMethod(value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-xl border-2 transition-all ${
                    filterMethod === value
                      ? 'border-[#c9a227] bg-[#e6f9ed] text-[#c9a227]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {Icon && <Icon size={13} />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Limpiar filtros */}
          {activeFilters > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors self-end"
            >
              <X size={13} /> Limpiar ({activeFilters})
            </button>
          )}
        </div>

        {/* Rango de fechas del período seleccionado */}
        <p className="text-xs text-gray-400 mt-3">
          {start && end ? (
            <>
              {format(start, "d 'de' MMMM", { locale: es })} — {format(end, "d 'de' MMMM yyyy", { locale: es })}
              {billed.length > 0 && (
                <span className="ml-2 text-[#c9a227] font-medium">
                  · {billed.length} cobro{billed.length !== 1 ? 's' : ''}
                </span>
              )}
            </>
          ) : (
            <span className="text-amber-500">Selecciona las fechas de inicio y fin</span>
          )}
        </p>
      </div>

      {/* ── KPI cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total facturado"    value={fmt(totalRevenue)} icon={Euro}      color="#c9a227" bg="#e6f9ed" />
        <KpiCard label="Sesiones cobradas"  value={billed.length}     icon={TrendingUp} color="#0088cc" bg="#e6f3ff" />
        <KpiCard label="Efectivo"           value={fmt(cashRevenue)}  icon={Banknote}  color="#e67e22" bg="#fef3e6" />
        <KpiCard label="Tarjeta"            value={fmt(cardRevenue)}  icon={CreditCard} color="#9b59b6" bg="#f5eeff" />
      </div>

      {/* ── Desglose + tabla ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Desglose por tipo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-[#111827] mb-4 text-sm">Por tipo de cobro</h3>
          {Object.keys(byType).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin datos</p>
          ) : (
            <>
              <ul className="space-y-3">
                {Object.entries(byType).map(([k, v], i) => (
                  <li key={k} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-gray-700">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                        {PAYMENT_LABELS[k] || k}
                      </span>
                      <span className="font-bold text-[#111827]">{fmt(v)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(v / totalRevenue) * 100}%`,
                          backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length],
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>

              {/* Efectivo vs Tarjeta */}
              {totalRevenue > 0 && (cashRevenue > 0 || cardRevenue > 0) && (
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">Método de pago</p>
                  <div className="h-2.5 rounded-full overflow-hidden flex">
                    {cashRevenue > 0 && (
                      <div
                        className="h-full bg-[#e67e22]"
                        style={{ width: `${(cashRevenue / totalRevenue) * 100}%` }}
                        title={`Efectivo: ${fmt(cashRevenue)}`}
                      />
                    )}
                    {cardRevenue > 0 && (
                      <div
                        className="h-full bg-[#9b59b6]"
                        style={{ width: `${(cardRevenue / totalRevenue) * 100}%` }}
                        title={`Tarjeta: ${fmt(cardRevenue)}`}
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#e67e22] inline-block" />
                      Efectivo {totalRevenue > 0 && `${Math.round((cashRevenue/totalRevenue)*100)}%`}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#9b59b6] inline-block" />
                      Tarjeta {totalRevenue > 0 && `${Math.round((cardRevenue/totalRevenue)*100)}%`}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Tabla de movimientos */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-[#111827] mb-4 text-sm flex items-center gap-2">
            <Receipt size={15} className="text-[#c9a227]" />
            Movimientos
          </h3>

          {billed.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Euro size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">No hay cobros con los filtros seleccionados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-2.5 font-medium">Fecha</th>
                    <th className="text-left pb-2.5 font-medium">Paciente</th>
                    <th className="text-left pb-2.5 font-medium hidden md:table-cell">Profesional</th>
                    <th className="text-left pb-2.5 font-medium">Tipo</th>
                    <th className="text-left pb-2.5 font-medium">Método</th>
                    <th className="text-right pb-2.5 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {billed.map((a) => {
                    const patient = patients.find((p) => p.id === a.patientId);
                    const worker  = workers.find((w) => w.id === a.workerId);
                    return (
                      <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 text-gray-500 whitespace-nowrap text-xs">
                          {format(parseISO(a.billing.paidAt), "d MMM · HH:mm", { locale: es })}
                        </td>
                        <td className="py-2.5 font-medium text-[#111827] max-w-[110px] truncate">
                          {patient?.name || '—'}
                        </td>
                        <td className="py-2.5 hidden md:table-cell">
                          {worker ? (
                            <span className="flex items-center gap-1.5 text-xs font-medium"
                                  style={{ color: worker.color || '#c9a227' }}>
                              <span className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: worker.color || '#c9a227' }} />
                              {worker.name}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <span className="text-xs px-2 py-0.5 rounded-lg bg-[#e6f9ed] text-[#c9a227] font-medium whitespace-nowrap">
                            {PAYMENT_LABELS[a.billing.paymentType] || a.billing.paymentType}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                            {a.billing.paymentMethod === 'tarjeta'
                              ? <><CreditCard size={11} /> Tarjeta</>
                              : <><Banknote size={11} /> Efectivo</>}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-bold text-[#111827] whitespace-nowrap">
                          {fmt(a.billing.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200">
                    <td colSpan={4} className="pt-3 text-xs text-gray-400 font-medium">
                      {billed.length} cobro{billed.length !== 1 ? 's' : ''}
                    </td>
                    <td colSpan={2} className="pt-3 text-right text-lg font-extrabold text-[#c9a227]">
                      {fmt(totalRevenue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-extrabold mt-1" style={{ color }}>{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  );
}
