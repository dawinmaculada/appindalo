import { useState, useMemo, useEffect } from 'react';
import {
  UserPlus, Search, Edit2, Trash2, Phone, Mail, User, X, Save,
  CalendarDays, Upload, Clock, Euro, AlertTriangle, ChevronDown,
  ChevronUp, CheckCircle2, FileText,
} from 'lucide-react';
import { getPatients, savePatient, deletePatient, getAppointments } from '../services/storage';
import { TREATMENTS } from '../data/treatments';
import CSVImportModal from '../components/CSVImportModal';
import InvoiceModal from '../components/InvoiceModal';
import { format, parseISO, differenceInDays, isFuture, isPast } from 'date-fns';
import { es } from 'date-fns/locale';

const EMPTY_FORM = {
  id: null, name: '', email: '', phone: '', birthDate: '', address: '', notes: '',
};

// Enero 2025
const FOLLOWUP_SINCE  = new Date('2025-01-01');
const FOLLOWUP_DAYS   = 90; // 3 meses

function buildPatientStats(patient, allAppointments) {
  const apts = allAppointments
    .filter((a) => a.patientId === patient.id && a.date)
    .sort((a, b) => new Date(a.date + 'T' + (a.time || '00:00')) - new Date(b.date + 'T' + (b.time || '00:00')));

  const past   = apts.filter((a) => isPast(parseISO(a.date + 'T' + (a.time || '23:59'))));
  const future = apts.filter((a) => isFuture(parseISO(a.date + 'T' + (a.time || '00:00'))));

  const lastApt  = past.at(-1)   || null;
  const nextApt  = future.at(0)  || null;

  const totalSpent = apts
    .filter((a) => a.billing?.total != null)
    .reduce((s, a) => s + a.billing.total, 0);

  // Seguimiento: tiene citas desde enero Y la última fue hace más de 90 días
  const hasAptsFromJan = past.some((a) => parseISO(a.date) >= FOLLOWUP_SINCE);
  const daysSinceLast  = lastApt ? differenceInDays(new Date(), parseISO(lastApt.date)) : null;
  const needsFollowup  = hasAptsFromJan && daysSinceLast !== null && daysSinceLast > FOLLOWUP_DAYS && !nextApt;

  return { apts, past, future, lastApt, nextApt, totalSpent, needsFollowup, daysSinceLast };
}

