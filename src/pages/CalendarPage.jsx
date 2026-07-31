import { useState, useRef, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useClinic } from '../contexts/ClinicContext';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  User,
  Stethoscope,
  UserCog,
  CheckCircle2,
} from 'lucide-react';
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  parseISO,
  isSameMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  getAppointments,
  saveAppointment,
  getPatients,
  getWorkers,
} from '../services/storage';
import { isSignedIn, getExternalEvents, createCalendarEvent, deleteCalendarEvent } from '../services/googleCalendar';
import { useTreatments } from '../contexts/TreatmentsContext';
import PaymentModal from '../components/PaymentModal';

// ── Configuración del grid horario ───────────────────────────────────────
const HOUR_HEIGHT = 64; // px por hora
const START_HOUR  = 8;
const END_HOUR    = 21;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

function timeToMinutes(timeStr = '00:00') {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}
function topPx(timeStr) {
  const mins = timeToMinutes(timeStr);
  return ((mins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
}
function heightPx(duration = 60) {
  return (duration / 60) * HOUR_HEIGHT;
}

// ── Colores fallback por tratamiento ─────────────────────────────────────
function aptColor(apt, workers, treatments) {
  if (apt.workerId) {
    const w = workers.find((x) => x.id === apt.workerId);
    if (w?.color) return w.color;
  }
  const t = treatments.find((x) => x.id === apt.treatmentId);
  return t?.color || '#c9a227';
}

// ── Detectar solapamientos en un día ────────────────────────────────────
function layoutDay(apts, treatments) {
  const sorted = [...apts].sort((a, b) =>
    timeToMinutes(a.time) - timeToMinutes(b.time)
  );
  const columns = [];
  const result = sorted.map((apt) => {
    const start = timeToMinutes(apt.time);
    const dur = treatments.find((t) => t.id === apt.treatmentId)?.duration || 60;
    const end = start + dur;
    let col = 0;
    while (columns[col] && columns[col] > start) col++;
    columns[col] = end;
    return { apt, col, totalCols: 1 };
  });
  result.forEach((item) => {
    const overlap = result.filter((other) => {
      const s1 = timeToMinutes(item.apt.time);
      const d1 = treatments.find((t) => t.id === item.apt.treatmentId)?.duration || 60;
      const s2 = timeToMinutes(other.apt.time);
      const d2 = treatments.find((t) => t.id === other.apt.treatmentId)?.duration || 60;
      return s1 < s2 + d2 && s1 + d1 > s2;
    });
    item.totalCols = Math.max(overlap.length, 1);
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const { treatments } = useTreatments();
  const { clinicName } = useClinic();
  const [view, setView]         = useState('week'); // 'day' | 'week' | 'month'
  const [current, setCurrent]   = useState(new Date());
  const [appointments, setApts]     = useState([]);
  const [patients, setPatients]     = useState([]);
  const [workers, setWorkers]       = useState([]);
  const [blockedSlots, setBlocked]  = useState([]);

  useEffect(() => {
    getAppointments().then(setApts);
    getPatients().then(setPatients);
    getWorkers().then(setWorkers);
  }, []);

  // Cargar eventos externos de Google Calendar al cambiar de semana/día
  useEffect(() => {
    if (!isSignedIn()) return;
    const weekStart = startOfWeek(current, { weekStartsOn: 1 });
    const weekEnd   = endOfWeek(current,   { weekStartsOn: 1 });
    const nuvisIds  = appointments.map((a) => a.googleEventId).filter(Boolean);
    getExternalEvents(weekStart, weekEnd, nuvisIds)
      .then(setBlocked)
      .catch(() => {});
  }, [current, appointments]);

  // Modal de nueva cita rápida
  const [form, setForm] = useState(null);

  // Modal de cobro
  const [paymentTarget, setPaymentTarget] = useState(null);

  // Scroll al horario actual al cargar
  const gridRef = useRef(null);
  useEffect(() => {
    if (gridRef.current && (view === 'week' || view === 'day')) {
      const now = new Date();
      const scrollTo = ((now.getHours() - START_HOUR - 1) * HOUR_HEIGHT);
      gridRef.current.scrollTop = Math.max(0, scrollTo);
    }
  }, [view]);

  // ── Navegación ──────────────────────────────────────────────────────
  const navigate = (dir) => {
    if (view === 'day')   setCurrent(dir > 0 ? addDays(current, 1)   : subDays(current, 1));
    if (view === 'week')  setCurrent(dir > 0 ? addWeeks(current, 1)  : subWeeks(current, 1));
    if (view === 'month') setCurrent(dir > 0 ? addMonths(current, 1) : subMonths(current, 1));
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(current, { weekStartsOn: 1 }),
    end:   endOfWeek(current,   { weekStartsOn: 1 }),
  });

  // ── Título de cabecera ──────────────────────────────────────────────
  const headerTitle = {
    day:   format(current, "EEEE, d 'de' MMMM yyyy", { locale: es }),
    week:  `${format(weekDays[0], "d MMM", { locale: es })} – ${format(weekDays[6], "d MMM yyyy", { locale: es })}`,
    month: format(current, "MMMM yyyy", { locale: es }),
  }[view];

  // ── Citas de un día concreto ────────────────────────────────────────
  const aptsForDay = (day) =>
    appointments.filter(
      (a) => a.date && isSameDay(parseISO(a.date), day)
    );

  // ── Clic en franja horaria ──────────────────────────────────────────
  const handleSlotClick = (day, e) => {
    if (!gridRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const mins = START_HOUR * 60 + Math.floor((y / HOUR_HEIGHT) * 60);
    const hh = String(Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(Math.round((mins % 60) / 15) * 15 % 60).padStart(2, '0');
    const time = `${hh}:${mm}`;
    openNewForm(format(day, 'yyyy-MM-dd'), time);
  };

  const openNewForm = (date = '', time = '') => {
    setForm({
      id: null, patientId: '', treatmentId: '', workerId: '',
      date, time, notes: '', status: 'scheduled', googleEventId: null,
    });
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    let savedForm = { ...form };
    if (isSignedIn()) {
      try {
        const patient   = patients.find((p) => p.id === form.patientId);
        const treatment = treatments.find((t) => t.id === form.treatmentId);
        const calWorker = workers.find((w) => w.id === form.workerId);
        if (form.googleEventId) await deleteCalendarEvent(form.googleEventId).catch(() => {});
        const gcEvent = await createCalendarEvent(form, patient, treatment, calWorker);
        savedForm.googleEventId = gcEvent.id;
      } catch { /* sin Google no bloqueamos el guardado */ }
    }
    const isNew = !savedForm.id;
    setApts(await saveAppointment(savedForm));
    setForm(null);

    // Enviar emails de confirmación
    const emailPatient  = patients.find((p) => p.id === savedForm.patientId);
    const emailTreatment = treatments.find((t) => t.id === savedForm.treatmentId);
    const emailWorker   = workers.find((w) => w.id === savedForm.workerId);
    if (emailPatient?.email) {
      supabase.functions.invoke('send-confirmation', {
        body: {
          to: emailPatient.email,
          patientName: emailPatient.name,
          treatmentName: emailTreatment?.name,
          duration: emailTreatment?.duration || 60,
          workerName: emailWorker?.name,
          workerEmail: emailWorker?.email || null,
          date: savedForm.date,
          time: savedForm.time,
          notes: savedForm.notes,
          isEdit: !isNew,
          clinicName,
        },
      }).catch(() => {});
    }
  };

  const handlePaymentConfirm = async (billing) => {
    try {
      setApts(await saveAppointment({ ...paymentTarget, status: 'completed', billing }));
      setPaymentTarget(null);
    } catch (err) {
      console.error('Error al guardar cobro:', err);
      alert('Error al guardar el cobro. Por favor inténtalo de nuevo.');
    }
  };

  // ── Bloque de cita ──────────────────────────────────────────────────
  const AptBlock = ({ apt, col = 0, totalCols = 1 }) => {
    const treatment = treatments.find((t) => t.id === apt.treatmentId);
    const patient   = patients.find((p) => p.id === apt.patientId);
    const worker    = workers.find((w) => w.id === apt.workerId);
    const color     = aptColor(apt, workers, treatments);
    const top       = topPx(apt.time);
    const height    = Math.max(heightPx(treatment?.duration || 60), 24);
    const width     = `calc(${100 / totalCols}% - 4px)`;
    const left      = `calc(${(col / totalCols) * 100}% + 2px)`;

    const isCompleted = apt.status === 'completed';

    return (
      <div
        title={isCompleted
          ? `✓ ${patient?.name || ''} · ${treatment?.name || ''}`
          : `${patient?.name || ''} · ${treatment?.name || ''} — clic para cobrar`}
        onClick={(e) => {
          e.stopPropagation();
          if (!isCompleted) setPaymentTarget(apt);
        }}
        style={{
          position: 'absolute',
          top: top + 1,
          height: height - 2,
          width,
          left,
          backgroundColor: isCompleted ? color + '99' : color + 'dd',
          borderLeft: `3px solid ${color}`,
        }}
        className={`rounded-md px-1.5 py-0.5 overflow-hidden transition-all z-10 select-none ${
          isCompleted ? 'cursor-default opacity-70' : 'cursor-pointer hover:brightness-95'
        }`}
      >
        <p className="text-white text-[11px] font-semibold leading-tight truncate">
          {patient?.name || 'Paciente'}
        </p>
        {height > 32 && (
          <p className="text-white/80 text-[10px] leading-tight truncate">
            {treatment?.name || ''}
          </p>
        )}
        {height > 48 && worker && (
          <p className="text-white/70 text-[10px] leading-tight truncate">
            {worker.name}
          </p>
        )}
      </div>
    );
  };

  // ── Bloque de evento externo (Google Calendar) ─────────────────────
  const BlockedBlock = ({ slot }) => {
    if (slot.allDay || !slot.startTime || !slot.endTime) return null;
    const startMins = timeToMinutes(slot.startTime);
    const endMins   = timeToMinutes(slot.endTime);
    const duration  = Math.max(endMins - startMins, 15);
    const top    = topPx(slot.startTime);
    const height = Math.max(heightPx(duration), 20);
    return (
      <div
        title={slot.title}
        style={{ position: 'absolute', top: top + 1, height: height - 2, left: 2, right: 2 }}
        className="rounded-md px-1.5 py-0.5 overflow-hidden z-10 select-none pointer-events-none
          bg-gray-300/60 border-l-2 border-gray-400"
      >
        <p className="text-gray-600 text-[11px] font-medium leading-tight truncate">
          🔒 {slot.title}
        </p>
      </div>
    );
  };

  const blockedForDay = (day) =>
    blockedSlots.filter((s) => s.date === format(day, 'yyyy-MM-dd'));

  // ── Grid de horas (día o semana) ────────────────────────────────────
  const HourGrid = ({ days }) => (
    <div className="flex flex-1 overflow-hidden">
      {/* Columna de horas */}
      <div className="w-14 flex-shrink-0 border-r border-gray-100">
        <div style={{ height: HOUR_HEIGHT * (END_HOUR - START_HOUR) }} className="relative">
          {HOURS.map((h) => (
            <div
              key={h}
              style={{ top: (h - START_HOUR) * HOUR_HEIGHT - 8 }}
              className="absolute right-2 text-[11px] text-gray-400 select-none"
            >
              {h}:00
            </div>
          ))}
        </div>
      </div>

      {/* Columnas de días */}
      <div className="flex flex-1 overflow-x-auto">
        {days.map((day) => {
          const dayApts = aptsForDay(day);
          const laid    = layoutDay(dayApts, treatments);
          const isNow   = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className="flex-1 min-w-[100px] border-r border-gray-100 relative"
              style={{ height: HOUR_HEIGHT * (END_HOUR - START_HOUR) }}
              onClick={(e) => handleSlotClick(day, e)}
            >
              {/* Líneas de horas */}
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                  className="absolute left-0 right-0 border-t border-gray-100"
                />
              ))}
              {/* Líneas de media hora */}
              {HOURS.map((h) => (
                <div
                  key={h + 0.5}
                  style={{ top: (h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                  className="absolute left-0 right-0 border-t border-gray-50"
                />
              ))}

              {/* Línea de hora actual */}
              {isNow && (() => {
                const now = new Date();
                if (now.getHours() >= START_HOUR && now.getHours() < END_HOUR) {
                  const nowTop = topPx(
                    `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
                  );
                  return (
                    <div
                      style={{ top: nowTop }}
                      className="absolute left-0 right-0 z-20 pointer-events-none"
                    >
                      <div className="relative">
                        <div className="absolute -left-1 w-2 h-2 rounded-full bg-red-500 -top-1" />
                        <div className="border-t-2 border-red-500" />
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Bloques de citas */}
              {laid.map(({ apt, col, totalCols }) => (
                <AptBlock key={apt.id} apt={apt} col={col} totalCols={totalCols} />
              ))}
              {/* Bloques bloqueados (eventos externos de Google Calendar) */}
              {blockedForDay(day).map((slot) => (
                <BlockedBlock key={slot.id} slot={slot} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── Vista Mes ───────────────────────────────────────────────────────
  const MonthView = () => {
    const start   = startOfWeek(startOfMonth(current), { weekStartsOn: 1 });
    const end     = endOfWeek(endOfMonth(current),     { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({ start, end });
    const WEEK_DAYS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

    return (
      <div className="flex flex-col flex-1">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: '1fr' }}>
          {allDays.map((day) => {
            const dayApts = aptsForDay(day);
            const inMonth = isSameMonth(day, current);
            const today   = isToday(day);

            return (
              <div
                key={day.toISOString()}
                onClick={() => { setCurrent(day); setView('day'); }}
                className={`border-b border-r border-gray-100 p-1.5 cursor-pointer hover:bg-gray-50 transition-colors min-h-[80px] ${
                  !inMonth ? 'opacity-30' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${
                      today
                        ? 'bg-[#c9a227] text-white'
                        : 'text-[#111827]'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {inMonth && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openNewForm(format(day, 'yyyy-MM-dd'), '09:00'); }}
                      className="w-5 h-5 rounded-full bg-gray-100 hover:bg-[#c9a227] hover:text-white text-gray-400 flex items-center justify-center transition-colors"
                    >
                      <Plus size={11} />
                    </button>
                  )}
                </div>
                <div className="space-y-0.5">
                  {dayApts.slice(0, 3).map((apt) => {
                    const color = aptColor(apt, workers, treatments);
                    const patient = patients.find((p) => p.id === apt.patientId);
                    return (
                      <div
                        key={apt.id}
                        style={{ backgroundColor: color + 'cc', borderLeft: `2px solid ${color}` }}
                        className="text-white text-[10px] px-1 py-0.5 rounded truncate"
                      >
                        {apt.time} {patient?.name?.split(' ')[0] || 'Cita'}
                      </div>
                    );
                  })}
                  {dayApts.length > 3 && (
                    <p className="text-[10px] text-gray-400 pl-1">
                      +{dayApts.length - 3} más
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>

      {/* ── Cabecera del calendario ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0 gap-3">
        {/* Selector de vista */}
        <div className="flex bg-gray-100 rounded-xl p-0.5 text-sm">
          {['day','week','month'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                view === v
                  ? 'bg-white text-[#111827] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              { v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes' }
            </button>
          ))}
        </div>

        {/* Navegación */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrent(new Date())}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-600"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="font-semibold text-[#111827] capitalize text-sm min-w-[200px] text-center">
            {headerTitle}
          </h2>
          <button
            onClick={() => navigate(1)}
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-600"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Botón nueva cita */}
        <button
          onClick={() => openNewForm(format(current, 'yyyy-MM-dd'), '09:00')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c9a227] text-white text-sm font-semibold rounded-xl hover:bg-[#a8851e] transition-colors shadow"
        >
          <Plus size={15} />
          Nueva cita
        </button>
      </div>

      {/* ── Vista Semana / Día ──────────────────────────────────────── */}
      {(view === 'week' || view === 'day') && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Cabecera de días */}
          <div className="flex flex-shrink-0 border-b border-gray-100">
            <div className="w-14 flex-shrink-0" />
            {(view === 'week' ? weekDays : [current]).map((day) => {
              const today = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className="flex-1 min-w-[100px] text-center py-2 border-r border-gray-100"
                >
                  <p className="text-xs text-gray-400 capitalize">
                    {format(day, 'EEE', { locale: es })}
                  </p>
                  <button
                    onClick={() => { setCurrent(day); setView('day'); }}
                    className={`text-sm font-bold w-8 h-8 rounded-full mx-auto flex items-center justify-center transition-colors ${
                      today
                        ? 'bg-[#c9a227] text-white'
                        : 'text-[#111827] hover:bg-gray-100'
                    }`}
                  >
                    {format(day, 'd')}
                  </button>
                  {/* Dot si hay citas */}
                  {aptsForDay(day).length > 0 && (
                    <div className="flex justify-center gap-0.5 mt-0.5">
                      {aptsForDay(day).slice(0, 4).map((apt) => (
                        <span
                          key={apt.id}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: aptColor(apt, workers, treatments) }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grid con scroll */}
          <div ref={gridRef} className="flex-1 overflow-y-auto overflow-x-hidden">
            <HourGrid days={view === 'week' ? weekDays : [current]} />
          </div>
        </div>
      )}

      {/* ── Vista Mes ───────────────────────────────────────────────── */}
      {view === 'month' && <MonthView />}

      {/* ── Leyenda de trabajadores ─────────────────────────────────── */}
      {workers.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-100 bg-gray-50 flex-shrink-0 flex-wrap">
          {workers.map((w) => (
            <span key={w.id} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: w.color }} />
              {w.name}
            </span>
          ))}
        </div>
      )}

      {/* ── Modal cobro ─────────────────────────────────────────────── */}
      {paymentTarget && (
        <PaymentModal
          appointment={paymentTarget}
          patient={patients.find((p) => p.id === paymentTarget.patientId)}
          treatment={treatments.find((t) => t.id === paymentTarget.treatmentId)}
          onConfirm={handlePaymentConfirm}
          onClose={() => setPaymentTarget(null)}
        />
      )}

      {/* ── Modal nueva cita rápida ──────────────────────────────────── */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setForm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-[#111827]">Nueva Cita</h2>
              <button
                onClick={() => setForm(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveForm} className="p-6 space-y-4">
              {/* Paciente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    required
                    value={form.patientId}
                    onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
                    className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] appearance-none"
                  >
                    <option value="">Seleccionar...</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tratamiento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tratamiento *</label>
                <div className="relative">
                  <Stethoscope size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    required
                    value={form.treatmentId}
                    onChange={(e) => setForm((f) => ({ ...f, treatmentId: e.target.value }))}
                    className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] appearance-none"
                  >
                    <option value="">Seleccionar...</option>
                    {treatments.map((t) => (
                      <option key={t.id} value={t.id}>{t.icon} {t.name} ({t.duration} min)</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Profesional */}
              {workers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profesional</label>
                  <div className="relative">
                    <UserCog size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                      value={form.workerId}
                      onChange={(e) => setForm((f) => ({ ...f, workerId: e.target.value }))}
                      className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] appearance-none"
                    >
                      <option value="">Sin asignar</option>
                      {workers.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}{w.role ? ` · ${w.role}` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Fecha y hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora *</label>
                  <input
                    type="time"
                    required
                    value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227]"
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Observaciones..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-[#c9a227] rounded-xl hover:bg-[#a8851e] transition-colors"
                >
                  <CheckCircle2 size={15} /> Guardar cita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
