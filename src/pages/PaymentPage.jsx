import { useNavigate } from 'react-router-dom';
import { Leaf, CheckCircle2, CreditCard, Shield, Clock, Zap, Users, Calendar, FileText, Mail } from 'lucide-react';
import { useClinic } from '../contexts/ClinicContext';
import { logout } from '../services/auth';

const FEATURES = [
  { icon: Users, text: 'Gestión ilimitada de pacientes' },
  { icon: Calendar, text: 'Calendario con vista semanal' },
  { icon: Zap, text: 'Sincronización con Google Calendar' },
  { icon: Mail, text: 'Emails automáticos de confirmación y recordatorio' },
  { icon: FileText, text: 'Facturación integrada' },
  { icon: Users, text: 'Gestión de profesionales' },
];

export default function PaymentPage() {
  const navigate  = useNavigate();
  const { clinicName, daysLeft, subscription } = useClinic();

  const trialExpired = subscription.status === 'trial' && daysLeft !== null && daysLeft <= 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col">
      {/* Header */}
      <div className="bg-[#111827] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#c9a227] flex items-center justify-center">
            <Leaf size={18} className="text-white" />
          </div>
          <span className="text-[#c9a227] font-extrabold text-lg">NUVIA</span>
          {clinicName && <span className="text-white/40 text-sm hidden sm:block">· {clinicName}</span>}
        </div>
        <button onClick={handleLogout} className="text-white/40 hover:text-white text-sm transition-colors">
          Cerrar sesión
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">

          {/* Mensaje de estado */}
          <div className="text-center mb-8">
            {trialExpired ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <Clock size={32} className="text-amber-500" />
                </div>
                <h1 className="text-2xl font-extrabold text-[#111827] mb-2">
                  Tu periodo de prueba ha finalizado
                </h1>
                <p className="text-gray-400">
                  Activa tu suscripción para seguir usando NUVIA en <strong>{clinicName}</strong>.
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-[#c9a227]/10 flex items-center justify-center mx-auto mb-4">
                  <CreditCard size={32} className="text-[#c9a227]" />
                </div>
                <h1 className="text-2xl font-extrabold text-[#111827] mb-2">
                  Activa tu suscripción
                </h1>
                <p className="text-gray-400">
                  Accede a todas las funcionalidades de NUVIA sin límites.
                </p>
              </>
            )}
          </div>

          {/* Card del plan */}
          <div className="bg-white rounded-2xl border-2 border-[#c9a227] shadow-xl shadow-[#c9a227]/10 overflow-hidden">
            {/* Cabecera del plan */}
            <div className="bg-gradient-to-r from-[#111827] to-[#1c2432] px-6 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[#c9a227] text-xs font-bold uppercase tracking-widest mb-1">Plan profesional</p>
                  <h2 className="text-white text-2xl font-extrabold">NUVIA Clínica</h2>
                </div>
                <div className="text-right">
                  <p className="text-white text-3xl font-extrabold">29,99€</p>
                  <p className="text-white/40 text-xs">/ mes · IVA incluido</p>
                </div>
              </div>
            </div>

            {/* Características */}
            <div className="px-6 py-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Todo incluido</p>
              <div className="space-y-3">
                {FEATURES.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#c9a227]/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={12} className="text-[#c9a227]" />
                    </div>
                    <span className="text-sm text-gray-700">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Botón de pago */}
            <div className="px-6 pb-6">
              <button
                disabled
                className="w-full py-3.5 bg-[#c9a227]/20 text-[#c9a227]/60 font-semibold rounded-xl cursor-not-allowed flex items-center justify-center gap-2 text-sm border border-[#c9a227]/20"
              >
                <CreditCard size={16} />
                Pago con tarjeta — Próximamente
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">
                El sistema de pago estará disponible próximamente.{' '}
                <a href="mailto:dawinmaculada@gmail.com" className="text-[#c9a227] hover:underline">
                  Contacta con nosotros
                </a>{' '}
                para activar tu cuenta.
              </p>
            </div>
          </div>

          {/* Garantía */}
          <div className="flex items-center justify-center gap-2 mt-5 text-xs text-gray-400">
            <Shield size={13} />
            <span>Pago seguro · Cancela en cualquier momento · Sin permanencia</span>
          </div>
        </div>
      </div>
    </div>
  );
}