export default function PatientsPage() {
  const [patients,     setPatients]     = useState([]);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    getPatients().then(setPatients);
    getAppointments().then(setAppointments);
  }, []);
  const [search,       setSearch]       = useState('');
  const [filterMode,   setFilterMode]   = useState('all'); // 'all' | 'followup'
  const [showForm,     setShowForm]     = useState(false);
  const [showImport,   setShowImport]   = useState(false);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [deleteConfirm,setDeleteConfirm]= useState(null);
  const [expanded,     setExpanded]     = useState({}); // patientId → bool
  const [invoiceTarget,setInvoiceTarget]= useState(null); // patient para facturar

  // Enriquecer cada paciente con sus estadísticas
  const enriched = useMemo(() =>
    patients.map((p) => ({ ...p, _stats: buildPatientStats(p, appointments) })),
    [patients, appointments]
  );

  const followupCount = useMemo(() => enriched.filter((p) => p._stats.needsFollowup).length, [enriched]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (filterMode === 'followup') list = list.filter((p) => p._stats.needsFollowup);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.includes(q)
      );
    }
    // Seguimiento primero, luego próxima cita, luego última cita desc
    return [...list].sort((a, b) => {
      if (a._stats.needsFollowup !== b._stats.needsFollowup)
        return a._stats.needsFollowup ? -1 : 1;
      if (a._stats.nextApt && b._stats.nextApt)
        return new Date(a._stats.nextApt.date) - new Date(b._stats.nextApt.date);
      if (a._stats.nextApt) return -1;
      if (b._stats.nextApt) return 1;
      return 0;
    });
  }, [enriched, search, filterMode]);

  const openNew  = () => { setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (p) => { setForm({ ...p }); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setPatients(await savePatient(form));
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    setPatients(await deletePatient(id));
    setDeleteConfirm(null);
  };

  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const initials = (name = '') =>
    name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const avatarColor = (name = '') => {
    const colors = ['#00af38','#0088cc','#e67e22','#9b59b6','#e74c3c','#1abc9c'];
    let hash = 0;
    for (const c of name) hash += c.charCodeAt(0);
    return colors[hash % colors.length];
  };

  const fmt = (n) => n % 1 === 0 ? `${n}€` : `${n.toFixed(2)}€`;

  return (
    <div className="space-y-5">

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar paciente..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38]"
            />
          </div>

          {/* Filtro seguimiento */}
          <button
            onClick={() => setFilterMode((m) => m === 'followup' ? 'all' : 'followup')}
            className={`flex items-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-xl border-2 transition-all ${
              filterMode === 'followup'
                ? 'border-amber-400 bg-amber-50 text-amber-700'
                : 'border-gray-200 bg-white text-gray-500 hover:border-amber-300'
            }`}
          >
            <AlertTriangle size={15} />
            Seguimiento
            {followupCount > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                filterMode === 'followup' ? 'bg-amber-400 text-white' : 'bg-amber-100 text-amber-700'
              }`}>
                {followupCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#00af38] text-sm font-semibold rounded-xl hover:bg-[#e6f9ed] transition-colors border border-[#00af38]/30"
          >
            <Upload size={16} /> Importar CSV
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#00af38] text-white text-sm font-semibold rounded-xl hover:bg-[#008a2c] transition-colors shadow-lg shadow-[#00af38]/20"
          >
            <UserPlus size={16} /> Nuevo Paciente
          </button>
        </div>
      </div>

      {/* Contador */}
      <p className="text-sm text-gray-500">
        {filtered.length} paciente{filtered.length !== 1 ? 's' : ''}
        {filterMode === 'followup' && <span className="ml-1 text-amber-600 font-medium">· filtro: seguimiento</span>}
        {search && <span className="ml-1">· búsqueda: "{search}"</span>}
      </p>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <User size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500 font-medium">No hay pacientes</p>
          <p className="text-sm text-gray-400 mt-1">
            {search || filterMode !== 'all' ? 'Prueba con otros filtros' : 'Añade tu primer paciente'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const { apts, nextApt, totalSpent, needsFollowup, daysSinceLast } = p._stats;
            const isOpen = expanded[p.id];

            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                  needsFollowup
                    ? 'border-amber-200 shadow-sm shadow-amber-100'
                    : 'border-gray-100 hover:shadow-md'
                }`}
              >
                {/* Banda de seguimiento */}
                {needsFollowup && (
                  <div className="bg-amber-50 border-b border-amber-100 px-4 py-1.5 flex items-center gap-2">
                    <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-700 font-medium">
                      Sin reserva desde hace {daysSinceLast} días · Requiere seguimiento
                    </p>
                  </div>
                )}

                {/* Fila principal */}
                <div className="p-4 flex items-center gap-4">
                  {/* Avatar */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: avatarColor(p.name) }}
                  >
                    {initials(p.name)}
                  </div>

                  {/* Info básica */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-[#1a2332] truncate">{p.name}</h3>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {p.phone && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Phone size={10} /> {p.phone}
                        </span>
                      )}
                      {p.email && (
                        <span className="text-xs text-gray-400 flex items-center gap-1 truncate">
                          <Mail size={10} /> {p.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats rápidas */}
                  <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                    {/* Próxima cita */}
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 font-medium">Próxima</p>
                      {nextApt ? (
                        <p className="text-xs font-bold text-[#00af38]">
                          {format(parseISO(nextApt.date), 'd MMM', { locale: es })}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-300">—</p>
                      )}
                    </div>
                    {/* Total citas */}
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 font-medium">Citas</p>
                      <p className="text-xs font-bold text-[#1a2332]">{apts.length}</p>
                    </div>
                    {/* Gasto total */}
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 font-medium">Gastado</p>
                      <p className="text-xs font-bold text-[#9b59b6]">
                        {totalSpent > 0 ? fmt(totalSpent) : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => toggleExpand(p.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                      title={isOpen ? 'Cerrar historial' : 'Ver historial'}
                    >
                      {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                    <button
                      onClick={() => setInvoiceTarget(p)}
                      title="Nueva factura"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-[#0088cc] bg-[#e6f3ff] hover:bg-[#0088cc] hover:text-white transition-colors"
                    >
                      <FileText size={14} />
                    </button>
                    <button
                      onClick={() => openEdit(p)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-[#00af38] bg-[#e6f9ed] hover:bg-[#00af38] hover:text-white transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(p)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 bg-red-50 hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Panel expandido: historial */}
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">

                    {/* Stats móvil */}
                    <div className="flex sm:hidden gap-4 mb-4 pb-3 border-b border-gray-200">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 font-medium">Próxima</p>
                        {nextApt ? (
                          <p className="text-xs font-bold text-[#00af38]">
                            {format(parseISO(nextApt.date), 'd MMM', { locale: es })}
                          </p>
                        ) : <p className="text-xs text-gray-300">—</p>}
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 font-medium">Citas</p>
                        <p className="text-xs font-bold text-[#1a2332]">{apts.length}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 font-medium">Gastado</p>
                        <p className="text-xs font-bold text-[#9b59b6]">{totalSpent > 0 ? fmt(totalSpent) : '—'}</p>
                      </div>
                    </div>

                    {apts.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-3">Sin citas registradas</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500 mb-2">
                          Historial de citas ({apts.length})
                        </p>
                        {apts.map((a) => {
                          const treatment = TREATMENTS.find((t) => t.id === a.treatmentId);
                          const upcoming  = isFuture(parseISO(a.date + 'T' + (a.time || '00:00')));
                          return (
                            <div
                              key={a.id}
                              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${
                                upcoming ? 'bg-[#e6f9ed]' : 'bg-white border border-gray-100'
                              }`}
                            >
                              {/* Icono tratamiento */}
                              <span className="text-base flex-shrink-0">{treatment?.icon || '📅'}</span>

                              {/* Fecha + tratamiento */}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[#1a2332] text-xs truncate">
                                  {treatment?.name || 'Tratamiento'}
                                </p>
                                <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                  <CalendarDays size={9} />
                                  {format(parseISO(a.date), "d 'de' MMMM yyyy", { locale: es })}
                                  {a.time && <><Clock size={9} className="ml-1" /> {a.time}</>}
                                </p>
                              </div>

                              {/* Cobro */}
                              {a.billing?.total != null ? (
                                <span className="text-xs font-bold text-[#9b59b6] flex items-center gap-0.5 flex-shrink-0">
                                  <Euro size={10} />{fmt(a.billing.total)}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-300 flex-shrink-0">Sin cobro</span>
                              )}

                              {/* Estado */}
                              {upcoming ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00af38] text-white font-semibold flex-shrink-0">
                                  Próxima
                                </span>
                              ) : a.status === 'completed' ? (
                                <CheckCircle2 size={14} className="text-[#00af38] flex-shrink-0" />
                              ) : a.status === 'cancelled' ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-medium flex-shrink-0">
                                  Cancelada
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-500 font-medium flex-shrink-0">
                                  Pendiente
                                </span>
                              )}
                            </div>
                          );
                        })}

                        {/* Resumen económico */}
                        {totalSpent > 0 && (
                          <div className="mt-3 flex items-center justify-between px-3 py-2 bg-[#e6f9ed] rounded-xl">
                            <span className="text-xs font-semibold text-gray-600">Total facturado al paciente</span>
                            <span className="text-sm font-extrabold text-[#00af38]">{fmt(totalSpent)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Formulario */}
      {showForm && (
        <Modal title={form.id ? 'Editar Paciente' : 'Nuevo Paciente'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Nombre completo *" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required placeholder="Ej: María García López" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Teléfono" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="600 000 000" type="tel" />
              <Field label="Email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} placeholder="correo@ejemplo.com" type="email" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha de nacimiento" value={form.birthDate} onChange={(v) => setForm((f) => ({ ...f, birthDate: v }))} type="date" />
              <Field label="Dirección" value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} placeholder="Calle, ciudad..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas clínicas</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                placeholder="Historial, alergias, observaciones..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38] resize-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
              <button type="submit" className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-[#00af38] rounded-xl hover:bg-[#008a2c] transition-colors">
                <Save size={15} /> Guardar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Importar CSV */}
      {showImport && (
        <CSVImportModal onClose={() => setShowImport(false)} onImported={async () => setPatients(await getPatients())} />
      )}

      {/* Modal Factura */}
      {invoiceTarget && (
        <InvoiceModal
          patient={invoiceTarget}
          appointments={appointments.filter((a) => a.patientId === invoiceTarget.id)}
          onClose={() => setInvoiceTarget(null)}
        />
      )}

      {/* Modal Confirmar eliminación */}
      {deleteConfirm && (
        <Modal title="Eliminar paciente" onClose={() => setDeleteConfirm(null)}>
          <p className="text-sm text-gray-600 mb-6">
            ¿Seguro que quieres eliminar a <strong>{deleteConfirm.name}</strong>? Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
            <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors">Eliminar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, value, onChange, required, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38]"
      />
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
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
