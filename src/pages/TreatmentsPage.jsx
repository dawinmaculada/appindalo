import { Clock, Tag, Euro } from 'lucide-react';
import { TREATMENTS, TREATMENT_CATEGORIES } from '../data/treatments';
import { getAppointments } from '../services/storage';

export default function TreatmentsPage() {
  const appointments = getAppointments();

  const countByTreatment = TREATMENTS.reduce((acc, t) => {
    acc[t.id] = appointments.filter((a) => a.treatmentId === t.id).length;
    return acc;
  }, {});

  const grouped = Object.entries(TREATMENT_CATEGORIES).map(([key, label]) => ({
    key,
    label,
    treatments: TREATMENTS.filter((t) => t.category === key),
  }));

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1a2332] to-[#2d3d52] rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold">Catálogo de Tratamientos</h2>
        <p className="text-white/60 text-sm mt-1">
          Servicios especializados de Osteopatía Indalo
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="bg-white/10 rounded-xl px-4 py-2">
            <p className="text-xs text-white/60">Tratamientos</p>
            <p className="text-xl font-bold">{TREATMENTS.length}</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2">
            <p className="text-xs text-white/60">Total citas</p>
            <p className="text-xl font-bold">
              {Object.values(countByTreatment).reduce((a, b) => a + b, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Categorías */}
      {grouped.map(({ key, label, treatments }) => (
        <section key={key}>
          <div className="flex items-center gap-2 mb-4">
            <Tag size={15} className="text-[#00af38]" />
            <h3 className="font-bold text-[#1a2332] text-lg">{label}</h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {treatments.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {treatments.map((t) => (
              <TreatmentCard
                key={t.id}
                treatment={t}
                count={countByTreatment[t.id] || 0}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TreatmentCard({ treatment, count }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group">
      {/* Header con color */}
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
            <h4 className="font-bold text-[#1a2332] text-base">{treatment.name}</h4>
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

        <p className="mt-4 text-sm text-gray-500 leading-relaxed">
          {treatment.description}
        </p>

        {/* Precios */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
            <Euro size={11} /> Tarifas
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Sesión',   sublabel: '1 sesión',    price: 48  },
              { label: 'Bono 5',  sublabel: '5 sesiones',  price: 225 },
              { label: 'Bono 10', sublabel: '10 sesiones', price: 420 },
            ].map(({ label, sublabel, price }) => (
              <div
                key={label}
                className="flex flex-col items-center py-2 px-1 rounded-xl border border-gray-100 bg-gray-50"
              >
                <span className="text-[10px] font-semibold text-gray-500">{label}</span>
                <span className="text-[10px] text-gray-400">{sublabel}</span>
                <span className="text-sm font-extrabold mt-1" style={{ color: treatment.color }}>
                  {price}€
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Barra de uso */}
        <div className="mt-4">
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
