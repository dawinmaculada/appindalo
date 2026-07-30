import { useState, useMemo, useEffect } from 'react';
import {
  CalendarPlus,
  Search,
  Edit2,
  Trash2,
  X,
  Save,
  CalendarDays,
  Clock,
  User,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  Loader,
  UserCog,
  CircleCheck,
  Banknote,
  CreditCard,
} from 'lucide-react';
import PaymentModal from '../components/PaymentModal';
import {
  getAppointments,
  saveAppointment,
  deleteAppointment,
  getPatients,
  getWorkers,
} from '../services/storage';
import { useTreatments } from '../contexts/TreatmentsContext';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  checkAvailability,
  isSignedIn,
} from '../services/googleCalendar';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { sendEmail } from '../services/gmail';
import { buildConfirmationEmail } from '../services/emailTemplates';

const EMPTY_FORM = {
  id: null,
  patientId: '',
  treatmentId: '',
  workerId: '',
  date: '',
  time: '',
  notes: '',
  googleEventId: null,
  status: 'scheduled',
};

const STATUS_CONFIG = {
  scheduled: { label: 'Programada', color: '#0088cc', bg: '#e6f3ff' },
  completed: { label: 'Completada', color: '#00af38', bg: '#e6f9ed' },
  cancelled: { label: 'Cancelada', color: '#e74c3c', bg: '#fdeaea' },
};

