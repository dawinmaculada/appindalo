import React, { useState } from 'react';
import {
  UserCog,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Phone,
  Mail,
  Clock,
  CheckSquare,
  Square,
} from 'lucide-react';
import { getWorkers, saveWorker, deleteWorker } from '../services/storage';

const DAYS = [
  { key: 'lun', label: 'Lunes' },
  { key: 'mar', label: 'Martes' },
  { key: 'mie', label: 'Miércoles' },
  { key: 'jue', label: 'Jueves' },
  { key: 'vie', label: 'Viernes' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
];

const EMPTY_SCHEDULE = Object.fromEntries(
  DAYS.map((d) => [d.key, { active: false, start: '09:00', end: '18:00' }])
);

const EMPTY_FORM = {
  id: null,
  name: '',
  role: '',
  phone: '',
  email: '',
  color: '#00af38',
  schedule: EMPTY_SCHEDULE,
  notes: '',
};

const COLORS = [
  '#00af38', '#0088cc', '#e67e22', '#9b59b6',
  '#e74c3c', '#1abc9c', '#f39c12', '#2c3e50',
];

export default function WorkersPage() {
  const [workers, setWorkers] = useState(getWorkers);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const openNew = () => {
    setForm({ ...EMPTY_FORM, schedule: structuredClone(EMPTY_SCHEDULE) });
    setShowForm(true);
  };

  const openEdit = (w) => {
    // Rellenar días que falten por si el trabajador fue creado con versión anterior
    const schedule = { ...structuredClone(EMPTY_SCHEDULE), ...w.schedule };
    setForm({ ...w, schedule });
    setShowForm(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const updated = saveWorker(form);
    setWorkers(updated);
    setShowForm(false);
  };

  const handleDelete = (id) => {
    setWorkers(deleteWorker(id));
    setDeleteConfirm(null);
  };

  const toggleDay = (day) => {
    setForm((f) => ({
      ...f,
      schedule: {
        ...f.schedule,
        [day]: { ...f.schedule[day], active: !f.schedule[day].active },
      },
    }));
  };

  const setDayTime = (day, field, value) => {
    setForm((f) => ({
      ...f,
      schedule: {
        ...f.schedule,
        [day]: { ...f.schedule[day], [field]: value },
      },
    }));
  };

  const activeDays = (schedule) =>
    DAYS.filter((d) => schedule?.[d.key]?.active);

  const initials = (name = '') =>
    name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {workers.length} profesional{workers.length !== 1 ? 'es' : ''}
        </p>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#00af38] text-white text-sm font-semibold rounded-xl hover:bg-[#008a2c] transition-colors shadow-lg shadow-[#00af38]/20"
        >
          <Plus size={16} />
          Nuevo Profesional
        </button>
      </div>

      {/* Lista */}
      {workers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <UserCog size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500 font-medium">No hay profesionales</p>
          <p className="text-sm text-gray-400 mt-1">
            Añade el primer profesional con el botón superior
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {workers.map((w) => {
            const days = activeDays(w.schedule || {});
            return (
              <div
                key={w.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200 group"
              >
                {/* Franja de color */}
                <div className="h-1.5 w-full" style={{ backgroundColor: w.color || '#00af38' }} />

                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: w.color || '#00af38' }}
                    >
                      {initials(w.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[#1a2332] truncate">{w.name}</h3>
                      {w.role && (
                        <p className="text-xs text-gray-400 mt-0.5">{w.role}</p>
                      )}
                      {w.phone && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                          <Phone size={11} /> {w.phone}
                        </p>
                      )}
                      {w.email && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                          <Mail size={11} /> {w.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Horario */}
                  {days.length > 0 && (
                    <div className="mt-4 space-y-1.5">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                        <Clock size={11} /> Horario
                      </p>
                      <div className="space-y-1">
                        {days.map((d) => {
                          const slot = w.schedule[d.key];
                          return (
                            <div key={d.key} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 font-medium w-20">{d.label}</span>
                              <span
                                className="px-2 py-0.5 rounded-lg font-medium"
                                style={{
                                  color: w.color || '#00af38',
                                  backgroundColor: (w.color || '#00af38') + '15',
                                }}
                              >
                                {slot.start} – {slot.end}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {days.length === 0 && (
                    <p className="mt-3 text-xs text-gray-400 italic">Sin horario configurado</p>
                  )}

                  {/* Acciones */}
                  <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(w)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-[#00af38] bg-[#e6f9ed] rounded-lg hover:bg-[#00af38] hover:text-white transition-colors"
                    >
                      <Edit2 size={13} /> Editar
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(w)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-red-500 bg-red-50 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <Trash2 size={13} /> Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Formulario */}
      {showForm && (
        <Modal
          title={form.id ? 'Editar Profesional' : 'Nuevo Profesional'}
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={handleSave} className="space-y-5">
            {/* Nombre y especialidad */}
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Nombre completo *"
                value={form.name}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                required
                placeholder="Ej: Ana García"
                className="col-span-2 sm:col-span-1"
              />
              <Field
                label="Especialidad / Cargo"
                value={form.role}
                onChange={(v) => setForm((f) => ({ ...f, role: v }))}
                placeholder="Ej: Osteópata"
              />
            </div>

            {/* Teléfono y Email */}
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Teléfono"
                value={form.phone}
                onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                placeholder="600 000 000"
                type="tel"
              />
              <Field
                label="Email"
                value={form.email}
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                placeholder="profesional@clinica.com"
                type="email"
              />
            </div>

            {/* Color identificativo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color identificativo
              </label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className="w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: form.color === c ? '#1a2332' : 'transparent',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Horario */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Horario de trabajo
              </label>
              <div className="space-y-2">
                {DAYS.map((d) => {
                  const slot = form.schedule[d.key];
                  return (
                    <div key={d.key} className="flex items-center gap-3">
                      {/* Toggle día */}
                      <button
                        type="button"
                        onClick={() => toggleDay(d.key)}
                        className="flex items-center gap-2 w-28 flex-shrink-0"
                      >
                        {slot.active ? (
                          <CheckSquare size={16} className="text-[#00af38] flex-shrink-0" />
                        ) : (
                          <Square size={16} className="text-gray-300 flex-shrink-0" />
                        )}
                        <span
                          className={`text-sm font-medium ${
                            slot.active ? 'text-[#1a2332]' : 'text-gray-400'
                          }`}
                        >
                          {d.label}
                        </span>
                      </button>

                      {/* Horas */}
                      {slot.active ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="time"
                            value={slot.start}
                            onChange={(e) => setDayTime(d.key, 'start', e.target.value)}
                            className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38]"
                          />
                          <span className="text-gray-400 text-xs">–</span>
                          <input
                            type="time"
                            value={slot.end}
                            onChange={(e) => setDayTime(d.key, 'end', e.target.value)}
                            className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38]"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300 italic">No trabaja</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Especialidades, observaciones..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38] resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
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
                <Save size={15} /> Guardar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal eliminar */}
      {deleteConfirm && (
        <Modal title="Eliminar profesional" onClose={() => setDeleteConfirm(null)}>
          <p className="text-sm text-gray-600 mb-6">
            ¿Eliminar a <strong>{deleteConfirm.name}</strong>? Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleDelete(deleteConfirm.id)}
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

function Field({ label, value, onChange, required, placeholder, type = 'text', className = '' }) {
  return (
    <div className={className}>
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
