import { useState, useEffect } from 'react';
import { Clock, Tag, Euro, Plus, Edit2, Trash2, Save, X, AlertCircle } from 'lucide-react';
import { getAppointments, saveTreatment, deleteTreatment } from '../services/storage';
import { useTreatments } from '../contexts/TreatmentsContext';
import { useClinic } from '../contexts/ClinicContext';

const CATEGORIES = [
  { value: 'osteopatia',   label: 'Osteopatía' },
  { value: 'masaje',       label: 'Masajes' },
  { value: 'bienestar',    label: 'Bienestar' },
  { value: 'fisioterapia', label: 'Fisioterapia' },
  { value: 'otro',         label: 'Otro' },
];

const EMPTY_FORM = {
  id: null,
  name: '',
  category: 'osteopatia',
  duration: 60,
  price: 48,
  color: '#c9a227',
  icon: '💊',
  description: '',
};

export default function TreatmentsPage() {
  const { treatments, setTreatments } = useTreatments();
  const { clinicName } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [tab, setTab] = useState('catalogo');
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { getAppointments().then(setAppointments); }, []);

  const countByTreatment = treatments.reduce((acc, t) => {
    acc[t.id] = appointments.filter((a) => a.treatmentId === t.id).length;
    return acc;
  }, {});

  // Agrupar por categoría dinámicamente
  const grouped = [...new Set(treatments.map((t) => t.category))].map((cat) => ({
    key: cat,
    label: CATEGORIES.find((c) => c.value === cat)?.label || cat,
    items: treatments.filter((t) => t.category === cat),
  }));

  const openNew = () => {
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError('');
  };

  const openEdit = (t) => {
    setForm({ ...t });
    setShowForm(true);
    setError('');
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return; }
    setSaving(true);
    setError('');
    try {
      const updated = await saveTreatment(form);
      setTreatments(updated);
      closeForm();
    } catch {
      setError('Error al guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const updated = await deleteTreatment(id);
      setTreatments(updated);
      setDeleteConfirm(null);
    } catch {
      setError('Error al eliminar.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { key: 'catalogo',  label: 'Catálogo' },
          { key: 'gestionar', label: 'Gestionar' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
              tab === key
                ? 'bg-white text-[#111827] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: CATÁLOGO ── */}
      {tab === 'catalogo' && (
        <div className="space-y-8">
          {/* Hero */}
          <div className="bg-gradient-to-br from-[#111827] to-[#1c2432] rounded-2xl p-6 text-white">
            <h2 className="text-xl font-bold">Catálogo de Tratamientos</h2>
            <p className="text-white/60 text-sm mt-1">Servicios especializados de {clinicName}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="bg-white/10 rounded-xl px-4 py-2">
                <p className="text-xs text-white/60">Tratamientos</p>
                <p className="text-xl font-bold">{treatments.length}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-2">
                <p className="text-xs text-white/60">Total citas</p>
                <p className="text-xl font-bold">
                  {Object.values(countByTreatment).reduce((a, b) => a + b, 0)}
                </p>
              </div>
            </div>
          </div>

          {treatments.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg font-medium">No hay tratamientos</p>
              <p className="text-sm mt-1">Ve a la pestaña "Gestionar" para añadir tratamientos.</p>
            </div>
          ) : (
            grouped.map(({ key, label, items }) => (
              <section key={key}>
                <div className="flex items-center gap-2 mb-4">
                  <Tag size={15} className="text-[#c9a227]" />
                  <h3 className="font-bold text-[#111827] text-lg">{label}</h3>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((t) => (
                    <TreatmentCard key={t.id} treatment={t} count={countByTreatment[t.id] || 0} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      )}

      {/* ── TAB: GESTIONAR ── */}
      {tab === 'gestionar' && (
        <div className="space-y-4">
          {/* Botón añadir */}
          {!showForm && (
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#c9a227] text-white text-sm font-semibold rounded-xl hover:bg-[#a8851e] transition-colors shadow-sm"
            >
              <Plus size={16} /> Añadir tratamiento
            </button>
          )}

          {/* Formulario añadir/editar */}
          {showForm && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-[#111827]">
                  {form.id ? 'Editar tratamiento' : 'Nuevo tratamiento'}
                </h3>
                <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nombre */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Ej: Osteopatía Estructural"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227]"
                    />
                  </div>

                  {/* Categoría */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227]"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Duración */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duración (minutos)</label>
                    <input
                      type="number"
                      min="5"
                      max="480"
                      value={form.duration}
                      onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) }))}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227]"
                    />
                  </div>

                  {/* Precio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio (€)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227]"
                    />
                  </div>

                  {/* Color + Icono */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.color}
                          onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                          className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                        />
                        <span className="text-sm text-gray-500 font-mono">{form.color}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Icono (emoji)</label>
                      <input
                        type="text"
                        value={form.icon}
                        onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                        placeholder="💊"
                        className="w-20 px-3 py-2.5 text-xl text-center border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227]"
                      />
                    </div>
                  </div>

                  {/* Descripción */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Describe brevemente el tratamiento..."
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] resize-none"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
                    <AlertCircle size={15} /> {error}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#c9a227] text-white text-sm font-semibold rounded-xl hover:bg-[#a8851e] transition-colors disabled:opacity-60"
                  >
                    <Save size={15} /> {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista de tratamientos */}
          {treatments.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
              <p className="text-base font-medium">No hay tratamientos</p>
              <p className="text-sm mt-1">Añade el primero con el botón de arriba.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              {treatments.map((t, i) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? 'border-t border-gray-50' : ''}`}
                >
                  {/* Color dot + icono */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: t.color + '20' }}
                  >
                    {t.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#111827] truncate">{t.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400">
                        {CATEGORIES.find((c) => c.value === t.category)?.label || t.category}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={10} /> {t.duration} min
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Euro size={10} /> {t.price}€
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  {deleteConfirm === t.id ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-red-600">¿Eliminar?</span>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="px-3 py-1 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        Sí
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEdit(t)}
                        className="w-8 h-8 rounded-lg text-gray-400 hover:text-[#c9a227] hover:bg-[#e6f9ed] flex items-center justify-center transition-colors"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(t.id)}
                        className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TreatmentCard({ treatment, count }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="h-2 w-full" style={{ backgroundColor: treatment.color }} />
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform"
            style={{ backgroundColor: treatment.color + '15' }}
          >
            {treatment.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-[#111827] text-base">{treatment.name}</h4>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock size={11} /> {treatment.duration} min
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ color: treatment.color, backgroundColor: treatment.color + '15' }}
              >
                {count} {count === 1 ? 'cita' : 'citas'}
              </span>
            </div>
          </div>
        </div>

        {treatment.description && (
          <p className="mt-4 text-sm text-gray-500 leading-relaxed">{treatment.description}</p>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Euro size={11} /> Precio por sesión
            </span>
            <span className="text-lg font-extrabold" style={{ color: treatment.color }}>
              {treatment.price}€
            </span>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Uso relativo</span>
            <span>{count} citas</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: count > 0 ? `${Math.min(count * 20, 100)}%` : '0%',
                backgroundColor: treatment.color,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