export default function AppointmentsPage() {
  const { treatments } = useTreatments();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [workers, setWorkers] = useState([]);

  useEffect(() => {
    getAppointments().then(setAppointments);
    getPatients().then(setPatients);
    getWorkers().then(setWorkers);
  }, []);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [calendarStatus, setCalendarStatus] = useState('idle'); // idle|checking|available|unavailable|syncing|synced|error
  const [emailNotif, setEmailNotif] = useState(null); // { ok: bool, msg: string }

  useEffect(() => {
    if (!emailNotif) return;
    const t = setTimeout(() => setEmailNotif(null), 4000);
    return () => clearTimeout(t);
  }, [emailNotif]);

  const filtered = useMemo(() => {
    let list = [...appointments].sort(
      (a, b) =>
        new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time)
    );
    if (filterStatus !== 'all') list = list.filter((a) => a.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((a) => {
        const p = patients.find((pt) => pt.id === a.patientId);
        const t = treatments.find((tr) => tr.id === a.treatmentId);
        return (
          p?.name?.toLowerCase().includes(q) ||
          t?.name?.toLowerCase().includes(q) ||
          a.date?.includes(q)
        );
      });
    }
    return list;
  }, [appointments, search, filterStatus, patients]);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setCalendarStatus('idle');
    setShowForm(true);
  };
  const openEdit = (a) => {
    setForm({ ...a });
    setCalendarStatus('idle');
    setShowForm(true);
  };

  const handleCheckAvailability = async () => {
    if (!form.date || !form.time) return;
    setCalendarStatus('checking');
    try {
      const treatment = treatments.find((t) => t.id === form.treatmentId);
      const available = await checkAvailability(
        form.date,
        form.time,
        treatment?.duration || 60
      );
      setCalendarStatus(available ? 'available' : 'unavailable');
    } catch {
      setCalendarStatus('error');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const isNew = !form.id;
    let savedForm = { ...form };

    // Si está conectado a Google Calendar, crear/actualizar evento
    if (isSignedIn()) {
      setCalendarStatus('syncing');
      try {
        const patient = patients.find((p) => p.id === form.patientId);
        const treatment = treatments.find((t) => t.id === form.treatmentId);

        // Eliminar evento anterior si existe
        if (form.googleEventId) {
          await deleteCalendarEvent(form.googleEventId).catch(() => {});
        }

        const gcEvent = await createCalendarEvent(form, patient, treatment);
        savedForm.googleEventId = gcEvent.id;
        setCalendarStatus('synced');
      } catch {
        setCalendarStatus('error');
      }
    }

    const updated = await saveAppointment(savedForm);
    setAppointments(updated);
    setShowForm(false);

    // Enviar email de confirmación al paciente
    if (isSignedIn()) {
      const patient = patients.find((p) => p.id === savedForm.patientId);
      if (patient?.email) {
        const treatment = treatments.find((t) => t.id === savedForm.treatmentId);
        const worker = workers.find((w) => w.id === savedForm.workerId);
        try {
          const { subject, bodyHtml } = buildConfirmationEmail({
            patient, treatment, appointment: savedForm, worker, isEdit: !isNew,
          });
          await sendEmail({ to: patient.email, subject, bodyHtml });
          setEmailNotif({ ok: true, msg: `Email enviado a ${patient.email}` });
        } catch {
          setEmailNotif({ ok: false, msg: 'No se pudo enviar el email de confirmación' });
        }
      }
    }
  };

  const handleDelete = async (apt) => {
    if (apt.googleEventId && isSignedIn()) {
      await deleteCalendarEvent(apt.googleEventId).catch(() => {});
    }
    const updated = await deleteAppointment(apt.id);
    setAppointments(updated);
    setDeleteConfirm(null);
  };

  const handlePaymentConfirm = async (billing) => {
    const updated = await saveAppointment({
      ...paymentTarget,
      status: 'completed',
      billing,
    });
    setAppointments(updated);
    setPaymentTarget(null);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cita..."
              className="pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38] w-48"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38] text-gray-600"
          >
            <option value="all">Todos los estados</option>
            <option value="scheduled">Programadas</option>
            <option value="completed">Completadas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#00af38] text-white text-sm font-semibold rounded-xl hover:bg-[#008a2c] transition-colors shadow-lg shadow-[#00af38]/20"
        >
          <CalendarPlus size={16} />
          Nueva Cita
        </button>
      </div>

      {/* Notificación email */}
      {emailNotif && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
            emailNotif.ok
              ? 'bg-[#e6f9ed] text-[#00af38]'
              : 'bg-red-50 text-red-600'
          }`}
        >
          {emailNotif.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {emailNotif.msg}
        </div>
      )}

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <CalendarDays size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500 font-medium">No hay citas</p>
          <p className="text-sm text-gray-400 mt-1">
            {search || filterStatus !== 'all'
              ? 'Prueba con otros filtros'
              : 'Crea tu primera cita con el botón superior'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((apt) => {
            const patient = patients.find((p) => p.id === apt.patientId);
            const treatment = treatments.find((t) => t.id === apt.treatmentId);
            const sc = STATUS_CONFIG[apt.status] || STATUS_CONFIG.scheduled;
            return (
              <div
                key={apt.id}
                className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all duration-200 group flex items-center gap-4"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: (treatment?.color || '#00af38') + '15' }}
                >
                  {treatment?.icon || '📅'}
                </div>
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-1">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1a2332] truncate">
                      {patient?.name || 'Paciente eliminado'}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                      <Stethoscope size={11} />
                      {treatment?.name || 'Tratamiento eliminado'}
                    </p>
                    {apt.workerId && (() => {
                      const w = workers.find((x) => x.id === apt.workerId);
                      return w ? (
                        <p className="text-xs flex items-center gap-1 mt-0.5 truncate font-medium"
                           style={{ color: w.color || '#00af38' }}>
                          <UserCog size={11} />
                          {w.name}
                        </p>
                      ) : null;
                    })()}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <CalendarDays size={12} />
                      {apt.date
                        ? format(parseISO(apt.date), "d MMM yyyy", { locale: es })
                        : '-'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {apt.time || '-'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-xs px-2.5 py-1 rounded-lg font-medium"
                      style={{ color: sc.color, backgroundColor: sc.bg }}
                    >
                      {sc.label}
                    </span>
                    {apt.googleEventId && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-[#e6f9ed] text-[#00af38] font-medium">
                        📅 GCal
                      </span>
                    )}
                    {apt.billing && (
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-[#e6f9ed] text-[#00af38] font-semibold flex items-center gap-1">
                        {apt.billing.paymentMethod === 'tarjeta'
                          ? <CreditCard size={11} />
                          : <Banknote size={11} />}
                        {apt.billing.total % 1 === 0
                          ? apt.billing.total
                          : apt.billing.total.toFixed(2)}€
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {(!apt.status || apt.status === 'scheduled') && (
                    <button
                      onClick={() => setPaymentTarget(apt)}
                      title="Completar y cobrar"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-[#00af38] bg-[#e6f9ed] hover:bg-[#00af38] hover:text-white transition-colors"
                    >
                      <CircleCheck size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(apt)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 bg-gray-50 hover:bg-gray-200 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(apt)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 bg-red-50 hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Formulario */}
      {showForm && (
        <Modal
          title={form.id ? 'Editar Cita' : 'Nueva Cita'}
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={handleSave} className="space-y-4">
            {/* Paciente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Paciente *
              </label>
              <div className="relative">
                <User
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <select
                  value={form.patientId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, patientId: e.target.value }))
                  }
                  required
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38] appearance-none"
                >
                  <option value="">Seleccionar paciente...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              {patients.length === 0 && (
                <p className="text-xs text-amber-500 mt-1">
                  No hay pacientes. Añade uno primero.
                </p>
              )}
            </div>

            {/* Profesional */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Profesional
              </label>
              <div className="relative">
                <UserCog
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <select
                  value={form.workerId}
                  onChange={(e) => setForm((f) => ({ ...f, workerId: e.target.value }))}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38] appearance-none"
                >
                  <option value="">Sin asignar</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}{w.role ? ` · ${w.role}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {workers.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Añade profesionales en el módulo Trabajadores.
                </p>
              )}
            </div>

            {/* Tratamiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tratamiento *
              </label>
              <div className="grid grid-cols-1 gap-2">
                {treatments.map((t) => (
                  <label
                    key={t.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      form.treatmentId === t.id
                        ? 'border-[#00af38] bg-[#e6f9ed]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="treatment"
                      value={t.id}
                      checked={form.treatmentId === t.id}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, treatmentId: e.target.value }))
                      }
                      className="sr-only"
                      required
                    />
                    <span className="text-xl">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1a2332]">
                        {t.name}
                      </p>
                      <p className="text-xs text-gray-400">{t.duration} min</p>
                    </div>
                    {form.treatmentId === t.id && (
                      <CheckCircle2 size={16} className="text-[#00af38] flex-shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Fecha y hora */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, date: e.target.value }));
                    setCalendarStatus('idle');
                  }}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora *
                </label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, time: e.target.value }));
                    setCalendarStatus('idle');
                  }}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38]"
                />
              </div>
            </div>

            {/* Disponibilidad Google Calendar */}
            {isSignedIn() && form.date && form.time && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCheckAvailability}
                  disabled={calendarStatus === 'checking'}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#0088cc] bg-[#e6f3ff] rounded-lg hover:bg-[#0088cc] hover:text-white transition-colors disabled:opacity-50"
                >
                  {calendarStatus === 'checking' ? (
                    <Loader size={13} className="animate-spin" />
                  ) : (
                    <CalendarDays size={13} />
                  )}
                  Comprobar disponibilidad
                </button>
                {calendarStatus === 'available' && (
                  <span className="flex items-center gap-1 text-xs text-[#00af38] font-medium">
                    <CheckCircle2 size={14} /> Disponible
                  </span>
                )}
                {calendarStatus === 'unavailable' && (
                  <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                    <AlertCircle size={14} /> Ocupado
                  </span>
                )}
                {calendarStatus === 'error' && (
                  <span className="text-xs text-gray-400">Error al comprobar</span>
                )}
              </div>
            )}
            {!isSignedIn() && (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                Conecta Google Calendar en la cabecera para comprobar disponibilidad y sincronizar citas.
              </p>
            )}

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <div className="flex gap-2">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <label
                    key={key}
                    className={`flex-1 text-center py-2 rounded-xl border cursor-pointer text-xs font-medium transition-all ${
                      form.status === key
                        ? 'border-transparent'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                    style={
                      form.status === key
                        ? { color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.color }
                        : {}
                    }
                  >
                    <input
                      type="radio"
                      name="status"
                      value={key}
                      checked={form.status === key}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, status: e.target.value }))
                      }
                      className="sr-only"
                    />
                    {cfg.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
                placeholder="Observaciones para esta cita..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38] resize-none"
              />
            </div>

            {calendarStatus === 'syncing' && (
              <p className="text-xs text-[#0088cc] flex items-center gap-1.5">
                <Loader size={13} className="animate-spin" />
                Sincronizando con Google Calendar...
              </p>
            )}
            {calendarStatus === 'synced' && (
              <p className="text-xs text-[#00af38] flex items-center gap-1.5">
                <CheckCircle2 size={13} />
                Sincronizado con Google Calendar
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-[#00af38] rounded-xl hover:bg-[#008a2c] transition-colors"
              >
                <Save size={15} />
                Guardar Cita
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal cobro */}
      {paymentTarget && (
        <PaymentModal
          appointment={paymentTarget}
          patient={patients.find((p) => p.id === paymentTarget.patientId)}
          treatment={treatments.find((t) => t.id === paymentTarget.treatmentId)}
          onConfirm={handlePaymentConfirm}
          onClose={() => setPaymentTarget(null)}
        />
      )}

      {/* Modal eliminación */}
      {deleteConfirm && (
        <Modal title="Eliminar cita" onClose={() => setDeleteConfirm(null)}>
          <p className="text-sm text-gray-600 mb-2">
            ¿Seguro que quieres eliminar esta cita?
          </p>
          {deleteConfirm.googleEventId && isSignedIn() && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4">
              También se eliminará el evento de Google Calendar.
            </p>
          )}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleDelete(deleteConfirm)}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-bold text-[#1a2332] text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
